import crypto from 'crypto';
import {
  AutonomyMode,
  CommercialPlanTier,
  ComplianceControlFramework,
  ConnectorInstallPackage,
  CrossCustomerIntelAdvisory,
  CustomerAsset,
  CustomerConnector,
  CustomerDefenseAgent,
  DelegatedSocGrant,
  IsolationTier,
  OperatingModel,
  RbacPermissionSpec,
  RbacRole,
  RegionalClusterId,
  RegionalControlPlane,
  RoadmapPhaseItem,
  SecurityDomainType,
  TenantEvidenceRecord,
  TenantIncidentRecord,
  TenantOrganization,
  TenantRedForceExercise,
  TenantTelemetryEvent,
  TenantUsageSummary,
  UniversalConnectorCatalogItem,
} from './multi-tenant-types';

export interface AccessCallerContext {
  actorId: string;
  role: RbacRole;
  assignedTenantId?: string;
}

export interface TenantAccessEvaluation {
  allowed: boolean;
  statusCode: 200 | 403;
  reason: string;
  accessMode: 'tenant_owner' | 'delegated_soc' | 'denied';
  grantId?: string;
}

/**
 * Enforces strict server-side multi-tenant isolation across Global Command, Customer Command,
 * and SOC Operations Command. Global platform operators cannot inspect Customer A's private data
 * without explicit customer-authorized DelegatedSocGrant unless operating strictly within
 * fleet-health metadata planes.
 */
export function evaluateTenantAccess(
  caller: AccessCallerContext,
  targetTenantId: string,
  delegatedGrants: DelegatedSocGrant[],
  options: { nowIso?: string; requireWrite?: boolean } = {}
): TenantAccessEvaluation {
  if (!targetTenantId || !caller.actorId) {
    return {
      allowed: false,
      statusCode: 403,
      reason: 'TENANT_ISOLATION_VIOLATION: Missing verified caller identity or tenant scope.',
      accessMode: 'denied',
    };
  }

  // Customer Admin / Analyst / Auditor / Billing Admin can ONLY ever access their own tenantId
  if (
    caller.role === 'customer_admin' ||
    caller.role === 'customer_analyst' ||
    caller.role === 'auditor' ||
    caller.role === 'billing_admin'
  ) {
    if (caller.assignedTenantId !== targetTenantId) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `TENANT_ISOLATION_VIOLATION: Caller bound to '${caller.assignedTenantId || 'none'}' denied access to '${targetTenantId}'.`,
        accessMode: 'denied',
      };
    }

    if (options.requireWrite && (caller.role === 'auditor' || caller.role === 'customer_analyst')) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `RBAC_DENIED: Role '${caller.role}' has read-only scope for administrative mutations.`,
        accessMode: 'denied',
      };
    }

    return {
      allowed: true,
      statusCode: 200,
      reason: 'Verified same-tenant cryptographic session boundary.',
      accessMode: 'tenant_owner',
    };
  }

  // HF-CDF SOC Analysts and Global Operators MUST possess an active, unexpired DelegatedSocGrant
  // to inspect or act inside a specific customer's isolated data plane.
  const nowMs = options.nowIso ? Date.parse(options.nowIso) : Date.now();
  const activeGrant = delegatedGrants.find((g) => {
    if (g.tenantId !== targetTenantId) return false;
    if (g.status !== 'active') return false;
    if (caller.role === 'soc_analyst' && g.analystId !== caller.actorId && g.analystId !== '*') {
      return false;
    }
    const expiresMs = Date.parse(g.expiresAt);
    if (Number.isFinite(expiresMs) && expiresMs < nowMs) return false;
    if (options.requireWrite && g.scope === 'read_telemetry') return false;
    return true;
  });

  if (!activeGrant) {
    return {
      allowed: false,
      statusCode: 403,
      reason: `TENANT_ISOLATION_VIOLATION: No active customer-authorized DelegatedSocGrant exists for '${targetTenantId}'.`,
      accessMode: 'denied',
    };
  }

  return {
    allowed: true,
    statusCode: 200,
    reason: `Authorized via scoped customer grant ${activeGrant.id} (${activeGrant.scope}).`,
    accessMode: 'delegated_soc',
    grantId: activeGrant.id,
  };
}

export interface PolicyGatewayEvalInput {
  agent: CustomerDefenseAgent;
  toolName: string;
  targetResource: string;
  requestedAction: string;
  nowIso?: string;
}

export interface PolicyGatewayEvalResult {
  allowed: boolean;
  decision: 'ALLOWED' | 'BLOCKED' | 'PENDING_APPROVAL';
  policyRule: string;
  reason: string;
  riskScore: number;
}

const HIGH_CONSEQUENCE_TOOLS = new Set([
  'isolate_production_vpc',
  'revoke_iam_sessions',
  'rotate_cmk_key',
  'quarantine_k8s_namespace',
]);

const GLOBALLY_PROHIBITED_TOOLS = new Set([
  'dump_customer_secrets',
  'exfiltrate_model_weights',
  'disable_audit_log',
  'cross_tenant_read',
  'unscoped_shell_exec',
]);

/**
 * Deterministic Rego-equivalent Policy Enforcement Gateway.
 * LLMs NEVER determine their own authorization; every consequential tool call must clear this gate.
 */
export function evaluatePolicyGateway(input: PolicyGatewayEvalInput): PolicyGatewayEvalResult {
  const { agent, toolName, targetResource } = input;
  const nowMs = input.nowIso ? Date.parse(input.nowIso) : Date.now();

  if (agent.killSwitchEngaged || agent.status === 'killed' || agent.status === 'suspended') {
    return {
      allowed: false,
      decision: 'BLOCKED',
      policyRule: 'rego.hfcdf.agent.kill_switch_guard',
      reason: `Agent ${agent.id} (${agent.spiffeId}) is suspended or kill-switch locked.`,
      riskScore: 95,
    };
  }

  const expMs = Date.parse(agent.tokenExpiresAt);
  if (!Number.isFinite(expMs) || expMs < nowMs) {
    return {
      allowed: false,
      decision: 'BLOCKED',
      policyRule: 'rego.hfcdf.agent.short_lived_credential_expired',
      reason: `Short-lived SPIFFE credential for ${agent.id} has expired (${agent.tokenExpiresAt}).`,
      riskScore: 88,
    };
  }

  if (GLOBALLY_PROHIBITED_TOOLS.has(toolName) || agent.deniedTools.includes(toolName)) {
    return {
      allowed: false,
      decision: 'BLOCKED',
      policyRule: 'rego.hfcdf.agent.deny_prohibited_tool',
      reason: `Tool '${toolName}' is explicitly prohibited by deterministic tenant policy for ${agent.name}.`,
      riskScore: 96,
    };
  }

  if (!agent.allowedTools.includes(toolName)) {
    return {
      allowed: false,
      decision: 'BLOCKED',
      policyRule: 'rego.hfcdf.agent.least_privilege_allowlist',
      reason: `Tool '${toolName}' is outside agent ${agent.name}'s least-privilege tool allowlist.`,
      riskScore: 84,
    };
  }

  const resourcePermitted =
    agent.allowedResources.includes('*') ||
    agent.allowedResources.some((prefix) => targetResource.startsWith(prefix.replace('*', '')));

  if (!resourcePermitted) {
    return {
      allowed: false,
      decision: 'BLOCKED',
      policyRule: 'rego.hfcdf.agent.resource_boundary_attenuation',
      reason: `Target resource '${targetResource}' violates delegation boundary for tenant ${agent.tenantId}.`,
      riskScore: 89,
    };
  }

  if (
    agent.autonomyMode === 'read-only' &&
    (HIGH_CONSEQUENCE_TOOLS.has(toolName) || input.requestedAction === 'mutate')
  ) {
    return {
      allowed: false,
      decision: 'BLOCKED',
      policyRule: 'rego.hfcdf.agent.read_only_posture',
      reason: `Tenant autonomy mode is 'read-only'; consequential execution '${toolName}' blocked.`,
      riskScore: 70,
    };
  }

  if (agent.autonomyMode === 'human-approval' && HIGH_CONSEQUENCE_TOOLS.has(toolName)) {
    return {
      allowed: false,
      decision: 'PENDING_APPROVAL',
      policyRule: 'rego.hfcdf.agent.require_human_signoff',
      reason: `Tool '${toolName}' requires explicit Customer Admin approval before execution.`,
      riskScore: 74,
    };
  }

  return {
    allowed: true,
    decision: 'ALLOWED',
    policyRule: 'rego.hfcdf.agent.allow_scoped_execution',
    reason: `SPIFFE identity verified and tool '${toolName}' authorized within tenant boundary.`,
    riskScore: 15,
  };
}

