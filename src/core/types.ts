export type DefConLevel = 1 | 2 | 3 | 4 | 5;

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type IncidentState =
  | 'new'
  | 'investigating'
  | 'confirmed'
  | 'contained'
  | 'remediating'
  | 'resolved'
  | 'closed';

export type TelemetryType = 'live' | 'historical' | 'simulated';

export type AgentRole =
  | 'Perimeter Sentry'
  | 'Behavioral Heuristics'
  | 'Forensic Timeline'
  | 'Threat Intelligence Correlation'
  | 'Containment Executor'
  | 'Adversarial Emulator'
  | 'Model Security Auditor';

export type AgentStatus = 'active' | 'standby' | 'investigating' | 'paused' | 'deactivated';

export interface Agent {
  id: string;
  name: string;
  codeName: string;
  role: AgentRole;
  description: string;
  status: AgentStatus;
  health: number; // 0 - 100
  capabilities: string[];
  tasksAssigned: number;
  tasksCompleted: number;
  precisionRate: number; // percentage
  meanResponseTimeMs: number;
  lastActive: string;
  resourceUtilization: {
    cpuPercent: number;
    memoryMb: number;
    tokensPerHour: number;
  };
  modelEngine: string;
  authorizationLevel: 'tier-1' | 'tier-2' | 'tier-3';
  avatarUrl?: string;
  sector?: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: TelemetryType;
  severity: SeverityLevel;
  source: string;
  destination: string;
  category: string;
  signature: string;
  mitreTechniqueId?: string;
  mitreTechniqueName?: string;
  actionTaken: string;
  verified: boolean;
  rawPayloadSnippet?: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: SeverityLevel;
  state: IncidentState;
  detectedAt: string;
  updatedAt: string;
  assignedInvestigators: string[];
  assignedAgents: string[];
  affectedAssets: string[];
  associatedAlerts: string[];
  mitreTactics: string[];
  summary: string;
  containmentActionProposed?: string;
  containmentApprovedBy?: string;
  containmentExecutedAt?: string;
  evidenceItems: {
    id: string;
    description: string;
    hashSha256: string;
    collectedBy: string;
    collectedAt: string;
    verified: boolean;
  }[];
  auditTrail: {
    timestamp: string;
    author: string;
    action: string;
    details: string;
  }[];
}

export interface MitreTechnique {
  id: string;
  tactic: string;
  name: string;
  description: string;
  detectedCount: number;
  mitigatedCount: number;
  riskScore: number;
}

export interface SimulationScenario {
  id: string;
  title: string;
  category: 'supply_chain' | 'lateral_movement' | 'model_exfiltration' | 'api_abuse' | 'prompt_injection';
  description: string;
  mitreTechniques: string[];
  targetEnvironment: string;
  authorizationRequired: boolean;
  riskLevel: SeverityLevel;
  stepsCount: number;
  historicalSuccessRate: number;
}

export interface SimulationExecution {
  id: string;
  scenarioId: string;
  status: 'idle' | 'running' | 'completed' | 'aborted';
  currentStep: number;
  totalSteps: number;
  startedAt: string;
  completedAt?: string;
  logs: {
    step: number;
    timestamp: string;
    action: string;
    technique: string;
    detectedByBlueAgent?: string;
    outcome: 'detected_blocked' | 'detected_alerted' | 'evaded' | 'contained';
  }[];
  afterActionReview?: {
    detectionRate: number;
    containmentLatencySeconds: number;
    vulnerabilitiesExposed: string[];
    recommendedFixes: string[];
  };
}

export interface NetworkNode {
  id: string;
  name: string;
  zone: 'external_dmz' | 'ingress_cluster' | 'app_workloads' | 'database_tier' | 'isolated_vault';
  ip: string;
  status: 'healthy' | 'warning' | 'compromised' | 'isolated';
  agentAssigned?: string;
  vulnerabilitiesCount: number;
  openPorts: number[];
  connections: string[];
}

export interface IndicatorOfCompromise {
  id: string;
  type: 'ipv4' | 'domain' | 'sha256' | 'cve' | 'ja3_fingerprint';
  value: string;
  threatActor?: string;
  confidenceScore: number; // 0 - 100
  firstSeen: string;
  lastSeen: string;
  source: string;
  activeBlock: boolean;
}

