export type OperationalInterfaceMode = 'global-command' | 'customer-command' | 'soc-command';

export type IsolationTier = 'standard' | 'enterprise' | 'sovereign';

export type OperatingModel = 'pure-saas' | 'managed-security' | 'hybrid';

export type AutonomyMode = 'human-approval' | 'tiered-autonomy' | 'read-only';

export type CommercialPlanTier = 'business' | 'professional' | 'enterprise' | 'sovereign';

export type CloudEnvironmentType =
  | 'aws-k8s'
  | 'azure-m365'
  | 'gcp-gke'
  | 'on-prem'
  | 'ai-cluster';

export type RegionalClusterId = 'in-mum' | 'ap-sgp' | 'eu-fra' | 'us-iad' | 'me-uae';

export type RbacRole =
  | 'global_operator'
  | 'soc_analyst'
  | 'customer_admin'
  | 'customer_analyst'
  | 'auditor'
  | 'billing_admin';

export type FeatureDeliveryStatus =
  | 'Planned'
  | 'Designed'
  | 'In development'
  | 'Implemented'
  | 'Tested'
  | 'Validated'
  | 'Production-ready';

export interface RegionalControlPlane {
  id: RegionalClusterId;
  regionName: string;
  cityHub: string;
  endpointUrl: string;
  status: 'operational' | 'degraded' | 'failover';
  availabilitySloPct: number;
  tenantCount: number;
  ingestedEventsPerSec: number;
  queueLagMs: number;
  dataResidencyStandard: string;
  kmsKeyArnPrefix: string;
}

export interface TenantOrganization {
  id: string;
  name: string;
  domain: string;
  industry: string;
  environmentSummary: string;
  primaryEnvironment: CloudEnvironmentType;
  regionId: RegionalClusterId;
  isolationTier: IsolationTier;
  operatingModel: OperatingModel;
  autonomyMode: AutonomyMode;
  planTier: CommercialPlanTier;
  verificationStatus: 'verified' | 'pending_kyc' | 'suspended';
  dataClassification: 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' | 'SOVEREIGN';
  byokKeyId: string;
  rlsPolicyName: string;
  status: 'active' | 'onboarding' | 'isolated' | 'suspended';
  createdAt: string;
  byokLastRotatedAt?: string;
  intelSharingOptIn?: boolean;
  localization?: TenantLocalizationConfig;
  quota: {
    maxAssets: number;
    maxAgents: number;
    maxEventsPerSec: number;
    retentionDays: number;
  };
  healthScore: number;
  openIncidentsCount: number;
  assetsCount: number;
  agentsCount: number;
}

export interface TenantLocalizationConfig {
  locale: 'en-US' | 'en-GB' | 'de-DE' | 'ja-JP' | 'en-IN' | 'ar-AE';
  timezone: string;
  currency: 'USD' | 'EUR' | 'GBP' | 'INR' | 'SGD' | 'AED';
  dateFormat: 'ISO-8601' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
}

export interface CustomerConnector {
  id: string;
  tenantId: string;
  name: string;
  environmentType: CloudEnvironmentType;
  regionId: RegionalClusterId;
  workloadIdentitySpiffe: string;
  packageFormat: 'helm' | 'terraform' | 'docker' | 'systemd' | 'powershell';
  enrollmentStatus: 'enrolled' | 'pending' | 'revoked' | 'offline';
  outboundOnly: boolean;
  credentialFingerprint: string;
  credentialExpiresAt: string;
  permissionsGranted: string[];
  lastHeartbeatAt: string;
  telemetryRateEps: number;
  offlineBufferEvents: number;
  version: string;
}

export interface CustomerAsset {
  id: string;
  tenantId: string;
  name: string;
  assetType: 'k8s_cluster' | 'cloud_account' | 'identity_provider' | 'ai_model_endpoint' | 'database' | 'endpoint_fleet';
  provider: 'AWS' | 'Azure' | 'GCP' | 'On-Premises' | 'Kubernetes' | 'OpenAI/Custom';
  regionId: RegionalClusterId;
  criticality: 'tier-0' | 'tier-1' | 'tier-2';
  postureStatus: 'protected' | 'at_risk' | 'quarantined';
  lastTelemetryAt: string;
  tags: string[];
}

export interface CustomerDefenseAgent {
  id: string;
  tenantId: string;
  name: string;
  force: 'BLUE_FORCE' | 'RED_FORCE';
  unitType: string;
  spiffeId: string;
  regionId: RegionalClusterId;
  allowedTools: string[];
  deniedTools: string[];
  allowedResources: string[];
  maxExecutionSeconds: number;
  autonomyMode: AutonomyMode;
  tokenExpiresAt: string;
  status: 'active' | 'standby' | 'suspended' | 'killed';
  killSwitchEngaged: boolean;
  lastDecisionAt: string;
  actionsExecuted: number;
  blockedViolations: number;
}

