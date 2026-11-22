import React, { useState, useEffect } from 'react';
import {
  Layers,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  Shield,
  Lock,
  RefreshCw,
  UserCheck,
  Zap,
  Activity,
  Terminal,
  Clock,
  Cpu,
} from 'lucide-react';
import { api } from '../../services/api';
import { sound } from '../../core/sound-fx';

interface TaskNode {
  id: string; // T1 to T8
  name: string;
  assignedAgent: string;
  role: string;
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'awaiting_approval' | 'failed';
  requiresHumanApproval: boolean;
  inputSummary: string;
  outputPayload: string;
  modelEngine: string;
  latencyMs: number;
  toolCalls: string[];
  completedAt?: string;
}

interface WorkflowData {
  id: string;
  title: string;
  description: string;
  incidentId: string;
  status: 'idle' | 'running' | 'awaiting_approval' | 'completed';
  currentStepIndex: number;
  tasks: TaskNode[];
  startedAt?: string;
  completedAt?: string;
  approver?: string;
}

export const AgentOrchestration: React.FC = () => {
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('T7');
  const [isProcessing, setIsProcessing] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');

  const fetchWorkflowData = async () => {
    try {
      const [wfs, user] = await Promise.all([api.getWorkflows(), api.getCurrentUser()]);
      if (wfs && wfs.length > 0) {
        setWorkflow(wfs[0]);
      }
      setCurrentUser(user);
    } catch (err) {
      console.error('Failed to load orchestration workflow:', err);
    }
  };

  useEffect(() => {
    fetchWorkflowData();
  }, []);

  const handleApproveT7 = async () => {
    if (!workflow) return;
    setIsProcessing(true);
    sound.play('alert');
    try {
      const res = await api.approveWorkflow(workflow.id);
      if (res.workflow) {
        setWorkflow(res.workflow);
        setSelectedTaskId('T8');
        sound.play('success');
      }
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    if (!workflow) return;
    setIsProcessing(true);
    sound.play('click');
    try {
      const res = await api.resetWorkflow(workflow.id);
      setWorkflow(res);
      setSelectedTaskId('T1');
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStepForward = () => {
    if (!workflow) return;
    sound.play('click');
    const updated = { ...workflow };
    const nextIdx = Math.min(workflow.tasks.length, workflow.currentStepIndex + 1);

    updated.currentStepIndex = nextIdx;
    updated.tasks.forEach((t, i) => {
      if (i < nextIdx) {
        if (t.id === 'T7' && updated.status !== 'completed') {
          t.status = 'awaiting_approval';
        } else {
          t.status = 'completed';
        }
      } else if (i === nextIdx) {
        t.status = 'running';
      } else {
        t.status = 'pending';
      }
    });

    if (nextIdx >= 7 && updated.status !== 'completed') {
      updated.status = 'awaiting_approval';
      setSelectedTaskId('T7');
    } else if (nextIdx >= 8) {
      updated.status = 'completed';
    }

    setWorkflow(updated);
  };

  const selectedTask = workflow?.tasks.find((t) => t.id === selectedTaskId) || workflow?.tasks[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>Multi-Agent Swarm Orchestration Engine</span>
          </h1>
          <p className="text-xs text-slate-400">
            Durable directed acyclic graph (DAG) coordinating 8 specialized AI agents with policy-enforced human approval gates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleStepForward}
            disabled={!workflow || workflow.status === 'completed' || isProcessing}
            className="px-3 py-1.5 text-xs font-mono text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-950"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Step Next Agent Task</span>
          </button>
          <button
            onClick={handleReset}
            disabled={isProcessing}
            className="px-3 py-1.5 text-xs font-mono text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Workflow</span>
          </button>
        </div>
      </div>

      {/* Blueprint Architecture Banner */}
      <div className="p-4 rounded-lg border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-950 to-indigo-950/40 text-xs font-mono flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-300 font-bold">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>ACTIVE 8-STAGE DEPENDENCY GRAPH (T1 → T8)</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-300 font-normal">INCIDENT INC-2026-084</span>
          </div>
          <div className="text-[11px] text-slate-400 font-sans">
            T1 (Detection) → [T2 (CTI) & T3 (Correlation)] → T4 (Investigation) → T5 (Risk) → T6 (Response Plan) → T7 (Human Gate) → T8 (Execution).
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3 py-1.5 rounded bg-black/50 border border-white/10 text-right">
            <div className="text-[10px] text-slate-400">OPERATOR CREDENTIALS</div>
            <div className="text-xs text-emerald-400 font-bold">
              {currentUser?.name || 'Authorized Commander'} ({currentUser?.role || 'authorized_commander'})
            </div>
          </div>
        </div>
      </div>

      {/* 8-Stage Interactive Dependency DAG Grid */}
      <div className="p-6 rounded-lg border border-white/10 bg-slate-900/50 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-slate-300 uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Swarm Execution Pipeline: {workflow?.title}</span>
          </span>
          <span className="text-xs font-mono text-cyan-400 font-bold">
            STATUS: {workflow?.status.toUpperCase()} · STEP {workflow?.currentStepIndex || 0} OF 8
          </span>
        </div>

        {/* 8-Step Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {workflow?.tasks.map((task, idx) => {
            const isCompleted = task.status === 'completed';
            const isAwaiting = task.status === 'awaiting_approval';
            const isRunning = task.status === 'running';
            const isSelected = selectedTaskId === task.id;

            return (
              <div
                key={task.id}
                onClick={() => {
                  sound.play('click');
                  setSelectedTaskId(task.id);
                }}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all space-y-2 relative flex flex-col justify-between ${
                  isSelected
                    ? 'ring-2 ring-indigo-400 bg-indigo-950/60 border-indigo-400 shadow-xl'
                    : isAwaiting
                    ? 'border-amber-500/60 bg-amber-950/30 animate-pulse'
                    : isCompleted
                    ? 'border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-400/60'
                    : isRunning
                    ? 'border-cyan-500/60 bg-cyan-950/40 ring-1 ring-cyan-400'
                    : 'border-white/10 bg-black/40 opacity-60 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono pb-1 border-b border-white/5">
                    <span className="text-indigo-400 font-bold">{task.id}</span>
                    <span
                      className={`font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded ${
                        isCompleted
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : isAwaiting
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                          : isRunning
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="font-semibold text-xs text-white pt-1 line-clamp-1">
                    {task.name.split(':')[1]?.trim() || task.name}
                  </div>

                  <div className="text-[11px] font-mono text-indigo-300 flex items-center gap-1 pt-1">
                    <Cpu className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="truncate">{task.assignedAgent}</span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 pt-1 leading-relaxed">
                    {task.inputSummary}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-white/5">
                  <span>DEP: {task.dependencies.join(', ')}</span>
                  <span>{task.latencyMs > 0 ? `${task.latencyMs}ms` : 'GATE'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Inspection & Human Gate Dossier */}
      {selectedTask && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Task Specification & Live Telemetry (7 cols) */}
          <div className="lg:col-span-7 p-6 rounded-lg border border-white/10 bg-slate-900/50 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white">
                  Task Inspection Trace: {selectedTask.id} — {selectedTask.name}
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">MODEL: {selectedTask.modelEngine}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">Assigned Agent & Role</div>
                <div className="text-slate-200 font-semibold flex items-center gap-2 pt-0.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{selectedTask.assignedAgent}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-cyan-400 font-mono text-[11px]">{selectedTask.role}</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">Context Input Summary</div>
                <p className="text-slate-300 leading-relaxed pt-0.5">{selectedTask.inputSummary}</p>
              </div>

              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">Authorized Tools Called</div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedTask.toolCalls.map((tool) => (
                    <span
                      key={tool}
                      className="px-2 py-0.5 text-[10px] font-mono bg-black/60 border border-white/10 text-cyan-300 rounded"
                    >
                      {tool}()
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">
                  Structured Output Payload (JSON IPC)
                </div>
                <pre className="p-3 rounded bg-black/70 text-[11px] font-mono text-emerald-300 border border-white/5 overflow-x-auto mt-1">
                  {selectedTask.outputPayload}
                </pre>
              </div>
            </div>
          </div>

          {/* Right: Human Authorization Gate or Action Card (5 cols) */}
          <div className="lg:col-span-5 p-6 rounded-lg border border-white/10 bg-slate-900/50 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                <Lock className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Policy Authorization & Gatekeeper</h3>
              </div>

              {selectedTask.id === 'T7' ? (
                <div className="space-y-3">
                  <div className="p-3 rounded bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
                    <span className="font-bold">CRITICAL ENCLAVE DIRECTIVE:</span> Task T7 enforces policy-mandated
                    human sign-off before T8 automated microsegmentation and process termination can execute.
                  </div>

                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="text-slate-400 text-[11px]">REQUIRED AUTHORIZATION TIER:</div>
                    <div className="text-white font-bold">SecOps Lead or Security Administrator</div>
                    <div className="text-slate-400 text-[11px] pt-1">CURRENT OPERATOR:</div>
                    <div className="text-cyan-400 font-bold">{currentUser?.name}</div>
                    <div className="text-slate-500 text-[10px]">
                      TOKEN: {currentUser?.hardwareToken || 'TIER-3 FIPS-140-3'}
                    </div>
                  </div>

                  {workflow?.status === 'completed' ? (
                    <div className="p-3 rounded bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Approved & Signed by {workflow.approver || currentUser?.name}. T8 Enforced.</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleApproveT7}
                      disabled={isProcessing}
                      className="w-full py-2.5 px-4 rounded bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-red-950/50 flex items-center justify-center gap-2"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Sign & Authorize T8 Execution</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-xs text-slate-300">
                  <p className="leading-relaxed">
                    Task <span className="font-mono text-indigo-300 font-bold">{selectedTask.id}</span> operates under
                    autonomous agent policy governance.
                  </p>
                  <div className="p-3 rounded bg-black/40 border border-white/5 space-y-1 text-[11px] font-mono">
                    <div className="text-slate-400">EXECUTION STATUS: {selectedTask.status.toUpperCase()}</div>
                    <div className="text-slate-400">
                      COMPLETED AT: {selectedTask.completedAt || 'In sequence'}
                    </div>
                    <div className="text-slate-400">LATENCY: {selectedTask.latencyMs}ms</div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-[10px] font-mono text-slate-500 pt-3 border-t border-white/5 flex items-center justify-between">
              <span>HF-CDF ORCHESTRATION ENGINE</span>
              <span>DURABLE DAG v2.4</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