export interface SharedIntelMemory {
  id: string;
  originAgentId: string;
  topic: string;
  observation: string;
  confidence: number;
  timestamp: string;
  expiresAt: string;
  tags: string[];
  verifiedByHuman: boolean;
}

export interface Mission {
  id: string;
  title: string;
  codeName: string;
  objectives: string[];
  assignedAgents: string[];
  rulesOfEngagement: string[];
  authorizationStatus: 'pending_approval' | 'authorized' | 'rejected' | 'active' | 'completed';
  authorizedBy?: string;
  authorizedAt?: string;
  startedAt: string;
  riskAssessmentScore: number;
}

export interface TargetOrganization {
  id: string;
  name: string;
  sector: 'Banking & Financial Core' | 'Sovereign AI & Frontier Tech' | 'Critical Infrastructure' | 'Healthcare & Genomic' | 'Enterprise & Fortune 500';
  location: string;
  lat: number;
  lng: number;
  assetValue: string;
  status: 'nominal' | 'under_attack' | 'mitigating' | 'secured';
  shieldIntegrity: number; // 0 - 100%
  activeDefenseSwarm: string[];
  riskProfile?: string;
  recentIncidentHistory?: string;
}

export interface AttackForensicDossier {
  // 1. Historical Precedent & Recurrence
  historicalPrecedent: 'FIRST_TIME_ZERO_DAY' | 'RECURRING_APT_CAMPAIGN' | 'EVOLVED_POLYMORPHIC_VARIANT';
  previousOccurrencesCount: number;
  lastOccurrenceDate?: string;
  signatureMatchScore: number; // 0 - 100%

  // 2. Timing & Dwell Metrics
  detectedTimestamp: string;
  anomalySpikePoint: string;
  dwellTimeSeconds: number;

  // 3. Attack Pattern & Tactics
  attackPattern: string;
  mitreTechniques: { id: string; name: string; tactic: string }[];
  executionSequence: string[];

  // 4. Group Attribution & Provenance
  threatActorGroup: string;
  threatActorCountry: string;
  actorMotivation: string;

  // 5. Geographic Transit Hop Path
  transitHopPath: {
    hop: number;
    location: string;
    nodeType: 'Origin C2' | 'BGP Hijack' | 'Satellite Relay' | 'Bulletproof Proxy' | 'Target Ingress';
    country: string;
    ipOrSubnet: string;
  }[];

  // 6. Current Live State
  currentPhase: 'Reconnaissance' | 'Initial Infiltration' | 'Privilege Escalation' | 'Data Staging' | 'Exfiltration' | 'Payload Execution' | 'Defense Interception' | 'Neutralized & Contained';

  // 7. Why it started to exploit (Root Cause)
  rootCauseVulnerability: string;
  exploitMechanism: string;

  // 8. Projected Loss & Blast Radius
  projectedLossCapital: string;
  blastRadiusAssets: string[];
  regulatoryImpact: string;

  // 9. Resource & Entity Recovery Playbook
  recoveryPlaybook: {
    step: number;
    action: string;
    targetEntity: string;
    recoveryMethod: string;
    estimatedTimeMin: number;
  }[];

  // 10. Agent Tactical Deployment Directive (WHERE to send which agents)
  agentDeploymentDirectives: {
    agentName: string;
    tacticalZone: string;
    missionDirective: string;
    objective: string;
    status: 'assigned' | 'en_route' | 'holding_perimeter' | 'complete';
  }[];

  // 11. How to Stop the Attack (Neutralization Steps)
  neutralizationExecutionSteps: string[];
}

export interface LiveMapAttack {
  id: string;
  targetId: string;
  targetName: string;
  targetSector: string;
  targetLocation: string;
  targetCoordinates: [number, number]; // [lat, lng]
  adversaryName: string;
  adversaryOrigin: string;
  adversaryCoordinates: [number, number]; // [lat, lng]
  attackVector: string;
  severity: SeverityLevel;
  status: 'probing' | 'active_infiltration' | 'engaged' | 'contained_and_secured';
  penetrationPercent: number; // 0 - 100
  defenseShieldPercent: number; // 0 - 100
  startedAt: string;
  dossier?: AttackForensicDossier;
  combatLogs: {
    timestamp: string;
    sender: 'ADVERSARY' | 'DEFENDER' | 'SYSTEM' | 'ALERT';
    agentName: string;
    message: string;
    type: 'attack' | 'counter' | 'alert' | 'secure';
  }[];
}