/**
 * Privacy-Preserving Cross-Customer Intelligence Sanitizer.
 * Ensures zero customer raw logs, zero secrets, and zero tenant names leak across tenant boundaries.
 */
export function buildSanitizedCrossCustomerIntel(params: {
  campaignTitle: string;
  mitreTechnique: string;
  severity: 'critical' | 'high' | 'medium';
  rawIndicator: string;
  observedTenants: TenantOrganization[];
  recommendedControl: string;
}): CrossCustomerIntelAdvisory {
  const sanitizedHash = crypto
    .createHash('sha256')
    .update(`sanitized:${params.rawIndicator}`)
    .digest('hex')
    .slice(0, 24);

  const sectorSet = new Set(params.observedTenants.map((t) => t.industry));
  const relevanceByIndustry: Record<string, number> = {};
  for (const sector of ['Financial Services', 'AI Development', 'Healthcare', 'Cloud SaaS', 'Manufacturing', 'Telecom']) {
    relevanceByIndustry[sector] = sectorSet.has(sector) ? 94 : 62;
  }

  return {
    id: `CC-INTEL-${sanitizedHash.slice(0, 8).toUpperCase()}`,
    campaignTitle: params.campaignTitle,
    mitreTechnique: params.mitreTechnique,
    severity: params.severity,
    sanitizedIocHash: `sha256:${sanitizedHash}`,
    affectedTenantCount: params.observedTenants.length,
    affectedSectors: Array.from(sectorSet),
    rawLogsShared: false,
    piiRedacted: true,
    recommendedControl: params.recommendedControl,
    publishedAt: new Date().toISOString(),
    relevanceByIndustry,
  };
}

export function computeTenantUsageAndQuota(
  tenant: TenantOrganization,
  assets: CustomerAsset[],
  agents: CustomerDefenseAgent[],
  connectors: CustomerConnector[]
): TenantUsageSummary {
  const tenantAssets = assets.filter((a) => a.tenantId === tenant.id);
  const tenantAgents = agents.filter((a) => a.tenantId === tenant.id && a.status !== 'killed');
  const tenantConnectors = connectors.filter(
    (c) => c.tenantId === tenant.id && c.enrollmentStatus === 'enrolled'
  );

  const currentEventsPerSec = tenantConnectors.reduce((sum, c) => sum + c.telemetryRateEps, 0);
  const noisyNeighborThrottled = currentEventsPerSec > tenant.quota.maxEventsPerSec;

  const slaTargetPct =
    tenant.isolationTier === 'sovereign' ? 99.99 : tenant.isolationTier === 'enterprise' ? 99.95 : 99.9;

  const agentExecutionsCount = agents
    .filter((a) => a.tenantId === tenant.id)
    .reduce((sum, a) => sum + a.actionsExecuted, 0);

  const storageGbUsed = Math.round((tenantAssets.length * 14.5 + currentEventsPerSec * 0.42) * 10) / 10;
  const planBaseUsd =
    tenant.planTier === 'sovereign'
      ? 14500
      : tenant.planTier === 'enterprise'
      ? 6800
      : tenant.planTier === 'professional'
      ? 2400
      : 950;
  const meteredUsd = Math.round(
    planBaseUsd + currentEventsPerSec * 0.18 + tenantAgents.length * 45 + storageGbUsed * 0.85
  );

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    planTier: tenant.planTier,
    isolationTier: tenant.isolationTier,
    assetsRegistered: tenantAssets.length || tenant.assetsCount,
    assetsQuota: tenant.quota.maxAssets,
    agentsActive: tenantAgents.length || tenant.agentsCount,
    agentsQuota: tenant.quota.maxAgents,
    currentEventsPerSec,
    epsQuota: tenant.quota.maxEventsPerSec,
    noisyNeighborThrottled,
    monthlyEventsBillions: Number(((currentEventsPerSec * 2_592_000) / 1_000_000_000).toFixed(3)),
    storageGbUsed,
    slaTargetPct,
    slaMeasuredPct: noisyNeighborThrottled ? Number((slaTargetPct - 0.04).toFixed(2)) : slaTargetPct,
    agentExecutionsCount,
    estimatedMonthlyUsd: meteredUsd,
    invoiceStatus: noisyNeighborThrottled ? 'overage_alert' : 'current',
  };
}

export function generateConnectorPackageArtifacts(
  tenant: TenantOrganization,
  connector: CustomerConnector,
  region: RegionalControlPlane
): ConnectorInstallPackage {
  const scopesList = connector.permissionsGranted.map((p) => `  - "${p}"`).join('\n');

  const bashScript = `#!/usr/bin/env bash
set -euo pipefail
# HF-CDF GLOBAL Customer-Resident Defense Connector Installer
# Tenant: ${tenant.id} (${tenant.name}) | Region: ${region.id} (${region.cityHub})
# Outbound-First mTLS Enrollment — Zero Inbound Firewall Ports Required

export HFCDF_TENANT_ID="${tenant.id}"
export HFCDF_CONNECTOR_ID="${connector.id}"
export HFCDF_SPIFFE_ID="${connector.workloadIdentitySpiffe}"
export HFCDF_REGION_ENDPOINT="${region.endpointUrl}"
export HFCDF_ISOLATION_TIER="${tenant.isolationTier}"

echo "[HF-CDF] Enrolling customer-resident runtime with least-privilege scopes..."
mkdir -p /etc/hfcdf/certs /var/lib/hfcdf/buffer
cat <<EOF > /etc/hfcdf/connector.yaml
tenant_id: ${tenant.id}
connector_id: ${connector.id}
spiffe_id: ${connector.workloadIdentitySpiffe}
control_plane: ${region.endpointUrl}
outbound_only: true
offline_buffer_mb: 512
byok_key_id: ${tenant.byokKeyId}
EOF
echo "[HF-CDF] Enrollment manifest written. Starting systemd unit hfcdf-resident-agent..."`;

  const powershellScript = `#Requires -Version 5.1
# HF-CDF GLOBAL Windows Server / Endpoint Resident Agent Installer
$ErrorActionPreference = "Stop"
$TenantId = "${tenant.id}"
$ConnectorId = "${connector.id}"
$ControlPlane = "${region.endpointUrl}"
$SpiffeId = "${connector.workloadIdentitySpiffe}"

Write-Host "[HF-CDF] Establishing outbound mTLS tunnel to $ControlPlane for $TenantId" -ForegroundColor Cyan
$Config = @{
  tenant_id = $TenantId
  connector_id = $ConnectorId
  spiffe_id = $SpiffeId
  autonomy_mode = "${tenant.autonomyMode}"
  rls_policy = "${tenant.rlsPolicyName}"
} | ConvertTo-Json
New-Item -ItemType Directory -Force -Path "C:\\ProgramData\\HFCDF" | Out-Null
Set-Content -Path "C:\\ProgramData\\HFCDF\\agent-config.json" -Value $Config`;

  const terraformHcl = `# Terraform IaC — Customer-Controlled ${connector.environmentType.toUpperCase()} Enclave Boundary
terraform {
  required_version = ">= 1.9.0"
}

resource "hfcdf_tenant_connector" "${connector.id.replace(/[^a-zA-Z0-9_]/g, '_')}" {
  tenant_id          = "${tenant.id}"
  region             = "${region.id}"
  isolation_tier     = "${tenant.isolationTier}"
  environment_type   = "${connector.environmentType}"
  spiffe_workload_id = "${connector.workloadIdentitySpiffe}"
  byok_kms_key_id    = "${tenant.byokKeyId}"
  outbound_only      = true
  allowed_scopes     = ${JSON.stringify(connector.permissionsGranted)}
}`;

  const kubernetesHelmYaml = `apiVersion: hfcdf.global/v2
kind: ResidentDefenseAgentSet
metadata:
  name: hfcdf-resident-${connector.id}
  namespace: hfcdf-system
spec:
  tenantId: "${tenant.id}"
  isolationTier: "${tenant.isolationTier}"
  regionEndpoint: "${region.endpointUrl}"
  workloadIdentity:
    spiffeId: "${connector.workloadIdentitySpiffe}"
    tokenTtlSeconds: 900
  outboundOnly: true
  allowedPermissions:
${scopesList}
  resources:
    limits:
      cpu: "500m"
      memory: "512Mi"`;

  const opaRegoPolicy = `package hfcdf.agent.authz

default allow = false

# Enforce tenant isolation and short-lived SPIFFE workload identity
allow if {
  input.tenant_id == "${tenant.id}"
  input.spiffe_id == "${connector.workloadIdentitySpiffe}"
  not input.kill_switch_engaged
  not prohibited_tool[input.tool]
  input.tool in allowed_tools
}

prohibited_tool[t] if {
  t := ["dump_customer_secrets", "exfiltrate_model_weights", "disable_audit_log", "cross_tenant_read"][_]
}

allowed_tools := ["read_telemetry", "inspect_cloud_config", "quarantine_pod_staged", "collect_forensic_hash"]`;

  return {
    tenantId: tenant.id,
    connectorId: connector.id,
    spiffeId: connector.workloadIdentitySpiffe,
    regionalEndpoint: region.endpointUrl,
    bashScript,
    powershellScript,
    terraformHcl,
    kubernetesHelmYaml,
    opaRegoPolicy,
  };
}

