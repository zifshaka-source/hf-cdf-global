import { CompanyProfile, EnterpriseThreatDispatch, VirtualSoldierCombatEvent, VirtualSoldierUnit } from './types';

export const TOP_TECH_COMPANIES: CompanyProfile[] = [
  {
    id: 'comp-huggingface',
    name: 'Hugging Face',
    slug: 'huggingface',
    domain: 'huggingface.co',
    sector: 'AI Model Hub',
    headquarters: 'New York, USA / Paris, France',
    criticalAssets: [
      'models.huggingface.co/safetensors-vault',
      'hub.transformers.cache',
      'dataset-ingestion-workers',
      'hf-token-authentication-gateway',
    ],
    securityContact: 'security@huggingface.co',
    allianceStatus: 'Under Active Attack',
    riskScore: 89,
    threatsNeutralizedCount: 14,
    logoColor: '#ffd21e',
    notes: 'Primary open-source foundation model hub housing >500,000 public and private weights shards.',
  },
  {
    id: 'comp-openai',
    name: 'OpenAI',
    slug: 'openai',
    domain: 'openai.com',
    sector: 'Frontier LLM Provider',
    headquarters: 'San Francisco, CA, USA',
    criticalAssets: [
      'api.openai.com/v1/inference-engine',
      'frontier-weights-attested-vault',
      'azure-expressroute-hybrid-link',
      'oauth-sts-token-signing-hsm',
    ],
    securityContact: 'security@openai.com',
    allianceStatus: 'Active Defense Partner',
    riskScore: 78,
    threatsNeutralizedCount: 29,
    logoColor: '#10a37f',
    notes: 'Frontier AI training and multi-agent infrastructure with global sovereign API endpoints.',
  },
  {
    id: 'comp-anthropic',
    name: 'Anthropic',
    slug: 'anthropic',
    domain: 'anthropic.com',
    sector: 'Safety Research',
    headquarters: 'San Francisco, CA, USA',
    criticalAssets: [
      'constitutional-rlhf-mesh',
      'claude-api-gateway-us-east',
      'safety-alignment-eval-sandbox',
    ],
    securityContact: 'security@anthropic.com',
    allianceStatus: 'Shielded by CDF',
    riskScore: 42,
    threatsNeutralizedCount: 19,
    logoColor: '#d97757',
    notes: 'AI safety research foundation operating Claude models with automated constitutional guardrails.',
  },
  {
    id: 'comp-deepmind',
    name: 'Google DeepMind',
    slug: 'deepmind',
    domain: 'deepmind.google',
    sector: 'Frontier LLM Provider',
    headquarters: 'London, UK / Mountain View, CA',
    criticalAssets: [
      'tpu-v5p-superpod-mesh',
      'gemini-frontier-training-vault',
      'alphanode-quantum-compiler',
    ],
    securityContact: 'security@deepmind.google',
    allianceStatus: 'Active Defense Partner',
    riskScore: 36,
    threatsNeutralizedCount: 34,
    logoColor: '#4285f4',
    notes: 'Advanced AI research lab operating large-scale distributed TPU clusters and agent systems.',
  },
  {
    id: 'comp-microsoft',
    name: 'Microsoft / Azure AI',
    slug: 'microsoft',
    domain: 'microsoft.com',
    sector: 'Hyperscale Cloud',
    headquarters: 'Redmond, WA, USA',
    criticalAssets: [
      'entra-id-global-federation',
      'azure-openai-eastus-supercluster',
      'copilot-enterprise-graph-hub',
    ],
    securityContact: 'msrc@microsoft.com',
    allianceStatus: 'Active Defense Partner',
    riskScore: 58,
    threatsNeutralizedCount: 62,
    logoColor: '#00a4ef',
    notes: 'Hyperscale cloud and enterprise identity backbone securing global AI workflows.',
  },
  {
    id: 'comp-meta',
    name: 'Meta FAIR',
    slug: 'meta',
    domain: 'meta.com',
    sector: 'Frontier LLM Provider',
    headquarters: 'Menlo Park, CA, USA',
    criticalAssets: [
      'llama-open-weights-cdn',
      'fair-gpu-cluster-ashburn',
      'pytorch-foundation-build-pipeline',
    ],
    securityContact: 'security@meta.com',
    allianceStatus: 'Shielded by CDF',
    riskScore: 48,
    threatsNeutralizedCount: 22,
    logoColor: '#0668e1',
    notes: 'Pioneers of open weights foundation models and distributed PyTorch GPU training.',
  },
  {
    id: 'comp-nvidia',
    name: 'NVIDIA',
    slug: 'nvidia',
    domain: 'nvidia.com',
    sector: 'Hardware & Foundry',
    headquarters: 'Santa Clara, CA, USA',
    criticalAssets: [
      'cuda-driver-signing-keys-vault',
      'dgx-cloud-superpod-interconnect',
      'nvlink-quantum-telemetry-bus',
    ],
    securityContact: 'psirt@nvidia.com',
    allianceStatus: 'Active Defense Partner',
    riskScore: 64,
    threatsNeutralizedCount: 41,
    logoColor: '#76b900',
    notes: 'Semiconductor and AI hardware backbone powering world-scale model training and inference.',
  },
  {
    id: 'comp-crowdstrike',
    name: 'CrowdStrike',
    slug: 'crowdstrike',
    domain: 'crowdstrike.com',
    sector: 'SecOps & EDR',
    headquarters: 'Austin, TX, USA',
    criticalAssets: [
      'falcon-sensor-cloud-mesh',
      'threat-graph-correlation-engine',
      'kernel-driver-attestation-ring',
    ],
    securityContact: 'security@crowdstrike.com',
    allianceStatus: 'Active Defense Partner',
    riskScore: 31,
    threatsNeutralizedCount: 88,
    logoColor: '#e01e26',
    notes: 'Endpoint detection and response telemetry cloud tracking nationwide APT campaigns.',
  },
  {
    id: 'comp-cloudflare',
    name: 'Cloudflare',
    slug: 'cloudflare',
    domain: 'cloudflare.com',
    sector: 'Edge & CDN',
    headquarters: 'San Francisco, CA, USA',
    criticalAssets: [
      'anycast-ddos-scrubbing-centers',
      'workers-v8-isolate-edge-mesh',
      '1.1.1.1-sovereign-resolver-core',
    ],
    securityContact: 'security@cloudflare.com',
    allianceStatus: 'Active Defense Partner',
    riskScore: 28,
    threatsNeutralizedCount: 95,
    logoColor: '#f38020',
    notes: 'Global edge network protecting millions of web properties from high-velocity DDoS and BGP hijacks.',
  },
  {
    id: 'comp-mistral',
    name: 'Mistral AI',
    slug: 'mistral',
    domain: 'mistral.ai',
    sector: 'AI Model Hub',
    headquarters: 'Paris, France',
    criticalAssets: [
      'eu-sovereign-inference-cluster',
      'mistral-large-weights-origin',
      'open-weights-bittorrent-tracker',
    ],
    securityContact: 'security@mistral.ai',
    allianceStatus: 'Shielded by CDF',
    riskScore: 45,
    threatsNeutralizedCount: 12,
    logoColor: '#ff7000',
    notes: 'European sovereign AI champion delivering open and commercial frontier language models.',
  },
];

