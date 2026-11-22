import React, { useState } from 'react';
import {
  Crosshair,
  Play,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  FileCheck,
  ShieldAlert,
  Layers,
  ArrowRight,
  Skull,
  Zap,
  Cpu,
  Flame,
  Radio,
} from 'lucide-react';
import { SimulationExecution, SimulationScenario } from '../../core/types';
import { RED_FORCE_UNITS } from '../../core/agent-defense-engine';
import { sound } from '../../core/sound-fx';

interface RedForceProps {
  scenarios: SimulationScenario[];
  onRunSimulation: (scenarioId: string) => Promise<SimulationExecution>;
}

export const RedForce: React.FC<RedForceProps> = ({ scenarios, onRunSimulation }) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarios[0]?.id || '');
  const [isRunning, setIsRunning] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<SimulationExecution | null>(null);

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  const handleRun = async () => {
    if (!selectedScenario) return;
    sound.play('alert');
    setIsRunning(true);
    try {
      const exec = await onRunSimulation(selectedScenario.id);
      setCurrentExecution(exec);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header & Sandbox Guardrail Banner */}
      <div className="apple-card p-6 space-y-3 border border-[#ff453a]/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff453a]/15 border border-[#ff453a]/35 flex items-center justify-center text-[#ff6961]">
              <Skull className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#ff6961] font-semibold">
                <span>RED FORCE ADVERSARIAL INTELLIGENCE DIVISION</span>
                <span className="text-white/20">·</span>
                <span className="text-[#30d158]">SIGNED SCOPE CONTRACT · ISOLATED SANDBOX</span>
              </div>
              <h1 className="text-xl font-bold text-[#f5f5f7] tracking-tight">Active Adversarial Emulation &amp; Control Validation</h1>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#0e0e10] border border-[#ff453a]/30 font-mono text-xs text-[#ff6961] flex items-center gap-2 shrink-0">
            <Flame className="w-4 h-4 text-[#ff453a]" />
            <span>{RED_FORCE_UNITS.length} SPECIALIZED RED UNITS ARMED</span>
          </div>
        </div>
        <p className="text-xs text-[#a1a1a6] leading-relaxed max-w-4xl">
          Executes controlled, non-destructive adversarial validation strictly within signed sandbox scopes with egress cutoffs and emergency-stop governance. Tests prompt injection resistance, tool boundary isolation, and Blue Force detection accuracy.
        </p>
      </div>

      {/* Specialized Red Force Agent Units Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {RED_FORCE_UNITS.map((unit) => (
          <div key={unit.id} className="p-3.5 rounded-xl border border-white/[0.08] bg-[#111113] space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#f5f5f7] truncate">{unit.callsign}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ff453a]/15 text-[#ff6961] uppercase border border-[#ff453a]/30 shrink-0">
                {unit.status}
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#ffb340]">{unit.specialty}</div>
            <p className="text-[11px] text-[#86868b] leading-snug">{unit.responsibility}</p>
          </div>
        ))}
      </div>

      {/* Main Grid: Scenarios & Attack Path Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Scenarios List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 font-mono">
            <Layers className="w-4 h-4 text-red-400" />
            <span>Adversarial Emulation Scenarios ({scenarios.length})</span>
          </h2>

          <div className="space-y-3">
            {scenarios.map((sc) => {
              const isSelected = sc.id === selectedScenarioId;
              return (
                <div
                  key={sc.id}
                  onClick={() => {
                    sound.play('click');
                    setSelectedScenarioId(sc.id);
                  }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all space-y-2.5 ${
                    isSelected
                      ? 'border-red-500/50 bg-red-950/30 shadow-lg shadow-red-950/40'
                      : 'border-white/10 bg-slate-900/40 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-red-400">{sc.id}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300">
                      {sc.category.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-100">{sc.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {sc.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-400 font-mono">
                    <span>Target: {sc.targetEnvironment}</span>
                    <span className="text-emerald-400">Success Rate: {sc.historicalSuccessRate}%</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {sc.mitreTechniques.map((tech) => (
                      <span
                        key={tech}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-300 border border-white/10"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Attack-Path Visualizer & Step Runner (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-lg border border-white/10 bg-slate-950 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <span className="text-xs font-mono text-slate-500">SELECTED TARGET SCENARIO</span>
                <h3 className="text-base font-semibold text-white">{selectedScenario?.title}</h3>
              </div>
              <button
                onClick={handleRun}
                disabled={isRunning}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded border border-red-500/50 shadow-lg shadow-red-900/30 transition-all flex items-center gap-2 font-mono"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isRunning ? 'Emulating...' : 'Launch Simulation'}</span>
              </button>
            </div>

            {/* Attack Path Visual Stepper */}
            <div className="space-y-3 font-mono">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Attack Path Execution Progression
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded border border-white/10 bg-black/50 space-y-1">
                  <div className="text-[10px] text-slate-500">STAGE 1 · RECON</div>
                  <div className="text-xs font-medium text-slate-200">Ingress Probing</div>
                  <div className="text-[10px] text-cyan-400">T1078 Valid Accounts</div>
                </div>
                <div className="p-3 rounded border border-white/10 bg-black/50 space-y-1">
                  <div className="text-[10px] text-slate-500">STAGE 2 · EXECUTION</div>
                  <div className="text-xs font-medium text-slate-200">Memory Dump Probe</div>
                  <div className="text-[10px] text-amber-400">T1059 Scripting</div>
                </div>
                <div className="p-3 rounded border border-white/10 bg-black/50 space-y-1">
                  <div className="text-[10px] text-slate-500">STAGE 3 · EXFILTRATION</div>
                  <div className="text-xs font-medium text-slate-200">Chunked Socket Out</div>
                  <div className="text-[10px] text-red-400">T1041 C2 Exfiltration</div>
                </div>
              </div>
            </div>

            {/* Execution Result Log */}
            {currentExecution && (
              <div className="p-4 rounded-lg bg-black/80 border border-red-500/30 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-red-400 font-bold">EMULATION EXECUTION TRACE #{currentExecution.id}</span>
                  <span className="text-emerald-400">{currentExecution.status.toUpperCase()} (Step {currentExecution.currentStep}/{currentExecution.totalSteps})</span>
                </div>
                <div className="space-y-2 text-slate-300">
                  {currentExecution.afterActionReview && (
                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-white/10 text-[11px]">
                      <div>Detection Rate: <span className="text-cyan-400 font-bold">{currentExecution.afterActionReview.detectionRate}%</span></div>
                      <div>Containment Latency: <span className="text-amber-400 font-bold">{currentExecution.afterActionReview.containmentLatencySeconds}s</span></div>
                    </div>
                  )}
                  <div className="space-y-1">
                    {currentExecution.logs.map((log, idx) => (
                      <div key={idx} className="text-[11px] text-slate-300 flex items-start gap-2 bg-black/40 p-1.5 rounded border border-white/5">
                        <span className="text-cyan-400 font-bold">[{log.timestamp}]</span>
                        <span className="text-slate-200">{log.action} ({log.technique})</span>
                        <span className="ml-auto text-emerald-400">{log.outcome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
