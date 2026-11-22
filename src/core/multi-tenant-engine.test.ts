import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_CUSTOMER_AGENTS,
  INITIAL_CUSTOMER_ASSETS,
  INITIAL_CUSTOMER_CONNECTORS,
  INITIAL_DELEGATED_SOC_GRANTS,
  INITIAL_REGIONAL_CONTROL_PLANES,
  INITIAL_TENANT_EVIDENCE,
  INITIAL_TENANT_INCIDENTS,
  INITIAL_TENANT_ORGANIZATIONS,
  INITIAL_TENANT_RED_FORCE_EXERCISES,
  buildCustomerAuditReport,
  buildSanitizedCrossCustomerIntel,
  classifyTelemetryDeterministically,
  computeTenantUsageAndQuota,
  evaluatePolicyGateway,
  evaluateRedForceScope,
  evaluateTenantAccess,
  generateConnectorPackageArtifacts,
} from './multi-tenant-engine';

test('evaluateTenantAccess enforces strict cross-tenant isolation for customer admins', () => {
  const nexusAdmin = {
    actorId: 'admin-nexus',
    role: 'customer_admin' as const,
    assignedTenantId: 'tenant-nexus-fin',
  };

  // Allowed on own tenant
  const ownResult = evaluateTenantAccess(nexusAdmin, 'tenant-nexus-fin', INITIAL_DELEGATED_SOC_GRANTS);
  assert.equal(ownResult.allowed, true);
  assert.equal(ownResult.statusCode, 200);
  assert.equal(ownResult.accessMode, 'tenant_owner');

  // Blocked on another customer's tenant
  const crossResult = evaluateTenantAccess(nexusAdmin, 'tenant-vertex-ai', INITIAL_DELEGATED_SOC_GRANTS);
  assert.equal(crossResult.allowed, false);
  assert.equal(crossResult.statusCode, 403);
  assert.match(crossResult.reason, /TENANT_ISOLATION_VIOLATION/);
});

test('evaluateTenantAccess blocks SOC analysts and global operators without an active DelegatedSocGrant', () => {
  const socAnalyst = {
    actorId: 'soc-analyst-01',
    role: 'soc_analyst' as const,
  };

  // tenant-nexus-fin has active GRANT-SOC-101
  const granted = evaluateTenantAccess(socAnalyst, 'tenant-nexus-fin', INITIAL_DELEGATED_SOC_GRANTS);
  assert.equal(granted.allowed, true);
  assert.equal(granted.accessMode, 'delegated_soc');

  // tenant-cloudscale-a has NO grant
  const ungranted = evaluateTenantAccess(socAnalyst, 'tenant-cloudscale-a', INITIAL_DELEGATED_SOC_GRANTS);
  assert.equal(ungranted.allowed, false);
  assert.equal(ungranted.statusCode, 403);

  // Expired grant must also be blocked
  const expiredGrant = [
    {
      ...INITIAL_DELEGATED_SOC_GRANTS[0],
      tenantId: 'tenant-cloudscale-a',
      expiresAt: '2020-01-01T00:00:00Z',
    },
  ];
  const expiredCheck = evaluateTenantAccess(socAnalyst, 'tenant-cloudscale-a', expiredGrant, {
    nowIso: '2026-11-22T08:00:00Z',
  });
  assert.equal(expiredCheck.allowed, false);
  assert.equal(expiredCheck.statusCode, 403);
});

test('evaluatePolicyGateway deterministically blocks prohibited tools and kill-switched agents', () => {
  const vertexBlue = INITIAL_CUSTOMER_AGENTS.find((a) => a.id === 'cagent-vertex-blue-01')!;

  // Prohibited tool attempt
  const blocked = evaluatePolicyGateway({
    agent: vertexBlue,
    toolName: 'exfiltrate_model_weights',
    targetResource: 'ast-vertex-h200-vault',
    requestedAction: 'execute',
    nowIso: '2026-11-22T08:00:00Z',
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.decision, 'BLOCKED');
  assert.equal(blocked.policyRule, 'rego.hfcdf.agent.deny_prohibited_tool');

  // Allowed scoped tool
  const allowed = evaluatePolicyGateway({
    agent: vertexBlue,
    toolName: 'verify_safetensors_merkle',
    targetResource: 'ast-vertex-h200-vault',
    requestedAction: 'read',
    nowIso: '2026-11-22T08:00:00Z',
  });
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.decision, 'ALLOWED');

  // Kill switch engaged blocks even allowed tools
  const killedAgent = { ...vertexBlue, killSwitchEngaged: true };
  const killBlocked = evaluatePolicyGateway({
    agent: killedAgent,
    toolName: 'read_telemetry',
    targetResource: 'ast-vertex-h200-vault',
    requestedAction: 'read',
    nowIso: '2026-11-22T08:00:00Z',
  });
  assert.equal(killBlocked.allowed, false);
  assert.equal(killBlocked.decision, 'BLOCKED');
});

