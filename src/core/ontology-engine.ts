import {
  Agent,
  AipQueryResult,
  AipRecommendedAction,
  DataPipelineStatus,
  FusionEvent,
  Incident,
  IndicatorOfCompromise,
  LiveKevEntry,
  NetworkNode,
  OntologyEdge,
  OntologyGraphData,
  OntologyNode,
  OntologyObjectType,
  SecurityEvent,
  SeverityLevel,
  SharedIntelMemory,
} from './types';

export interface RawCisaKevRecord {
  cveID: string;
  vendorProject?: string;
  product?: string;
  vulnerabilityName?: string;
  dateAdded?: string;
  shortDescription?: string;
  requiredAction?: string;
  dueDate?: string;
  knownRansomwareCampaignUse?: string;
}

export const CURATED_KEV_BASELINE: RawCisaKevRecord[] = [
  {
    cveID: 'CVE-2026-21849',
    vendorProject: 'PyPI / Torch Ecosystem',
    product: 'PyTorch Safetensors Inference Runtime',
    vulnerabilityName: 'Deserialization & Ephemeral Token Escalation in Inference Workers',
    dateAdded: '2026-11-02',
    shortDescription:
      'Allows remote code execution and ephemeral STS credential extraction on GPU inference clusters.',
    requiredAction: 'Apply vendor patch, isolate inference egress, and rotate STS tokens.',
    dueDate: '2026-11-16',
    knownRansomwareCampaignUse: 'Known',
  },
  {
    cveID: 'CVE-2024-21626',
    vendorProject: 'OpenContainers',
    product: 'runc / Kubernetes Container Runtime',
    vulnerabilityName: 'Container Breakout via Leaked File Descriptor',
    dateAdded: '2024-02-05',
    shortDescription:
      'Internal file descriptor leak in runc enables host filesystem escape from Kubernetes pods.',
    requiredAction: 'Upgrade runc >= 1.1.12 and enforce AppArmor/eBPF pod isolation.',
    dueDate: '2024-02-26',
    knownRansomwareCampaignUse: 'Known',
  },
  {
    cveID: 'CVE-2024-3094',
    vendorProject: 'XZ / OpenSSH Stack',
    product: 'liblzma / SSHD Supply Chain Backdoor',
    vulnerabilityName: 'Malicious Upstream Build Injection Affecting Linux Ingress Gateways',
    dateAdded: '2024-04-01',
    shortDescription:
      'Supply-chain backdoor intercepting RSA public key authentication inside OpenSSH.',
    requiredAction: 'Pin verified xz-utils >= 5.6.2 and audit SSH ingress keys.',
    dueDate: '2024-04-15',
    knownRansomwareCampaignUse: 'Unknown',
  },
  {
    cveID: 'CVE-2024-6387',
    vendorProject: 'OpenBSD',
    product: 'OpenSSH Server (regreSSHion)',
    vulnerabilityName: 'Unauthenticated Remote Code Execution in OpenSSH Signal Handler',
    dateAdded: '2024-07-02',
    shortDescription:
      'Race condition in sshd signal handler allows unauthenticated root RCE on glibc Linux nodes.',
    requiredAction: 'Upgrade OpenSSH >= 9.8p1 and restrict bastion SSH exposure.',
    dueDate: '2024-07-23',
    knownRansomwareCampaignUse: 'Unknown',
  },
  {
    cveID: 'CVE-2024-3400',
    vendorProject: 'Palo Alto Networks / Edge',
    product: 'PAN-OS GlobalProtect Gateway',
    vulnerabilityName: 'Command Injection in Edge Firewall Telemetry Agent',
    dateAdded: '2024-04-12',
    shortDescription:
      'Unauthenticated root command injection on internet-facing edge gateways.',
    requiredAction: 'Apply hotfix, enable Threat Prevention signatures, and inspect DMZ logs.',
    dueDate: '2024-04-19',
    knownRansomwareCampaignUse: 'Known',
  },
  {
    cveID: 'CVE-2025-24813',
    vendorProject: 'Apache Software Foundation',
    product: 'Apache Tomcat / Java Enterprise Gateway',
    vulnerabilityName: 'Partial PUT Deserialization Remote Code Execution',
    dateAdded: '2025-04-01',
    shortDescription:
      'Allows arbitrary code execution via crafted session persistence requests on web tiers.',
    requiredAction: 'Upgrade Tomcat and disable write-enabled default servlet.',
    dueDate: '2025-04-22',
    knownRansomwareCampaignUse: 'Known',
  },
];