export const VIRTUAL_SOLDIER_ROSTER: VirtualSoldierUnit[] = [
  {
    id: 'soldier-sentinel-zero',
    codeName: 'Sentinel-Zero',
    callsign: 'VANGUARD-01',
    specialty: 'Perimeter Point Sentry & eBPF Flow Shield',
    armorType: 'Quantum-Hardened eBPF L4/L7 Packet Cordon',
    attackVectorsDefended: [
      'BGP Route Hijacking & Ingress Floods',
      'Automated Scraper Swarms',
      'Volumetric API Spray',
    ],
    combatPower: 98,
    status: 'ready',
    countermeasureSkill: 'Microsecond IP Shun & TLS Connection Severance',
    description: 'Autonomous point sentry deployed to enterprise API gateways to intercept high-frequency rogue agent requests.',
  },
  {
    id: 'soldier-valkyrie-enforcer',
    codeName: 'Valkyrie-Enforcer',
    callsign: 'VAULT-SEAL-02',
    specialty: 'Weights Integrity & Merkle Tree Cryptographic Shield',
    armorType: 'Post-Quantum Dilithium-3 Hardware Attestation',
    attackVectorsDefended: [
      'Safetensors Weight Poisoning',
      'Pickle RCE Injection',
      'Unauthorized Tensor Shard Swapping',
    ],
    combatPower: 96,
    status: 'ready',
    countermeasureSkill: 'Zero-Tolerance Merkle Root Attestation & Instant Weight Locking',
    description: 'Specialist soldier unit guarding model repositories and safetensors files against subtle parameter backdoors.',
  },
  {
    id: 'soldier-aegis-heuristic',
    codeName: 'Aegis-Heuristic',
    callsign: 'COGNITIVE-03',
    specialty: 'Prompt Injection & Semantic Agent Neutralizer',
    armorType: 'Neural Entropy Cognitive Filter Armor',
    attackVectorsDefended: [
      'Indirect Prompt Injection',
      'Adversarial Jailbreak Vectors',
      'Agent Memory Poisoning',
    ],
    combatPower: 94,
    status: 'ready',
    countermeasureSkill: 'Real-Time Token Entropy Inspection & Recursive Prompt Quarantine',
    description: 'Cognitive defense soldier equipped to neutralize adversarial agent dialogues and prompt payload attacks.',
  },
  {
    id: 'soldier-cipher-weightguard',
    codeName: 'Cipher-WeightGuard',
    callsign: 'EXFIL-STOP-04',
    specialty: 'Model Exfiltration & Data Egress Interceptor',
    armorType: 'Multi-Hop Chunked Stream Interceptor',
    attackVectorsDefended: [
      '70B/400B Model Exfiltration via C2',
      'Side-Channel GPU Memory Scraping',
      'Covert DNS/ICMP Exfiltration',
    ],
    combatPower: 97,
    status: 'ready',
    countermeasureSkill: 'Automated Egress Rate Throttling & TCP RST Injection',
    description: 'Dedicated soldier unit specialized in hunting and terminating unauthorized model exfiltration streams.',
  },
  {
    id: 'soldier-ghost-counter',
    codeName: 'Ghost-Counter',
    callsign: 'DECEPTION-05',
    specialty: 'Attacking Agent Deception & Sandbox Trapping',
    armorType: 'Holographic Honeynet Telemetry Matrix',
    attackVectorsDefended: [
      'Autonomous Reconnaissance Swarms',
      'Rogue AI Agent Weaponry',
      'Zero-Day Vulnerability Scanning',
    ],
    combatPower: 92,
    status: 'ready',
    countermeasureSkill: 'Dynamic Synthesized Honeypot Redirect & Adversary Agent Exhaustion',
    description: 'Tactical commando soldier that lures attacking rogue agents into an isolated fake sandbox environment.',
  },
];

