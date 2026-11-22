import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Zap,
  Server,
  ArrowRight,
  Eye,
  Cpu,
  Shield,
  Activity,
} from 'lucide-react';
import { Agent, Incident, SecurityEvent } from '../../core/types';
import { BLUE_FORCE_UNITS } from '../../core/agent-defense-engine';
import { sound } from '../../core/sound-fx';

interface BlueForceProps {
  incidents: Incident[];
  agents: Agent[];
  events: SecurityEvent[];
  onSelectIncident: (incidentId: string) => void;
  onContainIncident: (incidentId: string, action?: string) => Promise<any>;
}

export const BlueForce: React.FC<BlueForceProps> = ({
  incidents,
  agents,
  events,
  onSelectIncident,
  onContainIncident,
}) => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(incidents[0]?.id || '');
  const [isContaining, setIsContaining] = useState(false);
  const [containmentResult, setContainmentResult] = useState<string | null>(null);

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0];

  const handleExecuteContainment = async () => {
    if (!selectedIncident) return;
    sound.play('alert');
    setIsContaining(true);
    try {
      const res = await onContainIncident(
        selectedIncident.id,
        selectedIncident.containmentActionProposed
      );
      if (res.success) {
        setContainmentResult(`Successfully executed: ${res.containmentAction}`);
      }
    } finally {
      setIsContaining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="apple-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-[#86868b] font-medium tracking-wide">
                <span>BLUE FORCE DEFENSIVE OPERATIONS CENTER</span>
                <span className="text-white/20">·</span>
                <span className="text-[#30d158] font-semibold">HUMAN OVERSIGHT GATED</span>
              </div>
              <h1 className="text-xl font-semibold text-white tracking-tight">Active Containment & Defensive Command Deck</h1>
            </div>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 flex items-center gap-2 font-medium">
            <Shield className="w-4 h-4 text-[#0071e3]" />
            <span>{BLUE_FORCE_UNITS.length} DEFENSE UNITS DEPLOYED</span>
          </div>
        </div>
        <p className="text-xs text-[#86868b] leading-relaxed max-w-4xl">
          Active threat monitoring, automated defensive heuristic correlation, and human-authorized containment workflows. Consequential mitigations require explicit SecOps credential authorization.
        </p>
      </div>

      {/* Visual Blue Team Defenders Roster */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {BLUE_FORCE_UNITS.map((unit) => (
          <div key={unit.id} className="p-3.5 rounded-xl border border-white/[0.08] bg-[#111113] space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-[#f5f5f7] truncate">{unit.callsign}</div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#0a84ff]/15 text-[#64d2ff] uppercase font-semibold border border-[#0a84ff]/30 shrink-0">
                {unit.status}
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#30d158]">{unit.specialty}</div>
            <p className="text-[11px] text-[#86868b] leading-snug">{unit.responsibility}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Threat Pipeline (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#ff453a]" />
              <span>Prioritized Threat Pipeline</span>
            </span>
            <span className="text-xs text-[#86868b]">{incidents.length} Records</span>
          </h2>

          <div className="space-y-3">
            {incidents.map((inc) => {
              const isSelected = inc.id === selectedIncidentId;
              const isContained = inc.state === 'contained' || inc.state === 'resolved';

              return (
                <div
                  key={inc.id}
                  onClick={() => {
                    sound.play('click');
                    setSelectedIncidentId(inc.id);
                    setContainmentResult(null);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2.5 ${
                    isSelected
                      ? 'border-[#0071e3]/60 bg-white/[0.05] shadow-sm ring-1 ring-[#0071e3]/40'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-white">{inc.id}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-medium ${
                        isContained
                          ? 'bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30'
                          : inc.severity === 'critical'
                          ? 'bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/30'
                          : 'bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30'
                      }`}
                    >
                      {inc.state}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-white truncate">{inc.title}</h3>

                  <div className="flex items-center justify-between text-[11px] text-[#86868b] font-mono pt-2 border-t border-white/[0.06]">
                    <span>Severity: <strong className="text-white uppercase">{inc.severity}</strong></span>
                    <span>Assets Affected: <strong className="text-white">{inc.affectedAssets.length}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Defense Action Matrix & Containment Approval (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="apple-card p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div>
                <span className="text-xs font-medium text-[#86868b] tracking-wider uppercase">DEFENSIVE INVESTIGATION</span>
                <h3 className="text-base font-semibold text-white tracking-tight">{selectedIncident?.title}</h3>
              </div>
              <button
                onClick={() => {
                  sound.play('click');
                  onSelectIncident(selectedIncident?.id || '');
                }}
                className="text-xs text-[#0071e3] hover:text-[#409cff] flex items-center gap-1 font-medium transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Full Incident Dossier</span>
              </button>
            </div>

            {/* Context & Telemetry Summary */}
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2 text-xs">
              <div className="text-[#86868b] font-semibold uppercase tracking-wider text-[10px]">Incident Summary</div>
              <p className="text-white/90 leading-relaxed">{selectedIncident?.summary}</p>
            </div>

            {/* Proposed Containment Action */}
            <div className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white tracking-tight">PROPOSED AUTONOMOUS CONTAINMENT ACTION</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30 font-medium">
                  CONFIDENCE: 99.4%
                </span>
              </div>
              <p className="text-xs text-[#a1a1a6] bg-black/40 p-3.5 rounded-xl border border-white/[0.06] leading-relaxed">
                {selectedIncident?.containmentActionProposed || 'Isolate ingress worker node and execute BGP FlowSpec blackhole for destination ASN.'}
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <span className="text-xs text-[#86868b]">Requires SecOps Administrator Quorum Approval</span>
                <button
                  onClick={handleExecuteContainment}
                  disabled={isContaining || selectedIncident?.state === 'contained'}
                  className="px-4 py-2.5 text-xs font-semibold text-white bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isContaining ? 'Executing Mitigation...' : 'Authorize & Enforce Containment'}</span>
                </button>
              </div>

              {containmentResult && (
                <div className="p-3.5 rounded-xl bg-[#30d158]/10 border border-[#30d158]/30 text-[#30d158] text-xs flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-[#30d158] shrink-0" />
                  <span className="font-medium">{containmentResult}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
