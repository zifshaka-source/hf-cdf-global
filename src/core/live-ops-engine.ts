import {
  Agent,
  AutonomousAiActivity,
  IndicatorOfCompromise,
  LiveAttackActionLog,
  LiveAttackPhase,
  LiveNewsItem,
  LiveOngoingAttack,
  NetworkNode,
  NewsCategory,
  OperationalChallenge,
  SeverityLevel,
} from './types';

let liveOpsIdSeq = 0;
function nextLiveOpsId(prefix: string): string {
  liveOpsIdSeq += 1;
  return `${prefix}-${Date.now()}-${liveOpsIdSeq}`;
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTagValue(block: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(regex);
  return match ? decodeXmlEntities(match[1]) : '';
}

function extractLinkHref(block: string): string {
  const direct = extractTagValue(block, 'link');
  if (direct && direct.startsWith('http')) return direct;
  const atomHref = block.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (atomHref?.[1]) return atomHref[1].trim();
  const guid = extractTagValue(block, 'guid');
  if (guid && guid.startsWith('http')) return guid;
  return '';
}

export function extractCveIds(text: string): string[] {
  const matches = text.match(/\bCVE-\d{4}-\d{4,7}\b/gi) || [];
  return Array.from(new Set(matches.map((c) => c.toUpperCase())));
}

export function classifyNewsCategoryAndSeverity(
  title: string,
  summary: string,
  fallbackCategory: NewsCategory = 'Cyber Attacks'
): { category: NewsCategory; severity: SeverityLevel; tags: string[] } {
  const hay = `${title} ${summary}`.toLowerCase();
  const tags: string[] = [];

  if (hay.includes('zero-day') || hay.includes('0-day') || hay.includes('cve-')) {
    tags.push('zero-day');
  }
  if (hay.includes('ransomware') || hay.includes('extortion')) tags.push('ransomware');
  if (hay.includes('ai') || hay.includes('llm') || hay.includes('gpu') || hay.includes('model')) {
    tags.push('ai-security');
  }
  if (hay.includes('apt') || hay.includes('state-sponsored') || hay.includes('espionage')) {
    tags.push('apt');
  }
  if (hay.includes('cisa') || hay.includes('advisory') || hay.includes('kev')) {
    tags.push('cisa');
  }
  if (hay.includes('critical infrastructure') || hay.includes('scada') || hay.includes('grid') || hay.includes('swift') || hay.includes('subsea')) {
    tags.push('critical-infra');
  }

  let category: NewsCategory = fallbackCategory;
  if (hay.includes('zero-day') || hay.includes('0-day') || hay.includes('exploited in the wild') || hay.includes('cve-')) {
    category = 'Zero-Day & KEV';
  } else if (hay.includes('ai ') || hay.includes('llm') || hay.includes('openai') || hay.includes('nvidia') || hay.includes('hugging face') || hay.includes('model')) {
    category = 'AI Security';
  } else if (hay.includes('infrastructure') || hay.includes('energy') || hay.includes('telecom') || hay.includes('bank') || hay.includes('hospital') || hay.includes('swift')) {
    category = 'Critical Infra';
  } else if (hay.includes('advisory') || hay.includes('patch') || hay.includes('update fixes')) {
    category = 'Advisories';
  }

  let severity: SeverityLevel = 'medium';
  if (
    hay.includes('critical') ||
    hay.includes('actively exploited') ||
    hay.includes('zero-day') ||
    hay.includes('rce') ||
    hay.includes('remote code execution') ||
    hay.includes('emergency directive')
  ) {
    severity = 'critical';
  } else if (
    hay.includes('ransomware') ||
    hay.includes('breach') ||
    hay.includes('backdoor') ||
    hay.includes('apt') ||
    hay.includes('high-severity') ||
    hay.includes('exploit')
  ) {
    severity = 'high';
  }

  return { category, severity, tags: tags.length > 0 ? tags : ['threat-intel'] };
}

export function correlateNewsWithPlatform(
  item: Pick<LiveNewsItem, 'title' | 'summary' | 'cveIds' | 'severity'>,
  nodes: NetworkNode[],
  iocs: IndicatorOfCompromise[]
): { impactedAssetIds: string[]; impactScore: number; note: string } {
  const hay = `${item.title} ${item.summary} ${item.cveIds.join(' ')}`.toLowerCase();
  const impacted = new Set<string>();

  for (const node of nodes) {
    const nodeName = node.name.toLowerCase();
    if (
      (hay.includes('inference') || hay.includes('gpu') || hay.includes('nvidia') || hay.includes('ai') || hay.includes('python') || hay.includes('pytorch')) &&
      (nodeName.includes('inference') || nodeName.includes('vault') || nodeName.includes('cluster'))
    ) {
      impacted.add(node.id);
    }
    if (
      (hay.includes('gateway') || hay.includes('ingress') || hay.includes('tls') || hay.includes('vpn') || hay.includes('firewall') || hay.includes('cisco') || hay.includes('fortinet') || hay.includes('palo alto')) &&
      (node.zone === 'external_dmz' || node.zone === 'ingress_cluster')
    ) {
      impacted.add(node.id);
    }
    if (
      (hay.includes('kubernetes') || hay.includes('container') || hay.includes('linux') || hay.includes('kernel') || hay.includes('docker')) &&
      node.zone === 'app_workloads'
    ) {
      impacted.add(node.id);
    }
    if (
      (hay.includes('postgres') || hay.includes('sql') || hay.includes('database') || hay.includes('redis') || hay.includes('swift')) &&
      node.zone === 'database_tier'
    ) {
      impacted.add(node.id);
    }
  }

  for (const cve of item.cveIds) {
    if (iocs.some((i) => i.value.toUpperCase() === cve)) {
      if (nodes[0]) impacted.add(nodes[0].id);
    }
  }

  const impactedAssetIds = Array.from(impacted);
  const baseScore =
    item.severity === 'critical' ? 74 : item.severity === 'high' ? 58 : item.severity === 'medium' ? 38 : 22;
  const impactScore = Math.min(99, baseScore + impactedAssetIds.length * 9 + item.cveIds.length * 5);

  const note =
    impactedAssetIds.length > 0
      ? `Correlated against ${impactedAssetIds.length} sovereign asset(s): ${impactedAssetIds.join(', ')}. Automated telemetry rules primed.`
      : 'No direct asset signature overlap; telemetry watchlists updated for proactive anomaly sweep.';

  return { impactedAssetIds, impactScore, note };
}

export function parseRssXmlToNewsItems(
  xml: string,
  sourceName: string,
  defaultCategory: NewsCategory,
  nodes: NetworkNode[] = [],
  iocs: IndicatorOfCompromise[] = [],
  limit = 8
): LiveNewsItem[] {
  if (!xml || typeof xml !== 'string') return [];

  const itemBlocks: string[] = [];
  const rssMatches = xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi);
  for (const m of rssMatches) itemBlocks.push(m[1]);
  if (itemBlocks.length === 0) {
    const atomMatches = xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi);
    for (const m of atomMatches) itemBlocks.push(m[1]);
  }

  const results: LiveNewsItem[] = [];
  for (let idx = 0; idx < itemBlocks.length && results.length < limit; idx++) {
    const block = itemBlocks[idx];
    const title = extractTagValue(block, 'title');
    if (!title) continue;

    const rawDesc =
      extractTagValue(block, 'description') ||
      extractTagValue(block, 'summary') ||
      extractTagValue(block, 'content');
    const summary = rawDesc.length > 260 ? `${rawDesc.slice(0, 257)}...` : rawDesc || title;
    const url = extractLinkHref(block) || 'https://www.cisa.gov/news-events/cybersecurity-advisories';
    const rawDate =
      extractTagValue(block, 'pubDate') ||
      extractTagValue(block, 'published') ||
      extractTagValue(block, 'updated') ||
      extractTagValue(block, 'dc:date');

    let publishedAt = new Date().toISOString();
    if (rawDate) {
      const parsed = Date.parse(rawDate);
      if (!Number.isNaN(parsed)) publishedAt = new Date(parsed).toISOString();
    }

    const cveIds = extractCveIds(`${title} ${summary}`);
    const { category, severity, tags } = classifyNewsCategoryAndSeverity(title, summary, defaultCategory);
    const correlation = correlateNewsWithPlatform({ title, summary, cveIds, severity }, nodes, iocs);

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 28);

    results.push({
      id: `news-${sourceName.toLowerCase().replace(/[^a-z0-9]+/g, '')}-${slug || idx}`,
      title,
      summary,
      source: sourceName,
      url,
      publishedAt,
      category,
      severity,
      cveIds,
      tags,
      impactedAssetIds: correlation.impactedAssetIds,
      impactScore: correlation.impactScore,
      aiCorrelationNote: correlation.note,
      aiCorrelationSource: 'deterministic-engine',
    });
  }

  return results;
}