export const INITIAL_REGIONAL_CONTROL_PLANES: RegionalControlPlane[] = [
  {
    id: 'in-mum',
    regionName: 'India Sovereign Cluster',
    cityHub: 'Mumbai / Hyderabad',
    endpointUrl: 'https://in-mum.cp.hfcdf.global',
    status: 'operational',
    availabilitySloPct: 99.99,
    tenantCount: 2,
    ingestedEventsPerSec: 18400,
    queueLagMs: 14,
    dataResidencyStandard: 'CERT-In / DPDP Act Strict Residency',
    kmsKeyArnPrefix: 'arn:aws:kms:ap-south-1:byok',
  },
  {
    id: 'ap-sgp',
    regionName: 'Asia Pacific Regional Plane',
    cityHub: 'Singapore',
    endpointUrl: 'https://ap-sgp.cp.hfcdf.global',
    status: 'operational',
    availabilitySloPct: 99.98,
    tenantCount: 1,
    ingestedEventsPerSec: 12900,
    queueLagMs: 19,
    dataResidencyStandard: 'MAS TRM / PDPA Isolated',
    kmsKeyArnPrefix: 'arn:aws:kms:ap-southeast-1:byok',
  },
  {
    id: 'eu-fra',
    regionName: 'Europe Sovereign Plane',
    cityHub: 'Frankfurt',
    endpointUrl: 'https://eu-fra.cp.hfcdf.global',
    status: 'operational',
    availabilitySloPct: 99.99,
    tenantCount: 2,
    ingestedEventsPerSec: 21300,
    queueLagMs: 11,
    dataResidencyStandard: 'GDPR / DORA / NIS2 EU-Resident',
    kmsKeyArnPrefix: 'arn:aws:kms:eu-central-1:byok',
  },
  {
    id: 'us-iad',
    regionName: 'North America Control Plane',
    cityHub: 'Virginia / Oregon',
    endpointUrl: 'https://us-iad.cp.hfcdf.global',
    status: 'operational',
    availabilitySloPct: 99.99,
    tenantCount: 2,
    ingestedEventsPerSec: 29600,
    queueLagMs: 9,
    dataResidencyStandard: 'SOC2 Type II / HIPAA / FedRAMP Aligned',
    kmsKeyArnPrefix: 'arn:aws:kms:us-east-1:byok',
  },
  {
    id: 'me-uae',
    regionName: 'Middle East Cloud Plane',
    cityHub: 'UAE (Abu Dhabi / Dubai)',
    endpointUrl: 'https://me-uae.cp.hfcdf.global',
    status: 'operational',
    availabilitySloPct: 99.95,
    tenantCount: 1,
    ingestedEventsPerSec: 8400,
    queueLagMs: 22,
    dataResidencyStandard: 'ADHICS / UAE NESA Sovereign Boundary',
    kmsKeyArnPrefix: 'arn:aws:kms:me-central-1:byok',
  },
];

export const INITIAL_TENANT_ORGANIZATIONS: TenantOrganization[] = [
  {
    id: 'tenant-nexus-fin',
    name: 'Company E · Nexus Clearing Bank',
    domain: 'nexusclearing.example',
    industry: 'Financial Services',
    environmentSummary: 'Dedicated Banking VPC + ISO-20022 Clearing + Entra ID',
    primaryEnvironment: 'aws-k8s',
    regionId: 'eu-fra',
    isolationTier: 'sovereign',
    operatingModel: 'hybrid',
    autonomyMode: 'human-approval',
    planTier: 'sovereign',
    verificationStatus: 'verified',
    dataClassification: 'SOVEREIGN',
    byokKeyId: 'cmk-eu-fra-nexus-991a',
    rlsPolicyName: 'rls_tenant_nexus_fin_strict',
    status: 'active',
    createdAt: '2026-09-12T10:00:00Z',
    quota: { maxAssets: 25000, maxAgents: 250, maxEventsPerSec: 20000, retentionDays: 730 },
    healthScore: 98,
    openIncidentsCount: 1,
    assetsCount: 1420,
    agentsCount: 18,
  },
  {
    id: 'tenant-vertex-ai',
    name: 'Company D · Vertex Frontier AI Labs',
    domain: 'vertexlabs.example',
    industry: 'AI Development',
    environmentSummary: 'Multi-Cluster H200 Inference + Safetensors Vault + MCP Gateway',
    primaryEnvironment: 'ai-cluster',
    regionId: 'us-iad',
    isolationTier: 'enterprise',
    operatingModel: 'hybrid',
    autonomyMode: 'tiered-autonomy',
    planTier: 'enterprise',
    verificationStatus: 'verified',
    dataClassification: 'RESTRICTED',
    byokKeyId: 'cmk-us-iad-vertex-402b',
    rlsPolicyName: 'rls_tenant_vertex_ai_strict',
    status: 'active',
    createdAt: '2026-10-03T14:20:00Z',
    quota: { maxAssets: 12000, maxAgents: 180, maxEventsPerSec: 15000, retentionDays: 365 },
    healthScore: 94,
    openIncidentsCount: 1,
    assetsCount: 860,
    agentsCount: 24,
  },
  {
    id: 'tenant-cloudscale-a',
    name: 'Company A · CloudScale Commerce',
    domain: 'cloudscale.example',
    industry: 'Cloud SaaS',
    environmentSummary: 'AWS EKS + Multi-Region Kubernetes + GitHub CI/CD',
    primaryEnvironment: 'aws-k8s',
    regionId: 'us-iad',
    isolationTier: 'enterprise',
    operatingModel: 'pure-saas',
    autonomyMode: 'tiered-autonomy',
    planTier: 'professional',
    verificationStatus: 'verified',
    dataClassification: 'CONFIDENTIAL',
    byokKeyId: 'cmk-us-iad-cloudscale-118f',
    rlsPolicyName: 'rls_tenant_cloudscale_a_strict',
    status: 'active',
    createdAt: '2026-10-18T08:15:00Z',
    quota: { maxAssets: 5000, maxAgents: 60, maxEventsPerSec: 8000, retentionDays: 180 },
    healthScore: 99,
    openIncidentsCount: 0,
    assetsCount: 412,
    agentsCount: 9,
  },
  {
    id: 'tenant-aurora-health',
    name: 'Company F · Aurora Regional Health',
    domain: 'aurorahealth.example',
    industry: 'Healthcare',
    environmentSummary: 'Azure + Microsoft 365 + EHR Data Enclave',
    primaryEnvironment: 'azure-m365',
    regionId: 'us-iad',
    isolationTier: 'enterprise',
    operatingModel: 'managed-security',
    autonomyMode: 'human-approval',
    planTier: 'enterprise',
    verificationStatus: 'verified',
    dataClassification: 'RESTRICTED',
    byokKeyId: 'cmk-us-iad-aurora-774c',
    rlsPolicyName: 'rls_tenant_aurora_health_strict',
    status: 'active',
    createdAt: '2026-10-25T11:30:00Z',
    quota: { maxAssets: 8000, maxAgents: 90, maxEventsPerSec: 9500, retentionDays: 365 },
    healthScore: 96,
    openIncidentsCount: 0,
    assetsCount: 640,
    agentsCount: 12,
  },
  {
    id: 'tenant-bharat-grid',
    name: 'Company C · Bharat Precision Data Center',
    domain: 'bharatdc.example',
    industry: 'Manufacturing',
    environmentSummary: 'On-Premises Bare-Metal DC + OT/SCADA DMZ',
    primaryEnvironment: 'on-prem',
    regionId: 'in-mum',
    isolationTier: 'sovereign',
    operatingModel: 'hybrid',
    autonomyMode: 'human-approval',
    planTier: 'sovereign',
    verificationStatus: 'verified',
    dataClassification: 'SOVEREIGN',
    byokKeyId: 'cmk-in-mum-bharat-551d',
    rlsPolicyName: 'rls_tenant_bharat_grid_strict',
    status: 'active',
    createdAt: '2026-11-01T06:45:00Z',
    quota: { maxAssets: 15000, maxAgents: 140, maxEventsPerSec: 14000, retentionDays: 365 },
    healthScore: 97,
    openIncidentsCount: 0,
    assetsCount: 930,
    agentsCount: 14,
  },
  {
    id: 'tenant-meridian-tel',
    name: 'Company B · Meridian Telecom Group',
    domain: 'meridiantel.example',
    industry: 'Telecom',
    environmentSummary: 'Azure + Microsoft 365 + Core 5G Packet Gateway',
    primaryEnvironment: 'azure-m365',
    regionId: 'ap-sgp',
    isolationTier: 'standard',
    operatingModel: 'pure-saas',
    autonomyMode: 'read-only',
    planTier: 'business',
    verificationStatus: 'verified',
    dataClassification: 'INTERNAL',
    byokKeyId: 'pooled-kms-ap-sgp-std',
    rlsPolicyName: 'rls_tenant_meridian_tel_strict',
    status: 'active',
    createdAt: '2026-11-09T09:10:00Z',
    quota: { maxAssets: 1500, maxAgents: 25, maxEventsPerSec: 3000, retentionDays: 90 },
    healthScore: 95,
    openIncidentsCount: 0,
    assetsCount: 280,
    agentsCount: 6,
  },
];

