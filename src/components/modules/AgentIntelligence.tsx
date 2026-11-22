import React, { useState } from 'react';
import {
  Plus,
  Play,
  Pause,
  RotateCcw,
  Cpu,
  Zap,
  Activity,
  CheckCircle2,
  Sliders,
  Shield,
  Layers,
} from 'lucide-react';
import { Agent, AgentStatus } from '../../core/types';

interface AgentIntelligenceProps {
  agents: Agent[];
  onUpdateAgentStatus: (agentId: string, status: AgentStatus) => Promise<any>;
  onCreateAgent: (agentData: Partial<Agent>) => Promise<any>;
}

export const AgentIntelligence: React.FC<AgentIntelligenceProps> = ({
  agents,
  onUpdateAgentStatus,
  onCreateAgent,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('Perimeter Sentry');
  const [newAgentDesc, setNewAgentDesc] = useState('');

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName) return;
    await onCreateAgent({
      name: newAgentName,
      role: newAgentRole as any,
      description: newAgentDesc,
    });
    setShowCreateModal(false);
    setNewAgentName('');
    setNewAgentDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <span>Autonomous Defense Agent Swarm Registry</span>
          </h1>
          <p className="text-xs text-slate-400">
            Autonomous multi-agent lifecycle, cognitive capability registry, and execution telemetry.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded border border-indigo-500/40 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Agent</span>
        </button>
      </div>

      {/* Main Grid: Agent Cards & Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Agent Roster (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-semibold text-slate-400 font-mono flex items-center justify-between">
            <span>REGISTERED AGENTS ({agents.length})</span>
            <span className="text-emerald-400 font-normal">
              {agents.filter((a) => a.status === 'active').length} ACTIVE
            </span>
          </div>

          <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
            {agents.map((ag) => {
              const isSelected = ag.id === selectedAgentId;
              return (
                <div
                  key={ag.id}
                  onClick={() => setSelectedAgentId(ag.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'border-indigo-500/50 bg-indigo-950/30 shadow-lg shadow-indigo-950/40'
                      : 'border-white/10 bg-slate-900/40 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg border border-indigo-500/30 overflow-hidden shrink-0 bg-black">
                        <img
                          src={ag.avatarUrl || '/src/assets/images/cyber_agent_portrait_1794163023777.jpg'}
                          alt={ag.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{ag.name}</div>
                        <div className="text-[11px] text-indigo-300 font-mono">{ag.role}</div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                        ag.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : ag.status === 'investigating'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          : 'bg-slate-800 text-slate-400 border border-white/5'
                      }`}
                    >
                      {ag.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {ag.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1.5 border-t border-white/5">
                    <span>Precision: {ag.precisionRate}%</span>
                    <span>Health: {ag.health}%</span>
                    <span>Tasks: {ag.tasksCompleted}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Agent Dossier & Controls (7 cols) */}
        {selectedAgent && (
          <div className="lg:col-span-7 space-y-5">
            <div className="p-6 rounded-lg border border-white/10 bg-slate-900/50 space-y-6">
              {/* Agent Title & Action Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg border border-indigo-500/30 overflow-hidden shrink-0 bg-black">
                    <img
                      src={selectedAgent.avatarUrl || '/src/assets/images/cyber_agent_portrait_1794163023777.jpg'}
                      alt={selectedAgent.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">{selectedAgent.name}</h2>
                      <span className="text-xs font-mono text-indigo-400">
                        [{selectedAgent.codeName}]
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Role: {selectedAgent.role} · Auth: {selectedAgent.authorizationLevel.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedAgent.status === 'active' ? (
                    <button
                      onClick={() => onUpdateAgentStatus(selectedAgent.id, 'paused')}
                      className="px-3 py-1.5 text-xs font-mono text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded flex items-center gap-1.5"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Agent</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateAgentStatus(selectedAgent.id, 'active')}
                      className="px-3 py-1.5 text-xs font-mono text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Activate</span>
                    </button>
                  )}
                  <button
                    onClick={() => onUpdateAgentStatus(selectedAgent.id, 'standby')}
                    className="px-3 py-1.5 text-xs font-mono text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Standby</span>
                  </button>
                </div>
              </div>

              {/* Cognitive Telemetry & Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded border border-white/5 bg-black/30 space-y-1">
                  <div className="text-slate-500 text-[10px]">HEALTH METRIC</div>
                  <div className="text-base font-bold text-emerald-400 tabular-nums">
                    {selectedAgent.health}%
                  </div>
                  <div className="text-[10px] text-slate-400">Nominal State</div>
                </div>
                <div className="p-3 rounded border border-white/5 bg-black/30 space-y-1">
                  <div className="text-slate-500 text-[10px]">MEAN LATENCY</div>
                  <div className="text-base font-bold text-cyan-400 tabular-nums">
                    {selectedAgent.meanResponseTimeMs}ms
                  </div>
                  <div className="text-[10px] text-slate-400">Per Heuristic</div>
                </div>
                <div className="p-3 rounded border border-white/5 bg-black/30 space-y-1">
                  <div className="text-slate-500 text-[10px]">PRECISION RATE</div>
                  <div className="text-base font-bold text-indigo-400 tabular-nums">
                    {selectedAgent.precisionRate}%
                  </div>
                  <div className="text-[10px] text-slate-400">Verified Findings</div>
                </div>
                <div className="p-3 rounded border border-white/5 bg-black/30 space-y-1">
                  <div className="text-slate-500 text-[10px]">TOKEN LOAD</div>
                  <div className="text-base font-bold text-white tabular-nums">
                    {selectedAgent.resourceUtilization.tokensPerHour.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">Tokens / Hour</div>
                </div>
              </div>

              {/* Capabilities Inventory */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300 font-mono flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Enacted Capabilities</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedAgent.capabilities.map((cap, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 text-xs font-mono text-slate-200 bg-white/5 border border-white/10 rounded flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                      <span>{cap}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Architecture & Model Engine */}
              <div className="p-4 rounded border border-white/5 bg-black/20 space-y-2 text-xs">
                <div className="text-slate-400 font-medium">Underlying Model Engine:</div>
                <div className="font-mono text-indigo-300">{selectedAgent.modelEngine}</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Fine-tuned cybersecurity specialized model hosted on internal inference clusters with strict context window boundaries and verified tool invocations.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Provision Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-lg border border-white/10 bg-slate-900 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Provision New Defensive Agent</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ESC
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Agent Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cerberus-Ingress"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded text-slate-100 focus:outline-none focus:border-indigo-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Role</label>
                <select
                  value={newAgentRole}
                  onChange={(e) => setNewAgentRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded text-slate-100 focus:outline-none focus:border-indigo-400 font-mono"
                >
                  <option value="Perimeter Sentry">Perimeter Sentry</option>
                  <option value="Behavioral Heuristics">Behavioral Heuristics</option>
                  <option value="Forensic Timeline">Forensic Timeline</option>
                  <option value="Threat Intelligence Correlation">
                    Threat Intelligence Correlation
                  </option>
                  <option value="Containment Executor">Containment Executor</option>
                  <option value="Model Security Auditor">Model Security Auditor</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe operational objective..."
                  value={newAgentDesc}
                  onChange={(e) => setNewAgentDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded text-slate-100 focus:outline-none focus:border-indigo-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded border border-white/10 text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Provision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