export function parseCisaKevToNewsItems(
  vulnerabilities: Array<{
    cveID?: string;
    vendorProject?: string;
    product?: string;
    vulnerabilityName?: string;
    dateAdded?: string;
    shortDescription?: string;
    requiredAction?: string;
    knownRansomwareCampaignUse?: string;
  }>,
  nodes: NetworkNode[] = [],
  iocs: IndicatorOfCompromise[] = [],
  limit = 6
): LiveNewsItem[] {
  if (!Array.isArray(vulnerabilities) || vulnerabilities.length === 0) return [];
  const newest = vulnerabilities.slice(-limit).reverse();

  return newest.map((v, idx) => {
    const cve = (v.cveID || `CVE-UNKNOWN-${idx}`).toUpperCase();
    const title = `${cve}: ${v.vendorProject || 'Vendor'} ${v.product || ''} — ${v.vulnerabilityName || 'Known Exploited Vulnerability'}`.trim();
    const summary = `${v.shortDescription || 'Actively exploited vulnerability added to CISA KEV.'} Action: ${v.requiredAction || 'Apply vendor mitigation immediately.'}`;
    const cveIds = [cve];
    const severity: SeverityLevel =
      String(v.knownRansomwareCampaignUse || '').toLowerCase() === 'known' ? 'critical' : 'high';
    const correlation = correlateNewsWithPlatform({ title, summary, cveIds, severity }, nodes, iocs);

    return {
      id: `news-cisakev-${cve.toLowerCase()}`,
      title,
      summary: summary.length > 260 ? `${summary.slice(0, 257)}...` : summary,
      source: 'CISA KEV Live Catalog',
      url: `https://nvd.nist.gov/vuln/detail/${cve}`,
      publishedAt: v.dateAdded ? new Date(v.dateAdded).toISOString() : new Date().toISOString(),
      category: 'Zero-Day & KEV',
      severity,
      cveIds,
      tags: ['cisa-kev', 'exploited', String(v.vendorProject || 'vendor').toLowerCase()],
      impactedAssetIds: correlation.impactedAssetIds,
      impactScore: correlation.impactScore,
      aiCorrelationNote: correlation.note,
      aiCorrelationSource: 'deterministic-engine',
    };
  });
}