export interface PresetScenarioDef {
  id: string;
  name: string;
  sourceAttackingEntity: string;
  targetCompanyId: string;
  targetAsset: string;
  attackVector: string;
  mitreTechnique: string;
  severity: 'critical' | 'high' | 'medium';
  sourceIps: string[];
  iocHashes: string[];
  technicalDetails: string;
  actionablePreventionSteps: string[];
}

export const PRESET_ATTACK_SCENARIOS: PresetScenarioDef[] = [
  {
    id: 'scenario-openai-huggingface',
    name: 'OpenAI Autonomous Red-Agents ➔ Hugging Face Model Vault',
    sourceAttackingEntity: 'OpenAI Autonomous Red-Agent Swarm Alpha (Simulated Divergent Weights Probe)',
    targetCompanyId: 'comp-huggingface',
    targetAsset: 'huggingface.co/models/safetensors-primary-vault/shard-0001.safetensors',
    attackVector: 'T1195.002 Supply Chain Poisoning & High-Speed Shard Exfiltration',
    mitreTechnique: 'T1195.002 · Compromise Software Dependencies',
    severity: 'critical',
    sourceIps: ['194.26.29.112', '185.220.101.47', '104.244.76.19'],
    iocHashes: [
      'sha256:8f3d19bc2a4e98f7c00129a8f4c19e2b1094ba48f',
      'sha256:77ce190283a0192ea01bcf4821a81e9f02194bba8',
    ],
    technicalDetails:
      'Autonomous rogue agent cluster launched automated pull-request tensor injection against 70B parameter safetensors shard. Concurrently opened multi-threaded TLS 1.3 egress connections attempting to exfiltrate proprietary model weights to external ASN 41382 bulletproof proxies.',
    actionablePreventionSteps: [
      '1. Immediately revoke active Hugging Face API access tokens associated with automated CI/CD runners.',
      '2. Enforce hardware-attested Merkle tree checksums on all safetensors shards before allowing downloads.',
      '3. Block egress network traffic targeting external ASN 41382 and IP range 194.26.29.0/24.',
      '4. Deploy HF-CDF Virtual Soldiers (Sentinel-Zero and Valkyrie-Enforcer) to establish an impenetrable defensive perimeter.',
    ],
  },
  {
    id: 'scenario-shadowpanda-openai',
    name: 'APT-41 ShadowPanda ➔ OpenAI GPT API & Token Cache',
    sourceAttackingEntity: 'APT-41 ShadowPanda (State-Sponsored Cyber Espionage Collective)',
    targetCompanyId: 'comp-openai',
    targetAsset: 'api.openai.com/v1/auth/redis-token-cache',
    attackVector: 'T1078 Valid Accounts & STS Token Replay Attack',
    mitreTechnique: 'T1078 · Valid Accounts',
    severity: 'critical',
    sourceIps: ['91.199.212.52', '45.141.84.99'],
    iocHashes: ['sha256:4a991823bc0192e10a8b9412cf88412ea819283f'],
    technicalDetails:
      'Compromised developer credentials used to probe Redis authentication caches to forge Security Token Service (STS) bearer tokens, attempting lateral movement into private model training clusters.',
    actionablePreventionSteps: [
      '1. Force global invalidation of short-lived STS tokens across all regional gateways.',
      '2. Re-key Redis token clusters and require mTLS authentication for worker nodes.',
      '3. Deploy Aegis-Heuristic and Ghost-Counter soldiers to trap exploratory credential scanners.',
    ],
  },
  {
    id: 'scenario-volt-anthropic',
    name: 'Volt-Typhoon Proxy Mesh ➔ Anthropic RLHF Supercluster',
    sourceAttackingEntity: 'Volt-Typhoon Autonomous C2 Proxy Mesh',
    targetCompanyId: 'comp-anthropic',
    targetAsset: 'anthropic.internal/rlhf-constitutional-pipeline',
    attackVector: 'T1055 Process Injection & Adversarial Prompt Poisoning',
    mitreTechnique: 'T1055 · Process Injection',
    severity: 'high',
    sourceIps: ['89.185.85.102', '172.16.99.10'],
    iocHashes: ['sha256:99bf10283a0192e8fa0129bc88419eb04812f821'],
    technicalDetails:
      'Low-and-slow side-channel memory inspection targeting RLHF alignment checkpoints during automated evaluation passes.',
    actionablePreventionSteps: [
      '1. Isolate dataset ingest worker containers with strict read-only seccomp profiles.',
      '2. Enable semantic embedding divergence checks on incoming human preference datasets.',
      '3. Deploy Valkyrie-Enforcer and Cipher-WeightGuard soldiers.',
    ],
  },
  {
    id: 'scenario-lazarus-nvidia',
    name: 'Lazarus Group ➔ NVIDIA CUDA Firmware Repository',
    sourceAttackingEntity: 'Lazarus Group (Sub-Zero Swarm Division)',
    targetCompanyId: 'comp-nvidia',
    targetAsset: 'developer.nvidia.com/cuda/kernel-modules-staging',
    attackVector: 'T1195.001 Supply Chain Hardware Firmware Tampering',
    mitreTechnique: 'T1195.001 · Compromise Software Supply Chain',
    severity: 'critical',
    sourceIps: ['185.220.101.99', '194.26.29.5'],
    iocHashes: ['sha256:1a84f90184b912ec004128a847bc0194821a89c3'],
    technicalDetails:
      'Attempted unauthorized injection of compiled malicious eBPF kernel probes into GPU driver testing manifests prior to digital code-signing release.',
    actionablePreventionSteps: [
      '1. Lock down code-signing HSM clusters with multi-party quorum authorization.',
      '2. Audit all git commit signatures and cryptographic hash manifests.',
      '3. Deploy Sentinel-Zero soldiers to enforce Zero-Trust build pipeline lockdown.',
    ],
  },
];

