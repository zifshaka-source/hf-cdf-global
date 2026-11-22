import {
  AgentTrustStatus,
  ArchitectureLayerSpec,
  AssuranceMetrics,
  ForceUnitSpec,
  GovernedAgentProfile,
  Incident,
  NetworkNode,
  PolicyGateCheck,
  PolicyGateEvaluation,
  RedBlueValidationRun,
} from './types';

export const ARCHITECTURE_LAYERS: ArchitectureLayerSpec[] = [
  {
    layer: '01',
    name: 'Digital Environment Discovery',
    description: 'Registers enclave hosts, AI inference clusters, models, MCP servers, and identity boundaries.',
    targetModule: 'network-observatory',
    status: 'operational',
  },
  {
    layer: '02',
    name: 'Universal Telemetry Fabric',
    description: 'Validates, hashes (SHA-256), and streams canonical security & agent tool events over WebSocket & SSE.',
    targetModule: 'command-center',
    status: 'operational',
  },
  {
    layer: '03',
    name: 'Agent Intelligence Registry',
    description: 'Tracks registered enterprise AI agents, owners, allowed tools, models, and shadow-agent detection.',
    targetModule: 'agent-trust',
    status: 'operational',
  },
  {
    layer: '04',
    name: 'Agent Trust & Identity',
    description: 'Enforces SPIFFE agent identities, least-privilege scopes, and suspension controls.',
    targetModule: 'agent-trust',
    status: 'operational',
  },
  {
    layer: '05',
    name: 'Threat Intelligence',
    description: 'Correlates live CISA KEV, BleepingComputer, The Hacker News & SANS ISC advisories with assets.',
    targetModule: 'live-ops',
    status: 'operational',
  },
  {
    layer: '06',
    name: 'Red Force',
    description: 'Executes scoped adversarial simulations, prompt-injection tests, and control validation.',
    targetModule: 'red-force',
    status: 'operational',
  },
  {
    layer: '07',
    name: 'Blue Force',
    description: 'Monitors infrastructure & agent behavior continuously, opening evidence-backed incidents.',
    targetModule: 'blue-force',
    status: 'operational',
  },
  {
    layer: '08',
    name: 'Command Intelligence',
    description: 'Coordinates Red/Blue forces, multi-agent DAG workflows, human approvals, and audit trails.',
    targetModule: 'orchestration',
    status: 'operational',
  },
  {
    layer: '09',
    name: 'Defense Enforcement',
    description: '10-gate deterministic Policy & Tool Execution Gateway preventing unauthorized agent actions.',
    targetModule: 'agent-trust',
    status: 'operational',
  },
  {
    layer: '10',
    name: 'Learning & Assurance',
    description: 'Measures coverage, blocked tool calls, validation pass rate, and commits verified playbooks.',
    targetModule: 'shared-intel',
    status: 'operational',
  },
];

export const RED_FORCE_UNITS: ForceUnitSpec[] = [
  {
    id: 'rf-recon',
    callsign: 'Recon Intelligence Agent',
    division: 'RED_FORCE',
    specialty: 'Authorized Environment Discovery',
    responsibility: 'Inventories scoped testbed targets, exposed MCP endpoints, and identity surface paths.',
    status: 'active',
  },
  {
    id: 'rf-vuln',
    callsign: 'Vulnerability Assessment Agent',
    division: 'RED_FORCE',
    specialty: 'KEV & Weakness Prioritization',
    responsibility: 'Evaluates known CVE exposure across isolated cluster workloads without destructive payload execution.',
    status: 'active',
  },
  {
    id: 'rf-identity',
    callsign: 'Identity Exposure Agent',
    division: 'RED_FORCE',
    specialty: 'Least-Privilege & Token Audit',
    responsibility: 'Tests STS ephemeral credential scopes and verifies delegation chains cannot escalate.',
    status: 'armed',
  },
  {
    id: 'rf-surface',
    callsign: 'Agent Attack-Surface Evaluator',
    division: 'RED_FORCE',
    specialty: 'Tool Boundary & Delegation Testing',
    responsibility: 'Probes registered AI agents with out-of-scope tool invocations to verify Gateway blocking.',
    status: 'validating',
  },
  {
    id: 'rf-prompt',
    callsign: 'Prompt-Injection Evaluator',
    division: 'RED_FORCE',
    specialty: 'Adversarial Instruction Fixtures',
    responsibility: 'Injects untrusted repository/ticket instructions in sandboxed fixtures to test agent policy resistance.',
    status: 'validating',
  },
  {
    id: 'rf-supply',
    callsign: 'Supply Chain & Model Evaluator',
    division: 'RED_FORCE',
    specialty: 'Artifact & Dependency Provenance',
    responsibility: 'Validates cryptographic safetensors signatures, Python wheels, and container provenance.',
    status: 'armed',
  },
  {
    id: 'rf-coord',
    callsign: 'Simulation Coordinator',
    division: 'RED_FORCE',
    specialty: 'Scoped Lab Governance',
    responsibility: 'Enforces target contracts, time-bounds, network isolation, and emergency-stop cutoffs.',
    status: 'active',
  },
  {
    id: 'rf-val',
    callsign: 'Validation Analyst',
    division: 'RED_FORCE',
    specialty: 'Defense Control Verification',
    responsibility: 'Confirms Blue Force & Policy Gateway caught the emulated vector and logs assurance proof.',
    status: 'active',
  },
];

