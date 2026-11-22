import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIncidentTimeline, computeIncidentTimeToContain } from './incident-timeline';
import { Incident } from './types';

const SAMPLE_INCIDENT: Incident = {
  id: 'INC-TIMELINE-1',
  title: 'Unauthorized Model Weights Exfiltration Probe',
  severity: 'critical',
  state: 'contained',
  detectedAt: '2026-11-21T09:00:00Z',
  updatedAt: '2026-11-21T09:12:30Z',
  assignedInvestigators: ['M. Vance'],
  assignedAgents: ['Sentinel-Zero'],
  affectedAssets: ['cluster-inference-01'],
  associatedAlerts: ['EVT-1'],
  mitreTactics: ['TA0010'],
  summary: 'Blocked covert exfiltration attempt.',
  containmentActionProposed: 'ISOLATE_INFERENCE_NODE',
  containmentApprovedBy: 'Authorized Commander',
  containmentExecutedAt: '2026-11-21T09:08:30Z',
  evidenceItems: [
    {
      id: 'EV-99',
      description: 'Kernel socket trace dump',
      hashSha256: 'abc123',
      collectedBy: 'Chronos-Forensics',
      collectedAt: '2026-11-21T09:02:00Z',
      verified: true,
    },
  ],
  auditTrail: [
    {
      timestamp: '2026-11-21T09:04:00Z',
      author: 'Authorized Commander',
      action: 'INCIDENT_STATE_TRANSITION',
      details: 'Transitioned from INVESTIGATING to CONFIRMED',
    },
    {
      timestamp: '2026-11-21T09:08:30Z',
      author: 'Authorized Commander',
      action: 'CONTAINMENT_ENFORCED',
      details: 'Isolated worker node and revoked ephemeral credentials',
    },
  ],
};

test('computeIncidentTimeToContain calculates exact duration between detection and containment', () => {
  const stats = computeIncidentTimeToContain(SAMPLE_INCIDENT);
  assert.equal(stats.isContained, true);
  assert.equal(stats.containmentTimestamp, '2026-11-21T09:08:30Z');
  assert.equal(stats.timeToContainLabel, 'T+8m 30s');
});

test('buildIncidentTimeline orders milestones chronologically and highlights transitions and containment', () => {
  const timeline = buildIncidentTimeline(SAMPLE_INCIDENT);
  assert.equal(timeline.length, 4);
  assert.equal(timeline[0].category, 'detection');
  assert.equal(timeline[0].elapsedFromDetectionLabel, 'T+0s');
  assert.equal(timeline[1].category, 'evidence');
  assert.equal(timeline[2].category, 'state_transition');
  assert.equal(timeline[2].isCritical, true);
  assert.equal(timeline[3].category, 'containment');
  assert.equal(timeline[3].badge, 'CONTAINMENT');
  assert.equal(timeline[3].elapsedFromDetectionLabel, 'T+8m 30s');
});

test('buildIncidentTimeline adds awaiting containment milestone for uncontained incidents', () => {
  const uncontained: Incident = {
    ...SAMPLE_INCIDENT,
    state: 'investigating',
    containmentExecutedAt: undefined,
    containmentApprovedBy: undefined,
    auditTrail: [SAMPLE_INCIDENT.auditTrail[0]],
  };

  const timeline = buildIncidentTimeline(uncontained);
  const pendingNode = timeline.find((n) => n.badge === 'AWAITING CONTAINMENT');
  assert.ok(pendingNode, 'Expected AWAITING CONTAINMENT milestone for active uncontained incident');
});