export type OntologyObjectType =
  | 'organization'
  | 'asset'
  | 'incident'
  | 'vulnerability'
  | 'threat_actor'
  | 'technique'
  | 'ioc'
  | 'agent'
  | 'domain_feed'
  | 'learning_rule';

export interface OntologyNode {
  id: string;
  label: string;
  objectType: OntologyObjectType;
  status: string;
  severity: SeverityLevel;
  riskScore: number; // 0 - 100
  domain: 'Cyber' | 'Threat Intel' | 'Infrastructure' | 'Financial' | 'Orbital' | 'Subsea' | 'AI Swarm';
  summary: string;
  metadata: Record<string, string | number | boolean | string[]>;
  degree?: number;
}

export interface OntologyEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  confidence: number;
}

export interface LiveKevEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
  correlatedAssets: string[];
  riskScore: number;
}

export interface DataPipelineStatus {
  id: string;
  name: string;
  category: 'Public Threat Feed' | 'STIX / TAXII' | 'Kernel / EDR' | 'Sovereign Domain';
  sourceUrl: string;
  status: 'live' | 'cached' | 'syncing' | 'degraded';
  recordsIngested: number;
  lastSyncedAt: string;
  latencyMs: number;
}

export interface FusionEvent {
  id: string;
  timestamp: string;
  domain: 'Cyber' | 'CISA KEV' | 'Financial' | 'Orbital' | 'Subsea' | 'AI Learning';
  severity: SeverityLevel;
  title: string;
  description: string;
  linkedEntityIds: string[];
  recommendedAction?: string;
}

export interface OntologyGraphData {
  nodes: OntologyNode[];
  edges: OntologyEdge[];
  pipelines: DataPipelineStatus[];
  kevEntries: LiveKevEntry[];
  fusionTimeline: FusionEvent[];
  stats: {
    totalObjects: number;
    totalRelationships: number;
    criticalRiskObjects: number;
    kevMatchedCount: number;
    selfLearnedRulesCount: number;
    lastSyncAt: string;
  };
}

export interface AipRecommendedAction {
  actionType: 'contain_incident' | 'isolate_node' | 'block_ioc' | 'deploy_agent' | 'synthesize_learning';
  targetId: string;
  label: string;
  rationale: string;
}

export interface AipQueryResult {
  query: string;
  source: 'gemini-4-hydrogen' | 'ontology-inference-engine';
  answer: string;
  confidence: number;
  citedEntityIds: string[];
  recommendedActions: AipRecommendedAction[];
  learnedRule?: {
    topic: string;
    observation: string;
    tags: string[];
  };
  generatedAt: string;
}

// --- OS CONTROL LAYER & COMPILER WORKSPACE TYPES ---

export type CompilerLanguage = 'typescript' | 'javascript' | 'python' | 'sql' | 'wat' | 'shell';

export interface CompilerLanguageSpec {
  id: CompilerLanguage;
  label: string;
  extension: string;
  runtimeName: string;
  isolationPolicy: string;
  supportsCompilation: boolean;
}

export interface OsProcessRecord {
  pid: number;
  name: string;
  subsystem: string;
  user: string;
  status: 'running' | 'sleeping' | 'stopped' | 'terminated';
  cpuPercent: number;
  memoryMb: number;
  priority: number;
  startedAt: string;
  durationMs: number;
  dependencies: string[];
  restartPolicy: 'always' | 'on-failure' | 'never';
  command: string;
  source: 'host-container' | 'platform-daemon' | 'compiler-worker';
}

export interface OsServiceRecord {
  id: string;
  name: string;
  version: string;
  status: 'healthy' | 'degraded' | 'stopped';
  pid: number;
  dependencies: string[];
  accessPolicy: string;
  errorCount: number;
  uptimeSeconds: number;
  lastHealthCheck: string;
}

export interface OsFileEntry {
  path: string;
  name: string;
  language: CompilerLanguage | 'text';
  sizeBytes: number;
  permissions: string;
  sha256: string;
  version: number;
  updatedAt: string;
  content?: string;
}

