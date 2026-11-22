import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Cpu,
  Code2,
  Sliders,
  Radio,
  Zap,
  Play,
  Pause,
  Send,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Layers,
  Server,
  Plus,
  Shield,
  Clock,
} from 'lucide-react';
import { Agent, NetworkNode, SecurityEvent } from '../../core/types';
import {
  DeveloperRule,
  INITIAL_DEVELOPER_RULES,
  ClusterResourceMetrics,
  INITIAL_CLUSTER_METRICS,
} from '../../core/live-engine';
import { executeDeveloperCommand } from '../../core/security-engine';

interface DeveloperWorkbenchProps {
  agents: Agent[];
  nodes: NetworkNode[];
  events: SecurityEvent[];
  defcon: number;
  onOverrideDefcon: (level: number) => void;
  onInjectEvent: (signature?: string) => void;
  onToggleNodeIsolation: (nodeId: string) => Promise<any>;
  onUpdateAgentStatus: (agentId: string, status: any) => Promise<any>;
}

export const DeveloperWorkbench: React.FC<DeveloperWorkbenchProps> = ({
  agents,
  nodes,
  events,
  defcon,
  onOverrideDefcon,
  onInjectEvent,
  onToggleNodeIsolation,
  onUpdateAgentStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'cli' | 'rules' | 'hyperparams' | 'cluster' | 'chaos' | 'webhooks'>('cli');

  // CLI State
  const [cliHistory, setCliHistory] = useState<string[]>([
    'CDF Developer & SecOps Sovereign Operations Terminal v2.4-ENTERPRISE',
    'Connected to cluster: global-inference-apex-01 · Auth: authorized-commander',
    'Type "help" to view available internal commands.',
  ]);
  const [cliInput, setCliInput] = useState('');
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Dynamic Rule Studio State
  const [rules, setRules] = useState<DeveloperRule[]>(INITIAL_DEVELOPER_RULES);
  const [selectedRuleId, setSelectedRuleId] = useState<string>(rules[0]?.id || '');
  const [ruleTestResult, setRuleTestResult] = useState<string | null>(null);

  // Cluster Telemetry State
  const [clusterMetrics, setClusterMetrics] = useState<ClusterResourceMetrics>(INITIAL_CLUSTER_METRICS);

  // Dynamic Live Simulation Tick State
  const [simActive, setSimActive] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(3000); // 3s tick

  // Webhook Dispatcher State
  const [webhookUrl, setWebhookUrl] = useState('https://siem-collector.internal.cyberdefense.org/v1/alerts');
  const [webhookPayload, setWebhookPayload] = useState('{\n  "event": "CRITICAL_MODEL_EXFILTRATION",\n  "severity": "CRITICAL",\n  "asn": 41382,\n  "action": "MICROSEGMENTED"\n}');
  const [webhookResponse, setWebhookResponse] = useState<string | null>(null);

  // Agent Hyperparameters State
  const [agentHyperparams, setAgentHyperparams] = useState<Record<string, { sensitivity: number; throughputLimit: number; thinkingLevel: string }>>({
    'agent-sentinel': { sensitivity: 95, throughputLimit: 25000, thinkingLevel: 'LOW' },
    'agent-aegis': { sensitivity: 92, throughputLimit: 40000, thinkingLevel: 'MEDIUM' },
    'agent-cortex': { sensitivity: 88, throughputLimit: 60000, thinkingLevel: 'HIGH' },
    'agent-cipher-audit': { sensitivity: 99, throughputLimit: 30000, thinkingLevel: 'HIGH' },
  });

  // Dynamic Simulation Ticker (Simulates live company telemetry fluctuations)
  useEffect(() => {
    if (!simActive) return;

    const interval = setInterval(() => {
      setClusterMetrics((prev) => ({
        ...prev,
        gpuClusterUtilization: Math.min(98, Math.max(55, +(prev.gpuClusterUtilization + (Math.random() * 4 - 2)).toFixed(1))),
        ingressBandwidthMbps: +(1400 + Math.random() * 80).toFixed(1),
        egressBandwidthMbps: +(80 + Math.random() * 25).toFixed(1),
        grpcLatencyP99Ms: +(40 + Math.random() * 6).toFixed(1),
      }));
    }, simSpeed);

    return () => clearInterval(interval);
  }, [simActive, simSpeed]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [cliHistory]);

  const handleCliSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;

    const cmd = cliInput;
    setCliHistory((prev) => [...prev, `$ ${cmd}`]);
    setCliInput('');

    const context = {
      agentsCount: agents.length,
      uncontainedIncidents: 1,
      defcon,
      isolatedNodesCount: nodes.filter((n) => n.status === 'isolated').length,
    };

    const res = executeDeveloperCommand(cmd, context);

    if (res.action === 'clear') {
      setCliHistory([]);
      return;
    }

    if (res.action === 'override_defcon' && typeof res.param === 'number') {
      onOverrideDefcon(res.param);
    } else if (res.action === 'inject_threat' && typeof res.param === 'string') {
      onInjectEvent(res.param);
    } else if (res.action === 'isolate_node' && typeof res.param === 'string') {
      onToggleNodeIsolation(res.param);
    } else if (res.action === 'restart_agent' && typeof res.param === 'string') {
      onUpdateAgentStatus(res.param, 'active');
    }

    if (res.output) {
      setCliHistory((prev) => [...prev, res.output]);
    }
  };

  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleTestRule = (rule: DeveloperRule) => {
    setRuleTestResult(
      `[RULE VERIFIED] Evaluated "${rule.name}" against live ring-buffer: 2 matches detected. Zero syntax errors in AST parser.`
    );
  };

  const handleDispatchWebhook = () => {
    setWebhookResponse(`[HTTP 200 OK] Successfully dispatched alert to ${webhookUrl} at ${new Date().toISOString()}. Latency: 34ms.`);
  };

  return (
    <div className="space-y-6">
      {/* Developer Banner */}
      <div className="p-5 rounded-lg border border-cyan-500/30 bg-slate-950 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold">
            <Terminal className="w-4 h-4" />
            <span>DEVELOPER & COMPANY SECURITY PLATFORM CONSOLE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              INTERNAL COMPANY OPS
            </span>
            <button
              onClick={() => setSimActive(!simActive)}
              className={`px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1.5 transition-colors ${
                simActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-white/5 text-slate-400 border border-white/10'
              }`}
            >
              {simActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{simActive ? 'Live Telemetry Engine (ON)' : 'Engine Paused'}</span>
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          Direct engineering interface for platform developers, SecOps architects, and company administrators. Manage real-time eBPF probes, Sigma rule compilation, agent cognitive tuning, and cluster resource quotas.
        </p>
      </div>

      {/* Developer Mode Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded border border-white/10 text-xs font-mono overflow-x-auto">
        <button
          onClick={() => setActiveTab('cli')}
          className={`px-3.5 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'cli' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>cdf-cli</span>
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-3.5 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'rules' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Rule Studio (Sigma/eBPF)</span>
        </button>
        <button
          onClick={() => setActiveTab('hyperparams')}
          className={`px-3.5 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'hyperparams' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Swarm Hyperparameters</span>
        </button>
        <button
          onClick={() => setActiveTab('cluster')}
          className={`px-3.5 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'cluster' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Cluster & GPU Telemetry</span>
        </button>
        <button
          onClick={() => setActiveTab('chaos')}
          className={`px-3.5 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'chaos' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Chaos Threat Injector</span>
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`px-3.5 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'webhooks' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Webhook Dispatcher</span>
        </button>
      </div>

      {/* TAB 1: Developer CLI Terminal */}
      {activeTab === 'cli' && (
        <div className="rounded-lg border border-white/10 bg-slate-950 p-4 space-y-3 font-mono text-xs shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-slate-400 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-slate-300 font-semibold ml-2">cdf-cli (bash / pty0)</span>
            </div>
            <span className="text-cyan-400">SESSION: ROOT SEC-OPS</span>
          </div>

          <div ref={terminalContainerRef} className="min-h-[340px] max-h-[460px] overflow-y-auto space-y-1.5 text-slate-300 pr-2">
            {cliHistory.map((line, idx) => (
              <div
                key={idx}
                className={
                  line.startsWith('$')
                    ? 'text-cyan-300 font-bold'
                    : line.startsWith('[OVERRIDE') || line.startsWith('[EXEC')
                    ? 'text-emerald-400'
                    : line.startsWith('[ERROR')
                    ? 'text-red-400'
                    : 'text-slate-300 whitespace-pre-wrap'
                }
              >
                {line}
              </div>
            ))}
          </div>

          <form onSubmit={handleCliSubmit} className="flex items-center gap-2 pt-2 border-t border-white/10">
            <span className="text-cyan-400 font-bold">$</span>
            <input
              type="text"
              value={cliInput}
              onChange={(e) => setCliInput(e.target.value)}
              placeholder="e.g. status, defcon set 2, agent restart sentinel-0, rules test RULE-SIGMA-01..."
              className="flex-1 bg-transparent text-white placeholder-slate-600 focus:outline-none font-mono text-xs"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-[11px]"
            >
              RUN
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: Rule Studio (Sigma & eBPF) */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-semibold text-slate-300 font-mono flex items-center justify-between">
              <span>ACTIVE DETECTION RULES ({rules.length})</span>
              <span className="text-cyan-400">YARA-L / SIGMA / EBPF</span>
            </div>

            <div className="space-y-2.5">
              {rules.map((rule) => {
                const isSelected = rule.id === selectedRuleId;
                return (
                  <div
                    key={rule.id}
                    onClick={() => {
                      setSelectedRuleId(rule.id);
                      setRuleTestResult(null);
                    }}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all space-y-2 ${
                      isSelected
                        ? 'border-cyan-500/50 bg-cyan-950/30 ring-1 ring-cyan-400'
                        : 'border-white/10 bg-slate-900/40 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-cyan-400">{rule.id}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRule(rule.id);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          rule.enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {rule.enabled ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>

                    <h4 className="text-xs font-semibold text-white">{rule.name}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {rule.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-white/5">
                      <span>Matches: {rule.matchesCount}</span>
                      <span>Last: {rule.lastMatched}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 p-6 rounded-lg border border-white/10 bg-slate-900/50 space-y-4">
            {rules.find((r) => r.id === selectedRuleId) && (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500">SYNTAX PARSER & DRY-RUN</span>
                    <h3 className="text-sm font-bold text-white">
                      {rules.find((r) => r.id === selectedRuleId)?.name}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleTestRule(rules.find((r) => r.id === selectedRuleId)!)}
                    className="px-3 py-1.5 text-xs font-mono text-slate-950 font-bold bg-cyan-400 hover:bg-cyan-300 rounded flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3" />
                    <span>Dry-Run Test</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-slate-400">RULE DEFINITION CODE</span>
                  <pre className="p-4 rounded-lg bg-black/60 border border-white/10 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                    {rules.find((r) => r.id === selectedRuleId)?.expression}
                  </pre>
                </div>

                {ruleTestResult && (
                  <div className="p-3.5 rounded border border-cyan-500/30 bg-cyan-950/30 text-cyan-200 text-xs font-mono">
                    {ruleTestResult}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Swarm Hyperparameter Tuning */}
      {activeTab === 'hyperparams' && (
        <div className="p-6 rounded-lg border border-white/10 bg-slate-900/50 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="text-sm font-bold text-white">Agent Cognitive Tuning & Rate Throttles</h3>
              <p className="text-xs text-slate-400">
                Adjust anomaly sensitivity thresholds, thinking budget allocations, and token consumption limits per agent.
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400">HOT-RELOAD ENGINE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {Object.entries(agentHyperparams).map(([agentId, config]) => {
              const agentObj = agents.find((a) => a.id === agentId);
              return (
                <div key={agentId} className="p-4 rounded-lg border border-white/10 bg-black/30 space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{agentObj?.name || agentId}</span>
                    <span className="text-[10px] text-cyan-300">{agentObj?.role}</span>
                  </div>

                  {/* Slider: Sensitivity */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Anomaly Detection Threshold:</span>
                      <span className="text-white font-bold">{config.sensitivity}%</span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={99}
                      value={config.sensitivity}
                      onChange={(e) =>
                        setAgentHyperparams({
                          ...agentHyperparams,
                          [agentId]: { ...config, sensitivity: +e.target.value },
                        })
                      }
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Throughput */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Max Token Throughput Limit:</span>
                      <span className="text-white font-bold">{config.throughputLimit.toLocaleString()} /hr</span>
                    </div>
                    <input
                      type="range"
                      min={5000}
                      max={100000}
                      step={5000}
                      value={config.throughputLimit}
                      onChange={(e) =>
                        setAgentHyperparams({
                          ...agentHyperparams,
                          [agentId]: { ...config, throughputLimit: +e.target.value },
                        })
                      }
                      className="w-full accent-indigo-400"
                    />
                  </div>

                  {/* Thinking Level */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-slate-400">Cognitive Thinking Level:</span>
                    <select
                      value={config.thinkingLevel}
                      onChange={(e) =>
                        setAgentHyperparams({
                          ...agentHyperparams,
                          [agentId]: { ...config, thinkingLevel: e.target.value },
                        })
                      }
                      className="px-2 py-1 bg-slate-900 border border-white/10 rounded text-cyan-300 text-[11px]"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Cluster & GPU Telemetry */}
      {activeTab === 'cluster' && (
        <div className="p-6 rounded-lg border border-white/10 bg-slate-900/50 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="text-sm font-bold text-white">Global Supercluster & GPU Telemetry</h3>
              <p className="text-xs text-slate-400">
                Live monitoring of NVIDIA H100 & B200 GPU superclusters hosting multi-cloud and sovereign foundational model workloads.
              </p>
            </div>
            <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>CLUSTER TELEMETRY LIVE</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-4 rounded border border-white/5 bg-black/40 space-y-1">
              <div className="text-slate-400">GPU CLUSTER UTILIZATION</div>
              <div className="text-2xl font-bold text-cyan-400 tabular-nums">
                {clusterMetrics.gpuClusterUtilization}%
              </div>
              <div className="text-[10px] text-slate-500">Across 8x H100 Nodes</div>
            </div>

            <div className="p-4 rounded border border-white/5 bg-black/40 space-y-1">
              <div className="text-slate-400">VRAM ALLOCATION</div>
              <div className="text-2xl font-bold text-indigo-400 tabular-nums">
                {clusterMetrics.gpuVramUsedGb} <span className="text-xs text-slate-500">/ {clusterMetrics.gpuVramTotalGb} GB</span>
              </div>
              <div className="text-[10px] text-slate-500">High-Bandwidth HBM3</div>
            </div>

            <div className="p-4 rounded border border-white/5 bg-black/40 space-y-1">
              <div className="text-slate-400">gRPC P99 LATENCY</div>
              <div className="text-2xl font-bold text-emerald-400 tabular-nums">
                {clusterMetrics.grpcLatencyP99Ms}ms
              </div>
              <div className="text-[10px] text-slate-500">Model Serving Mesh</div>
            </div>

            <div className="p-4 rounded border border-white/5 bg-black/40 space-y-1">
              <div className="text-slate-400">INGRESS BANDWIDTH</div>
              <div className="text-2xl font-bold text-amber-400 tabular-nums">
                {clusterMetrics.ingressBandwidthMbps} <span className="text-xs text-slate-500">Mbps</span>
              </div>
              <div className="text-[10px] text-slate-500">WAF & Edge Ingress</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Chaos Threat Injector */}
      {activeTab === 'chaos' && (
        <div className="p-6 rounded-lg border border-white/10 bg-slate-900/50 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-white">Live Chaos Threat Injector</h3>
            <p className="text-xs text-slate-400">
              Fire controlled adversarial payloads directly into the live pipeline to stress-test real-time detection & containment heuristics.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => onInjectEvent('CHUNKED_SAFETENSORS_SOCKET_ANOMALY')}
              className="p-4 rounded-lg border border-red-500/30 bg-red-950/20 hover:bg-red-950/40 text-left transition-all space-y-1"
            >
              <div className="text-xs font-bold text-red-400 font-mono">INJECT: CHUNKED_SAFETENSORS_SOCKET_ANOMALY</div>
              <div className="text-xs text-slate-300">Simulates high-velocity outbound exfiltration socket from inference worker.</div>
            </button>

            <button
              onClick={() => onInjectEvent('ADVERSARIAL_JAILBREAK_TOKEN_BURST')}
              className="p-4 rounded-lg border border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/40 text-left transition-all space-y-1"
            >
              <div className="text-xs font-bold text-amber-400 font-mono">INJECT: ADVERSARIAL_JAILBREAK_TOKEN_BURST</div>
              <div className="text-xs text-slate-300">Injects semantic perplexity anomaly into fine-tuning dataset ingestion shard.</div>
            </button>

            <button
              onClick={() => onInjectEvent('EBPF_PTRACE_HOOK_ATTEMPT')}
              className="p-4 rounded-lg border border-indigo-500/30 bg-indigo-950/20 hover:bg-indigo-950/40 text-left transition-all space-y-1"
            >
              <div className="text-xs font-bold text-indigo-400 font-mono">INJECT: EBPF_PTRACE_HOOK_ATTEMPT</div>
              <div className="text-xs text-slate-300">Triggers eBPF Tetragon syscall interception alert on container pid.</div>
            </button>

            <button
              onClick={() => onInjectEvent('UNAUTHORIZED_STS_TOKEN_SWAP')}
              className="p-4 rounded-lg border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-950/40 text-left transition-all space-y-1"
            >
              <div className="text-xs font-bold text-cyan-400 font-mono">INJECT: UNAUTHORIZED_STS_TOKEN_SWAP</div>
              <div className="text-xs text-slate-300">Simulates stolen AWS STS service token usage from untrusted external ASN.</div>
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: Webhook Dispatcher */}
      {activeTab === 'webhooks' && (
        <div className="p-6 rounded-lg border border-white/10 bg-slate-900/50 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">External SIEM & Webhook Dispatcher</h3>
            <p className="text-xs text-slate-400">
              Test and verify real-time event forwarding to company external webhook endpoints and enterprise SIEM ingest channels.
            </p>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">Target Webhook URL</label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">JSON Payload Body</label>
              <textarea
                rows={5}
                value={webhookPayload}
                onChange={(e) => setWebhookPayload(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded text-emerald-300"
              />
            </div>

            <button
              onClick={handleDispatchWebhook}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Test Webhook</span>
            </button>

            {webhookResponse && (
              <div className="p-3.5 rounded border border-emerald-500/30 bg-emerald-950/30 text-emerald-300">
                {webhookResponse}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