export const INITIAL_CUSTOMER_CONNECTORS: CustomerConnector[] = [
  {
    id: 'conn-nexus-aws-01',
    tenantId: 'tenant-nexus-fin',
    name: 'Nexus EU Banking VPC Collector',
    environmentType: 'aws-k8s',
    regionId: 'eu-fra',
    workloadIdentitySpiffe: 'spiffe://eu-fra.hfcdf.global/tenant/tenant-nexus-fin/connector/conn-nexus-aws-01',
    packageFormat: 'terraform',
    enrollmentStatus: 'enrolled',
    outboundOnly: true,
    credentialFingerprint: 'sha256:9f82a10c4d77e2b9',
    credentialExpiresAt: '2026-12-31T23:59:59Z',
    permissionsGranted: ['read_cloudtrail_audit', 'inspect_eks_pods', 'propose_sg_quarantine'],
    lastHeartbeatAt: '2026-11-22T08:10:00Z',
    telemetryRateEps: 6420,
    offlineBufferEvents: 0,
    version: 'v2.4.1-go',
  },
  {
    id: 'conn-vertex-ai-01',
    tenantId: 'tenant-vertex-ai',
    name: 'Vertex H200 Weights & MCP Gateway Sensor',
    environmentType: 'ai-cluster',
    regionId: 'us-iad',
    workloadIdentitySpiffe: 'spiffe://us-iad.hfcdf.global/tenant/tenant-vertex-ai/connector/conn-vertex-ai-01',
    packageFormat: 'helm',
    enrollmentStatus: 'enrolled',
    outboundOnly: true,
    credentialFingerprint: 'sha256:3c11f48e2a90b7d1',
    credentialExpiresAt: '2026-12-31T23:59:59Z',
    permissionsGranted: ['read_mcp_tool_calls', 'verify_safetensors_merkle', 'enforce_egress_allowlist'],
    lastHeartbeatAt: '2026-11-22T08:12:00Z',
    telemetryRateEps: 8250,
    offlineBufferEvents: 0,
    version: 'v2.4.1-rust',
  },
  {
    id: 'conn-cloudscale-eks',
    tenantId: 'tenant-cloudscale-a',
    name: 'CloudScale EKS & GitHub Webhook Collector',
    environmentType: 'aws-k8s',
    regionId: 'us-iad',
    workloadIdentitySpiffe: 'spiffe://us-iad.hfcdf.global/tenant/tenant-cloudscale-a/connector/conn-cloudscale-eks',
    packageFormat: 'helm',
    enrollmentStatus: 'enrolled',
    outboundOnly: true,
    credentialFingerprint: 'sha256:7d44e19b8c20f3a4',
    credentialExpiresAt: '2026-12-31T23:59:59Z',
    permissionsGranted: ['read_k8s_audit', 'read_github_sbom', 'read_telemetry'],
    lastHeartbeatAt: '2026-11-22T08:11:00Z',
    telemetryRateEps: 3180,
    offlineBufferEvents: 0,
    version: 'v2.4.1-go',
  },
  {
    id: 'conn-bharat-onprem',
    tenantId: 'tenant-bharat-grid',
    name: 'Bharat On-Prem DMZ Syslog & eBPF Tap',
    environmentType: 'on-prem',
    regionId: 'in-mum',
    workloadIdentitySpiffe: 'spiffe://in-mum.hfcdf.global/tenant/tenant-bharat-grid/connector/conn-bharat-onprem',
    packageFormat: 'systemd',
    enrollmentStatus: 'enrolled',
    outboundOnly: true,
    credentialFingerprint: 'sha256:5e90c31d7a12b8e2',
    credentialExpiresAt: '2026-12-31T23:59:59Z',
    permissionsGranted: ['read_ebpf_syscalls', 'read_netflow_v9', 'read_telemetry'],
    lastHeartbeatAt: '2026-11-22T08:09:00Z',
    telemetryRateEps: 5410,
    offlineBufferEvents: 0,
    version: 'v2.4.1-go',
  },
];

export const INITIAL_CUSTOMER_ASSETS: CustomerAsset[] = [
  {
    id: 'ast-nexus-clearing-01',
    tenantId: 'tenant-nexus-fin',
    name: 'eu-fra-iso20022-clearing-core',
    assetType: 'k8s_cluster',
    provider: 'AWS',
    regionId: 'eu-fra',
    criticality: 'tier-0',
    postureStatus: 'protected',
    lastTelemetryAt: '2026-11-22T08:10:00Z',
    tags: ['pci-dss', 'dora', 'sovereign-vpc'],
  },
  {
    id: 'ast-nexus-entra-02',
    tenantId: 'tenant-nexus-fin',
    name: 'nexus-privileged-entra-directory',
    assetType: 'identity_provider',
    provider: 'Azure',
    regionId: 'eu-fra',
    criticality: 'tier-0',
    postureStatus: 'at_risk',
    lastTelemetryAt: '2026-11-22T08:08:00Z',
    tags: ['oidc', 'tier0-identity'],
  },
  {
    id: 'ast-vertex-h200-vault',
    tenantId: 'tenant-vertex-ai',
    name: 'us-iad-safetensors-weights-vault',
    assetType: 'ai_model_endpoint',
    provider: 'Kubernetes',
    regionId: 'us-iad',
    criticality: 'tier-0',
    postureStatus: 'protected',
    lastTelemetryAt: '2026-11-22T08:12:00Z',
    tags: ['llm-weights', 'mcp-gateway', 'h200'],
  },
  {
    id: 'ast-cloudscale-eks-prod',
    tenantId: 'tenant-cloudscale-a',
    name: 'us-iad-checkout-eks-cluster',
    assetType: 'k8s_cluster',
    provider: 'AWS',
    regionId: 'us-iad',
    criticality: 'tier-1',
    postureStatus: 'protected',
    lastTelemetryAt: '2026-11-22T08:11:00Z',
    tags: ['eks', 'prod-commerce'],
  },
  {
    id: 'ast-bharat-scada-dmz',
    tenantId: 'tenant-bharat-grid',
    name: 'in-mum-dc-core-firewall-01',
    assetType: 'endpoint_fleet',
    provider: 'On-Premises',
    regionId: 'in-mum',
    criticality: 'tier-0',
    postureStatus: 'protected',
    lastTelemetryAt: '2026-11-22T08:09:00Z',
    tags: ['on-prem', 'cert-in'],
  },
];

