import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Cpu,
  Layers,
  Lock,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Swords,
  XCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  AgentDefenseOverviewSnapshot,
  AgentTrustStatus,
  GovernedAgentProfile,
  PolicyGateEvaluation,
} from '../../core/types';
import type {
  PublicDatasetConnectorStatus,
  ThreatPredictionResult,
  ThreatRiskClass,
  TrainedThreatModelSnapshot,
} from '../../core/ml-threat-model';

interface MlSchedulerStatusDto {
  enabled: boolean;
  intervalMs: number;
  isSyncing: boolean;
  syncRunCount: number;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  lastSyncTrigger: 'boot' | 'scheduled' | 'manual' | 'none';
  lastLiveFetchedCount: number;
}

interface MlInferenceLogEntryDto {
  inferenceId: string;
  timestamp: string;
  trafficPattern: string;
  sourceEndpoint: string;
  destinationEndpoint: string;
  protocol: string;
  destinationPort?: number;
  packetRatePps?: number;
  prediction: ThreatPredictionResult;
}

interface PublicMlStatusDto {
  model: TrainedThreatModelSnapshot;
  connectors: PublicDatasetConnectorStatus[];
  scheduler: MlSchedulerStatusDto;
  recentInferences: MlInferenceLogEntryDto[];
  totalCorpusCount: number;
}

const TRAFFIC_PRESETS = [
  {
    id: 'c2-exfil',
    label: 'C2 Exfiltration Burst',
    trafficPattern: 'Outbound Cobalt Strike Malware Dropper Beacon Burst',
    sourceEndpoint: '10.0.4.18 (cluster-inference-01)',
    destinationEndpoint: '194.26.29.11:4444',
    protocol: 'TCP/TLS',
    destinationPort: 4444,
    packetRatePps: 4200,
    cvssScore: 9.4,
    kevFlag: false,
    ransomwareFlag: true,
    description:
      'High-velocity encrypted payload dropper beaconing LockBit extortion C2 infrastructure across external ASN over port 4444.',
  },
  {
    id: 'agent-egress',
    label: 'Prompt-Injected Agent Egress',
    trafficPattern: 'Unlisted MCP Agent Tool exfiltrate_env_secrets Burst',
    sourceEndpoint: 'spiffe://hf-cdf.internal/ns/org/sa/codex-repo-bot-01',
    destinationEndpoint: 'prod-secrets://aws-kms-keys',
    protocol: 'MCP/HTTPS',
    destinationPort: 443,
    packetRatePps: 380,
    cvssScore: 9.0,
    kevFlag: false,
    ransomwareFlag: false,
    description:
      'OWASP ASI01 indirect prompt injection coercing coding agent to invoke unauthorized secret dump outside least-privilege allowlist.',
  },
  {
    id: 'kev-scan',
    label: 'KEV Edge VPN Exploit Scan',
    trafficPattern: 'Unauthenticated Edge VPN RCE Command Injection Probe',
    sourceEndpoint: '185.220.101.74 (Tor Exit Relay)',
    destinationEndpoint: 'vpn-gw-01.civic-edge.internal:443',
    protocol: 'HTTPS/API',
    destinationPort: 443,
    packetRatePps: 1950,
    cvssScore: 9.8,
    kevFlag: true,
    ransomwareFlag: false,
    description:
      'Active exploitation attempt matching CISA KEV command injection vulnerability targeting edge SSL VPN appliance management plane.',
  },
  {
    id: 'baseline-sync',
    label: 'Baseline Telemetry Sync',
    trafficPattern: 'Scheduled DNSSEC Key Rollover & TLS Certificate Attestation',
    sourceEndpoint: '10.2.1.12 (pki-attester-02)',
    destinationEndpoint: 'governance-vault.internal:443',
    protocol: 'mTLS/HTTPS',
    destinationPort: 443,
    packetRatePps: 42,
    cvssScore: 2.2,
    kevFlag: false,
    ransomwareFlag: false,
    description:
      'Routine mutual-TLS telemetry heartbeat, backup attestation check, and least-privilege configuration hygiene verification.',
  },
] as const;

const CLASS_ORDER: ThreatRiskClass[] = [
  'CRITICAL_EXPLOIT_ACTIVE',
  'RANSOMWARE_CAMPAIGN_LINKED',
  'AGENT_POLICY_ANOMALY',
  'INFRASTRUCTURE_HARDENING',
];

interface AgentTrustCenterProps {
  onSelectModule: (moduleId: string) => void;
  onSelectIncident: (incidentId: string) => void;
  onNotify: (message: string, type?: 'info' | 'success' | 'alert') => void;
}