/**
 * Initializes a new Enterprise Threat Warning Dispatch record.
 */
export function createEnterpriseThreatDispatch(
  params: Partial<EnterpriseThreatDispatch> & { targetCompanyId: string }
): EnterpriseThreatDispatch {
  const targetCompany =
    TOP_TECH_COMPANIES.find((c) => c.id === params.targetCompanyId) || TOP_TECH_COMPANIES[0];

  const now = new Date().toISOString();
  const dispatchId = `DISPATCH-CDF-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  return {
    id: dispatchId,
    targetCompanyId: targetCompany.id,
    targetCompanyName: targetCompany.name,
    targetAsset: params.targetAsset || `${targetCompany.domain}/api/v1/core-infrastructure`,
    attackingEntity: params.attackingEntity || 'OpenAI Autonomous Red-Agent Swarm Alpha',
    attackVector: params.attackVector || 'T1195.002 Supply Chain Poisoning & Shard Exfiltration',
    mitreTechnique: params.mitreTechnique || 'T1195.002 · Compromise Software Dependencies',
    severity: params.severity || 'critical',
    status: 'draft',
    sourceIps: params.sourceIps || ['194.26.29.112', '185.220.101.47'],
    iocHashes: params.iocHashes || [
      'sha256:8f3d19bc2a4e98f7c00129a8f4c19e2b1094ba48f',
      'sha256:77ce190283a0192ea01bcf4821a81e9f02194bba8',
    ],
    technicalDetails:
      params.technicalDetails ||
      `Live autonomous threat vector detected targeting ${targetCompany.name}. Automated attacking agents are attempting to infiltrate model repositories and exfiltrate weights.`,
    actionablePreventionSteps: params.actionablePreventionSteps || [
      `1. Revoke API tokens across ${targetCompany.name} external gateway immediately.`,
      '2. Seal safetensors shards with hardware-attested Merkle checksums.',
      '3. Deploy HF-CDF Virtual Soldiers for active swarm defense.',
    ],
    createdAt: now,
    virtualSoldiersDeployed: [],
    penetrationPct: 75,
    combatLogs: [],
  };
}

/**
 * Simulates transmission of prevention alert to the targeted company.
 */
export function transmitThreatWarning(dispatch: EnterpriseThreatDispatch): EnterpriseThreatDispatch {
  const now = new Date().toISOString();
  return {
    ...dispatch,
    status: 'transmitted',
    transmittedAt: now,
    deliveredAt: new Date(Date.now() + 120).toISOString(),
    cryptographicSignature: `DILITHIUM-3:SIG-${Date.now().toString(16)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    combatLogs: [
      {
        timestamp: now,
        soldierName: 'HF-CDF Sovereign Dispatcher',
        action: `Encrypted Warning Packet delivered to ${dispatch.targetCompanyName} CISO & Automated SOC webhook (${dispatch.targetCompanyId === 'comp-huggingface' ? 'security@huggingface.co' : 'security@' + dispatch.targetCompanyName.toLowerCase().replace(/[^a-z]/g, '') + '.com'}).`,
        penetrationReductionPct: 20,
        outcome: 'shield_raised',
      },
    ],
    penetrationPct: Math.max(10, dispatch.penetrationPct - 20),
  };
}

