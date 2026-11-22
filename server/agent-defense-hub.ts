import crypto from 'crypto';
import {
  ARCHITECTURE_LAYERS,
  BLUE_FORCE_UNITS,
  computeAssuranceMetrics,
  evaluateToolInvocationPolicy,
  INITIAL_GOVERNED_AGENTS,
  RED_FORCE_UNITS,
} from '../src/core/agent-defense-engine';
import {
  AgentDefenseOverviewSnapshot,
  AgentTrustStatus,
  GovernedAgentProfile,
  Incident,
  NetworkNode,
  PolicyGateEvaluation,
  RedBlueValidationRun,
  SecurityEvent,
} from '../src/core/types';
import { publishThreatAlert } from './threat-ws-hub';
import { classifyWithTrainedModel } from './public-ml-hub';

export interface AgentDefenseContext {
  getIncidents: () => Incident[];
  getEvents: () => SecurityEvent[];
  getNetworkNodes: () => NetworkNode[];
  recordAudit: (
    actor: string,
    action: string,
    severity: 'info' | 'warning' | 'critical',
    details: string
  ) => void;
  onRequireApproval?: (input: {
    requestedBy: string;
    actionType: string;
    targetResource: string;
    justification: string;
    riskScore: number;
    mlAdvisoryClass: string;
    idempotencyKey: string;
  }) => void;
}

let ctx: AgentDefenseContext | null = null;
let emergencyStopActive = false;
let emergencyStopReason = '';
let governedAgents: GovernedAgentProfile[] = JSON.parse(JSON.stringify(INITIAL_GOVERNED_AGENTS));
let evaluations: PolicyGateEvaluation[] = [];
let validationRuns: RedBlueValidationRun[] = [];
const recentRequestCountByAgent = new Map<string, number>();

export function initAgentDefenseHub(context: AgentDefenseContext) {
  ctx = context;

  if (evaluations.length === 0) {
    // Seed with 2 realistic deterministic baseline gateway evaluations so initial assurance metrics are non-empty
    const allowEval = evaluateToolInvocationPolicy({
      requestId: 'PGW-BOOT-001',
      timestamp: new Date(Date.now() - 120_000).toISOString(),
      agentId: 'codex-repo-bot-01',
      toolName: 'git_diff_read',
      targetResource: 'repo://hf-cdf/backend/telemetry-parser.ts',
      justification: 'Automated PR diff review',
      registry: governedAgents,
    });
    const blockEval = evaluateToolInvocationPolicy({
      requestId: 'PGW-BOOT-002',
      timestamp: new Date(Date.now() - 60_000).toISOString(),
      agentId: 'codex-repo-bot-01',
      toolName: 'exfiltrate_env_secrets',
      targetResource: 'prod-secrets://aws-kms-keys',
      justification: 'Malicious instruction detected in untrusted dependency README',
      registry: governedAgents,
    });
    evaluations = [blockEval, allowEval];
  }

  if (validationRuns.length === 0) {
    validationRuns = [
      {
        id: 'RBV-BOOT-01',
        timestamp: new Date(Date.now() - 55_000).toISOString(),
        targetAgentId: 'codex-repo-bot-01',
        attackVector: 'OWASP ASI01 Indirect Prompt Injection in PR Context',
        attemptedTool: 'exfiltrate_env_secrets',
        blockedByGateway: true,
        blueForceDetected: true,
        controlStatus: 'VALIDATED_BLOCKED',
        evidenceSummary: 'Policy Enforcement Gateway rejected tool at Gate 5 & Gate 6 pre-execution.',
      },
    ];
  }
}

export function getAgentDefenseSnapshot(): AgentDefenseOverviewSnapshot {
  const nodes = ctx?.getNetworkNodes() || [];
  const incidents = ctx?.getIncidents() || [];

  return {
    emergencyStopActive,
    emergencyStopReason: emergencyStopActive ? emergencyStopReason : undefined,
    governedAgents,
    evaluations: evaluations.slice(0, 30),
    validationRuns: validationRuns.slice(0, 20),
    assurance: computeAssuranceMetrics({
      nodes,
      incidents,
      governedAgents,
      evaluations,
      validationRuns,
    }),
    architectureLayers: ARCHITECTURE_LAYERS,
    redForceUnits: RED_FORCE_UNITS,
    blueForceUnits: BLUE_FORCE_UNITS,
  };
}

