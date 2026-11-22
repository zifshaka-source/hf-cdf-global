import React, { useState, useEffect } from 'react';
import {
  Globe,
  Radio,
  Cpu,
  Layers,
  Shield,
  ShieldAlert,
  Zap,
  Activity,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2,
  Terminal,
  Eye,
  Video,
  Camera,
  Server,
} from 'lucide-react';
import { sound } from '../../core/sound-fx';

interface ClusterRegion {
  id: string;
  name: string;
  location: string;
  gpus: string;
  loadPercent: number;
  roceLatencyUs: number;
  pfcPauseRate: number;
  status: 'nominal' | 'alert' | 'quarantined';
  activeIncidents: number;
}

const CLUSTERS: ClusterRegion[] = [
  {
    id: 'us-east-apex',
    name: 'US-East Apex Supercluster',
    location: 'Ashburn, VA, USA',
    gpus: '128,000x NVIDIA H100 SXM5',
    loadPercent: 88.4,
    roceLatencyUs: 1.18,
    pfcPauseRate: 14,
    status: 'alert',
    activeIncidents: 1,
  },
  {
    id: 'eu-west-dublin',
    name: 'EU-West Sovereign Vault',
    location: 'Dublin, Ireland',
    gpus: '64,000x NVIDIA H100 SXM5',
    loadPercent: 74.2,
    roceLatencyUs: 0.94,
    pfcPauseRate: 2,
    status: 'nominal',
    activeIncidents: 0,
  },
  {
    id: 'ap-east-tokyo',
    name: 'Asia-Pacific Core',
    location: 'Tokyo, Japan',
    gpus: '32,000x NVIDIA H100 SXM5',
    loadPercent: 62.8,
    roceLatencyUs: 1.05,
    pfcPauseRate: 5,
    status: 'nominal',
    activeIncidents: 0,
  },
  {
    id: 'nordic-lulea',
    name: 'Nordic Hydro Vault Alpha',
    location: 'Luleå, Sweden',
    gpus: '48,000x NVIDIA B200 Blackwell',
    loadPercent: 91.5,
    roceLatencyUs: 0.82,
    pfcPauseRate: 1,
    status: 'nominal',
    activeIncidents: 0,
  },
];