export interface AttackVectorTemplate {
  title: string;
  targetAssetId: string;
  targetName: string;
  targetSector: string;
  targetRegion: string;
  adversaryGroup: string;
  sourceIp: string;
  sourceCountry: string;
  attackVector: string;
  mitreTechnique: string;
  cveRef?: string;
  severity: SeverityLevel;
}

export const LIVE_ATTACK_TEMPLATES: AttackVectorTemplate[] = [
  {
    title: 'Distributed Safetensors Tensor-Stream Exfiltration Burst',
    targetAssetId: 'cluster-inference-01',
    targetName: 'Ashburn GPU Supercluster (Inference-01)',
    targetSector: 'AI Infrastructure',
    targetRegion: 'US-East (Ashburn)',
    adversaryGroup: 'APT-41 (ShadowPanda)',
    sourceIp: '194.26.29.112',
    sourceCountry: 'External ASN 41382',
    attackVector: 'Chunked TLS 1.3 Weight Exfiltration + Ephemeral STS Replay',
    mitreTechnique: 'T1041 · Exfiltration Over C2',
    cveRef: 'CVE-2026-21849',
    severity: 'critical',
  },
  {
    title: 'SWIFT ISO-20022 Clearing Message Injection Probe',
    targetAssetId: 'swift-gateway-eu',
    targetName: 'Frankfurt DE-CIX Interbank Gateway',
    targetSector: 'Financial Clearing',
    targetRegion: 'EU-Central (Frankfurt)',
    adversaryGroup: 'Lazarus Financial Unit',
    sourceIp: '185.220.101.47',
    sourceCountry: 'Bulletproof Relay NL',
    attackVector: 'HSM Signing Queue Desync & BGP Hijack Attempt',
    mitreTechnique: 'T1565 · Data Manipulation',
    cveRef: 'CVE-2024-3400',
    severity: 'critical',
  },
  {
    title: 'Orbital LEO Optical Crosslink Spoofing & Telemetry Jam',
    targetAssetId: 'orbital-kh14-mesh',
    targetName: 'Orbital KH-14 QKD Relay Mesh',
    targetSector: 'Orbital Defense',
    targetRegion: 'LEO Orbit 482km',
    adversaryGroup: 'Sandworm RF/Cyber Detachment',
    sourceIp: '91.199.212.52',
    sourceCountry: 'Ground Relay East',
    attackVector: 'QBER Photon Desynchronization + Side-Channel Key Probe',
    mitreTechnique: 'T1498 · Network Denial of Service',
    severity: 'high',
  },
  {
    title: 'Subsea Trans-Atlantic DWDM Optical Tap Signature',
    targetAssetId: 'dover-qkd-landing',
    targetName: 'Dover Trans-Atlantic Subsea Landing',
    targetSector: 'Subsea Telecom',
    targetRegion: 'North Atlantic Corridor',
    adversaryGroup: 'UNC4841 Maritime Cyber',
    sourceIp: '45.141.84.99',
    sourceCountry: 'Offshore Relay',
    attackVector: 'ROADM Control Plane Credential Spray & Optical Attenuation Spike',
    mitreTechnique: 'T1078 · Valid Accounts',
    cveRef: 'CVE-2025-21298',
    severity: 'high',
  },
  {
    title: 'Kubernetes eBPF Privilege Escalation & Container Breakout',
    targetAssetId: 'app-workloads-02',
    targetName: 'Cupertino Silicon Build & Verification Nodes',
    targetSector: 'Enterprise & Silicon',
    targetRegion: 'US-West (Cupertino)',
    adversaryGroup: 'Scattered Spider / UNC3944',
    sourceIp: '104.244.76.19',
    sourceCountry: 'Anonymous Exit Node',
    attackVector: 'ptrace Syscall Injection Targeting Inference Worker Memory',
    mitreTechnique: 'T1055 · Process Injection',
    severity: 'critical',
  },
];