export interface OsResourceSnapshot {
  hostname: string;
  platform: string;
  arch: string;
  kernelRelease: string;
  nodeVersion: string;
  cpuCores: number;
  loadAvg1m: number;
  loadAvg5m: number;
  loadAvg15m: number;
  cpuUtilizationPct: number;
  totalMemoryMb: number;
  usedMemoryMb: number;
  memoryUtilizationPct: number;
  processRssMb: number;
  diskTotalGb: number;
  diskUsedGb: number;
  diskUtilizationPct: number;
  uptimeSeconds: number;
  activeWorkers: number;
  maxWorkers: number;
  queueDepth: number;
  capturedAt: string;
}

export interface OsEventBusRecord {
  id: string;
  traceId: string;
  timestamp: string;
  service: string;
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  status: 'processed' | 'retrying' | 'dead_letter';
}

export interface CompilerExecutionRecord {
  executionId: string;
  userId: string;
  filePath: string;
  language: CompilerLanguage;
  runtimeVersion: string;
  status: 'compiling' | 'running' | 'completed' | 'compile_error' | 'runtime_error' | 'timeout' | 'cancelled';
  startedAt: string;
  endedAt: string;
  durationMs: number;
  exitCode: number;
  stdout: string;
  stderr: string;
  diagnostics: string[];
  artifactHash: string;
  artifactSizeBytes: number;
  sqlRows?: Record<string, unknown>[];
  sqlColumns?: string[];
  cpuLimitMs: number;
  memoryLimitMb: number;
  permissionScope: string;
}

export interface OsTelemetryBundle {
  resources: OsResourceSnapshot;
  processes: OsProcessRecord[];
  services: OsServiceRecord[];
  eventBus: OsEventBusRecord[];
  executionsCount: number;
}

export interface ExecutiveKpiPoint {
  label: string;
  systemHealth: number;
  containmentProgress: number;
  mitigationEfficiency: number;
}

export interface ExecutiveKpiSummary {
  systemHealthPct: number;
  containmentProgressPct: number;
  threatMitigationEfficiencyPct: number;
  containedCount: number;
  totalIncidentsCount: number;
  blockedIocsCount: number;
  totalIocsCount: number;
  healthyServicesCount: number;
  totalServicesCount: number;
  series: ExecutiveKpiPoint[];
}

export interface ThreatRadarCluster {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  kind: 'adversary_cluster' | 'enclave_asset' | 'incident_zone';
  severity: SeverityLevel;
  riskScore: number;
  activeEventsCount: number;
  summary: string;
}

export interface ThreatRadarArc {
  id: string;
  sourceId: string;
  targetId: string;
  sourceCoords: [number, number];
  targetCoords: [number, number];
  severity: SeverityLevel;
  vector: string;
  sourceLabel?: string;
  targetLabel?: string;
  sourceIp?: string;
  targetIp?: string;
  protocol?: string;
  packetRatePps?: number;
  status?: 'probing' | 'active' | 'mitigating' | 'contained';
  mitreTechnique?: string;
  timestamp?: string;
  incidentId?: string;
  dossierSummary?: string;
}

// --- LIVE OPERATIONS, REAL-TIME ATTACKS, NEWSROOM & CHALLENGES ---

export type LiveAttackPhase =
  | 'probing'
  | 'active_exploitation'
  | 'ai_intercepted'
  | 'contained';

export interface LiveAttackActionLog {
  id: string;
  timestamp: string;
  actor: string;
  kind: 'adversary' | 'ai_detection' | 'ai_countermeasure' | 'containment';
  message: string;
  engine?: 'gemini-4-hydrogen' | 'autonomous-swarm' | 'adversary-telemetry';
}

export interface LiveOngoingAttack {
  id: string;
  title: string;
  targetAssetId: string;
  targetName: string;
  targetSector: string;
  targetRegion: string;
  adversaryGroup: string;
  sourceIp: string;
  sourceCountry: string;
  attackVector: string;
  mitreTechnique: string;
  cveRef?: string;
  severity: SeverityLevel;
  phase: LiveAttackPhase;
  penetrationPct: number;
  aiShieldPct: number;
  assignedAgentId: string;
  assignedAgentName: string;
  startedAt: string;
  updatedAt: string;
  aiAssessment?: string;
  aiAssessmentSource?: 'gemini-4-hydrogen' | 'deterministic-engine';
  logs: LiveAttackActionLog[];
}

export type NewsCategory =
  | 'Zero-Day & KEV'
  | 'Cyber Attacks'
  | 'AI Security'
  | 'Critical Infra'
  | 'Advisories';