export const WarRoomCockpit: React.FC = () => {
  const [clusters, setClusters] = useState<ClusterRegion[]>(CLUSTERS);
  const [selectedClusterId, setSelectedClusterId] = useState<string>('us-east-apex');
  const [airGapArmed, setAirGapArmed] = useState(false);
  const [airGapExecuted, setAirGapExecuted] = useState(false);
  const [surveillanceFeed, setSurveillanceFeed] = useState<'bunker' | 'vault'>('bunker');
  const [liveStreamEvents, setLiveStreamEvents] = useState<string[]>([
    '23:54:10 UTC [ROCEv2] InBand Telemetry packet timestamp aligned across 128k H100s.',
    '23:54:12 UTC [QUORUM] Swarm agent consensus reached: 6/7 votes to isolate inference-worker-01.',
    '23:54:14 UTC [ENCLAVE] AMD SEV-SNP cryptographic quote validated on Vault-01.',
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().toISOString().substring(11, 19);
      const msgs = [
        `[NCCL] AllReduce collective sync: 382 GB/s bus throughput nominal.`,
        `[HSM] Ephemeral KMS session rotated for Llama-3.3-70B vault.`,
        `[EBPF] Ring-buffer sampled 240,000 syscalls in 1s · 0 privilege escapes.`,
        `[INGRESS] Cloudflare Magic Transit BGP flow normal · 0 Terabit DDoS detected.`,
      ];
      const nextMsg = `${now} UTC ${msgs[Math.floor(Math.random() * msgs.length)]}`;
      setLiveStreamEvents((prev) => [nextMsg, ...prev.slice(0, 7)]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const handleTriggerAirGap = () => {
    sound.play('defcon');
    setAirGapExecuted(true);
    setClusters((prev) =>
      prev.map((c) =>
        c.id === 'us-east-apex' ? { ...c, status: 'quarantined', loadPercent: 0 } : c
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
            <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>GLOBAL WAR ROOM COCKPIT · SOVEREIGN AI COMPUTE MESH</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Strategic Defense Operations & Multi-Cluster Mesh
          </h1>
          <p className="text-xs text-slate-400">
            Real-time InfiniBand NDR 800Gbps telemetry, cross-datacenter RoCE fabric health, and distributed multi-agent consensus.
          </p>
        </div>
      </div>

      {/* Real Visual War Room Enclave Surveillance Feeds */}
      <div className="rounded-xl border border-white/10 bg-slate-950/90 overflow-hidden shadow-2xl space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-white font-bold tracking-wider">PHYSICAL ENCLAVE REAL-TIME SURVEILLANCE FEED</span>
            <span className="px-2 py-0.5 text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 rounded font-bold">
              02:37 ZULU SECURE STREAM
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.play('click');
                setSurveillanceFeed('bunker');
              }}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
                surveillanceFeed === 'bunker'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold'
                  : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>CAM-01: War Room Operations Deck</span>
            </button>

            <button
              onClick={() => {
                sound.play('click');
                setSurveillanceFeed('vault');
              }}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
                surveillanceFeed === 'vault'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 font-bold'
                  : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>CAM-04: Subterranean Server Vault</span>
            </button>
          </div>
        </div>

        <div className="relative w-full aspect-[21/9] min-h-[240px] max-h-[360px] rounded-lg overflow-hidden border border-white/10 bg-black">
          {surveillanceFeed === 'bunker' ? (
            <img
              src="/src/assets/images/cyber_command_environment_1793863607258.jpg"
              alt="Joint Cyber Defense Center War Room Deck"
              className="w-full h-full object-cover filter contrast-110 brightness-95"
            />
          ) : (
            <img
              src="/src/assets/images/vault_interlock_gate_1794028110457.jpg"
              alt="Subterranean AI Model Server Enclave and Armored Vault"
              className="w-full h-full object-cover filter contrast-110 brightness-95"
            />
          )}

          {/* Tactical Camera HUD Overlay */}
          <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded border border-white/20 text-[11px] font-mono text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-bold text-white">
              {surveillanceFeed === 'bunker'
                ? 'JCDC WAR ROOM · CONSOLE SECTOR 8A'
                : 'ASHBURN VAULT-01 · AIR-GAP BLAST SECTOR'}
            </span>
            <span className="text-slate-400 text-[10px]">
              {surveillanceFeed === 'bunker' ? 'OPERATOR CREW: 14 STATIONED' : 'TITANIUM SEALS: 100% ARMORED'}
            </span>
          </div>

          <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded border border-white/20 text-[10px] font-mono text-cyan-300">
            OPTICAL BANDWIDTH: 3.2 Tbps · TAMPER SENSORS ARMED
          </div>
        </div>
      </div>

      {/* Global Supercluster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {clusters.map((cluster) => {
          const isSelected = cluster.id === selectedClusterId;
          return (
            <div
              key={cluster.id}
              onClick={() => {
                sound.play('click');
                setSelectedClusterId(cluster.id);
              }}
              className={`p-4 rounded-lg border cursor-pointer transition-all space-y-3 ${
                isSelected
                  ? 'border-amber-400 bg-amber-950/30 ring-1 ring-amber-400/50 shadow-lg shadow-amber-950/40'
                  : cluster.status === 'alert'
                  ? 'border-red-500/50 bg-red-950/20'
                  : cluster.status === 'quarantined'
                  ? 'border-slate-800 bg-slate-950 opacity-60'
                  : 'border-white/10 bg-slate-900/40 hover:bg-white/5'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-xs text-white font-mono">{cluster.name}</div>
                  <div className="text-[11px] text-slate-400">{cluster.location}</div>
                </div>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    cluster.status === 'alert'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : cluster.status === 'quarantined'
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {cluster.status}
                </span>
              </div>

              <div className="text-xs font-mono text-cyan-400">{cluster.gpus}</div>

              <div className="space-y-1 pt-1 border-t border-white/5 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>GPU Compute Load</span>
                  <span className="text-white font-semibold">{cluster.loadPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      cluster.loadPercent > 85 ? 'bg-amber-400' : 'bg-cyan-500'
                    }`}
                    style={{ width: `${cluster.loadPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                <span>RoCE P99: {cluster.roceLatencyUs}µs</span>
                <span>PFC Pause: {cluster.pfcPauseRate}/s</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Tactical View: InfiniBand NDR Telemetry & Consensus Chamber */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Swarm Quorum Chamber (6 Cols) */}
        <div className="lg:col-span-6 p-5 rounded-lg border border-white/10 bg-slate-900/50 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <div className="text-[10px] font-mono text-cyan-400 uppercase">AUTONOMOUS CONSENSUS QUORUM</div>
              <h2 className="text-sm font-bold text-white font-mono">
                Swarm Deliberation on Node Containment (Node-01)
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              QUORUM REACHED (6/7)
            </span>
          </div>

          <p className="text-xs text-slate-300 font-mono">
            Cryptographic consensus protocol (PBFT-like voting) ensures no single autonomous agent can unilaterally disrupt GPU workloads without supermajority quorum.
          </p>

          <div className="space-y-2">
            {[
              { agent: 'Sentinel-Zero', role: 'Perimeter Sentry', vote: 'YES', reason: 'Chunked egress rate exceeded 500MB/s threshold' },
              { agent: 'Aegis-Heuristic', role: 'Behavioral Heuristics', vote: 'YES', reason: 'Detected unauthorized ptrace hook on worker PID 4892' },
              { agent: 'Chronos-Forensics', role: 'Forensic Timeline', vote: 'YES', reason: 'Cryptographic hash matched unapproved external ASN transfer' },
              { agent: 'Cortex-CTI', role: 'Threat Intelligence Correlation', vote: 'YES', reason: 'Attributed C2 endpoint to APT-41 / ShadowPanda proxy' },
              { agent: 'Valkyrie-Enforcer', role: 'Containment Executor', vote: 'YES', reason: 'EBPF hardware drop rule prepared for immediate execution' },
              { agent: 'Cipher-Audit', role: 'Model Security Auditor', vote: 'YES', reason: 'Safetensors shard BLAKE3 attestation invalidated' },
              { agent: 'Prometheus-Red', role: 'Adversarial Emulator', vote: 'ABSTAIN', reason: 'Red agent observing defensive convergence latency' },
            ].map((v) => (
              <div
                key={v.agent}
                className="flex items-center justify-between p-2.5 rounded bg-black/40 border border-white/5 text-xs font-mono"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-200">{v.agent} ({v.role})</div>
                  <div className="text-[10px] text-slate-500">{v.reason}</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded font-bold text-[10px] shrink-0 ${
                    v.vote === 'YES'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {v.vote}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: InfiniBand NDR Fabric & Air-Gap Kill Switch (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* InfiniBand Fabric Metrics */}
          <div className="p-5 rounded-lg border border-white/10 bg-slate-900/50 space-y-3">
            <div className="text-[10px] font-mono text-cyan-400 uppercase">QUANTUM-2 NDR 800G FABRIC</div>
            <h2 className="text-sm font-bold text-white font-mono">
              In-Band Network Telemetry & Collective Acceleration
            </h2>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-black/40 rounded border border-white/5">
                <div className="text-slate-500 text-[10px]">ALLREDUCE BUS SPEED</div>
                <div className="text-base font-bold text-cyan-400">382.4 GB/s</div>
                <div className="text-[10px] text-slate-500">Per GPU SXM5 Interconnect</div>
              </div>

              <div className="p-3 bg-black/40 rounded border border-white/5">
                <div className="text-slate-500 text-[10px]">ROCEv2 PACKET DROP RATE</div>
                <div className="text-base font-bold text-emerald-400">0.000012%</div>
                <div className="text-[10px] text-slate-500">Hardware Lossless Buffer</div>
              </div>

              <div className="p-3 bg-black/40 rounded border border-white/5">
                <div className="text-slate-500 text-[10px]">NCCL RING LATENCY</div>
                <div className="text-base font-bold text-indigo-300">1.14 µs</div>
                <div className="text-[10px] text-slate-500">Across 128k H100 Nodes</div>
              </div>

              <div className="p-3 bg-black/40 rounded border border-white/5">
                <div className="text-slate-500 text-[10px]">PFC DEADLOCK DETECTOR</div>
                <div className="text-base font-bold text-emerald-400">0 DEADLOCKS</div>
                <div className="text-[10px] text-slate-500">Adaptive Routing Active</div>
              </div>
            </div>
          </div>

          {/* Emergency Hardware Air-Gap Disconnect Switch */}
          <div className="p-5 rounded-lg border border-red-500/40 bg-red-950/20 space-y-3">
            <div className="flex items-center gap-2 text-red-400 text-xs font-mono font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>SOVEREIGN DISASTER ISOLATION: HARDWARE AIR-GAP</span>
            </div>

            <p className="text-xs text-slate-300 font-mono">
              Electromechanically severs US-East Apex Supercluster from external Tier-1 transit backbones. BGP routes withdrawn in 80ms.
            </p>

            {airGapExecuted ? (
              <div className="p-3 bg-red-950/70 border border-red-500 rounded text-center text-xs font-mono font-bold text-red-200">
                [AIR-GAP ENGAGED] Apex Supercluster physically isolated. Internal GPU inference loops running in air-gapped quarantine.
              </div>
            ) : (
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => {
                    sound.play('click');
                    setAirGapArmed(!airGapArmed);
                  }}
                  className={`px-3 py-2 text-xs font-mono font-bold rounded border transition-colors ${
                    airGapArmed
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-white/5 text-slate-300 border-white/10'
                  }`}
                >
                  {airGapArmed ? 'DISARM SWITCH' : 'ARM AIR-GAP SWITCH'}
                </button>

                <button
                  disabled={!airGapArmed}
                  onClick={handleTriggerAirGap}
                  className={`px-4 py-2 text-xs font-mono font-bold rounded border transition-all ${
                    airGapArmed
                      ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-lg shadow-red-900/60'
                      : 'bg-slate-800 text-slate-600 border-transparent cursor-not-allowed'
                  }`}
                >
                  EXECUTE HARDWARE AIR-GAP
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Stream Terminal */}
      <div className="p-4 rounded-lg border border-white/10 bg-black/90 font-mono text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-500 text-[11px] pb-2 border-b border-white/10">
          <span className="flex items-center gap-2 text-cyan-400">
            <Terminal className="w-3.5 h-3.5" />
            <span>GLOBAL IN-BAND TELEMETRY RING-BUFFER</span>
          </span>
          <span>POLLING: 1000Hz · HARDWARE PRECISION TIMESTAMPING</span>
        </div>
        <div className="space-y-1">
          {liveStreamEvents.map((evt, idx) => (
            <div key={idx} className="text-slate-300 font-mono text-[11px] truncate">
              {evt}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