interface MonitoredEnterpriseProfile {
  id: string;
  name: string;
  sector: string;
  location: string;
  assetValue: string;
  status: string;
  stackKeywords: string[];
}

export const MONITORED_ORGANIZATIONS: MonitoredEnterpriseProfile[] = [
  {
    id: 'org-apple',
    name: 'Apple Inc. (Cupertino AI & Silicon Core)',
    sector: 'Fortune 500 Tech',
    location: 'Cupertino, CA',
    assetValue: '$3.4T Protected IP & Enclave',
    status: 'nominal',
    stackKeywords: ['apple', 'ios', 'macos', 'safari', 'webkit', 'kubernetes', 'openssl', 'ssh'],
  },
  {
    id: 'org-microsoft',
    name: 'Microsoft Corp. (Azure Frontier Cluster)',
    sector: 'Fortune 500 Cloud',
    location: 'Redmond, WA',
    assetValue: '$3.1T Sovereign Cloud',
    status: 'nominal',
    stackKeywords: ['microsoft', 'windows', 'azure', 'exchange', 'iis', 'kubernetes', 'linux'],
  },
  {
    id: 'org-google',
    name: 'Alphabet / Google DeepMind Core',
    sector: 'Fortune 500 AI',
    location: 'Mountain View, CA',
    assetValue: '$2.1T TPU & Research Mesh',
    status: 'nominal',
    stackKeywords: ['google', 'chrome', 'chromium', 'android', 'kubernetes', 'runc', 'linux'],
  },
  {
    id: 'org-amazon',
    name: 'Amazon AWS Nitro Sovereign Backbone',
    sector: 'Fortune 500 Cloud',
    location: 'Seattle, WA',
    assetValue: '$2.0T Nitro Enclave Grid',
    status: 'nominal',
    stackKeywords: ['amazon', 'aws', 'linux', 'xen', 'runc', 'openssh', 'pytorch', 'redis'],
  },
  {
    id: 'org-nvidia',
    name: 'NVIDIA Corp. (Blackwell DGX Foundry)',
    sector: 'Fortune 500 Semiconductors',
    location: 'Santa Clara, CA',
    assetValue: '$3.2T GPU & CUDA Architecture',
    status: 'under_attack',
    stackKeywords: ['nvidia', 'cuda', 'pytorch', 'safetensors', 'gpu', 'linux', 'runc'],
  },
  {
    id: 'org-jpmorgan',
    name: 'JPMorgan Chase & SWIFT Clearing Hub',
    sector: 'Banking & Financial Core',
    location: 'New York, NY',
    assetValue: '$5.8T Daily Settlement Shield',
    status: 'mitigating',
    stackKeywords: ['apache', 'tomcat', 'java', 'oracle', 'cisco', 'palo alto', 'pan-os', 'fortinet', 'ivanti'],
  },
];

export const SOVEREIGN_DOMAIN_FEEDS = [
  {
    id: 'dom-orbital-kh14',
    label: 'LEO Orbital QKD & KH-14 Laser Grid',
    domain: 'Orbital' as const,
    status: 'nominal',
    severity: 'medium' as SeverityLevel,
    riskScore: 34,
    summary: '48 low-earth orbit optical relay satellites maintaining quantum key distribution across Ashburn, Frankfurt, and Tokyo.',
    linkedAssetId: 'gateway-edge-01',
  },
  {
    id: 'dom-subsea-dwdm',
    label: 'Transatlantic Subsea DWDM Trunk (Dover)',
    domain: 'Subsea' as const,
    status: 'nominal',
    severity: 'medium' as SeverityLevel,
    riskScore: 41,
    summary: '32 Tbps armored dark-fiber landing monitored by acoustic and QBER optical tamper sensors.',
    linkedAssetId: 'ingress-k8s-proxy',
  },
  {
    id: 'dom-swift-clearing',
    label: 'Global SWIFT / Fedwire Clearing Shield',
    domain: 'Financial' as const,
    status: 'mitigating',
    severity: 'high' as SeverityLevel,
    riskScore: 76,
    summary: 'High-velocity interbank clearing guard intercepting synthetic AI wire anomalies at 14.2ms latency.',
    linkedAssetId: 'org-jpmorgan',
  },
  {
    id: 'dom-weights-vault',
    label: '70B/400B Safetensors Merkle Enclave',
    domain: 'Infrastructure' as const,
    status: 'critical_watch',
    severity: 'critical' as SeverityLevel,
    riskScore: 91,
    summary: 'Air-gap ready AMD SEV-SNP enclave storing frontier model weights targeted by active APT-41 exfiltration.',
    linkedAssetId: 's3-safetensors-primary-vault',
  },
];

