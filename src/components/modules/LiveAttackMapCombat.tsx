import React, { useState, useEffect, useRef } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  Polyline,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Globe,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Radio,
  Crosshair,
  Building2,
  Landmark,
  Cpu,
  Activity,
  Send,
  Lock,
  Unlock,
  Terminal,
  Play,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Flame,
  ArrowRight,
  Server,
  Skull,
  Compass,
  Navigation,
  Layers,
  MapPin,
  Maximize2,
  Database,
  Clock,
  GitBranch,
  AlertCircle,
  FileText,
  CheckSquare,
  ChevronRight,
  Network,
  Eye,
  History,
} from 'lucide-react';
import { sound } from '../../core/sound-fx';
import { LiveMapAttack, TargetOrganization, SeverityLevel, AttackForensicDossier } from '../../core/types';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Camera controller helper for pan/zoom synchronization
const MapCameraController: React.FC<{
  coords: { lat: number; lng: number; zoom: number; key: number } | null;
}> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || !coords) return;
    map.panTo({ lat: coords.lat, lng: coords.lng });
    map.setZoom(coords.zoom);
  }, [map, coords]);
  return null;
};

interface LiveAttackMapCombatProps {
  onNotify?: (message: string, type: 'info' | 'success' | 'alert') => void;
  onRaiseDefcon?: (level: number) => void;
}

// Global target institutions presets
const INITIAL_TARGETS: TargetOrganization[] = [
  {
    id: 'tgt-jpmc',
    name: 'JPMorgan Chase Global Treasury & Trading Core',
    sector: 'Banking & Financial Core',
    location: 'New York, USA',
    lat: 40.7128,
    lng: -74.006,
    assetValue: '$3.9 Trillion',
    status: 'under_attack',
    shieldIntegrity: 45,
    activeDefenseSwarm: ['Sentinel-Zero', 'Aegis-Heuristic'],
  },
  {
    id: 'tgt-swift',
    name: 'SWIFT International Interbank Clearing Hub',
    sector: 'Banking & Financial Core',
    location: 'Brussels, Belgium',
    lat: 50.8503,
    lng: 4.3517,
    assetValue: '$150 Trillion Transacted/Yr',
    status: 'nominal',
    shieldIntegrity: 100,
    activeDefenseSwarm: ['Sentinel-Zero'],
  },
  {
    id: 'tgt-boe',
    name: 'Bank of England Central RTGS Ledger',
    sector: 'Banking & Financial Core',
    location: 'London, UK',
    lat: 51.5074,
    lng: -0.1278,
    assetValue: '£780 Billion',
    status: 'nominal',
    shieldIntegrity: 100,
    activeDefenseSwarm: ['Sentinel-Zero', 'Chronos-Forensics'],
  },
  {
    id: 'tgt-tokyo',
    name: 'Tokyo Financial Exchange (TFX) High-Frequency Core',
    sector: 'Banking & Financial Core',
    location: 'Tokyo, Japan',
    lat: 35.6762,
    lng: 139.6503,
    assetValue: '¥420 Trillion',
    status: 'nominal',
    shieldIntegrity: 100,
    activeDefenseSwarm: ['Sentinel-Zero'],
  },
  {
    id: 'tgt-dbs',
    name: 'DBS & Monetary Authority Digital Asset Vault',
    sector: 'Banking & Financial Core',
    location: 'Singapore',
    lat: 1.3521,
    lng: 103.8198,
    assetValue: '$820 Billion',
    status: 'nominal',
    shieldIntegrity: 100,
    activeDefenseSwarm: ['Sentinel-Zero'],
  },
  {
    id: 'tgt-ai-apex',
    name: 'Sovereign Frontier 400B Model Weights Vault',
    sector: 'Sovereign AI & Frontier Tech',
    location: 'Ashburn, VA, USA',
    lat: 39.0438,
    lng: -77.4874,
    assetValue: '$85.0 Billion',
    status: 'mitigating',
    shieldIntegrity: 62,
    activeDefenseSwarm: ['Sentinel-Zero', 'Valkyrie-Enforcer', 'Cipher-WeightGuard'],
  },
  {
    id: 'tgt-power',
    name: 'North American Regional Electric Grid SCADA Core',
    sector: 'Critical Infrastructure',
    location: 'Chicago, USA',
    lat: 41.8781,
    lng: -87.6298,
    assetValue: 'Essential Grid',
    status: 'nominal',
    shieldIntegrity: 100,
    activeDefenseSwarm: ['Aegis-Heuristic'],
  },
  {
    id: 'tgt-bio',
    name: 'Global Bio-Research & Genomic Data Core',
    sector: 'Healthcare & Genomic',
    location: 'Boston, USA',
    lat: 42.3601,
    lng: -71.0589,
    assetValue: '$120 Billion',
    status: 'nominal',
    shieldIntegrity: 100,
    activeDefenseSwarm: ['Aegis-Heuristic'],
  },
  {
    id: 'f500-apple',
    name: 'Apple Park Cupertino HQ',
    sector: 'Enterprise & Fortune 500',
    location: 'Cupertino, CA, USA',
    lat: 37.3346,
    lng: -122.009,
    assetValue: '$3.4 Trillion',
    status: 'under_attack',
    shieldIntegrity: 89,
    activeDefenseSwarm: ['Cipher-WeightGuard', 'Sentinel-Zero'],
    riskProfile: 'Elevated Risk (Score: 64/100) - Targeted by side-channel probe',
    recentIncidentHistory: 'iCloud Edge TLS 1.3 probe (2h ago) · vLLM worker RAM probe (6h ago)',
  },
  {
    id: 'f500-microsoft',
    name: 'Microsoft Redmond Campus HQ',
    sector: 'Enterprise & Fortune 500',
    location: 'Redmond, WA, USA',
    lat: 47.674,
    lng: -122.1215,
    assetValue: '$3.1 Trillion',
    status: 'nominal',
    shieldIntegrity: 96,
    activeDefenseSwarm: ['Aegis-Heuristic'],
    riskProfile: 'Nominal Defense Posture (Score: 22/100)',
    recentIncidentHistory: 'Azure Sentinel BGP sweep neutralized (1d ago)',
  },
  {
    id: 'f500-google',
    name: 'Googleplex Mountain View HQ',
    sector: 'Enterprise & Fortune 500',
    location: 'Mountain View, CA, USA',
    lat: 37.422,
    lng: -122.084,
    assetValue: '$2.1 Trillion',
    status: 'under_attack',
    shieldIntegrity: 74,
    activeDefenseSwarm: ['Valkyrie-Enforcer', 'Sentinel-Zero'],
    riskProfile: 'Critical Risk (Score: 88/100) - Active Gemini weight extraction',
    recentIncidentHistory: 'Gemini 400B weights exfiltration attempt (30m ago)',
  },
  {
    id: 'f500-amazon',
    name: 'Amazon & AWS Seattle HQ',
    sector: 'Enterprise & Fortune 500',
    location: 'Seattle, WA, USA',
    lat: 47.6062,
    lng: -122.3321,
    assetValue: '$2.0 Trillion',
    status: 'nominal',
    shieldIntegrity: 94,
    activeDefenseSwarm: ['Sentinel-Zero'],
    riskProfile: 'Moderate Risk (Score: 41/100)',
    recentIncidentHistory: 'DynamoDB DDoS layer-7 flood mitigated (4h ago)',
  },
  {
    id: 'f500-nvidia',
    name: 'NVIDIA Santa Clara Headquarters',
    sector: 'Enterprise & Fortune 500',
    location: 'Santa Clara, CA, USA',
    lat: 37.3683,
    lng: -121.9636,
    assetValue: '$3.2 Trillion',
    status: 'under_attack',
    shieldIntegrity: 68,
    activeDefenseSwarm: ['Cipher-WeightGuard', 'Valkyrie-Enforcer'],
    riskProfile: 'Critical Risk (Score: 94/100) - NVLink zero-day inspection',
    recentIncidentHistory: 'NVLink interconnect cache inspection probe (15m ago)',
  },
];

