import React, { useState } from 'react';
import {
  Flame,
  Shield,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Server,
  FileText,
} from 'lucide-react';
import { SimulationScenario } from '../../core/types';

interface SimulationLabProps {
  scenarios: SimulationScenario[];
  onRunSimulation: (scenarioId: string) => Promise<any>;
}

export const SimulationLab: React.FC<SimulationLabProps> = ({
  scenarios,
  onRunSimulation,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarios[0]?.id || '');
  const [isRunning, setIsRunning] = useState(false);
  const [runLogs, setRunLogs] = useState<any[]>([]);

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  const handleExecute = async () => {
    if (!selectedScenario) return;
    setIsRunning(true);
    try {
      const res = await onRunSimulation(selectedScenario.id);
      setRunLogs(res.logs || []);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <span>Attack Simulation Laboratory</span>
          </h1>
          <p className="text-xs text-slate-400">
            Isolated synthetic sandbox for adversarial testing against enterprise and sovereign model pipelines, weights vaults, and inference clusters.
          </p>
        </div>

        <button
          onClick={handleExecute}
          disabled={isRunning}
          className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded transition-colors flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          <span>{isRunning ? 'Simulating in Sandbox...' : 'Run Lab Test'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scenarios Grid (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-mono font-semibold text-slate-400">
            LAB SCENARIOS ({scenarios.length})
          </div>

          <div className="space-y-2.5">
            {scenarios.map((sc) => {
              const isSelected = sc.id === selectedScenarioId;
              return (
                <div
                  key={sc.id}
                  onClick={() => setSelectedScenarioId(sc.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all space-y-1.5 ${
                    isSelected
                      ? 'border-amber-500/50 bg-amber-950/30'
                      : 'border-white/10 bg-slate-900/40 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-amber-400">{sc.id}</span>
                    <span className="text-[10px] text-slate-400 uppercase">
                      {sc.riskLevel} Risk
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-white">{sc.title}</h3>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Target: {sc.targetEnvironment}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Execution Sandbox Viewer (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-lg border border-white/10 bg-slate-900/50 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <div className="text-xs font-mono text-slate-500">SANDBOX TARGET SPECIFICATION</div>
              <h3 className="text-sm font-semibold text-white">{selectedScenario?.title}</h3>
            </div>
            <span className="text-xs font-mono text-emerald-400">SANDBOX AIR-GAPPED</span>
          </div>

          <div className="p-3 rounded border border-white/5 bg-black/30 space-y-2 text-xs">
            <div className="text-slate-400 font-medium">Scenario Objective:</div>
            <p className="text-slate-200 leading-relaxed">{selectedScenario?.description}</p>
          </div>

          {/* Live Step Execution Output */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300 font-mono">
              REAL-TIME DETECTION & DEFENSE LOGS
            </div>

            {runLogs.length > 0 ? (
              <div className="space-y-2">
                {runLogs.map((log) => (
                  <div
                    key={log.step}
                    className="p-3 rounded border border-white/5 bg-black/40 text-xs font-mono space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-amber-400 font-bold">Step {log.step}</span>
                      <span className="text-emerald-400 uppercase font-semibold">
                        {log.outcome}
                      </span>
                    </div>
                    <div className="text-slate-200 font-sans">{log.action}</div>
                    <div className="text-[10px] text-slate-400">
                      MITRE Technique: {log.technique} · Defender: {log.detectedByBlueAgent || 'Sentry'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 font-mono border border-dashed border-white/10 rounded">
                Click "Run Lab Test" to simulate and observe automated agent defenses in action.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
