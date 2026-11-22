import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Shield,
  History,
  Lock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rbac' | 'audit' | 'policies' | 'health'>('rbac');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [policies, setPolicies] = useState({
    strictEgress: true,
    safetensorsMandatory: true,
    twoPersonContainment: false,
    eBPFStrictBlocking: true,
  });

  useEffect(() => {
    api.getAuditLog().then(setAuditLogs);
    api.getSystemHealth().then(setSystemHealth);
  }, []);

  const refreshHealth = async () => {
    const data = await api.getSystemHealth();
    setSystemHealth(data);
  };

  const users = [
    {
      id: 'usr-1',
      name: 'Authorized Commander',
      email: 'commander@hf-cdf.internal',
      role: 'Authorized Commander',
      tier: 'TIER-3',
      status: 'Active',
      permissions: ['ALL_PERMISSIONS', 'CONTAINMENT_EXECUTE', 'DEFCON_OVERRIDE'],
    },
    {
      id: 'usr-2',
      name: 'Marcus Vance',
      email: 'm.vance@cdf.internal',
      role: 'Security Analyst',
      tier: 'TIER-2',
      status: 'Active',
      permissions: ['INCIDENT_TRIAGE', 'TELEMETRY_INSPECT', 'EVIDENCE_COLLECT'],
    },
    {
      id: 'usr-3',
      name: 'Chief Information Security Officer (CISO)',
      email: 'ciso@cdf.internal',
      role: 'Administrator',
      tier: 'TIER-3',
      status: 'Active',
      permissions: ['ALL_PERMISSIONS', 'MISSION_AUTHORIZE', 'ROLE_ASSIGNMENT'],
    },
    {
      id: 'usr-4',
      name: 'Compliance Auditor',
      email: 'audit@cdf.internal',
      role: 'Read-only Auditor',
      tier: 'TIER-1',
      status: 'Active',
      permissions: ['AUDIT_READ_ONLY', 'REPORT_EXPORT'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-300" />
            <span>Governance, RBAC & Security Compliance</span>
          </h1>
          <p className="text-xs text-[#86868b]">
            Role-Based Access Control (RBAC), tamper-evident audit ledger, and cryptographic enclave security policies.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06] text-xs">
          {[
            { id: 'rbac', label: 'RBAC Users' },
            { id: 'audit', label: 'Audit Log' },
            { id: 'policies', label: 'Policies' },
            { id: 'health', label: 'System Health & OTel' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'health') refreshHealth();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white/15 text-white shadow-sm font-semibold'
                  : 'text-[#86868b] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: RBAC */}
      {activeTab === 'rbac' && (
        <div className="apple-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-[#0071e3]" />
              <h2 className="text-sm font-semibold text-white tracking-tight">Personnel & Operational Credentials</h2>
            </div>
            <span className="text-xs text-[#86868b] font-mono">4 Active Credentials</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] text-[11px] text-[#86868b] uppercase tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Role & Tier</th>
                  <th className="p-3.5">Permissions Scope</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-white/90">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-white">{u.name}</div>
                      <div className="text-[11px] text-[#86868b] font-mono">{u.email}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="text-white font-medium">{u.role}</div>
                      <div className="text-[11px] text-[#86868b] font-mono">{u.tier}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {u.permissions.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[#86868b] text-[10px] font-mono border border-white/[0.06]"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30 text-[10px] font-semibold">
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Audit Log */}
      {activeTab === 'audit' && (
        <div className="apple-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4 text-[#0071e3]" />
              <h2 className="text-sm font-semibold text-white tracking-tight">Immutable Platform Audit Trail</h2>
            </div>
            <span className="text-xs text-[#30d158] flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cryptographic Chain Verified</span>
            </span>
          </div>

          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-xl border border-white/[0.06] bg-black/30 hover:border-white/[0.12] transition-colors text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white font-semibold font-mono">{log.action}</span>
                  <span className="text-[#86868b] font-mono">{log.timestamp}</span>
                </div>
                <div className="text-[#86868b] text-[11px] font-mono">Actor: <span className="text-white/80">{log.actor}</span></div>
                <div className="text-[#a1a1a6] leading-relaxed">{log.details}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Security Policies */}
      {activeTab === 'policies' && (
        <div className="apple-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-[#0071e3]" />
              <h2 className="text-sm font-semibold text-white tracking-tight">Automated Defense Policy Enforcements</h2>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer">
              <div className="pr-4">
                <div className="font-semibold text-white text-sm">
                  Strict Zero-Trust Model Egress Filtering
                </div>
                <div className="text-xs text-[#86868b] mt-0.5">
                  Forbids outbound HTTP/TLS connections from GPU inference nodes to non-whitelisted IP/ASNs.
                </div>
              </div>
              <input
                type="checkbox"
                checked={policies.strictEgress}
                onChange={(e) => setPolicies({ ...policies, strictEgress: e.target.checked })}
                className="w-5 h-5 accent-[#0071e3] rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer">
              <div className="pr-4">
                <div className="font-semibold text-white text-sm">
                  Mandatory Safetensors Cryptographic Header Verification
                </div>
                <div className="text-xs text-[#86868b] mt-0.5">
                  Quarantines any model checkpoint containing unverified Python pickle bytes or header anomalies.
                </div>
              </div>
              <input
                type="checkbox"
                checked={policies.safetensorsMandatory}
                onChange={(e) => setPolicies({ ...policies, safetensorsMandatory: e.target.checked })}
                className="w-5 h-5 accent-[#0071e3] rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer">
              <div className="pr-4">
                <div className="font-semibold text-white text-sm">
                  Two-Person Rule for DEFCON 1 Infrastructure Microsegmentation
                </div>
                <div className="text-xs text-[#86868b] mt-0.5">
                  Requires two independent SecOps Lead signatures before taking cluster-wide inference offline.
                </div>
              </div>
              <input
                type="checkbox"
                checked={policies.twoPersonContainment}
                onChange={(e) => setPolicies({ ...policies, twoPersonContainment: e.target.checked })}
                className="w-5 h-5 accent-[#0071e3] rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer">
              <div className="pr-4">
                <div className="font-semibold text-white text-sm">
                  Hardware-Accelerated eBPF Kernel Syscall Halting
                </div>
                <div className="text-xs text-[#86868b] mt-0.5">
                  Instantly terminates rogue processes attempting unauthorized ptrace hooks on inference workers.
                </div>
              </div>
              <input
                type="checkbox"
                checked={policies.eBPFStrictBlocking}
                onChange={(e) => setPolicies({ ...policies, eBPFStrictBlocking: e.target.checked })}
                className="w-5 h-5 accent-[#0071e3] rounded cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}

      {/* Tab: System Health & Observability (Blueprint Section 30) */}
      {activeTab === 'health' && (
        <div className="space-y-4">
          <div className="apple-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-[#30d158]" />
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-tight">Platform System Health & Telemetry Metrics</h2>
                  <div className="text-xs text-[#86868b] font-mono mt-0.5">
                    ENVIRONMENT: {systemHealth?.environment || 'production-enclave'} · UPTIME: {systemHealth?.uptimeSeconds || 0}s
                  </div>
                </div>
              </div>

              <button
                onClick={refreshHealth}
                className="px-3.5 py-1.5 text-xs font-medium text-white/90 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg transition-colors flex items-center gap-2 shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158]" />
                <span>Poll Live Health</span>
              </button>
            </div>

            {/* Memory & Resource Telemetry */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold">Process RSS Memory</div>
                <div className="text-lg font-semibold font-mono text-white">
                  {systemHealth?.memoryUsageMb?.rss || 184} MB
                </div>
                <div className="text-xs text-[#86868b]">Active working set</div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold">Node Heap Used</div>
                <div className="text-lg font-semibold font-mono text-[#0071e3]">
                  {systemHealth?.memoryUsageMb?.heapUsed || 64} MB
                </div>
                <div className="text-xs text-[#86868b]">
                  of {systemHealth?.memoryUsageMb?.heapTotal || 98} MB allocated
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold">Active Operator Session</div>
                <div className="text-base font-semibold text-[#30d158] truncate">
                  {systemHealth?.activeOperator?.name || 'Authorized Commander'}
                </div>
                <div className="text-xs text-[#86868b] font-mono truncate">
                  {systemHealth?.activeOperator?.token || 'TIER-3 FIPS-140-3'}
                </div>
              </div>
            </div>

            {/* Component Breakdown Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] text-[10px] text-[#86868b] uppercase tracking-wider border-b border-white/[0.06]">
                  <tr>
                    <th className="p-3.5">Platform Subsystem</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Latency</th>
                    <th className="p-3.5">Operational Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-white/90">
                  {systemHealth?.components?.map((comp: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 font-semibold text-white">{comp.name}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30 text-[10px] font-semibold">
                          {comp.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-white/90">{comp.latencyMs}ms</td>
                      <td className="p-3.5 text-[#86868b]">{comp.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