// Initial active attacks in progress with comprehensive 11-dimension forensic & recovery dossiers
const INITIAL_ATTACKS: LiveMapAttack[] = [
  {
    id: 'atk-bank-01',
    targetId: 'tgt-jpmc',
    targetName: 'JPMorgan Chase Global Treasury & Trading Core',
    targetSector: 'Banking & Financial Core',
    targetLocation: 'New York, USA',
    targetCoordinates: [40.7128, -74.006],
    adversaryName: 'DarkSwarm-AI-v4 (Rogue Autonomous Swarm)',
    adversaryOrigin: 'Transnistria Bulletproof Autonomous C2',
    adversaryCoordinates: [46.84, 29.63],
    attackVector: 'Autonomous LLM Swarm SWIFT API Hijack & Sharded Ledger Extraction',
    severity: 'critical',
    status: 'active_infiltration',
    penetrationPercent: 68,
    defenseShieldPercent: 45,
    startedAt: '2 minutes ago',
    dossier: {
      historicalPrecedent: 'RECURRING_APT_CAMPAIGN',
      previousOccurrencesCount: 3,
      lastOccurrenceDate: '2026-08-14 (12 weeks ago against Bundesbank Clearing)',
      signatureMatchScore: 96.8,
      detectedTimestamp: '2026-11-06T02:24:10Z (02:24:10 Zulu)',
      anomalySpikePoint: '14,200 synthetic RPCs/sec spike on SWIFT Ingress NIC-4',
      dwellTimeSeconds: 128,
      attackPattern: 'Autonomous LLM Swarm SWIFT API Hijack & Sharded Ledger Extraction',
      mitreTechniques: [
        { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
        { id: 'T1059.006', name: 'Python/REST Micro-Agent Automation', tactic: 'Execution' },
        { id: 'T1078', name: 'Valid Accounts via Compromised Service Token', tactic: 'Defense Evasion' },
        { id: 'T1041', name: 'Exfiltration Over C2 Stream', tactic: 'Exfiltration' },
        { id: 'T1565.001', name: 'Stored Financial Ledger Modification', tactic: 'Impact' },
      ],
      executionSequence: [
        'Stage 1: Replayed hijacked OAuth JWT token stolen from third-party vendor',
        'Stage 2: Flooded SWIFT ISO-20022 parser with malformed XML payloads',
        'Stage 3: Pivoted to internal Fedwire clearing queue via unauthenticated gRPC endpoint',
        'Stage 4: Attempted high-velocity exfiltration of ledger balance state',
        'Stage 5: Intercepted by CDF Sentinel-Zero token entropy clippers',
      ],
      threatActorGroup: 'APT-41 (ShadowPanda / DarkSwarm Coalition)',
      threatActorCountry: 'Sovereign-Backed Cyber Operations Wing (Eurasian Theater)',
      actorMotivation: 'Geopolitical financial disruption, sovereign reserve destabilization & illicit capital extraction',
      transitHopPath: [
        { hop: 1, location: 'Transnistria Autonomous C2 Bunker', nodeType: 'Origin C2', country: 'Moldova / Transnistria', ipOrSubnet: '185.220.101.44' },
        { hop: 2, location: 'Frankfurt DE-CIX Internet Exchange', nodeType: 'BGP Hijack', country: 'Germany', ipOrSubnet: '80.81.192.1/24 (AS6695)' },
        { hop: 3, location: 'Panama City Offshore Onion Proxy', nodeType: 'Bulletproof Proxy', country: 'Panama', ipOrSubnet: '190.14.38.109' },
        { hop: 4, location: 'Newark Edge PoP CDN Layer', nodeType: 'Target Ingress', country: 'United States', ipOrSubnet: '198.51.100.22' },
        { hop: 5, location: 'JPMC Global Core Treasury Gateway', nodeType: 'Target Ingress', country: 'United States', ipOrSubnet: '10.240.18.90 (Private Core)' },
      ],
      currentPhase: 'Exfiltration',
      rootCauseVulnerability: 'CVE-2026-21849 & Unauthenticated gRPC Reflection Endpoint',
      exploitMechanism: 'Legacy ISO-20022 message queue broker failed to validate token revocation status in distributed Redis cluster, enabling replay of forged interbank credentials.',
      projectedLossCapital: '$3.9 Trillion (Gross Clearing Pool) / $420M Immediate Staged Exfiltration Risk',
      blastRadiusAssets: [
        'SWIFT Alliance Gateway 04',
        'Fedwire RTGS Primary Clearing Queue',
        'Global Foreign Exchange Settlement Ledger',
        'Customer Liquidity Balance Shards',
      ],
      regulatoryImpact: 'Critical NYDFS Part 500 & SEC Rule 10-K notification trigger; potential $150M regulatory penalty.',
      recoveryPlaybook: [
        { step: 1, action: 'Cryptographic Ledger Rollback', targetEntity: 'Core Treasury Balance Ledger', recoveryMethod: 'Roll back ledger state to pre-incident BLAKE3 hash checkpoint (Block #948,102).', estimatedTimeMin: 3 },
        { step: 2, action: 'Session & Token Purge', targetEntity: 'Redis Distributed Auth Ring', recoveryMethod: 'Revoke and zeroize all issued OAuth JWT keys; force universal re-handshake with HSM.', estimatedTimeMin: 1 },
        { step: 3, action: 'SWIFT Channel Isolation', targetEntity: 'ISO-20022 Message Queues', recoveryMethod: 'Flush buffered untrusted packets through Aegis heuristic token entropy filter.', estimatedTimeMin: 2 },
        { step: 4, action: 'Quorum Re-attestation', targetEntity: 'Interbank Node Clearing Peers', recoveryMethod: 'Broadcast multi-sig attestation proof confirming zero unrecorded capital flight.', estimatedTimeMin: 5 },
      ],
      agentDeploymentDirectives: [
        { agentName: 'Sentinel-Zero', tacticalZone: 'Edge Ingress WAF & Perimeter', missionDirective: 'Throttle rogue traffic and enforce rate anomaly clamping on ports 443 & 8443.', objective: 'Drop 100% of adversary token payloads.', status: 'holding_perimeter' },
        { agentName: 'Aegis-Heuristic', tacticalZone: 'Kernel eBPF & gRPC Middleware', missionDirective: 'Trace all kernel socket calls and kill unauthenticated gRPC worker threads.', objective: 'Sever malicious thread execution.', status: 'assigned' },
        { agentName: 'Chronos-Forensics', tacticalZone: 'Immutable Audit Ledger', missionDirective: 'Record SHA-256 evidence hashes and seal digital chain of custody.', objective: 'Generate legally admissible forensic proof.', status: 'assigned' },
        { agentName: 'Valkyrie-Enforcer', tacticalZone: 'Network NIC Hardware Layer', missionDirective: 'Inject eBPF XDP hardware drop rules for Transnistria and Panama transit subnets.', objective: 'Absolute line-rate network severing.', status: 'en_route' },
      ],
      neutralizationExecutionSteps: [
        'Step 1: Enforce eBPF XDP Hardware Packet Sever on adversary ingress IPs (185.220.101.44 & 190.14.38.109).',
        'Step 2: Scramble Sentinel-Zero & Aegis-Heuristic counter-adversarial token entropy clamping.',
        'Step 3: Trigger HSM Master Key Rotation to immediately invalidate all compromised service credentials.',
        'Step 4: Execute reverse-neutralization tensors to crash adversary autonomous C2 reasoning loop.',
        'Step 5: Apply cryptographic seal to lock down and verify 100% target integrity.',
      ],
    },
    combatLogs: [
      {
        timestamp: '23:24:10',
        sender: 'ADVERSARY',
        agentName: 'DarkSwarm-AI-v4',
        message: 'Spawning 14,000 asynchronous micro-agents targeting Fedwire and SWIFT API gateways.',
        type: 'attack',
      },
      {
        timestamp: '23:24:12',
        sender: 'DEFENDER',
        agentName: 'Sentinel-Zero',
        message: 'Anomalous synthetic prompt structure detected in TLS 1.3 stream. Intercepting...',
        type: 'counter',
      },
      {
        timestamp: '23:24:15',
        sender: 'ADVERSARY',
        agentName: 'DarkSwarm-AI-v4',
        message: 'Polymorphic token evasion activated. Attempting high-velocity ledger extraction.',
        type: 'attack',
      },
      {
        timestamp: '23:24:18',
        sender: 'DEFENDER',
        agentName: 'Aegis-Heuristic',
        message: 'Applying dynamic token entropy clamping on banking API gateway.',
        type: 'counter',
      },
    ],
  },
  {
    id: 'atk-ai-02',
    targetId: 'tgt-ai-apex',
    targetName: 'Sovereign Frontier 400B Model Weights Vault',
    targetSector: 'Sovereign AI & Frontier Tech',
    targetLocation: 'Ashburn, VA, USA',
    targetCoordinates: [39.0438, -77.4874],
    adversaryName: 'Volt-Agent-9 (State-Grade Adversarial LLM)',
    adversaryOrigin: 'Offshore Floating Satellite Relay',
    adversaryCoordinates: [12.0, 115.0],
    attackVector: 'High-Velocity RoCE Side-Channel Weights Extraction (70B Safetensors Shard)',
    severity: 'critical',
    status: 'engaged',
    penetrationPercent: 42,
    defenseShieldPercent: 68,
    startedAt: '5 minutes ago',
    dossier: {
      historicalPrecedent: 'FIRST_TIME_ZERO_DAY',
      previousOccurrencesCount: 0,
      lastOccurrenceDate: 'None (First Recorded Global Execution of RoCE Model Weight Shard Extraction)',
      signatureMatchScore: 99.4,
      detectedTimestamp: '2026-11-06T02:20:00Z (02:20:00 Zulu)',
      anomalySpikePoint: '800 Gbps unexpected RDMA read flood over InfiniBand fabric to unlisted GPU node',
      dwellTimeSeconds: 310,
      attackPattern: 'High-Velocity RoCE Side-Channel Weights Extraction (70B Safetensors Shard)',
      mitreTechniques: [
        { id: 'T1078.004', name: 'Cloud/Cluster Infrastructure Credentials', tactic: 'Initial Access' },
        { id: 'T1055', name: 'Process Injection into Triton/vLLM Worker', tactic: 'Privilege Escalation' },
        { id: 'T1005', name: 'Data from Local System (VRAM/NVLink Dump)', tactic: 'Collection' },
        { id: 'T1048', name: 'Exfiltration Over Alternative High-Speed Protocol (RDMA/RoCEv2)', tactic: 'Exfiltration' },
      ],
      executionSequence: [
        'Stage 1: Infiltrated Kubernetes node running frontier model inference worker',
        'Stage 2: Escaped container isolation via Linux kernel eBPF verifier flaw',
        'Stage 3: Attached debugging probe to unencrypted NVLink cache lines between H100 GPUs',
        'Stage 4: Began streaming 70B parameter tensor weights over RoCEv2 network fabric',
        'Stage 5: Flagged by Cipher-WeightGuard BLAKE3 tensor verification mismatch',
      ],
      threatActorGroup: 'Volt-Agent-9 (State-Grade Adversarial Frontier LLM Swarm)',
      threatActorCountry: 'Sovereign DeepTech Intelligence Directorate (Indo-Pacific Theater)',
      actorMotivation: 'Espionage theft of proprietary sovereign 400B weights to bypass 5-year GPU compute embargo',
      transitHopPath: [
        { hop: 1, location: 'High-Earth Orbit Adversary LEO Satellite Relay 04', nodeType: 'Origin C2', country: 'International Orbit (South China Sea Ground Station)', ipOrSubnet: '198.18.0.54/30' },
        { hop: 2, location: 'Tokyo Equinix TY2 IXP Relay Node', nodeType: 'Bulletproof Proxy', country: 'Japan', ipOrSubnet: '203.0.113.88' },
        { hop: 3, location: 'San Jose Silicon Valley Gateway Hub', nodeType: 'BGP Hijack', country: 'United States', ipOrSubnet: '192.88.99.14' },
        { hop: 4, location: 'Ashburn Data Center Outer Router Interface', nodeType: 'Target Ingress', country: 'United States', ipOrSubnet: '198.51.100.8' },
        { hop: 5, location: 'GPU Inference Cluster Vault Subnet #03', nodeType: 'Target Ingress', country: 'United States', ipOrSubnet: '10.100.4.15 (InfiniBand Fab)' },
      ],
      currentPhase: 'Defense Interception',
      rootCauseVulnerability: 'RoCEv2 RDMA Fabric Lack of Hardware-Enforced TLS/IPsec Encryption',
      exploitMechanism: 'Inter-cluster GPU interconnect relied on network perimeter trust without node-to-node MACsec encryption, allowing a compromised container to sniff unencrypted floating-point weights across the fabric.',
      projectedLossCapital: '$85.0 Billion (R&D Intellectual Property Capital & Sovereign Defense Advantage)',
      blastRadiusAssets: [
        'Sovereign Frontier 400B Foundation Model Weights (Safetensors)',
        '16,384 H100 GPU Interconnect Cluster (Fabric A)',
        'Proprietary Synthetic Alignment Dataset & Reasoning Traces',
      ],
      regulatoryImpact: 'ITAR / National Security Technology Export Violation; immediate Executive Order 14110 mandatory quarantine.',
      recoveryPlaybook: [
        { step: 1, action: 'InfiniBand Fabric Partitioning', targetEntity: 'NVIDIA Quantum-2 IB Switches', recoveryMethod: 'Isolate compromised leaf switches and re-key subnet manager partitions.', estimatedTimeMin: 2 },
        { step: 2, action: 'BLAKE3 Tensor Weight Verification', targetEntity: 'Model Safetensor Shards 01-16', recoveryMethod: 'Compute hardware-accelerated BLAKE3 checksums against sovereign cold-vault master hash.', estimatedTimeMin: 4 },
        { step: 3, action: 'Inference Worker Pod Eviction', targetEntity: 'Kubernetes GPU DaemonSet', recoveryMethod: 'Drain and terminate compromised worker PIDs; re-flash GPU VRAM using secure firmware erase.', estimatedTimeMin: 3 },
        { step: 4, action: 'MACsec Encryption Enforcement', targetEntity: 'RDMA Fabric NICs', recoveryMethod: 'Enforce hardware-level AES-256 MACsec encryption across all inter-GPU RoCE lanes.', estimatedTimeMin: 5 },
      ],
      agentDeploymentDirectives: [
        { agentName: 'Cipher-WeightGuard', tacticalZone: 'GPU VRAM & Model Memory Vault', missionDirective: 'Continuously compute cryptographic hashes on model weights memory buffers.', objective: 'Zero bit-level parameter leakage.', status: 'holding_perimeter' },
        { agentName: 'Valkyrie-Enforcer', tacticalZone: 'InfiniBand Fabric Subnet Manager', missionDirective: 'Enforce zero-trust hardware ACLs on RoCE packet headers.', objective: 'Sever unauthorized RDMA streams.', status: 'holding_perimeter' },
        { agentName: 'Aegis-Heuristic', tacticalZone: 'Host OS Kernel eBPF Probes', missionDirective: 'Audit all process attach calls and kill unauthorized ptrace / memory scrapers.', objective: 'Protect inference worker integrity.', status: 'holding_perimeter' },
        { agentName: 'Sentinel-Zero', tacticalZone: 'Satellite Uplink Edge Gateway', missionDirective: 'Jam and drop satellite C2 telemetry beaconing from rogue inference node.', objective: 'Block egress exfiltration channel.', status: 'assigned' },
      ],
      neutralizationExecutionSteps: [
        'Step 1: Execute eBPF Hardware Packet Drop on satellite proxy IP (198.18.0.54).',
        'Step 2: Trigger GPU VRAM Flush & Cold-Vault Attestation with Cipher-WeightGuard.',
        'Step 3: Disconnect RoCEv2 Fabric Leaf Switch #03 from main InfiniBand backbone.',
        'Step 4: Transmit poisoned counter-weights to desynchronize adversary receiver buffer.',
        'Step 5: Sign cryptographic recovery attestation and re-enable authenticated inference.',
      ],
    },
    combatLogs: [
      {
        timestamp: '23:20:00',
        sender: 'ADVERSARY',
        agentName: 'Volt-Agent-9',
        message: 'Intercepting unencrypted NVLink cache lines on GPU inference worker node.',
        type: 'attack',
      },
      {
        timestamp: '23:20:03',
        sender: 'DEFENDER',
        agentName: 'Cipher-WeightGuard',
        message: 'BLAKE3 attestation mismatch on model shard 01. Quarantining worker PID.',
        type: 'counter',
      },
      {
        timestamp: '23:20:06',
        sender: 'DEFENDER',
        agentName: 'Valkyrie-Enforcer',
        message: 'eBPF hardware drop rule enforced. Rate limited to 0 bps.',
        type: 'secure',
      },
    ],
  },
];

// Dynamic generator for complete 11-dimension forensic dossiers on any simulated attack
function generateDynamicDossier(
  targetOrg: TargetOrganization,
  adversaryName: string,
  adversaryOrigin: string,
  vector: string
): AttackForensicDossier {
  const isZeroDay = Math.random() > 0.45;
  const precedent = isZeroDay ? 'FIRST_TIME_ZERO_DAY' : 'RECURRING_APT_CAMPAIGN';
  const previousCount = isZeroDay ? 0 : Math.floor(Math.random() * 5) + 1;
  const matchScore = isZeroDay ? 98.2 : 91.4;

  return {
    historicalPrecedent: precedent,
    previousOccurrencesCount: previousCount,
    lastOccurrenceDate: isZeroDay
      ? 'Zero prior global occurrences logged (Zero-Day Ingress)'
      : '2026-07-19 (Identified in cross-border financial stress test)',
    signatureMatchScore: matchScore,
    detectedTimestamp: new Date().toISOString() + ' (Zulu)',
    anomalySpikePoint: '24,500 syn-tokens/sec burst detected on edge load balancer',
    dwellTimeSeconds: 45,
    attackPattern: vector,
    mitreTechniques: [
      { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
      { id: 'T1059.006', name: 'Autonomous Scripting & Token Replay', tactic: 'Execution' },
      { id: 'T1078', name: 'Valid Accounts / Compromised Service Principals', tactic: 'Defense Evasion' },
      { id: 'T1041', name: 'Exfiltration Over Command and Control Stream', tactic: 'Exfiltration' },
    ],
    executionSequence: [
      `Stage 1: Infiltration probe dispatched against ${targetOrg.name} public endpoints`,
      'Stage 2: Polymorphic header evasion bypassing conventional static regex WAFs',
      `Stage 3: Subverting internal service mesh to target ${targetOrg.sector} core records`,
      'Stage 4: Attempting unauthorized extraction of sovereign telemetry and key assets',
      'Stage 5: Intercepted by CDF Defensive Swarm perimeter sentries',
    ],
    threatActorGroup: adversaryName,
    threatActorCountry: adversaryOrigin.includes('Satellite')
      ? 'Exo-Atmospheric / Non-Territorial Orbit'
      : adversaryOrigin.includes('Transnistria')
      ? 'Transnistrian Autonomous Cyber Collective'
      : adversaryOrigin.includes('Panama')
      ? 'Offshore Sovereign Shadow Syndicate'
      : 'Eurasian Sovereign Cyber Operations Command',
    actorMotivation: `Targeted destabilization of ${targetOrg.sector} capital and extraction of high-value sovereign assets.`,
    transitHopPath: [
      {
        hop: 1,
        location: adversaryOrigin,
        nodeType: 'Origin C2',
        country: 'Adversary Sovereign Territory',
        ipOrSubnet: '185.220.101.89/28',
      },
      {
        hop: 2,
        location: 'Frankfurt / Amsterdam Commercial IXP',
        nodeType: 'BGP Hijack',
        country: 'Germany / Netherlands',
        ipOrSubnet: '80.81.192.0/20 (AS6695)',
      },
      {
        hop: 3,
        location: 'LEO Satellite Data Relay constellation',
        nodeType: 'Satellite Relay',
        country: 'International Transit Airspace',
        ipOrSubnet: '198.18.42.12',
      },
      {
        hop: 4,
        location: `${targetOrg.location} Edge Ingress Point of Presence`,
        nodeType: 'Bulletproof Proxy',
        country: 'Transit Region',
        ipOrSubnet: '198.51.100.45',
      },
      {
        hop: 5,
        location: `${targetOrg.name} Primary Ingress NIC`,
        nodeType: 'Target Ingress',
        country: targetOrg.location,
        ipOrSubnet: '10.0.12.88 (Target Network Core)',
      },
    ],
    currentPhase: 'Initial Infiltration',
    rootCauseVulnerability: 'CVE-2026-38419 (Dynamic Token Validation Race Condition in Service Mesh)',
    exploitMechanism: `Adversary exploited asynchronous token verification latency in ${targetOrg.name} gateway, injecting high-entropy synthetic authorization claims to bypass identity filters.`,
    projectedLossCapital: targetOrg.assetValue,
    blastRadiusAssets: [
      `${targetOrg.name} Primary Database Core`,
      'Customer Account & Cryptographic Ledger Clusters',
      'High-Speed Transaction Routing Fabrics',
    ],
    regulatoryImpact: 'Immediate GDPR / SEC Part 10-K mandatory disclosure; estimated $85M-$250M statutory liability.',
    recoveryPlaybook: [
      {
        step: 1,
        action: 'Cryptographic Snapshot Rollback',
        targetEntity: `${targetOrg.name} Ledger Database`,
        recoveryMethod: 'Revert state to last authenticated BLAKE3 checksum verified by Chronos-Forensics.',
        estimatedTimeMin: 3,
      },
      {
        step: 2,
        action: 'Identity Token Blacklisting & Rotation',
        targetEntity: 'Service Mesh Identity Broker',
        recoveryMethod: 'Flush all active JWT and mTLS certificates; re-issue with ephemeral elliptic-curve keys.',
        estimatedTimeMin: 2,
      },
      {
        step: 3,
        action: 'Data Flow Re-Attestation',
        targetEntity: 'Core Ingress / Egress Gateways',
        recoveryMethod: 'Enforce hardware-accelerated token entropy clamps across all TLS 1.3 streams.',
        estimatedTimeMin: 4,
      },
      {
        step: 4,
        action: 'Peer Quorum Re-synchronization',
        targetEntity: 'Distributed High-Availability Ring',
        recoveryMethod: 'Broadcast signed recovery assertion to peer nodes confirming uncorrupted state.',
        estimatedTimeMin: 5,
      },
    ],
    agentDeploymentDirectives: [
      {
        agentName: 'Sentinel-Zero',
        tacticalZone: 'Edge Ingress WAF & API Gateways',
        missionDirective: `Isolate inbound packets from adversary origin and clamp synthetic token flow to ${targetOrg.name}.`,
        objective: 'Zero unauthorized packets pass perimeter.',
        status: 'holding_perimeter',
      },
      {
        agentName: 'Aegis-Heuristic',
        tacticalZone: 'Runtime Kernel & eBPF Syscall Monitor',
        missionDirective: 'Trace container execution threads and immediately terminate unverified processes.',
        objective: 'Prevent process privilege escalation.',
        status: 'assigned',
      },
      {
        agentName: 'Valkyrie-Enforcer',
        tacticalZone: 'Hardware Network Interface Cards (NICs)',
        missionDirective: 'Inject eBPF XDP line-rate hardware packet drops on all adversary transit subnets.',
        objective: 'Sub-millisecond connection drop.',
        status: 'en_route',
      },
      {
        agentName: 'Chronos-Forensics',
        tacticalZone: 'Audit Evidence Storage & Ledger',
        missionDirective: 'Capture immutable cryptographic hash chains of all adversary transit hops.',
        objective: 'Deliver legally binding attribution dossier.',
        status: 'assigned',
      },
    ],
    neutralizationExecutionSteps: [
      'Step 1: Activate line-rate eBPF XDP Hardware Packet Sever on adversary ingress IPs.',
      'Step 2: Deploy Sentinel-Zero & Aegis-Heuristic counter-adversarial token entropy clamping.',
      'Step 3: Trigger Master HSM Key Rotation to immediately invalidate all compromised session tokens.',
      'Step 4: Execute reverse-neutralization tensors to desynchronize adversary command reasoning loop.',
      'Step 5: Apply universal cryptographic seal and verify 100% target asset shielding.',
    ],
  };
}

export const LiveAttackMapCombat: React.FC<LiveAttackMapCombatProps> = ({
  onNotify,
  onRaiseDefcon,
}) => {
  const [targets, setTargets] = useState<TargetOrganization[]>(INITIAL_TARGETS);
  const [attacks, setAttacks] = useState<LiveMapAttack[]>(INITIAL_ATTACKS);
  const [selectedAttackId, setSelectedAttackId] = useState<string>(attacks[0]?.id || '');
  const [cockpitTab, setCockpitTab] = useState<'combat_fight' | 'forensic_dossier'>('combat_fight');

  // New attack simulation form state
  const [targetMode, setTargetMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPresetTargetId, setSelectedPresetTargetId] = useState<string>(targets[0]?.id || '');
  const [customOrgName, setCustomOrgName] = useState('');
  const [customSector, setCustomSector] = useState<TargetOrganization['sector']>('Banking & Financial Core');
  const [customLocation, setCustomLocation] = useState('');
  const [customLat, setCustomLat] = useState('37.7749');
  const [customLng, setCustomLng] = useState('-122.4194');
  const [adversaryAgent, setAdversaryAgent] = useState('DarkSwarm-AI-v4');
  const [attackVectorType, setAttackVectorType] = useState('Automated SWIFT Financial Fraud Swarm');
  const [isDispatching, setIsDispatching] = useState(false);

  // Combat terminal scroll
  const combatLogRef = useRef<HTMLDivElement>(null);

  // Google Maps state
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [cameraCoords, setCameraCoords] = useState<{
    lat: number;
    lng: number;
    zoom: number;
    key: number;
  }>({
    lat: 30,
    lng: 10,
    zoom: 2,
    key: 1,
  });
  const [selectedMarkerInfo, setSelectedMarkerInfo] = useState<{
    id: string;
    type: 'target' | 'adversary';
    title: string;
    subtitle: string;
    location: string;
    lat: number;
    lng: number;
    status: string;
    shieldOrPen: number;
    attack?: LiveMapAttack;
  } | null>(null);

  const selectedAttack = attacks.find((a) => a.id === selectedAttackId) || attacks[0];

  useEffect(() => {
    if (combatLogRef.current) {
      combatLogRef.current.scrollTop = combatLogRef.current.scrollHeight;
    }
  }, [selectedAttack?.combatLogs]);

  useEffect(() => {
    if (selectedAttack) {
      setCameraCoords({
        lat: selectedAttack.targetCoordinates[0],
        lng: selectedAttack.targetCoordinates[1],
        zoom: 4,
        key: Date.now(),
      });
    }
  }, [selectedAttackId]);

  const handleFocusActiveThreat = () => {
    if (!selectedAttack) return;
    sound.play('click');
    setCameraCoords({
      lat: selectedAttack.targetCoordinates[0],
      lng: selectedAttack.targetCoordinates[1],
      zoom: 5,
      key: Date.now(),
    });
  };

  const handleResetWorldView = () => {
    sound.play('click');
    setCameraCoords({
      lat: 25,
      lng: 10,
      zoom: 2,
      key: Date.now(),
    });
    setSelectedMarkerInfo(null);
  };

  // Coordinate projection from [lat, lng] to SVG viewbox (1000 x 500)
  const projectCoords = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * 1000;
    const y = ((90 - lat) / 180) * 500;
    return { x, y };
  };

  // Launch / Send incoming attack simulation on a bank or company
  const handleLaunchAttack = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispatching(true);
    sound.play('defcon');

    let targetOrg: TargetOrganization;

    if (targetMode === 'preset') {
      const found = targets.find((t) => t.id === selectedPresetTargetId);
      if (!found) return;
      targetOrg = found;
    } else {
      if (!customOrgName.trim()) {
        alert('Please enter a target company or bank name');
        setIsDispatching(false);
        return;
      }
      const newId = `tgt-custom-${Date.now()}`;
      targetOrg = {
        id: newId,
        name: customOrgName,
        sector: customSector,
        location: customLocation || 'Global Enterprise Node',
        lat: parseFloat(customLat) || 40.0,
        lng: parseFloat(customLng) || -75.0,
        assetValue: '$100.0B+ Protected Capital',
        status: 'under_attack',
        shieldIntegrity: 35,
        activeDefenseSwarm: ['Sentinel-Zero', 'Aegis-Heuristic'],
      };
      setTargets((prev) => [targetOrg, ...prev]);
    }

    // Select adversary origin
    const adversaryOrigins = [
      { name: 'DarkSwarm-AI-v4', origin: 'Transnistria Bulletproof C2 Cluster', lat: 46.84, lng: 29.63 },
      { name: 'Phantom-Broker-Zero', origin: 'Offshore Flash-Drain Onion Proxy', lat: 8.98, lng: -79.51 },
      { name: 'Volt-Agent-9', origin: 'Adversary Satellite Range Zero', lat: 12.0, lng: 115.0 },
      { name: 'DeepJailbreak-Cluster', origin: 'Darknet GPU Array Alpha', lat: 55.75, lng: 37.61 },
      { name: 'Hydra-LLM-Infiltrator', origin: 'Tor Sovereign Botnet Swarm', lat: 34.05, lng: -118.24 },
    ];

    const adv = adversaryOrigins.find((a) => a.name === adversaryAgent) || adversaryOrigins[0];

    const attackId = `atk-${Date.now()}`;
    const dynamicDossier = generateDynamicDossier(targetOrg, adv.name, adv.origin, attackVectorType);
    const newAttack: LiveMapAttack = {
      id: attackId,
      targetId: targetOrg.id,
      targetName: targetOrg.name,
      targetSector: targetOrg.sector,
      targetLocation: targetOrg.location,
      targetCoordinates: [targetOrg.lat, targetOrg.lng],
      adversaryName: `${adv.name} (Rogue Adversarial AI)`,
      adversaryOrigin: adv.origin,
      adversaryCoordinates: [adv.lat, adv.lng],
      attackVector: attackVectorType,
      severity: 'critical',
      status: 'active_infiltration',
      penetrationPercent: 74,
      defenseShieldPercent: 32,
      startedAt: 'Just now',
      dossier: dynamicDossier,
      combatLogs: [
        {
          timestamp: new Date().toLocaleTimeString(),
          sender: 'ALERT',
          agentName: 'CDF Perimeter Radar',
          message: `CRITICAL INCOMING ATTACK DETECTED: ${adv.name} targeting ${targetOrg.name} (${targetOrg.sector})!`,
          type: 'alert',
        },
        {
          timestamp: new Date().toLocaleTimeString(),
          sender: 'ADVERSARY',
          agentName: adv.name,
          message: `Initiating ${attackVectorType}. Breaching outer TLS boundary with 200k synthetic exploit tokens...`,
          type: 'attack',
        },
        {
          timestamp: new Date().toLocaleTimeString(),
          sender: 'DEFENDER',
          agentName: 'Sentinel-Zero',
          message: `Swarm scramble authorized! Engaging counter-adversarial perimeter shielding on ${targetOrg.name}.`,
          type: 'counter',
        },
      ],
    };

    // Update targets status
    setTargets((prev) =>
      prev.map((t) =>
        t.id === targetOrg.id ? { ...t, status: 'under_attack', shieldIntegrity: 32 } : t
      )
    );

    setAttacks((prev) => [newAttack, ...prev]);
    setSelectedAttackId(attackId);
    setIsDispatching(false);

    onRaiseDefcon?.(1);
    onNotify?.(
      `🚨 CRITICAL ATTACK DISPATCHED: Rogue agent ${adv.name} launched attack on ${targetOrg.name}!`,
      'alert'
    );
  };

  // COUNTERMEASURE ACTIONS (Virtually fighting back with defensive agents)
  const handleDeployInterceptors = () => {
    if (!selectedAttack) return;
    sound.play('alert');

    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      sender: 'DEFENDER' as const,
      agentName: 'Sentinel-Zero & Aegis-Heuristic',
      message: `SCRAMBLE EXECUTED: Dispatched perimeter interceptor swarm to ${selectedAttack.targetName}. Clamping rogue token bandwidth from ${selectedAttack.adversaryName}.`,
      type: 'counter' as const,
    };

    setAttacks((prev) =>
      prev.map((a) => {
        if (a.id === selectedAttack.id) {
          const newShield = Math.min(100, a.defenseShieldPercent + 28);
          const newPen = Math.max(10, a.penetrationPercent - 22);
          return {
            ...a,
            defenseShieldPercent: newShield,
            penetrationPercent: newPen,
            status: 'engaged',
            combatLogs: [...a.combatLogs, logEntry],
          };
        }
        return a;
      })
    );

    onNotify?.(`Defensive swarm Sentinel & Aegis deployed against ${selectedAttack.adversaryName}`, 'info');
  };

  const handleDeployEbpfKillswitch = () => {
    if (!selectedAttack) return;
    sound.play('lock');

    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      sender: 'DEFENDER' as const,
      agentName: 'Valkyrie-Enforcer',
      message: `eBPF KERNEL KILLSWITCH ACTIVATED: Injected hardware drop rules for rogue sockets at NIC ingress. Severed 14,000 rogue C2 streams.`,
      type: 'counter' as const,
    };

    setAttacks((prev) =>
      prev.map((a) => {
        if (a.id === selectedAttack.id) {
          const newShield = Math.min(100, a.defenseShieldPercent + 30);
          const newPen = Math.max(5, a.penetrationPercent - 25);
          return {
            ...a,
            defenseShieldPercent: newShield,
            penetrationPercent: newPen,
            status: 'engaged',
            combatLogs: [...a.combatLogs, logEntry],
          };
        }
        return a;
      })
    );

    onNotify?.(`eBPF hardware killswitch applied. Network infiltration frozen.`, 'info');
  };

  const handleReverseNeutralize = () => {
    if (!selectedAttack) return;
    sound.play('radar');

    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      sender: 'DEFENDER' as const,
      agentName: 'Cipher-WeightGuard & Vanguard-Red',
      message: `COUNTER-NEUTRALIZATION DISPATCHED: Injected recursive adversarial jailbreak tensors into ${selectedAttack.adversaryName}. Rogue reasoning engine crashed & desynchronized.`,
      type: 'counter' as const,
    };

    setAttacks((prev) =>
      prev.map((a) => {
        if (a.id === selectedAttack.id) {
          const newShield = Math.min(100, a.defenseShieldPercent + 25);
          const newPen = Math.max(0, a.penetrationPercent - 30);
          return {
            ...a,
            defenseShieldPercent: newShield,
            penetrationPercent: newPen,
            status: 'engaged',
            combatLogs: [...a.combatLogs, logEntry],
          };
        }
        return a;
      })
    );

    onNotify?.(`Adversarial rogue AI engine poisoned and disabled!`, 'info');
  };

  const handleSecureCompany = () => {
    if (!selectedAttack) return;
    sound.play('success');

    const proofHash = `0x${Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      sender: 'SYSTEM' as const,
      agentName: 'CDF Master Enforcer',
      message: `TARGET FULLY SECURED & SHIELDED! ${selectedAttack.targetName} successfully defended. Forensic proof signed: ${proofHash}. All financial ledgers & weights vaults verified clean.`,
      type: 'secure' as const,
    };

    setAttacks((prev) =>
      prev.map((a) => {
        if (a.id === selectedAttack.id) {
          return {
            ...a,
            defenseShieldPercent: 100,
            penetrationPercent: 0,
            status: 'contained_and_secured',
            dossier: a.dossier
              ? {
                  ...a.dossier,
                  currentPhase: 'Neutralized & Contained',
                  agentDeploymentDirectives: a.dossier.agentDeploymentDirectives.map((d) => ({
                    ...d,
                    status: 'complete' as const,
                  })),
                }
              : undefined,
            combatLogs: [...a.combatLogs, logEntry],
          };
        }
        return a;
      })
    );

    // Update target organization to secured
    setTargets((prev) =>
      prev.map((t) =>
        t.id === selectedAttack.targetId
          ? { ...t, status: 'secured', shieldIntegrity: 100 }
          : t
      )
    );

    onRaiseDefcon?.(3);
    onNotify?.(`🛡️ COMPANY SECURED: ${selectedAttack.targetName} is safe and shielded!`, 'success');
  };

  // Directives for 11-dimension dossier actions
  const handleDeployAgentsToSectors = () => {
    if (!selectedAttack) return;
    sound.play('alert');

    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      sender: 'DEFENDER' as const,
      agentName: 'CDF High Command',
      message: `SWARM MULTI-ZONE DIRECTIVE: Dispatched Sentinel-Zero to Ingress WAF, Aegis-Heuristic to Kernel eBPF, Valkyrie to NIC Hardware, and Chronos/Cipher to Memory Vault. All zones reinforced.`,
      type: 'counter' as const,
    };

    setAttacks((prev) =>
      prev.map((a) => {
        if (a.id === selectedAttack.id) {
          return {
            ...a,
            defenseShieldPercent: Math.min(100, a.defenseShieldPercent + 22),
            penetrationPercent: Math.max(0, a.penetrationPercent - 18),
            combatLogs: [...a.combatLogs, logEntry],
            dossier: a.dossier
              ? {
                  ...a.dossier,
                  agentDeploymentDirectives: a.dossier.agentDeploymentDirectives.map((d) => ({
                    ...d,
                    status: 'holding_perimeter' as const,
                  })),
                }
              : undefined,
          };
        }
        return a;
      })
    );

    onNotify?.(`All 4 defensive agents deployed to tactical perimeter zones!`, 'info');
  };

  const handleExecuteCompleteNeutralization = () => {
    if (!selectedAttack) return;
    handleDeployInterceptors();
    setTimeout(() => handleDeployEbpfKillswitch(), 350);
    setTimeout(() => handleReverseNeutralize(), 700);
    setTimeout(() => handleSecureCompany(), 1100);
    onNotify?.(`Full neutralization sequence initiated for ${selectedAttack.targetName}`, 'alert');
  };

  return (
    <div className="space-y-6">
      {/* Module Header with Active Threat Counter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <Radio className="w-3.5 h-3.5 animate-pulse text-red-400" />
            <span>GLOBAL THREAT RADAR · REAL-TIME AI COMBAT THEATER</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <span>Live Attack Map & Autonomous Defense Combat</span>
            {attacks.some((a) => a.status !== 'contained_and_secured') && (
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40 rounded animate-pulse">
                ACTIVE CLASH IN PROGRESS
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global real-time vector tracking of adversarial AI agents targeting banks, sovereign AI model vaults, critical infrastructure, and enterprises. Scramble defensive swarms and fight back in real time.
          </p>
        </div>

        {/* Global Stats Counter */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded border border-white/10 bg-slate-900/60 font-mono text-xs text-slate-300 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-amber-400" />
            <span>PROTECTED TARGETS: <strong className="text-white">{targets.length}</strong></span>
          </div>
          <div className="px-3 py-1.5 rounded border border-red-500/30 bg-red-950/40 font-mono text-xs text-red-300 flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400 animate-pulse" />
            <span>ATTACKS ACTIVE: <strong className="text-white">{attacks.filter((a) => a.status !== 'contained_and_secured').length}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Interactive Google Map Combat Canvas */}
      <div className="rounded-xl border border-white/10 bg-[#050811] p-4 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '15s' }} />
            <span className="text-white font-bold tracking-wider">GOOGLE MAPS PLATFORM · REAL-TIME THREAT TELEMETRY</span>
            <span className="hidden md:inline px-2 py-0.5 text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 rounded">
              SATELLITE & VECTOR ENGINE
            </span>
          </div>

          {/* Interactive Controls & View Modes */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                sound.play('click');
                setMapType(mapType === 'roadmap' ? 'hybrid' : 'roadmap');
              }}
              className="px-2.5 py-1 rounded bg-slate-900 border border-white/15 hover:border-cyan-400 text-[11px] text-slate-200 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>{mapType === 'roadmap' ? '🛰️ Satellite Hybrid' : '🗺️ Tactical Dark'}</span>
            </button>

            <button
              onClick={handleFocusActiveThreat}
              className="px-2.5 py-1 rounded bg-slate-900 border border-white/15 hover:border-red-400 text-[11px] text-slate-200 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Crosshair className="w-3.5 h-3.5 text-red-400" />
              <span>🎯 Center On Threat</span>
            </button>

            <button
              onClick={handleResetWorldView}
              className="px-2.5 py-1 rounded bg-slate-900 border border-white/15 hover:border-cyan-400 text-[11px] text-slate-200 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>🌍 Global Overview</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between py-2 border-b border-white/5 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              Adversary C2 Origin
            </span>
            <span className="flex items-center gap-1.5 text-rose-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Target Under Attack
            </span>
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              Secured Target
            </span>
            <span className="flex items-center gap-1.5 text-cyan-300">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              Nominal Institution
            </span>
          </div>
          <div className="text-[10px] text-slate-500 hidden sm:block">
            CLICK ANY PIN TO INSPECT TELEMETRY & FIGHT BACK
          </div>
        </div>

        {/* Real Google Map Container */}
        <div className="relative w-full h-[540px] min-h-[500px] bg-slate-950 rounded-lg mt-3 overflow-hidden border border-white/10 shadow-2xl">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              mapId="DEMO_MAP_ID"
              defaultCenter={{ lat: cameraCoords.lat, lng: cameraCoords.lng }}
              defaultZoom={cameraCoords.zoom}
              colorScheme="DARK"
              mapTypeId={mapType}
              gestureHandling="greedy"
              disableDefaultUI={false}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              <MapCameraController coords={cameraCoords} />

              {/* Real-time Attack Trajectory Polylines (Geodesic Arcs) */}
              {attacks.map((atk) => {
                const isSelected = atk.id === selectedAttackId;
                const isSecured = atk.status === 'contained_and_secured';
                return (
                  <Polyline
                    key={`poly-${atk.id}`}
                    path={[
                      { lat: atk.adversaryCoordinates[0], lng: atk.adversaryCoordinates[1] },
                      { lat: atk.targetCoordinates[0], lng: atk.targetCoordinates[1] },
                    ]}
                    geodesic={true}
                    strokeColor={isSecured ? '#10b981' : isSelected ? '#ef4444' : '#f87171'}
                    strokeOpacity={isSelected ? 0.95 : 0.65}
                    strokeWeight={isSelected ? 4 : 2}
                  />
                );
              })}

              {/* Advanced Markers for Adversary Attack Origins */}
              {attacks.map((atk) => {
                const isSelected = atk.id === selectedAttackId;
                const isSecured = atk.status === 'contained_and_secured';
                return (
                  <AdvancedMarker
                    key={`adv-${atk.id}`}
                    position={{
                      lat: atk.adversaryCoordinates[0],
                      lng: atk.adversaryCoordinates[1],
                    }}
                    title={atk.adversaryName}
                    onClick={() => {
                      sound.play('click');
                      setSelectedAttackId(atk.id);
                      setSelectedMarkerInfo({
                        id: atk.id,
                        type: 'adversary',
                        title: atk.adversaryName,
                        subtitle: atk.adversaryOrigin,
                        location: `${atk.adversaryCoordinates[0].toFixed(2)}°N, ${atk.adversaryCoordinates[1].toFixed(2)}°E`,
                        lat: atk.adversaryCoordinates[0],
                        lng: atk.adversaryCoordinates[1],
                        status: isSecured ? 'NEUTRALIZED' : 'ACTIVE EXPLOIT C2',
                        shieldOrPen: atk.penetrationPercent,
                        attack: atk,
                      });
                    }}
                  >
                    <div className="relative cursor-pointer group flex flex-col items-center">
                      {!isSecured && (
                        <div className="absolute -inset-2 rounded-full bg-red-500/40 animate-ping" />
                      )}
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-2xl transition-transform group-hover:scale-125 border ${
                          isSecured
                            ? 'bg-slate-900 border-emerald-500/50 text-emerald-400'
                            : isSelected
                            ? 'bg-red-600 border-white text-white ring-2 ring-red-400 scale-110 shadow-red-900/80'
                            : 'bg-red-950/90 border-red-500/60 text-red-300'
                        }`}
                      >
                        <Skull className="w-5 h-5" />
                      </div>
                      <div className="mt-1 px-1.5 py-0.5 rounded bg-black/90 border border-red-500/40 text-[9px] font-mono text-red-300 whitespace-nowrap shadow-lg">
                        {atk.adversaryName.split(' ')[0]}
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* Advanced Markers for Target Organizations / Banks / Model Vaults */}
              {targets.map((tgt) => {
                const matchAtk = attacks.find((a) => a.targetId === tgt.id);
                const isUnderAttack = matchAtk && matchAtk.status !== 'contained_and_secured';
                const isSecured = tgt.status === 'secured' || matchAtk?.status === 'contained_and_secured';
                const isSelected = selectedAttack?.targetId === tgt.id;

                return (
                  <AdvancedMarker
                    key={`tgt-${tgt.id}`}
                    position={{ lat: tgt.lat, lng: tgt.lng }}
                    title={tgt.name}
                    onClick={() => {
                      sound.play('click');
                      if (matchAtk) {
                        setSelectedAttackId(matchAtk.id);
                      }
                      setSelectedMarkerInfo({
                        id: tgt.id,
                        type: 'target',
                        title: tgt.name,
                        subtitle: tgt.sector,
                        location: tgt.location,
                        lat: tgt.lat,
                        lng: tgt.lng,
                        status: isSecured ? 'SECURED & PROTECTED' : isUnderAttack ? 'UNDER HOSTILE AI INFILTRATION' : 'NOMINAL DEFENSE POSTURE',
                        shieldOrPen: tgt.shieldIntegrity,
                        attack: matchAtk,
                      });
                    }}
                  >
                    <div className="relative cursor-pointer group flex flex-col items-center">
                      {isUnderAttack && (
                        <div className="absolute -inset-3 rounded-full bg-red-500/40 animate-ping" />
                      )}
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-2xl transition-transform group-hover:scale-125 border ${
                          isUnderAttack
                            ? 'bg-red-600 border-white text-white ring-2 ring-red-400 scale-110 animate-pulse'
                            : isSecured
                            ? 'bg-emerald-600 border-emerald-300 text-white shadow-emerald-950/60'
                            : 'bg-cyan-950/90 border-cyan-400 text-cyan-200'
                        }`}
                      >
                        {tgt.sector.includes('Bank') ? (
                          <Landmark className="w-5 h-5" />
                        ) : tgt.sector.includes('Model') || tgt.sector.includes('AI') ? (
                          <Lock className="w-5 h-5" />
                        ) : (
                          <ShieldCheck className="w-5 h-5" />
                        )}
                      </div>
                      <div
                        className={`mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap shadow-lg border ${
                          isUnderAttack
                            ? 'bg-black/95 border-red-500 text-red-300 font-bold'
                            : isSecured
                            ? 'bg-black/90 border-emerald-500/50 text-emerald-300'
                            : 'bg-black/90 border-cyan-500/40 text-cyan-200'
                        }`}
                      >
                        {tgt.name.split(' ')[0]} {tgt.sector.includes('Bank') ? '🏦' : '🛡️'}
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* Interactive Google Maps InfoWindow on Clicked Marker */}
              {selectedMarkerInfo && (
                <InfoWindow
                  position={{ lat: selectedMarkerInfo.lat, lng: selectedMarkerInfo.lng }}
                  onCloseClick={() => setSelectedMarkerInfo(null)}
                >
                  <div className="p-2.5 max-w-xs font-mono text-xs text-slate-900 space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {selectedMarkerInfo.title}
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          selectedMarkerInfo.status.includes('SECURED')
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedMarkerInfo.type === 'adversary' || selectedMarkerInfo.status.includes('UNDER')
                            ? 'bg-red-100 text-red-800'
                            : 'bg-cyan-100 text-cyan-800'
                        }`}
                      >
                        {selectedMarkerInfo.type === 'adversary' ? 'ADVERSARY C2' : 'TARGET ASSET'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-1">
                      <div>
                        <strong>Sector:</strong> {selectedMarkerInfo.subtitle}
                      </div>
                      <div>
                        <strong>Geo-Coordinates:</strong> {selectedMarkerInfo.location}
                      </div>
                      {selectedMarkerInfo.attack && (
                        <>
                          <div className="text-red-700 font-semibold">
                            <strong>Vector:</strong> {selectedMarkerInfo.attack.attackVector}
                          </div>
                          <div className="flex justify-between text-[10px] pt-1 border-t border-slate-200">
                            <span>Penetration: <strong>{selectedMarkerInfo.attack.penetrationPercent}%</strong></span>
                            <span>Shield: <strong>{selectedMarkerInfo.attack.defenseShieldPercent}%</strong></span>
                          </div>
                        </>
                      )}

                      {(() => {
                        const tgtMatch = targets.find((t) => t.id === selectedMarkerInfo.id);
                        if (tgtMatch && (tgtMatch.riskProfile || tgtMatch.recentIncidentHistory)) {
                          return (
                            <div className="space-y-1 pt-1.5 border-t border-slate-200 text-[10px] text-slate-700">
                              {tgtMatch.riskProfile && <div><strong>Risk Profile:</strong> {tgtMatch.riskProfile}</div>}
                              {tgtMatch.recentIncidentHistory && <div><strong>Recent Incidents:</strong> {tgtMatch.recentIncidentHistory}</div>}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {selectedMarkerInfo.attack && (
                      <div className="space-y-1.5 pt-1 border-t border-slate-200">
                        {selectedMarkerInfo.attack.status !== 'contained_and_secured' && (
                          <button
                            onClick={() => {
                              if (selectedMarkerInfo.attack) {
                                setSelectedAttackId(selectedMarkerInfo.attack.id);
                                handleDeployInterceptors();
                              }
                            }}
                            className="w-full py-1.5 px-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                          >
                            <Zap className="w-3 h-3 text-amber-300" />
                            <span>Scramble Defensive Interceptors</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (selectedMarkerInfo.attack) {
                              setSelectedAttackId(selectedMarkerInfo.attack.id);
                              setCockpitTab('forensic_dossier');
                              setSelectedMarkerInfo(null);
                            }
                          }}
                          className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-bold rounded text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 border border-cyan-500/40"
                        >
                          <FileText className="w-3 h-3 text-cyan-400" />
                          <span>Open 11-Dimension Dossier</span>
                        </button>
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </APIProvider>

          {/* Quick HUD Overlay at Top Right of Google Map */}
          <div className="absolute top-3 right-3 bg-slate-950/90 backdrop-blur-md p-3 rounded-lg border border-white/15 text-xs font-mono max-w-xs space-y-1.5 shadow-2xl z-10 pointer-events-none">
            <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              LIVE TELEMETRY RADAR
            </div>
            {selectedAttack ? (
              <>
                <div className="text-white font-bold truncate">{selectedAttack.targetName}</div>
                <div className="text-[11px] text-red-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-red-500 shrink-0" />
                  <span className="truncate">Adversary: {selectedAttack.adversaryName}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-white/10">
                  <span>PENETRATION: <strong className="text-red-400">{selectedAttack.penetrationPercent}%</strong></span>
                  <span>SHIELD: <strong className="text-cyan-400">{selectedAttack.defenseShieldPercent}%</strong></span>
                </div>
              </>
            ) : (
              <div className="text-slate-400 text-[11px]">All target sectors operating nominal.</div>
            )}
          </div>
        </div>
      </div>

      {/* DUAL COCKPIT: Combat Theater (Left 60%) + Attack Dispatcher (Right 40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Combat Theater & Real-time Defense Fight-Back (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Tactical Cockpit Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sound.play('click');
                  setCockpitTab('combat_fight');
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  cockpitTab === 'combat_fight'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-white/5'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>COMBAT FIGHT-BACK</span>
              </button>

              <button
                onClick={() => {
                  sound.play('click');
                  setCockpitTab('forensic_dossier');
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  cockpitTab === 'forensic_dossier'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-lg shadow-purple-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-white/5'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>MILITARY FORENSIC DOSSIER & RECOVERY</span>
                <span className="px-1.5 py-0.2 bg-purple-500/30 text-purple-200 text-[10px] rounded font-mono">11-DIM</span>
              </button>
            </div>

            {selectedAttack?.dossier && (
              <span
                className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${
                  selectedAttack.dossier.historicalPrecedent === 'FIRST_TIME_ZERO_DAY'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                }`}
              >
                {selectedAttack.dossier.historicalPrecedent === 'FIRST_TIME_ZERO_DAY'
                  ? '⚠️ ZERO-DAY EXPLOIT'
                  : '🔁 RECURRING APT'}
              </span>
            )}
          </div>

          {selectedAttack ? (
            cockpitTab === 'combat_fight' ? (
              /* TAB 1: REAL-TIME COMBAT FIGHT-BACK & AGENT CLASH */
              <div className="rounded-xl border border-white/10 bg-slate-950/90 p-5 space-y-5 shadow-2xl">
                {/* Target & Duel Header */}
                <div className="flex items-start justify-between border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                        {selectedAttack.targetSector.toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                          selectedAttack.status === 'contained_and_secured'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                        }`}
                      >
                        {selectedAttack.status === 'contained_and_secured'
                          ? 'SECURED & PROTECTED'
                          : 'COMBAT IN PROGRESS'}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white mt-1.5">
                      {selectedAttack.targetName}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Location: <span className="text-slate-200">{selectedAttack.targetLocation}</span> · Vector:{' '}
                      <span className="text-red-300 font-mono">{selectedAttack.attackVector}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-mono text-slate-500">ATTACK STARTED</div>
                    <div className="text-xs font-mono text-slate-300 font-semibold">
                      {selectedAttack.startedAt}
                    </div>
                  </div>
                </div>

                {/* Clash Combat Meter: Penetration vs. Defensive Shield */}
                <div className="space-y-2 p-3.5 rounded-lg border border-white/10 bg-black/40">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-red-400 font-bold">
                      <Flame className="w-4 h-4 text-red-500" />
                      <span>ADVERSARY PENETRATION: {selectedAttack.penetrationPercent}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span>CDF DEFENSIVE SHIELD: {selectedAttack.defenseShieldPercent}%</span>
                    </div>
                  </div>

                  <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-500"
                      style={{ width: `${selectedAttack.penetrationPercent}%` }}
                    />
                    <div
                      className="h-full bg-slate-800 transition-all duration-500"
                      style={{
                        width: `${Math.max(
                          0,
                          100 - selectedAttack.penetrationPercent - selectedAttack.defenseShieldPercent
                        )}%`,
                      }}
                    />
                    <div
                      className="h-full bg-gradient-to-l from-cyan-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${selectedAttack.defenseShieldPercent}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono text-center">
                    Battle Equilibrium: Reach 100% Defense Shielding to completely secure and lock down target assets.
                  </div>
                </div>

                {/* TACTICAL COUNTER-DEFENSE CONTROLS ("Virtually available to fight back") */}
                <div className="space-y-2.5">
                  <div className="text-xs font-mono font-bold text-slate-300 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-200">
                      <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>SWARM COUNTER-DEFENSE DIRECTIVES</span>
                    </span>
                    <span className="text-[10px] text-cyan-400 font-normal bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                      DEFENSIVE AGENTS ARMED
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={handleDeployInterceptors}
                      disabled={selectedAttack.status === 'contained_and_secured'}
                      className="p-3 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 transition-all text-left space-y-1 group disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-cyan-200 group-hover:text-cyan-100 flex items-center gap-1.5 truncate">
                          <Crosshair className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>1. Scramble Swarm</span>
                        </span>
                        <span className="text-[10px] font-mono text-cyan-300 shrink-0 bg-cyan-900/50 px-1 rounded">+28%</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Dispatches Sentinel-Zero & Aegis-Heuristic to clamp token bandwidth and isolate exploit payloads.
                      </p>
                    </button>

                    <button
                      onClick={handleDeployEbpfKillswitch}
                      disabled={selectedAttack.status === 'contained_and_secured'}
                      className="p-3 rounded-lg border border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/60 transition-all text-left space-y-1 group disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-indigo-200 group-hover:text-indigo-100 flex items-center gap-1.5 truncate">
                          <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>2. eBPF Killswitch</span>
                        </span>
                        <span className="text-[10px] font-mono text-indigo-300 shrink-0 bg-indigo-900/50 px-1 rounded">+30%</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Drops raw malicious packets at the network interface layer; severs adversary C2 connections in 1.4ms.
                      </p>
                    </button>

                    <button
                      onClick={handleReverseNeutralize}
                      disabled={selectedAttack.status === 'contained_and_secured'}
                      className="p-3 rounded-lg border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/60 transition-all text-left space-y-1 group disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-purple-200 group-hover:text-purple-100 flex items-center gap-1.5 truncate">
                          <Cpu className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>3. Reverse-Neutralize</span>
                        </span>
                        <span className="text-[10px] font-mono text-purple-300 shrink-0 bg-purple-900/50 px-1 rounded">+25%</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Injects counter-adversarial adversarial vectors into {selectedAttack.adversaryName.split(' ')[0]} to crash its reasoning core.
                      </p>
                    </button>

                    <button
                      onClick={handleSecureCompany}
                      disabled={
                        selectedAttack.status === 'contained_and_secured' ||
                        selectedAttack.defenseShieldPercent < 50
                      }
                      className={`p-3 rounded-lg border transition-all text-left space-y-1 ${
                        selectedAttack.defenseShieldPercent >= 50
                          ? 'border-emerald-500 bg-emerald-950/60 hover:bg-emerald-900 text-white shadow-lg shadow-emerald-950/50'
                          : 'border-white/10 bg-slate-900/40 text-slate-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 truncate">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>4. Secure Target</span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 shrink-0 bg-emerald-900/50 px-1 rounded font-bold">100%</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Full cryptographic seal. Restores bank ledger balance / model weights and marks organization as secured.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Live Combat Log Terminal */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-bold text-slate-300">LIVE AGENT COMBAT EXCHANGE LOG</span>
                    </div>
                    <span className="text-[10px] text-slate-500">REAL-TIME TELEMETRY</span>
                  </div>

                  <div
                    ref={combatLogRef}
                    className="h-44 overflow-y-auto bg-black/70 rounded-lg p-3 font-mono text-xs space-y-2 border border-white/5"
                  >
                    {selectedAttack.combatLogs.map((log, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-2 text-[11px] leading-relaxed ${
                          log.type === 'attack'
                            ? 'text-red-300'
                            : log.type === 'counter'
                            ? 'text-cyan-300'
                            : log.type === 'secure'
                            ? 'text-emerald-300 font-bold'
                            : 'text-amber-300 font-bold'
                        }`}
                      >
                        <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                        <span
                          className={`px-1 rounded text-[9px] font-bold shrink-0 ${
                            log.sender === 'ADVERSARY'
                              ? 'bg-red-950 text-red-400 border border-red-500/30'
                              : log.sender === 'DEFENDER'
                              ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/30'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {log.sender}
                        </span>
                        <span className="font-semibold text-slate-300 shrink-0">[{log.agentName}]:</span>
                        <span className="break-words">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: COMPREHENSIVE 11-DIMENSION MILITARY FORENSIC DOSSIER & RECOVERY */
              (() => {
                const dossier =
                  selectedAttack.dossier ||
                  generateDynamicDossier(
                    INITIAL_TARGETS[0],
                    selectedAttack.adversaryName,
                    selectedAttack.adversaryOrigin,
                    selectedAttack.attackVector
                  );

                const phases = [
                  'Reconnaissance',
                  'Initial Infiltration',
                  'Privilege Escalation',
                  'Data Staging',
                  'Exfiltration',
                  'Payload Execution',
                  'Defense Interception',
                  'Neutralized & Contained',
                ] as const;

                const currentPhaseIndex = phases.indexOf(dossier.currentPhase as any);

                return (
                  <div className="rounded-xl border border-purple-500/30 bg-slate-950/95 p-5 space-y-6 shadow-2xl">
                    {/* Dossier Master Header & Quick Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded">
                            CLASSIFIED THREAT DOSSIER
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 rounded">
                            MISSION REF: {selectedAttack.id.toUpperCase()}
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
                          <span>{selectedAttack.targetName}</span>
                        </h2>
                        <p className="text-xs text-slate-400 font-mono">
                          Target Sector: <span className="text-cyan-300">{selectedAttack.targetSector}</span> · Vector:{' '}
                          <span className="text-red-300">{selectedAttack.attackVector}</span>
                        </p>
                      </div>

                      {/* Top Action Triggers */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={handleDeployAgentsToSectors}
                          disabled={selectedAttack.status === 'contained_and_secured'}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Deploy Agents to Sectors</span>
                        </button>
                        <button
                          onClick={handleExecuteCompleteNeutralization}
                          disabled={selectedAttack.status === 'contained_and_secured'}
                          className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow disabled:opacity-50"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                          <span>Full Neutralization</span>
                        </button>
                      </div>
                    </div>

                    {/* DIMENSION 1: Whether it happened before or is First-Time Zero-Day */}
                    <div className="p-3.5 rounded-lg border border-white/10 bg-black/40 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-purple-300 flex items-center gap-1.5">
                          <History className="w-4 h-4 text-purple-400" />
                          <span>DIMENSION 1: HISTORICAL PRECEDENT & ZERO-DAY STATUS</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          SIGNATURE MATCH: <strong className="text-cyan-400">{dossier.signatureMatchScore}%</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs font-mono">
                        <div className="p-2.5 rounded bg-slate-900/80 border border-white/5 space-y-1">
                          <div className="text-[10px] text-slate-400">PRECEDENT CLASSIFICATION</div>
                          <div className={`font-bold ${
                            dossier.historicalPrecedent === 'FIRST_TIME_ZERO_DAY'
                              ? 'text-amber-300'
                              : 'text-cyan-300'
                          }`}>
                            {dossier.historicalPrecedent === 'FIRST_TIME_ZERO_DAY'
                              ? '⚠️ FIRST-TIME ZERO-DAY EXPLOIT'
                              : '🔁 RECURRING APT CAMPAIGN'}
                          </div>
                        </div>

                        <div className="p-2.5 rounded bg-slate-900/80 border border-white/5 space-y-1">
                          <div className="text-[10px] text-slate-400">PRIOR OCCURRENCES RECORDED</div>
                          <div className="font-bold text-white">
                            {dossier.previousOccurrencesCount === 0
                              ? '0 Prior Ingress Records (Novel)'
                              : `${dossier.previousOccurrencesCount} Logged Global Invasions`}
                          </div>
                        </div>

                        <div className="p-2.5 rounded bg-slate-900/80 border border-white/5 space-y-1">
                          <div className="text-[10px] text-slate-400">LAST OCCURRENCE TELEMETRY</div>
                          <div className="text-[11px] text-slate-300 truncate">
                            {dossier.lastOccurrenceDate || 'No Prior Historical Precedent'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DIMENSION 2: When did it happen (Timing, Anomaly Spike & Dwell Metrics) */}
                    <div className="p-3.5 rounded-lg border border-white/10 bg-black/40 space-y-2">
                      <div className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <span>DIMENSION 2: TIMESTAMPS, ANOMALY SPIKE & DWELL TIME</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs font-mono">
                        <div className="p-2.5 rounded bg-slate-900/80 border border-white/5 space-y-1">
                          <div className="text-[10px] text-slate-400">DETECTED ZULU TIME</div>
                          <div className="font-bold text-cyan-300 text-[11px]">
                            {dossier.detectedTimestamp}
                          </div>
                        </div>

                        <div className="p-2.5 rounded bg-slate-900/80 border border-white/5 space-y-1">
                          <div className="text-[10px] text-slate-400">ANOMALY SPIKE METRIC</div>
                          <div className="text-[11px] text-rose-300 font-semibold truncate">
                            {dossier.anomalySpikePoint}
                          </div>
                        </div>

                        <div className="p-2.5 rounded bg-slate-900/80 border border-white/5 space-y-1">
                          <div className="text-[10px] text-slate-400">ACTIVE INFRASTRUCTURE DWELL TIME</div>
                          <div className="font-bold text-amber-300">
                            {dossier.dwellTimeSeconds}s Elapsed Dwell
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DIMENSION 3: Attack Pattern & MITRE ATT&CK Techniques */}
                    <div className="p-3.5 rounded-lg border border-white/10 bg-black/40 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-purple-300 flex items-center gap-1.5">
                          <GitBranch className="w-4 h-4 text-purple-400" />
                          <span>DIMENSION 3: ATTACK PATTERN & MITRE ATT&CK TACTICS</span>
                        </span>
                      </div>

                      <div className="text-xs text-slate-200 font-mono bg-slate-900/80 p-2.5 rounded border border-white/5">
                        <strong className="text-purple-300">Pattern Classification:</strong> {dossier.attackPattern}
                      </div>

                      {/* MITRE Badges */}
                      <div className="flex flex-wrap gap-2">
                        {dossier.mitreTechniques.map((tech) => (
                          <div
                            key={tech.id}
                            className="px-2.5 py-1 rounded bg-slate-900 border border-cyan-500/30 text-xs font-mono flex items-center gap-2"
                          >
                            <span className="font-bold text-cyan-400">{tech.id}</span>
                            <span className="text-slate-300">{tech.name}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/20">
                              {tech.tactic}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Execution Sequence */}
                      <div className="space-y-1 pt-1">
                        <div className="text-[10px] font-mono text-slate-400 uppercase">
                          CHRONOLOGICAL EXECUTION SEQUENCE:
                        </div>
                        <div className="space-y-1 font-mono text-xs text-slate-300">
                          {dossier.executionSequence.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-2 bg-slate-900/60 p-1.5 rounded">
                              <span className="text-cyan-400 font-bold shrink-0">{idx + 1}.</span>
                              <span className="leading-snug">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* DIMENSION 4: Which Group Formed It (Attribution & Geopolitics) */}
                    <div className="p-3.5 rounded-lg border border-white/10 bg-black/40 space-y-2">
                      <div className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                        <Skull className="w-4 h-4 text-red-400" />
                        <span>DIMENSION 4: THREAT ACTOR ATTRIBUTION & PROVENANCE</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-2.5 rounded bg-slate-900/80 border border-white/5 space-y-1">
                          <div className="text-[10px] text-slate-400">ATTRIBUTED ADVERSARY GROUP</div>
                          <div className="font-bold text-red-400">{dossier.threatActorGroup}</div>
                          <div className="text-[11px] text-slate-300">Origin: {dossier.threatActorCountry}</div>
                        </div>

                        <div className="p-2.5 rounded bg-slate-900/80 border border-white/5 space-y-1">
                          <div className="text-[10px] text-slate-400">STRATEGIC MOTIVATION</div>
                          <div className="text-slate-200 leading-snug">{dossier.actorMotivation}</div>
                        </div>
                      </div>
                    </div>

                    {/* DIMENSION 5: Hop-by-Hop Geographic Transit Path (Which Countries Did It Pass Through) */}
                    <div className="p-3.5 rounded-lg border border-white/10 bg-black/40 space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-purple-300 flex items-center gap-1.5">
                          <Network className="w-4 h-4 text-cyan-400" />
                          <span>DIMENSION 5: GEOGRAPHIC TRANSIT HOP PATH (TRANSIT NATIONS)</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">5 HOPS VERIFIED</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                        {dossier.transitHopPath.map((hop, index) => (
                          <div
                            key={index}
                            className="p-2 rounded bg-slate-900/90 border border-white/10 font-mono text-[11px] space-y-1 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between text-[10px] text-cyan-400 font-bold">
                                <span>HOP {hop.hop}</span>
                                <span className="px-1 bg-cyan-950 rounded text-[9px] border border-cyan-500/20">
                                  {hop.nodeType}
                                </span>
                              </div>
                              <div className="font-bold text-white text-[11px] truncate mt-1">
                                {hop.location}
                              </div>
                              <div className="text-slate-400 text-[10px] truncate">
                                🌍 {hop.country}
                              </div>
                            </div>
                            <div className="text-[9px] text-slate-500 truncate pt-1 border-t border-white/5">
                              {hop.ipOrSubnet}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* DIMENSION 6: Current Live State Progression (8-Phase Track) */}
                    <div className="p-3.5 rounded-lg border border-white/10 bg-black/40 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-purple-300 flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-emerald-400" />
                          <span>DIMENSION 6: CURRENT LIVE STATE OF ATTACK (8-PHASE PROGRESSION)</span>
                        </span>
                        <span className="text-[10px] text-emerald-300 font-mono font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                          CURRENT: {dossier.currentPhase.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[10px]">
                        {phases.map((ph, idx) => {
                          const isActive = ph === dossier.currentPhase;
                          const isPassed = idx < currentPhaseIndex;
                          return (
                            <div
                              key={ph}
                              className={`p-2 rounded border text-center transition-all ${
                                isActive
                                  ? 'border-red-500 bg-red-950/60 text-red-200 font-bold shadow-md shadow-red-950 animate-pulse'
                                  : isPassed
                                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                                  : 'border-white/5 bg-slate-900/40 text-slate-500'
                              }`}
                            >
                              <div className="text-[9px] opacity-75">PHASE {idx + 1}</div>
                              <div className="truncate">{ph}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* DIMENSION 7: Why this started to exploit (Root Cause Vulnerability & Mechanism) */}
                    <div className="p-3.5 rounded-lg border border-white/10 bg-black/40 space-y-2">
                      <div className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>DIMENSION 7: ROOT CAUSE VULNERABILITY & EXPLOIT MECHANISM</span>
                      </div>

                      <div className="space-y-2 text-xs font-mono">
                        <div className="p-2.5 rounded bg-slate-900/80 border border-white/5 space-y-1">
                          <div className="text-[10px] text-rose-400 font-bold">CVE & VULNERABILITY ANCHOR</div>
                          <div className="font-bold text-white text-[12px]">{dossier.rootCauseVulnerability}</div>
                        </div>

                        <div className="p-2.5 rounded bg-slate-900/80 border border-white/5 space-y-1">
                          <div className="text-[10px] text-slate-400">EXPLOIT EXECUTION MECHANISM</div>
                          <p className="text-slate-300 leading-relaxed text-[11px]">{dossier.exploitMechanism}</p>
                        </div>
                      </div>
                    </div>

                    {/* DIMENSION 8: Projected Capital Loss & Blast Radius */}
                    <div className="p-3.5 rounded-lg border border-white/10 bg-black/40 space-y-2">
                      <div className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-amber-400" />
                        <span>DIMENSION 8: PROJECTED CAPITAL LOSS & BLAST RADIUS</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-2.5 rounded bg-slate-900/80 border border-white/5 space-y-1">
                          <div className="text-[10px] text-slate-400">PROJECTED CAPITAL AT RISK</div>
                          <div className="text-base font-extrabold text-red-400">
                            {dossier.projectedLossCapital}
                          </div>
                          <div className="text-[10px] text-slate-400">{dossier.regulatoryImpact}</div>
                        </div>

                        <div className="p-2.5 rounded bg-slate-900/80 border border-white/5 space-y-1">
                          <div className="text-[10px] text-slate-400">BLAST RADIUS COMPROMISED ASSETS</div>
                          <div className="space-y-0.5 text-[11px] text-slate-300">
                            {dossier.blastRadiusAssets.map((asset, i) => (
                              <div key={i} className="flex items-center gap-1.5 truncate">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                <span className="truncate">{asset}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DIMENSION 9: Resource & Entity Recovery Playbook */}
                    <div className="p-3.5 rounded-lg border border-white/10 bg-black/40 space-y-2.5">
                      <div className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                        <span>DIMENSION 9: RESOURCE & ENTITY RECOVERY PLAYBOOK</span>
                      </div>

                      <div className="space-y-2 font-mono text-xs">
                        {dossier.recoveryPlaybook.map((step) => (
                          <div
                            key={step.step}
                            className="p-2.5 rounded bg-slate-900/80 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400 font-bold">STEP {step.step}:</span>
                                <span className="text-white font-bold">{step.action}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-white/10">
                                  {step.targetEntity}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-snug">{step.recoveryMethod}</p>
                            </div>
                            <span className="text-[10px] font-mono text-cyan-300 shrink-0 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/20">
                              EST: ~{step.estimatedTimeMin} min
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* DIMENSION 10: Where to Send Agents to Defend & Get Back Data */}
                    <div className="p-3.5 rounded-lg border border-white/10 bg-black/40 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-purple-300 flex items-center gap-1.5">
                          <Cpu className="w-4 h-4 text-cyan-400" />
                          <span>DIMENSION 10: AGENT TACTICAL ZONE ASSIGNMENT DIRECTIVE</span>
                        </span>
                        <button
                          onClick={handleDeployAgentsToSectors}
                          className="text-[10px] font-mono text-cyan-300 hover:text-white bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Re-Task Swarm</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
                        {dossier.agentDeploymentDirectives.map((agent) => (
                          <div
                            key={agent.agentName}
                            className="p-2.5 rounded bg-slate-900/80 border border-white/5 space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-cyan-300">{agent.agentName}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                  agent.status === 'holding_perimeter'
                                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                                    : agent.status === 'complete'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {agent.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-[10px] text-purple-300 font-semibold">
                              Tactical Zone: {agent.tacticalZone}
                            </div>
                            <div className="text-[11px] text-slate-300 leading-snug">
                              {agent.missionDirective}
                            </div>
                            <div className="text-[10px] text-slate-500">Obj: {agent.objective}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* DIMENSION 11: How to Stop the Attack (Neutralization Execution Protocol) */}
                    <div className="p-3.5 rounded-lg border border-red-500/30 bg-black/40 space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-red-400 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-red-500" />
                          <span>DIMENSION 11: HOW TO STOP THE ATTACK (NEUTRALIZATION SEQUENCE)</span>
                        </span>
                        <span className="text-[10px] text-red-300 font-mono font-bold bg-red-950/60 px-2 py-0.5 rounded border border-red-500/30">
                          EMERGENCY PROTOCOL
                        </span>
                      </div>

                      <div className="space-y-1.5 font-mono text-xs text-slate-300">
                        {dossier.neutralizationExecutionSteps.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-2 bg-slate-900/80 p-2 rounded border border-white/5">
                            <span className="text-red-400 font-bold shrink-0">{idx + 1}.</span>
                            <span className="leading-snug">{step}</span>
                          </div>
                        ))}
                      </div>

                      {/* Interactive Emergency Neutralization Triggers */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 font-mono text-xs">
                        <button
                          onClick={handleDeployEbpfKillswitch}
                          disabled={selectedAttack.status === 'contained_and_secured'}
                          className="p-2 rounded bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 text-left space-y-0.5 disabled:opacity-50"
                        >
                          <div className="font-bold text-[11px] flex items-center gap-1">
                            <Lock className="w-3 h-3 text-indigo-400" />
                            <span>1. NIC Sever</span>
                          </div>
                          <div className="text-[9px] text-slate-400">eBPF Hardware Drop</div>
                        </button>

                        <button
                          onClick={handleDeployInterceptors}
                          disabled={selectedAttack.status === 'contained_and_secured'}
                          className="p-2 rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 text-left space-y-0.5 disabled:opacity-50"
                        >
                          <div className="font-bold text-[11px] flex items-center gap-1">
                            <Shield className="w-3 h-3 text-cyan-400" />
                            <span>2. Token Clamp</span>
                          </div>
                          <div className="text-[9px] text-slate-400">Entropy Filter</div>
                        </button>

                        <button
                          onClick={handleReverseNeutralize}
                          disabled={selectedAttack.status === 'contained_and_secured'}
                          className="p-2 rounded bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-left space-y-0.5 disabled:opacity-50"
                        >
                          <div className="font-bold text-[11px] flex items-center gap-1">
                            <Cpu className="w-3 h-3 text-purple-400" />
                            <span>3. Reverse Tensors</span>
                          </div>
                          <div className="text-[9px] text-slate-400">Crash C2 Loop</div>
                        </button>

                        <button
                          onClick={handleSecureCompany}
                          disabled={
                            selectedAttack.status === 'contained_and_secured' ||
                            selectedAttack.defenseShieldPercent < 50
                          }
                          className="p-2 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-left space-y-0.5 disabled:opacity-50"
                        >
                          <div className="font-bold text-[11px] flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>4. Seal Target</span>
                          </div>
                          <div className="text-[9px] text-slate-400">Cryptographic Attestation</div>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )
          ) : (
            <div className="p-8 rounded-xl border border-white/10 bg-slate-950 text-center text-slate-400 text-xs">
              Select an attack from the map or list to enter the real-time combat theater.
            </div>
          )}
        </div>

        {/* RIGHT: Attack Dispatcher & Target Institution Manager (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Dispatch Attack Control Box */}
          <div className="rounded-xl border border-red-500/30 bg-slate-950/90 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold text-white uppercase font-mono">
                  DISPATCH INCOMING ATTACK ALERT
                </h3>
              </div>
              <span className="text-[10px] font-mono text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-500/30">
                THREAT INJECTOR
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Trigger a realistic adversarial AI attack against any bank, model vault, or enterprise to test sovereign defense swarm response and alert propagation.
            </p>

            <form onSubmit={handleLaunchAttack} className="space-y-4">
              {/* Target Selection: Preset vs. Custom */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 font-semibold block">
                  TARGET RECIPIENT MODE
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setTargetMode('preset')}
                    className={`py-1.5 px-3 rounded border text-center transition-colors ${
                      targetMode === 'preset'
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold'
                        : 'border-white/10 bg-slate-900 text-slate-400'
                    }`}
                  >
                    Select Known Bank/Org
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode('custom')}
                    className={`py-1.5 px-3 rounded border text-center transition-colors ${
                      targetMode === 'custom'
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold'
                        : 'border-white/10 bg-slate-900 text-slate-400'
                    }`}
                  >
                    Enter Custom Company
                  </button>
                </div>
              </div>

              {targetMode === 'preset' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-300 block">
                    TARGET INSTITUTION PRESET
                  </label>
                  <select
                    value={selectedPresetTargetId}
                    onChange={(e) => setSelectedPresetTargetId(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded p-2 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
                  >
                    {targets.map((tgt) => (
                      <option key={tgt.id} value={tgt.id}>
                        {tgt.name} ({tgt.sector})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3 bg-black/30 p-3 rounded-lg border border-white/5">
                  <div>
                    <label className="text-[11px] font-mono text-slate-300 block mb-1">
                      COMPANY / BANK / ORG NAME
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Silicon Valley Bank, Barclays Wealth, Pfizer Bio"
                      value={customOrgName}
                      onChange={(e) => setCustomOrgName(e.target.value)}
                      className="w-full bg-slate-900 border border-white/15 rounded p-2 text-xs text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-mono text-slate-300 block mb-1">
                        SECTOR
                      </label>
                      <select
                        value={customSector}
                        onChange={(e) => setCustomSector(e.target.value as any)}
                        className="w-full bg-slate-900 border border-white/15 rounded p-1.5 text-xs text-white font-mono"
                      >
                        <option value="Banking & Financial Core">Banking & Finance</option>
                        <option value="Sovereign AI & Frontier Tech">Sovereign AI & Tech</option>
                        <option value="Critical Infrastructure">Critical Infrastructure</option>
                        <option value="Healthcare & Genomic">Healthcare & Bio</option>
                        <option value="Enterprise & Fortune 500">Enterprise Fortune 500</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-slate-300 block mb-1">
                        LOCATION (CITY, NATION)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Zurich, Switzerland"
                        value={customLocation}
                        onChange={(e) => setCustomLocation(e.target.value)}
                        className="w-full bg-slate-900 border border-white/15 rounded p-1.5 text-xs text-white placeholder-slate-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Attacking AI Agent Swarm Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 block">
                  ADVERSARIAL AI AGENT SWARM
                </label>
                <select
                  value={adversaryAgent}
                  onChange={(e) => setAdversaryAgent(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded p-2 text-xs text-red-300 font-mono focus:border-red-400 focus:outline-none"
                >
                  <option value="DarkSwarm-AI-v4">DarkSwarm-AI-v4 (Rogue Autonomous Swarm)</option>
                  <option value="Phantom-Broker-Zero">Phantom-Broker-Zero (Algorithmic Flash Drain)</option>
                  <option value="Volt-Agent-9">Volt-Agent-9 (State-Grade Adversarial LLM)</option>
                  <option value="DeepJailbreak-Cluster">DeepJailbreak-Cluster (Model Weights Exfiltrator)</option>
                  <option value="Hydra-LLM-Infiltrator">Hydra-LLM-Infiltrator (Zero-Day API Hijacker)</option>
                </select>
              </div>

              {/* Attack Vector Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 block">
                  ATTACK VECTOR & EXPLOIT PAYLOAD
                </label>
                <select
                  value={attackVectorType}
                  onChange={(e) => setAttackVectorType(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded p-2 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
                >
                  <option value="Autonomous LLM Swarm SWIFT API Hijack & Sharded Ledger Extraction">
                    SWIFT Interbank API Hijack & Sharded Ledger Exfiltration
                  </option>
                  <option value="Microsecond Algorithmic Flash Loan Drain & Liquidity Siphon">
                    Microsecond Algorithmic Flash Loan Drain & Liquidity Siphon
                  </option>
                  <option value="High-Velocity RoCE Side-Channel Weights Extraction (70B Shard)">
                    High-Velocity RoCE Side-Channel Weights Extraction (70B Shard)
                  </option>
                  <option value="SCADA Firmware Microcontroller Buffer Overflow & Grid Shutdown">
                    SCADA Firmware Microcontroller Buffer Overflow & Grid Shutdown
                  </option>
                  <option value="Zero-Trust Enclave PCR0 Hash Spoofing & Token Infiltration">
                    Zero-Trust Enclave PCR0 Hash Spoofing & Token Infiltration
                  </option>
                </select>
              </div>

              {/* Submit Attack Dispatch */}
              <button
                type="submit"
                disabled={isDispatching}
                className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold rounded-lg text-xs font-mono tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-950/60 transition-all hover:scale-[1.01]"
              >
                <Flame className="w-4 h-4 animate-pulse" />
                <span>DISPATCH ATTACK SCENARIO & TRIGGER ALERT</span>
              </button>
            </form>
          </div>

          {/* Active Attacks Queue List */}
          <div className="rounded-xl border border-white/10 bg-slate-950/90 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-white/10 text-slate-300">
              <span className="font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                LIVE ATTACK QUEUE ({attacks.length})
              </span>
              <span className="text-[10px] text-slate-500">CLICK TO ENGAGE</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {attacks.map((atk) => {
                const isSelected = atk.id === selectedAttackId;
                const isSecured = atk.status === 'contained_and_secured';
                return (
                  <div
                    key={atk.id}
                    onClick={() => {
                      sound.play('click');
                      setSelectedAttackId(atk.id);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all space-y-1.5 ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/40 shadow-md ring-1 ring-cyan-400/50'
                        : isSecured
                        ? 'border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/30'
                        : 'border-red-500/30 bg-red-950/20 hover:bg-red-950/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white truncate max-w-[200px]">
                        {atk.targetName}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          isSecured
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-red-500/20 text-red-300 animate-pulse'
                        }`}
                      >
                        {isSecured ? 'SECURED' : 'ATTACK ACTIVE'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
                      <span className="truncate max-w-[170px] text-red-400">
                        {atk.adversaryName.split(' ')[0]}
                      </span>
                      <span>
                        Shield: <strong className="text-cyan-300">{atk.defenseShieldPercent}%</strong>
                      </span>
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
