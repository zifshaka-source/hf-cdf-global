import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Cpu,
  DollarSign,
  FileCode2,
  Globe,
  KeyRound,
  Layers,
  Lock,
  Plug,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Swords,
  Plus,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  AutonomyMode,
  CloudEnvironmentType,
  CommercialPlanTier,
  ComplianceControlFramework,
  CrossCustomerIntelAdvisory,
  IsolationTier,
  OperatingModel,
  RbacPermissionSpec,
  RbacRole,
  RegionalClusterId,
  RegionalControlPlane,
  RoadmapPhaseItem,
  TenantOrganization,
  TenantUsageSummary,
  UniversalConnectorCatalogItem,
} from '../../core/multi-tenant-types';

interface GlobalCommandHubProps {
  onOpenCustomerPortal: (tenantId: string) => void;
  onOpenSocCommand: () => void;
  onRoleSwitched?: (session: { sub: string; displayName: string; role: string }) => void;
  onNotify?: (msg: string, type: 'info' | 'success' | 'alert') => void;
}

interface GlobalOverviewData {
  generatedAt: string;
  dataPlaneBoundaryNotice: string;
  fleetMetrics: {
    activeTenants: number;
    totalOrganizations: number;
    connectedDeployments: number;
    connectorFailures: number;
    registeredAssets: number;
    registeredAgents: number;
    healthyAgents: number;
    offlineAgents: number;
    criticalIncidents: number;
    openInvestigations: number;
    pendingApprovals: number;
    responseExecutionsVerified: number;
    redForceSimulationsTotal: number;
    redForceSimulationsPassed: number;
    regionalAvailabilityPct: number;
    queueLagMs: number;
    storageUtilizationGb: number;
    telemetryIngestionHealthy: boolean;
    telemetryEventsNormalized: number;
    estimatedApiLatencyP95Ms: number;
    agentExecutionsMeasured: number;
    totalDelegatedGrants: number;
    estimatedMonthlyMrrUsd: number;
  };
  capacityTargets: {
    illustrativeTargetOrgs: number;
    illustrativeTargetAssets: number;
    illustrativeTargetAgents: number;
    illustrativePeakEps: number;
    currentMeasuredEps: number;
    targetNotice: string;
  };
  regionalPlanes: RegionalControlPlane[];
  tenants: TenantOrganization[];
  agentFleetMetadata: Array<{
    id: string;
    tenantId: string;
    name: string;
    force: 'BLUE_FORCE' | 'RED_FORCE';
    unitType: string;
    regionId: RegionalClusterId;
    status: string;
    killSwitchEngaged: boolean;
    actionsExecuted: number;
    blockedViolations: number;
  }>;
  redForceUnitCatalog: string[];
  blueForceUnitCatalog: string[];
  complianceFrameworks: ComplianceControlFramework[];
  rbacRoleMatrix: RbacPermissionSpec[];
  usageSummaries: TenantUsageSummary[];
  crossCustomerIntel: CrossCustomerIntelAdvisory[];
  universalConnectors: UniversalConnectorCatalogItem[];
  roadmapPhases: RoadmapPhaseItem[];
  technicalDebtReport: Array<{
    id: string;
    area: string;
    beforeState: string;
    resolution: string;
    status: string;
  }>;
}

type GlobalTab =
  | 'fleet'
  | 'forces'
  | 'regions'
  | 'cross-intel'
  | 'integrations'
  | 'commercial'
  | 'governance'
  | 'architecture';