export interface TenantIncidentRecord {
  id: string;
  tenantId: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  state: 'new' | 'investigating' | 'contained' | 'resolved';
  detectedAt: string;
  assignedForce: 'BLUE_FORCE' | 'RED_FORCE';
  affectedAssetId: string;
  summary: string;
  proposedResponse: string;
  approvalStatus: 'pending_human' | 'approved' | 'auto_executed' | 'rejected';
  approvedBy?: string;
  evidenceHashSha256: string;
}

export interface TenantEvidenceRecord {
  id: string;
  tenantId: string;
  incidentId?: string;
  agentId: string;
  actor: string;
  action: string;
  decision: 'ALLOWED' | 'BLOCKED' | 'PENDING_APPROVAL' | 'VERIFIED';
  policyRule: string;
  sha256Seal: string;
  createdAt: string;
  summary: string;
}

export interface DelegatedSocGrant {
  id: string;
  tenantId: string;
  tenantName: string;
  analystId: string;
  scope: 'read_telemetry' | 'investigate_incidents' | 'execute_approved_containment';
  reason: string;
  grantedByCustomerAdmin: string;
  grantedAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'revoked';
}

export interface CrossCustomerIntelAdvisory {
  id: string;
  campaignTitle: string;
  mitreTechnique: string;
  severity: 'critical' | 'high' | 'medium';
  sanitizedIocHash: string;
  affectedTenantCount: number;
  affectedSectors: string[];
  rawLogsShared: false;
  piiRedacted: true;
  recommendedControl: string;
  publishedAt: string;
  relevanceByIndustry: Record<string, number>;
}

export interface UniversalConnectorCatalogItem {
  id: string;
  name: string;
  category: 'Cloud' | 'Identity' | 'Endpoint' | 'App & CI/CD' | 'Security Tools' | 'Data & Observability';
  authMethod: string;
  leastPrivilegeScopes: string[];
  rateLimitRpm: number;
  schemaFormat: string;
  implementationStatus: FeatureDeliveryStatus;
}

export interface TenantUsageSummary {
  tenantId: string;
  tenantName: string;
  planTier: CommercialPlanTier;
  isolationTier: IsolationTier;
  assetsRegistered: number;
  assetsQuota: number;
  agentsActive: number;
  agentsQuota: number;
  currentEventsPerSec: number;
  epsQuota: number;
  noisyNeighborThrottled: boolean;
  monthlyEventsBillions: number;
  storageGbUsed: number;
  slaTargetPct: number;
  slaMeasuredPct: number;
  agentExecutionsCount?: number;
  estimatedMonthlyUsd?: number;
  invoiceStatus?: 'current' | 'overage_alert';
}

export interface TenantRedForceExercise {
  id: string;
  tenantId: string;
  scenarioName: string;
  unitType: string;
  targetAssetId: string;
  signedScopeHash: string;
  approvedBy: string;
  maxDurationMinutes: number;
  egressRestricted: boolean;
  status: 'completed' | 'stopped_emergency' | 'blocked_invalid_scope';
  findingSummary: string;
  controlVerified: boolean;
  createdAt: string;
}

export type SecurityDomainType =
  | 'Cloud'
  | 'Network'
  | 'Endpoint'
  | 'Identity'
  | 'Application'
  | 'AI_Agent'
  | 'Data';

export interface TenantTelemetryEvent {
  id: string;
  tenantId: string;
  sourceConnectorId: string;
  sourceAssetId: string;
  domain: SecurityDomainType;
  ocsfCategory: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  normalizedSummary: string;
  deterministicAction: 'passed' | 'correlated' | 'alert_raised';
  timestamp: string;
}

export interface ComplianceControlFramework {
  id: string;
  framework: string;
  version: string;
  scopeNote: string;
  alignedControlsCount: number;
  totalControls: number;
  status: 'Engineering Reference';
}

export interface RbacPermissionSpec {
  role: RbacRole;
  label: string;
  scopeBoundary: string;
  canViewGlobalFleet: boolean;
  canOnboardTenants: boolean;
  canAccessAssignedTenant: boolean;
  canMutatePolicies: boolean;
  canApproveContainment: boolean;
  canViewAuditReports: boolean;
  canManageBilling: boolean;
}

export interface RoadmapPhaseItem {
  phase: number;
  name: string;
  status: FeatureDeliveryStatus;
  scopeSummary: string;
  verifiedArtifacts: string[];
}

export interface FlagshipEnterpriseStep {
  stepNumber: number;
  title: string;
  layer: string;
  status: 'completed' | 'blocked_as_intended' | 'verified';
  detail: string;
  evidenceRef: string;
  timestamp: string;
}

export interface FlagshipEnterpriseWorkflowResult {
  runId: string;
  tenantId: string;
  tenantName: string;
  startedAt: string;
  completedAt: string;
  allStepsPassed: boolean;
  crossTenantIsolationVerified: boolean;
  steps: FlagshipEnterpriseStep[];
}

export interface ConnectorInstallPackage {
  tenantId: string;
  connectorId: string;
  spiffeId: string;
  regionalEndpoint: string;
  bashScript: string;
  powershellScript: string;
  terraformHcl: string;
  kubernetesHelmYaml: string;
  opaRegoPolicy: string;
}
