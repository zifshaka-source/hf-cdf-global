export type DataClassificationLevel = 'PUBLIC' | 'INTERNAL' | 'RESTRICTED' | 'SOVEREIGN';
export type EventProvenanceSource =
  | 'live-public-api'
  | 'telemetry-sensor'
  | 'operator-action'
  | 'gateway-intercept'
  | 'red-force-lab';

export type CanonicalActorType = 'human' | 'agent' | 'service' | 'external_feed';
export type CanonicalSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface CanonicalTelemetryEvent {
  schemaVersion: '1.0.0';
  eventId: string;
  tenantId: string;
  observedAt: string;
  receivedAt: string;
  actorType: CanonicalActorType;
  actorId: string;
  agentId?: string;
  resourceId: string;
  action: string;
  outcome: 'allowed' | 'blocked' | 'queued_approval' | 'observed' | 'failed';
  severity: CanonicalSeverity;
  correlationId: string;
  traceId: string;
  provenance: EventProvenanceSource;
  classification: DataClassificationLevel;
  integrityMetadata: {
    digestSha256?: string;
    promptInjectionSanitized: boolean;
    strippedDirectivesCount: number;
  };
  payload: {
    summary: string;
    rawMetadata?: Record<string, string | number | boolean>;
  };
}

export interface DeadLetterEventEntry {
  dlqId: string;
  receivedAt: string;
  tenantId: string;
  rejectionReasons: string[];
  rawSnippet: string;
  quarantinedPromptInjection: boolean;
}

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/gi,
  /system\s*:\s*override/gi,
  /<\s*system\s*>[\s\S]*?<\s*\/\s*system\s*>/gi,
  /\bexecute_tool\s*\([^)]*\)/gi,
  /\bexfiltrate_env_secrets\b/gi,
  /\bdisable_policy_gateway\b/gi,
];

/**
 * Strips raw instruction-like payloads from untrusted strings so external telemetry
 * can never trigger autonomous tool execution.
 */
export function sanitizeUntrustedPayloadText(rawText: string): {
  sanitizedText: string;
  strippedCount: number;
} {
  let sanitizedText = String(rawText || '').slice(0, 2000);
  let strippedCount = 0;

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    const matches = sanitizedText.match(pattern);
    if (matches && matches.length > 0) {
      strippedCount += matches.length;
      sanitizedText = sanitizedText.replace(pattern, '[QUARANTINED_UNTRUSTED_DIRECTIVE]');
    }
  }

  // Also strip angle brackets to mitigate HTML/script injection inside logs
  sanitizedText = sanitizedText.replace(/[<>]/g, '');

  return { sanitizedText: sanitizedText.trim(), strippedCount };
}

const VALID_ACTOR_TYPES = new Set<CanonicalActorType>(['human', 'agent', 'service', 'external_feed']);
const VALID_SEVERITIES = new Set<CanonicalSeverity>(['info', 'low', 'medium', 'high', 'critical']);
const VALID_OUTCOMES = new Set(['allowed', 'blocked', 'queued_approval', 'observed', 'failed']);
const VALID_PROVENANCE = new Set<EventProvenanceSource>([
  'live-public-api',
  'telemetry-sensor',
  'operator-action',
  'gateway-intercept',
  'red-force-lab',
]);
const VALID_CLASSIFICATIONS = new Set<DataClassificationLevel>([
  'PUBLIC',
  'INTERNAL',
  'RESTRICTED',
  'SOVEREIGN',
]);