test('buildSanitizedCrossCustomerIntel redacts customer identities and secrets', () => {
  const advisory = buildSanitizedCrossCustomerIntel({
    campaignTitle: 'Automated OIDC & MCP Credential Harvesting Probe',
    mitreTechnique: 'T1552.004 · Private Keys & Token Delegation',
    severity: 'critical',
    rawIndicator: 'secret-token-nexus-192.168.10.44',
    observedTenants: INITIAL_TENANT_ORGANIZATIONS.slice(0, 2),
    recommendedControl: 'Enforce Rego tool allowlist and short-lived SPIFFE certificates.',
  });

  assert.equal(advisory.rawLogsShared, false);
  assert.equal(advisory.piiRedacted, true);
  assert.equal(advisory.affectedTenantCount, 2);
  assert.ok(!JSON.stringify(advisory).includes('secret-token-nexus'));
  assert.ok(!JSON.stringify(advisory).includes('Nexus Clearing Bank'));
});

test('computeTenantUsageAndQuota and generateConnectorPackageArtifacts produce valid enterprise outputs', () => {
  const nexus = INITIAL_TENANT_ORGANIZATIONS[0];
  const usage = computeTenantUsageAndQuota(
    nexus,
    INITIAL_CUSTOMER_ASSETS,
    INITIAL_CUSTOMER_AGENTS,
    INITIAL_CUSTOMER_CONNECTORS
  );
  assert.equal(usage.tenantId, 'tenant-nexus-fin');
  assert.equal(usage.slaTargetPct, 99.99);
  assert.equal(usage.noisyNeighborThrottled, false);
  assert.ok((usage.estimatedMonthlyUsd || 0) > 0);

  const connector = INITIAL_CUSTOMER_CONNECTORS[0];
  const region = INITIAL_REGIONAL_CONTROL_PLANES.find((r) => r.id === nexus.regionId)!;
  const pkg = generateConnectorPackageArtifacts(nexus, connector, region);
  assert.match(pkg.bashScript, /HFCDF_TENANT_ID="tenant-nexus-fin"/);
  assert.match(pkg.terraformHcl, /byok_kms_key_id/);
  assert.match(pkg.opaRegoPolicy, /package hfcdf\.agent\.authz/);
});

test('evaluateRedForceScope rejects cross-tenant targets and destructive scenarios', () => {
  const nexusAssets = INITIAL_CUSTOMER_ASSETS.filter((a) => a.tenantId === 'tenant-nexus-fin');

  const unowned = evaluateRedForceScope({
    tenantId: 'tenant-nexus-fin',
    scenarioName: 'MCP Prompt Boundary Check',
    targetAssetId: 'ast-vertex-h200-vault',
    tenantAssets: nexusAssets,
    maxDurationMinutes: 15,
    egressRestricted: true,
    approvedBy: 'ciso@nexusclearing.example',
  });
  assert.equal(unowned.authorized, false);
  assert.equal(unowned.status, 'blocked_invalid_scope');

  const destructive = evaluateRedForceScope({
    tenantId: 'tenant-nexus-fin',
    scenarioName: 'public_internet_ransom_probe',
    targetAssetId: nexusAssets[0].id,
    tenantAssets: nexusAssets,
    maxDurationMinutes: 15,
    egressRestricted: true,
    approvedBy: 'ciso@nexusclearing.example',
  });
  assert.equal(destructive.authorized, false);

  const valid = evaluateRedForceScope({
    tenantId: 'tenant-nexus-fin',
    scenarioName: 'Authorized OIDC Delegation Guardrail Check',
    targetAssetId: nexusAssets[0].id,
    tenantAssets: nexusAssets,
    maxDurationMinutes: 20,
    egressRestricted: true,
    approvedBy: 'ciso@nexusclearing.example',
  });
  assert.equal(valid.authorized, true);
  assert.equal(valid.status, 'completed');
});

test('classifyTelemetryDeterministically and buildCustomerAuditReport preserve OCSF schemas and SHA-256 seals', () => {
  const classified = classifyTelemetryDeterministically({
    tenantId: 'tenant-nexus-fin',
    connectorId: 'conn-nexus-k8s-01',
    assetId: 'ast-nexus-entra-02',
    domain: 'Identity',
    signalMessage: 'Blocked privilege_escalation via forged OIDC token',
  });
  assert.equal(classified.severity, 'critical');
  assert.equal(classified.deterministicAction, 'alert_raised');
  assert.match(classified.ocsfCategory, /OCSF 3002/);

  const nexus = INITIAL_TENANT_ORGANIZATIONS[0];
  const region = INITIAL_REGIONAL_CONTROL_PLANES.find((r) => r.id === nexus.regionId)!;
  const usage = computeTenantUsageAndQuota(
    nexus,
    INITIAL_CUSTOMER_ASSETS,
    INITIAL_CUSTOMER_AGENTS,
    INITIAL_CUSTOMER_CONNECTORS
  );
  const report = buildCustomerAuditReport({
    tenant: nexus,
    region,
    assets: INITIAL_CUSTOMER_ASSETS.filter((a) => a.tenantId === nexus.id),
    agents: INITIAL_CUSTOMER_AGENTS.filter((a) => a.tenantId === nexus.id),
    incidents: INITIAL_TENANT_INCIDENTS.filter((i) => i.tenantId === nexus.id),
    evidence: INITIAL_TENANT_EVIDENCE.filter((e) => e.tenantId === nexus.id),
    redExercises: INITIAL_TENANT_RED_FORCE_EXERCISES.filter((r) => r.tenantId === nexus.id),
    usage,
  });
  assert.match(report.reportSha256Seal, /^sha256:/);
  assert.equal(report.tenant.id, 'tenant-nexus-fin');
});