export function createLiveAttackFromTemplate(
  template: AttackVectorTemplate,
  agents: Agent[],
  nowIso: string = new Date().toISOString()
): LiveOngoingAttack {
  const activeAgents = agents.filter((a) => a.status === 'active' || a.status === 'investigating');
  const assigned = activeAgents[Math.floor(Math.random() * Math.max(1, activeAgents.length))] || agents[0];

  return {
    id: nextLiveOpsId('latk'),
    title: template.title,
    targetAssetId: template.targetAssetId,
    targetName: template.targetName,
    targetSector: template.targetSector,
    targetRegion: template.targetRegion,
    adversaryGroup: template.adversaryGroup,
    sourceIp: template.sourceIp,
    sourceCountry: template.sourceCountry,
    attackVector: template.attackVector,
    mitreTechnique: template.mitreTechnique,
    cveRef: template.cveRef,
    severity: template.severity,
    phase: 'probing',
    penetrationPct: 24,
    aiShieldPct: 58,
    assignedAgentId: assigned?.id || 'agent-sentinel',
    assignedAgentName: assigned?.name || 'Sentinel-Zero',
    startedAt: nowIso,
    updatedAt: nowIso,
    logs: [
      {
        id: nextLiveOpsId('log'),
        timestamp: nowIso,
        actor: template.adversaryGroup,
        kind: 'adversary',
        message: `Initiated ${template.attackVector} from ${template.sourceIp} against ${template.targetName}.`,
        engine: 'adversary-telemetry',
      },
      {
        id: nextLiveOpsId('log'),
        timestamp: nowIso,
        actor: assigned?.name || 'Sentinel-Zero',
        kind: 'ai_detection',
        message: `Autonomous eBPF/telemetry sensor flagged ${template.mitreTechnique}; engaging perimeter counter-swarm.`,
        engine: 'autonomous-swarm',
      },
    ],
  };
}