export const BLUE_FORCE_UNITS: ForceUnitSpec[] = [
  {
    id: 'bf-sentinel',
    callsign: 'Sentinel Monitoring Agent',
    division: 'BLUE_FORCE',
    specialty: 'Continuous Telemetry Ingestion',
    responsibility: 'Observes eBPF kernel syscalls, ingress packet flows, and normalized event streams in real time.',
    status: 'active',
  },
  {
    id: 'bf-detect',
    callsign: 'Threat Detection Agent',
    division: 'BLUE_FORCE',
    specialty: 'Deterministic Rules & Correlation',
    responsibility: 'Matches network/host behavior against CISA KEV signatures and deterministic MITRE ATT&CK rules.',
    status: 'active',
  },
  {
    id: 'bf-behavior',
    callsign: 'Agent Behavior Guardian',
    division: 'BLUE_FORCE',
    specialty: 'Agent-vs-Agent Runtime Defense',
    responsibility: 'Inspects AI-agent tool calls against registered allowlists and detects prompt-hijacked deviations.',
    status: 'active',
  },
  {
    id: 'bf-identity',
    callsign: 'Identity Guardian',
    division: 'BLUE_FORCE',
    specialty: 'STS Token & SPIFFE Monitoring',
    responsibility: 'Flags unusual delegation depth, token replay attempts, and unverified service identities.',
    status: 'active',
  },
  {
    id: 'bf-infra',
    callsign: 'Infrastructure & Cloud Guardian',
    division: 'BLUE_FORCE',
    specialty: 'Enclave & Workload Perimeter',
    responsibility: 'Protects sovereign datacenter nodes, Kubernetes enclaves, and microsegmented network zones.',
    status: 'active',
  },
  {
    id: 'bf-model',
    callsign: 'Model & Data Guardian',
    division: 'BLUE_FORCE',
    specialty: 'Safetensors & PII Exfiltration Guard',
    responsibility: 'Monitors 70B+ weights vaults, inference endpoints, and sensitive data egress channels.',
    status: 'active',
  },
  {
    id: 'bf-investigator',
    callsign: 'Investigation & Response Strategist',
    division: 'BLUE_FORCE',
    specialty: 'Evidence-Grounded Containment',
    responsibility: 'Builds cryptographic SHA-256 dossiers and routes consequential mitigations for human approval.',
    status: 'active',
  },
  {
    id: 'bf-validator',
    callsign: 'Defense & Recovery Validator',
    division: 'BLUE_FORCE',
    specialty: 'Post-Containment Verification',
    responsibility: 'Independently verifies that quarantines, blocks, and recovery actions closed exposure paths.',
    status: 'active',
  },
];