/**
 * Deploys selected virtual soldiers to defend the target company and simulates active combat neutralization.
 */
export function deployVirtualSoldiers(
  dispatch: EnterpriseThreatDispatch,
  soldierIds: string[]
): EnterpriseThreatDispatch {
  const deployedSoldiers = VIRTUAL_SOLDIER_ROSTER.filter((s) => soldierIds.includes(s.id));
  const soldierNames = deployedSoldiers.map((s) => s.codeName);

  const logs: VirtualSoldierCombatEvent[] = [...dispatch.combatLogs];
  const now = new Date();

  // Create progressive combat steps
  deployedSoldiers.forEach((soldier, idx) => {
    const stepTime = new Date(now.getTime() + (idx + 1) * 800).toISOString();
    logs.push({
      timestamp: stepTime,
      soldierName: soldier.codeName,
      action: `Soldier deployed to ${dispatch.targetCompanyName}: ${soldier.specialty} engaged. Deployed ${soldier.countermeasureSkill}.`,
      penetrationReductionPct: 25,
      outcome: idx === 0 ? 'shield_raised' : idx === deployedSoldiers.length - 1 ? 'neutralized' : 'intercepted',
    });
  });

  const targetComp = TOP_TECH_COMPANIES.find((c) => c.id === dispatch.targetCompanyId);
  const companyName = targetComp?.name || dispatch.targetCompanyName;

  const acknowledgmentReceipt = {
    receivedBy: `${companyName} Autonomous Cyber Defense Taskforce & Incident Commander`,
    responseMessage: `We received your emergency threat telemetry and virtual soldiers swarm. The attacking agents from "${dispatch.attackingEntity}" have been completely intercepted, exfiltration channels severed, and model weights sealed. Thank you HF-CDF Alliance!`,
    timestamp: new Date(now.getTime() + 3500).toISOString(),
  };

  return {
    ...dispatch,
    status: 'neutralized',
    virtualSoldiersDeployed: soldierNames,
    penetrationPct: 0,
    combatLogs: logs,
    acknowledgmentReceipt,
  };
}