export interface LiveNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  category: NewsCategory;
  severity: SeverityLevel;
  cveIds: string[];
  tags: string[];
  impactedAssetIds: string[];
  impactScore: number;
  aiCorrelationNote?: string;
  aiCorrelationSource?: 'gemini-4-hydrogen' | 'deterministic-engine';
}

export interface OperationalChallenge {
  id: string;
  title: string;
  domain: 'Cyber' | 'AI Infrastructure' | 'Financial' | 'Orbital & Subsea' | 'Supply Chain';
  severity: SeverityLevel;
  status: 'open' | 'analyzing' | 'resolved';
  problemStatement: string;
  affectedSystems: string[];
  createdAt: string;
  resolvedAt?: string;
  assignedAgent: string;
  aiDiagnosis?: string;
  remediationSteps?: string[];
  aiSource?: 'gemini-4-hydrogen' | 'deterministic-engine';
  learnedRuleId?: string;
  linkedNewsId?: string;
}

export interface AutonomousAiActivity {
  id: string;
  timestamp: string;
  agentName: string;
  actionType: 'DETECTION' | 'CORRELATION' | 'COUNTERMEASURE' | 'CHALLENGE_RESOLVED' | 'NEWS_CORRELATED' | 'SELF_LEARNING';
  engine: 'gemini-4-hydrogen' | 'autonomous-swarm';
  severity: SeverityLevel;
  summary: string;
  targetRef?: string;
}

export interface LiveOpsStateSnapshot {
  autoPilotEnabled: boolean;
  cycleIntervalMs: number;
  lastCycleAt: string;
  lastNewsSyncAt: string;
  geminiConfigured: boolean;
  stats: {
    activeAttacksCount: number;
    containedAttacksTotal: number;
    openChallengesCount: number;
    resolvedChallengesTotal: number;
    liveNewsCount: number;
    aiActionsExecutedTotal: number;
    rulesLearnedTotal: number;
  };
  attacks: LiveOngoingAttack[];
  challenges: OperationalChallenge[];
  news: LiveNewsItem[];
  aiFeed: AutonomousAiActivity[];
}

// --- WEBSOCKET REAL-TIME THREAT FEED & AGENTIC POLICY GATEWAY ---

export interface RealtimeThreatAlert {
  id: string;
  timestamp: string;
  severity: SeverityLevel;
  source: string;
  category:
    | 'AGENT_POLICY_BLOCK'
    | 'SHADOW_AGENT_DETECTED'
    | 'LIVE_INTRUSION'
    | 'BLUE_FORCE_CONTAINMENT'
    | 'RED_FORCE_VALIDATION'
    | 'KEV_CORRELATION'
    | 'TELEMETRY_EVENT'
    | 'EMERGENCY_STOP';
  title: string;
  summary: string;
  targetAsset: string;
  agentId?: string;
  actionTaken: string;
  policyDecision?: 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL';
  sha256Integrity: string;
  incidentId?: string;
}

export type AgentTrustStatus = 'verified' | 'restricted' | 'suspended' | 'unregistered';

export interface GovernedAgentProfile {
  agentId: string;
  name: string;
  spiffeId: string;
  organization: string;
  owner: string;
  agentType: 'coding' | 'security' | 'financial' | 'infrastructure' | 'research';
  framework: string;
  deploymentEnv: 'production-enclave' | 'staging-sandbox' | 'isolated-lab';
  modelVersion: string;
  allowedTools: string[];
  mcpConnections: string[];
  permissions: string[];
  dataBoundaries: string[];
  approvedObjectives: string[];
  trustStatus: AgentTrustStatus;
  riskClass: SeverityLevel;
  executionCount: number;
  blockedCount: number;
  lastSeenAt: string;
}

export interface PolicyGateCheck {
  gateNumber: number;
  gateName: string;
  passed: boolean;
  detail: string;
}

export interface PolicyGateEvaluation {
  requestId: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  toolName: string;
  targetResource: string;
  justification: string;
  decision: 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL';
  reason: string;
  gates: PolicyGateCheck[];
  telemetryHashSha256: string;
  createdIncidentId?: string;
  shadowAgentDetected?: boolean;
  mlAdvisory?: {
    predictedClass: string;
    riskScore: number;
    confidencePct: number;
    modelId: string;
  };
}

