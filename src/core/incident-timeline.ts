import { Incident, IncidentState } from './types';

export type TimelineCategory =
  | 'detection'
  | 'state_transition'
  | 'containment'
  | 'evidence'
  | 'lifecycle_posture';

export interface IncidentTimelineNode {
  id: string;
  timestamp: string;
  title: string;
  subtitle: string;
  actor: string;
  category: TimelineCategory;
  isCritical: boolean;
  badge: string;
  elapsedFromDetectionLabel: string;
  targetState?: IncidentState;
}

export function formatDurationCompact(deltaMs: number): string {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 'T+0s';
  const totalSeconds = Math.floor(deltaMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `T+${hours}h ${minutes}m`;
  if (minutes > 0) return seconds > 0 ? `T+${minutes}m ${seconds}s` : `T+${minutes}m`;
  return `T+${seconds}s`;
}

export function computeIncidentTimeToContain(incident: Incident): {
  isContained: boolean;
  containmentTimestamp: string | null;
  timeToContainLabel: string;
} {
  const detectedMs = Date.parse(incident.detectedAt);
  const containedStates: IncidentState[] = ['contained', 'remediating', 'resolved', 'closed'];
  const isContained =
    Boolean(incident.containmentExecutedAt) || containedStates.includes(incident.state);

  let containmentTs: string | null = incident.containmentExecutedAt || null;
  if (!containmentTs && isContained) {
    const containAudit = incident.auditTrail.find((log) =>
      log.action.toUpperCase().includes('CONTAIN')
    );
    containmentTs = containAudit?.timestamp || incident.updatedAt;
  }

  if (!containmentTs || Number.isNaN(detectedMs)) {
    return {
      isContained,
      containmentTimestamp: containmentTs,
      timeToContainLabel: isContained ? 'Contained' : 'Pending Human Gate',
    };
  }

  const containMs = Date.parse(containmentTs);
  if (Number.isNaN(containMs)) {
    return {
      isContained,
      containmentTimestamp: containmentTs,
      timeToContainLabel: 'Contained',
    };
  }

  return {
    isContained,
    containmentTimestamp: containmentTs,
    timeToContainLabel: formatDurationCompact(Math.max(0, containMs - detectedMs)),
  };
}

/**
 * Builds a chronological vertical forensic & lifecycle timeline highlighting critical
 * state transitions and containment execution timestamps for an Incident.
 */
export function buildIncidentTimeline(incident: Incident): IncidentTimelineNode[] {
  const detectedMs = Date.parse(incident.detectedAt) || Date.now();
  const nodes: Array<IncidentTimelineNode & { sortMs: number }> = [];

  const elapsedLabel = (ts: string): { sortMs: number; label: string } => {
    const ms = Date.parse(ts);
    if (Number.isNaN(ms)) return { sortMs: detectedMs, label: 'T+0s' };
    return { sortMs: ms, label: formatDurationCompact(Math.max(0, ms - detectedMs)) };
  };

  // 1. Initial Detection Milestone
  nodes.push({
    id: `${incident.id}-detect`,
    timestamp: incident.detectedAt,
    title: `Incident Detected · ${incident.severity.toUpperCase()}`,
    subtitle: incident.title,
    actor: incident.assignedAgents.join(', ') || 'Telemetry Sensor Grid',
    category: 'detection',
    isCritical: true,
    badge: 'DETECTED',
    elapsedFromDetectionLabel: 'T+0s',
    targetState: 'new',
    sortMs: detectedMs,
  });

  // 2. Audit Trail entries (highlight state transitions & containment triggers)
  let hasExplicitContainmentNode = false;
  incident.auditTrail.forEach((entry, idx) => {
    const actionUpper = entry.action.toUpperCase();
    const { sortMs, label } = elapsedLabel(entry.timestamp);
    const isContainment =
      actionUpper.includes('CONTAINMENT') || actionUpper.includes('CONTAIN_');
    const isTransition =
      actionUpper.includes('TRANSITION') ||
      actionUpper.includes('STATE') ||
      actionUpper.includes('CONFIRM') ||
      actionUpper.includes('RESOLV') ||
      actionUpper.includes('CLOSE') ||
      actionUpper.includes('GATEWAY_PRE_EXECUTION_BLOCK');

    if (isContainment) hasExplicitContainmentNode = true;

    nodes.push({
      id: `${incident.id}-audit-${idx}`,
      timestamp: entry.timestamp,
      title: entry.action.replace(/_/g, ' '),
      subtitle: entry.details,
      actor: entry.author,
      category: isContainment ? 'containment' : isTransition ? 'state_transition' : 'lifecycle_posture',
      isCritical: isContainment || isTransition,
      badge: isContainment ? 'CONTAINMENT' : isTransition ? 'STATE TRANSITION' : 'AUDIT LOG',
      elapsedFromDetectionLabel: label,
      sortMs,
    });
  });

  // 3. Explicit Containment Milestone if containmentExecutedAt exists & not already duplicated cleanly
  const containStats = computeIncidentTimeToContain(incident);
  if (containStats.containmentTimestamp && !hasExplicitContainmentNode) {
    const { sortMs, label } = elapsedLabel(containStats.containmentTimestamp);
    nodes.push({
      id: `${incident.id}-containment-exec`,
      timestamp: containStats.containmentTimestamp,
      title: 'Containment Enforced & Asset Isolated',
      subtitle:
        incident.containmentActionProposed || 'Automated containment directive enforced',
      actor: incident.containmentApprovedBy || 'Authorized SecOps Lead',
      category: 'containment',
      isCritical: true,
      badge: 'CONTAINED',
      elapsedFromDetectionLabel: label,
      targetState: 'contained',
      sortMs,
    });
  } else if (!containStats.isContained) {
    // Highlight pending containment milestone cleanly at the bottom of the timeline
    nodes.push({
      id: `${incident.id}-containment-pending`,
      timestamp: incident.updatedAt,
      title: 'Containment Authorization Gate Pending',
      subtitle:
        incident.containmentActionProposed ||
        'Awaiting human SecOps Lead authorization to enforce isolation.',
      actor: 'Human Authorization Gate',
      category: 'containment',
      isCritical: true,
      badge: 'AWAITING CONTAINMENT',
      elapsedFromDetectionLabel: 'PENDING',
      targetState: 'contained',
      sortMs: (Date.parse(incident.updatedAt) || detectedMs) + 1000,
    });
  }

  // 4. Cryptographic Evidence Captures
  incident.evidenceItems.forEach((ev) => {
    const { sortMs, label } = elapsedLabel(ev.collectedAt);
    nodes.push({
      id: `${incident.id}-ev-${ev.id}`,
      timestamp: ev.collectedAt,
      title: `Evidence Captured · ${ev.id}`,
      subtitle: ev.description,
      actor: ev.collectedBy,
      category: 'evidence',
      isCritical: false,
      badge: ev.verified ? 'SHA-256 VERIFIED' : 'EVIDENCE',
      elapsedFromDetectionLabel: label,
      sortMs,
    });
  });

  nodes.sort((a, b) => a.sortMs - b.sortMs);

  return nodes.map(({ sortMs: _omit, ...rest }) => rest);
}