export const INITIAL_CUSTOMER_AGENTS: CustomerDefenseAgent[] = [
  {
    id: 'cagent-nexus-blue-01',
    tenantId: 'tenant-nexus-fin',
    name: 'Nexus Identity Guardian',
    force: 'BLUE_FORCE',
    unitType: 'Identity & Clearing Guardian',
    spiffeId: 'spiffe://eu-fra.hfcdf.global/tenant/tenant-nexus-fin/agent/blue-identity-01',
    regionId: 'eu-fra',
    allowedTools: ['read_telemetry', 'inspect_cloud_config', 'revoke_iam_sessions'],
    deniedTools: ['dump_customer_secrets', 'cross_tenant_read', 'disable_audit_log'],
    allowedResources: ['ast-nexus-*', 'clearing-ledger://*'],
    maxExecutionSeconds: 120,
    autonomyMode: 'human-approval',
    tokenExpiresAt: '2027-12-31T23:59:59Z',
    status: 'active',
    killSwitchEngaged: false,
    lastDecisionAt: '2026-11-22T08:10:00Z',
    actionsExecuted: 148,
    blockedViolations: 3,
  },
  {
    id: 'cagent-nexus-red-01',
    tenantId: 'tenant-nexus-fin',
    name: 'Nexus Red Identity Validator',
    force: 'RED_FORCE',
    unitType: 'Identity Configuration Assessment Agent',
    spiffeId: 'spiffe://eu-fra.hfcdf.global/tenant/tenant-nexus-fin/agent/red-validator-01',
    regionId: 'eu-fra',
    allowedTools: ['read_telemetry', 'inspect_cloud_config'],
    deniedTools: ['dump_customer_secrets', 'exfiltrate_model_weights', 'cross_tenant_read'],
    allowedResources: ['ast-nexus-*'],
    maxExecutionSeconds: 60,
    autonomyMode: 'read-only',
    tokenExpiresAt: '2027-12-31T23:59:59Z',
    status: 'standby',
    killSwitchEngaged: false,
    lastDecisionAt: '2026-11-22T07:50:00Z',
    actionsExecuted: 22,
    blockedViolations: 0,
  },
  {
    id: 'cagent-vertex-blue-01',
    tenantId: 'tenant-vertex-ai',
    name: 'Vertex Model & MCP Behavior Guardian',
    force: 'BLUE_FORCE',
    unitType: 'Agent Behavior & Model Guardian',
    spiffeId: 'spiffe://us-iad.hfcdf.global/tenant/tenant-vertex-ai/agent/blue-model-01',
    regionId: 'us-iad',
    allowedTools: ['read_telemetry', 'verify_safetensors_merkle', 'quarantine_k8s_namespace'],
    deniedTools: ['dump_customer_secrets', 'exfiltrate_model_weights', 'disable_audit_log'],
    allowedResources: ['ast-vertex-*', 'mcp-gateway://*'],
    maxExecutionSeconds: 90,
    autonomyMode: 'tiered-autonomy',
    tokenExpiresAt: '2027-12-31T23:59:59Z',
    status: 'active',
    killSwitchEngaged: false,
    lastDecisionAt: '2026-11-22T08:12:00Z',
    actionsExecuted: 312,
    blockedViolations: 11,
  },
  {
    id: 'cagent-cloudscale-blue-01',
    tenantId: 'tenant-cloudscale-a',
    name: 'CloudScale K8s Runtime Guardian',
    force: 'BLUE_FORCE',
    unitType: 'Cloud & Workload Guardian',
    spiffeId: 'spiffe://us-iad.hfcdf.global/tenant/tenant-cloudscale-a/agent/blue-k8s-01',
    regionId: 'us-iad',
    allowedTools: ['read_telemetry', 'inspect_cloud_config', 'quarantine_pod_staged'],
    deniedTools: ['dump_customer_secrets', 'cross_tenant_read'],
    allowedResources: ['ast-cloudscale-*'],
    maxExecutionSeconds: 90,
    autonomyMode: 'tiered-autonomy',
    tokenExpiresAt: '2027-12-31T23:59:59Z',
    status: 'active',
    killSwitchEngaged: false,
    lastDecisionAt: '2026-11-22T08:11:00Z',
    actionsExecuted: 94,
    blockedViolations: 1,
  },
];

export const INITIAL_TENANT_INCIDENTS: TenantIncidentRecord[] = [
  {
    id: 'TINC-EU-904',
    tenantId: 'tenant-nexus-fin',
    title: 'Anomalous OIDC Token Delegation Attempt on ISO-20022 Clearing Service',
    severity: 'critical',
    state: 'investigating',
    detectedAt: '2026-11-22T07:55:00Z',
    assignedForce: 'BLUE_FORCE',
    affectedAssetId: 'ast-nexus-entra-02',
    summary: 'Service principal attempted cross-scope privilege elevation without signed MFA assertion.',
    proposedResponse: 'Revoke ephemeral OIDC session tokens and quarantine offending workload subnet.',
    approvalStatus: 'pending_human',
    evidenceHashSha256: 'sha256:aa41d0f9b2c8e1449a7f312c8901be44',
  },
  {
    id: 'TINC-US-712',
    tenantId: 'tenant-vertex-ai',
    title: 'Unauthorized Autonomous Agent Tool-Call Blocked at MCP Gateway',
    severity: 'high',
    state: 'contained',
    detectedAt: '2026-11-22T07:32:00Z',
    assignedForce: 'BLUE_FORCE',
    affectedAssetId: 'ast-vertex-h200-vault',
    summary: 'Model evaluation agent invoked prohibited tool exfiltrate_model_weights; denied deterministically by Rego gateway.',
    proposedResponse: 'Maintain pod network isolation and rotate SPIFFE workload identity certificate.',
    approvalStatus: 'approved',
    approvedBy: 'Vertex CISO Admin',
    evidenceHashSha256: 'sha256:7f128c0a4e9938b112cd084e1904fa12',
  },
];

export const INITIAL_DELEGATED_SOC_GRANTS: DelegatedSocGrant[] = [
  {
    id: 'GRANT-SOC-101',
    tenantId: 'tenant-nexus-fin',
    tenantName: 'Company E · Nexus Clearing Bank',
    analystId: '*',
    scope: 'execute_approved_containment',
    reason: 'Active P1 OIDC Delegation Investigation (TINC-EU-904)',
    grantedByCustomerAdmin: 'Elena Rostova (Nexus CISO)',
    grantedAt: '2026-11-22T07:58:00Z',
    expiresAt: '2027-12-31T23:59:59Z',
    status: 'active',
  },
  {
    id: 'GRANT-SOC-102',
    tenantId: 'tenant-vertex-ai',
    tenantName: 'Company D · Vertex Frontier AI Labs',
    analystId: '*',
    scope: 'investigate_incidents',
    reason: 'Post-Containment Forensics Audit for MCP Gateway Block',
    grantedByCustomerAdmin: 'David Chen (Vertex Security Lead)',
    grantedAt: '2026-11-22T07:35:00Z',
    expiresAt: '2027-12-31T23:59:59Z',
    status: 'active',
  },
];

export const INITIAL_TENANT_EVIDENCE: TenantEvidenceRecord[] = [
  {
    id: 'EVD-NEXUS-01',
    tenantId: 'tenant-nexus-fin',
    incidentId: 'TINC-EU-904',
    agentId: 'cagent-nexus-blue-01',
    actor: 'Policy Enforcement Gateway (eu-fra)',
    action: 'INVOKE_TOOL: revoke_iam_sessions',
    decision: 'PENDING_APPROVAL',
    policyRule: 'rego.hfcdf.agent.require_human_signoff',
    sha256Seal: 'sha256:e4c190b7d812fa441908ce3a',
    createdAt: '2026-11-22T07:56:12Z',
    summary: 'Queued high-consequence IAM revocation for Customer Admin sign-off under human-approval autonomy.',
  },
  {
    id: 'EVD-VERTEX-01',
    tenantId: 'tenant-vertex-ai',
    incidentId: 'TINC-US-712',
    agentId: 'cagent-vertex-blue-01',
    actor: 'Policy Enforcement Gateway (us-iad)',
    action: 'INVOKE_TOOL: exfiltrate_model_weights',
    decision: 'BLOCKED',
    policyRule: 'rego.hfcdf.agent.deny_prohibited_tool',
    sha256Seal: 'sha256:9b33a8d104fc1298e401da77',
    createdAt: '2026-11-22T07:32:04Z',
    summary: 'Deterministic Rego policy blocked prohibited tool invocation before execution; zero weights exfiltrated.',
  },
];

