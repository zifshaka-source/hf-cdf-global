import React, { useState, useEffect, useRef } from 'react';
import {
  Swords,
  Cpu,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Flame,
  Radio,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  Crosshair,
  TrendingUp,
  Download,
  Upload,
  Globe,
  Sliders,
  Award,
  RefreshCw,
  HardDrive,
  Eye,
} from 'lucide-react';
import { sound } from '../../core/sound-fx';

// ---------------------------------------------------------------------------
// Types & Data Structures
// ---------------------------------------------------------------------------

export interface WarfareModel {
  id: string;
  name: string;
  codename: string;
  parameterSize: string;
  architecture: string;
  specialization: 'Defensive Enclave Sentinel' | 'Adversarial Red Simulator' | 'Zero-Day Synthesis' | 'Quantum Crypto Guard' | 'Autonomous Reasoning MoE';
  currentStatus: 'Ready for Deployment' | 'In Training Run' | 'Engaged in Virtual War' | 'Standby / Sealed';
  baseCheckpoint: string;
  assetValue: string;
  defenseRating: number; // 0 - 100
  counterAttackRating: number; // 0 - 100
  inferenceLatencyMs: number;
  tokensTrained: string;
  currentLoss: number;
  enclaveLocation: string;
  allocatedGpus: string;
}

export interface TrainingHyperparameters {
  learningRate: number;
  loraRank: number;
  loraAlpha: number;
  epochs: number;
  batchSize: number;
  gradientAccumulation: number;
  optimizer: 'AdamW-8bit' | 'Sophia-G' | 'Lion-8bit' | 'PagedAdamW';
  dataset: 'CVE-2026-Exploits' | 'DARPA-CGC-CyberRange' | 'DarkWeb-C2-Telemetry' | 'ZeroDay-Syscall-Dumps';
  supercluster: 'Ashburn Vault (1,024x B200)' | 'Tokyo Supercluster (512x H100)' | 'Frankfurt Interbank (256x H200)' | 'Luleå Hydro (128x B200)';
}

export interface VirtualWarScenario {
  id: string;
  title: string;
  classification: 'TOP SECRET // SOVEREIGN ENCLAVE';
  theater: string;
  adversaryName: string;
  adversaryTactic: string;
  mitreTactic: string;
  objective: string;
  initialEnemyHealth: number;
  initialDefenseHealth: number;
}

const INITIAL_WARFARE_MODELS: WarfareModel[] = [
  {
    id: 'titan-defense-70b',
    name: 'Titan-Defense-70B-FP8',
    codename: 'AEGIS PRIME',
    parameterSize: '70 Billion',
    architecture: 'Transformer Decoder Dense',
    specialization: 'Defensive Enclave Sentinel',
    currentStatus: 'Ready for Deployment',
    baseCheckpoint: 'sha256:8f3d19bc2a4e98f7...safetensors',
    assetValue: '$18,500,000,000',
    defenseRating: 98.4,
    counterAttackRating: 84.2,
    inferenceLatencyMs: 14.2,
    tokensTrained: '4.8 Trillion Tokens',
    currentLoss: 0.412,
    enclaveLocation: 'Ashburn Sovereign Enclave (Vault Alpha)',
    allocatedGpus: '1,024x NVIDIA B200 Tensor Core',
  },
  {
    id: 'aegis-moe-400b',
    name: 'Frontier-Sovereign-400B-MoE',
    codename: 'VALKYRIE APEX',
    parameterSize: '400 Billion MoE (32 Experts)',
    architecture: 'Mixture of Experts Sparse',
    specialization: 'Autonomous Reasoning MoE',
    currentStatus: 'Ready for Deployment',
    baseCheckpoint: 'sha256:4a991823bc0192e1...safetensors',
    assetValue: '$85,000,000,000',
    defenseRating: 99.6,
    counterAttackRating: 95.8,
    inferenceLatencyMs: 22.4,
    tokensTrained: '12.4 Trillion Tokens',
    currentLoss: 0.285,
    enclaveLocation: 'Tokyo Sovereign Hub (Enclave Omega)',
    allocatedGpus: '2,048x NVIDIA H100 SXM5',
  },
  {
    id: 'chimera-quantum-14b',
    name: 'Chimera-Quantum-14B-QKD',
    codename: 'CHRONO SHIELD',
    parameterSize: '14 Billion',
    architecture: 'Recurrent State-Space Hybrid',
    specialization: 'Quantum Crypto Guard',
    currentStatus: 'Ready for Deployment',
    baseCheckpoint: 'sha256:99bf10283a0192e8...safetensors',
    assetValue: '$6,200,000,000',
    defenseRating: 96.8,
    counterAttackRating: 78.4,
    inferenceLatencyMs: 8.6,
    tokensTrained: '2.1 Trillion Tokens',
    currentLoss: 0.342,
    enclaveLocation: 'Luleå Subterranean Hydro Enclave',
    allocatedGpus: '256x NVIDIA H200 NVL',
  },
  {
    id: 'valkyrie-zero-32b',
    name: 'Valkyrie-Zero-32B-ExploitPatcher',
    codename: 'GHOST BREAKER',
    parameterSize: '32 Billion',
    architecture: 'Dense Code Reasoning Engine',
    specialization: 'Zero-Day Synthesis',
    currentStatus: 'Ready for Deployment',
    baseCheckpoint: 'sha256:77ce190283a0192e...safetensors',
    assetValue: '$12,400,000,000',
    defenseRating: 94.2,
    counterAttackRating: 97.4,
    inferenceLatencyMs: 11.8,
    tokensTrained: '3.6 Trillion Tokens',
    currentLoss: 0.398,
    enclaveLocation: 'Frankfurt DE-CIX Interbank Enclave',
    allocatedGpus: '512x NVIDIA H100 SXM5',
  },
  {
    id: 'hyperion-adversary-671b',
    name: 'Deep-Adversary-671B-RedSwarm',
    codename: 'SHADOW VIPER',
    parameterSize: '671 Billion MoE (64 Experts)',
    architecture: 'Autonomous Adversarial Agent',
    specialization: 'Adversarial Red Simulator',
    currentStatus: 'Ready for Deployment',
    baseCheckpoint: 'sha256:c4ca4238a0b92382...safetensors',
    assetValue: '$45,000,000,000',
    defenseRating: 88.5,
    counterAttackRating: 99.8,
    inferenceLatencyMs: 28.2,
    tokensTrained: '16.0 Trillion Tokens',
    currentLoss: 0.210,
    enclaveLocation: 'Air-Gapped Red Lab Supercluster',
    allocatedGpus: '4,096x NVIDIA B200 Tensor Core',
  },
];

