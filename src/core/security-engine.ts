import { DefConLevel, Incident, IncidentState, SecurityEvent, SharedIntelMemory } from './types';

/**
 * Calculates current DEFCON readiness posture based on active incidents and alert velocity.
 * DefCon 1 = Critical Maximum Readiness (Active Breach / Uncontained Critical)
 * DefCon 2 = Severe Threat (Multiple High/Critical Incidents)
 * DefCon 3 = Elevated Watch (Investigating Confirmed Threats)
 * DefCon 4 = Guarded / Increased Intelligence Monitoring
 * DefCon 5 = Normal Peacetime Operations
 */
export function calculateDefCon(incidents: Incident[], recentEvents: SecurityEvent[]): DefConLevel {
  const uncontainedCritical = incidents.filter(
    (inc) => inc.severity === 'critical' && ['new', 'investigating', 'confirmed'].includes(inc.state)
  );

  if (uncontainedCritical.length >= 1) {
    return 1;
  }

  const activeHigh = incidents.filter(
    (inc) => inc.severity === 'high' && ['new', 'investigating', 'confirmed'].includes(inc.state)
  );

  if (activeHigh.length >= 2 || uncontainedCritical.length > 0) {
    return 2;
  }

  const activeAny = incidents.filter((inc) =>
    ['investigating', 'confirmed', 'remediating'].includes(inc.state)
  );

  const highAlertEvents = recentEvents.filter(
    (e) => e.severity === 'critical' || e.severity === 'high'
  );

  if (activeAny.length >= 2 || highAlertEvents.length >= 3) {
    return 3;
  }

  if (activeAny.length >= 1 || recentEvents.length > 5) {
    return 4;
  }

  return 5;
}

const ALLOWED_TRANSITIONS: Record<IncidentState, IncidentState[]> = {
  new: ['investigating', 'closed'],
  investigating: ['confirmed', 'closed'],
  confirmed: ['contained', 'remediating'],
  contained: ['remediating', 'resolved'],
  remediating: ['resolved'],
  resolved: ['closed', 'investigating'],
  closed: ['new', 'investigating'],
};

/**
 * Validates if an incident lifecycle state transition is legally permissible
 * and enforces human investigator checks for critical containment/resolution steps.
 */
export function canTransitionIncident(
  currentState: IncidentState,
  nextState: IncidentState,
  userRole: 'admin' | 'secops_lead' | 'analyst' | 'agent_automated'
): { allowed: boolean; reason?: string } {
  const allowedNext = ALLOWED_TRANSITIONS[currentState] || [];
  if (!allowedNext.includes(nextState)) {
    return {
      allowed: false,
      reason: `Transition from ${currentState} to ${nextState} is not permitted by lifecycle rules.`,
    };
  }

  // Automated agents cannot unilaterally close or declare an incident resolved without human oversight
  if (userRole === 'agent_automated' && (nextState === 'resolved' || nextState === 'closed')) {
    return {
      allowed: false,
      reason: 'Automated agents require human SecOps sign-off to resolve or close incidents.',
    };
  }

  // Only SecOps leads or admins can transition directly to contained
  if (nextState === 'contained' && userRole === 'analyst') {
    return {
      allowed: false,
      reason: 'Containment authorization requires SecOps Lead or Admin credential role.',
    };
  }

  return { allowed: true };
}

/**
 * Transitions an incident state and appends an auditable record to its audit trail.
 */
export function transitionIncident(
  incident: Incident,
  nextState: IncidentState,
  author: string,
  userRole: 'admin' | 'secops_lead' | 'analyst' | 'agent_automated',
  notes: string,
  timestamp: string = new Date().toISOString()
): Incident {
  const check = canTransitionIncident(incident.state, nextState, userRole);
  if (!check.allowed) {
    throw new Error(check.reason);
  }

  const updatedAudit = [
    ...incident.auditTrail,
    {
      timestamp,
      author,
      action: `STATE_TRANSITION_${incident.state.toUpperCase()}_TO_${nextState.toUpperCase()}`,
      details: notes,
    },
  ];

  return {
    ...incident,
    state: nextState,
    updatedAt: timestamp,
    auditTrail: updatedAudit,
  };
}

/**
 * Validates whether a proposed containment directive can be executed.
 */
export function evaluateContainmentAuthorization(
  action: string,
  requiredRole: 'admin' | 'secops_lead',
  actorRole: string
): boolean {
  if (requiredRole === 'admin') {
    return actorRole === 'admin';
  }
  return actorRole === 'admin' || actorRole === 'secops_lead';
}

/**
 * Filters and ranks shared swarm memory items by confidence and expiration validity.
 */