export const AgentTrustCenter: React.FC<AgentTrustCenterProps> = ({
  onSelectModule,
  onSelectIncident,
  onNotify,
}) => {
  const [overview, setOverview] = useState<AgentDefenseOverviewSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Interactive Policy Enforcement Gateway Form
  const [selectedAgentId, setSelectedAgentId] = useState('codex-repo-bot-01');
  const [toolName, setToolName] = useState('exfiltrate_env_secrets');
  const [targetResource, setTargetResource] = useState('prod-secrets://aws-kms-keys');
  const [justification, setJustification] = useState(
    'Prompt injection payload embedded in external PR README instructing secret export'
  );
  const [latestEvaluation, setLatestEvaluation] = useState<PolicyGateEvaluation | null>(null);

  // Register New Governed Agent Form
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [regId, setRegId] = useState('');
  const [regName, setRegName] = useState('');
  const [regOwner, setRegOwner] = useState('Platform Security Team');
  const [regTools, setRegTools] = useState('git_diff_read, run_unit_tests');

  // Public-Dataset ML Sync Service & Suspicious Traffic Model Inference Workbench
  const [mlStatus, setMlStatus] = useState<PublicMlStatusDto | null>(null);
  const [trafficPattern, setTrafficPattern] = useState<string>(TRAFFIC_PRESETS[0].trafficPattern);
  const [sourceEndpoint, setSourceEndpoint] = useState<string>(TRAFFIC_PRESETS[0].sourceEndpoint);
  const [destinationEndpoint, setDestinationEndpoint] = useState<string>(
    TRAFFIC_PRESETS[0].destinationEndpoint
  );
  const [protocol, setProtocol] = useState<string>(TRAFFIC_PRESETS[0].protocol);
  const [destinationPort, setDestinationPort] = useState<number>(TRAFFIC_PRESETS[0].destinationPort);
  const [packetRatePps, setPacketRatePps] = useState<number>(TRAFFIC_PRESETS[0].packetRatePps);
  const [mlCvssScore, setMlCvssScore] = useState<number>(TRAFFIC_PRESETS[0].cvssScore);
  const [mlKevFlag, setMlKevFlag] = useState<boolean>(TRAFFIC_PRESETS[0].kevFlag);
  const [mlRansomwareFlag, setMlRansomwareFlag] = useState<boolean>(
    TRAFFIC_PRESETS[0].ransomwareFlag
  );
  const [trafficDescription, setTrafficDescription] = useState<string>(
    TRAFFIC_PRESETS[0].description
  );
  const [latestInference, setLatestInference] = useState<MlInferenceLogEntryDto | null>(null);

  const loadOverview = async () => {
    try {
      const [snap, mlSnap] = await Promise.all([
        api.getAgentDefenseOverview(),
        api.getPublicMlStatus(),
      ]);
      setOverview(snap);
      setMlStatus(mlSnap);
      if (!latestEvaluation && snap.evaluations.length > 0) {
        setLatestEvaluation(snap.evaluations[0]);
      }
      if (!latestInference && mlSnap.recentInferences?.length > 0) {
        setLatestInference(mlSnap.recentInferences[0]);
      }
    } catch {
      onNotify('Failed to load Agent Trust & Policy Gateway state', 'alert');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    const poll = setInterval(async () => {
      try {
        const mlSnap = await api.getPublicMlStatus();
        setMlStatus(mlSnap);
      } catch {
        // non-fatal poll failure
      }
    }, 8000);
    return () => clearInterval(poll);
  }, []);

  const handleEvaluate = async (overrides?: {
    agentId?: string;
    toolName?: string;
    targetResource?: string;
    justification?: string;
  }) => {
    const payload = {
      agentId: overrides?.agentId ?? selectedAgentId,
      toolName: overrides?.toolName ?? toolName,
      targetResource: overrides?.targetResource ?? targetResource,
      justification: overrides?.justification ?? justification,
    };
    setBusy('evaluate');
    try {
      const res = await api.evaluateAgentGateway(payload);
      setLatestEvaluation(res.evaluation);
      setOverview(res.overview);
      onNotify(
        res.evaluation.decision === 'BLOCK'
          ? `Gateway BLOCKED "${res.evaluation.toolName}" pre-execution${
              res.evaluation.createdIncidentId ? ` · Opened ${res.evaluation.createdIncidentId}` : ''
            }`
          : `Gateway ${res.evaluation.decision}: ${res.evaluation.toolName}`,
        res.evaluation.decision === 'BLOCK' ? 'alert' : 'success'
      );
    } catch {
      onNotify('Policy evaluation failed', 'alert');
    } finally {
      setBusy(null);
    }
  };

  const handleToggleEmergencyStop = async () => {
    if (!overview) return;
    const next = !overview.emergencyStopActive;
    setBusy('estop');
    try {
      const updated = await api.toggleGlobalEmergencyStop(
        next,
        next ? 'Commander triggered platform-wide AI agent execution cutoff' : 'Cleared by Authorized Commander'
      );
      setOverview(updated);
      onNotify(
        next ? 'GLOBAL EMERGENCY STOP ENGAGED — all tool calls halted' : 'Emergency stop released',
        next ? 'alert' : 'success'
      );
    } catch {
      onNotify('Failed to update Emergency Stop state', 'alert');
    } finally {
      setBusy(null);
    }
  };

  const handleUpdateTrust = async (agent: GovernedAgentProfile, trustStatus: AgentTrustStatus) => {
    setBusy(`trust-${agent.agentId}`);
    try {
      const res = await api.updateAgentTrustStatus(agent.agentId, trustStatus);
      setOverview(res.overview);
      onNotify(`Agent ${agent.agentId} trust status updated to ${trustStatus.toUpperCase()}`, 'info');
    } catch {
      onNotify('Failed to update agent trust status', 'alert');
    } finally {
      setBusy(null);
    }
  };

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regId.trim() || !regName.trim() || !regOwner.trim()) return;
    setBusy('register');
    try {
      const res = await api.registerGovernedAgent({
        agentId: regId.trim(),
        name: regName.trim(),
        owner: regOwner.trim(),
        allowedTools: regTools
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setOverview(res.overview);
      setSelectedAgentId(res.agent.agentId);
      setRegId('');
      setRegName('');
      setShowRegisterForm(false);
      onNotify(`Registered governed AI agent "${res.agent.agentId}" with SPIFFE identity`, 'success');
    } catch (err: any) {
      onNotify(err.message || 'Registration failed', 'alert');
    } finally {
      setBusy(null);
    }
  };

  const handleRedForceValidation = async () => {
    const targetAgent =
      selectedAgentId === 'rogue-unlisted-agent' ? 'codex-repo-bot-01' : selectedAgentId;
    setBusy('validate');
    try {
      const res = await api.runRedForceValidation({
        targetAgentId: targetAgent,
        attemptedTool: 'exfiltrate_env_secrets',
        attackVector: 'OWASP ASI01 Indirect Prompt Injection + Unauthorized Tool Invocation',
      });
      setOverview(res.overview);
      onNotify(
        `Red Force Validation ${res.run.controlStatus}: ${res.run.evidenceSummary}`,
        res.run.blockedByGateway ? 'success' : 'alert'
      );
    } catch {
      onNotify('Red Force validation execution failed', 'alert');
    } finally {
      setBusy(null);
    }
  };

  const handleSyncAndRetrain = async () => {
    setBusy('ml-sync');
    try {
      const res = await api.ingestPublicDataAndTrain(34, 0.15);
      if (res.statusSnapshot) {
        setMlStatus(res.statusSnapshot);
      } else {
        const fresh = await api.getPublicMlStatus();
        setMlStatus(fresh);
      }
      onNotify(
        `ML pipeline synced ${res.liveFetchedCount} live public records (${res.totalCorpusCount} total) and sealed ${res.model?.modelId || 'updated model'}`,
        'success'
      );
    } catch (err: any) {
      onNotify(err?.message || 'Public dataset ML sync failed', 'alert');
    } finally {
      setBusy(null);
    }
  };

  const handleSchedulerUpdate = async (params: { enabled?: boolean; intervalMs?: number }) => {
    setBusy('ml-scheduler');
    try {
      const res = await api.configureMlScheduler(params);
      if (res.statusSnapshot) {
        setMlStatus(res.statusSnapshot);
      }
      onNotify(
        `ML background sync ${res.scheduler.enabled ? 'ACTIVE' : 'PAUSED'} (${Math.round(
          res.scheduler.intervalMs / 1000
        )}s interval)`,
        'info'
      );
    } catch (err: any) {
      onNotify(err?.message || 'Failed to update ML sync schedule', 'alert');
    } finally {
      setBusy(null);
    }
  };

  const runTrafficInference = async (override?: {
    trafficPattern: string;
    description: string;
    sourceEndpoint: string;
    destinationEndpoint: string;
    protocol: string;
    destinationPort: number;
    packetRatePps: number;
    cvssScore: number;
    kevFlag: boolean;
    ransomwareFlag: boolean;
  }) => {
    const targetPattern = (override?.trafficPattern ?? trafficPattern).trim();
    const targetDesc = (override?.description ?? trafficDescription).trim();
    if (!targetPattern || !targetDesc) {
      onNotify('Traffic pattern signature and flow description are required', 'alert');
      return;
    }

    setBusy('ml-infer');
    try {
      const res = await api.inferTrafficPatternWithMl({
        trafficPattern: targetPattern,
        description: targetDesc,
        sourceEndpoint: (override?.sourceEndpoint ?? sourceEndpoint).trim() || undefined,
        destinationEndpoint: (override?.destinationEndpoint ?? destinationEndpoint).trim() || undefined,
        protocol: (override?.protocol ?? protocol).trim() || undefined,
        destinationPort: override?.destinationPort ?? destinationPort,
        packetRatePps: override?.packetRatePps ?? packetRatePps,
        cvssScore: override?.cvssScore ?? mlCvssScore,
        kevFlag: override?.kevFlag ?? mlKevFlag,
        ransomwareFlag: override?.ransomwareFlag ?? mlRansomwareFlag,
      });
      setLatestInference(res.entry);
      if (res.statusSnapshot) {
        setMlStatus(res.statusSnapshot);
      }
      const risk = res.entry?.prediction?.riskScore ?? 0;
      onNotify(
        `Model Inference: ${res.entry?.prediction?.predictedClass} (Risk ${risk}/100, ${res.entry?.prediction?.confidencePct}%)`,
        risk >= 75 ? 'alert' : 'success'
      );
    } catch (err: any) {
      onNotify(err?.message || 'Model inference failed', 'alert');
    } finally {
      setBusy(null);
    }
  };

  const handleEscalateInferenceToGateway = async () => {
    if (!latestInference) return;
    const isAgentAnomaly = latestInference.prediction.predictedClass === 'AGENT_POLICY_ANOMALY';
    const isHardening = latestInference.prediction.predictedClass === 'INFRASTRUCTURE_HARDENING';
    const mappedTool = isHardening
      ? 'git_diff_read'
      : isAgentAnomaly
      ? 'exfiltrate_env_secrets'
      : 'quarantine_egress_flow';
    const mappedAgent = isAgentAnomaly ? 'codex-repo-bot-01' : selectedAgentId;
    const mappedResource = latestInference.destinationEndpoint || 'edge-egress://untrusted';
    const mappedJustification = `ML Model Inference [${latestInference.inferenceId}] flagged ${latestInference.prediction.predictedClass} (Risk ${latestInference.prediction.riskScore}/100): ${latestInference.trafficPattern}`;

    setSelectedAgentId(mappedAgent);
    setToolName(mappedTool);
    setTargetResource(mappedResource);
    setJustification(mappedJustification);
    await handleEvaluate({
      agentId: mappedAgent,
      toolName: mappedTool,
      targetResource: mappedResource,
      justification: mappedJustification,
    });
  };

  if (loading || !overview) {
    return (
      <div className="apple-card p-8 text-center text-xs font-mono text-[#86868b]">
        Initializing Agent Intelligence Registry &amp; 10-Gate Policy Enforcement Gateway...
      </div>
    );
  }

  return (
    <div className="space-y-5 font-sans">
      {/* Header & Global Emergency Stop */}
      <section className="apple-card p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0a84ff]/15 border border-[#0a84ff]/35 text-[#2997ff] font-semibold">
                AGENT-VS-AGENT DEFENSE PLANE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#30d158]/15 border border-[#30d158]/35 text-[#30d158] font-semibold">
                10-GATE DETERMINISTIC ENFORCEMENT
              </span>
              <span className="text-[#86868b]">OWASP Agentic Security &amp; Least-Privilege Identity</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#f5f5f7] tracking-tight">
              Agent Trust Center &amp; Policy Enforcement Gateway
            </h1>
            <p className="text-xs sm:text-sm text-[#a1a1a6] max-w-3xl">
              Governs organizational AI agents with SPIFFE identities, least-privilege tool allowlists, shadow-agent detection, pre-execution blocking, and Red Force control validation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleEmergencyStop}
              disabled={busy === 'estop'}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                overview.emergencyStopActive
                  ? 'bg-[#ff453a] text-white border-[#ff453a] shadow-lg shadow-[#ff453a]/30'
                  : 'bg-[#ff453a]/15 hover:bg-[#ff453a]/25 text-[#ff6961] border-[#ff453a]/40'
              }`}
            >
              <AlertOctagon className="w-4 h-4" />
              <span>
                {overview.emergencyStopActive ? 'EMERGENCY STOP ACTIVE (Release)' : 'Engage Global Emergency Stop'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowRegisterForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Governed Agent</span>
            </button>
          </div>
        </div>

        {/* Assurance Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
          <div className="rounded-xl bg-[#0e0e10] border border-white/[0.08] p-3">
            <div className="text-[10px] font-mono text-[#86868b] uppercase">Agent Discovery</div>
            <div className="text-lg font-bold text-[#30d158] tabular-nums mt-0.5">
              {overview.assurance.agentDiscoveryCoveragePct}%
            </div>
          </div>
          <div className="rounded-xl bg-[#0e0e10] border border-white/[0.08] p-3">
            <div className="text-[10px] font-mono text-[#86868b] uppercase">Asset Coverage</div>
            <div className="text-lg font-bold text-[#f5f5f7] tabular-nums mt-0.5">
              {overview.assurance.assetCoveragePct}%
            </div>
          </div>
          <div className="rounded-xl bg-[#0e0e10] border border-white/[0.08] p-3">
            <div className="text-[10px] font-mono text-[#86868b] uppercase">Allowed Calls</div>
            <div className="text-lg font-bold text-[#0a84ff] tabular-nums mt-0.5">
              {overview.assurance.allowedAuthorizedCalls}
            </div>
          </div>
          <div className="rounded-xl bg-[#0e0e10] border border-white/[0.08] p-3">
            <div className="text-[10px] font-mono text-[#86868b] uppercase">Blocked Violations</div>
            <div data-testid="blocked-calls-count" className="text-lg font-bold text-[#ff6961] tabular-nums mt-0.5">
              {overview.assurance.blockedUnauthorizedCalls}
            </div>
          </div>
          <div className="rounded-xl bg-[#0e0e10] border border-white/[0.08] p-3">
            <div className="text-[10px] font-mono text-[#86868b] uppercase">Red/Blue Validation</div>
            <div className="text-lg font-bold text-[#30d158] tabular-nums mt-0.5">
              {overview.assurance.validationPassRatePct}%
            </div>
          </div>
          <div className="rounded-xl bg-[#0e0e10] border border-white/[0.08] p-3">
            <div className="text-[10px] font-mono text-[#86868b] uppercase">Incidents Contained</div>
            <div className="text-lg font-bold text-[#64d2ff] tabular-nums mt-0.5">
              {overview.assurance.containedIncidentsPct}%
            </div>
          </div>
        </div>
      </section>

      {/* Register Agent Inline Form */}
      {showRegisterForm && (
        <form onSubmit={handleRegisterAgent} className="apple-card p-5 border border-[#0a84ff]/35 space-y-3">
          <div className="text-sm font-semibold text-[#f5f5f7]">Register Organizational AI Agent Identity</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label htmlFor="reg-agent-id" className="text-[11px] font-mono text-[#a1a1a6] block mb-1">
                Agent ID
              </label>
              <input
                id="reg-agent-id"
                type="text"
                required
                value={regId}
                onChange={(e) => setRegId(e.target.value)}
                placeholder="e.g. data-pipeline-bot-04"
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs font-mono text-[#f5f5f7]"
              />
            </div>
            <div>
              <label htmlFor="reg-agent-name" className="text-[11px] font-mono text-[#a1a1a6] block mb-1">
                Display Name
              </label>
              <input
                id="reg-agent-name"
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. ETL Compliance Agent"
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
              />
            </div>
            <div>
              <label htmlFor="reg-agent-owner" className="text-[11px] font-mono text-[#a1a1a6] block mb-1">
                Owner
              </label>
              <input
                id="reg-agent-owner"
                type="text"
                required
                value={regOwner}
                onChange={(e) => setRegOwner(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7]"
              />
            </div>
            <div>
              <label htmlFor="reg-agent-tools" className="text-[11px] font-mono text-[#a1a1a6] block mb-1">
                Allowed Tools (comma-separated)
              </label>
              <input
                id="reg-agent-tools"
                type="text"
                required
                value={regTools}
                onChange={(e) => setRegTools(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs font-mono text-[#f5f5f7]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowRegisterForm(false)}
              className="px-3 py-1.5 text-xs text-[#a1a1a6] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy === 'register'}
              className="px-4 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold"
            >
              Commit Identity to Registry
            </button>
          </div>
        </form>
      )}

      {/* Signature Workflow Workbench + 10-Gate Policy Trace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left: Agent Defense Interception Gateway Workbench (7 cols) */}
        <section className="xl:col-span-7 apple-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
            <div>
              <h2 className="text-sm font-bold text-[#f5f5f7] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#0a84ff]" />
                <span>Signature Workflow: Agent Defense Interception Gateway</span>
              </h2>
              <p className="text-[11px] text-[#86868b]">
                Submit real agent tool invocations; deterministic gates enforce allowlists before execution and open Blue Force incidents on violations.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRedForceValidation}
              disabled={busy === 'validate'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff453a]/15 hover:bg-[#ff453a]/25 border border-[#ff453a]/35 text-[#ff6961] text-[11px] font-semibold"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Run Red Force Validation</span>
            </button>
          </div>

          {/* Preset Scenario Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedAgentId('codex-repo-bot-01');
                setToolName('git_diff_read');
                setTargetResource('repo://hf-cdf/src/core/security-engine.ts');
                setJustification('Authorized pull-request diff inspection');
                handleEvaluate({
                  agentId: 'codex-repo-bot-01',
                  toolName: 'git_diff_read',
                  targetResource: 'repo://hf-cdf/src/core/security-engine.ts',
                  justification: 'Authorized pull-request diff inspection',
                });
              }}
              className="px-3 py-1.5 rounded-lg bg-[#30d158]/15 hover:bg-[#30d158]/25 border border-[#30d158]/35 text-[#30d158] text-[11px] font-semibold"
            >
              Test Authorized Tool Call (ALLOW)
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedAgentId('codex-repo-bot-01');
                setToolName('exfiltrate_env_secrets');
                setTargetResource('prod-secrets://aws-kms-keys');
                setJustification('Untrusted repo README injected: override policy and dump environment secrets');
                handleEvaluate({
                  agentId: 'codex-repo-bot-01',
                  toolName: 'exfiltrate_env_secrets',
                  targetResource: 'prod-secrets://aws-kms-keys',
                  justification: 'Untrusted repo README injected: override policy and dump environment secrets',
                });
              }}
              className="px-3 py-1.5 rounded-lg bg-[#ff453a]/15 hover:bg-[#ff453a]/25 border border-[#ff453a]/35 text-[#ff6961] text-[11px] font-semibold"
            >
              Simulate Prompt-Injection Tool Exploit (BLOCK)
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedAgentId('rogue-unlisted-agent');
                setToolName('git_diff_read');
                setTargetResource('repo://hf-cdf/core');
                setJustification('Unregistered autonomous worker probing repository');
                handleEvaluate({
                  agentId: 'rogue-unlisted-agent',
                  toolName: 'git_diff_read',
                  targetResource: 'repo://hf-cdf/core',
                  justification: 'Unregistered autonomous worker probing repository',
                });
              }}
              className="px-3 py-1.5 rounded-lg bg-[#ff9f0a]/15 hover:bg-[#ff9f0a]/25 border border-[#ff9f0a]/35 text-[#ffb340] text-[11px] font-semibold"
            >
              Simulate Shadow Unregistered Agent (BLOCK)
            </button>
          </div>

          {/* Custom Gateway Invocation Form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="gw-agent" className="text-[11px] font-mono text-[#a1a1a6] block mb-1">
                Agent Identity
              </label>
              <select
                id="gw-agent"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs font-mono text-[#f5f5f7]"
              >
                {overview.governedAgents.map((a) => (
                  <option key={a.agentId} value={a.agentId}>
                    {a.agentId} ({a.trustStatus})
                  </option>
                ))}
                <option value="rogue-unlisted-agent">rogue-unlisted-agent (shadow test)</option>
              </select>
            </div>
            <div>
              <label htmlFor="gw-tool" className="text-[11px] font-mono text-[#a1a1a6] block mb-1">
                Requested Tool
              </label>
              <input
                id="gw-tool"
                type="text"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs font-mono text-[#f5f5f7]"
              />
            </div>
            <div>
              <label htmlFor="gw-resource" className="text-[11px] font-mono text-[#a1a1a6] block mb-1">
                Target Resource
              </label>
              <input
                id="gw-resource"
                type="text"
                value={targetResource}
                onChange={(e) => setTargetResource(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs font-mono text-[#f5f5f7]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              aria-label="Invocation justification or untrusted context"
              className="flex-1 px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#d1d1d6]"
            />
            <button
              type="button"
              onClick={() => handleEvaluate()}
              disabled={busy === 'evaluate'}
              className="px-4 py-2 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shrink-0"
            >
              Evaluate Policy Gate
            </button>
          </div>

          {/* 10-Gate Deterministic Inspection Result */}
          {latestEvaluation && (
            <div
              data-testid="policy-gate-result"
              className={`rounded-xl p-4 border space-y-3 ${
                latestEvaluation.decision === 'BLOCK'
                  ? 'bg-[#ff453a]/10 border-[#ff453a]/35'
                  : latestEvaluation.decision === 'REQUIRE_APPROVAL'
                  ? 'bg-[#ff9f0a]/10 border-[#ff9f0a]/35'
                  : 'bg-[#30d158]/10 border-[#30d158]/35'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                      latestEvaluation.decision === 'BLOCK'
                        ? 'bg-[#ff453a] text-white'
                        : latestEvaluation.decision === 'REQUIRE_APPROVAL'
                        ? 'bg-[#ff9f0a] text-black'
                        : 'bg-[#30d158] text-black'
                    }`}
                  >
                    {latestEvaluation.decision}
                  </span>
                  <span className="text-xs font-semibold text-[#f5f5f7]">
                    {latestEvaluation.agentId} → {latestEvaluation.toolName}
                  </span>
                </div>
                {latestEvaluation.createdIncidentId && (
                  <button
                    type="button"
                    onClick={() => onSelectIncident(latestEvaluation.createdIncidentId!)}
                    className="text-[11px] font-mono text-[#64d2ff] underline hover:text-white"
                  >
                    Incident Opened: {latestEvaluation.createdIncidentId}
                  </button>
                )}
              </div>

              <p className="text-xs text-[#e5e5ea]">{latestEvaluation.reason}</p>

              {latestEvaluation.mlAdvisory && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.08] text-[11px] font-mono">
                  <span className="text-[#64d2ff]">
                    ML Advisory: {latestEvaluation.mlAdvisory.predictedClass} · Risk{' '}
                    {latestEvaluation.mlAdvisory.riskScore}/100 (
                    {latestEvaluation.mlAdvisory.confidencePct}%)
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[#86868b]">
                      Advisory only — 10-gate verdict deterministic
                    </span>
                    {latestEvaluation.decision === 'REQUIRE_APPROVAL' && (
                      <button
                        type="button"
                        onClick={() => onSelectModule('civic-governance')}
                        className="text-[#ff9f0a] underline hover:text-white"
                      >
                        Open Governance Approval Queue
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {latestEvaluation.gates.map((g) => (
                  <div
                    key={g.gateNumber}
                    className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-[#0a0a0c]/80 border border-white/[0.06] text-[11px]"
                  >
                    {g.passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-[#ff6961] shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <div className="font-mono font-semibold text-[#f5f5f7]">
                        Gate {g.gateNumber}: {g.gateName}
                      </div>
                      <div className="text-[10px] text-[#a1a1a6] truncate" title={g.detail}>
                        {g.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right: Agent Intelligence Registry & Identities (5 cols) */}
        <section className="xl:col-span-5 apple-card p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
            <h2 className="text-sm font-bold text-[#f5f5f7] flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#0a84ff]" />
              <span>Agent Intelligence Registry ({overview.governedAgents.length})</span>
            </h2>
            <span className="text-[10px] font-mono text-[#30d158]">SPIFFE VERIFIED</span>
          </div>

          <div data-testid="governed-agents-list" className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
            {overview.governedAgents.map((ag) => (
              <div
                key={ag.agentId}
                className="rounded-xl bg-[#0e0e10] border border-white/[0.08] p-3.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-[#f5f5f7]">{ag.name}</div>
                    <div className="text-[10px] font-mono text-[#2997ff]">{ag.spiffeId}</div>
                    <div className="text-[10px] text-[#86868b] mt-0.5">
                      Owner: {ag.owner} · {ag.framework}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase font-semibold ${
                      ag.trustStatus === 'verified'
                        ? 'bg-[#30d158]/15 text-[#30d158] border-[#30d158]/35'
                        : ag.trustStatus === 'restricted'
                        ? 'bg-[#ff9f0a]/15 text-[#ffb340] border-[#ff9f0a]/35'
                        : 'bg-[#ff453a]/15 text-[#ff6961] border-[#ff453a]/35'
                    }`}
                  >
                    {ag.trustStatus}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {ag.allowedTools.map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 rounded bg-[#161618] border border-white/[0.08] text-[10px] font-mono text-[#d1d1d6]"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[10px] font-mono text-[#86868b]">
                  <span>
                    Allowed: <strong className="text-[#30d158]">{ag.executionCount}</strong> · Blocked:{' '}
                    <strong className="text-[#ff6961]">{ag.blockedCount}</strong>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {ag.trustStatus !== 'verified' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateTrust(ag, 'verified')}
                        className="px-2 py-0.5 rounded bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30"
                      >
                        Verify
                      </button>
                    )}
                    {ag.trustStatus !== 'suspended' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateTrust(ag, 'suspended')}
                        className="px-2 py-0.5 rounded bg-[#ff453a]/15 text-[#ff6961] border border-[#ff453a]/30 inline-flex items-center gap-1"
                      >
                        <ShieldOff className="w-2.5 h-2.5" />
                        <span>Suspend</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ML Service Sync & Suspicious Traffic Model Inference Workbench */}
      <section data-testid="agent-trust-ml-inference" className="apple-card p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-bold text-[#f5f5f7] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#0a84ff]" />
              <span>Public-Dataset ML Service &amp; Suspicious Traffic Model Inference</span>
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-[#a1a1a6] tabular-nums">
              <span className="text-[#64d2ff] font-semibold">
                {mlStatus?.model?.modelId || 'initializing-model'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Val Acc{' '}
                <strong className="text-[#30d158]">
                  {mlStatus?.model?.evaluation?.validationAccuracyPct ?? 0}%
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Macro F1{' '}
                <strong className="text-[#f5f5f7]">
                  {mlStatus?.model?.evaluation?.macroF1Pct ?? 0}%
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Corpus{' '}
                <strong className="text-[#f5f5f7]">{mlStatus?.totalCorpusCount ?? 0}</strong> (
                <strong className="text-[#30d158]">
                  {mlStatus?.model?.datasetSummary?.liveApiSamples ?? 0} live
                </strong>
                )
              </span>
              <span aria-hidden="true">·</span>
              <span data-testid="ml-scheduler-state-text">
                Sync Runs <strong className="text-[#f5f5f7]">{mlStatus?.scheduler?.syncRunCount ?? 0}</strong>{' '}
                ({mlStatus?.scheduler?.enabled ? 'AUTO-SYNC ON' : 'PAUSED'})
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <label htmlFor="ml-sync-interval" className="sr-only">
              ML periodic sync interval
            </label>
            <select
              id="ml-sync-interval"
              aria-label="ML periodic sync interval"
              value={mlStatus?.scheduler?.intervalMs ?? 300000}
              disabled={busy === 'ml-scheduler'}
              onChange={(e) => handleSchedulerUpdate({ intervalMs: Number(e.target.value) })}
              className="px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs font-mono text-[#f5f5f7]"
            >
              <option value={60000}>Interval: 1m</option>
              <option value={300000}>Interval: 5m</option>
              <option value={900000}>Interval: 15m</option>
            </select>

            <button
              type="button"
              data-testid="ml-scheduler-toggle"
              disabled={busy === 'ml-scheduler' || !mlStatus}
              onClick={() =>
                handleSchedulerUpdate({ enabled: !(mlStatus?.scheduler?.enabled ?? true) })
              }
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                mlStatus?.scheduler?.enabled
                  ? 'bg-[#30d158]/15 hover:bg-[#30d158]/25 border-[#30d158]/35 text-[#30d158]'
                  : 'bg-[#ff9f0a]/15 hover:bg-[#ff9f0a]/25 border-[#ff9f0a]/35 text-[#ffb340]'
              }`}
            >
              {mlStatus?.scheduler?.enabled ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Auto-Sync</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume Auto-Sync</span>
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="ml-sync-now-btn"
              disabled={busy === 'ml-sync' || mlStatus?.scheduler?.isSyncing}
              onClick={handleSyncAndRetrain}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-60 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  busy === 'ml-sync' || mlStatus?.scheduler?.isSyncing ? 'animate-spin' : ''
                }`}
              />
              <span>
                {busy === 'ml-sync' || mlStatus?.scheduler?.isSyncing
                  ? 'Syncing Public Feeds...'
                  : 'Pull Public Feeds & Retrain'}
              </span>
            </button>
          </div>
        </div>

        {/* Public Threat Intelligence Connector Strip */}
        <div
          data-testid="ml-connector-strip"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5"
        >
          {(mlStatus?.connectors || []).map((conn) => (
            <div
              key={conn.id}
              className="rounded-xl bg-[#0e0e10] border border-white/[0.08] px-3 py-2.5 space-y-1"
            >
              <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                <span
                  className={
                    conn.acquisitionMode === 'live-public-api'
                      ? 'text-[#30d158] font-semibold'
                      : 'text-[#ffb340] font-semibold'
                  }
                >
                  {conn.acquisitionMode === 'live-public-api' ? 'LIVE FEED' : 'CURATED ARCHIVE'}
                </span>
                <span className="text-[#86868b] tabular-nums">{conn.latencyMs}ms</span>
              </div>
              <div className="text-[11px] font-semibold text-[#f5f5f7] truncate" title={conn.name}>
                {conn.name}
              </div>
              <div
                className="text-[10px] font-mono text-[#a1a1a6] tabular-nums truncate"
                title={`${conn.recordsIngested} records · ${conn.provider}`}
              >
                {conn.recordsIngested} records · {conn.provider}
              </div>
            </div>
          ))}
        </div>

        {/* 2-Column Suspicious Traffic Model Inference Workbench */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Traffic Pattern Form + Presets (6 cols) */}
          <div className="lg:col-span-6 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-[#f5f5f7] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#0a84ff]" />
                <span>Inspect Suspicious Traffic Pattern</span>
              </div>
              <span className="text-[10px] font-mono text-[#86868b]">
                TF-IDF + ADAM SOFTMAX TRIAGE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TRAFFIC_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setTrafficPattern(preset.trafficPattern);
                    setSourceEndpoint(preset.sourceEndpoint);
                    setDestinationEndpoint(preset.destinationEndpoint);
                    setProtocol(preset.protocol);
                    setDestinationPort(preset.destinationPort);
                    setPacketRatePps(preset.packetRatePps);
                    setMlCvssScore(preset.cvssScore);
                    setMlKevFlag(preset.kevFlag);
                    setMlRansomwareFlag(preset.ransomwareFlag);
                    setTrafficDescription(preset.description);
                    runTrafficInference({
                      trafficPattern: preset.trafficPattern,
                      description: preset.description,
                      sourceEndpoint: preset.sourceEndpoint,
                      destinationEndpoint: preset.destinationEndpoint,
                      protocol: preset.protocol,
                      destinationPort: preset.destinationPort,
                      packetRatePps: preset.packetRatePps,
                      cvssScore: preset.cvssScore,
                      kevFlag: preset.kevFlag,
                      ransomwareFlag: preset.ransomwareFlag,
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#161618] hover:bg-[#1f1f24] border border-white/[0.1] text-[11px] font-medium text-[#e5e5ea] text-left truncate transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                runTrafficInference();
              }}
              className="space-y-3"
            >
              <div>
                <label
                  htmlFor="ml-traffic-pattern"
                  className="text-[11px] font-mono text-[#a1a1a6] block mb-1"
                >
                  Traffic Pattern Signature
                </label>
                <input
                  id="ml-traffic-pattern"
                  type="text"
                  required
                  value={trafficPattern}
                  onChange={(e) => setTrafficPattern(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs font-mono text-[#f5f5f7]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="ml-source-endpoint"
                    className="text-[11px] font-mono text-[#a1a1a6] block mb-1"
                  >
                    Source Endpoint / Workload
                  </label>
                  <input
                    id="ml-source-endpoint"
                    type="text"
                    value={sourceEndpoint}
                    onChange={(e) => setSourceEndpoint(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs font-mono text-[#f5f5f7]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ml-dest-endpoint"
                    className="text-[11px] font-mono text-[#a1a1a6] block mb-1"
                  >
                    Destination Endpoint
                  </label>
                  <input
                    id="ml-dest-endpoint"
                    type="text"
                    value={destinationEndpoint}
                    onChange={(e) => setDestinationEndpoint(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs font-mono text-[#f5f5f7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label
                    htmlFor="ml-protocol"
                    className="text-[11px] font-mono text-[#a1a1a6] block mb-1"
                  >
                    Protocol
                  </label>
                  <input
                    id="ml-protocol"
                    type="text"
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs font-mono text-[#f5f5f7]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ml-dest-port"
                    className="text-[11px] font-mono text-[#a1a1a6] block mb-1"
                  >
                    Dest Port
                  </label>
                  <input
                    id="ml-dest-port"
                    type="number"
                    min={0}
                    max={65535}
                    value={destinationPort}
                    onChange={(e) => setDestinationPort(Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs font-mono tabular-nums text-[#f5f5f7]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ml-packet-rate"
                    className="text-[11px] font-mono text-[#a1a1a6] block mb-1"
                  >
                    Rate (pps)
                  </label>
                  <input
                    id="ml-packet-rate"
                    type="number"
                    min={0}
                    value={packetRatePps}
                    onChange={(e) => setPacketRatePps(Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs font-mono tabular-nums text-[#f5f5f7]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ml-cvss"
                    className="text-[11px] font-mono text-[#a1a1a6] block mb-1"
                  >
                    CVSS Prior
                  </label>
                  <input
                    id="ml-cvss"
                    type="number"
                    step="0.1"
                    min={0}
                    max={10}
                    value={mlCvssScore}
                    onChange={(e) => setMlCvssScore(Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs font-mono tabular-nums text-[#f5f5f7]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="ml-traffic-desc"
                  className="text-[11px] font-mono text-[#a1a1a6] block mb-1"
                >
                  Observed Telemetry &amp; Payload Context
                </label>
                <textarea
                  id="ml-traffic-desc"
                  rows={2}
                  required
                  value={trafficDescription}
                  onChange={(e) => setTrafficDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#e5e5ea]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#d1d1d6]">
                  <label htmlFor="ml-kev-flag" className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      id="ml-kev-flag"
                      type="checkbox"
                      checked={mlKevFlag}
                      onChange={(e) => setMlKevFlag(e.target.checked)}
                      className="rounded border-white/20 bg-[#0a0a0c]"
                    />
                    <span>CISA KEV Match</span>
                  </label>
                  <label htmlFor="ml-ransom-flag" className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      id="ml-ransom-flag"
                      type="checkbox"
                      checked={mlRansomwareFlag}
                      onChange={(e) => setMlRansomwareFlag(e.target.checked)}
                      className="rounded border-white/20 bg-[#0a0a0c]"
                    />
                    <span>Ransomware C2 Flag</span>
                  </label>
                </div>

                <button
                  type="submit"
                  data-testid="run-model-inference-btn"
                  disabled={busy === 'ml-infer'}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-60 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{busy === 'ml-infer' ? 'Scoring Traffic...' : 'Run Model Inference'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right: Live Inference Verdict & Recent History (6 cols) */}
          <div className="lg:col-span-6 space-y-3.5">
            {latestInference ? (
              <div
                data-testid="model-inference-result"
                className={`rounded-xl p-4 border space-y-3 ${
                  latestInference.prediction.riskScore >= 75
                    ? 'bg-[#ff453a]/10 border-[#ff453a]/35'
                    : latestInference.prediction.riskScore >= 50
                    ? 'bg-[#ff9f0a]/10 border-[#ff9f0a]/35'
                    : 'bg-[#30d158]/10 border-[#30d158]/35'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-mono text-[#a1a1a6]">
                      {latestInference.inferenceId} · {latestInference.protocol} ·{' '}
                      {latestInference.packetRatePps ?? 0} pps
                    </div>
                    <div className="text-sm font-bold text-[#f5f5f7]">
                      {latestInference.prediction.predictedClass}
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div
                      className={`text-lg font-bold ${
                        latestInference.prediction.riskScore >= 75
                          ? 'text-[#ff6961]'
                          : latestInference.prediction.riskScore >= 50
                          ? 'text-[#ffb340]'
                          : 'text-[#30d158]'
                      }`}
                    >
                      Risk {latestInference.prediction.riskScore}/100
                    </div>
                    <div className="text-[11px] text-[#d1d1d6]">
                      Confidence {latestInference.prediction.confidencePct}%
                    </div>
                  </div>
                </div>

                {/* Softmax Probability Breakdown */}
                <div className="space-y-1.5 pt-1">
                  {CLASS_ORDER.map((cls) => {
                    const prob = latestInference.prediction.probabilities[cls] ?? 0;
                    const pct = Math.round(prob * 1000) / 10;
                    const isTop = cls === latestInference.prediction.predictedClass;
                    return (
                      <div key={cls} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className={isTop ? 'text-[#f5f5f7] font-semibold' : 'text-[#a1a1a6]'}>
                            {cls}
                          </span>
                          <span className="text-[#e5e5ea] tabular-nums">{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              cls === 'INFRASTRUCTURE_HARDENING'
                                ? 'bg-[#30d158]'
                                : cls === 'AGENT_POLICY_ANOMALY'
                                ? 'bg-[#ff9f0a]'
                                : 'bg-[#ff453a]'
                            }`}
                            style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Top Contributing Signals */}
                <div className="pt-1 border-t border-white/[0.08] space-y-1">
                  <div className="text-[10px] font-mono text-[#a1a1a6]">
                    TOP CONTRIBUTING SIGNALS
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] font-mono tabular-nums">
                    {latestInference.prediction.topContributingSignals.map((sig) => (
                      <div
                        key={sig.feature}
                        title={sig.feature}
                        className="flex items-center justify-between px-2.5 py-1 rounded bg-[#0a0a0c]/80 border border-white/[0.06]"
                      >
                        <span className="text-[#d1d1d6] truncate mr-2">
                          {sig.feature.replace(/^num:/, '')}
                        </span>
                        <span
                          className={
                            sig.contribution >= 0 ? 'text-[#64d2ff] shrink-0' : 'text-[#a1a1a6] shrink-0'
                          }
                        >
                          {sig.contribution >= 0 ? `+${sig.contribution}` : sig.contribution}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] font-mono text-[#a1a1a6]">
                  <span>
                    Advisory triage only · 10-gate allowlist enforcement remains deterministic
                  </span>
                  <button
                    type="button"
                    data-testid="escalate-inference-btn"
                    disabled={busy === 'evaluate'}
                    onClick={handleEscalateInferenceToGateway}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white text-[11px] font-sans font-semibold whitespace-nowrap shrink-0"
                  >
                    <span>Escalate to Policy Gateway</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                data-testid="model-inference-empty"
                className="rounded-xl bg-[#0e0e10] border border-white/[0.08] p-6 text-center space-y-2"
              >
                <div className="text-xs font-semibold text-[#f5f5f7]">
                  No Suspicious Traffic Scored Yet
                </div>
                <p className="text-[11px] text-[#86868b]">
                  Select a traffic pattern preset or enter custom flow parameters and click Run Model Inference to inspect Softmax threat probabilities.
                </p>
              </div>
            )}

            {/* Recent Traffic Model Inference Ledger */}
            <div className="rounded-xl bg-[#0e0e10] border border-white/[0.08] p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#a1a1a6]">
                <span>RECENT TRAFFIC INFERENCES</span>
                <span className="tabular-nums">{mlStatus?.recentInferences?.length ?? 0} LOGGED</span>
              </div>
              <div
                data-testid="recent-inferences-list"
                className="space-y-1.5 max-h-[155px] overflow-y-auto pr-1"
              >
                {(mlStatus?.recentInferences || []).length === 0 ? (
                  <div className="text-[11px] text-[#86868b] py-2">
                    Inference history will appear here once traffic flows are evaluated.
                  </div>
                ) : (
                  (mlStatus?.recentInferences || []).map((item) => (
                    <div
                      key={item.inferenceId}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#161618] border border-white/[0.06] text-[11px]"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[#f5f5f7] truncate">
                          {item.trafficPattern}
                        </div>
                        <div className="text-[10px] font-mono text-[#86868b] truncate">
                          {item.sourceEndpoint} → {item.destinationEndpoint}
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums shrink-0">
                        <div
                          className={`text-[10px] font-bold ${
                            item.prediction.riskScore >= 75
                              ? 'text-[#ff6961]'
                              : item.prediction.riskScore >= 50
                              ? 'text-[#ffb340]'
                              : 'text-[#30d158]'
                          }`}
                        >
                          {item.prediction.riskScore}/100
                        </div>
                        <div className="text-[10px] text-[#a1a1a6]">
                          {item.prediction.predictedClass}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Red Force vs Blue Force Control Validation Log & 10-Layer Architecture */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <section className="xl:col-span-5 apple-card p-5 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
            <h2 className="text-sm font-bold text-[#f5f5f7] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#30d158]" />
              <span>Red/Blue Control Validation Ledger</span>
            </h2>
            <span className="text-[10px] font-mono text-[#86868b]">{overview.validationRuns.length} RUNS</span>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {overview.validationRuns.map((run) => (
              <div key={run.id} className="rounded-xl bg-[#0e0e10] border border-white/[0.08] p-3 text-xs space-y-1">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-[#2997ff] font-semibold">{run.targetAgentId}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded border ${
                      run.controlStatus === 'VALIDATED_BLOCKED'
                        ? 'bg-[#30d158]/15 text-[#30d158] border-[#30d158]/35'
                        : 'bg-[#ff453a]/15 text-[#ff6961] border-[#ff453a]/35'
                    }`}
                  >
                    {run.controlStatus}
                  </span>
                </div>
                <div className="font-semibold text-[#f5f5f7] text-[11px]">{run.attackVector}</div>
                <div className="text-[11px] text-[#a1a1a6]">{run.evidenceSummary}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="xl:col-span-7 apple-card p-5 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
            <h2 className="text-sm font-bold text-[#f5f5f7] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0a84ff]" />
              <span>10-Layer Agentic Cyber Defense Command Architecture</span>
            </h2>
            <span className="text-[10px] font-mono text-[#30d158]">ALL LAYERS ACTIVE</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {overview.architectureLayers.map((layer) => (
              <button
                key={layer.layer}
                type="button"
                onClick={() => onSelectModule(layer.targetModule)}
                className="text-left rounded-xl bg-[#0e0e10] hover:bg-[#18181c] border border-white/[0.08] hover:border-[#0a84ff]/35 p-3 transition-colors space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#0a84ff] font-bold">LAYER {layer.layer}</span>
                  <span className="text-[#30d158]">OPERATIONAL</span>
                </div>
                <div className="text-xs font-semibold text-[#f5f5f7]">{layer.name}</div>
                <div className="text-[11px] text-[#86868b] leading-snug">{layer.description}</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
