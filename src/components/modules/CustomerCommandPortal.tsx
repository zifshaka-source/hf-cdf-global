import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Cpu,
  Download,
  FileCheck2,
  Globe,
  KeyRound,
  Lock,
  Plug,
  Power,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Swords,
  XCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  AutonomyMode,
  CloudEnvironmentType,
  CommercialPlanTier,
  ComplianceControlFramework,
  ConnectorInstallPackage,
  CrossCustomerIntelAdvisory,
  CustomerAsset,
  CustomerConnector,
  CustomerDefenseAgent,
  DelegatedSocGrant,
  RegionalControlPlane,
  SecurityDomainType,
  TenantEvidenceRecord,
  TenantIncidentRecord,
  TenantLocalizationConfig,
  TenantOrganization,
  TenantRedForceExercise,
  TenantTelemetryEvent,
  TenantUsageSummary,
} from '../../core/multi-tenant-types';

interface CustomerCommandPortalProps {
  tenantId: string;
  availableTenants: Array<{ id: string; name: string }>;
  onChangeTenantId: (tenantId: string) => void;
  onNotify?: (msg: string, type: 'info' | 'success' | 'alert') => void;
}

interface TenantWorkspaceResponse {
  tenant: TenantOrganization;
  region: RegionalControlPlane;
  connectors: CustomerConnector[];
  installPackages: ConnectorInstallPackage[];
  assets: CustomerAsset[];
  agents: CustomerDefenseAgent[];
  incidents: TenantIncidentRecord[];
  evidence: TenantEvidenceRecord[];
  delegatedGrants: DelegatedSocGrant[];
  redExercises: TenantRedForceExercise[];
  telemetryEvents: TenantTelemetryEvent[];
  tenantIntel: Array<CrossCustomerIntelAdvisory & { tenantRelevanceScore: number }>;
  complianceFrameworks: ComplianceControlFramework[];
  redForceUnits: string[];
  blueForceUnits: string[];
  usage: TenantUsageSummary;
  accessGrant: {
    accessMode: string;
    reason: string;
    grantId?: string;
  };
}

type PortalTab =
  | 'overview'
  | 'connectors'
  | 'agents'
  | 'red-force'
  | 'blue-force'
  | 'incidents'
  | 'intel-policies'
  | 'grants'
  | 'compliance-billing';