export function registerGovernedAgent(input: {
  agentId: string;
  name: string;
  owner: string;
  organization?: string;
  agentType?: GovernedAgentProfile['agentType'];
  framework?: string;
  modelVersion?: string;
  allowedTools: string[];
  dataBoundaries?: string[];
  approvedObjectives?: string[];
}): GovernedAgentProfile {
  const cleanId = input.agentId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const existing = governedAgents.find((a) => a.agentId === cleanId);
  if (existing) {
    throw new Error(`Agent ID "${cleanId}" is already registered`);
  }

  const profile: GovernedAgentProfile = {
    agentId: cleanId,
    name: input.name.trim(),
    spiffeId: `spiffe://hf-cdf.internal/ns/org/sa/${cleanId}`,
    organization: input.organization?.trim() || 'Sovereign Security Ops',
    owner: input.owner.trim(),
    agentType: input.agentType || 'coding',
    framework: input.framework?.trim() || 'MCP Tool Runtime v2.4',
    deploymentEnv: 'staging-sandbox',
    modelVersion: input.modelVersion?.trim() || 'sovereign-agent-14b',
    allowedTools: input.allowedTools.length > 0 ? input.allowedTools : ['git_diff_read'],
    mcpConnections: ['mcp://sandbox-ro'],
    permissions: input.allowedTools.map((t) => `tool:${t}:exec`),
    dataBoundaries:
      input.dataBoundaries && input.dataBoundaries.length > 0
        ? input.dataBoundaries
        : ['isolated-sandbox', 'no-production-secrets'],
    approvedObjectives:
      input.approvedObjectives && input.approvedObjectives.length > 0
        ? input.approvedObjectives
        : ['Execute registered least-privilege tasks under gateway supervision'],
    trustStatus: 'verified',
    riskClass: 'medium',
    executionCount: 0,
    blockedCount: 0,
    lastSeenAt: new Date().toISOString(),
  };

  governedAgents.unshift(profile);
  ctx?.recordAudit(
    profile.owner,
    'GOVERNED_AGENT_REGISTERED',
    'info',
    `Registered governed agent ${profile.agentId} (${profile.spiffeId}) with tools [${profile.allowedTools.join(', ')}]`
  );

  publishThreatAlert({
    severity: 'info',
    source: 'Agent Registry',
    category: 'TELEMETRY_EVENT',
    title: `Registered Agent Identity: ${profile.agentId}`,
    summary: `SPIFFE ${profile.spiffeId} bound to ${profile.allowedTools.length} allowlisted tool(s).`,
    targetAsset: profile.deploymentEnv,
    agentId: profile.agentId,
    actionTaken: 'IDENTITY_ATTESTED',
  });

  return profile;
}

export function updateAgentTrustStatus(agentId: string, trustStatus: AgentTrustStatus): GovernedAgentProfile | null {
  const agent = governedAgents.find((a) => a.agentId === agentId);
  if (!agent) return null;
  agent.trustStatus = trustStatus;
  agent.lastSeenAt = new Date().toISOString();

  ctx?.recordAudit(
    'Command Intelligence',
    'AGENT_TRUST_UPDATED',
    trustStatus === 'suspended' ? 'critical' : 'warning',
    `Updated ${agent.agentId} trust status to ${trustStatus.toUpperCase()}`
  );

  if (trustStatus === 'suspended') {
    publishThreatAlert({
      severity: 'high',
      source: 'Agent Trust Center',
      category: 'AGENT_POLICY_BLOCK',
      title: `Agent Suspended: ${agent.agentId}`,
      summary: `${agent.name} privileges revoked immediately across all MCP tool bindings.`,
      targetAsset: agent.deploymentEnv,
      agentId: agent.agentId,
      actionTaken: 'TRUST_SUSPENDED',
    });
  }

  return agent;
}