export const GlobalCommandHub: React.FC<GlobalCommandHubProps> = ({
  onOpenCustomerPortal,
  onOpenSocCommand,
  onRoleSwitched,
  onNotify,
}) => {
  const [overview, setOverview] = useState<GlobalOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GlobalTab>('fleet');

  // New Tenant Onboarding Form State
  const [orgName, setOrgName] = useState('');
  const [orgDomain, setOrgDomain] = useState('');
  const [orgIndustry, setOrgIndustry] = useState('Financial Services');
  const [orgEnv, setOrgEnv] = useState<CloudEnvironmentType>('aws-k8s');
  const [orgRegion, setOrgRegion] = useState<RegionalClusterId>('eu-fra');
  const [orgIsolation, setOrgIsolation] = useState<IsolationTier>('enterprise');
  const [orgOpModel, setOrgOpModel] = useState<OperatingModel>('hybrid');
  const [orgAutonomy, setOrgAutonomy] = useState<AutonomyMode>('tiered-autonomy');
  const [orgPlan, setOrgPlan] = useState<CommercialPlanTier>('enterprise');
  const [isOnboarding, setIsOnboarding] = useState(false);

  const loadOverview = async () => {
    try {
      setError(null);
      const data = await api.getGlobalOverview();
      setOverview(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to load Global Command Control Plane.');
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !orgDomain.trim()) {
      onNotify?.('Organization name and domain are required.', 'alert');
      return;
    }
    setIsOnboarding(true);
    try {
      const res = await api.onboardTenant({
        name: orgName.trim(),
        domain: orgDomain.trim(),
        industry: orgIndustry,
        primaryEnvironment: orgEnv,
        regionId: orgRegion,
        isolationTier: orgIsolation,
        operatingModel: orgOpModel,
        autonomyMode: orgAutonomy,
        planTier: orgPlan,
      });
      if (res.overview) {
        setOverview(res.overview);
      } else {
        await loadOverview();
      }
      setOrgName('');
      setOrgDomain('');
      onNotify?.(
        `Onboarded isolated tenant ${res.tenant.name} (${res.tenant.id}) in ${res.tenant.regionId.toUpperCase()}.`,
        'success'
      );
    } catch (err: any) {
      onNotify?.(err?.message || 'Tenant onboarding failed.', 'alert');
    } finally {
      setIsOnboarding(false);
    }
  };

  const handleToggleFailover = async (regionId: RegionalClusterId) => {
    try {
      const res = await api.toggleRegionalFailover(regionId);
      onNotify?.(
        `Regional Control Plane ${res.region.id.toUpperCase()} set to ${res.region.status.toUpperCase()}.`,
        res.region.status === 'failover' ? 'alert' : 'success'
      );
      await loadOverview();
    } catch (err: any) {
      onNotify?.(err?.message || 'Regional failover drill failed.', 'alert');
    }
  };

  const handleSwitchRole = async (role: RbacRole, tenantId?: string) => {
    try {
      const res = await api.switchAuthContext(role, tenantId);
      onRoleSwitched?.(res.session);
      onNotify?.(
        `Server-signed session switched to ${role}${tenantId ? ` (${tenantId})` : ''}.`,
        'info'
      );
      if (role === 'customer_admin' || role === 'customer_analyst' || role === 'billing_admin') {
        if (tenantId) onOpenCustomerPortal(tenantId);
      } else {
        await loadOverview();
      }
    } catch (err: any) {
      onNotify?.(err?.message || 'Role switch failed.', 'alert');
    }
  };

  if (error) {
    return (
      <div className="apple-card p-6 border-[#ff453a]/30 bg-[#ff453a]/5 space-y-3" data-testid="global-command-error">
        <div className="flex items-center gap-2 text-[#ff6961] font-mono text-sm font-semibold">
          <Lock className="w-4 h-4" />
          <span>GLOBAL CONTROL PLANE ACCESS BOUNDARY</span>
        </div>
        <p className="text-xs text-[#d1d1d6]">{error}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleSwitchRole('global_operator')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0a84ff] text-white"
          >
            Restore Global Operator Session
          </button>
          <button
            type="button"
            onClick={loadOverview}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1c1c1e] border border-white/10 text-[#f5f5f7]"
          >
            Retry Global Sync
          </button>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="apple-card p-6 text-xs font-mono text-[#86868b]">
        Synchronizing HF-CDF GLOBAL Control Plane metadata...
      </div>
    );
  }

  const m = overview.fleetMetrics;

  return (
    <div className="space-y-6 font-sans" data-testid="global-command-hub">
      {/* Control Plane Header & Complete 20-Metric Telemetry Strip */}
      <div className="apple-card p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-[#0a84ff]/15 border border-[#0a84ff]/30 text-[#64d2ff] font-semibold">
                INTERFACE 1 · GLOBAL COMMAND HQ
              </span>
              <span className="text-white/20">/</span>
              <span className="text-[#30d158] flex items-center gap-1">
                <Lock className="w-3 h-3" /> DATA PLANE BOUNDARY ENFORCED
              </span>
              <span className="text-[#86868b]">
                Freshness: {new Date(overview.generatedAt).toLocaleTimeString()}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#f5f5f7] tracking-tight">
              HF-CDF GLOBAL · Multi-Tenant Control Plane
            </h1>
            <p className="text-xs text-[#a1a1a6] max-w-4xl">{overview.dataPlaneBoundaryNotice}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadOverview}
              className="px-3 py-2 rounded-xl bg-[#141416] hover:bg-[#1c1c1e] border border-white/[0.1] text-xs text-[#a1a1a6] flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Plane</span>
            </button>
            <button
              type="button"
              onClick={onOpenSocCommand}
              className="px-3.5 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-xs font-semibold text-white flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Open SOC Command ({m.totalDelegatedGrants} Grants)</span>
            </button>
          </div>
        </div>

        {/* Measured vs Estimated Global Command Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-white/[0.08]">
          {[
            { label: 'Active Tenants', value: m.activeTenants, sub: `${m.totalOrganizations} onboarded · MEASURED`, color: 'text-[#f5f5f7]' },
            { label: 'Connected Connectors', value: m.connectedDeployments, sub: `${m.connectorFailures} failures · MEASURED`, color: m.connectorFailures > 0 ? 'text-[#ff9f0a]' : 'text-[#30d158]' },
            { label: 'Registered Assets', value: m.registeredAssets.toLocaleString(), sub: 'Multi-cloud · MEASURED', color: 'text-[#64d2ff]' },
            { label: 'Agent Fleet Health', value: `${m.healthyAgents}/${m.registeredAgents}`, sub: `${m.offlineAgents} offline · MEASURED`, color: 'text-[#0a84ff]' },
            { label: 'Critical / Open', value: `${m.criticalIncidents} / ${m.openInvestigations}`, sub: `${m.pendingApprovals} approvals pending`, color: m.criticalIncidents > 0 ? 'text-[#ff453a]' : 'text-[#30d158]' },
            { label: 'Regional Availability', value: `${m.regionalAvailabilityPct}%`, sub: `Lag ${m.queueLagMs}ms · P95 ${m.estimatedApiLatencyP95Ms}ms`, color: 'text-[#30d158]' },
            { label: 'Red Force Validations', value: `${m.redForceSimulationsPassed}/${m.redForceSimulationsTotal}`, sub: 'Signed scope · MEASURED', color: 'text-[#ff6961]' },
            { label: 'Blue Responses Verified', value: m.responseExecutionsVerified, sub: `${m.agentExecutionsMeasured} actions · MEASURED`, color: 'text-[#64d2ff]' },
            { label: 'OCSF Telemetry Events', value: m.telemetryEventsNormalized, sub: m.telemetryIngestionHealthy ? 'Pipeline Healthy' : 'Connector Alert', color: 'text-[#30d158]' },
            { label: 'Storage Utilization', value: `${m.storageUtilizationGb} GB`, sub: 'Tenant-partitioned estimate', color: 'text-[#f5f5f7]' },
            { label: 'Active SOC Grants', value: m.totalDelegatedGrants, sub: 'Time-bound signed access', color: 'text-[#ff9f0a]' },
            { label: 'Metered Run Rate (Est)', value: `$${m.estimatedMonthlyMrrUsd.toLocaleString()}/mo`, sub: 'Usage estimate (not billed)', color: 'text-[#a1a1a6]' },
          ].map((stat) => (
            <div key={stat.label} className="p-2.5 rounded-xl bg-[#111113] border border-white/[0.07]">
              <div className="text-[10px] font-mono uppercase text-[#86868b] leading-tight">{stat.label}</div>
              <div className={`text-lg font-bold mt-0.5 tabular-nums ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-[#86868b] leading-tight">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* 17-Module Grouped Sub-Navigation */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {(
            [
              { id: 'fleet', label: 'Customer Fleet & Onboarding', icon: Building2 },
              { id: 'forces', label: 'Agent Fleet · Red & Blue Force', icon: Swords },
              { id: 'regions', label: 'Regional Ops · Infra & Reliability', icon: Globe },
              { id: 'cross-intel', label: 'Tenant & Threat Intel', icon: ShieldCheck },
              { id: 'integrations', label: 'Integration Operations', icon: Plug },
              { id: 'commercial', label: 'Commercial · Usage & Billing', icon: DollarSign },
              { id: 'governance', label: 'Assurance · Compliance & RBAC', icon: KeyRound },
              { id: 'architecture', label: 'Stack · Debt & 15-Phase Roadmap', icon: Layers },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all border ${
                  active
                    ? 'bg-[#0a84ff]/20 text-[#f5f5f7] border-[#0a84ff]/50'
                    : 'bg-[#141416] text-[#a1a1a6] border-white/[0.07] hover:text-[#f5f5f7]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: CUSTOMER FLEET & ONBOARDING */}
      {activeTab === 'fleet' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8 apple-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#f5f5f7]">Onboarded Customer Organizations</h2>
                <p className="text-[11px] text-[#86868b]">
                  Pooled (Standard), Dedicated Enterprise, and Sovereign isolated customer data planes across industries.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#64d2ff] tabular-nums">
                {overview.tenants.length} ISOLATED TENANTS
              </span>
            </div>

            <div className="space-y-2.5">
              {overview.tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] hover:border-white/[0.16] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[#f5f5f7]">{tenant.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-[#64d2ff] uppercase">
                        {tenant.isolationTier}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0a84ff]/10 text-[#0a84ff] uppercase">
                        {tenant.regionId}
                      </span>
                      <span className="text-[10px] font-mono text-[#30d158]">{tenant.operatingModel}</span>
                      <span className="text-[10px] font-mono text-[#ff9f0a] uppercase">{tenant.dataClassification}</span>
                    </div>
                    <div className="text-xs text-[#a1a1a6] truncate">{tenant.environmentSummary}</div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-[#86868b]">
                      <span>ID: {tenant.id}</span>
                      <span>Industry: {tenant.industry}</span>
                      <span>Autonomy: {tenant.autonomyMode}</span>
                      <span>Health: <strong className="text-[#30d158]">{tenant.healthScore}%</strong></span>
                      <span>Assets: {tenant.assetsCount}</span>
                      <span>BYOK: {tenant.byokKeyId}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenCustomerPortal(tenant.id)}
                    className="shrink-0 px-3 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <span>Enter Customer Command</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleOnboardSubmit}
            className="lg:col-span-4 apple-card p-5 space-y-3.5"
            data-testid="tenant-onboarding-form"
          >
            <div className="border-b border-white/[0.08] pb-2.5">
              <h2 className="text-sm font-bold text-[#f5f5f7] flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#30d158]" />
                <span>Onboard Customer Organization</span>
              </h2>
              <p className="text-[11px] text-[#86868b] mt-0.5">
                Provision isolated tenant RLS policy, BYOK CMK key, and regional residency.
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="org-name" className="text-[11px] font-mono text-[#a1a1a6]">Organization Name</label>
              <input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Meridian BioPharma Corp"
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7] focus:border-[#0a84ff] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="org-domain" className="text-[11px] font-mono text-[#a1a1a6]">Verified Domain</label>
              <input
                id="org-domain"
                value={orgDomain}
                onChange={(e) => setOrgDomain(e.target.value)}
                placeholder="e.g. meridianbio.example"
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7] focus:border-[#0a84ff] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label htmlFor="org-industry" className="text-[11px] font-mono text-[#a1a1a6]">Industry</label>
                <select
                  id="org-industry"
                  value={orgIndustry}
                  onChange={(e) => setOrgIndustry(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
                >
                  <option value="Financial Services">Financial Services</option>
                  <option value="AI Development">AI Development</option>
                  <option value="Healthcare">Healthcare / Pharma</option>
                  <option value="Cloud SaaS">Cloud SaaS / Tech</option>
                  <option value="Manufacturing">Manufacturing / Logistics</option>
                  <option value="Telecom">Telecommunications</option>
                  <option value="Government Contractor">Gov Contractor</option>
                  <option value="Education">Educational Institution</option>
                  <option value="Retail">Retail / Insurance</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="org-region" className="text-[11px] font-mono text-[#a1a1a6]">Regional Residency</label>
                <select
                  id="org-region"
                  value={orgRegion}
                  onChange={(e) => setOrgRegion(e.target.value as RegionalClusterId)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
                >
                  <option value="in-mum">India (Mumbai / Hyd)</option>
                  <option value="ap-sgp">APAC (Singapore)</option>
                  <option value="eu-fra">Europe (Frankfurt)</option>
                  <option value="us-iad">North America (VA/OR)</option>
                  <option value="me-uae">Middle East (UAE)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label htmlFor="org-isolation" className="text-[11px] font-mono text-[#a1a1a6]">Isolation Tier</label>
                <select
                  id="org-isolation"
                  value={orgIsolation}
                  onChange={(e) => setOrgIsolation(e.target.value as IsolationTier)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
                >
                  <option value="standard">Standard (Pooled RLS)</option>
                  <option value="enterprise">Enterprise (Bridge)</option>
                  <option value="sovereign">Sovereign (Silo VPC/BYOK)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="org-env" className="text-[11px] font-mono text-[#a1a1a6]">Infrastructure</label>
                <select
                  id="org-env"
                  value={orgEnv}
                  onChange={(e) => setOrgEnv(e.target.value as CloudEnvironmentType)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
                >
                  <option value="aws-k8s">AWS + Kubernetes</option>
                  <option value="azure-m365">Azure + M365</option>
                  <option value="gcp-gke">GCP + GKE</option>
                  <option value="on-prem">On-Premises DC</option>
                  <option value="ai-cluster">AI Inference Cluster</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label htmlFor="org-op-model" className="text-[11px] font-mono text-[#a1a1a6]">Operating Model</label>
                <select
                  id="org-op-model"
                  value={orgOpModel}
                  onChange={(e) => setOrgOpModel(e.target.value as OperatingModel)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
                >
                  <option value="hybrid">Hybrid (Recommended)</option>
                  <option value="pure-saas">Pure SaaS</option>
                  <option value="managed-security">Managed Security</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="org-autonomy" className="text-[11px] font-mono text-[#a1a1a6]">Response Autonomy</label>
                <select
                  id="org-autonomy"
                  value={orgAutonomy}
                  onChange={(e) => setOrgAutonomy(e.target.value as AutonomyMode)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
                >
                  <option value="tiered-autonomy">Tiered Autonomy</option>
                  <option value="human-approval">Human Approval</option>
                  <option value="read-only">Read-Only Initial</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="org-plan" className="text-[11px] font-mono text-[#a1a1a6]">Commercial Tier</label>
              <select
                id="org-plan"
                value={orgPlan}
                onChange={(e) => setOrgPlan(e.target.value as CommercialPlanTier)}
                className="w-full px-2.5 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
              >
                <option value="business">Business</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
                <option value="sovereign">Dedicated / Sovereign</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isOnboarding}
              className="w-full py-2.5 rounded-xl bg-[#30d158] hover:bg-[#28be4c] text-[#050507] font-bold text-xs transition-all disabled:opacity-50"
            >
              {isOnboarding ? 'Provisioning Isolated Boundary...' : 'Provision Isolated Tenant'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: AGENT FLEET, BLUE FORCE & RED FORCE COMMAND */}
      {activeTab === 'forces' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="apple-card p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                <h2 className="text-sm font-bold text-[#64d2ff] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Blue Force Continuous Defense ({overview.blueForceUnitCatalog.length} Units)</span>
                </h2>
                <span className="text-[10px] font-mono text-[#30d158]">DETERMINISTIC POLICY BOUND</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {overview.blueForceUnitCatalog.map((u) => (
                  <div key={u} className="p-2.5 rounded-lg bg-[#111113] border border-[#0a84ff]/20 text-[#d1d1d6] font-mono text-[11px]">
                    {u}
                  </div>
                ))}
              </div>
            </div>

            <div className="apple-card p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                <h2 className="text-sm font-bold text-[#ff6961] flex items-center gap-2">
                  <Swords className="w-4 h-4" />
                  <span>Red Force Adversarial Validation ({overview.redForceUnitCatalog.length} Units)</span>
                </h2>
                <span className="text-[10px] font-mono text-[#ff9f0a]">SIGNED SCOPE REQUIRED</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {overview.redForceUnitCatalog.map((u) => (
                  <div key={u} className="p-2.5 rounded-lg bg-[#111113] border border-[#ff453a]/20 text-[#d1d1d6] font-mono text-[11px]">
                    {u}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="apple-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#f5f5f7]">
              Global Agent Fleet Inventory (Metadata Only — SPIFFE Workload Identities Inside Data Planes)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-[10px] uppercase text-[#86868b] border-b border-white/[0.08]">
                  <tr>
                    <th className="py-2 pr-3">Agent</th>
                    <th className="py-2 pr-3">Force</th>
                    <th className="py-2 pr-3">Tenant</th>
                    <th className="py-2 pr-3">Region</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Executions / Blocks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {overview.agentFleetMetadata.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 pr-3 font-sans font-semibold text-[#f5f5f7]">{a.name}</td>
                      <td className="py-2 pr-3">
                        <span className={a.force === 'BLUE_FORCE' ? 'text-[#64d2ff]' : 'text-[#ff6961]'}>{a.force}</span>
                      </td>
                      <td className="py-2 pr-3 text-[#a1a1a6]">{a.tenantId}</td>
                      <td className="py-2 pr-3 uppercase text-[#0a84ff]">{a.regionId}</td>
                      <td className="py-2 pr-3">
                        <span className={a.killSwitchEngaged ? 'text-[#ff453a] font-bold' : 'text-[#30d158]'}>
                          {a.killSwitchEngaged ? 'KILL_SWITCH' : a.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {a.actionsExecuted} ok / <span className="text-[#ff6961]">{a.blockedViolations} blocked</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REGIONAL OPERATIONS, INFRASTRUCTURE & RELIABILITY */}
      {activeTab === 'regions' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {overview.regionalPlanes.map((reg) => (
              <div key={reg.id} className="apple-card p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#64d2ff] uppercase">{reg.id}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    reg.status === 'operational'
                      ? 'bg-[#30d158]/15 text-[#30d158]'
                      : 'bg-[#ff9f0a]/15 text-[#ff9f0a]'
                  }`}>
                    {reg.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-bold text-[#f5f5f7]">{reg.cityHub}</div>
                  <div className="text-[11px] text-[#a1a1a6]">{reg.regionName}</div>
                </div>
                <div className="text-[11px] font-mono text-[#86868b] space-y-1 pt-1 border-t border-white/[0.06]">
                  <div>Tenants: <strong className="text-[#f5f5f7]">{reg.tenantCount}</strong></div>
                  <div>Measured EPS: <strong className="text-[#0a84ff]">{reg.ingestedEventsPerSec.toLocaleString()}</strong></div>
                  <div>Queue Lag: <strong className="text-[#30d158]">{reg.queueLagMs}ms</strong></div>
                  <div>SLO: <strong className="text-[#f5f5f7]">{reg.availabilitySloPct}%</strong></div>
                  <div className="text-[10px] text-[#64d2ff] truncate" title={reg.dataResidencyStandard}>
                    {reg.dataResidencyStandard}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFailover(reg.id)}
                  className="w-full py-1.5 rounded-lg bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-white/[0.1] text-[10px] font-mono text-[#f5f5f7]"
                >
                  {reg.status === 'operational' ? 'Run Regional Failover Drill' : 'Restore Primary Plane'}
                </button>
              </div>
            ))}
          </div>

          <div className="apple-card p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#f5f5f7] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#0a84ff]" />
                <span>Distributed Scale Capacity Planning Targets vs. Live Container Telemetry</span>
              </h2>
              <span className="text-[11px] font-mono text-[#ff9f0a]">{overview.capacityTargets.targetNotice}</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Design Target Organizations', val: overview.capacityTargets.illustrativeTargetOrgs.toLocaleString(), live: `${m.totalOrganizations} active` },
                { label: 'Design Target Assets', val: '1,000,000', live: `${m.registeredAssets.toLocaleString()} registered` },
                { label: 'Design Target Agents', val: '100,000', live: `${m.registeredAgents} deployed` },
                { label: 'Design Peak Events/Sec', val: '100,000 EPS', live: `${overview.capacityTargets.currentMeasuredEps.toLocaleString()} EPS live` },
              ].map((c) => (
                <div key={c.label} className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.07]">
                  <div className="text-[10px] font-mono text-[#86868b] uppercase">{c.label}</div>
                  <div className="text-lg font-bold text-[#f5f5f7] mt-1 tabular-nums">{c.val}</div>
                  <div className="text-[11px] font-mono text-[#30d158] mt-0.5">Live: {c.live}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CROSS-CUSTOMER PRIVACY-PRESERVING INTELLIGENCE */}
      {activeTab === 'cross-intel' && (
        <div className="apple-card p-5 space-y-4">
          <div className="border-b border-white/[0.08] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#f5f5f7]">
                Privacy-Preserving Cross-Customer Campaign &amp; Threat Intelligence
              </h2>
              <p className="text-[11px] text-[#a1a1a6]">
                Zero customer raw logs, secrets, or tenant identities ever cross tenant boundaries. Only sanitized SHA-256 indicator hashes and MITRE TTPs are distributed.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#30d158]/15 border border-[#30d158]/30 text-[10px] font-mono text-[#30d158]">
              RAW_LOGS_SHARED: FALSE · PII_REDACTED: TRUE
            </span>
          </div>

          <div className="space-y-3">
            {overview.crossCustomerIntel.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff453a]/15 text-[#ff6961] uppercase font-bold">
                      {item.severity}
                    </span>
                    <span className="text-sm font-semibold text-[#f5f5f7]">{item.campaignTitle}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#64d2ff]">{item.mitreTechnique}</span>
                </div>
                <div className="text-xs text-[#d1d1d6]">
                  Recommended Control: <strong className="text-[#f5f5f7]">{item.recommendedControl}</strong>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-[#86868b] pt-1">
                  <span>Hash: <strong className="text-[#a1a1a6]">{item.sanitizedIocHash}</strong></span>
                  <span>Observed Orgs (Count Only): <strong className="text-[#f5f5f7]">{item.affectedTenantCount}</strong></span>
                  <span>Sectors: {item.affectedSectors.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: INTEGRATION OPERATIONS */}
      {activeTab === 'integrations' && (
        <div className="apple-card p-5 space-y-4">
          <div className="border-b border-white/[0.08] pb-3">
            <h2 className="text-sm font-bold text-[#f5f5f7]">
              Universal Provider-Independent Connector Framework
            </h2>
            <p className="text-[11px] text-[#86868b]">
              Least-privilege auth, rate limits, schema registries, and explicit delivery status across Cloud, Identity, Endpoint, App &amp; CI/CD, and Telemetry Streams.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {overview.universalConnectors.map((conn) => (
              <div key={conn.id} className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.08] space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#0a84ff] uppercase">{conn.category}</span>
                  <span className="text-[#30d158]">{conn.implementationStatus}</span>
                </div>
                <div className="text-xs font-semibold text-[#f5f5f7]">{conn.name}</div>
                <div className="text-[11px] text-[#86868b]">{conn.authMethod}</div>
                <div className="text-[10px] font-mono text-[#a1a1a6]">
                  Schema: {conn.schemaFormat} · {conn.rateLimitRpm.toLocaleString()} rpm
                </div>
                <div className="text-[10px] font-mono text-[#64d2ff] truncate" title={conn.leastPrivilegeScopes.join(', ')}>
                  Scopes: {conn.leastPrivilegeScopes.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: COMMERCIAL OPERATIONS, USAGE & BILLING */}
      {activeTab === 'commercial' && (
        <div className="apple-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#f5f5f7]">
                Commercial Metering, Subscription Tiers, Quotas &amp; Noisy-Neighbor Protection
              </h2>
              <p className="text-[11px] text-[#86868b]">
                Plans: Business · Professional · Enterprise · Dedicated / Sovereign. Spend reflects illustrative metering formula over live tenant counts.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] uppercase text-[#86868b] border-b border-white/[0.08]">
                <tr>
                  <th className="py-2 pr-3">Organization</th>
                  <th className="py-2 pr-3">Plan / Isolation</th>
                  <th className="py-2 pr-3">Assets / Quota</th>
                  <th className="py-2 pr-3">EPS / Quota</th>
                  <th className="py-2 pr-3">Storage</th>
                  <th className="py-2 pr-3">SLA Measured</th>
                  <th className="py-2 pr-3">Metered Est / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-[#d1d1d6]">
                {overview.usageSummaries.map((u) => (
                  <tr key={u.tenantId}>
                    <td className="py-2.5 pr-3 font-sans font-semibold text-[#f5f5f7]">{u.tenantName}</td>
                    <td className="py-2.5 pr-3 uppercase text-[#64d2ff]">{u.planTier} · {u.isolationTier}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{u.assetsRegistered} / {u.assetsQuota.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {u.currentEventsPerSec.toLocaleString()} / {u.epsQuota.toLocaleString()}
                      {u.noisyNeighborThrottled && <span className="ml-1.5 text-[#ff9f0a]">(THROTTLED)</span>}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{u.storageGbUsed} GB</td>
                    <td className="py-2.5 pr-3 text-[#30d158] tabular-nums">{u.slaMeasuredPct}% (Target {u.slaTargetPct}%)</td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      ${(u.estimatedMonthlyUsd || 0).toLocaleString()}/mo ·{' '}
                      <span className={u.invoiceStatus === 'overage_alert' ? 'text-[#ff9f0a]' : 'text-[#30d158]'}>
                        {(u.invoiceStatus || 'current').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: SECURITY ASSURANCE, COMPLIANCE & 6-ROLE RBAC GOVERNANCE */}
      {activeTab === 'governance' && (
        <div className="space-y-5">
          <div className="apple-card p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
              <div>
                <h2 className="text-sm font-bold text-[#f5f5f7]">
                  6-Role Enterprise RBAC Domain Matrix &amp; Server-Signed Context Switcher
                </h2>
                <p className="text-[11px] text-[#86868b]">
                  Platform operators and customer administrators operate in separate authorization domains. Switch role to test backend enforcement.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {overview.rbacRoleMatrix.map((spec) => {
                const defaultTenant = overview.tenants[0]?.id;
                return (
                  <div key={spec.role} className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#f5f5f7]">{spec.label}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0a84ff]/15 text-[#64d2ff]">
                        {spec.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#a1a1a6]">{spec.scopeBoundary}</p>
                    <button
                      type="button"
                      onClick={() =>
                        handleSwitchRole(
                          spec.role,
                          spec.canAccessAssignedTenant && !spec.canViewGlobalFleet ? defaultTenant : undefined
                        )
                      }
                      className="w-full py-1.5 rounded-lg bg-[#1c1c1e] hover:bg-[#0a84ff] hover:text-white border border-white/[0.1] text-[11px] font-mono text-[#64d2ff] transition-colors"
                    >
                      Activate {spec.role} Context
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="apple-card p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
              <h2 className="text-sm font-bold text-[#f5f5f7]">
                Security &amp; AI Governance Control References (Not Independently Certified)
              </h2>
              <span className="text-[10px] font-mono text-[#ff9f0a]">ENGINEERING REFERENCE CONTROLS</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {overview.complianceFrameworks.map((f) => (
                <div key={f.id} className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.08] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#64d2ff] font-bold">{f.framework} ({f.version})</span>
                    <span className="text-[#30d158]">{f.alignedControlsCount}/{f.totalControls} Controls</span>
                  </div>
                  <div className="text-[11px] text-[#a1a1a6]">{f.scopeNote}</div>
                  <div className="text-[10px] font-mono text-[#86868b]">Status: {f.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: POLYGLOT STACK, DEBT & 15-PHASE ROADMAP */}
      {activeTab === 'architecture' && (
        <div className="space-y-5">
          <div className="apple-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#f5f5f7] flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-[#0a84ff]" />
              <span>Technical Debt Audit &amp; Architectural Migration Status</span>
            </h2>
            <div className="space-y-2">
              {overview.technicalDebtReport.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-[#111113] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-semibold text-[#f5f5f7]">{item.id} · {item.area}</div>
                    <div className="text-[11px] text-[#86868b]">Before: {item.beforeState}</div>
                    <div className="text-[11px] text-[#a1a1a6]">Resolution: {item.resolution}</div>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                    item.status === 'Resolved' ? 'bg-[#30d158]/15 text-[#30d158]' : 'bg-[#0a84ff]/15 text-[#64d2ff]'
                  }`}>
                    {item.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="apple-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#f5f5f7] flex items-center gap-2">
              <Server className="w-4 h-4 text-[#30d158]" />
              <span>15-Phase HF-CDF GLOBAL Engineering Roadmap (Explicit Delivery Status)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {overview.roadmapPhases.map((p) => (
                <div key={p.phase} className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.08] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#86868b]">PHASE {p.phase}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#30d158]/15 text-[#30d158] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {p.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#f5f5f7]">{p.name}</div>
                  <div className="text-[11px] text-[#a1a1a6]">{p.scopeSummary}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