export const CustomerCommandPortal: React.FC<CustomerCommandPortalProps> = ({
  tenantId,
  availableTenants,
  onChangeTenantId,
  onNotify,
}) => {
  const [workspace, setWorkspace] = useState<TenantWorkspaceResponse | null>(null);
  const [isolationError, setIsolationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PortalTab>('overview');
  const [selectedArtifactFormat, setSelectedArtifactFormat] = useState<
    'bash' | 'powershell' | 'terraform' | 'helm' | 'rego'
  >('helm');

  // Enrollment form
  const [connName, setConnName] = useState('Production K8s Collector');
  const [connEnv, setConnEnv] = useState<CloudEnvironmentType>('aws-k8s');
  const [connFormat, setConnFormat] = useState<'helm' | 'terraform' | 'docker' | 'systemd' | 'powershell'>('helm');

  // Asset form
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState<CustomerAsset['assetType']>('k8s_cluster');
  const [assetProvider, setAssetProvider] = useState<CustomerAsset['provider']>('AWS');

  // Agent Registration + Policy Gateway
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentForce, setNewAgentForce] = useState<'BLUE_FORCE' | 'RED_FORCE'>('BLUE_FORCE');
  const [policyTool, setPolicyTool] = useState('exfiltrate_model_weights');
  const [policyResult, setPolicyResult] = useState<any>(null);

  // Red Force exercise form
  const [rfScenario, setRfScenario] = useState('Authorized MCP Tool Boundary Validation');
  const [rfUnit, setRfUnit] = useState('Agent Security Assessment Agent');
  const [rfAssetId, setRfAssetId] = useState('');
  const [rfDuration, setRfDuration] = useState(15);

  // Blue Force / Telemetry Ingestion form
  const [telDomain, setTelDomain] = useState<SecurityDomainType>('AI_Agent');
  const [telSignal, setTelSignal] = useState('Blocked unauthorized_tool execution probe on model checkpoint');

  // Policy & Localization state
  const [auditReportPreview, setAuditReportPreview] = useState<any>(null);

  const loadWorkspace = async (targetId: string) => {
    try {
      setIsolationError(null);
      const data = await api.getTenantWorkspace(targetId);
      setWorkspace(data);
      if (data.assets?.length > 0 && !rfAssetId) {
        setRfAssetId(data.assets[0].id);
      }
    } catch (err: any) {
      setWorkspace(null);
      setIsolationError(err?.message || 'TENANT_ISOLATION_VIOLATION');
    }
  };

  useEffect(() => {
    setRfAssetId('');
    setAuditReportPreview(null);
    loadWorkspace(tenantId);
  }, [tenantId]);

  const handleEnrollConnector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connName.trim()) return;
    try {
      await api.enrollTenantConnector(tenantId, {
        name: connName.trim(),
        environmentType: connEnv,
        packageFormat: connFormat,
      });
      onNotify?.(`Customer-resident connector enrolled with SPIFFE identity in ${tenantId}.`, 'success');
      await loadWorkspace(tenantId);
    } catch (err: any) {
      onNotify?.(err?.message || 'Enrollment failed', 'alert');
    }
  };

  const handleRevokeConnector = async (connectorId: string) => {
    try {
      await api.revokeTenantConnector(tenantId, connectorId);
      onNotify?.(`Revoked connector ${connectorId} credentials.`, 'info');
      await loadWorkspace(tenantId);
    } catch (err: any) {
      onNotify?.(err?.message || 'Revoke failed', 'alert');
    }
  };

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim()) return;
    try {
      await api.registerTenantAsset(tenantId, {
        name: assetName.trim(),
        assetType,
        provider: assetProvider,
        criticality: 'tier-0',
      });
      setAssetName('');
      onNotify?.(`Registered asset inside ${tenantId} boundary.`, 'success');
      await loadWorkspace(tenantId);
    } catch (err: any) {
      onNotify?.(err?.message || 'Asset registration failed', 'alert');
    }
  };

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;
    try {
      await api.registerTenantAgent(tenantId, {
        name: newAgentName.trim(),
        force: newAgentForce,
        unitType: newAgentForce === 'RED_FORCE' ? 'Defensive Validation Analyst' : 'Cloud & Model Guardian',
        allowedTools: ['read_telemetry', 'inspect_cloud_config', 'quarantine_pod_staged'],
        allowedResources: ['ast-*'],
      });
      setNewAgentName('');
      onNotify?.(`Registered ${newAgentForce} agent inside ${tenantId}.`, 'success');
      await loadWorkspace(tenantId);
    } catch (err: any) {
      onNotify?.(err?.message || 'Agent registration failed', 'alert');
    }
  };

  const handleTestPolicyGateway = async (agentId: string) => {
    try {
      const targetAsset = workspace?.assets[0]?.id || 'ast-default-01';
      const res = await api.evaluateTenantPolicyCheck(tenantId, {
        agentId,
        toolName: policyTool,
        targetResource: targetAsset,
        requestedAction: 'execute',
      });
      setPolicyResult(res);
      onNotify?.(
        `Policy Gateway: ${res.evaluation.decision} (${res.evaluation.policyRule})`,
        res.evaluation.allowed ? 'success' : 'alert'
      );
      await loadWorkspace(tenantId);
    } catch (err: any) {
      onNotify?.(err?.message || 'Policy check failed', 'alert');
    }
  };

  const handleToggleKillSwitch = async (agentId: string) => {
    try {
      await api.toggleTenantAgentKillSwitch(tenantId, agentId);
      onNotify?.(`Toggled emergency kill switch for ${agentId}.`, 'info');
      await loadWorkspace(tenantId);
    } catch (err: any) {
      onNotify?.(err?.message || 'Kill switch failed', 'alert');
    }
  };

  const handleLaunchRedForce = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = rfAssetId || workspace?.assets[0]?.id;
    if (!target || !rfScenario.trim()) return;
    try {
      const res = await api.runTenantRedForce(tenantId, {
        scenarioName: rfScenario.trim(),
        unitType: rfUnit,
        targetAssetId: target,
        maxDurationMinutes: rfDuration,
        egressRestricted: true,
      });
      onNotify?.(
        res.authorized
          ? `Red Force exercise ${res.exercise.id} verified control posture.`
          : `Red Force Guardrail BLOCKED scenario: ${res.exercise.findingSummary}`,
        res.authorized ? 'success' : 'alert'
      );
      await loadWorkspace(tenantId);
    } catch (err: any) {
      onNotify?.(err?.message || 'Red Force execution failed', 'alert');
    }
  };

  const handleEmergencyStopRedForce = async (exerciseId: string) => {
    try {
      await api.emergencyStopTenantRedForce(tenantId, exerciseId);
      onNotify?.(`Emergency stop engaged for Red Force exercise ${exerciseId}.`, 'alert');
      await loadWorkspace(tenantId);
    } catch (err: any) {
      onNotify?.(err?.message || 'Emergency stop failed', 'alert');
    }
  };

  const handleIngestTelemetry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telSignal.trim()) return;
    try {
      const res = await api.ingestTenantTelemetry(tenantId, {
        connectorId: workspace?.connectors[0]?.id || 'conn-resident-01',
        assetId: workspace?.assets[0]?.id || 'ast-default-01',
        domain: telDomain,
        signalMessage: telSignal.trim(),
      });
      onNotify?.(
        res.incident
          ? `OCSF event raised Blue Force incident ${res.incident.id}`
          : `Normalized ${res.event.ocsfCategory} (${res.event.deterministicAction})`,
        res.incident ? 'alert' : 'success'
      );
      await loadWorkspace(tenantId);
    } catch (err: any) {
      onNotify?.(err?.message || 'Telemetry ingestion failed', 'alert');
    }
  };

  const handleRotateByok = async () => {
    try {
      const res = await api.rotateTenantByok(tenantId);
      onNotify?.(`Rotated BYOK CMK key to ${res.tenant.byokKeyId}`, 'success');
      await loadWorkspace(tenantId);
    } catch (err: any) {
      onNotify?.(err?.message || 'BYOK rotation failed', 'alert');
    }
  };

  const handleUpdatePolicy = async (payload: {
    autonomyMode?: AutonomyMode;
    intelSharingOptIn?: boolean;
    dataClassification?: TenantOrganization['dataClassification'];
    retentionDays?: number;
    planTier?: CommercialPlanTier;
    localization?: TenantLocalizationConfig;
  }) => {
    try {
      await api.updateTenantPolicy(tenantId, payload);
      onNotify?.(`Updated tenant governance & policy configuration.`, 'success');
      await loadWorkspace(tenantId);
    } catch (err: any) {
      onNotify?.(err?.message || 'Policy update failed', 'alert');
    }
  };

  const handleDownloadAuditReport = async () => {
    try {
      const report = await api.getTenantAuditReport(tenantId);
      setAuditReportPreview(report);
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hfcdf-audit-${tenantId}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onNotify?.(`Generated & exported SHA-256 sealed customer audit report.`, 'success');
    } catch (err: any) {
      onNotify?.(err?.message || 'Audit export failed', 'alert');
    }
  };

  const handleApproveIncident = async (incidentId: string, decision: 'approved' | 'rejected') => {
    try {
      await api.approveTenantIncident(tenantId, incidentId, decision);
      onNotify?.(`Incident ${incidentId} containment ${decision}.`, decision === 'approved' ? 'success' : 'info');
      await loadWorkspace(tenantId);
    } catch (err: any) {
      onNotify?.(err?.message || 'Approval update failed', 'alert');
    }
  };

  const handleGrantSocAccess = async () => {
    try {
      await api.manageDelegatedGrant(tenantId, 'grant', {
        scope: 'investigate_incidents',
        reason: 'Customer-approved time-bound SOC investigation',
        durationHours: 24,
      });
      onNotify?.(`Issued temporary 24h Delegated SOC Grant for ${tenantId}.`, 'success');
      await loadWorkspace(tenantId);
    } catch (err: any) {
      onNotify?.(err?.message || 'Failed to issue grant', 'alert');
    }
  };

  const handleRevokeSocGrant = async (grantId: string) => {
    try {
      await api.manageDelegatedGrant(tenantId, 'revoke', { grantId });
      onNotify?.(`Revoked Delegated SOC Grant ${grantId}.`, 'info');
      await loadWorkspace(tenantId);
    } catch (err: any) {
      onNotify?.(err?.message || 'Failed to revoke grant', 'alert');
    }
  };

  const handleSwitchAsCustomerCiso = async (boundTenantId: string) => {
    try {
      await api.switchAuthContext('customer_admin', boundTenantId);
      onNotify?.(
        `Session switched to Customer CISO strictly bound to ${boundTenantId}. Selecting any other tenant will now be blocked (HTTP 403).`,
        'info'
      );
      await loadWorkspace(tenantId);
    } catch (err: any) {
      onNotify?.(err?.message || 'Switch failed', 'alert');
    }
  };

  return (
    <div className="space-y-6 font-sans" data-testid="customer-command-portal">
      {/* Header + Tenant Boundary Switcher */}
      <div className="apple-card p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-[#30d158]/15 border border-[#30d158]/30 text-[#30d158] font-semibold">
                INTERFACE 2 · CUSTOMER COMMAND PORTAL
              </span>
              <span className="text-white/20">/</span>
              <span className="text-[#64d2ff]">ISOLATED TENANT BOUNDARY</span>
            </div>
            <h1 className="text-2xl font-bold text-[#f5f5f7] tracking-tight">
              {workspace ? workspace.tenant.name : `Tenant Environment: ${tenantId}`}
            </h1>
            {workspace && (
              <p className="text-xs text-[#a1a1a6] font-mono">
                RLS: {workspace.tenant.rlsPolicyName} · BYOK: {workspace.tenant.byokKeyId} · Region:{' '}
                {workspace.region.cityHub} ({workspace.tenant.isolationTier.toUpperCase()}) · Class:{' '}
                {workspace.tenant.dataClassification}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="tenant-selector" className="text-[11px] font-mono text-[#86868b]">
              Target Tenant:
            </label>
            <select
              id="tenant-selector"
              value={tenantId}
              onChange={(e) => onChangeTenantId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#0a0a0c] border border-white/[0.15] text-xs text-[#f5f5f7]"
            >
              {availableTenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.id})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleSwitchAsCustomerCiso(tenantId)}
              className="px-3 py-2 rounded-xl bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-white/[0.12] text-xs font-medium text-[#64d2ff] flex items-center gap-1.5"
              title="Lock session strictly to this Customer CISO role to test cross-tenant blocking"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Scope Session as Customer CISO</span>
            </button>
          </div>
        </div>

        {/* 22-Module Grouped Tab Bar */}
        {workspace && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.08]">
            {(
              [
                { id: 'overview', label: 'Overview & Assets' },
                { id: 'connectors', label: `Resident Connectors (${workspace.connectors.length})` },
                { id: 'agents', label: `Blue/Red Agents & Policy Gate (${workspace.agents.length})` },
                { id: 'red-force', label: `Red Force Validation (${workspace.redExercises.length})` },
                { id: 'blue-force', label: `Blue Force & OCSF Telemetry (${workspace.telemetryEvents.length})` },
                { id: 'incidents', label: `Incidents & Approvals (${workspace.incidents.length})` },
                { id: 'intel-policies', label: 'Threat Intel · Policies & BYOK' },
                { id: 'grants', label: 'Delegated SOC Grants & Evidence' },
                { id: 'compliance-billing', label: 'Compliance · Billing & Audit Reports' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  activeTab === t.id
                    ? 'bg-[#0a84ff]/20 text-[#f5f5f7] border-[#0a84ff]/50'
                    : 'bg-[#141416] text-[#a1a1a6] border-white/[0.07] hover:text-[#f5f5f7]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TENANT ISOLATION VIOLATION BANNER */}
      {isolationError && (
        <div
          className="apple-card p-6 border-[#ff453a]/50 bg-[#ff453a]/10 space-y-3"
          data-testid="tenant-isolation-blocked-banner"
        >
          <div className="flex items-center gap-2 text-[#ff6961] font-mono text-sm font-bold">
            <XCircle className="w-5 h-5" />
            <span>HTTP 403 · STRICT TENANT ISOLATION ENFORCED</span>
          </div>
          <p className="text-xs text-[#f5f5f7] font-mono">{isolationError}</p>
          <p className="text-xs text-[#d1d1d6]">
            The server rejected this request because your current session lacks ownership or an active customer-signed Delegated SOC Grant for <strong>{tenantId}</strong>.
          </p>
          <button
            type="button"
            onClick={async () => {
              await api.switchAuthContext('global_operator');
              await loadWorkspace(tenantId);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#0071e3] text-white text-xs font-semibold"
          >
            Restore Global Operator Session
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW, SECURITY DOMAINS & ASSET INVENTORY */}
      {workspace && activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { domain: 'Cloud Security', status: `${workspace.assets.filter((a) => a.provider === 'AWS' || a.provider === 'Azure' || a.provider === 'GCP' || a.provider === 'Kubernetes').length} Assets`, badge: 'POSTURE VERIFIED' },
              { domain: 'Network & Resilience', status: `${workspace.connectors.filter((c) => c.outboundOnly).length} mTLS Tunnels`, badge: 'OUTBOUND ONLY' },
              { domain: 'Endpoint Security', status: `${workspace.assets.filter((a) => a.assetType === 'endpoint_fleet').length} Fleets`, badge: 'SPIFFE SVID' },
              { domain: 'Identity Security', status: `${workspace.assets.filter((a) => a.assetType === 'identity_provider').length} IdP Bridges`, badge: 'OIDC / MFA' },
              { domain: 'App & Supply Chain', status: 'SBOM + Rego Gate', badge: 'ATTESTED' },
              { domain: 'AI & Data Protection', status: `BYOK ${workspace.tenant.byokKeyId.slice(-6)}`, badge: workspace.tenant.dataClassification },
            ].map((d) => (
              <div key={d.domain} className="apple-card p-3.5 space-y-1">
                <div className="text-[10px] font-mono text-[#64d2ff] uppercase">{d.domain}</div>
                <div className="text-sm font-bold text-[#f5f5f7]">{d.status}</div>
                <div className="text-[10px] font-mono text-[#30d158]">{d.badge}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 apple-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                <h2 className="text-sm font-bold text-[#f5f5f7]">Digital Asset Inventory ({workspace.assets.length})</h2>
                <span className="text-[11px] font-mono text-[#30d158]">
                  Access: {workspace.accessGrant.accessMode.toUpperCase()}
                </span>
              </div>
              <div className="space-y-2">
                {workspace.assets.map((ast) => (
                  <div key={ast.id} className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.08] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#f5f5f7]">{ast.name}</div>
                      <div className="text-[11px] font-mono text-[#86868b]">
                        {ast.id} · {ast.provider} · {ast.assetType} · {ast.criticality.toUpperCase()}
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      ast.postureStatus === 'protected'
                        ? 'bg-[#30d158]/15 text-[#30d158]'
                        : 'bg-[#ff9f0a]/15 text-[#ff9f0a]'
                    }`}>
                      {ast.postureStatus.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleRegisterAsset} className="lg:col-span-4 apple-card p-5 space-y-3">
              <h2 className="text-sm font-bold text-[#f5f5f7]">Register Customer Asset</h2>
              <input
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="e.g. prod-eks-clearing-node"
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
              />
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as CustomerAsset['assetType'])}
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
              >
                <option value="k8s_cluster">Kubernetes Cluster</option>
                <option value="cloud_account">Cloud Account / VPC</option>
                <option value="identity_provider">Identity Provider (Entra/Okta)</option>
                <option value="ai_model_endpoint">AI Model / MCP Endpoint</option>
                <option value="database">Database / Vault</option>
                <option value="endpoint_fleet">Endpoint / Server Fleet</option>
              </select>
              <select
                value={assetProvider}
                onChange={(e) => setAssetProvider(e.target.value as CustomerAsset['provider'])}
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
              >
                <option value="AWS">AWS</option>
                <option value="Azure">Azure</option>
                <option value="GCP">GCP</option>
                <option value="Kubernetes">Kubernetes</option>
                <option value="On-Premises">On-Premises</option>
                <option value="OpenAI/Custom">AI Cluster / Custom</option>
              </select>
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold"
              >
                Add Asset to Tenant Boundary
              </button>

              <div className="pt-3 border-t border-white/[0.08] text-[11px] font-mono text-[#86868b] space-y-1">
                <div>Plan: <strong className="text-[#f5f5f7] uppercase">{workspace.usage.planTier}</strong></div>
                <div>EPS Usage: <strong className="text-[#64d2ff]">{workspace.usage.currentEventsPerSec} / {workspace.usage.epsQuota}</strong></div>
                <div>SLA Measured: <strong className="text-[#30d158]">{workspace.usage.slaMeasuredPct}%</strong></div>
                <div>Residency: <strong className="text-[#f5f5f7]">{workspace.region.dataResidencyStandard}</strong></div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: RESIDENT CONNECTORS */}
      {workspace && activeTab === 'connectors' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="apple-card p-5 space-y-3">
              <h2 className="text-sm font-bold text-[#f5f5f7] flex items-center gap-2">
                <Plug className="w-4 h-4 text-[#30d158]" />
                <span>Enrolled Customer-Resident Connectors (Outbound-First mTLS &amp; Offline Buffering)</span>
              </h2>
              {workspace.connectors.map((c) => (
                <div key={c.id} className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.08] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#f5f5f7]">{c.name}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      c.enrollmentStatus === 'enrolled'
                        ? 'bg-[#30d158]/15 text-[#30d158]'
                        : 'bg-[#ff453a]/15 text-[#ff6961]'
                    }`}>
                      {c.enrollmentStatus.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#64d2ff] break-all">{c.workloadIdentitySpiffe}</div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#86868b]">
                    <span>Scopes: {c.permissionsGranted.join(', ')} · Buffer: {c.offlineBufferEvents} queued</span>
                    {c.enrollmentStatus === 'enrolled' && (
                      <button
                        type="button"
                        onClick={() => handleRevokeConnector(c.id)}
                        className="px-2 py-1 rounded bg-[#ff453a]/15 text-[#ff6961] hover:bg-[#ff453a]/25"
                      >
                        Revoke Credential
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {workspace.installPackages[0] && (
              <div className="apple-card p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-[#f5f5f7] font-mono">
                    DEPLOYMENT PACKAGE ARTIFACTS ({workspace.installPackages[0].connectorId})
                  </h3>
                  <div className="flex gap-1 text-[10px] font-mono">
                    {(['helm', 'terraform', 'bash', 'powershell', 'rego'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setSelectedArtifactFormat(fmt)}
                        className={`px-2 py-1 rounded uppercase ${
                          selectedArtifactFormat === fmt
                            ? 'bg-[#0a84ff] text-white font-bold'
                            : 'bg-[#1c1c1e] text-[#a1a1a6]'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
                <pre className="p-3 rounded-xl bg-[#050507] border border-white/[0.08] text-[11px] font-mono text-[#64d2ff] overflow-x-auto max-h-64">
                  {selectedArtifactFormat === 'helm'
                    ? workspace.installPackages[0].kubernetesHelmYaml
                    : selectedArtifactFormat === 'terraform'
                    ? workspace.installPackages[0].terraformHcl
                    : selectedArtifactFormat === 'bash'
                    ? workspace.installPackages[0].bashScript
                    : selectedArtifactFormat === 'powershell'
                    ? workspace.installPackages[0].powershellScript
                    : workspace.installPackages[0].opaRegoPolicy}
                </pre>
              </div>
            )}
          </div>

          <form onSubmit={handleEnrollConnector} className="lg:col-span-5 apple-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#f5f5f7]">Enroll New Customer-Resident Connector</h2>
            <p className="text-[11px] text-[#86868b]">
              Creates a unique SPIFFE workload identity inside {workspace.tenant.regionId} with zero inbound ports required.
            </p>
            <input
              value={connName}
              onChange={(e) => setConnName(e.target.value)}
              placeholder="Connector Name"
              className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
            />
            <select
              value={connEnv}
              onChange={(e) => setConnEnv(e.target.value as CloudEnvironmentType)}
              className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
            >
              <option value="aws-k8s">AWS + Kubernetes</option>
              <option value="azure-m365">Azure + M365</option>
              <option value="gcp-gke">GCP + GKE</option>
              <option value="on-prem">On-Premises Linux/Windows</option>
              <option value="ai-cluster">AI Inference Cluster</option>
            </select>
            <select
              value={connFormat}
              onChange={(e) => setConnFormat(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
            >
              <option value="helm">Kubernetes Helm DaemonSet</option>
              <option value="terraform">Terraform HCL Module</option>
              <option value="systemd">Linux Bash / Systemd</option>
              <option value="powershell">Windows PowerShell Agent</option>
            </select>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#30d158] hover:bg-[#28be4c] text-[#050507] font-bold text-xs"
            >
              Enroll Connector &amp; Generate Package
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: AGENT TRUST PLANE & DETERMINISTIC POLICY GATEWAY */}
      {workspace && activeTab === 'agents' && (
        <div className="space-y-4">
          <div className="apple-card p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#f5f5f7]">
                  Customer-Resident Blue Force &amp; Red Force Agents + Deterministic Policy Gateway
                </h2>
                <p className="text-[11px] text-[#a1a1a6]">
                  Test a real tool call against the OPA/Rego-aligned deterministic gateway. Prohibited operations are blocked &amp; converted to auditable incidents.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={policyTool}
                  onChange={(e) => setPolicyTool(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs font-mono text-[#f5f5f7]"
                >
                  <option value="exfiltrate_model_weights">exfiltrate_model_weights (PROHIBITED)</option>
                  <option value="dump_customer_secrets">dump_customer_secrets (PROHIBITED)</option>
                  <option value="read_telemetry">read_telemetry (ALLOWED)</option>
                  <option value="revoke_iam_sessions">revoke_iam_sessions (HIGH CONSEQUENCE)</option>
                </select>
              </div>
            </div>

            {policyResult && (
              <div
                data-testid="policy-gateway-result"
                className={`p-3 rounded-xl border text-xs font-mono ${
                  policyResult.evaluation.allowed
                    ? 'bg-[#30d158]/10 border-[#30d158]/40 text-[#30d158]'
                    : 'bg-[#ff453a]/10 border-[#ff453a]/40 text-[#ff6961]'
                }`}
              >
                DECISION: <strong>{policyResult.evaluation.decision}</strong> · RULE: {policyResult.evaluation.policyRule} · {policyResult.evaluation.reason}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {workspace.agents.map((ag) => (
                <div key={ag.id} className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        ag.force === 'BLUE_FORCE'
                          ? 'bg-[#0a84ff]/20 text-[#64d2ff]'
                          : 'bg-[#ff453a]/20 text-[#ff6961]'
                      }`}>
                        {ag.force}
                      </span>
                      <span className="text-xs font-bold text-[#f5f5f7]">{ag.name}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold ${
                      ag.killSwitchEngaged ? 'text-[#ff453a]' : 'text-[#30d158]'
                    }`}>
                      {ag.killSwitchEngaged ? 'KILL_SWITCH_LOCKED' : ag.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-[#86868b] break-all">
                    SVID: {ag.spiffeId} · TTL: {ag.maxExecutionSeconds}s · Autonomy: {ag.autonomyMode}
                  </div>
                  <div className="text-[11px] text-[#a1a1a6]">
                    Allowed Tools: <span className="font-mono text-[#f5f5f7]">{ag.allowedTools.join(', ')}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleTestPolicyGateway(ag.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white text-[11px] font-semibold"
                    >
                      Run Policy Gate Check ({policyTool})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleKillSwitch(ag.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#ff453a]/15 hover:bg-[#ff453a]/25 text-[#ff6961] text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Power className="w-3 h-3" />
                      <span>{ag.killSwitchEngaged ? 'Release Kill Switch' : 'Kill Switch'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleRegisterAgent} className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row gap-2.5">
              <input
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="Register new scoped agent name..."
                className="flex-1 px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
              />
              <select
                value={newAgentForce}
                onChange={(e) => setNewAgentForce(e.target.value as 'BLUE_FORCE' | 'RED_FORCE')}
                className="px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
              >
                <option value="BLUE_FORCE">BLUE FORCE Guardian</option>
                <option value="RED_FORCE">RED FORCE Validator</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#30d158] text-[#050507] text-xs font-bold"
              >
                Enroll Scoped Agent
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: RED FORCE AUTHORIZED ADVERSARIAL VALIDATION */}
      {workspace && activeTab === 'red-force' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 apple-card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <h2 className="text-sm font-bold text-[#ff6961] flex items-center gap-2">
                <Swords className="w-4 h-4" />
                <span>Authorized Tenant Red Force Validation Exercises</span>
              </h2>
              <span className="text-[10px] font-mono text-[#30d158]">NON-DESTRUCTIVE · ZERO PUBLIC TARGETING</span>
            </div>
            {workspace.redExercises.length === 0 ? (
              <div className="text-xs text-[#86868b] py-4">No Red Force validation exercises recorded for this tenant yet.</div>
            ) : (
              <div className="space-y-2.5">
                {workspace.redExercises.map((ex) => (
                  <div key={ex.id} className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.08] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#f5f5f7]">{ex.scenarioName}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        ex.status === 'completed'
                          ? 'bg-[#30d158]/15 text-[#30d158]'
                          : 'bg-[#ff453a]/15 text-[#ff6961]'
                      }`}>
                        {ex.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-[#64d2ff]">
                      {ex.unitType} · Asset: {ex.targetAssetId} · Scope: {ex.signedScopeHash}
                    </div>
                    <p className="text-xs text-[#a1a1a6]">{ex.findingSummary}</p>
                    {ex.status === 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleEmergencyStopRedForce(ex.id)}
                        className="px-2.5 py-1 rounded bg-[#ff453a]/15 text-[#ff6961] text-[10px] font-mono"
                      >
                        Trigger Post-Exercise Emergency Lock
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleLaunchRedForce} className="lg:col-span-5 apple-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#f5f5f7]">Launch Signed-Scope Red Force Validation</h2>
            <p className="text-[11px] text-[#86868b]">
              Requires approved tenant asset, strict egress restriction, and non-destructive test scope. Public or ransomware probes are rejected automatically.
            </p>
            <div className="space-y-1">
              <label htmlFor="rf-scenario-name" className="block text-[11px] font-mono text-[#a1a1a6]">
                Scenario Name
              </label>
              <input
                id="rf-scenario-name"
                value={rfScenario}
                onChange={(e) => setRfScenario(e.target.value)}
                placeholder="Scenario name (e.g. OIDC Scope Boundary Check)"
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="rf-unit-select" className="block text-[11px] font-mono text-[#a1a1a6]">
                Red Force Assessment Unit
              </label>
              <select
                id="rf-unit-select"
                value={rfUnit}
                onChange={(e) => setRfUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
              >
                {workspace.redForceUnits.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="rf-asset-select" className="block text-[11px] font-mono text-[#a1a1a6]">
                Verified Tenant Target Asset
              </label>
              <select
                id="rf-asset-select"
                value={rfAssetId || workspace.assets[0]?.id || ''}
                onChange={(e) => setRfAssetId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
              >
                {workspace.assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="rf-duration-minutes" className="block text-[11px] font-mono text-[#a1a1a6]">
                Max Exercise Window (Minutes, cap 120)
              </label>
              <input
                id="rf-duration-minutes"
                type="number"
                min={5}
                max={120}
                value={rfDuration}
                onChange={(e) => setRfDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#ff453a] hover:bg-[#e63b30] text-white font-bold text-xs"
            >
              Execute Isolated Red Force Validation
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: BLUE FORCE CONTINUOUS DEFENSE & OCSF TELEMETRY FABRIC */}
      {workspace && activeTab === 'blue-force' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 apple-card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <h2 className="text-sm font-bold text-[#64d2ff] flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Normalized OCSF Telemetry Stream (Deterministic Processing)</span>
              </h2>
              <span className="text-[10px] font-mono text-[#30d158]">NO RAW LLM ROUTING</span>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {workspace.telemetryEvents.length === 0 ? (
                <div className="text-xs text-[#86868b]">No telemetry events ingested for this tenant yet.</div>
              ) : (
                workspace.telemetryEvents.map((ev) => (
                  <div key={ev.id} className="p-3 rounded-xl bg-[#111113] border border-white/[0.08] space-y-1 text-xs">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-[#64d2ff]">{ev.ocsfCategory}</span>
                      <span className={ev.deterministicAction === 'alert_raised' ? 'text-[#ff6961] font-bold' : 'text-[#30d158]'}>
                        {ev.deterministicAction.toUpperCase()} ({ev.severity.toUpperCase()})
                      </span>
                    </div>
                    <div className="text-[#d1d1d6]">{ev.normalizedSummary}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <form onSubmit={handleIngestTelemetry} className="apple-card p-5 space-y-3">
              <h2 className="text-sm font-bold text-[#f5f5f7]">Ingest &amp; Normalize OCSF Telemetry</h2>
              <div className="space-y-1">
                <label htmlFor="tel-domain-select" className="block text-[11px] font-mono text-[#a1a1a6]">
                  Security Domain
                </label>
                <select
                  id="tel-domain-select"
                  value={telDomain}
                  onChange={(e) => setTelDomain(e.target.value as SecurityDomainType)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
                >
                  <option value="Cloud">Cloud</option>
                  <option value="Network">Network</option>
                  <option value="Endpoint">Endpoint</option>
                  <option value="Identity">Identity</option>
                  <option value="Application">Application</option>
                  <option value="AI_Agent">AI_Agent</option>
                  <option value="Data">Data</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="tel-signal-input" className="block text-[11px] font-mono text-[#a1a1a6]">
                  Raw Telemetry Signal Payload
                </label>
                <input
                  id="tel-signal-input"
                  value={telSignal}
                  onChange={(e) => setTelSignal(e.target.value)}
                  placeholder="Telemetry payload signal..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#0071e3] text-white text-xs font-bold"
              >
                Normalize via Deterministic Pipeline
              </button>
            </form>

            <div className="apple-card p-4 space-y-2">
              <div className="text-xs font-bold text-[#64d2ff]">Blue Force Guardian Units ({workspace.blueForceUnits.length})</div>
              <div className="flex flex-wrap gap-1.5">
                {workspace.blueForceUnits.map((u) => (
                  <span key={u} className="px-2 py-0.5 rounded bg-[#0a84ff]/10 border border-[#0a84ff]/25 text-[10px] font-mono text-[#d1d1d6]">
                    {u}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: INCIDENT COMMAND & HUMAN-IN-THE-LOOP */}
      {workspace && activeTab === 'incidents' && (
        <div className="apple-card p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#f5f5f7]">
            Tenant Incident Command &amp; Human-in-the-Loop Containment Approvals
          </h2>
          {workspace.incidents.length === 0 ? (
            <div className="text-xs text-[#86868b] py-4">No active incidents inside {workspace.tenant.name}.</div>
          ) : (
            <div className="space-y-3">
              {workspace.incidents.map((inc) => (
                <div key={inc.id} className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff453a]/15 text-[#ff6961] uppercase font-bold">
                        {inc.severity}
                      </span>
                      <span className="text-xs font-bold text-[#f5f5f7]">{inc.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#64d2ff] uppercase">
                      {inc.state} · APPROVAL: {inc.approvalStatus}
                    </span>
                  </div>
                  <p className="text-xs text-[#a1a1a6]">{inc.summary}</p>
                  <div className="text-[11px] font-mono text-[#d1d1d6]">
                    Proposed Response: {inc.proposedResponse}
                  </div>
                  {inc.approvalStatus === 'pending_human' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApproveIncident(inc.id, 'approved')}
                        className="px-3 py-1.5 rounded-lg bg-[#30d158] text-[#050507] text-xs font-bold"
                      >
                        Approve &amp; Verify Containment
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveIncident(inc.id, 'rejected')}
                        className="px-3 py-1.5 rounded-lg bg-[#ff453a]/20 text-[#ff6961] text-xs font-semibold"
                      >
                        Reject Proposal
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: THREAT INTEL, POLICIES, BYOK & LOCALIZATION */}
      {workspace && activeTab === 'intel-policies' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-6 apple-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#f5f5f7] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#0a84ff]" />
              <span>Tenant Policies, BYOK Encryption &amp; Localization</span>
            </h2>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#111113] border border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-[#86868b]">BYOK / CUSTOMER-MANAGED KEY</div>
                  <div className="font-mono font-bold text-[#64d2ff]">{workspace.tenant.byokKeyId}</div>
                </div>
                <button
                  type="button"
                  onClick={handleRotateByok}
                  className="px-3 py-1.5 rounded-lg bg-[#0071e3] text-white text-[11px] font-semibold"
                >
                  Rotate CMK Key
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[#86868b]">AUTONOMY POSTURE</label>
                  <select
                    value={workspace.tenant.autonomyMode}
                    onChange={(e) => handleUpdatePolicy({ autonomyMode: e.target.value as AutonomyMode })}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
                  >
                    <option value="human-approval">Human Approval</option>
                    <option value="tiered-autonomy">Tiered Autonomy</option>
                    <option value="read-only">Read-Only</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[#86868b]">DATA CLASSIFICATION</label>
                  <select
                    value={workspace.tenant.dataClassification}
                    onChange={(e) => handleUpdatePolicy({ dataClassification: e.target.value as any })}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
                  >
                    <option value="INTERNAL">INTERNAL</option>
                    <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                    <option value="RESTRICTED">RESTRICTED</option>
                    <option value="SOVEREIGN">SOVEREIGN</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[#86868b]">LOCALE &amp; CURRENCY</label>
                  <select
                    value={workspace.tenant.localization?.locale || 'en-US'}
                    onChange={(e) =>
                      handleUpdatePolicy({
                        localization: {
                          locale: e.target.value as any,
                          timezone: e.target.value === 'de-DE' ? 'Europe/Berlin' : e.target.value === 'en-IN' ? 'Asia/Kolkata' : 'UTC',
                          currency: e.target.value === 'de-DE' ? 'EUR' : e.target.value === 'en-IN' ? 'INR' : 'USD',
                          dateFormat: 'ISO-8601',
                        },
                      })
                    }
                    className="w-full px-2.5 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
                  >
                    <option value="en-US">en-US · USD · UTC</option>
                    <option value="de-DE">de-DE · EUR · Europe/Berlin</option>
                    <option value="en-IN">en-IN · INR · Asia/Kolkata</option>
                    <option value="en-GB">en-GB · GBP · Europe/London</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[#86868b]">PRIVACY INTEL OPT-IN</label>
                  <button
                    type="button"
                    onClick={() => handleUpdatePolicy({ intelSharingOptIn: !workspace.tenant.intelSharingOptIn })}
                    className="w-full py-2 rounded-lg bg-[#1c1c1e] border border-white/[0.12] text-xs font-mono text-[#30d158]"
                  >
                    {workspace.tenant.intelSharingOptIn ? 'OPT-IN ACTIVE (SANITIZED)' : 'STRICT ISOLATED (DEFAULT)'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 apple-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#f5f5f7]">
              Tenant-Relevant Sanitized Threat Intelligence ({workspace.tenant.industry})
            </h2>
            {workspace.tenantIntel.map((intel) => (
              <div key={intel.id} className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.08] space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#ff6961] font-bold uppercase">{intel.severity} · {intel.mitreTechnique}</span>
                  <span className="text-[#30d158] font-bold">Relevance: {intel.tenantRelevanceScore}%</span>
                </div>
                <div className="text-xs font-semibold text-[#f5f5f7]">{intel.campaignTitle}</div>
                <div className="text-[11px] text-[#a1a1a6]">{intel.recommendedControl}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: DELEGATED GRANTS & EVIDENCE LEDGER */}
      {workspace && activeTab === 'grants' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="apple-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#f5f5f7]">Customer-Authorized Delegated SOC Grants</h2>
              <button
                type="button"
                onClick={handleGrantSocAccess}
                className="px-3 py-1.5 rounded-lg bg-[#0071e3] text-white text-xs font-semibold"
              >
                + Grant 24h Scoped SOC Access
              </button>
            </div>
            {workspace.delegatedGrants.map((g) => (
              <div key={g.id} className="p-3 rounded-xl bg-[#111113] border border-white/[0.08] flex items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-semibold text-[#f5f5f7]">{g.id} · {g.scope}</div>
                  <div className="text-[11px] text-[#86868b]">{g.reason}</div>
                </div>
                {g.status === 'active' ? (
                  <button
                    type="button"
                    onClick={() => handleRevokeSocGrant(g.id)}
                    className="px-2.5 py-1 rounded bg-[#ff453a]/15 text-[#ff6961] text-[11px] font-mono"
                  >
                    Revoke
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-[#86868b] uppercase">{g.status}</span>
                )}
              </div>
            ))}
          </div>

          <div className="apple-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#f5f5f7]">Immutable Cryptographic Evidence Ledger</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {workspace.evidence.map((ev) => (
                <div key={ev.id} className="p-3 rounded-xl bg-[#111113] border border-white/[0.08] space-y-1 text-xs">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className={ev.decision === 'BLOCKED' ? 'text-[#ff6961] font-bold' : 'text-[#30d158] font-bold'}>
                      {ev.decision} · {ev.action}
                    </span>
                    <span className="text-[#86868b]">{ev.id}</span>
                  </div>
                  <div className="text-[#d1d1d6]">{ev.summary}</div>
                  <div className="text-[10px] font-mono text-[#64d2ff]">Seal: {ev.sha256Seal}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: COMPLIANCE, BILLING & AUDIT REPORTS */}
      {workspace && activeTab === 'compliance-billing' && (
        <div className="space-y-5">
          <div className="apple-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#f5f5f7] flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#30d158]" />
                <span>Verifiable Customer Audit &amp; Compliance Bundle</span>
              </h2>
              <p className="text-xs text-[#a1a1a6]">
                Plan: <strong className="uppercase text-[#64d2ff]">{workspace.usage.planTier}</strong> · Metered Estimate:{' '}
                <strong>${(workspace.usage.estimatedMonthlyUsd || 0).toLocaleString()}/mo</strong> · Retention:{' '}
                <strong>{workspace.tenant.quota.retentionDays} days</strong>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={workspace.tenant.planTier}
                onChange={(e) => handleUpdatePolicy({ planTier: e.target.value as CommercialPlanTier })}
                className="px-3 py-2 rounded-xl bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
              >
                <option value="business">Business Plan</option>
                <option value="professional">Professional Plan</option>
                <option value="enterprise">Enterprise Plan</option>
                <option value="sovereign">Dedicated / Sovereign</option>
              </select>
              <button
                type="button"
                onClick={handleDownloadAuditReport}
                className="px-3.5 py-2 rounded-xl bg-[#30d158] hover:bg-[#28be4c] text-[#050507] text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Signed Audit Report (JSON)</span>
              </button>
            </div>
          </div>

          {auditReportPreview && (
            <div className="apple-card p-4 border-[#30d158]/30 bg-[#30d158]/5 text-xs font-mono space-y-1">
              <div className="text-[#30d158] font-bold">
                AUDIT REPORT SEALED: {auditReportPreview.reportSha256Seal}
              </div>
              <div className="text-[#d1d1d6]">
                Assets: {auditReportPreview.postureSummary.assetsMonitored} · Sealed Evidence:{' '}
                {auditReportPreview.postureSummary.evidenceRecordsSealed} · Red Force Passed:{' '}
                {auditReportPreview.postureSummary.redForceValidationsPassed}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {workspace.complianceFrameworks.map((f) => (
              <div key={f.id} className="apple-card p-4 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#64d2ff] font-bold">{f.framework}</span>
                  <span className="text-[#30d158]">{f.alignedControlsCount}/{f.totalControls}</span>
                </div>
                <div className="text-xs text-[#a1a1a6]">{f.scopeNote}</div>
                <div className="text-[10px] font-mono text-[#86868b]">{f.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