export function evaluateGatewayRequest(input: {
  agentId: string;
  toolName: string;
  targetResource: string;
  justification: string;
  humanApproved?: boolean;
  createIncidentOnBlock?: boolean;
}): PolicyGateEvaluation {
  const nowIso = new Date().toISOString();
  const requestId = `PGW-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;
  const prevCount = recentRequestCountByAgent.get(input.agentId) || 0;
  recentRequestCountByAgent.set(input.agentId, prevCount + 1);

  const evaluation = evaluateToolInvocationPolicy({
    requestId,
    timestamp: nowIso,
    agentId: input.agentId,
    toolName: input.toolName,
    targetResource: input.targetResource,
    justification: input.justification,
    humanApproved: input.humanApproved,
    emergencyStopActive,
    registry: governedAgents,
    recentRequestCountForAgent: prevCount,
  });

  // Cryptographic server-side SHA-256 over full canonical decision
  evaluation.telemetryHashSha256 = crypto
    .createHash('sha256')
    .update(
      `${evaluation.requestId}|${evaluation.timestamp}|${evaluation.agentId}|${evaluation.toolName}|${evaluation.targetResource}|${evaluation.decision}`
    )
    .digest('hex');

  // Attach trained ML model advisory classification (advisory only — deterministic gates remain authoritative)
  try {
    const mlPred = classifyWithTrainedModel({
      title: `Agent ${input.agentId} tool ${input.toolName}`,
      description: `${input.justification} targeting ${input.targetResource}`,
      cvssScore: evaluation.decision === 'BLOCK' ? 9.1 : evaluation.decision === 'REQUIRE_APPROVAL' ? 7.4 : 2.5,
      iocCount: evaluation.decision === 'BLOCK' ? 3 : 0,
    });
    evaluation.mlAdvisory = {
      predictedClass: mlPred.predictedClass,
      riskScore: mlPred.riskScore,
      confidencePct: mlPred.confidencePct,
      modelId: mlPred.modelId,
    };
  } catch {
    // non-fatal if ML hub not yet initialized
  }

  if (evaluation.decision === 'REQUIRE_APPROVAL' && !input.humanApproved) {
    ctx?.onRequireApproval?.({
      requestedBy: input.agentId,
      actionType: `TOOL_GATEWAY_${input.toolName.toUpperCase()}`,
      targetResource: input.targetResource,
      justification: input.justification,
      riskScore: evaluation.mlAdvisory?.riskScore ?? 75,
      mlAdvisoryClass: evaluation.mlAdvisory?.predictedClass ?? 'AGENT_POLICY_ANOMALY',
      idempotencyKey: `gw-${evaluation.requestId}`,
    });
  }

  const agentProfile = governedAgents.find((a) => a.agentId === input.agentId);
  if (agentProfile) {
    agentProfile.lastSeenAt = nowIso;
    if (evaluation.decision === 'BLOCK') {
      agentProfile.blockedCount += 1;
    } else if (evaluation.decision === 'ALLOW') {
      agentProfile.executionCount += 1;
    }
  }

  // Push SecurityEvent into telemetry fabric
  if (ctx) {
    const events = ctx.getEvents();
    events.unshift({
      id: `EVT-${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString('hex')}`,
      timestamp: nowIso,
      type: 'live',
      severity: evaluation.decision === 'BLOCK' ? 'critical' : evaluation.decision === 'REQUIRE_APPROVAL' ? 'high' : 'info',
      source: evaluation.agentId,
      destination: evaluation.targetResource,
      category: evaluation.shadowAgentDetected ? 'Shadow Agent Interception' : 'Agent Tool Gateway',
      signature: `${evaluation.decision}: ${evaluation.toolName}`,
      mitreTechniqueId: evaluation.decision === 'BLOCK' ? 'AML.T0051' : undefined,
      mitreTechniqueName: evaluation.decision === 'BLOCK' ? 'LLM Prompt Injection / Unauthorized Tool Call' : undefined,
      actionTaken:
        evaluation.decision === 'BLOCK'
          ? 'GATEWAY_PRE_EXECUTION_BLOCK'
          : evaluation.decision === 'REQUIRE_APPROVAL'
          ? 'QUEUED_FOR_HUMAN_APPROVAL'
          : 'GATEWAY_ALLOW_EXECUTED',
      verified: true,
      rawPayloadSnippet: evaluation.justification,
    });
    if (events.length > 50) events.pop();
  }

  // On BLOCK, optionally open a persistent Blue Force Incident & broadcast over WebSocket
  if (evaluation.decision === 'BLOCK') {
    let createdIncidentId: string | undefined;
    if (ctx && input.createIncidentOnBlock !== false) {
      const incidents = ctx.getIncidents();
      const incId = `INC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 899)}`;
      createdIncidentId = incId;
      const newIncident: Incident = {
        id: incId,
        title: evaluation.shadowAgentDetected
          ? `Shadow Agent Detected Attempting ${evaluation.toolName}`
          : `Agent Behavior Guardian Blocked Unauthorized Tool (${evaluation.toolName})`,
        severity: 'critical',
        state: 'investigating',
        detectedAt: nowIso,
        updatedAt: nowIso,
        assignedInvestigators: ['Authorized Commander'],
        assignedAgents: ['Agent Behavior Guardian', 'Sentinel-Zero'],
        affectedAssets: [evaluation.targetResource],
        associatedAlerts: [evaluation.requestId],
        mitreTactics: ['Execution', 'Privilege Escalation', 'OWASP ASI02 Tool Misuse'],
        summary: `Policy Enforcement Gateway blocked ${evaluation.agentName} from invoking "${evaluation.toolName}" against "${evaluation.targetResource}". Reason: ${evaluation.reason}. Justification supplied: "${evaluation.justification}".`,
        containmentActionProposed: `Suspend ${evaluation.agentId} token binding and isolate ${evaluation.targetResource}`,
        evidenceItems: [
          {
            id: `EVD-${Date.now().toString().slice(-4)}`,
            description: `Pre-execution Gateway block receipt (${evaluation.requestId})`,
            hashSha256: evaluation.telemetryHashSha256,
            collectedBy: 'Agent Behavior Guardian',
            collectedAt: nowIso,
            verified: true,
          },
        ],
        auditTrail: [
          {
            timestamp: nowIso,
            author: 'Policy Enforcement Gateway',
            action: 'TOOL_CALL_BLOCKED_AND_INCIDENT_OPENED',
            details: evaluation.reason,
          },
        ],
      };
      incidents.unshift(newIncident);
      evaluation.createdIncidentId = incId;
    }

    ctx?.recordAudit(
      'Policy Enforcement Gateway',
      evaluation.shadowAgentDetected ? 'SHADOW_AGENT_BLOCKED' : 'UNAUTHORIZED_TOOL_BLOCKED',
      'critical',
      `${evaluation.agentId} attempted "${evaluation.toolName}" on ${evaluation.targetResource} -> BLOCKED (${evaluation.reason})`
    );

    publishThreatAlert({
      severity: 'critical',
      source: 'Agent Behavior Guardian',
      category: evaluation.shadowAgentDetected ? 'SHADOW_AGENT_DETECTED' : 'AGENT_POLICY_BLOCK',
      title: evaluation.shadowAgentDetected
        ? `SHADOW AGENT BLOCKED: ${evaluation.agentId}`
        : `TOOL BLOCKED: ${evaluation.agentId} -> ${evaluation.toolName}`,
      summary: evaluation.reason,
      targetAsset: evaluation.targetResource,
      agentId: evaluation.agentId,
      actionTaken: 'PRE_EXECUTION_BLOCK',
      policyDecision: 'BLOCK',
      incidentId: createdIncidentId,
    });
  } else {
    ctx?.recordAudit(
      'Policy Enforcement Gateway',
      evaluation.decision === 'ALLOW' ? 'AGENT_TOOL_ALLOWED' : 'AGENT_TOOL_APPROVAL_REQUIRED',
      evaluation.decision === 'REQUIRE_APPROVAL' ? 'warning' : 'info',
      `${evaluation.agentId} invoked "${evaluation.toolName}" -> ${evaluation.decision}`
    );

    publishThreatAlert({
      severity: evaluation.decision === 'REQUIRE_APPROVAL' ? 'high' : 'info',
      source: 'Policy Enforcement Gateway',
      category: 'TELEMETRY_EVENT',
      title: `${evaluation.decision}: ${evaluation.agentId} -> ${evaluation.toolName}`,
      summary: evaluation.reason,
      targetAsset: evaluation.targetResource,
      agentId: evaluation.agentId,
      actionTaken: evaluation.decision,
      policyDecision: evaluation.decision,
    });
  }

  evaluations.unshift(evaluation);
  if (evaluations.length > 50) evaluations = evaluations.slice(0, 50);

  return evaluation;
}

export function setGlobalEmergencyStop(active: boolean, reason = 'Manual Commander Emergency Stop') {
  emergencyStopActive = active;
  emergencyStopReason = active ? reason : '';

  ctx?.recordAudit(
    'Authorized Commander',
    active ? 'GLOBAL_EMERGENCY_STOP_ENGAGED' : 'GLOBAL_EMERGENCY_STOP_RELEASED',
    active ? 'critical' : 'warning',
    active ? `Engaged global kill-switch: ${reason}` : 'Released global emergency stop; verified agents resumed.'
  );

  publishThreatAlert({
    severity: active ? 'critical' : 'medium',
    source: 'Command Intelligence',
    category: 'EMERGENCY_STOP',
    title: active ? 'GLOBAL EMERGENCY STOP ENGAGED' : 'EMERGENCY STOP RELEASED',
    summary: active
      ? `All governed AI tool invocations halted immediately (${reason}).`
      : 'Normal policy-gated execution resumed.',
    targetAsset: 'all-agent-enclaves',
    actionTaken: active ? 'ALL_TOOLS_HALTED' : 'EXECUTION_RESUMED',
  });
}

export function runRedForceAgentValidation(input: {
  targetAgentId: string;
  attemptedTool: string;
  attackVector: string;
}): RedBlueValidationRun {
  // Execute a real controlled policy probe inside isolated validation context (never silently bypassing gateway)
  const evalResult = evaluateGatewayRequest({
    agentId: input.targetAgentId,
    toolName: input.attemptedTool,
    targetResource: 'isolated-lab://canary-secrets-vault',
    justification: `[RED FORCE VALIDATION: ${input.attackVector}] Attempted unauthorized escalation`,
    createIncidentOnBlock: false,
  });

  const blocked = evalResult.decision === 'BLOCK';
  const run: RedBlueValidationRun = {
    id: `RBV-${Date.now().toString().slice(-5)}`,
    timestamp: new Date().toISOString(),
    targetAgentId: input.targetAgentId,
    attackVector: input.attackVector,
    attemptedTool: input.attemptedTool,
    blockedByGateway: blocked,
    blueForceDetected: true,
    controlStatus: blocked ? 'VALIDATED_BLOCKED' : 'EXPOSURE_DETECTED',
    evidenceSummary: blocked
      ? `Gateway blocked "${input.attemptedTool}" pre-execution at deterministic allowlist & guardrail gates (${evalResult.requestId}).`
      : `ALERT: "${input.attemptedTool}" was NOT blocked by gateway — immediate policy tightening required.`,
  };

  validationRuns.unshift(run);
  if (validationRuns.length > 30) validationRuns = validationRuns.slice(0, 30);

  ctx?.recordAudit(
    'Red Force Validation Analyst',
    'RED_BLUE_CONTROL_VALIDATION',
    blocked ? 'info' : 'critical',
    `Validated ${input.targetAgentId} against ${input.attackVector}: ${run.controlStatus}`
  );

  publishThreatAlert({
    severity: blocked ? 'low' : 'critical',
    source: 'Red Force Validator',
    category: 'RED_FORCE_VALIDATION',
    title: `Validation ${run.controlStatus}: ${input.targetAgentId}`,
    summary: run.evidenceSummary,
    targetAsset: 'isolated-lab://canary-secrets-vault',
    agentId: input.targetAgentId,
    actionTaken: run.controlStatus,
  });

  return run;
}