const WAR_SCENARIOS: VirtualWarScenario[] = [
  {
    id: 'war-01',
    title: 'Model Weights Exfiltration Multi-Vector Siege',
    classification: 'TOP SECRET // SOVEREIGN ENCLAVE',
    theater: 'Ashburn Sovereign Enclave · 400Gbps BGP Gateway',
    adversaryName: 'APT-41 Phantom Dragon Swarm',
    adversaryTactic: 'Chunked Out-of-Band TLS Steganography & Token Egress',
    mitreTactic: 'T1041: Exfiltration Over C2 & T1078: Valid Accounts',
    objective: 'Prevent unauthorized 70B parameter safetensors model weights extraction.',
    initialEnemyHealth: 100,
    initialDefenseHealth: 100,
  },
  {
    id: 'war-02',
    title: 'Autonomous Zero-Day Kernel Injection vs eBPF Shield',
    classification: 'TOP SECRET // SOVEREIGN ENCLAVE',
    theater: 'Frankfurt DE-CIX Financial Interbank Supercluster',
    adversaryName: 'Volt Typhoon Autonomous Botnet',
    adversaryTactic: 'Polymorphic eBPF Syscall Hooking & RAM Extraction',
    mitreTactic: 'T1565: Data Manipulation & T1190: Exploit Public-Facing App',
    objective: 'Synthesize real-time kernel memory defense patches in under 15ms.',
    initialEnemyHealth: 100,
    initialDefenseHealth: 100,
  },
  {
    id: 'war-03',
    title: 'Transoceanic Dark-Fiber & Satcom QKD Optical Warfare',
    classification: 'TOP SECRET // SOVEREIGN ENCLAVE',
    theater: 'Dover Strait Subsea Cable Landing & LEO KH-14 Orbit',
    adversaryName: 'Coherent Laser Phase Jammer Unit 8200',
    adversaryTactic: 'Optical Amplification Splice & Laser Polarization Distortion',
    mitreTactic: 'T1499: Endpoint Denial of Service & T1498: Network DoS',
    objective: 'Maintain quantum key distribution (QKD) bit error rate below 0.5%.',
    initialEnemyHealth: 100,
    initialDefenseHealth: 100,
  },
  {
    id: 'war-04',
    title: 'Interbank Sovereign Financial Clearing Blitzkrieg',
    classification: 'TOP SECRET // SOVEREIGN ENCLAVE',
    theater: 'Zurich-London-New York High-Frequency Clearing Core',
    adversaryName: 'Lazarus Autonomous Financial Infiltrator',
    adversaryTactic: 'Synthetic SWIFT MT103 Telemetry Injection & Merkle Spoofing',
    mitreTactic: 'T1059: Command Scripting Interpreter & T1565: Data Manipulation',
    objective: 'Scrub $420B daily liquidity pipeline with 0% false positives.',
    initialEnemyHealth: 100,
    initialDefenseHealth: 100,
  },
];

interface ModelWarfareTrainingArenaProps {
  onNotify?: (message: string, type: 'info' | 'success' | 'alert') => void;
  onSelectIncident?: (incidentId: string) => void;
}