function computeKevAssetMatches(
  kev: RawCisaKevRecord,
  networkNodes: NetworkNode[]
): { matchedIds: string[]; riskScore: number } {
  const haystack = `${kev.vendorProject || ''} ${kev.product || ''} ${kev.vulnerabilityName || ''} ${kev.shortDescription || ''}`.toLowerCase();
  const matchedIds: string[] = [];

  for (const org of MONITORED_ORGANIZATIONS) {
    if (org.stackKeywords.some((kw) => haystack.includes(kw))) {
      matchedIds.push(org.id);
    }
  }

  for (const node of networkNodes) {
    const nodeText = `${node.name} ${node.zone} ${node.id}`.toLowerCase();
    if (
      (haystack.includes('kubernetes') || haystack.includes('runc') || haystack.includes('container')) &&
      (nodeText.includes('k8s') || nodeText.includes('ingress') || nodeText.includes('inference'))
    ) {
      matchedIds.push(node.id);
    } else if (
      (haystack.includes('pytorch') || haystack.includes('safetensors') || haystack.includes('gpu')) &&
      (nodeText.includes('inference') || nodeText.includes('safetensors'))
    ) {
      matchedIds.push(node.id);
    } else if (
      (haystack.includes('openssh') || haystack.includes('palo alto') || haystack.includes('gateway') || haystack.includes('firewall')) &&
      (nodeText.includes('gateway') || nodeText.includes('dmz'))
    ) {
      matchedIds.push(node.id);
    } else if (
      (haystack.includes('redis') || haystack.includes('tomcat') || haystack.includes('apache')) &&
      (nodeText.includes('redis') || nodeText.includes('ingest'))
    ) {
      matchedIds.push(node.id);
    }
  }

  const deduped = Array.from(new Set(matchedIds));
  const ransomwareBoost = (kev.knownRansomwareCampaignUse || '').toLowerCase() === 'known' ? 18 : 0;
  const matchBoost = Math.min(25, deduped.length * 8);
  const riskScore = Math.min(99, 55 + ransomwareBoost + matchBoost);

  return { matchedIds: deduped, riskScore };
}