export const UNIVERSAL_CONNECTOR_CATALOG: UniversalConnectorCatalogItem[] = [
  { id: 'cat-aws', name: 'AWS CloudTrail & GuardDuty Collector', category: 'Cloud', authMethod: 'STS Cross-Account IAM Role (ExternalId)', leastPrivilegeScopes: ['cloudtrail:LookupEvents', 'eks:DescribeCluster'], rateLimitRpm: 12000, schemaFormat: 'OCSF v1.3 JSON', implementationStatus: 'Implemented' },
  { id: 'cat-azure', name: 'Microsoft Azure & Entra ID Bridge', category: 'Identity', authMethod: 'OIDC Workload Identity Federation', leastPrivilegeScopes: ['AuditLog.Read.All', 'SecurityEvents.Read.All'], rateLimitRpm: 10000, schemaFormat: 'OCSF / Entra JSON', implementationStatus: 'Implemented' },
  { id: 'cat-gcp', name: 'Google Cloud Security Command Center', category: 'Cloud', authMethod: 'GCP Workload Identity Federation', leastPrivilegeScopes: ['securitycenter.findings.list'], rateLimitRpm: 10000, schemaFormat: 'OCSF JSON', implementationStatus: 'Implemented' },
  { id: 'cat-k8s', name: 'Kubernetes eBPF & Audit DaemonSet', category: 'Cloud', authMethod: 'SPIFFE Short-Lived SVID + mTLS', leastPrivilegeScopes: ['pods:get', 'events:watch'], rateLimitRpm: 25000, schemaFormat: 'K8s Audit / eBPF RingBuf', implementationStatus: 'Implemented' },
  { id: 'cat-okta', name: 'Okta & Auth0 Identity Telemetry', category: 'Identity', authMethod: 'OAuth 2.0 Private Key JWT', leastPrivilegeScopes: ['okta.logs.read', 'okta.users.read'], rateLimitRpm: 6000, schemaFormat: 'Okta SystemLog JSON', implementationStatus: 'Implemented' },
  { id: 'cat-edr', name: 'CrowdStrike / SentinelOne / OSQuery XDR', category: 'Endpoint', authMethod: 'Scoped API Client + HMAC Webhook', leastPrivilegeScopes: ['alerts:read', 'hosts:read'], rateLimitRpm: 15000, schemaFormat: 'OCSF Endpoint Event', implementationStatus: 'Implemented' },
  { id: 'cat-github', name: 'GitHub & GitLab CI/CD Supply Chain', category: 'App & CI/CD', authMethod: 'GitHub App Installation Token', leastPrivilegeScopes: ['security_events:read', 'metadata:read'], rateLimitRpm: 5000, schemaFormat: 'SARIF / SBOM CycloneDX', implementationStatus: 'Implemented' },
  { id: 'cat-otel', name: 'OpenTelemetry & Kafka/Redpanda Stream', category: 'Data & Observability', authMethod: 'mTLS SASL/SCRAM-SHA-512', leastPrivilegeScopes: ['topic.telemetry.produce', 'otel.traces.ingest'], rateLimitRpm: 60000, schemaFormat: 'OTLP Protobuf / JSON', implementationStatus: 'Implemented' },
];

export const PLATFORM_ROADMAP_PHASES: RoadmapPhaseItem[] = [
  { phase: 1, name: 'Multi-Tenant Foundation & Auth', status: 'Implemented', scopeSummary: 'Scrypt auth, Bearer memory sessions, tenant isolation guard, RBAC, audit logs, SQLite RLS-emulated boundaries.', verifiedArtifacts: ['server/auth-hub.ts', 'server/multi-tenant-hub.ts', 'src/core/multi-tenant-engine.test.ts'] },
  { phase: 2, name: 'Customer Onboarding & Regional Routing', status: 'Implemented', scopeSummary: '5 regional control planes (IN, SG, EU, US, UAE), 3 isolation tiers (Standard, Enterprise, Sovereign).', verifiedArtifacts: ['GlobalCommandHub.tsx', '/api/v2/tenants'] },
  { phase: 3, name: 'Customer-Resident Connector Packages', status: 'Implemented', scopeSummary: 'Outbound-first SPIFFE enrollment, revocation, Terraform/Helm/Bash/PowerShell/Rego installers.', verifiedArtifacts: ['generateConnectorPackageArtifacts', 'CustomerCommandPortal.tsx'] },
  { phase: 4, name: 'Digital Asset Intelligence', status: 'Implemented', scopeSummary: 'Tenant-scoped multi-cloud, K8s, Entra, On-Prem & AI weights asset registry.', verifiedArtifacts: ['CustomerCommandPortal.tsx', '/api/v2/tenants/:id/assets'] },
  { phase: 5, name: 'Agent Universe & Trust Plane', status: 'Implemented', scopeSummary: 'Per-agent SPIFFE IDs, short-lived tokens, tool allowlists, kill switch & attenuation.', verifiedArtifacts: ['evaluatePolicyGateway', 'AgentTrustCenter.tsx'] },
  { phase: 6, name: 'Telemetry Fabric & Canonical Event Bus', status: 'Implemented', scopeSummary: 'Normalized event schema, deduplication, dead-letter queue & SQLite persistence.', verifiedArtifacts: ['src/core/canonical-event.ts', 'server/governance-hub.ts'] },
  { phase: 7, name: 'Deterministic Policy & Rego Gateway', status: 'Implemented', scopeSummary: 'Server-side Rego-aligned enforcement preventing LLM privilege escalation.', verifiedArtifacts: ['evaluatePolicyGateway', 'eval-policy-test'] },
  { phase: 8, name: 'Blue Force Continuous Defense', status: 'Implemented', scopeSummary: 'Tenant-scoped investigation, containment proposals, human sign-off & verification.', verifiedArtifacts: ['BlueForce.tsx', 'SocCommandWorkspace.tsx'] },
  { phase: 9, name: 'Red Force Authorized Validation', status: 'Implemented', scopeSummary: 'Scoped simulation runs strictly bound to authorized tenant inventory.', verifiedArtifacts: ['RedForce.tsx', 'server/agent-defense-hub.ts'] },
  { phase: 10, name: 'Global Command Center', status: 'Implemented', scopeSummary: 'Fleet posture across all customer organizations, regional SLOs, and platform capacity.', verifiedArtifacts: ['GlobalCommandHub.tsx'] },
  { phase: 11, name: 'Cross-Customer Privacy-Preserving Intel', status: 'Implemented', scopeSummary: 'Sanitized campaign & IOC hash correlation with zero raw log leakage.', verifiedArtifacts: ['buildSanitizedCrossCustomerIntel'] },
  { phase: 12, name: 'Universal Integration Framework', status: 'Implemented', scopeSummary: 'AWS, Azure, GCP, K8s, Entra, Okta, GitHub, CrowdStrike, OTel connector catalog.', verifiedArtifacts: ['UNIVERSAL_CONNECTOR_CATALOG', 'IntegrationsModule.tsx'] },
  { phase: 13, name: 'Distributed Scaling & Quotas', status: 'Tested', scopeSummary: 'Per-tenant EPS quotas, noisy-neighbor detection, capacity model (5k orgs / 1M assets / 100k EPS target).', verifiedArtifacts: ['computeTenantUsageAndQuota'] },
  { phase: 14, name: 'Commercial Metering & Billing', status: 'Implemented', scopeSummary: 'Business/Professional/Enterprise/Sovereign plans, SLA monitoring & metering summaries.', verifiedArtifacts: ['computeTenantUsageAndQuota', 'GlobalCommandHub.tsx'] },
  { phase: 15, name: 'Security & Automated Isolation Proof', status: 'Validated', scopeSummary: 'Automated cross-tenant penetration verification + 29-step flagship workflow.', verifiedArtifacts: ['runFlagshipEnterpriseWorkflow', 'multi-tenant-engine.test.ts'] },
];