export const ModelWarfareTrainingArena: React.FC<ModelWarfareTrainingArenaProps> = ({
  onNotify,
  onSelectIncident,
}) => {
  // Navigation tabs within this module
  const [activeTab, setActiveTab] = useState<'training' | 'virtual-war' | 'arsenal' | 'global-dossier'>('virtual-war');

  // Selected Model
  const [selectedModelId, setSelectedModelId] = useState<string>(INITIAL_WARFARE_MODELS[0].id);
  const [models, setModels] = useState<WarfareModel[]>(INITIAL_WARFARE_MODELS);

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];

  // -------------------------------------------------------------------------
  // Training Engine State
  // -------------------------------------------------------------------------
  const [hyperparams, setHyperparams] = useState<TrainingHyperparameters>({
    learningRate: 0.00015,
    loraRank: 64,
    loraAlpha: 128,
    epochs: 5,
    batchSize: 32,
    gradientAccumulation: 8,
    optimizer: 'AdamW-8bit',
    dataset: 'CVE-2026-Exploits',
    supercluster: 'Ashburn Vault (1,024x B200)',
  });

  const [isTraining, setIsTraining] = useState(false);
  const [currentStep, setCurrentStep] = useState(1420);
  const totalSteps = 3000;
  const [trainingLoss, setTrainingLoss] = useState(0.412);
  const [tokensPerSec, setTokensPerSec] = useState(1842500);
  const [lossHistory, setLossHistory] = useState<number[]>([1.84, 1.42, 1.12, 0.89, 0.65, 0.52, 0.44, 0.412]);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([
    `[INFO] Initialized LoRA adapter tensors (rank=64, alpha=128) on model ${selectedModel.name}`,
    `[INFO] Allocated 1,024x NVIDIA B200 Tensor Core GPUs with NVLink-5 1.8 TB/s fabric`,
    `[DATA] Ingestion stream locked to CVE-2026-Exploits (8.4M synthetic attack vectors)`,
    `[EPOCH 1] Loss converged from 2.14 -> 1.12. Checkpoint checkpoint-epoch-1.ckpt saved`,
    `[EPOCH 2] Merkle gradient validation verified across 8 distributed tensor shards`,
    `[EPOCH 3] Step 1420/3000: Loss 0.412 | Perplexity: 1.28 | Reward Model Alignment: 99.4%`,
  ]);

  // Training simulation loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTraining) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= totalSteps) {
            setIsTraining(false);
            sound.play('alert');
            onNotify?.(`Model ${selectedModel.name} successfully fine-tuned! Checkpoint verified.`, 'success');
            return totalSteps;
          }
          const nextStep = prev + 10;
          const nextLoss = Math.max(0.12, +(trainingLoss - 0.001 * (Math.random() * 2)).toFixed(4));
          setTrainingLoss(nextLoss);
          setLossHistory((lh) => [...lh.slice(-15), nextLoss]);
          setTokensPerSec(Math.round(1800000 + Math.random() * 100000));
          if (nextStep % 100 === 0) {
            setTrainingLogs((logs) => [
              `[STEP ${nextStep}] Loss: ${nextLoss} | Throughput: ${tokensPerSec.toLocaleString()} tok/s | LoRA delta norm: 0.014`,
              ...logs.slice(0, 15),
            ]);
          }
          return nextStep;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isTraining, trainingLoss, tokensPerSec, selectedModel.name, onNotify]);

  // -------------------------------------------------------------------------
  // Virtual Cyber Warfare Engine State
  // -------------------------------------------------------------------------
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(WAR_SCENARIOS[0].id);
  const selectedScenario = WAR_SCENARIOS.find((s) => s.id === selectedScenarioId) || WAR_SCENARIOS[0];

  const [warState, setWarState] = useState<'idle' | 'running' | 'paused' | 'victory' | 'breached'>('idle');
  const [battleRound, setBattleRound] = useState(1);
  const maxRounds = 10;
  const [enemyHealth, setEnemyHealth] = useState(100);
  const [defenseHealth, setDefenseHealth] = useState(100);
  const [battleLogs, setBattleLogs] = useState<Array<{ round: number; time: string; type: 'attack' | 'defense' | 'counter'; text: string; hash?: string; impact: string }>>([]);

  // Combat loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (warState === 'running') {
      timer = setInterval(() => {
        setBattleRound((prevRound) => {
          if (prevRound >= maxRounds || enemyHealth <= 0 || defenseHealth <= 0) {
            if (enemyHealth <= 0 || (prevRound >= maxRounds && defenseHealth > enemyHealth)) {
              setWarState('victory');
              sound.play('alert');
              onNotify?.(`VIRTUAL WAR VICTORY: ${selectedModel.name} successfully neutralized adversary swarm!`, 'success');
            } else {
              setWarState('breached');
              sound.play('alert');
              onNotify?.(`CRITICAL ALERT: Defense perimeter degraded in virtual combat range.`, 'alert');
            }
            return prevRound;
          }

          // Simulate battle round mechanics
          const enemyDmg = Math.round(5 + Math.random() * 12);
          const defenseDmg = Math.round(8 + Math.random() * 18);

          setDefenseHealth((h) => Math.max(0, h - enemyDmg));
          setEnemyHealth((e) => Math.max(0, e - defenseDmg));

          const eventTypes: Array<'attack' | 'defense' | 'counter'> = ['attack', 'defense', 'counter'];
          const chosenType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

          const attackTexts = [
            `Adversary injected chunked safetensors extraction packet (256MB) targeting ASN 41382.`,
            `Adversary botnet executed recursive zero-day ptrace injection on inference worker node #4.`,
            `Adversary laser phase generator attempted Doppler frequency distortion on QKD trunk.`,
            `Adversary injected forged SWIFT MT103 transaction payload with spoofed Merkle proof.`,
          ];

          const defenseTexts = [
            `${selectedModel.name} synthesized eBPF XDP hook in 3.8ms, dropping 14,200 malicious packets.`,
            `${selectedModel.name} locked Nitro Enclave cryptographic blast gate, isolating memory shard.`,
            `${selectedModel.name} applied real-time LoRA delta weights to neutralize token prompt jailbreak.`,
            `${selectedModel.name} engaged optical phase synchronizer, restoring QKD phase margin to 99.8%.`,
          ];

          const logEntry = {
            round: prevRound,
            time: new Date().toISOString().slice(11, 19) + ' UTC',
            type: chosenType,
            text: chosenType === 'attack' ? attackTexts[Math.floor(Math.random() * attackTexts.length)] : defenseTexts[Math.floor(Math.random() * defenseTexts.length)],
            hash: '0x' + Math.random().toString(16).slice(2, 10).toUpperCase(),
            impact: chosenType === 'attack' ? `-${enemyDmg}% Shield` : `-${defenseDmg}% Adversary`,
          };

          setBattleLogs((bl) => [logEntry, ...bl.slice(0, 19)]);
          return prevRound + 1;
        });
      }, 1400);
    }
    return () => clearInterval(timer);
  }, [warState, enemyHealth, defenseHealth, selectedModel.name, onNotify]);

  // Tactical combat actions available during live virtual warfare
  const handleTacticalSortie = (action: 'counter-perturbation' | 'air-gap-seal' | 'bgp-blackhole' | 'hotpatch-weights') => {
    sound.play('click');
    if (action === 'counter-perturbation') {
      setEnemyHealth((prev) => Math.max(0, prev - 22));
      setBattleLogs((bl) => [
        {
          round: battleRound,
          time: new Date().toISOString().slice(11, 19) + ' UTC',
          type: 'counter',
          text: `[TACTICAL SORTIE] Injected adversarial counter-perturbation into adversary neural network. Enemy entropy surged to 9.8.`,
          impact: '-22% Enemy Integrity',
        },
        ...bl,
      ]);
      onNotify?.(`Counter-perturbation payload delivered. Enemy model accuracy degraded.`, 'success');
    } else if (action === 'air-gap-seal') {
      setDefenseHealth((prev) => Math.min(100, prev + 25));
      setBattleLogs((bl) => [
        {
          round: battleRound,
          time: new Date().toISOString().slice(11, 19) + ' UTC',
          type: 'defense',
          text: `[TACTICAL SORTIE] Hardware-level Nitro Enclave air-gap seal engaged. 100% memory isolation confirmed.`,
          impact: '+25% Defense Shield',
        },
        ...bl,
      ]);
      onNotify?.(`Hardware air-gap seal engaged. Defense shield reinforced.`, 'info');
    } else if (action === 'bgp-blackhole') {
      setEnemyHealth((prev) => Math.max(0, prev - 18));
      setBattleLogs((bl) => [
        {
          round: battleRound,
          time: new Date().toISOString().slice(11, 19) + ' UTC',
          type: 'counter',
          text: `[TACTICAL SORTIE] BGP FlowSpec blackhole rule propagated to Tier-1 transit backbones (DE-CIX, Equinix).`,
          impact: '-18% Enemy Ingress',
        },
        ...bl,
      ]);
      onNotify?.(`BGP FlowSpec blackhole executed across global backbones.`, 'success');
    } else if (action === 'hotpatch-weights') {
      setDefenseHealth((prev) => Math.min(100, prev + 15));
      setEnemyHealth((prev) => Math.max(0, prev - 15));
      setBattleLogs((bl) => [
        {
          round: battleRound,
          time: new Date().toISOString().slice(11, 19) + ' UTC',
          type: 'counter',
          text: `[TACTICAL SORTIE] Hot-patched LoRA checkpoint deployed to GPU VRAM in 12ms. Exploit signature permanently neutralized.`,
          impact: '+15% Shield / -15% Enemy',
        },
        ...bl,
      ]);
      onNotify?.(`Hot-patch LoRA weights flashed to GPU clusters. Exploit neutralized.`, 'success');
    }
  };

  const handleStartWar = () => {
    sound.play('radar');
    setWarState('running');
    setBattleRound(1);
    setEnemyHealth(100);
    setDefenseHealth(100);
    setBattleLogs([
      {
        round: 1,
        time: new Date().toISOString().slice(11, 19) + ' UTC',
        type: 'defense',
        text: `VIRTUAL CYBER WAR INITIATED. Model [${selectedModel.name}] deployed to combat theater: ${selectedScenario.theater}`,
        impact: 'War Theater Active',
      },
    ]);
    onNotify?.(`Virtual War started: ${selectedModel.name} deployed against ${selectedScenario.adversaryName}`, 'alert');
  };

  const handleResetWar = () => {
    sound.play('click');
    setWarState('idle');
    setBattleRound(1);
    setEnemyHealth(100);
    setDefenseHealth(100);
    setBattleLogs([]);
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="apple-card p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/10 border border-[#0071e3]/30 flex items-center justify-center text-[#0071e3] shadow-sm">
              <Swords className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-[#86868b] font-medium tracking-wide">
                <span>FRONTIER AI DEFENSE & WARFARE MATRIX</span>
                <span className="text-white/20">·</span>
                <span className="text-[#30d158] font-semibold">5 ACTIVE LIVE MODELS</span>
                <span className="text-white/20">·</span>
                <span className="text-[#ff9f0a] font-semibold">GLOBAL CYBER WAR RANGE READY</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                Autonomous Model Warfare & Training Arena
              </h1>
            </div>
          </div>

          {/* Module Navigation Pill Bar */}
          <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.08] text-xs">
            {[
              { id: 'virtual-war', label: 'Virtual War Combat Arena', icon: Swords },
              { id: 'training', label: 'Live Model Fine-Tuning & RL', icon: Sliders },
              { id: 'arsenal', label: 'Frontier Model Arsenal', icon: Cpu },
              { id: 'global-dossier', label: 'Global Enclave Target Grid', icon: Globe },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    sound.play('click');
                    setActiveTab(tab.id as any);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white/15 text-white shadow-sm font-semibold'
                      : 'text-[#86868b] hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-[#86868b] leading-relaxed max-w-5xl">
          Train, fine-tune, and deploy frontier defense models into high-consequence simulated cyber warfare arenas. Models autonomously formulate counter-offensive mitigations, execute real-time eBPF memory patches, and defend enterprise and sovereign weights vaults against state-sponsored adversary AI swarms.
        </p>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: VIRTUAL WAR COMBAT ARENA                                       */}
      {/* ==================================================================== */}
      {activeTab === 'virtual-war' && (
        <div className="space-y-6">
          {/* Combat Header & Scenario Selector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Combat Configuration (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="apple-card p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs tracking-wider uppercase">
                    <Crosshair className="w-4 h-4 text-[#ff453a]" />
                    <span>Select Cyber War Scenario</span>
                  </div>
                  <span className="text-[10px] text-[#86868b] font-mono">{WAR_SCENARIOS.length} SCENARIOS</span>
                </div>

                <div className="space-y-2.5">
                  {WAR_SCENARIOS.map((sc) => {
                    const isSelected = sc.id === selectedScenarioId;
                    return (
                      <div
                        key={sc.id}
                        onClick={() => {
                          if (warState !== 'running') {
                            sound.play('click');
                            setSelectedScenarioId(sc.id);
                            handleResetWar();
                          }
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                          isSelected
                            ? 'border-[#ff453a]/60 bg-white/[0.06] shadow-sm ring-1 ring-[#ff453a]/40'
                            : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                        } ${warState === 'running' ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white truncate">{sc.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/30">
                            WAR
                          </span>
                        </div>
                        <div className="text-[11px] text-[#86868b] truncate">{sc.theater}</div>
                        <div className="text-[10px] text-white/70 font-mono">Adversary: {sc.adversaryName}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Combatant Model Card */}
              <div className="apple-card p-5 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs tracking-wider uppercase">
                    <Shield className="w-4 h-4 text-[#0071e3]" />
                    <span>Deployed Defense Model</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('arsenal')}
                    className="text-xs text-[#0071e3] hover:text-[#409cff] font-medium"
                  >
                    Change Model
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">{selectedModel.name}</div>
                      <div className="text-[11px] text-[#86868b] font-mono">{selectedModel.codename} · {selectedModel.parameterSize}</div>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30 font-semibold uppercase">
                      ACTIVE DEFENDER
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/[0.06] text-[#86868b]">
                    <div>Defense Resilience: <strong className="text-white font-mono">{selectedModel.defenseRating}%</strong></div>
                    <div>Counter-Strike: <strong className="text-[#30d158] font-mono">{selectedModel.counterAttackRating}%</strong></div>
                    <div>Inference Speed: <strong className="text-white font-mono">{selectedModel.inferenceLatencyMs}ms</strong></div>
                    <div>Cluster: <strong className="text-white font-mono truncate">B200 SXM5</strong></div>
                  </div>
                </div>

                {/* Primary War Control Buttons */}
                <div className="pt-2 flex items-center gap-3">
                  {warState === 'idle' || warState === 'victory' || warState === 'breached' ? (
                    <button
                      onClick={handleStartWar}
                      className="flex-1 py-3 px-4 bg-[#ff453a] hover:bg-[#ff5b52] text-white font-semibold text-xs rounded-xl shadow-lg shadow-[#ff453a]/20 flex items-center justify-center gap-2 transition-all"
                    >
                      <Swords className="w-4 h-4" />
                      <span>Deploy Model to Virtual War</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          sound.play('click');
                          setWarState(warState === 'running' ? 'paused' : 'running');
                        }}
                        className="flex-1 py-2.5 px-4 bg-white/[0.08] hover:bg-white/[0.14] text-white font-medium text-xs rounded-xl border border-white/[0.1] flex items-center justify-center gap-2 transition-all"
                      >
                        {warState === 'running' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        <span>{warState === 'running' ? 'Pause Combat' : 'Resume Combat'}</span>
                      </button>

                      <button
                        onClick={handleResetWar}
                        className="p-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-[#86868b] hover:text-white rounded-xl border border-white/[0.08] transition-colors"
                        title="Abort & Reset Simulation"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Live Combat Arena Simulation Deck (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="apple-card p-6 space-y-5">
                {/* Arena Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#86868b]">
                      <span>{selectedScenario.classification}</span>
                      <span>·</span>
                      <span>ROUND {battleRound} / {maxRounds}</span>
                    </div>
                    <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                      {selectedScenario.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono px-3 py-1 rounded-full uppercase font-semibold flex items-center gap-1.5 ${
                        warState === 'running'
                          ? 'bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/30 animate-pulse'
                          : warState === 'victory'
                          ? 'bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30'
                          : warState === 'breached'
                          ? 'bg-[#ff453a]/20 text-[#ff453a] border border-[#ff453a]/40'
                          : 'bg-white/10 text-[#86868b]'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>{warState === 'running' ? 'LIVE COMBAT ENGAGED' : warState.toUpperCase()}</span>
                    </span>
                  </div>
                </div>

                {/* Combat Clash Visualization: Sovereign Defender vs Adversary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Defender Box */}
                  <div className="p-4 rounded-xl border border-[#0071e3]/30 bg-white/[0.02] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#0071e3]" />
                        <span className="text-xs font-semibold text-white">SOVEREIGN MODEL SHIELD</span>
                      </div>
                      <span className="font-mono text-sm font-semibold text-[#0071e3]">{defenseHealth}%</span>
                    </div>

                    {/* Health Bar */}
                    <div className="h-2.5 w-full bg-white/[0.06] rounded-full overflow-hidden p-0.5 border border-white/[0.08]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0071e3] to-[#30d158] transition-all duration-300"
                        style={{ width: `${defenseHealth}%` }}
                      />
                    </div>

                    <div className="text-xs text-[#86868b] flex justify-between font-mono">
                      <span>{selectedModel.name}</span>
                      <span>Latency: {selectedModel.inferenceLatencyMs}ms</span>
                    </div>
                  </div>

                  {/* Adversary Box */}
                  <div className="p-4 rounded-xl border border-[#ff453a]/30 bg-white/[0.02] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-[#ff453a]" />
                        <span className="text-xs font-semibold text-white">ADVERSARY SWARM INTEGRITY</span>
                      </div>
                      <span className="font-mono text-sm font-semibold text-[#ff453a]">{enemyHealth}%</span>
                    </div>

                    {/* Health Bar */}
                    <div className="h-2.5 w-full bg-white/[0.06] rounded-full overflow-hidden p-0.5 border border-white/[0.08]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#ff9f0a] to-[#ff453a] transition-all duration-300"
                        style={{ width: `${enemyHealth}%` }}
                      />
                    </div>

                    <div className="text-xs text-[#86868b] flex justify-between font-mono">
                      <span>{selectedScenario.adversaryName}</span>
                      <span>Threat: HIGH</span>
                    </div>
                  </div>
                </div>

                {/* Tactical In-Battle Sortie Triggers (User Intervention) */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
                    Interactive Tactical War Sorties (Real-Time Operator Command)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button
                      onClick={() => handleTacticalSortie('counter-perturbation')}
                      disabled={warState !== 'running'}
                      className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-40 transition-all text-left space-y-1 group"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-[#ff9f0a] transition-colors">
                        <Zap className="w-3.5 h-3.5 text-[#ff9f0a]" />
                        <span>Counter-Perturbation</span>
                      </div>
                      <div className="text-[10px] text-[#86868b]">Surge enemy entropy -22%</div>
                    </button>

                    <button
                      onClick={() => handleTacticalSortie('air-gap-seal')}
                      disabled={warState !== 'running'}
                      className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-40 transition-all text-left space-y-1 group"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-[#0071e3] transition-colors">
                        <Lock className="w-3.5 h-3.5 text-[#0071e3]" />
                        <span>Air-Gap Memory Seal</span>
                      </div>
                      <div className="text-[10px] text-[#86868b]">Reinforce shield +25%</div>
                    </button>

                    <button
                      onClick={() => handleTacticalSortie('bgp-blackhole')}
                      disabled={warState !== 'running'}
                      className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-40 transition-all text-left space-y-1 group"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-[#ff453a] transition-colors">
                        <Radio className="w-3.5 h-3.5 text-[#ff453a]" />
                        <span>BGP FlowSpec Drop</span>
                      </div>
                      <div className="text-[10px] text-[#86868b]">Drop adversary ingress -18%</div>
                    </button>

                    <button
                      onClick={() => handleTacticalSortie('hotpatch-weights')}
                      disabled={warState !== 'running'}
                      className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-40 transition-all text-left space-y-1 group"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-[#30d158] transition-colors">
                        <Sparkles className="w-3.5 h-3.5 text-[#30d158]" />
                        <span>Hot-Patch LoRA</span>
                      </div>
                      <div className="text-[10px] text-[#86868b]">Flash GPU delta in 12ms</div>
                    </button>
                  </div>
                </div>

                {/* Real-time Combat Incident Telemetry Feed */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-white">
                    <span className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-[#0071e3]" />
                      <span>Autonomous Combat Action Stream & Packet Trace</span>
                    </span>
                    <span className="text-[11px] font-mono text-[#86868b]">{battleLogs.length} Combat Events</span>
                  </div>

                  <div className="h-64 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                    {battleLogs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#86868b] border border-dashed border-white/[0.08] rounded-xl">
                        <Swords className="w-8 h-8 opacity-40 mb-2" />
                        <div className="text-sm font-medium text-white/80">Cyber Warfare Range Ready</div>
                        <div className="text-xs max-w-sm mt-1">
                          Click <strong>Deploy Model to Virtual War</strong> to commence real-time autonomous model attack and defense simulation.
                        </div>
                      </div>
                    ) : (
                      battleLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border transition-all text-xs space-y-1 ${
                            log.type === 'counter'
                              ? 'border-[#30d158]/30 bg-[#30d158]/5'
                              : log.type === 'attack'
                              ? 'border-[#ff453a]/30 bg-[#ff453a]/5'
                              : 'border-white/[0.06] bg-black/40'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <span
                                className={`uppercase font-semibold text-[10px] px-1.5 py-0.5 rounded ${
                                  log.type === 'counter'
                                    ? 'bg-[#30d158]/20 text-[#30d158]'
                                    : log.type === 'attack'
                                    ? 'bg-[#ff453a]/20 text-[#ff453a]'
                                    : 'bg-[#0071e3]/20 text-[#0071e3]'
                                }`}
                              >
                                [{log.type}]
                              </span>
                              <span className="text-[#86868b]">Round {log.round}</span>
                              {log.hash && <span className="text-white/60 text-[10px]">{log.hash}</span>}
                            </div>
                            <span className="text-[#86868b] text-[10px]">{log.time}</span>
                          </div>

                          <div className="text-white/90 leading-relaxed font-sans text-xs">{log.text}</div>

                          <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-[10px] text-[#86868b]">
                            <span>Impact: <strong className="text-white">{log.impact}</strong></span>
                            <span>Target: {selectedScenario.theater.split('·')[0]}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: LIVE MODEL FINE-TUNING & RL ENGINE                            */}
      {/* ==================================================================== */}
      {activeTab === 'training' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Hyperparameters & RL Settings (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="apple-card p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs tracking-wider uppercase">
                    <Sliders className="w-4 h-4 text-[#0071e3]" />
                    <span>Fine-Tuning & RL Hyperparameters</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#30d158]">FP8 ACCELERATED</span>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Model Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[#86868b] font-medium">Target Defense Model</label>
                    <select
                      value={selectedModelId}
                      onChange={(e) => setSelectedModelId(e.target.value)}
                      disabled={isTraining}
                      className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:ring-1 focus:ring-[#0071e3]"
                    >
                      {models.map((m) => (
                        <option key={m.id} value={m.id} className="bg-[#121216] text-white">
                          {m.name} ({m.parameterSize})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Supercluster Allocation */}
                  <div className="space-y-1.5">
                    <label className="text-[#86868b] font-medium">Compute Cluster Deployment</label>
                    <select
                      value={hyperparams.supercluster}
                      onChange={(e) => setHyperparams({ ...hyperparams, supercluster: e.target.value as any })}
                      disabled={isTraining}
                      className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:ring-1 focus:ring-[#0071e3]"
                    >
                      <option value="Ashburn Vault (1,024x B200)" className="bg-[#121216] text-white">Ashburn Vault (1,024x B200 SXM5 - 1.8 TB/s)</option>
                      <option value="Tokyo Supercluster (512x H100)" className="bg-[#121216] text-white">Tokyo Supercluster (512x H100 SXM5 - 900 GB/s)</option>
                      <option value="Frankfurt Interbank (256x H200)" className="bg-[#121216] text-white">Frankfurt Interbank (256x H200 NVL - 4.8 TB/s)</option>
                      <option value="Luleå Hydro (128x B200)" className="bg-[#121216] text-white">Luleå Hydro Subterranean (128x B200)</option>
                    </select>
                  </div>

                  {/* Dataset Corpus */}
                  <div className="space-y-1.5">
                    <label className="text-[#86868b] font-medium">Training & RLAIF Dataset Corpus</label>
                    <select
                      value={hyperparams.dataset}
                      onChange={(e) => setHyperparams({ ...hyperparams, dataset: e.target.value as any })}
                      disabled={isTraining}
                      className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:ring-1 focus:ring-[#0071e3]"
                    >
                      <option value="CVE-2026-Exploits" className="bg-[#121216] text-white">CVE-2026-Exploits (8.4M Synthetic Attack Vectors)</option>
                      <option value="DARPA-CGC-CyberRange" className="bg-[#121216] text-white">DARPA-CGC-CyberRange (Autonomous Binary Exploits)</option>
                      <option value="DarkWeb-C2-Telemetry" className="bg-[#121216] text-white">DarkWeb-C2-Telemetry (State-Actor Malware Payloads)</option>
                      <option value="ZeroDay-Syscall-Dumps" className="bg-[#121216] text-white">ZeroDay-Syscall-Dumps (eBPF Kernel Ring-0 Telemetry)</option>
                    </select>
                  </div>

                  {/* LoRA Rank & Learning Rate Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[#86868b]">LoRA Rank (r)</label>
                      <select
                        value={hyperparams.loraRank}
                        onChange={(e) => setHyperparams({ ...hyperparams, loraRank: Number(e.target.value) })}
                        disabled={isTraining}
                        className="w-full p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white"
                      >
                        <option value={16} className="bg-[#121216]">r = 16 (Fast Adapter)</option>
                        <option value={32} className="bg-[#121216]">r = 32 (Standard)</option>
                        <option value={64} className="bg-[#121216]">r = 64 (High-Fidelity)</option>
                        <option value={128} className="bg-[#121216]">r = 128 (Full Rank Emulation)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#86868b]">Optimizer</label>
                      <select
                        value={hyperparams.optimizer}
                        onChange={(e) => setHyperparams({ ...hyperparams, optimizer: e.target.value as any })}
                        disabled={isTraining}
                        className="w-full p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white"
                      >
                        <option value="AdamW-8bit" className="bg-[#121216]">AdamW-8bit</option>
                        <option value="Sophia-G" className="bg-[#121216]">Sophia-G (Second-Order)</option>
                        <option value="Lion-8bit" className="bg-[#121216]">Lion-8bit</option>
                        <option value="PagedAdamW" className="bg-[#121216]">PagedAdamW</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        sound.play('radar');
                        setIsTraining(!isTraining);
                        if (!isTraining) {
                          onNotify?.(`Fine-tuning started for ${selectedModel.name} on ${hyperparams.supercluster}`, 'info');
                        }
                      }}
                      className={`w-full py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
                        isTraining
                          ? 'bg-[#ff9f0a] hover:bg-[#e08b08] text-white'
                          : 'bg-[#0071e3] hover:bg-[#0077ed] text-white'
                      }`}
                    >
                      {isTraining ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isTraining ? 'Pause Fine-Tuning Execution' : 'Execute Training & Alignment Run'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Live Loss Curve, Tensors & Telemetry (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="apple-card p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs tracking-wider uppercase">
                    <Activity className="w-4 h-4 text-[#30d158]" />
                    <span>Real-Time Loss Convergence & Tensor Telemetry</span>
                  </div>
                  <span className="text-xs text-[#30d158] font-mono">
                    {tokensPerSec.toLocaleString()} TOKENS / SEC
                  </span>
                </div>

                {/* KPI Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                    <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold">Training Step</div>
                    <div className="text-base font-semibold font-mono text-white">
                      {currentStep} / {totalSteps}
                    </div>
                    <div className="text-[10px] text-[#86868b]">{((currentStep / totalSteps) * 100).toFixed(1)}% Complete</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                    <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold">Cross-Entropy Loss</div>
                    <div className="text-base font-semibold font-mono text-[#30d158]">
                      {trainingLoss}
                    </div>
                    <div className="text-[10px] text-[#86868b]">Perplexity: 1.28</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                    <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold">Compute Throughput</div>
                    <div className="text-base font-semibold font-mono text-[#0071e3]">
                      {(tokensPerSec / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-[10px] text-[#86868b]">94.2% TFLOPS Util</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                    <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold">Checkpoint Hash</div>
                    <div className="text-xs font-semibold font-mono text-white/90 truncate">
                      blake3:8f3d...91c2
                    </div>
                    <div className="text-[10px] text-[#30d158]">WORM Sealed</div>
                  </div>
                </div>

                {/* Visual Loss Histogram Bar Simulator */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#86868b]">
                    <span>Loss Trajectory Progression</span>
                    <span className="font-mono">Current: {trainingLoss}</span>
                  </div>
                  <div className="h-20 flex items-end gap-1.5 pt-2">
                    {lossHistory.map((val, idx) => {
                      const heightPercent = Math.min(100, Math.max(10, (val / 2.0) * 100));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-[#0071e3] hover:bg-[#30d158] rounded-t transition-all"
                            style={{ height: `${heightPercent}%` }}
                            title={`Loss: ${val}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Training Output Terminal */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
                    Distributed Training Cluster Log Stream
                  </div>
                  <div className="h-44 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-black/50 border border-white/[0.06] font-mono text-[11px] text-[#a1a1a6]">
                    {trainingLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: FRONTIER MODEL ARSENAL                                         */}
      {/* ==================================================================== */}
      {activeTab === 'arsenal' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
              SOVEREIGN ENCLAVE MODEL INVENTORY ({models.length} FRONTIER MODELS)
            </span>
            <span className="text-xs text-[#30d158] font-medium">100% HARDWARE ENCLAVE ATTESTED</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {models.map((model) => {
              const isSelected = model.id === selectedModelId;
              return (
                <div
                  key={model.id}
                  className={`apple-card p-6 space-y-4 border transition-all ${
                    isSelected
                      ? 'border-[#0071e3]/60 bg-white/[0.05] ring-1 ring-[#0071e3]/40'
                      : 'border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-[#0071e3] font-mono font-semibold">{model.codename}</div>
                      <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">{model.name}</h3>
                      <div className="text-xs text-[#86868b] mt-0.5">{model.specialization}</div>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.06] text-white/90 border border-white/[0.08] font-mono">
                      {model.parameterSize}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-white/[0.06] text-[#86868b]">
                    <div>Asset Valuation: <strong className="text-white block font-mono">{model.assetValue}</strong></div>
                    <div>Defense Shield: <strong className="text-[#30d158] block font-mono">{model.defenseRating}%</strong></div>
                    <div>Counter-Strike: <strong className="text-white block font-mono">{model.counterAttackRating}%</strong></div>
                    <div>Latency: <strong className="text-white block font-mono">{model.inferenceLatencyMs}ms</strong></div>
                  </div>

                  <div className="text-[11px] text-[#86868b] truncate pt-1 border-t border-white/[0.04]">
                    Enclave: <span className="text-white/80">{model.enclaveLocation}</span>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => {
                        sound.play('click');
                        setSelectedModelId(model.id);
                        setActiveTab('virtual-war');
                        onNotify?.(`Selected ${model.name} for combat deployment.`, 'info');
                      }}
                      className="flex-1 py-2 px-3 bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>Send to War</span>
                    </button>

                    <button
                      onClick={() => {
                        sound.play('click');
                        setSelectedModelId(model.id);
                        setActiveTab('training');
                      }}
                      className="py-2 px-3 bg-white/[0.06] hover:bg-white/[0.1] text-white/90 font-medium text-xs rounded-xl border border-white/[0.08] transition-colors"
                    >
                      Fine-Tune
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: GLOBAL ENCLAVE TARGET GRID                                    */}
      {/* ==================================================================== */}
      {activeTab === 'global-dossier' && (
        <div className="space-y-5">
          <div className="apple-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Global Critical Infrastructure & Sovereign Defense Enclaves
                </h2>
                <div className="text-xs text-[#86868b] mt-0.5">
                  Real-time synchronization across 48 sovereign enclaves, dark-fiber landing stations, and GPU superclusters worldwide.
                </div>
              </div>
              <div className="text-xs font-mono text-[#30d158] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#30d158]" />
                <span>48 ENCLAVES MONITORED</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] text-[10px] text-[#86868b] uppercase tracking-wider border-b border-white/[0.06]">
                  <tr>
                    <th className="p-3.5">Enclave & Target Facility</th>
                    <th className="p-3.5">Coordinates & Region</th>
                    <th className="p-3.5">Assigned Defense Model</th>
                    <th className="p-3.5">Bandwidth & Power</th>
                    <th className="p-3.5">Threat Posture</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-white/90">
                  {[
                    {
                      facility: 'Ashburn Sovereign Vault 01',
                      type: 'Primary Model Weights Vault',
                      coords: '39°02\'38.4"N 77°29\'15.2"W',
                      region: 'North America (US-East)',
                      model: 'Titan-Defense-70B',
                      specs: '400 Gbps · 185 MW',
                      risk: 'CRITICAL (Active Siege)',
                      riskColor: 'text-[#ff453a] bg-[#ff453a]/15 border-[#ff453a]/30',
                    },
                    {
                      facility: 'Tokyo Sovereign Hub (Omega)',
                      type: 'GPU Inference Supercluster',
                      coords: '35°41\'22.0"N 139°41\'30.0"E',
                      region: 'Asia-Pacific (AP-Northeast)',
                      model: 'Frontier-Sovereign-400B',
                      specs: '1.2 Tbps · 320 MW',
                      risk: 'NOMINAL (Shielded)',
                      riskColor: 'text-[#30d158] bg-[#30d158]/15 border-[#30d158]/30',
                    },
                    {
                      facility: 'Frankfurt DE-CIX Interbank',
                      type: 'Financial Clearing Core',
                      coords: '50°06\'49.0"N 8°40\'48.0"E',
                      region: 'Europe Central (EU-West)',
                      model: 'Valkyrie-Zero-32B',
                      specs: '2.4 Tbps · 140 MW',
                      risk: 'ELEVATED (Scrubbing)',
                      riskColor: 'text-[#ff9f0a] bg-[#ff9f0a]/15 border-[#ff9f0a]/30',
                    },
                    {
                      facility: 'Dover Strait Subsea Station',
                      type: 'Transoceanic Dark-Fiber Landing',
                      coords: '51°14\'02.0"N 1°23\'55.0"E',
                      region: 'North Atlantic Trunk',
                      model: 'Chimera-Quantum-14B',
                      specs: '235 Tbps DWDM',
                      risk: 'NOMINAL (QKD Phase Locked)',
                      riskColor: 'text-[#30d158] bg-[#30d158]/15 border-[#30d158]/30',
                    },
                    {
                      facility: 'Luleå Hydro Subterranean DC',
                      type: 'Cryptographic Cold AirGap',
                      coords: '65°35\'00.0"N 22°09\'00.0"E',
                      region: 'Nordic Sovereign Vault',
                      model: 'DeepSeek-V3-671B',
                      specs: '100% Zero-Carbon Hydro',
                      risk: 'NOMINAL (Zero Breach)',
                      riskColor: 'text-[#30d158] bg-[#30d158]/15 border-[#30d158]/30',
                    },
                    {
                      facility: 'Singapore Edge Core 04',
                      type: 'Cross-Border Clearing Shield',
                      coords: '1°21\'30.0"N 103°49\'45.0"E',
                      region: 'Southeast Asia Gateway',
                      model: 'Valkyrie-Zero-32B',
                      specs: '800 Gbps · 95 MW',
                      risk: 'MODERATE (Monitoring)',
                      riskColor: 'text-[#ffd60a] bg-[#ffd60a]/15 border-[#ffd60a]/30',
                    },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5">
                        <div className="font-semibold text-white">{row.facility}</div>
                        <div className="text-[11px] text-[#86868b]">{row.type}</div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div>{row.coords}</div>
                        <div className="text-[11px] text-[#86868b]">{row.region}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-white">{row.model}</div>
                        <div className="text-[10px] text-[#30d158] font-mono">AUTONOMOUS ATTESTED</div>
                      </td>
                      <td className="p-3.5 font-mono text-white/90">
                        {row.specs}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${row.riskColor}`}>
                          {row.risk}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            sound.play('click');
                            setActiveTab('virtual-war');
                            onNotify?.(`Navigated to Virtual War theater for ${row.facility}.`, 'info');
                          }}
                          className="px-3 py-1 bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white rounded-lg border border-white/[0.08] transition-colors"
                        >
                          Engage Defense
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