export function correlateKevWithAssets(
  rawKevs: RawCisaKevRecord[],
  networkNodes: NetworkNode[]
): LiveKevEntry[] {
  return rawKevs
    .filter((k) => Boolean(k?.cveID))
    .map((kev) => {
      const { matchedIds, riskScore } = computeKevAssetMatches(kev, networkNodes);
      return {
        cveID: kev.cveID,
        vendorProject: kev.vendorProject || 'Unknown Vendor',
        product: kev.product || 'Enterprise Component',
        vulnerabilityName: kev.vulnerabilityName || kev.cveID,
        dateAdded: kev.dateAdded || new Date().toISOString().split('T')[0],
        shortDescription: kev.shortDescription || 'Known exploited vulnerability reported in CISA KEV catalog.',
        requiredAction: kev.requiredAction || 'Apply vendor mitigation immediately.',
        dueDate: kev.dueDate || 'Immediate',
        knownRansomwareCampaignUse: kev.knownRansomwareCampaignUse || 'Unknown',
        correlatedAssets: matchedIds,
        riskScore,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}

export function buildUnifiedOntology(params: {
  agents: Agent[];
  incidents: Incident[];
  events: SecurityEvent[];
  iocs: IndicatorOfCompromise[];
  networkNodes: NetworkNode[];
  sharedMemories: SharedIntelMemory[];
  kevEntries: LiveKevEntry[];
  pipelines?: DataPipelineStatus[];
}): OntologyGraphData {
  const {
    agents,
    incidents,
    events,
    iocs,
    networkNodes,
    sharedMemories,
    kevEntries,
    pipelines = [],
  } = params;

  const nodesMap = new Map<string, OntologyNode>();
  const edges: OntologyEdge[] = [];
  const edgeKeys = new Set<string>();

  const addNode = (node: OntologyNode) => {
    if (!nodesMap.has(node.id)) {
      nodesMap.set(node.id, node);
    }
  };

  const addEdge = (source: string, target: string, relationship: string, confidence = 95) => {
    if (!nodesMap.has(source) || !nodesMap.has(target) || source === target) return;
    const key = `${source}->${relationship}->${target}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({
      id: `edge-${edges.length + 1}`,
      source,
      target,
      relationship,
      confidence,
    });
  };

  // 1. Sovereign & Fortune 500 Organizations
  for (const org of MONITORED_ORGANIZATIONS) {
    const isAttacked = org.status === 'under_attack';
    const isMitigating = org.status === 'mitigating';
    addNode({
      id: org.id,
      label: org.name,
      objectType: 'organization',
      status: org.status,
      severity: isAttacked ? 'critical' : isMitigating ? 'high' : 'low',
      riskScore: isAttacked ? 92 : isMitigating ? 74 : 24,
      domain: org.sector.includes('Financial') ? 'Financial' : 'Infrastructure',
      summary: `${org.sector} · ${org.location} · ${org.assetValue}`,
      metadata: {
        sector: org.sector,
        location: org.location,
        assetValue: org.assetValue,
      },
    });
  }

  // 2. Network Infrastructure Assets
  for (const net of networkNodes) {
    const riskScore =
      net.status === 'compromised'
        ? 95
        : net.status === 'warning'
        ? 72
        : net.status === 'isolated'
        ? 45
        : 22;
    addNode({
      id: net.id,
      label: net.name,
      objectType: 'asset',
      status: net.status,
      severity: net.status === 'compromised' ? 'critical' : net.status === 'warning' ? 'high' : 'low',
      riskScore,
      domain: 'Infrastructure',
      summary: `IP ${net.ip} · Zone ${net.zone} · Open Ports: ${net.openPorts.join(', ')}`,
      metadata: {
        ip: net.ip,
        zone: net.zone,
        vulnerabilitiesCount: net.vulnerabilitiesCount,
        agentAssigned: net.agentAssigned || 'Unassigned',
      },
    });
  }

  // 3. Autonomous AI Agents
  for (const agent of agents) {
    addNode({
      id: agent.id,
      label: agent.name,
      objectType: 'agent',
      status: agent.status,
      severity: agent.status === 'investigating' ? 'medium' : 'info',
      riskScore: Math.max(10, 100 - agent.health),
      domain: 'AI Swarm',
      summary: `${agent.role} (${agent.modelEngine}) · Precision ${agent.precisionRate}%`,
      metadata: {
        codeName: agent.codeName,
        role: agent.role,
        health: agent.health,
        precisionRate: agent.precisionRate,
        sector: agent.sector || 'Global Swarm',
      },
    });
  }

  // 4. Incidents
  for (const inc of incidents) {
    const isResolved = inc.state === 'contained' || inc.state === 'resolved' || inc.state === 'closed';
    const riskScore =
      isResolved ? 30 : inc.severity === 'critical' ? 96 : inc.severity === 'high' ? 82 : 55;
    addNode({
      id: inc.id,
      label: `${inc.id}: ${inc.title}`,
      objectType: 'incident',
      status: inc.state,
      severity: inc.severity,
      riskScore,
      domain: 'Cyber',
      summary: inc.summary,
      metadata: {
        mitreTactics: inc.mitreTactics,
        containmentActionProposed: inc.containmentActionProposed || 'REVIEW_REQUIRED',
        affectedAssets: inc.affectedAssets,
      },
    });
  }

  // 5. Indicators of Compromise & Threat Actors
  const actorsCreated = new Set<string>();
  for (const ioc of iocs) {
    const iocId = ioc.id;
    addNode({
      id: iocId,
      label: `${ioc.type.toUpperCase()}: ${ioc.value.slice(0, 36)}`,
      objectType: 'ioc',
      status: ioc.activeBlock ? 'blocked' : 'unblocked',
      severity: ioc.activeBlock ? 'medium' : 'high',
      riskScore: ioc.activeBlock ? Math.max(25, ioc.confidenceScore - 40) : ioc.confidenceScore,
      domain: 'Threat Intel',
      summary: `Source: ${ioc.source} · Confidence: ${ioc.confidenceScore}% · Actor: ${ioc.threatActor || 'Unattributed'}`,
      metadata: {
        iocType: ioc.type,
        value: ioc.value,
        activeBlock: ioc.activeBlock,
        source: ioc.source,
      },
    });

    if (ioc.threatActor && !ioc.threatActor.toLowerCase().includes('unknown')) {
      const actorId = `actor-${ioc.threatActor.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28)}`;
      if (!actorsCreated.has(actorId)) {
        actorsCreated.add(actorId);
        addNode({
          id: actorId,
          label: ioc.threatActor,
          objectType: 'threat_actor',
          status: 'active_campaign',
          severity: ioc.threatActor.includes('APT-41') ? 'critical' : 'high',
          riskScore: ioc.threatActor.includes('APT-41') ? 94 : 80,
          domain: 'Threat Intel',
          summary: `Adversary cluster tracked across STIX/TAXII and internal telemetry.`,
          metadata: { attribution: ioc.threatActor },
        });
      }
      addEdge(actorId, iocId, 'operates_indicator', ioc.confidenceScore);
    }
  }

  // 6. CISA KEV Vulnerabilities
  for (const kev of kevEntries) {
    const kevId = `kev-${kev.cveID}`;
    addNode({
      id: kevId,
      label: `${kev.cveID} (${kev.vendorProject})`,
      objectType: 'vulnerability',
      status: kev.knownRansomwareCampaignUse === 'Known' ? 'ransomware_active' : 'kev_cataloged',
      severity: kev.riskScore >= 80 ? 'critical' : kev.riskScore >= 65 ? 'high' : 'medium',
      riskScore: kev.riskScore,
      domain: 'Threat Intel',
      summary: `${kev.vulnerabilityName} — ${kev.shortDescription}`,
      metadata: {
        cveID: kev.cveID,
        product: kev.product,
        dueDate: kev.dueDate,
        requiredAction: kev.requiredAction,
        ransomwareUse: kev.knownRansomwareCampaignUse,
      },
    });
  }

  // 7. Sovereign Domain Feeds (Orbital, Subsea, SWIFT, Vault)
  for (const dom of SOVEREIGN_DOMAIN_FEEDS) {
    addNode({
      id: dom.id,
      label: dom.label,
      objectType: 'domain_feed',
      status: dom.status,
      severity: dom.severity,
      riskScore: dom.riskScore,
      domain: dom.domain,
      summary: dom.summary,
      metadata: { domain: dom.domain },
    });
  }

  // 8. Autonomous Self-Learning Rules (SharedIntelMemory)
  for (const mem of sharedMemories.slice(0, 10)) {
    addNode({
      id: mem.id,
      label: `Rule: ${mem.topic}`,
      objectType: 'learning_rule',
      status: mem.verifiedByHuman ? 'verified_policy' : 'autonomous_learned',
      severity: 'info',
      riskScore: Math.max(10, 100 - mem.confidence),
      domain: 'AI Swarm',
      summary: mem.observation,
      metadata: {
        originAgentId: mem.originAgentId,
        confidence: mem.confidence,
        tags: mem.tags,
      },
    });
  }

  // --- Wire Cross-Domain Relationships ---
  for (const net of networkNodes) {
    for (const targetId of net.connections) {
      addEdge(net.id, targetId, 'connects_to', 98);
    }
    const assignedAgent = agents.find((a) => a.name === net.agentAssigned);
    if (assignedAgent) {
      addEdge(assignedAgent.id, net.id, 'defends', 96);
    }
  }

  // Link cluster-inference-01 to NVIDIA & Supercluster context
  addEdge('org-nvidia', 'cluster-inference-01', 'hosts_cluster', 90);
  addEdge('org-apple', 'gateway-edge-01', 'protected_by', 88);
  addEdge('org-amazon', 's3-safetensors-primary-vault', 'enclave_hosts', 92);

  for (const inc of incidents) {
    for (const assetId of inc.affectedAssets) {
      addEdge(inc.id, assetId, 'impacts_asset', 97);
    }
    for (const agentId of inc.assignedAgents) {
      addEdge(agentId, inc.id, 'investigates', 95);
    }
  }

  for (const kev of kevEntries) {
    const kevId = `kev-${kev.cveID}`;
    for (const assetId of kev.correlatedAssets) {
      addEdge(kevId, assetId, 'exposes_asset', kev.riskScore);
    }
  }

  for (const dom of SOVEREIGN_DOMAIN_FEEDS) {
    addEdge(dom.id, dom.linkedAssetId, 'correlates_with', 91);
  }

  for (const mem of sharedMemories.slice(0, 10)) {
    addEdge(mem.originAgentId, mem.id, 'learned_memory', mem.confidence);
    if (mem.tags.includes('exfiltration') || mem.tags.includes('tls') || mem.tags.includes('ebpf')) {
      addEdge(mem.id, 'INC-2026-084', 'informs_defense', mem.confidence);
    }
  }

  // Link APT-41 to INC-2026-084 and CVE-2026-21849 if present
  addEdge('actor-apt-41-shadowpanda-', 'INC-2026-084', 'attributed_to', 94);
  addEdge('actor-apt-41-shadowpanda-', 'kev-CVE-2026-21849', 'exploits', 94);

  // Compute degree centrality
  const degreeCounts = new Map<string, number>();
  for (const e of edges) {
    degreeCounts.set(e.source, (degreeCounts.get(e.source) || 0) + 1);
    degreeCounts.set(e.target, (degreeCounts.get(e.target) || 0) + 1);
  }

  const nodes = Array.from(nodesMap.values()).map((n) => ({
    ...n,
    degree: degreeCounts.get(n.id) || 0,
  }));

  // Build Unified Cross-Domain Fusion Timeline
  const fusionTimeline: FusionEvent[] = [
    ...incidents.map((inc) => ({
      id: `fus-inc-${inc.id}`,
      timestamp: inc.updatedAt || inc.detectedAt,
      domain: 'Cyber' as const,
      severity: inc.severity,
      title: `${inc.id} (${inc.state.toUpperCase()}): ${inc.title}`,
      description: inc.summary,
      linkedEntityIds: [inc.id, ...inc.affectedAssets, ...inc.assignedAgents],
      recommendedAction: inc.containmentActionProposed,
    })),
    ...kevEntries.slice(0, 6).map((kev) => ({
      id: `fus-kev-${kev.cveID}`,
      timestamp: `${kev.dateAdded}T12:00:00Z`,
      domain: 'CISA KEV' as const,
      severity: (kev.riskScore >= 80 ? 'critical' : 'high') as SeverityLevel,
      title: `${kev.cveID} · ${kev.vendorProject} (${kev.product})`,
      description: `${kev.shortDescription} Action: ${kev.requiredAction}`,
      linkedEntityIds: [`kev-${kev.cveID}`, ...kev.correlatedAssets],
      recommendedAction: kev.requiredAction,
    })),
    ...events.slice(0, 4).map((evt) => ({
      id: `fus-evt-${evt.id}`,
      timestamp: evt.timestamp,
      domain: 'Cyber' as const,
      severity: evt.severity,
      title: `${evt.signature} (${evt.source} → ${evt.destination})`,
      description: `Action taken: ${evt.actionTaken}${evt.mitreTechniqueId ? ` · MITRE ${evt.mitreTechniqueId}` : ''}`,
      linkedEntityIds: ['cluster-inference-01', 'gateway-edge-01'],
    })),
    ...sharedMemories.slice(0, 3).map((mem) => ({
      id: `fus-mem-${mem.id}`,
      timestamp: mem.timestamp,
      domain: 'AI Learning' as const,
      severity: 'info' as SeverityLevel,
      title: `Self-Learned Defense Rule: ${mem.topic}`,
      description: mem.observation,
      linkedEntityIds: [mem.id, mem.originAgentId],
    })),
    {
      id: 'fus-dom-swift',
      timestamp: new Date().toISOString(),
      domain: 'Financial' as const,
      severity: 'high' as SeverityLevel,
      title: 'SWIFT Alliance Gateway Velocity Guard Active',
      description: 'Monitoring $5.8T daily clearing rail; correlating JPMorgan edge posture with CISA edge CVEs.',
      linkedEntityIds: ['dom-swift-clearing', 'org-jpmorgan'],
    },
    {
      id: 'fus-dom-orbital',
      timestamp: new Date().toISOString(),
      domain: 'Orbital' as const,
      severity: 'info' as SeverityLevel,
      title: 'LEO QKD Key Rotation Synchronized (QBER 0.72%)',
      description: 'Optical satellite downlinks and Dover subsea DWDM trunks verified tamper-free.',
      linkedEntityIds: ['dom-orbital-kh14', 'dom-subsea-dwdm'],
    },
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const stats = {
    totalObjects: nodes.length,
    totalRelationships: edges.length,
    criticalRiskObjects: nodes.filter((n) => n.riskScore >= 80).length,
    kevMatchedCount: kevEntries.filter((k) => k.correlatedAssets.length > 0).length,
    selfLearnedRulesCount: sharedMemories.length,
    lastSyncAt: new Date().toISOString(),
  };

  return {
    nodes,
    edges,
    pipelines,
    kevEntries,
    fusionTimeline,
    stats,
  };
}

export function queryOntology(
  graph: OntologyGraphData,
  options: {
    query?: string;
    objectTypes?: OntologyObjectType[];
    severities?: SeverityLevel[];
    maxHopFromId?: string;
  }
): { nodes: OntologyNode[]; edges: OntologyEdge[] } {
  const { query = '', objectTypes, severities, maxHopFromId } = options;
  const q = query.trim().toLowerCase();

  let candidateNodes = graph.nodes;

  if (maxHopFromId) {
    const neighborIds = new Set<string>([maxHopFromId]);
    for (const edge of graph.edges) {
      if (edge.source === maxHopFromId) neighborIds.add(edge.target);
      if (edge.target === maxHopFromId) neighborIds.add(edge.source);
    }
    candidateNodes = candidateNodes.filter((n) => neighborIds.has(n.id));
  }

  if (objectTypes && objectTypes.length > 0) {
    const typeSet = new Set(objectTypes);
    candidateNodes = candidateNodes.filter((n) => typeSet.has(n.objectType));
  }

  if (severities && severities.length > 0) {
    const sevSet = new Set(severities);
    candidateNodes = candidateNodes.filter((n) => sevSet.has(n.severity));
  }

  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    candidateNodes = candidateNodes.filter((n) => {
      const text = `${n.id} ${n.label} ${n.objectType} ${n.domain} ${n.summary} ${n.status}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    });
  }

  const allowedIds = new Set(candidateNodes.map((n) => n.id));
  const filteredEdges = graph.edges.filter((e) => allowedIds.has(e.source) && allowedIds.has(e.target));

  return {
    nodes: candidateNodes,
    edges: filteredEdges,
  };
}

