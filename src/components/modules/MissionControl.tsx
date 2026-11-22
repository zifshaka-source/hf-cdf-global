import React, { useState } from 'react';
import {
  Radio,
  Shield,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Play,
  Layers,
} from 'lucide-react';
import { Mission } from '../../core/types';

interface MissionControlProps {
  missions: Mission[];
  onAuthorizeMission: (missionId: string) => Promise<any>;
}

export const MissionControl: React.FC<MissionControlProps> = ({
  missions,
  onAuthorizeMission,
}) => {
  const [selectedMissionId, setSelectedMissionId] = useState<string>(missions[0]?.id || '');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const selectedMission = missions.find((m) => m.id === selectedMissionId) || missions[0];

  const handleAuthorize = async () => {
    if (!selectedMission) return;
    setIsAuthorizing(true);
    try {
      await onAuthorizeMission(selectedMission.id);
    } finally {
      setIsAuthorizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            <span>Mission Control & Operational Rules of Engagement</span>
          </h1>
          <p className="text-xs text-slate-400">
            Strategic cyber operations authorization, Rules of Engagement (RoE), and executive oversight.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mission List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-semibold text-slate-400 font-mono">
            OPERATIONAL MISSIONS ({missions.length})
          </div>

          <div className="space-y-2.5">
            {missions.map((m) => {
              const isSelected = m.id === selectedMissionId;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMissionId(m.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'border-cyan-500/50 bg-cyan-950/30'
                      : 'border-white/10 bg-slate-900/40 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-cyan-400">{m.codeName}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded uppercase font-semibold ${
                        m.authorizationStatus === 'authorized' || m.authorizationStatus === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {m.authorizationStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-white">{m.title}</h3>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-white/5">
                    <span>Agents: {m.assignedAgents.length}</span>
                    <span>Risk Score: {m.riskAssessmentScore}/100</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Mission Briefing & Authorization (7 cols) */}
        {selectedMission && (
          <div className="lg:col-span-7 p-6 rounded-lg border border-white/10 bg-slate-900/50 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <div className="text-xs font-mono text-slate-500">
                  MISSION BRIEFING DOSSIER · {selectedMission.codeName}
                </div>
                <h2 className="text-base font-bold text-white">{selectedMission.title}</h2>
              </div>

              {selectedMission.authorizationStatus !== 'authorized' &&
                selectedMission.authorizationStatus !== 'active' && (
                  <button
                    onClick={handleAuthorize}
                    disabled={isAuthorizing}
                    className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded border border-red-500/50 flex items-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isAuthorizing ? 'Authorizing...' : 'Grant Operational Approval'}</span>
                  </button>
                )}
            </div>

            {/* Strategic Objectives */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 font-mono">
                MANDATORY OBJECTIVES
              </span>
              <ul className="space-y-1.5 text-xs text-slate-200">
                {selectedMission.objectives.map((obj, i) => (
                  <li
                    key={i}
                    className="p-2.5 rounded bg-black/30 border border-white/5 flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rules of Engagement */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 font-mono">
                RULES OF ENGAGEMENT (ROE)
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {selectedMission.rulesOfEngagement.map((roe, i) => (
                  <li
                    key={i}
                    className="p-2.5 rounded bg-black/20 border border-white/5 flex items-start gap-2"
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{roe}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3.5 rounded bg-white/5 border border-white/10 text-xs font-mono flex items-center justify-between text-slate-400">
              <span>Authorized By: {selectedMission.authorizedBy || 'Pending Signature'}</span>
              <span>Started: {selectedMission.startedAt.slice(0, 10)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