export function filterActiveIntelMemories(
  memories: SharedIntelMemory[],
  referenceIsoTime: string = new Date().toISOString()
): SharedIntelMemory[] {
  const refTime = new Date(referenceIsoTime).getTime();

  return memories
    .filter((mem) => {
      const exp = new Date(mem.expiresAt).getTime();
      return exp > refTime;
    })
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Computes an anomaly risk index (0 to 100) based on unverified signatures and severity.
 */
export function calculateAnomalyIndex(events: SecurityEvent[]): number {
  if (events.length === 0) return 0;

  const weights: Record<string, number> = {
    critical: 35,
    high: 20,
    medium: 10,
    low: 3,
    info: 1,
  };

  const rawSum = events.reduce((acc, ev) => {
    const w = weights[ev.severity] || 1;
    const modifier = ev.verified ? 1.0 : 1.35; // unverified anomalies score higher uncertainty
    return acc + w * modifier;
  }, 0);

  return Math.min(100, Math.round((rawSum / (events.length * 15)) * 100));
}

export interface CliCommandContext {
  agentsCount: number;
  uncontainedIncidents: number;
  defcon: number;
  isolatedNodesCount: number;
}

export interface CliCommandResult {
  output: string;
  action?: 'override_defcon' | 'inject_threat' | 'clear' | 'isolate_node' | 'restart_agent';
  param?: string | number;
}

/**
 * Developer CLI command interpreter for platform engineers
 */
export function executeDeveloperCommand(
  rawInput: string,
  context: CliCommandContext
): CliCommandResult {
  const trimmed = rawInput.trim();
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const arg1 = parts[1]?.toLowerCase();
  const arg2 = parts[2]?.toLowerCase();

  if (!cmd) {
    return { output: '' };
  }

  switch (cmd) {
    case 'help':
      return {
        output: [
          'CDF Developer & SecOps CLI v2.4-ENTERPRISE',
          '----------------------------------------',
          '  help                         - List available CLI commands',
          '  status                       - Display live DEFCON and cluster health',
          '  defcon set <1-5>             - Manually override DEFCON alert state',
          '  agent list                   - Inspect swarm agent operational status',
          '  agent restart <agent_id>     - Force restart defensive agent container',
          '  isolate <node_id>            - Toggle hardware microsegmentation on node',
          '  rules list                   - List active Sigma/eBPF/Safetensors rules',
          '  rules test <rule_id>         - Dry-run detection rule against event stream',
          '  inject <probe_type>          - Inject synthetic adversarial probe',
          '  clear                        - Clear terminal buffer',
        ].join('\n'),
      };

    case 'status':
      return {
        output: [
          `DEFCON LEVEL: STAGE ${context.defcon}`,
          `ACTIVE SWARM: ${context.agentsCount} AGENTS ONLINE`,
          `UNCONTAINED INCIDENTS: ${context.uncontainedIncidents}`,
          `QUARANTINED NODES: ${context.isolatedNodesCount}`,
          `K8S INGRESS: eBPF ENFORCEMENT ACTIVE (PORT 443, 8443)`,
        ].join('\n'),
      };

    case 'defcon':
      if (arg1 === 'set' && parts[2]) {
        const lvl = parseInt(parts[2], 10);
        if (lvl >= 1 && lvl <= 5) {
          return {
            output: `[OVERRIDE SUCCESS] DEFCON alert readiness posture manually set to LEVEL ${lvl}.`,
            action: 'override_defcon',
            param: lvl,
          };
        }
        return { output: '[ERROR] Invalid level. Usage: defcon set <1-5>' };
      }
      return { output: `Current DEFCON level: STAGE ${context.defcon}. Use "defcon set <1-5>" to modify.` };

    case 'agent':
      if (arg1 === 'list') {
        return {
          output: [
            'ID               ROLE                      STATUS',
            'sentinel-0       Perimeter Sentry          ACTIVE',
            'aegis-7          Behavioral Heuristics     ACTIVE',
            'chronos-x        Forensic Timeline         ACTIVE',
            'cortex-9         CTI Correlation           INVESTIGATING',
            'valkyrie-1       Containment Executor      STANDBY',
            'cipher-wg        Model Security Auditor    ACTIVE',
          ].join('\n'),
        };
      }
      if (arg1 === 'restart' && arg2) {
        return {
          output: `[EXEC] SIGHUP sent to agent pod [${arg2}]. Re-attaching eBPF sensors... Container restarted.`,
          action: 'restart_agent',
          param: arg2,
        };
      }
      return { output: 'Usage: agent list | agent restart <agent_id>' };

    case 'isolate':
      if (arg1) {
        return {
          output: `[NETWORK MATRIX] Toggling network quarantine directive for host [${arg1}].`,
          action: 'isolate_node',
          param: arg1,
        };
      }
      return { output: 'Usage: isolate <node_id> (e.g. isolate cluster-inference-01)' };

    case 'rules':
      if (arg1 === 'list') {
        return {
          output: [
            'RULE ID         TYPE         SEVERITY   STATE     MATCHES',
            'RULE-SIGMA-01   Sigma        CRITICAL   ENABLED   14',
            'RULE-EBPF-02    eBPF         HIGH       ENABLED   3',
            'RULE-TENSOR-03  Safetensors  CRITICAL   ENABLED   1',
          ].join('\n'),
        };
      }
      if (arg1 === 'test' && arg2) {
        return {
          output: `[RULE TEST: ${arg2.toUpperCase()}]\nParsing rule AST... Syntax verified.\nEvaluated against last 50 events in telemetry ring buffer: 2 MATCHES FOUND. Zero parsing errors.`,
        };
      }
      return { output: 'Usage: rules list | rules test <rule_id>' };

    case 'inject':
      return {
        output: `[ADVERSARIAL LAB] Synthetic threat injected: [${arg1 || 'GENERIC_EXFIL_PROBE'}]. Telemetry stream updated.`,
        action: 'inject_threat',
        param: arg1 || 'CHUNKED_SAFETENSORS_SOCKET_ANOMALY',
      };

    case 'clear':
      return { output: '', action: 'clear' };

    default:
      return {
        output: `Command not recognized: "${trimmed}". Type "help" to view developer commands.`,
      };
  }
}