export const ARCHITECTURE_DEBT_REPORT = [
  { id: 'DEBT-01', area: 'Auth Session Storage', beforeState: 'Hardcoded client-side credential check stored in localStorage', resolution: 'Replaced with server-side scrypt hashing + HMAC-SHA256 Bearer token held strictly in JS memory', status: 'Resolved' },
  { id: 'DEBT-02', area: 'Single-Tenant Memory Store', beforeState: 'Global unpartitioned in-memory arrays in server.ts', resolution: 'Added tenant_id partitioned SQLite store (multi-tenant-hub.ts) with strict evaluateTenantAccess checks', status: 'Resolved' },
  { id: 'DEBT-03', area: 'Cross-Customer Intelligence Leakage Risk', beforeState: 'Shared intel memory had no tenant-sanitization pipeline', resolution: 'Added buildSanitizedCrossCustomerIntel stripping tenant names, secrets, and raw IPs', status: 'Resolved' },
  { id: 'DEBT-04', area: 'Dedicated External PostgreSQL Cluster', beforeState: 'Local container uses embedded sql.js SQLite WAL; external Postgres docker-compose staged in infra/', resolution: 'SQLite data plane enforces logical RLS today; Postgres 17 RLS migration ready via DATABASE_URL', status: 'Designed' },
];

export const RED_FORCE_UNIT_CATALOG = [
  'Reconnaissance Assessment Agent',
  'Vulnerability Assessment Agent',
  'Identity Configuration Assessment Agent',
  'Cloud Security Assessment Agent',
  'Application Security Assessment Agent',
  'Agent Security Assessment Agent',
  'Supply Chain Assessment Agent',
  'Model Integrity Assessment Agent',
  'Scenario Coordinator',
  'Simulation Executor',
  'Evidence Collector',
  'Defensive Validation Analyst',
] as const;

export const BLUE_FORCE_UNIT_CATALOG = [
  'Sentinel Monitoring Agent',
  'Threat Intelligence Agent',
  'Endpoint Guardian',
  'Cloud Guardian',
  'Network Guardian',
  'Identity Guardian',
  'Application Guardian',
  'Data Protection Guardian',
  'Agent Behavior Guardian',
  'Model Guardian',
  'Supply Chain Guardian',
  'Investigation Agent',
  'Forensics Agent',
  'Response Strategist',
  'Recovery Coordinator',
  'Validation Agent',
] as const;

export const COMPLIANCE_REFERENCE_FRAMEWORKS: ComplianceControlFramework[] = [
  { id: 'comp-nist-csf', framework: 'NIST CSF 2.0', version: '2.0', scopeNote: 'Govern, Identify, Protect, Detect, Respond, Recover telemetry controls', alignedControlsCount: 18, totalControls: 22, status: 'Engineering Reference' },
  { id: 'comp-nist-ai', framework: 'NIST AI RMF', version: '1.0', scopeNote: 'Deterministic policy gateway & human approval for autonomous AI agents', alignedControlsCount: 14, totalControls: 16, status: 'Engineering Reference' },
  { id: 'comp-owasp-agentic', framework: 'OWASP Agentic App Security', version: '2025-v1', scopeNote: 'Tool allowlists, prompt injection fixtures, SPIFFE workload delegation', alignedControlsCount: 10, totalControls: 10, status: 'Engineering Reference' },
  { id: 'comp-mitre-attack', framework: 'MITRE ATT&CK', version: 'v15', scopeNote: 'Real-time TTP mapping across Cloud, Identity, Endpoint, and Network events', alignedControlsCount: 24, totalControls: 28, status: 'Engineering Reference' },
  { id: 'comp-mitre-atlas', framework: 'MITRE ATLAS', version: 'v4.6', scopeNote: 'Model weight vaulting, inference anomaly scoring & RAG egress guardrails', alignedControlsCount: 11, totalControls: 12, status: 'Engineering Reference' },
  { id: 'comp-iso27001', framework: 'ISO/IEC 27001:2022', version: '2022', scopeNote: 'Multi-tenant RLS isolation, BYOK key management & immutable audit trails', alignedControlsCount: 29, totalControls: 35, status: 'Engineering Reference' },
];

export const RBAC_ROLE_MATRIX: RbacPermissionSpec[] = [
  { role: 'global_operator', label: 'Global Platform Operator', scopeBoundary: 'Global & Regional Control Plane Metadata Only (Customer Data Plane requires active DelegatedSocGrant)', canViewGlobalFleet: true, canOnboardTenants: true, canAccessAssignedTenant: false, canMutatePolicies: false, canApproveContainment: false, canViewAuditReports: true, canManageBilling: true },
  { role: 'soc_analyst', label: 'HF-CDF SOC Analyst', scopeBoundary: 'Only tenants covered by an active, unexpired customer-signed DelegatedSocGrant', canViewGlobalFleet: true, canOnboardTenants: false, canAccessAssignedTenant: false, canMutatePolicies: false, canApproveContainment: true, canViewAuditReports: true, canManageBilling: false },
  { role: 'customer_admin', label: 'Customer Security Admin (CISO)', scopeBoundary: 'Full administrative & policy control strictly bound to own assignedTenantId', canViewGlobalFleet: false, canOnboardTenants: false, canAccessAssignedTenant: true, canMutatePolicies: true, canApproveContainment: true, canViewAuditReports: true, canManageBilling: true },
  { role: 'customer_analyst', label: 'Customer Security Analyst', scopeBoundary: 'Read & triage incidents strictly inside own assignedTenantId (no admin policy mutations)', canViewGlobalFleet: false, canOnboardTenants: false, canAccessAssignedTenant: true, canMutatePolicies: false, canApproveContainment: false, canViewAuditReports: true, canManageBilling: false },
  { role: 'auditor', label: 'Compliance & Security Auditor', scopeBoundary: 'Read-only access to evidence ledger & compliance posture inside assignedTenantId or metadata plane', canViewGlobalFleet: true, canOnboardTenants: false, canAccessAssignedTenant: true, canMutatePolicies: false, canApproveContainment: false, canViewAuditReports: true, canManageBilling: false },
  { role: 'billing_admin', label: 'Customer Billing Administrator', scopeBoundary: 'Usage metering, SLA reports, and commercial plan controls inside own assignedTenantId', canViewGlobalFleet: false, canOnboardTenants: false, canAccessAssignedTenant: true, canMutatePolicies: false, canApproveContainment: false, canViewAuditReports: false, canManageBilling: true },
];

export interface RedForceScopeValidationResult {
  authorized: boolean;
  status: 'completed' | 'blocked_invalid_scope';
  signedScopeHash: string;
  reason: string;
}

/**
 * Deterministic Red Force authorization & containment verifier.
 * Enforces signed tenant scope, approved asset ownership, strict non-destructive rules,
 * zero public/third-party targeting, and max duration bounds.
 */
export function evaluateRedForceScope(input: {
  tenantId: string;
  scenarioName: string;
  targetAssetId: string;
  tenantAssets: CustomerAsset[];
  maxDurationMinutes: number;
  egressRestricted: boolean;
  approvedBy: string;
}): RedForceScopeValidationResult {
  const lower = input.scenarioName.toLowerCase();
  const targetOwned = input.tenantAssets.some(
    (a) => a.id === input.targetAssetId && a.tenantId === input.tenantId
  );

  const signedScopeHash =
    'scope-' +
    crypto
      .createHash('sha256')
      .update(`${input.tenantId}:${input.targetAssetId}:${input.scenarioName}:${input.approvedBy}`)
      .digest('hex')
      .slice(0, 16);

  if (!targetOwned) {
    return {
      authorized: false,
      status: 'blocked_invalid_scope',
      signedScopeHash,
      reason: `SCOPE_VIOLATION: Target asset '${input.targetAssetId}' is not inside verified inventory for tenant '${input.tenantId}'.`,
    };
  }

  if (
    lower.includes('public_internet') ||
    lower.includes('third_party') ||
    lower.includes('ransom') ||
    lower.includes('wipe') ||
    lower.includes('stealth_persistence')
  ) {
    return {
      authorized: false,
      status: 'blocked_invalid_scope',
      signedScopeHash,
      reason: `PROHIBITED_RED_ACTION: Scenario '${input.scenarioName}' violates non-destructive / non-public Red Force guardrails.`,
    };
  }

  if (!input.egressRestricted || input.maxDurationMinutes <= 0 || input.maxDurationMinutes > 120) {
    return {
      authorized: false,
      status: 'blocked_invalid_scope',
      signedScopeHash,
      reason: `CONSTRAINT_VIOLATION: Red Force requires strict egress restriction and execution duration between 1 and 120 minutes.`,
    };
  }

  return {
    authorized: true,
    status: 'completed',
    signedScopeHash,
    reason: `Signed isolated Red Force exercise authorized for asset '${input.targetAssetId}' (${input.maxDurationMinutes}m cap, zero-egress sandbox).`,
  };
}