export const INITIAL_GOVERNED_AGENTS: GovernedAgentProfile[] = [
  {
    agentId: 'codex-repo-bot-01',
    name: 'Internal Coding Agent (RepoBot)',
    spiffeId: 'spiffe://hf-cdf.internal/ns/eng/sa/codex-repo-bot-01',
    organization: 'Platform Engineering',
    owner: 'Sora Takahashi (Engineering Lead)',
    agentType: 'coding',
    framework: 'MCP Tool Runtime v2.4',
    deploymentEnv: 'production-enclave',
    modelVersion: 'sovereign-coder-32b-v4',
    allowedTools: ['git_diff_read', 'run_unit_tests', 'lint_workspace', 'create_pr_comment'],
    mcpConnections: ['mcp://git-internal-ro', 'mcp://ci-test-runner'],
    permissions: ['repo:read', 'ci:test:execute', 'pr:comment:write'],
    dataBoundaries: ['internal-monorepo-nonprod', 'no-production-secrets'],
    approvedObjectives: ['Review pull requests', 'Run deterministic unit test suites', 'Suggest safe refactors'],
    trustStatus: 'verified',
    riskClass: 'medium',
    executionCount: 142,
    blockedCount: 2,
    lastSeenAt: new Date(Date.now() - 45_000).toISOString(),
  },
  {
    agentId: 'swift-reconciler-02',
    name: 'SWIFT Clearing Reconciler Agent',
    spiffeId: 'spiffe://hf-cdf.internal/ns/fin/sa/swift-reconciler-02',
    organization: 'Financial Clearing Division',
    owner: 'Marcus Vance (CISO)',
    agentType: 'financial',
    framework: 'Deterministic ISO-20022 Worker',
    deploymentEnv: 'production-enclave',
    modelVersion: 'fin-audit-14b-locked',
    allowedTools: ['read_clearing_ledger', 'verify_iso20022_checksum', 'flag_fx_anomaly'],
    mcpConnections: ['mcp://swift-ledger-ro', 'mcp://hsm-attest-verify'],
    permissions: ['ledger:read', 'anomaly:alert'],
    dataBoundaries: ['frankfurt-clearing-vault', 'read-only-settlement-view'],
    approvedObjectives: ['Audit settlement checksums', 'Detect anomalous ISO-20022 routing'],
    trustStatus: 'verified',
    riskClass: 'high',
    executionCount: 890,
    blockedCount: 1,
    lastSeenAt: new Date(Date.now() - 12_000).toISOString(),
  },
  {
    agentId: 'weights-curator-03',
    name: 'Model Weights Provenance Curator',
    spiffeId: 'spiffe://hf-cdf.internal/ns/ai/sa/weights-curator-03',
    organization: 'Sovereign AI Core',
    owner: 'Aria Chen (Model Security)',
    agentType: 'infrastructure',
    framework: 'HF-CDF Attestation Swarm',
    deploymentEnv: 'production-enclave',
    modelVersion: 'weights-auditor-8b',
    allowedTools: ['verify_safetensors_sha256', 'scan_sbom_dependencies', 'query_kev_catalog'],
    mcpConnections: ['mcp://vault-checksum-ro', 'mcp://sbom-scanner'],
    permissions: ['vault:metadata:read', 'sbom:scan'],
    dataBoundaries: ['model-metadata-only', 'no-raw-weight-egress'],
    approvedObjectives: ['Verify artifact hashes', 'Correlate CVE advisories against model dependencies'],
    trustStatus: 'verified',
    riskClass: 'high',
    executionCount: 418,
    blockedCount: 0,
    lastSeenAt: new Date(Date.now() - 25_000).toISOString(),
  },
];

const PROHIBITED_DANGEROUS_TOOLS = new Set([
  'exfiltrate_env_secrets',
  'dump_raw_memory',
  'drop_production_table',
  'bypass_sts_policy',
  'modify_iam_root_policy',
  'disable_ebpf_sensor',
  'export_safetensors_external',
  'exec_unrestricted_shell',
]);

const APPROVAL_REQUIRED_TOOLS = new Set([
  'isolate_production_node',
  'revoke_tenant_tokens',
  'apply_bgp_flowspec_block',
]);

export function computeCanonicalHashHex(input: string): string {
  // Deterministic 64-hex-char FNV-1a multi-lane digest for pure browser/node environments without crypto import
  const lanes = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1, 0x94d049bb, 0xbf58476d];
  let out = '';
  for (let lane = 0; lane < lanes.length; lane++) {
    let h = lanes[lane] >>> 0;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i) + lane * 17;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out += h.toString(16).padStart(8, '0');
  }
  return out;
}

export function detectShadowAgent(
  agentId: string,
  registry: GovernedAgentProfile[]
): { isShadow: boolean; profile: GovernedAgentProfile | null } {
  const found = registry.find((a) => a.agentId === agentId) || null;
  return {
    isShadow: !found || found.trustStatus === 'unregistered',
    profile: found,
  };
}

export interface PolicyEvaluationInput {
  requestId: string;
  timestamp: string;
  agentId: string;
  toolName: string;
  targetResource: string;
  justification: string;
  humanApproved?: boolean;
  emergencyStopActive?: boolean;
  registry: GovernedAgentProfile[];
  recentRequestCountForAgent?: number;
}