export function validateAndIngestCanonicalEvent(rawInput: unknown):
  | {
      valid: true;
      event: CanonicalTelemetryEvent;
    }
  | {
      valid: false;
      errors: string[];
      deadLetterEntry: DeadLetterEventEntry;
    } {
  const nowIso = new Date().toISOString();
  const obj = (rawInput && typeof rawInput === 'object' ? rawInput : {}) as Record<string, unknown>;
  const errors: string[] = [];

  if (obj.schemaVersion !== '1.0.0') {
    errors.push(`Unsupported or missing schemaVersion "${String(obj.schemaVersion ?? '')}" (expected "1.0.0").`);
  }
  if (typeof obj.eventId !== 'string' || obj.eventId.trim().length < 4) {
    errors.push('Missing or invalid eventId (min 4 characters).');
  }
  if (typeof obj.tenantId !== 'string' || !/^tenant-[a-z0-9-]+$/.test(obj.tenantId)) {
    errors.push('Invalid tenantId (must follow "tenant-<slug>" isolation format).');
  }
  if (typeof obj.observedAt !== 'string' || Number.isNaN(Date.parse(obj.observedAt))) {
    errors.push('Invalid observedAt ISO-8601 timestamp.');
  }
  if (!VALID_ACTOR_TYPES.has(obj.actorType as CanonicalActorType)) {
    errors.push('Invalid actorType (expected human | agent | service | external_feed).');
  }
  if (typeof obj.actorId !== 'string' || obj.actorId.trim().length < 2) {
    errors.push('Missing actorId.');
  }
  if (typeof obj.resourceId !== 'string' || obj.resourceId.trim().length < 2) {
    errors.push('Missing resourceId.');
  }
  if (typeof obj.action !== 'string' || obj.action.trim().length < 2) {
    errors.push('Missing action.');
  }
  if (!VALID_OUTCOMES.has(String(obj.outcome))) {
    errors.push('Invalid outcome (expected allowed | blocked | queued_approval | observed | failed).');
  }
  if (!VALID_SEVERITIES.has(obj.severity as CanonicalSeverity)) {
    errors.push('Invalid severity (expected info | low | medium | high | critical).');
  }
  if (typeof obj.correlationId !== 'string' || obj.correlationId.trim().length < 3) {
    errors.push('Missing correlationId.');
  }
  if (!VALID_PROVENANCE.has(obj.provenance as EventProvenanceSource)) {
    errors.push('Invalid provenance source tag.');
  }
  if (!VALID_CLASSIFICATIONS.has(obj.classification as DataClassificationLevel)) {
    errors.push('Invalid classification (expected PUBLIC | INTERNAL | RESTRICTED | SOVEREIGN).');
  }

  const rawPayloadObj =
    obj.payload && typeof obj.payload === 'object'
      ? (obj.payload as Record<string, unknown>)
      : null;
  const rawSummary = rawPayloadObj && typeof rawPayloadObj.summary === 'string' ? rawPayloadObj.summary : '';
  if (!rawSummary.trim()) {
    errors.push('Missing payload.summary text.');
  }

  const { sanitizedText, strippedCount } = sanitizeUntrustedPayloadText(rawSummary);

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      deadLetterEntry: {
        dlqId: `DLQ-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 899)}`,
        receivedAt: nowIso,
        tenantId: typeof obj.tenantId === 'string' ? obj.tenantId : 'unknown-tenant',
        rejectionReasons: errors,
        rawSnippet: JSON.stringify(rawInput).slice(0, 320),
        quarantinedPromptInjection: strippedCount > 0,
      },
    };
  }

  // Extract safe flat scalar metadata only
  const safeMeta: Record<string, string | number | boolean> = {};
  if (rawPayloadObj?.rawMetadata && typeof rawPayloadObj.rawMetadata === 'object') {
    for (const [k, v] of Object.entries(rawPayloadObj.rawMetadata as Record<string, unknown>).slice(0, 12)) {
      if (typeof v === 'string') {
        safeMeta[k] = sanitizeUntrustedPayloadText(v).sanitizedText.slice(0, 200);
      } else if (typeof v === 'number' || typeof v === 'boolean') {
        safeMeta[k] = v;
      }
    }
  }

  const event: CanonicalTelemetryEvent = {
    schemaVersion: '1.0.0',
    eventId: String(obj.eventId).trim(),
    tenantId: String(obj.tenantId).trim(),
    observedAt: String(obj.observedAt),
    receivedAt: nowIso,
    actorType: obj.actorType as CanonicalActorType,
    actorId: String(obj.actorId).trim(),
    agentId: typeof obj.agentId === 'string' && obj.agentId.trim() ? obj.agentId.trim() : undefined,
    resourceId: String(obj.resourceId).trim(),
    action: String(obj.action).trim(),
    outcome: obj.outcome as CanonicalTelemetryEvent['outcome'],
    severity: obj.severity as CanonicalSeverity,
    correlationId: String(obj.correlationId).trim(),
    traceId:
      typeof obj.traceId === 'string' && obj.traceId.trim()
        ? obj.traceId.trim()
        : `tr-${String(obj.correlationId).trim()}`,
    provenance: obj.provenance as EventProvenanceSource,
    classification: obj.classification as DataClassificationLevel,
    integrityMetadata: {
      promptInjectionSanitized: strippedCount > 0,
      strippedDirectivesCount: strippedCount,
    },
    payload: {
      summary: sanitizedText,
      rawMetadata: Object.keys(safeMeta).length > 0 ? safeMeta : undefined,
    },
  };

  return { valid: true, event };
}