export function advanceLiveAttackStep(
  attack: LiveOngoingAttack,
  forceCountermeasure = false,
  nowIso: string = new Date().toISOString()
): { updated: LiveOngoingAttack; activity: AutonomousAiActivity | null } {
  if (attack.phase === 'contained') {
    return { updated: attack, activity: null };
  }

  const nextLogs: LiveAttackActionLog[] = [...attack.logs];
  let phase: LiveAttackPhase = attack.phase;
  let penetrationPct = attack.penetrationPct;
  let aiShieldPct = attack.aiShieldPct;
  let activity: AutonomousAiActivity | null = null;

  if (forceCountermeasure) {
    penetrationPct = Math.max(4, penetrationPct - 28);
    aiShieldPct = Math.min(100, aiShieldPct + 26);
    phase = aiShieldPct >= 94 ? 'contained' : 'ai_intercepted';
    const msg =
      phase === 'contained'
        ? `Executed full microsegmentation on ${attack.targetAssetId}, revoked ephemeral tokens, and null-routed ${attack.sourceIp}. Attack contained.`
        : `Deployed active eBPF rate-limiter and sinkholed C2 socket ${attack.sourceIp} on ${attack.targetAssetId}.`;

    nextLogs.unshift({
      id: nextLiveOpsId('log'),
      timestamp: nowIso,
      actor: attack.assignedAgentName,
      kind: phase === 'contained' ? 'containment' : 'ai_countermeasure',
      message: msg,
      engine: 'autonomous-swarm',
    });

    activity = {
      id: nextLiveOpsId('aiact'),
      timestamp: nowIso,
      agentName: attack.assignedAgentName,
      actionType: 'COUNTERMEASURE',
      engine: 'autonomous-swarm',
      severity: phase === 'contained' ? 'info' : attack.severity,
      summary: `${attack.assignedAgentName} -> ${attack.title}: ${msg}`,
      targetRef: attack.id,
    };
  } else if (attack.phase === 'probing') {
    penetrationPct = Math.min(62, penetrationPct + 14);
    aiShieldPct = Math.min(82, aiShieldPct + 10);
    phase = 'active_exploitation';

    nextLogs.unshift({
      id: nextLiveOpsId('log'),
      timestamp: nowIso,
      actor: attack.assignedAgentName,
      kind: 'ai_detection',
      message: `Adversary escalated to ${attack.mitreTechnique} (${penetrationPct}% ingress pressure). ${attack.assignedAgentName} isolating affected socket namespace.`,
      engine: 'autonomous-swarm',
    });

    activity = {
      id: nextLiveOpsId('aiact'),
      timestamp: nowIso,
      agentName: attack.assignedAgentName,
      actionType: 'DETECTION',
      engine: 'autonomous-swarm',
      severity: attack.severity,
      summary: `Intercepted escalation on ${attack.targetName} (${attack.mitreTechnique}).`,
      targetRef: attack.id,
    };
  } else if (attack.phase === 'active_exploitation') {
    penetrationPct = Math.max(12, penetrationPct - 20);
    aiShieldPct = Math.min(92, aiShieldPct + 16);
    phase = 'ai_intercepted';

    const msg = `Autonomous swarm deployed dynamic WAF/Cilium policy blocking ${attack.sourceIp} and scrubbing poisoned traffic.`;
    nextLogs.unshift({
      id: nextLiveOpsId('log'),
      timestamp: nowIso,
      actor: attack.assignedAgentName,
      kind: 'ai_countermeasure',
      message: msg,
      engine: 'autonomous-swarm',
    });

    activity = {
      id: nextLiveOpsId('aiact'),
      timestamp: nowIso,
      agentName: attack.assignedAgentName,
      actionType: 'COUNTERMEASURE',
      engine: 'autonomous-swarm',
      severity: 'medium',
      summary: `${attack.assignedAgentName} intercepted ${attack.adversaryGroup} against ${attack.targetName}.`,
      targetRef: attack.id,
    };
  } else if (attack.phase === 'ai_intercepted') {
    penetrationPct = Math.max(0, penetrationPct - 18);
    aiShieldPct = 100;
    phase = 'contained';

    const msg = `Zero-Trust containment locked for ${attack.targetName}; forensic hash verified and playbook committed to swarm memory.`;
    nextLogs.unshift({
      id: nextLiveOpsId('log'),
      timestamp: nowIso,
      actor: attack.assignedAgentName,
      kind: 'containment',
      message: msg,
      engine: 'autonomous-swarm',
    });

    activity = {
      id: nextLiveOpsId('aiact'),
      timestamp: nowIso,
      agentName: attack.assignedAgentName,
      actionType: 'COUNTERMEASURE',
      engine: 'autonomous-swarm',
      severity: 'info',
      summary: `Contained ${attack.title} at 100% shield integrity.`,
      targetRef: attack.id,
    };
  }

  return {
    updated: {
      ...attack,
      phase,
      penetrationPct,
      aiShieldPct,
      updatedAt: nowIso,
      logs: nextLogs.slice(0, 12),
    },
    activity,
  };
}