export function deterministicAipReasoner(
  graph: OntologyGraphData,
  query: string,
  selectedEntityId?: string
): AipQueryResult {
  const q = query.trim().toLowerCase();
  const matchedNodes = queryOntology(graph, { query }).nodes;
  const topNodes =
    matchedNodes.length > 0
      ? matchedNodes.slice(0, 6)
      : [...graph.nodes].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

  const selectedNode = selectedEntityId
    ? graph.nodes.find((n) => n.id === selectedEntityId)
    : undefined;

  const citedEntityIds = Array.from(
    new Set([
      ...(selectedNode ? [selectedNode.id] : []),
      ...topNodes.map((n) => n.id),
    ])
  ).slice(0, 6);

  const recommendedActions: AipRecommendedAction[] = [];

  // Propose deterministic actions based on matching high-risk objects in the graph
  const activeIncident = graph.nodes.find(
    (n) =>
      n.objectType === 'incident' &&
      n.status !== 'contained' &&
      n.status !== 'resolved' &&
      (q.includes('contain') || q.includes('apt') || q.includes('exfil') || q.includes('incident') || n.severity === 'critical')
  );
  if (activeIncident) {
    recommendedActions.push({
      actionType: 'contain_incident',
      targetId: activeIncident.id,
      label: `Contain ${activeIncident.id}`,
      rationale: `Executes human-approved microsegmentation and token revocation for ${activeIncident.label}.`,
    });
  }

  const compromisedAsset = graph.nodes.find(
    (n) => n.objectType === 'asset' && (n.status === 'compromised' || n.status === 'warning')
  );
  if (compromisedAsset) {
    recommendedActions.push({
      actionType: 'isolate_node',
      targetId: compromisedAsset.id,
      label: `Isolate ${compromisedAsset.id}`,
      rationale: `Quarantines ${compromisedAsset.label} from lateral east-west cluster traffic.`,
    });
  }

  const unblockedIoc = graph.nodes.find(
    (n) => n.objectType === 'ioc' && n.status === 'unblocked'
  );
  if (unblockedIoc) {
    recommendedActions.push({
      actionType: 'block_ioc',
      targetId: unblockedIoc.id,
      label: `Block ${unblockedIoc.label}`,
      rationale: `Enforces edge firewall drop rule for unblocked indicator ${unblockedIoc.id}.`,
    });
  }

  if (recommendedActions.length === 0) {
    recommendedActions.push({
      actionType: 'synthesize_learning',
      targetId: selectedEntityId || topNodes[0]?.id || 'INC-2026-084',
      label: 'Commit Investigation to Swarm Memory',
      rationale: 'Stores the correlated cross-domain findings so autonomous agents apply them continuously.',
    });
  }

  const kevSummary =
    graph.kevEntries.length > 0
      ? `Cross-referencing ${graph.kevEntries.length} live CISA KEV advisories (${graph.stats.kevMatchedCount} directly matched to monitored stack assets).`
      : '';

  const targetSummary = topNodes
    .map((n) => `• [${n.objectType.toUpperCase()}] ${n.label} (Risk ${n.riskScore}/100, State: ${n.status})`)
    .join('\n');

  const answer = [
    `HF-CDF Unified Ontology Reasoning for: "${query}"`,
    selectedNode
      ? `Focused Object: ${selectedNode.label} (${selectedNode.domain} · Risk ${selectedNode.riskScore}/100).`
      : `Analyzed ${graph.stats.totalObjects} ontology objects across ${graph.stats.totalRelationships} cross-domain links.`,
    kevSummary,
    `Primary Correlated Entities:\n${targetSummary}`,
    `Autonomous Recommendation: Execute ${recommendedActions[0].label} to reduce blast radius across linked organizations and infrastructure.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const learnedRule = {
    topic: `AIP Correlation: ${query.slice(0, 48)}`,
    observation: `Correlated ${citedEntityIds.join(', ')} across unified ontology. Recommended control: ${recommendedActions[0].label}.`,
    tags: ['aip-ontology', 'self-learning', 'cross-domain'],
  };

  return {
    query,
    source: 'ontology-inference-engine',
    answer,
    confidence: 93,
    citedEntityIds,
    recommendedActions,
    learnedRule,
    generatedAt: new Date().toISOString(),
  };
}

let synthMemSeq = 0;

export function synthesizeSelfLearningMemory(
  topic: string,
  observation: string,
  tags: string[],
  originAgentId = 'agent-cortex'
): SharedIntelMemory {
  synthMemSeq += 1;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 72 * 3600 * 1000);
  return {
    id: `mem-${Date.now()}-${synthMemSeq}`,
    originAgentId,
    topic,
    observation,
    confidence: 95,
    timestamp: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    tags: Array.from(new Set(['self-learned', ...tags])),
    verifiedByHuman: true,
  };
}