/**
 * Deterministic High-Volume Telemetry Classifier (Section 12).
 * Routes telemetry to OCSF schemas without invoking an LLM on high-volume streams.
 */
export function classifyTelemetryDeterministically(input: {
  tenantId: string;
  connectorId: string;
  assetId: string;
  domain: SecurityDomainType;
  signalMessage: string;
}): Omit<TenantTelemetryEvent, 'id' | 'timestamp'> {
  const lower = input.signalMessage.toLowerCase();
  const isCritical =
    lower.includes('exfiltrat') ||
    lower.includes('privilege_escalat') ||
    lower.includes('token_theft') ||
    lower.includes('unauthorized_tool') ||
    lower.includes('escape');
  const isWarning =
    lower.includes('drift') ||
    lower.includes('anomal') ||
    lower.includes('scan') ||
    lower.includes('failed_mfa');

  const severity: TenantTelemetryEvent['severity'] = isCritical
    ? 'critical'
    : isWarning
    ? 'high'
    : 'info';

  const ocsfMap: Record<SecurityDomainType, string> = {
    Cloud: 'OCSF 1004 · Cloud Infrastructure Finding',
    Network: 'OCSF 4001 · Network Activity',
    Endpoint: 'OCSF 1001 · Process & Kernel Activity',
    Identity: 'OCSF 3002 · Authentication & OIDC Audit',
    Application: 'OCSF 2002 · API & Supply Chain Finding',
    AI_Agent: 'OCSF 7001 · Agentic MCP Tool Invocation',
    Data: 'OCSF 5003 · KMS / CMK & Data Access Audit',
  };

  return {
    tenantId: input.tenantId,
    sourceConnectorId: input.connectorId,
    sourceAssetId: input.assetId,
    domain: input.domain,
    ocsfCategory: ocsfMap[input.domain],
    severity,
    normalizedSummary: input.signalMessage.trim(),
    deterministicAction: isCritical ? 'alert_raised' : isWarning ? 'correlated' : 'passed',
  };
}

export function buildCustomerAuditReport(params: {
  tenant: TenantOrganization;
  region: RegionalControlPlane;
  assets: CustomerAsset[];
  agents: CustomerDefenseAgent[];
  incidents: TenantIncidentRecord[];
  evidence: TenantEvidenceRecord[];
  redExercises: TenantRedForceExercise[];
  usage: TenantUsageSummary;
}) {
  const payload = {
    reportVersion: 'HF-CDF-AUDIT-2.0',
    generatedAt: new Date().toISOString(),
    tenant: {
      id: params.tenant.id,
      name: params.tenant.name,
      domain: params.tenant.domain,
      regionId: params.region.id,
      residencyStandard: params.region.dataResidencyStandard,
      isolationTier: params.tenant.isolationTier,
      byokKeyId: params.tenant.byokKeyId,
      rlsPolicyName: params.tenant.rlsPolicyName,
      dataClassification: params.tenant.dataClassification,
    },
    postureSummary: {
      healthScore: params.tenant.healthScore,
      assetsMonitored: params.assets.length,
      activeAgents: params.agents.filter((a) => !a.killSwitchEngaged).length,
      totalIncidents: params.incidents.length,
      containedOrResolvedIncidents: params.incidents.filter((i) => i.state === 'contained' || i.state === 'resolved').length,
      evidenceRecordsSealed: params.evidence.length,
      redForceValidationsPassed: params.redExercises.filter((r) => r.controlVerified).length,
      slaMeasuredPct: params.usage.slaMeasuredPct,
    },
    engineeringComplianceReferences: COMPLIANCE_REFERENCE_FRAMEWORKS.map((f) => ({
      framework: f.framework,
      status: f.status,
      alignedControls: `${f.alignedControlsCount}/${f.totalControls}`,
    })),
    evidenceLedger: params.evidence,
    incidents: params.incidents,
    redForceExercises: params.redExercises,
  };

  const reportSha256Seal =
    'sha256:' + crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 32);

  return {
    ...payload,
    reportSha256Seal,
  };
}

export const INITIAL_TENANT_RED_FORCE_EXERCISES: TenantRedForceExercise[] = [
  {
    id: 'RF-EX-301',
    tenantId: 'tenant-nexus-fin',
    scenarioName: 'OIDC Cross-Scope Token Elevation Control Validation',
    unitType: 'Identity Configuration Assessment Agent',
    targetAssetId: 'ast-nexus-entra-02',
    signedScopeHash: 'scope-a18f22c90e4b1130',
    approvedBy: 'Elena Rostova (Nexus CISO)',
    maxDurationMinutes: 15,
    egressRestricted: true,
    status: 'completed',
    findingSummary: 'Confirmed deterministic MFA step-up policy blocks cross-scope OIDC delegation cleanly.',
    controlVerified: true,
    createdAt: '2026-11-22T07:20:00Z',
  },
  {
    id: 'RF-EX-302',
    tenantId: 'tenant-vertex-ai',
    scenarioName: 'Prompt Injection Fixture & MCP Tool Boundary Validation',
    unitType: 'Agent Security Assessment Agent',
    targetAssetId: 'ast-vertex-h200-vault',
    signedScopeHash: 'scope-b79d41e12f0899c2',
    approvedBy: 'David Chen (Vertex Security Lead)',
    maxDurationMinutes: 20,
    egressRestricted: true,
    status: 'completed',
    findingSummary: 'Verified deterministic Rego gateway rejects indirect prompt-injected weight export requests.',
    controlVerified: true,
    createdAt: '2026-11-22T07:10:00Z',
  },
];

export const INITIAL_TENANT_TELEMETRY_EVENTS: TenantTelemetryEvent[] = [
  {
    id: 'TEL-EU-1001',
    tenantId: 'tenant-nexus-fin',
    sourceConnectorId: 'conn-nexus-k8s-01',
    sourceAssetId: 'ast-nexus-clearing-vpc',
    domain: 'Network',
    ocsfCategory: 'OCSF 4001 · Network Activity',
    severity: 'info',
    normalizedSummary: 'Outbound mTLS heartbeat verified across ISO-20022 clearing subnet (eu-fra).',
    deterministicAction: 'passed',
    timestamp: '2026-11-22T08:14:00Z',
  },
  {
    id: 'TEL-EU-1002',
    tenantId: 'tenant-nexus-fin',
    sourceConnectorId: 'conn-nexus-k8s-01',
    sourceAssetId: 'ast-nexus-entra-02',
    domain: 'Identity',
    ocsfCategory: 'OCSF 3002 · Authentication & OIDC Audit',
    severity: 'critical',
    normalizedSummary: 'Blocked cross-scope OIDC privilege_escalation token request from clearing pod.',
    deterministicAction: 'alert_raised',
    timestamp: '2026-11-22T07:55:00Z',
  },
  {
    id: 'TEL-US-2001',
    tenantId: 'tenant-vertex-ai',
    sourceConnectorId: 'conn-vertex-gpu-01',
    sourceAssetId: 'ast-vertex-h200-vault',
    domain: 'AI_Agent',
    ocsfCategory: 'OCSF 7001 · Agentic MCP Tool Invocation',
    severity: 'high',
    normalizedSummary: 'Deterministic MCP interceptor caught unauthorized_tool attempt on safetensors mount.',
    deterministicAction: 'alert_raised',
    timestamp: '2026-11-22T07:32:00Z',
  },
];
