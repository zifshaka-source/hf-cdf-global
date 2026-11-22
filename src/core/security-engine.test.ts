import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDefCon,
  canTransitionIncident,
  transitionIncident,
  evaluateContainmentAuthorization,
  filterActiveIntelMemories,
  calculateAnomalyIndex,
} from './security-engine';
import { Incident, SecurityEvent, SharedIntelMemory } from './types';

const mockIncident = (
  id: string,
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info',
  state: Incident['state']
): Incident => ({
  id,
  title: `Test Incident ${id}`,
  severity,
  state,
  detectedAt: '2026-11-04T20:00:00Z',
  updatedAt: '2026-11-04T20:00:00Z',
  assignedInvestigators: ['analyst_01'],
  assignedAgents: ['agent_sentry'],
  affectedAssets: ['asset-k8s-pod-4'],
  associatedAlerts: ['ALERT-99'],
  mitreTactics: ['Initial Access'],
  summary: 'Mock summary',
  evidenceItems: [],
  auditTrail: [
    {
      timestamp: '2026-11-04T20:00:00Z',
      author: 'system',
      action: 'CREATED',
      details: 'Incident detected',
    },
  ],
});

test('calculateDefCon returns DEFCON 1 when uncontained critical incident is present', () => {
  const incidents = [mockIncident('inc-1', 'critical', 'investigating')];
  const defcon = calculateDefCon(incidents, []);
  assert.equal(defcon, 1);
});

test('calculateDefCon drops from 1 to lower level when critical incident is contained', () => {
  const incidents = [mockIncident('inc-1', 'critical', 'contained')];
  const defcon = calculateDefCon(incidents, []);
  assert.notEqual(defcon, 1);
});

test('calculateDefCon returns 5 when system is quiescent', () => {
  const defcon = calculateDefCon([], []);
  assert.equal(defcon, 5);
});

test('canTransitionIncident enforces state machine ordering', () => {
  // New -> Investigating is allowed
  const valid = canTransitionIncident('new', 'investigating', 'analyst');
  assert.equal(valid.allowed, true);

  // New -> Resolved is illegal
  const invalid = canTransitionIncident('new', 'resolved', 'analyst');
  assert.equal(invalid.allowed, false);
});

test('canTransitionIncident blocks automated agents from closing incidents unilaterally', () => {
  const check = canTransitionIncident('resolved', 'closed', 'agent_automated');
  assert.equal(check.allowed, false);
  assert.match(check.reason || '', /require human SecOps sign-off/);
});

test('transitionIncident updates state and appends auditable log', () => {
  const initial = mockIncident('inc-42', 'high', 'new');
  const updated = transitionIncident(
    initial,
    'investigating',
    'analyst_sarah',
    'analyst',
    'Triaging initial telemetry logs'
  );

  assert.equal(updated.state, 'investigating');
  assert.equal(updated.auditTrail.length, 2);
  assert.equal(updated.auditTrail[1].author, 'analyst_sarah');
  assert.match(updated.auditTrail[1].action, /NEW_TO_INVESTIGATING/);
});

test('evaluateContainmentAuthorization checks administrative credentials', () => {
  assert.equal(evaluateContainmentAuthorization('ISOLATE_SUBNET', 'admin', 'analyst'), false);
  assert.equal(evaluateContainmentAuthorization('ISOLATE_SUBNET', 'admin', 'admin'), true);
  assert.equal(evaluateContainmentAuthorization('REVOKE_TOKEN', 'secops_lead', 'secops_lead'), true);
});

test('filterActiveIntelMemories excludes expired intelligence records and sorts by confidence', () => {
  const memories: SharedIntelMemory[] = [
    {
      id: 'm-1',
      originAgentId: 'agent-1',
      topic: 'C2 IP Observed',
      observation: '198.51.100.22 beaconing',
      confidence: 85,
      timestamp: '2026-11-04T12:00:00Z',
      expiresAt: '2026-11-04T18:00:00Z', // Expired relative to 20:00:00Z
      tags: ['c2', 'ip'],
      verifiedByHuman: true,
    },
    {
      id: 'm-2',
      originAgentId: 'agent-2',
      topic: 'API Token Spraying',
      observation: 'High rate on /v1/models',
      confidence: 96,
      timestamp: '2026-11-04T19:00:00Z',
      expiresAt: '2026-11-04T23:59:59Z', // Active
      tags: ['auth', 'api'],
      verifiedByHuman: true,
    },
    {
      id: 'm-3',
      originAgentId: 'agent-3',
      topic: 'Kubernetes Pod Escapes',
      observation: 'Namespace privilege check',
      confidence: 70,
      timestamp: '2026-11-04T19:30:00Z',
      expiresAt: '2026-11-04T23:59:59Z', // Active
      tags: ['k8s'],
      verifiedByHuman: false,
    },
  ];

  const active = filterActiveIntelMemories(memories, '2026-11-04T20:00:00Z');
  assert.equal(active.length, 2);
  assert.equal(active[0].id, 'm-2'); // higher confidence first
  assert.equal(active[1].id, 'm-3');
});

test('calculateAnomalyIndex computes a bounded score', () => {
  const events: SecurityEvent[] = [
    {
      id: 'e-1',
      timestamp: '2026-11-04T20:00:00Z',
      type: 'live',
      severity: 'critical',
      source: '10.0.1.20',
      destination: '10.0.4.5',
      category: 'Exfiltration',
      signature: 'WEIGHT_DOWNLOAD_ANOMALY',
      actionTaken: 'FLAGGED',
      verified: true,
    },
  ];

  const score = calculateAnomalyIndex(events);
  assert.ok(score >= 0 && score <= 100);
});

test('executeDeveloperCommand handles help and command parsing', async () => {
  const { executeDeveloperCommand } = await import('./security-engine');
  const context = {
    agentsCount: 7,
    uncontainedIncidents: 1,
    defcon: 1,
    isolatedNodesCount: 1,
  };

  const helpRes = executeDeveloperCommand('help', context);
  assert.match(helpRes.output, /CDF Developer & SecOps CLI/);

  const defconRes = executeDeveloperCommand('defcon set 2', context);
  assert.equal(defconRes.action, 'override_defcon');
  assert.equal(defconRes.param, 2);

  const testRuleRes = executeDeveloperCommand('rules test RULE-SIGMA-01', context);
  assert.match(testRuleRes.output, /Syntax verified/);

  const unknownRes = executeDeveloperCommand('random-command', context);
  assert.match(unknownRes.output, /Command not recognized/);
});