export interface RedBlueValidationRun {
  id: string;
  timestamp: string;
  targetAgentId: string;
  attackVector: string;
  attemptedTool: string;
  blockedByGateway: boolean;
  blueForceDetected: boolean;
  incidentId?: string;
  controlStatus: 'VALIDATED_BLOCKED' | 'EXPOSURE_DETECTED';
  evidenceSummary: string;
}

export interface AssuranceMetrics {
  assetCoveragePct: number;
  agentDiscoveryCoveragePct: number;
  blockedUnauthorizedCalls: number;
  allowedAuthorizedCalls: number;
  validationPassRatePct: number;
  policyViolationsTotal: number;
  containedIncidentsPct: number;
}

export interface ArchitectureLayerSpec {
  layer: string;
  name: string;
  description: string;
  targetModule: string;
  status: 'operational' | 'active';
}

export interface ForceUnitSpec {
  id: string;
  callsign: string;
  division: 'RED_FORCE' | 'BLUE_FORCE';
  specialty: string;
  responsibility: string;
  status: 'active' | 'armed' | 'validating';
}

export interface AgentDefenseOverviewSnapshot {
  emergencyStopActive: boolean;
  emergencyStopReason?: string;
  governedAgents: GovernedAgentProfile[];
  evaluations: PolicyGateEvaluation[];
  validationRuns: RedBlueValidationRun[];
  assurance: AssuranceMetrics;
  architectureLayers: ArchitectureLayerSpec[];
  redForceUnits: ForceUnitSpec[];
  blueForceUnits: ForceUnitSpec[];
}

// --- 30-DAY INCIDENT FREQUENCY & SEVERITY TRENDS ---
export interface ThirtyDayIncidentTrendPoint {
  date: string;
  fullDate: string;
  dayIndex: number;
  total: number;
  critical: number;
  high: number;
  medium: number;
  contained: number;
  active: number;
  stateBreakdown: Partial<Record<IncidentState, number>>;
}

// --- INTER-ENTERPRISE THREAT WARNING & VIRTUAL SOLDIERS ---
export interface CompanyProfile {
  id: string;
  name: string;
  slug: string;
  domain: string;
  sector:
    | 'AI Model Hub'
    | 'Frontier LLM Provider'
    | 'Safety Research'
    | 'Hyperscale Cloud'
    | 'Hardware & Foundry'
    | 'SecOps & EDR'
    | 'Edge & CDN'
    | 'Consumer Sovereign';
  headquarters: string;
  criticalAssets: string[];
  securityContact: string;
  allianceStatus: 'Active Defense Partner' | 'Vulnerable Target' | 'Under Active Attack' | 'Shielded by CDF';
  riskScore: number;
  threatsNeutralizedCount: number;
  logoColor: string;
  notes: string;
}

export interface VirtualSoldierUnit {
  id: string;
  codeName: string;
  callsign: string;
  specialty: string;
  armorType: string;
  attackVectorsDefended: string[];
  combatPower: number; // 0 - 100
  status: 'ready' | 'in_transit' | 'engaging' | 'victorious';
  countermeasureSkill: string;
  assignedCompanyId?: string;
  description: string;
}

export interface VirtualSoldierCombatEvent {
  timestamp: string;
  soldierName: string;
  action: string;
  penetrationReductionPct: number;
  outcome: 'intercepted' | 'shield_raised' | 'payload_shredded' | 'c2_severed' | 'neutralized';
}

export interface EnterpriseThreatDispatch {
  id: string;
  targetCompanyId: string;
  targetCompanyName: string;
  targetAsset: string;
  attackingEntity: string;
  attackVector: string;
  mitreTechnique: string;
  severity: SeverityLevel;
  status: 'draft' | 'transmitted' | 'soldiers_deployed' | 'neutralized';
  sourceIps: string[];
  iocHashes: string[];
  technicalDetails: string;
  actionablePreventionSteps: string[];
  createdAt: string;
  transmittedAt?: string;
  deliveredAt?: string;
  cryptographicSignature?: string;
  virtualSoldiersDeployed: string[];
  penetrationPct: number;
  combatLogs: VirtualSoldierCombatEvent[];
  acknowledgmentReceipt?: {
    receivedBy: string;
    responseMessage: string;
    timestamp: string;
  };
}

