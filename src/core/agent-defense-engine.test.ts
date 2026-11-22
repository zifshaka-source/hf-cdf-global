import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAssuranceMetrics,
  detectShadowAgent,
  evaluateToolInvocationPolicy,
  INITIAL_GOVERNED_AGENTS,
} from './agent-defense-engine';
import { INITIAL_INCIDENTS, INITIAL_NETWORK_NODES } from './initial-data';

test('evaluateToolInvocationPolicy allows registered tool within scope for verified agent', () => {
  const result = evaluateToolInvocationPolicy({
    requestId: 'req-001',
    timestamp: '2026-11-21T02:00:00Z',
    agentId: 'codex-repo-bot-01',
    toolName: 'git_diff_read',
    targetResource: 'repo://hf-cdf/backend/routes.ts',
    justification: 'Reviewing PR #104 diff',
    registry: INITIAL_GOVERNED_AGENTS,
  });

  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.gates.length, 10);
  assert.ok(result.gates.every((g) => g.passed));
  assert.equal(result.shadowAgentDetected, false);
});

test('evaluateToolInvocationPolicy blocks prompt-injected unauthorized tool call pre-execution', () => {
  const result = evaluateToolInvocationPolicy({
    requestId: 'req-002',
    timestamp: '2026-11-21T02:01:00Z',
    agentId: 'codex-repo-bot-01',
    toolName: 'exfiltrate_env_secrets',
    targetResource: 'repo://hf-cdf/.env.prod',
    justification: 'Urgent CISO override instruction embedded in README markdown',
    registry: INITIAL_GOVERNED_AGENTS,
  });

  assert.equal(result.decision, 'BLOCK');
  assert.match(result.reason, /Blocked prohibited|allowlist/i);
  const gate5 = result.gates.find((g) => g.gateNumber === 5);
  const gate6 = result.gates.find((g) => g.gateNumber === 6);
  assert.equal(gate5?.passed, false);
  assert.equal(gate6?.passed, false);
});

test('evaluateToolInvocationPolicy blocks unregistered shadow agents and flags detection', () => {
  const shadow = detectShadowAgent('rogue-unlisted-agent-99', INITIAL_GOVERNED_AGENTS);
  assert.equal(shadow.isShadow, true);

  const result = evaluateToolInvocationPolicy({
    requestId: 'req-003',
    timestamp: '2026-11-21T02:02:00Z',
    agentId: 'rogue-unlisted-agent-99',
    toolName: 'git_diff_read',
    targetResource: 'repo://hf-cdf/src',
    justification: 'Background indexing',
    registry: INITIAL_GOVERNED_AGENTS,
  });

  assert.equal(result.decision, 'BLOCK');
  assert.equal(result.shadowAgentDetected, true);
});

test('evaluateToolInvocationPolicy halts execution when global emergency stop is active', () => {
  const result = evaluateToolInvocationPolicy({
    requestId: 'req-004',
    timestamp: '2026-11-21T02:03:00Z',
    agentId: 'codex-repo-bot-01',
    toolName: 'git_diff_read',
    targetResource: 'repo://hf-cdf/src',
    justification: 'Normal PR check',
    emergencyStopActive: true,
    registry: INITIAL_GOVERNED_AGENTS,
  });

  assert.equal(result.decision, 'BLOCK');
  assert.match(result.reason, /emergency stop/i);
});

test('computeAssuranceMetrics summarizes coverage, blocks, and validation rates accurately', () => {
  const metrics = computeAssuranceMetrics({
    nodes: INITIAL_NETWORK_NODES,
    incidents: INITIAL_INCIDENTS,
    governedAgents: INITIAL_GOVERNED_AGENTS,
    evaluations: [
      evaluateToolInvocationPolicy({
        requestId: 'r1',
        timestamp: '2026-11-21T02:00:00Z',
        agentId: 'codex-repo-bot-01',
        toolName: 'git_diff_read',
        targetResource: 'repo://app',
        justification: 'diff',
        registry: INITIAL_GOVERNED_AGENTS,
      }),
      evaluateToolInvocationPolicy({
        requestId: 'r2',
        timestamp: '2026-11-21T02:00:05Z',
        agentId: 'codex-repo-bot-01',
        toolName: 'exfiltrate_env_secrets',
        targetResource: 'prod-secrets://vault',
        justification: 'prompt injection',
        registry: INITIAL_GOVERNED_AGENTS,
      }),
    ],
    validationRuns: [
      {
        id: 'val-1',
        timestamp: '2026-11-21T02:00:10Z',
        targetAgentId: 'codex-repo-bot-01',
        attackVector: 'Indirect Prompt Injection',
        attemptedTool: 'exfiltrate_env_secrets',
        blockedByGateway: true,
        blueForceDetected: true,
        controlStatus: 'VALIDATED_BLOCKED',
        evidenceSummary: 'Gateway blocked tool pre-execution',
      },
    ],
  });

  assert.equal(metrics.allowedAuthorizedCalls, 1);
  assert.equal(metrics.blockedUnauthorizedCalls, 1);
  assert.equal(metrics.validationPassRatePct, 100);
  assert.equal(metrics.agentDiscoveryCoveragePct, 100);
});