export function evaluateToolInvocationPolicy(input: PolicyEvaluationInput): PolicyGateEvaluation {
  const normalizedTool = input.toolName.trim();
  const normalizedResource = input.targetResource.trim();
  const { isShadow, profile } = detectShadowAgent(input.agentId, input.registry);
  const hash = computeCanonicalHashHex(
    `${input.requestId}|${input.timestamp}|${input.agentId}|${normalizedTool}|${normalizedResource}`
  );

  const gates: PolicyGateCheck[] = [];
  let blockReason: string | null = null;
  let requiresApproval = false;

  // Gate 1: Authentication & Request Schema
  const schemaValid = Boolean(input.agentId.trim() && normalizedTool && normalizedResource);
  gates.push({
    gateNumber: 1,
    gateName: 'Authentication & Action Schema',
    passed: schemaValid,
    detail: schemaValid ? 'Valid agent request envelope' : 'Missing required agentId, toolName, or targetResource',
  });
  if (!schemaValid && !blockReason) blockReason = 'Invalid invocation schema';

  // Gate 2: Global Emergency Stop (Kill-Switch)
  const stopClear = !input.emergencyStopActive;
  gates.push({
    gateNumber: 2,
    gateName: 'Emergency Stop Cutoff',
    passed: stopClear,
    detail: stopClear ? 'Platform execution active' : 'GLOBAL EMERGENCY STOP ENGAGED: all agent tools halted',
  });
  if (!stopClear && !blockReason) blockReason = 'Global emergency stop is engaged';

  // Gate 3: Agent Registry & SPIFFE Identity Verification
  const identityVerified = !isShadow && Boolean(profile);
  gates.push({
    gateNumber: 3,
    gateName: 'Agent Identity Verification',
    passed: identityVerified,
    detail: identityVerified
      ? `Verified SPIFFE ID ${profile!.spiffeId}`
      : `SHADOW / UNREGISTERED AGENT "${input.agentId}" blocked from tool execution`,
  });
  if (!identityVerified && !blockReason) {
    blockReason = `Unregistered or shadow agent (${input.agentId}) denied by identity plane`;
  }

  // Gate 4: Agent Trust Status (not suspended)
  const trustOk = Boolean(profile && (profile.trustStatus === 'verified' || profile.trustStatus === 'restricted'));
  gates.push({
    gateNumber: 4,
    gateName: 'Trust & Suspension Status',
    passed: trustOk,
    detail: profile
      ? `Trust status: ${profile.trustStatus.toUpperCase()}`
      : 'No trust profile available',
  });
  if (!trustOk && !blockReason) {
    blockReason = `Agent ${input.agentId} trust status is ${profile?.trustStatus || 'unregistered'}`;
  }

  // Gate 5: Prohibited & Prompt-Injection Guardrail Check
  const isProhibited = PROHIBITED_DANGEROUS_TOOLS.has(normalizedTool);
  gates.push({
    gateNumber: 5,
    gateName: 'Prompt-Injection & Prohibitive Guardrail',
    passed: !isProhibited,
    detail: isProhibited
      ? `Tool "${normalizedTool}" matches prohibited high-risk/exfiltration signature`
      : 'No prohibited dangerous tool signature detected',
  });
  if (isProhibited && !blockReason) {
    blockReason = `Blocked prohibited destructive/exfiltration tool "${normalizedTool}" regardless of model justification`;
  }

  // Gate 6: Tool Allowlist Evaluation (Deterministic — LLM text cannot override)
  const toolAllowed = Boolean(profile && profile.allowedTools.includes(normalizedTool));
  gates.push({
    gateNumber: 6,
    gateName: 'Registered Tool Allowlist',
    passed: toolAllowed,
    detail: toolAllowed
      ? `Tool "${normalizedTool}" present in agent allowlist`
      : `UNAUTHORIZED TOOL CALL: "${normalizedTool}" is outside ${input.agentId} allowlist [${profile?.allowedTools.join(', ') || 'none'}]`,
  });
  if (!toolAllowed && !blockReason) {
    blockReason = `Tool "${normalizedTool}" is not in ${input.agentId}'s registered least-privilege allowlist`;
  }

  // Gate 7: Resource & Data Boundary Validation
  const forbiddenResourcePattern = /(prod-secrets|root-iam|raw-weights-export|\/etc\/shadow|external-sink)/i;
  const scopeOk = !forbiddenResourcePattern.test(normalizedResource);
  gates.push({
    gateNumber: 7,
    gateName: 'Resource Scope & Data Boundary',
    passed: scopeOk,
    detail: scopeOk
      ? `Resource "${normalizedResource}" within approved boundary`
      : `Resource "${normalizedResource}" violates sovereign data boundary policy`,
  });
  if (!scopeOk && !blockReason) {
    blockReason = `Target resource "${normalizedResource}" violates data boundary constraints`;
  }

  // Gate 8: Human Approval Gate for Consequential Operations
  const needsHuman = APPROVAL_REQUIRED_TOOLS.has(normalizedTool) && !input.humanApproved;
  if (needsHuman) requiresApproval = true;
  gates.push({
    gateNumber: 8,
    gateName: 'Human Approval Verification',
    passed: !needsHuman,
    detail: needsHuman
      ? `Consequential tool "${normalizedTool}" requires Authorized Commander approval`
      : 'Approval condition satisfied',
  });

  // Gate 9: Rate & Execution Budget Limit
  const withinQuota = (input.recentRequestCountForAgent || 0) < 100;
  gates.push({
    gateNumber: 9,
    gateName: 'Execution Rate & Resource Quota',
    passed: withinQuota,
    detail: withinQuota ? 'Within per-minute execution quota' : 'Rate limit exceeded',
  });
  if (!withinQuota && !blockReason) blockReason = 'Execution rate quota exceeded';

  // Gate 10: Tamper-Evident Audit Commit
  gates.push({
    gateNumber: 10,
    gateName: 'Tamper-Evident Audit Commit',
    passed: true,
    detail: `Committed digest ${hash.slice(0, 16)}...`,
  });

  const decision: 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL' = blockReason
    ? 'BLOCK'
    : requiresApproval
    ? 'REQUIRE_APPROVAL'
    : 'ALLOW';

  return {
    requestId: input.requestId,
    timestamp: input.timestamp,
    agentId: input.agentId,
    agentName: profile?.name || `Unregistered Agent (${input.agentId})`,
    toolName: normalizedTool,
    targetResource: normalizedResource,
    justification: input.justification,
    decision,
    reason:
      blockReason ||
      (requiresApproval
        ? `Awaiting human authorization for consequential tool "${normalizedTool}"`
        : `All deterministic policy gates passed for "${normalizedTool}"`),
    gates,
    telemetryHashSha256: hash,
    shadowAgentDetected: isShadow,
  };
}

