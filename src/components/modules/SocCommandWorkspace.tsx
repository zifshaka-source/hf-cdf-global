import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Lock,
  Play,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  DelegatedSocGrant,
  FlagshipEnterpriseWorkflowResult,
  TenantEvidenceRecord,
  TenantIncidentRecord,
} from '../../core/multi-tenant-types';

interface SocCommandWorkspaceProps {
  onOpenTenant: (tenantId: string) => void;
  onNotify?: (msg: string, type: 'info' | 'success' | 'alert') => void;
}

export const SocCommandWorkspace: React.FC<SocCommandWorkspaceProps> = ({
  onOpenTenant,
  onNotify,
}) => {
  const [socData, setSocData] = useState<{
    callerRole: string;
    authorizedTenantCount: number;
    totalFleetTenants: number;
    isolationNotice: string;
    activeGrants: DelegatedSocGrant[];
    authorizedIncidents: TenantIncidentRecord[];
    authorizedEvidence: TenantEvidenceRecord[];
    recentWorkflowRuns: FlagshipEnterpriseWorkflowResult[];
  } | null>(null);

  const [isolationReport, setIsolationReport] = useState<any>(null);
  const [workflowRun, setWorkflowRun] = useState<FlagshipEnterpriseWorkflowResult | null>(null);
  const [isRunningWorkflow, setIsRunningWorkflow] = useState(false);

  const loadSoc = async () => {
    try {
      const data = await api.getSocWorkspace();
      setSocData(data);
      if (data.recentWorkflowRuns?.length > 0 && !workflowRun) {
        setWorkflowRun(data.recentWorkflowRuns[0]);
      }
    } catch (err: any) {
      onNotify?.(err?.message || 'Unable to load SOC workspace.', 'alert');
    }
  };

  useEffect(() => {
    loadSoc();
  }, []);

  const handleRunIsolationCheck = async () => {
    try {
      const res = await api.runIsolationCheck();
      setIsolationReport(res);
      onNotify?.(
        res.allAssertionsPassed
          ? 'All automated cross-tenant isolation penetration checks PASSED (HTTP 403 enforced).'
          : 'Isolation verification detected an issue.',
        res.allAssertionsPassed ? 'success' : 'alert'
      );
    } catch (err: any) {
      onNotify?.(err?.message || 'Isolation verification failed', 'alert');
    }
  };

  const handleRunFlagship29 = async () => {
    setIsRunningWorkflow(true);
    try {
      const res = await api.runFlagship29StepWorkflow();
      setWorkflowRun(res);
      onNotify?.(
        `Completed 29-Step Flagship Enterprise Workflow (${res.runId}) for ${res.tenantName}.`,
        'success'
      );
      await loadSoc();
    } catch (err: any) {
      onNotify?.(err?.message || '29-step workflow failed', 'alert');
    } finally {
      setIsRunningWorkflow(false);
    }
  };

  return (
    <div className="space-y-6 font-sans" data-testid="soc-command-workspace">
      <div className="apple-card p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-[#ff9f0a]/15 border border-[#ff9f0a]/30 text-[#ff9f0a] font-semibold">
                INTERFACE 3 · SECURITY OPERATIONS COMMAND
              </span>
              <span className="text-white/20">/</span>
              <span className="text-[#30d158] flex items-center gap-1">
                <Lock className="w-3 h-3" /> SCOPED BY DELEGATED CUSTOMER GRANTS ONLY
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#f5f5f7] tracking-tight">
              Authorized SOC Investigation &amp; Flagship Verification Console
            </h1>
            <p className="text-xs text-[#a1a1a6]">
              {socData?.isolationNotice ||
                'Operators only see tenants where an explicit, non-expired DelegatedSocGrant is active.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRunIsolationCheck}
              className="px-3.5 py-2 rounded-xl bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-white/[0.12] text-xs font-semibold text-[#64d2ff] flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Run Cross-Tenant Isolation Proof</span>
            </button>
            <button
              type="button"
              disabled={isRunningWorkflow}
              onClick={handleRunFlagship29}
              className="px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunningWorkflow ? 'Running 29 Steps...' : 'Execute 29-Step Flagship Workflow'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* AUTOMATED CROSS-TENANT ISOLATION PROOF REPORT */}
      {isolationReport && (
        <div
          className="apple-card p-5 space-y-3 border-[#30d158]/30 bg-[#30d158]/5"
          data-testid="isolation-proof-results"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#f5f5f7] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#30d158]" />
              <span>Automated Cross-Tenant Isolation Verification Results</span>
            </h2>
            <span className="text-[11px] font-mono text-[#30d158] font-bold">
              {isolationReport.allAssertionsPassed ? 'ALL ASSERTIONS PASSED' : 'FAILURE DETECTED'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {isolationReport.checks.map((c: any, idx: number) => (
              <div key={idx} className="p-3.5 rounded-xl bg-[#0a0a0c] border border-white/[0.08] space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#86868b]">HTTP {c.actualHttpStatus}</span>
                  <span className={c.passed ? 'text-[#30d158] font-bold' : 'text-[#ff453a] font-bold'}>
                    {c.passed ? 'VERIFIED' : 'FAILED'}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#f5f5f7]">{c.testName}</div>
                <div className="text-[11px] font-mono text-[#a1a1a6]">{c.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 29-STEP FLAGSHIP END-TO-END WORKFLOW LEDGER */}
      {workflowRun && (
        <div className="apple-card p-5 space-y-4" data-testid="flagship-29-step-ledger">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#f5f5f7]">
                29-Step Flagship Enterprise Workflow · {workflowRun.runId} ({workflowRun.tenantName})
              </h2>
              <p className="text-[11px] font-mono text-[#30d158]">
                {workflowRun.steps.length}/29 Steps Verified · Cross-Tenant Isolation Proof:{' '}
                {workflowRun.crossTenantIsolationVerified ? 'PASSED (HTTP 403)' : 'FAILED'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenTenant(workflowRun.tenantId)}
              className="px-3 py-1.5 rounded-lg bg-[#1c1c1e] hover:bg-[#2c2c2e] text-xs font-medium text-[#64d2ff] border border-white/[0.1]"
            >
              Inspect Created Tenant ({workflowRun.tenantId})
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
            {workflowRun.steps.map((s) => (
              <div key={s.stepNumber} className="p-3 rounded-xl bg-[#111113] border border-white/[0.07] space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#64d2ff]">STEP {s.stepNumber} · {s.layer}</span>
                  <span className={s.status === 'blocked_as_intended' ? 'text-[#ff9f0a] font-bold' : 'text-[#30d158] font-bold'}>
                    {s.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#f5f5f7]">{s.title}</div>
                <div className="text-[11px] text-[#a1a1a6]">{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AUTHORIZED INVESTIGATION QUEUE */}
      {socData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 apple-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#f5f5f7]">
              Authorized SOC Investigation Queue ({socData.authorizedIncidents.length} of {socData.totalFleetTenants} tenants visible)
            </h2>
            {socData.authorizedIncidents.map((inc) => (
              <div key={inc.id} className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.08] flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#ff453a]/15 text-[#ff6961] uppercase font-bold">
                      {inc.severity}
                    </span>
                    <span className="text-xs font-bold text-[#f5f5f7]">{inc.title}</span>
                  </div>
                  <div className="text-[11px] font-mono text-[#86868b]">
                    Tenant: {inc.tenantId} · Asset: {inc.affectedAssetId} · State: {inc.state.toUpperCase()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenTenant(inc.tenantId)}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg bg-[#0071e3] text-white text-[11px] font-semibold"
                >
                  Open Case
                </button>
              </div>
            ))}
          </div>

          <div className="lg:col-span-5 apple-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#f5f5f7]">Active Delegated Customer Grants</h2>
            {socData.activeGrants.map((g) => (
              <div key={g.id} className="p-3 rounded-xl bg-[#111113] border border-white/[0.08] space-y-1 text-xs">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-[#30d158] font-bold">{g.id}</span>
                  <span className="text-[#64d2ff]">{g.scope}</span>
                </div>
                <div className="font-semibold text-[#f5f5f7]">{g.tenantName}</div>
                <div className="text-[11px] text-[#86868b]">Approved by: {g.grantedByCustomerAdmin}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