export function buildChallengeDiagnosisFallback(
  challenge: OperationalChallenge,
  nodes: NetworkNode[]
): { diagnosis: string; remediationSteps: string[]; learnedTopic: string; learnedObservation: string } {
  const matchedNodes = nodes
    .filter((n) => challenge.affectedSystems.some((s) => s.toLowerCase().includes(n.id.toLowerCase()) || n.name.toLowerCase().includes(s.toLowerCase())))
    .map((n) => `${n.name} (${n.ip})`);

  const assetContext = matchedNodes.length > 0 ? matchedNodes.join(', ') : challenge.affectedSystems.join(', ');

  return {
    diagnosis: `Root-cause correlation for "${challenge.title}" (${challenge.domain}): telemetry drift and unpatched boundary policy exposure across ${assetContext}. Automated eBPF + ontology cross-check verified anomalous state transitions requiring deterministic policy hardening.`,
    remediationSteps: [
      `Apply strict zero-trust network microsegmentation and rotate short-lived credentials across ${challenge.affectedSystems[0] || 'target enclave'}.`,
      `Deploy continuous eBPF syscall & egress anomaly guardrails via ${challenge.assignedAgent}.`,
      `Validate checksum attestation and publish signed countermeasure signature to Swarm Shared Intelligence.`,
    ],
    learnedTopic: `Resolved Challenge: ${challenge.title}`,
    learnedObservation: `Applied autonomous remediation playbook across ${assetContext}; future matching ${challenge.domain} anomalies auto-trigger containment.`,
  };
}
