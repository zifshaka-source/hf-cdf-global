import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Radio,
  Crosshair,
  Cpu,
  Activity,
  Terminal,
  Play,
  Lock,
  Unlock,
  Target,
  RefreshCw,
  Server,
  Layers,
  AlertOctagon,
  Eye,
  Wifi,
  HardDrive,
  CheckCircle2,
  Users,
  Sword,
  Globe,
  MapPin,
  Filter,
} from 'lucide-react';
import { sound } from '../../core/sound-fx';

interface AnimatedAgentSoldier {
  id: string;
  name: string;
  callsign: string;
  rank: 'Recruit' | 'Specialist' | 'Veteran' | 'Elite Centurion' | 'Apex General';
  specialty: string;
  status: 'training' | 'barracks_ready' | 'scrambling' | 'in_combat' | 'resting';
  combatReadiness: number;
  neutralizations: number;
  avatarColor: string;
  accentTheme: string;
  posX: number;
  posY: number;
  targetX: number;
  targetY: number;
  currentAction: 'sparring' | 'calibrating' | 'meditating' | 'patrolling' | 'firing';
  sector: string;
  avatarUrl: string;
}

const INITIAL_ANIMATED_SOLDIERS: AnimatedAgentSoldier[] = [
  {
    id: 'soldier-01',
    name: 'Sentinel-Zero Alpha',
    callsign: 'SENTINEL-01',
    rank: 'Apex General',
    specialty: 'Perimeter eBPF Jamming',
    status: 'barracks_ready',
    combatReadiness: 100,
    neutralizations: 1842,
    avatarColor: 'from-fuchsia-600 to-pink-700',
    accentTheme: 'border-fuchsia-500/50 bg-fuchsia-950/30 text-fuchsia-300',
    posX: 20,
    posY: 30,
    targetX: 25,
    targetY: 35,
    currentAction: 'patrolling',
    sector: 'Sector Alpha - Ashburn Vault',
    avatarUrl: '/src/assets/images/sentinel_agent_portrait_1794163037608.jpg',
  },
  {
    id: 'soldier-02',
    name: 'Aegis Vanguard Beta',
    callsign: 'AEGIS-02',
    rank: 'Elite Centurion',
    specialty: 'Neural Payload De-obfuscation',
    status: 'barracks_ready',
    combatReadiness: 98,
    neutralizations: 914,
    avatarColor: 'from-emerald-600 to-teal-700',
    accentTheme: 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300',
    posX: 70,
    posY: 25,
    targetX: 65,
    targetY: 30,
    currentAction: 'sparring',
    sector: 'Sector Beta - Tokyo Inference',
    avatarUrl: '/src/assets/images/cyber_agent_portrait_1794163023777.jpg',
  },
  {
    id: 'soldier-03',
    name: 'Valkyrie Enforcer Gamma',
    callsign: 'VALKYRIE-03',
    rank: 'Elite Centurion',
    specialty: 'Cryptographic Vault Sentry',
    status: 'barracks_ready',
    combatReadiness: 100,
    neutralizations: 618,
    avatarColor: 'from-amber-600 to-yellow-700',
    accentTheme: 'border-amber-500/50 bg-amber-950/30 text-amber-300',
    posX: 45,
    posY: 70,
    targetX: 50,
    targetY: 65,
    currentAction: 'calibrating',
    sector: 'Sector Alpha - Ashburn Vault',
    avatarUrl: '/src/assets/images/sentinel_agent_portrait_1794163037608.jpg',
  },
  {
    id: 'soldier-04',
    name: 'Cipher WeightGuard Delta',
    callsign: 'CIPHER-04',
    rank: 'Veteran',
    specialty: 'Adversarial Poisoning Defense',
    status: 'training',
    combatReadiness: 84,
    neutralizations: 3209,
    avatarColor: 'from-violet-600 to-purple-700',
    accentTheme: 'border-violet-500/50 bg-violet-950/30 text-violet-300',
    posX: 80,
    posY: 75,
    targetX: 75,
    targetY: 70,
    currentAction: 'firing',
    sector: 'Sector Gamma - Frankfurt DE-CIX',
    avatarUrl: '/src/assets/images/cyber_agent_portrait_1794163023777.jpg',
  },
  {
    id: 'soldier-05',
    name: 'Chronos Forensic Epsilon',
    callsign: 'CHRONOS-05',
    rank: 'Veteran',
    specialty: 'WORM Ledger Non-Repudiation',
    status: 'training',
    combatReadiness: 91,
    neutralizations: 442,
    avatarColor: 'from-sky-600 to-blue-700',
    accentTheme: 'border-sky-500/50 bg-sky-950/30 text-sky-300',
    posX: 30,
    posY: 80,
    targetX: 35,
    targetY: 75,
    currentAction: 'meditating',
    sector: 'Sector Delta - Orbital Sentry',
    avatarUrl: '/src/assets/images/sentinel_agent_portrait_1794163037608.jpg',
  },
  {
    id: 'soldier-06',
    name: 'Cortex CTI Zeta',
    callsign: 'CORTEX-06',
    rank: 'Specialist',
    specialty: 'BGP Peering FlowSpec Scrubbing',
    status: 'barracks_ready',
    combatReadiness: 76,
    neutralizations: 5410,
    avatarColor: 'from-rose-600 to-red-700',
    accentTheme: 'border-rose-500/50 bg-rose-950/30 text-rose-300',
    posX: 15,
    posY: 60,
    targetX: 20,
    targetY: 55,
    currentAction: 'patrolling',
    sector: 'Sector Beta - Tokyo Inference',
    avatarUrl: '/src/assets/images/cyber_agent_portrait_1794163023777.jpg',
  },
  {
    id: 'soldier-07',
    name: 'Ghost Countermeasure Eta',
    callsign: 'GHOST-07',
    rank: 'Elite Centurion',
    specialty: 'Deception Honeynet TTP Extraction',
    status: 'barracks_ready',
    combatReadiness: 99,
    neutralizations: 1104,
    avatarColor: 'from-cyan-600 to-blue-800',
    accentTheme: 'border-cyan-500/50 bg-cyan-950/30 text-cyan-300',
    posX: 55,
    posY: 35,
    targetX: 60,
    targetY: 40,
    currentAction: 'calibrating',
    sector: 'Sector Delta - Orbital Sentry',
    avatarUrl: '/src/assets/images/sentinel_agent_portrait_1794163037608.jpg',
  },
];