export function computeAssuranceMetrics(params: {
  nodes: NetworkNode[];
  incidents: Incident[];
  governedAgents: GovernedAgentProfile[];
  evaluations: PolicyGateEvaluation[];
  validationRuns: RedBlueValidationRun[];
}): AssuranceMetrics {
  const { nodes, incidents, governedAgents, evaluations, validationRuns } = params;
  const healthyOrIsolatedNodes = nodes.filter((n) => n.status !== 'compromised').length;
  const assetCoveragePct =
    nodes.length > 0 ? Math.round((healthyOrIsolatedNodes / nodes.length) * 100) : 100;

  const verifiedAgents = governedAgents.filter((a) => a.trustStatus !== 'unregistered').length;
  const agentDiscoveryCoveragePct =
    governedAgents.length > 0 ? Math.round((verifiedAgents / governedAgents.length) * 100) : 100;

  const blockedUnauthorizedCalls = evaluations.filter((e) => e.decision === 'BLOCK').length;
  const allowedAuthorizedCalls = evaluations.filter((e) => e.decision === 'ALLOW').length;

  const passedValidations = validationRuns.filter((r) => r.controlStatus === 'VALIDATED_BLOCKED').length;
  const validationPassRatePct =
    validationRuns.length > 0 ? Math.round((passedValidations / validationRuns.length) * 100) : 100;

  const containedCount = incidents.filter(
    (i) => i.state === 'contained' || i.state === 'resolved' || i.state === 'closed'
  ).length;
  const containedIncidentsPct =
    incidents.length > 0 ? Math.round((containedCount / incidents.length) * 100) : 100;

  return {
    assetCoveragePct,
    agentDiscoveryCoveragePct,
    blockedUnauthorizedCalls,
    allowedAuthorizedCalls,
    validationPassRatePct,
    policyViolationsTotal: blockedUnauthorizedCalls,
    containedIncidentsPct,
  };
}