export interface AutonomousDefenseStation {
  id: string;
  callsign: string;
  name: string;
  subsystem: string;
  status: 'nominal' | 'engaged' | 'intercepting' | 'quarantined';
  role: string;
  clearance: string;
  cpuLoad: number;
  memoryUsage: number;
  packetRate: string;
  neutralizations: number;
  uptime: string;
  signature: string;
  ipAddress: string;
  activeMitigations: string[];
}

const DEFENSE_STATIONS: AutonomousDefenseStation[] = [
  {
    id: 'station-01',
    callsign: 'SENTINEL-ZERO',
    name: 'Perimeter eBPF Kernel Interceptor',
    subsystem: 'Linux 6.8 XDP / eBPF Hook Array',
    status: 'intercepting',
    role: 'Raw Packet Filtering & Zero-Day Microsecond Drops',
    clearance: 'TS // CYBERCOM LEVEL 5',
    cpuLoad: 38,
    memoryUsage: 64,
    packetRate: '4.8M pkts/s',
    neutralizations: 1842,
    uptime: '142d 18h 12m',
    signature: 'SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    ipAddress: '10.240.0.12 (Enclave VNet Alpha)',
    activeMitigations: [
      'XDP_DROP rule #8491: Dropping SYN flood from ASN 49512',
      'Ring buffer eBPF hook: Intercepting sys_enter_ptrace exploits',
      'Hardware offload checksum bypass prevention active',
    ],
  },
  {
    id: 'station-02',
    callsign: 'AEGIS-HEURISTIC',
    name: 'Neural Payload De-obfuscation Engine',
    subsystem: 'Deep Vector Pattern Matcher v4.2',
    status: 'engaged',
    role: 'Adversarial Prompt Injection & Exfiltration Quarantine',
    clearance: 'TS // SCI RECON-ALPHA',
    cpuLoad: 72,
    memoryUsage: 81,
    packetRate: '1.2M pkts/s',
    neutralizations: 914,
    uptime: '89d 04h 33m',
    signature: 'SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    ipAddress: '10.240.0.18 (Inference Guard Fabric)',
    activeMitigations: [
      'Token entropy analyzer: Detected 99.4% jailbreak prompt embedding',
      'Vector cosine distance quarantine: Payload isolated to sandboxed runtime',
      'Model parameter weight drift check: 0.000% variance verified',
    ],
  },
  {
    id: 'station-03',
    callsign: 'VALKYRIE-ENFORCER',
    name: 'Cryptographic Model Vault Sentry',
    subsystem: 'Hardware HSM FIPS 140-3 Level 4',
    status: 'nominal',
    role: 'Sovereign 400B Model Weight Integrity & Key Custody',
    clearance: 'TS // SOVEREIGN WEAPONS VAULT',
    cpuLoad: 24,
    memoryUsage: 45,
    packetRate: '320k pkts/s',
    neutralizations: 618,
    uptime: '312d 11h 05m',
    signature: 'SHA256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    ipAddress: '10.240.100.4 (Air-Gap Cryo Enclave)',
    activeMitigations: [
      'Merkle root validation on 400B weights tensor shards: 100% PASSED',
      'Multi-party computation threshold quorum: 5/5 keys present and sealed',
      'Physical microswitch sensor tamper circuit: UNBROKEN',
    ],
  },
  {
    id: 'station-04',
    callsign: 'CORTEX-CTI',
    name: 'Adversarial Threat Intelligence Fabric',
    subsystem: 'Global BGP Peering & FlowSpec Mitigator',
    status: 'intercepting',
    role: 'Autonomous BGP Null-Routing & ISP Scrubbing Sync',
    clearance: 'SECRET // DEFENSE INTEL',
    cpuLoad: 52,
    memoryUsage: 59,
    packetRate: '6.4M pkts/s',
    neutralizations: 3209,
    uptime: '198d 22h 41m',
    signature: 'SHA256:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    ipAddress: '198.51.100.22 (BGP Border Gateway 01)',
    activeMitigations: [
      'FlowSpec advertisement sent to DE-CIX Frankfurt: Dropping ASN 61294',
      'Equinix Ashburn cross-connect scrubbing tunnel established',
      'Autonomous DNS Sinkhole populated with 1,248 hostile C2 domains',
    ],
  },
  {
    id: 'station-05',
    callsign: 'CHRONO-AUDIT',
    name: 'Immutable Cryptographic Ledger Custodian',
    subsystem: 'WORM Optical & Blockchain Forensics',
    status: 'nominal',
    role: 'Cryptographic Non-Repudiation & Court-Admissible Proofs',
    clearance: 'TS // JUDICIAL AUDIT CHAIN',
    cpuLoad: 19,
    memoryUsage: 38,
    packetRate: '180k pkts/s',
    neutralizations: 442,
    uptime: '420d 09h 15m',
    signature: 'SHA256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    ipAddress: '10.240.200.8 (Hardened WORM Cluster)',
    activeMitigations: [
      'Continuous block hashing: Block #1,492,088 verified against RFC 3161',
      'Hardware timestamp authority (TSA) synchronized with USNO atomic clock',
      'Zero-knowledge proof generated for auditor compliance verification',
    ],
  },
  {
    id: 'station-06',
    callsign: 'NULLROUTE-VOID',
    name: 'Volumetric DDoS Suppression Core',
    subsystem: 'Anycast Tbps-Scale Scrubbing Mesh',
    status: 'engaged',
    role: 'Autonomous Ingress Rate-Limiting & Syn-Cookie Generation',
    clearance: 'SECRET // INFRASTRUCTURE DEFENSE',
    cpuLoad: 68,
    memoryUsage: 74,
    packetRate: '12.8M pkts/s',
    neutralizations: 5410,
    uptime: '67d 14h 50m',
    signature: 'SHA256:ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    ipAddress: '203.0.113.88 (Anycast Node Global)',
    activeMitigations: [
      'Scrubbing 480 Gbps UDP reflection flood targeting inference endpoints',
      'Hardware Syn-Cookie generation enabled across 16 spine switches',
      'BGP Community 65000:666 applied to 28 hostile IP subnets',
    ],
  },
  {
    id: 'station-07',
    callsign: 'GHOST-COUNTER',
    name: 'Deception & Honeynet Sensor Array',
    subsystem: 'High-Interaction Decoy Model Clusters',
    status: 'intercepting',
    role: 'Hostile TTP Extraction, Reverse Payload Tracing & Attacker Fingerprinting',
    clearance: 'TS // SPECIAL ACCESS PROGRAM',
    cpuLoad: 44,
    memoryUsage: 53,
    packetRate: '920k pkts/s',
    neutralizations: 1104,
    uptime: '215d 07h 02m',
    signature: 'SHA256:8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
    ipAddress: '10.240.150.99 (Synthetic Decoy Subnet)',
    activeMitigations: [
      'Adversary Volt-Agent-9 trapped in honeypot decoy weights environment',
      'Extracting binary zero-day payload signature for automated YARA generation',
      'Telemetry forwarded to Federal Cyber Command Joint Task Force',
    ],
  },
];

interface AgentWarBarracksProps {
  onNotify?: (message: string, type: 'info' | 'success' | 'alert') => void;
}

export const AgentWarBarracks: React.FC<AgentWarBarracksProps> = ({ onNotify }) => {
  const [soldiers, setSoldiers] = useState<AnimatedAgentSoldier[]>(INITIAL_ANIMATED_SOLDIERS);
  const [selectedSoldierId, setSelectedSoldierId] = useState<string>(INITIAL_ANIMATED_SOLDIERS[0].id);
  const [stations, setStations] = useState<AutonomousDefenseStation[]>(DEFENSE_STATIONS);
  const [selectedStationId, setSelectedStationId] = useState<string>(DEFENSE_STATIONS[0].id);
  const [warRoomActive, setWarRoomActive] = useState<boolean>(false);
  const [isVaultAirGapped, setIsVaultAirGapped] = useState<boolean>(false);
  const [isBgpSevered, setIsBgpSevered] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'combat'>('all');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `[${new Date().toISOString().substring(11, 19)}] [INIT] Autonomous Agent Training Barracks & Combat Operations Center online.`,
    `[${new Date().toISOString().substring(11, 19)}] [DEPLOYMENT] Deployment Map grid synchronized across 4 secure regional sectors.`,
  ]);

  const terminalRef = useRef<HTMLDivElement>(null);

  const selectedSoldier = soldiers.find((s) => s.id === selectedSoldierId) || soldiers[0];
  const selectedStation = stations.find((s) => s.id === selectedStationId) || stations[0];

  // Real-time animation loop: agent soldiers wander and train on the canvas
  useEffect(() => {
    const interval = setInterval(() => {
      setSoldiers((prev) =>
        prev.map((s) => {
          const dx = s.targetX - s.posX;
          const dy = s.targetY - s.posY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let newTargetX = s.targetX;
          let newTargetY = s.targetY;

          if (dist < 3) {
            newTargetX = Math.floor(Math.random() * 80) + 10;
            newTargetY = Math.floor(Math.random() * 80) + 10;
          }

          const speed = warRoomActive ? 1.8 : 0.7;
          const nextX = s.posX + (dx / (dist || 1)) * speed;
          const nextY = s.posY + (dy / (dist || 1)) * speed;

          const actions: AnimatedAgentSoldier['currentAction'][] = [
            'sparring',
            'calibrating',
            'meditating',
            'patrolling',
            'firing',
          ];
          const randomAction = Math.random() < 0.03 ? actions[Math.floor(Math.random() * actions.length)] : s.currentAction;

          return {
            ...s,
            posX: nextX,
            posY: nextY,
            targetX: newTargetX,
            targetY: newTargetY,
            currentAction: randomAction,
          };
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, [warRoomActive]);

  // Keep terminal scrolled to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const handleScrambleAllToWar = () => {
    sound.play('alert');
    setWarRoomActive(true);
    setSoldiers((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'in_combat',
        combatReadiness: 100,
        currentAction: 'firing',
      }))
    );
    const ts = new Date().toISOString().substring(11, 19);
    setTerminalLogs((prev) => [
      ...prev,
      `[${ts}] 🚨 GENERAL ALARM: AGENT SOLDIERS SCRAMBLED INTO LIVE COMBAT DRILL!`,
    ]);
    onNotify?.('🚨 GENERAL SCRAMBLE: Agent soldiers engaged in live combat animation!', 'alert');
  };

  const handleStandDown = () => {
    sound.play('click');
    setWarRoomActive(false);
    setSoldiers((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'barracks_ready',
        combatReadiness: 100,
        currentAction: 'patrolling',
      }))
    );
    const ts = new Date().toISOString().substring(11, 19);
    setTerminalLogs((prev) => [
      ...prev,
      `[${ts}] 🛡️ STAND DOWN: Agent soldiers returning to standard training patrols.`,
    ]);
    onNotify?.('Agent soldiers recalled to barracks patrols.', 'success');
  };

  const filteredSoldiers = soldiers.filter((s) => {
    if (statusFilter === 'online') return s.status === 'barracks_ready' || s.status === 'training';
    if (statusFilter === 'offline') return s.status === 'resting';
    if (statusFilter === 'combat') return s.status === 'in_combat' || warRoomActive;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Classification & Military C4ISR Operations Header */}
      <div className="rounded-xl border border-white/10 bg-slate-950 p-5 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/40 font-bold whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />
                SOVEREIGN AGENT BARRACKS & DEPLOYMENT MAP GRID
              </span>
              <span className="text-slate-500 hidden sm:inline">|</span>
              <span className="text-cyan-400 font-semibold whitespace-nowrap">7 AGENT UNITS DEPLOYED</span>
              <span className="text-slate-600 hidden sm:inline">·</span>
              <span className="text-emerald-400 font-semibold whitespace-nowrap">QUANTUM-SECURED TRAINING</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Agent War Room & Deployment Map</span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                {warRoomActive ? 'LIVE WAR DEPLOYED' : 'BARRACKS DRILLS ACTIVE'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
              Visual animated command room and regional deployment map grid where agent units patrol sectors, execute training drills, and maintain sovereign model enclaves.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!warRoomActive ? (
              <button
                onClick={handleScrambleAllToWar}
                className="px-3.5 py-2.5 bg-gradient-to-r from-fuchsia-600 via-rose-600 to-amber-600 hover:opacity-90 text-white font-mono font-bold rounded-lg text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-fuchsia-950/60 transition-all hover:scale-[1.02]"
              >
                <Sword className="w-4 h-4 text-white animate-pulse" />
                <span>SCRAMBLE ALL AGENTS</span>
              </button>
            ) : (
              <button
                onClick={handleStandDown}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-bold rounded-lg text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-950/60 transition-all hover:scale-[1.02]"
              >
                <ShieldCheck className="w-4 h-4 text-slate-950" />
                <span>RECALL TO BARRACKS</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DEPLOYMENT MAP GRID & STATUS FILTER */}
      <div className="rounded-xl border border-white/10 bg-slate-950 p-5 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 font-mono text-xs text-white">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="font-bold">REGIONAL DEPLOYMENT MAP GRID & SECTOR ASSIGNMENTS</span>
          </div>

          {/* Status Indicator Filter Toggle */}
          <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-900 p-1 rounded border border-white/10">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            {(['all', 'online', 'offline', 'combat'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  sound.play('click');
                  setStatusFilter(filter);
                }}
                className={`px-2.5 py-1 rounded capitalize transition-colors ${
                  statusFilter === filter
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Deployment Map Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['Sector Alpha - Ashburn Vault', 'Sector Beta - Tokyo Inference', 'Sector Gamma - Frankfurt DE-CIX', 'Sector Delta - Orbital Sentry'].map((sectorName) => {
            const sectorAgents = filteredSoldiers.filter((s) => s.sector === sectorName);
            return (
              <div key={sectorName} className="p-4 rounded-lg border border-white/10 bg-slate-900/60 space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="truncate">{sectorName.split('-')[0]}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-slate-400">
                    {sectorAgents.length} Units
                  </span>
                </div>

                <div className="space-y-2 min-h-[140px]">
                  {sectorAgents.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic py-6 text-center">
                      No units currently matching filter in this sector.
                    </div>
                  ) : (
                    sectorAgents.map((ag) => (
                      <div
                        key={ag.id}
                        onClick={() => setSelectedSoldierId(ag.id)}
                        className={`p-2.5 rounded border cursor-pointer transition-all flex items-center gap-2.5 ${
                          selectedSoldierId === ag.id
                            ? 'border-cyan-400 bg-slate-800 ring-1 ring-cyan-400/40'
                            : 'border-white/5 bg-slate-950/60 hover:bg-slate-800'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-black border border-white/10">
                          <img
                            src={ag.avatarUrl}
                            alt={ag.callsign}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-white truncate">
                            <span className="truncate">{ag.callsign}</span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                warRoomActive || ag.status === 'in_combat'
                                  ? 'bg-red-500 animate-ping'
                                  : 'bg-emerald-400'
                              }`}
                            />
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{ag.specialty}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Body: Animated Training Floor Canvas + Stations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Live Animated Training Floor Canvas (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#060913] p-5 space-y-4 shadow-2xl relative overflow-hidden min-h-[480px] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-fuchsia-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase font-mono">
                  SUBTERRANEAN TRAINING FLOOR ({soldiers.length} UNITS)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                {warRoomActive ? 'COMBAT SIMULATION ENGAGED' : 'ROUTINE VR DRILLS'}
              </span>
            </div>

            {/* Animated Interactive Map / Floor Area */}
            <div className="relative w-full aspect-[16/10] bg-slate-950/90 rounded-lg border border-white/10 overflow-hidden my-auto shadow-inner">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b20_1px,transparent_1px),linear-gradient(to_bottom,#1e293b20_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

              {soldiers.map((soldier) => {
                const isSelected = soldier.id === selectedSoldierId;
                const isInCombat = soldier.status === 'in_combat' || warRoomActive;

                return (
                  <div
                    key={soldier.id}
                    onClick={() => {
                      sound.play('click');
                      setSelectedSoldierId(soldier.id);
                    }}
                    className="absolute cursor-pointer transition-all duration-100 ease-linear transform -translate-x-1/2 -translate-y-1/2 group z-20"
                    style={{ left: `${soldier.posX}%`, top: `${soldier.posY}%` }}
                  >
                    <div
                      className={`absolute -inset-2 rounded-full opacity-60 animate-ping ${
                        isInCombat ? 'bg-red-500' : 'bg-fuchsia-500'
                      }`}
                      style={{ animationDuration: '3s' }}
                    />

                    <div
                      className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg border shadow-xl backdrop-blur-md transition-transform group-hover:scale-110 ${
                        isSelected
                          ? 'border-cyan-400 bg-slate-950 ring-2 ring-cyan-400/50 text-white'
                          : soldier.accentTheme
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-black shrink-0 border border-white/20">
                        <img
                          src={soldier.avatarUrl}
                          alt={soldier.callsign}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col font-mono">
                        <span className="text-[11px] font-bold tracking-tight whitespace-nowrap text-white">
                          {soldier.callsign}
                        </span>
                        <span className="text-[9px] text-slate-300 capitalize">
                          {soldier.currentAction} · {soldier.combatReadiness}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded border border-white/10 pointer-events-none z-10">
                <span>SUBTERRANEAN TRAINING ARENA · BARRACKS SECTOR 4</span>
                <span className="text-fuchsia-400 font-bold">AUTONOMOUS WANDER ACTIVE</span>
              </div>
            </div>

            {/* Selected Agent Quick Inspector */}
            <div className="p-3.5 rounded-lg bg-slate-900/80 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-black border border-white/20 shrink-0">
                  <img
                    src={selectedSoldier.avatarUrl}
                    alt={selectedSoldier.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{selectedSoldier.name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-fuchsia-950 text-fuchsia-300 text-[10px] border border-fuchsia-500/40">
                      {selectedSoldier.rank}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Sector: <span className="text-cyan-300">{selectedSoldier.sector}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.play('click');
                  setSoldiers((prev) =>
                    prev.map((s) => (s.id === selectedSoldier.id ? { ...s, combatReadiness: Math.min(100, s.combatReadiness + 15) } : s))
                  );
                  onNotify?.(`Agent ${selectedSoldier.callsign} completed VR training drill.`, 'info');
                }}
                className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Run VR Drill (+15%)</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Active Defense Battle Stations (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-white/10 bg-slate-950 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-xs font-mono text-white font-bold">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>ACTIVE DEFENSE BATTLE STATIONS ({stations.length})</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">SELECT STATION</span>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {stations.map((st) => {
                const isSelected = st.id === selectedStationId;
                const isIntercepting = st.status === 'intercepting';
                const isEngaged = st.status === 'engaged';

                return (
                  <div
                    key={st.id}
                    onClick={() => {
                      sound.play('click');
                      setSelectedStationId(st.id);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all font-mono text-xs ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-400/80 shadow-lg ring-1 ring-cyan-400/40'
                        : 'bg-slate-900/40 border-white/5 hover:border-white/20 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isIntercepting
                              ? 'bg-red-400 animate-ping'
                              : isEngaged
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                        />
                        <span className="font-bold text-white text-xs">{st.callsign}</span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                          isIntercepting
                            ? 'bg-red-950 text-red-300 border border-red-500/40'
                            : isEngaged
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {st.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 font-sans mb-1.5">{st.name}</div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-1.5 border-t border-white/5">
                      <div>
                        <span>CPU: </span>
                        <span className="text-cyan-400 font-bold">{st.cpuLoad}%</span>
                      </div>
                      <div>
                        <span>RAM: </span>
                        <span className="text-indigo-400 font-bold">{st.memoryUsage}%</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-bold">{st.packetRate}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
