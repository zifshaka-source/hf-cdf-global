import { Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import {
  Agent,
  AutonomousAiActivity,
  Incident,
  IndicatorOfCompromise,
  LiveNewsItem,
  LiveOngoingAttack,
  LiveOpsStateSnapshot,
  NetworkNode,
  OperationalChallenge,
  SecurityEvent,
  SharedIntelMemory,
} from '../src/core/types';
import {
  advanceLiveAttackStep,
  buildChallengeDiagnosisFallback,
  correlateNewsWithPlatform,
  createLiveAttackFromTemplate,
  LIVE_ATTACK_TEMPLATES,
  parseCisaKevToNewsItems,
  parseRssXmlToNewsItems,
} from '../src/core/live-ops-engine';
import { synthesizeSelfLearningMemory } from '../src/core/ontology-engine';
import { emitOsEvent } from './os-fabric';
import { publishThreatAlert } from './threat-ws-hub';

export interface LiveOpsContext {
  getAgents: () => Agent[];
  getIncidents: () => Incident[];
  getEvents: () => SecurityEvent[];
  getIocs: () => IndicatorOfCompromise[];
  getNetworkNodes: () => NetworkNode[];
  getSharedMemories: () => SharedIntelMemory[];
  recordAudit: (
    actor: string,
    action: string,
    severity: 'info' | 'warning' | 'critical',
    details: string
  ) => void;
}

const INITIAL_CHALLENGES: OperationalChallenge[] = [
  {
    id: 'chl-zero-trust-weights',
    title: '70B Safetensors Memory Scraping & Egress Policy Drift',
    domain: 'AI Infrastructure',
    severity: 'critical',
    status: 'open',
    problemStatement:
      'Inference worker cluster-inference-01 exhibited anomalous ptrace syscall reads targeting model weight buffers while egress security group allowed uninspected TLS bursts to ASN 41382.',
    affectedSystems: ['cluster-inference-01', 'auth-sts-provider'],
    createdAt: new Date(Date.now() - 18 * 60_000).toISOString(),
    assignedAgent: 'Aegis-Heuristic',
  },
  {
    id: 'chl-swift-bgp-hijack',
    title: 'BGP Anycast Route Oscillation on Frankfurt SWIFT Clearing Rail',
    domain: 'Financial',
    severity: 'high',
    status: 'open',
    problemStatement:
      'AS-path pre-pending anomalies detected around DE-CIX peering routers threatening ISO-20022 settlement latency and HSM signature quorum synchronization.',
    affectedSystems: ['swift-gateway-eu', 'ingress-waf-01'],
    createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    assignedAgent: 'Sentinel-Zero',
  },
  {
    id: 'chl-subsea-qkd-attenuation',
    title: 'Trans-Atlantic Subsea DWDM Attenuation & Key Buffer Depletion',
    domain: 'Orbital & Subsea',
    severity: 'high',
    status: 'open',
    problemStatement:
      'Optical telemetry along the Dover landing trunk recorded a 1.8dB signal drop coupled with repeated ROADM management authentication attempts.',
    affectedSystems: ['dover-qkd-landing', 'orbital-kh14-mesh'],
    createdAt: new Date(Date.now() - 6 * 60_000).toISOString(),
    assignedAgent: 'Cortex-CTI',
  },
];

const EXTRA_CHALLENGE_POOL: Array<Omit<OperationalChallenge, 'id' | 'createdAt' | 'status'>> = [
  {
    title: 'PyPI Dependency Confusion & Malicious Wheel Hash Drift',
    domain: 'Supply Chain',
    severity: 'critical',
    problemStatement:
      'Automated SBOM scanner flagged an unsigned CUDA acceleration wheel package attempting outbound DNS tunneling during CI build.',
    affectedSystems: ['app-workloads-02', 'cluster-inference-01'],
    assignedAgent: 'Chronos-Forensics',
  },
  {
    title: 'Ephem-JWT Replay Window & Token Binding Desync',
    domain: 'Cyber',
    severity: 'high',
    problemStatement:
      'Short-lived workload identity tokens remained valid for 90s post-pod termination across edge proxies, exposing lateral API routes.',
    affectedSystems: ['ingress-waf-01', 'auth-sts-provider'],
    assignedAgent: 'Valkyrie-Enforcer',
  },
  {
    title: 'LEO Optical Crosslink Doppler Compensation Spike',
    domain: 'Orbital & Subsea',
    severity: 'medium',
    problemStatement:
      'Satellite constellation relay node KH-14-09 experienced elevated QBER (0.94%) during pass handoff over Northern Europe.',
    affectedSystems: ['orbital-kh14-mesh'],
    assignedAgent: 'Cortex-CTI',
  },
];

let ctxRef: LiveOpsContext | null = null;
let autoPilotEnabled = true;
const CYCLE_INTERVAL_MS = 7000;
let lastCycleAt = new Date().toISOString();
let lastNewsSyncAt = new Date().toISOString();
let cycleCounter = 0;
let templateCursor = 0;
let challengePoolCursor = 0;

let liveAttacks: LiveOngoingAttack[] = [];
let challenges: OperationalChallenge[] = [...INITIAL_CHALLENGES];
let liveNews: LiveNewsItem[] = [];
let aiFeed: AutonomousAiActivity[] = [];

let containedAttacksTotal = 4;
let resolvedChallengesTotal = 2;
let aiActionsExecutedTotal = 18;
let rulesLearnedTotal = 3;

const sseClients = new Set<Response>();
let autonomousTimer: NodeJS.Timeout | null = null;
let newsTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

let serverIdSeq = 0;
function nextServerId(prefix: string): string {
  serverIdSeq += 1;
  return `${prefix}-${Date.now()}-${serverIdSeq}`;
}

function pushAiActivity(activity: AutonomousAiActivity) {
  aiFeed = [activity, ...aiFeed.filter((existing) => existing.id !== activity.id)].slice(0, 60);
  aiActionsExecutedTotal += 1;
}

function syncAgentMetrics(agentName: string) {
  if (!ctxRef) return;
  const agents = ctxRef.getAgents();
  const agent = agents.find((a) => a.name === agentName) || agents[0];
  if (agent) {
    agent.tasksAssigned += 1;
    agent.tasksCompleted += 1;
    agent.lastActive = 'Just now';
    if (agent.status === 'standby') agent.status = 'active';
    agent.resourceUtilization.tokensPerHour += 450;
  }
}

export function getLiveOpsSnapshot(): LiveOpsStateSnapshot {
  return {
    autoPilotEnabled,
    cycleIntervalMs: CYCLE_INTERVAL_MS,
    lastCycleAt,
    lastNewsSyncAt,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    stats: {
      activeAttacksCount: liveAttacks.filter((a) => a.phase !== 'contained').length,
      containedAttacksTotal,
      openChallengesCount: challenges.filter((c) => c.status !== 'resolved').length,
      resolvedChallengesTotal,
      liveNewsCount: liveNews.length,
      aiActionsExecutedTotal,
      rulesLearnedTotal,
    },
    attacks: liveAttacks,
    challenges,
    news: liveNews,
    aiFeed: aiFeed.slice(0, 35),
  };
}

function broadcastSse(eventName: string, payload: unknown) {
  if (sseClients.size === 0) return;
  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(data);
    } catch {
      sseClients.delete(res);
    }
  }
}

function broadcastFullSync() {
  if (!ctxRef) return;
  broadcastSse('state_sync', {
    liveOps: getLiveOpsSnapshot(),
    agents: ctxRef.getAgents(),
    events: ctxRef.getEvents().slice(0, 30),
    sharedMemories: ctxRef.getSharedMemories().slice(0, 20),
  });
}

export function subscribeLiveStream(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);
  const initialPayload = {
    liveOps: getLiveOpsSnapshot(),
    agents: ctxRef?.getAgents() || [],
    events: ctxRef?.getEvents().slice(0, 30) || [],
    sharedMemories: ctxRef?.getSharedMemories().slice(0, 20) || [],
  };
  res.write(`event: state_sync\ndata: ${JSON.stringify(initialPayload)}\n\n`);

  res.on('close', () => {
    sseClients.delete(res);
  });
}

async function fetchWithTimeout(url: string, timeoutMs = 4500): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'HF-CDF-LiveIntel/2.0',
        Accept: 'application/rss+xml, application/xml, application/json, text/xml;q=0.9',
      },
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

export async function refreshLiveNews(): Promise<{
  fetchedSources: string[];
  totalItems: number;
  newCorrelatedChallenges: number;
}> {
  const nodes = ctxRef?.getNetworkNodes() || [];
  const iocs = ctxRef?.getIocs() || [];

  const [cisaXml, cisaKevJson, bleepingXml, hackerNewsXml, sansXml] = await Promise.all([
    fetchWithTimeout('https://www.cisa.gov/cybersecurity-advisories/all.xml'),
    fetchWithTimeout('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'),
    fetchWithTimeout('https://www.bleepingcomputer.com/feed/'),
    fetchWithTimeout('https://feeds.feedburner.com/TheHackersNews'),
    fetchWithTimeout('https://isc.sans.edu/rssfeed.xml'),
  ]);

  const fetchedSources: string[] = [];
  const aggregated: LiveNewsItem[] = [];

  if (cisaXml) {
    fetchedSources.push('CISA Advisories');
    aggregated.push(...parseRssXmlToNewsItems(cisaXml, 'CISA Advisories', 'Advisories', nodes, iocs, 7));
  }
  if (cisaKevJson) {
    try {
      const parsed = JSON.parse(cisaKevJson);
      if (Array.isArray(parsed?.vulnerabilities)) {
        fetchedSources.push('CISA KEV Live Catalog');
        aggregated.push(...parseCisaKevToNewsItems(parsed.vulnerabilities, nodes, iocs, 6));
      }
    } catch {
      // Ignore malformed JSON
    }
  }
  if (bleepingXml) {
    fetchedSources.push('BleepingComputer');
    aggregated.push(...parseRssXmlToNewsItems(bleepingXml, 'BleepingComputer', 'Cyber Attacks', nodes, iocs, 7));
  }
  if (hackerNewsXml) {
    fetchedSources.push('The Hacker News');
    aggregated.push(...parseRssXmlToNewsItems(hackerNewsXml, 'The Hacker News', 'Cyber Attacks', nodes, iocs, 7));
  }
  if (sansXml) {
    fetchedSources.push('SANS ISC');
    aggregated.push(...parseRssXmlToNewsItems(sansXml, 'SANS ISC', 'Advisories', nodes, iocs, 5));
  }

  // Merge with existing items, preserving any AI correlation notes already generated
  const existingMap = new Map(liveNews.map((n) => [n.id, n]));
  for (const item of aggregated) {
    const prev = existingMap.get(item.id);
    if (prev && prev.aiCorrelationSource === 'gemini-4-hydrogen') {
      existingMap.set(item.id, {
        ...item,
        aiCorrelationNote: prev.aiCorrelationNote,
        aiCorrelationSource: prev.aiCorrelationSource,
      });
    } else {
      existingMap.set(item.id, item);
    }
  }

  liveNews = Array.from(existingMap.values())
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 36);

  lastNewsSyncAt = new Date().toISOString();

  // Auto-promote critical asset-impacting breaking news into Challenges if not yet tracked
  let newCorrelatedChallenges = 0;
  for (const newsItem of liveNews) {
    if (
      newsItem.impactScore >= 86 &&
      newsItem.impactedAssetIds.length > 0 &&
      !challenges.some((c) => c.linkedNewsId === newsItem.id) &&
      challenges.filter((c) => c.status !== 'resolved').length < 6
    ) {
      challenges.unshift({
        id: nextServerId('chl-news'),
        title: `Live Advisory Exposure: ${newsItem.title.slice(0, 68)}`,
        domain: newsItem.category === 'AI Security' ? 'AI Infrastructure' : 'Cyber',
        severity: newsItem.severity,
        status: 'open',
        problemStatement: `${newsItem.source} reported: ${newsItem.summary}`,
        affectedSystems: newsItem.impactedAssetIds,
        createdAt: new Date().toISOString(),
        assignedAgent: 'Cortex-CTI',
        linkedNewsId: newsItem.id,
      });
      newCorrelatedChallenges += 1;

      publishThreatAlert({
        severity: newsItem.severity,
        source: newsItem.source,
        category: 'KEV_CORRELATION',
        title: `Live Advisory Exposure: ${newsItem.title.slice(0, 72)}`,
        summary: `Impacted assets: ${newsItem.impactedAssetIds.join(', ')} (Score ${newsItem.impactScore}/100)`,
        targetAsset: newsItem.impactedAssetIds[0] || 'cluster-inference-01',
        actionTaken: 'CHALLENGE_AUTO_OPENED',
      });
    }
  }

  if (fetchedSources.length > 0) {
    pushAiActivity({
      id: nextServerId('aiact'),
      timestamp: lastNewsSyncAt,
      agentName: 'Cortex-CTI',
      actionType: 'NEWS_CORRELATED',
      engine: 'autonomous-swarm',
      severity: newCorrelatedChallenges > 0 ? 'high' : 'info',
      summary: `Ingested ${liveNews.length} live bulletins from ${fetchedSources.join(', ')}. Correlated ${newCorrelatedChallenges} new infrastructure challenge(s).`,
    });
    syncAgentMetrics('Cortex-CTI');
    emitOsEvent(
      'cisa-kev-pipeline',
      'LIVE_NEWS_INGESTED',
      'info',
      `Synced ${liveNews.length} live headlines (${fetchedSources.join(', ')})`
    );
  }

  broadcastFullSync();
  return {
    fetchedSources,
    totalItems: liveNews.length,
    newCorrelatedChallenges,
  };
}

export async function runAiAttackBriefing(attack: LiveOngoingAttack): Promise<LiveOngoingAttack> {
  const ai = createGeminiClient();
  if (!ai) {
    attack.aiAssessment = `${attack.assignedAgentName} autonomous assessment: ${attack.adversaryGroup} executing ${attack.mitreTechnique} against ${attack.targetName}. Immediate eBPF socket isolation and ephemeral credential revocation queued.`;
    attack.aiAssessmentSource = 'deterministic-engine';
    return attack;
  }

  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `You are ${attack.assignedAgentName} on the HF-CDF Sovereign Defense Platform.
Provide a crisp 2-sentence live operational threat assessment and immediate countermeasure action for this active attack:
Attack: ${attack.title}
Adversary: ${attack.adversaryGroup} (${attack.sourceIp})
Target: ${attack.targetName} (${attack.targetSector})
Technique: ${attack.mitreTechnique} ${attack.cveRef ? `(${attack.cveRef})` : ''}
Vector: ${attack.attackVector}`,
        config: {
          systemInstruction: 'Be concise, technical, and operational. Two sentences maximum.',
        },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 8000)),
    ]);

    const text = response.text?.trim();
    if (text) {
      attack.aiAssessment = text;
      attack.aiAssessmentSource = 'gemini-4-hydrogen';
      pushAiActivity({
        id: nextServerId('aiact'),
        timestamp: new Date().toISOString(),
        agentName: attack.assignedAgentName,
        actionType: 'CORRELATION',
        engine: 'gemini-4-hydrogen',
        severity: attack.severity,
        summary: `Gemini 4 Hydrogen assessed ${attack.id} (${attack.adversaryGroup}): ${text.slice(0, 120)}...`,
        targetRef: attack.id,
      });
    }
  } catch {
    attack.aiAssessment = `${attack.assignedAgentName} autonomous correlation: ${attack.adversaryGroup} targeting ${attack.targetName} via ${attack.mitreTechnique}. Isolating ingress flows from ${attack.sourceIp}.`;
    attack.aiAssessmentSource = 'deterministic-engine';
  }
  return attack;
}

export function triggerLiveAttack(customVectorIndex?: number): LiveOngoingAttack {
  const agents = ctxRef?.getAgents() || [];
  const tpl =
    typeof customVectorIndex === 'number' && LIVE_ATTACK_TEMPLATES[customVectorIndex]
      ? LIVE_ATTACK_TEMPLATES[customVectorIndex]
      : LIVE_ATTACK_TEMPLATES[templateCursor++ % LIVE_ATTACK_TEMPLATES.length];

  const attack = createLiveAttackFromTemplate(tpl, agents);
  liveAttacks.unshift(attack);
  if (liveAttacks.length > 14) {
    liveAttacks = liveAttacks.slice(0, 14);
  }

  // Record a live SecurityEvent so Command Center graphs & telemetry react immediately
  if (ctxRef) {
    const events = ctxRef.getEvents();
    events.unshift({
      id: nextServerId('EVT'),
      timestamp: attack.startedAt,
      type: 'live',
      severity: attack.severity,
      source: attack.sourceIp,
      destination: attack.targetAssetId,
      category: attack.targetSector,
      signature: `${attack.mitreTechnique} · ${attack.title}`,
      mitreTechniqueId: attack.mitreTechnique.split(' ')[0],
      mitreTechniqueName: attack.attackVector,
      actionTaken: `AI_ENGAGED_${attack.assignedAgentName.toUpperCase()}`,
      verified: true,
    });
    if (events.length > 50) events.pop();

    ctxRef.recordAudit(
      attack.assignedAgentName,
      'LIVE_ATTACK_INTERCEPTED',
      attack.severity === 'critical' ? 'critical' : 'warning',
      `Detected live attack "${attack.title}" from ${attack.sourceIp} targeting ${attack.targetName}`
    );
  }

  pushAiActivity({
    id: nextServerId('aiact'),
    timestamp: attack.startedAt,
    agentName: attack.assignedAgentName,
    actionType: 'DETECTION',
    engine: 'autonomous-swarm',
    severity: attack.severity,
    summary: `Live threat detected: ${attack.title} (${attack.sourceIp} -> ${attack.targetName}). Counter-swarm engaged.`,
    targetRef: attack.id,
  });

  syncAgentMetrics(attack.assignedAgentName);

  publishThreatAlert({
    severity: attack.severity,
    source: attack.adversaryGroup,
    category: 'LIVE_INTRUSION',
    title: `${attack.title} (${attack.mitreTechnique})`,
    summary: `${attack.sourceIp} -> ${attack.targetName}. Defender ${attack.assignedAgentName} engaged.`,
    targetAsset: attack.targetAssetId,
    actionTaken: `AI_ENGAGED_${attack.assignedAgentName.toUpperCase()}`,
  });

  // Fire non-blocking Gemini 4 Hydrogen enrichment when available
  runAiAttackBriefing(attack).then(() => broadcastFullSync());

  broadcastFullSync();
  return attack;
}

export async function counterLiveAttack(
  attackId: string,
  mode: 'counter' | 'contain' = 'counter'
): Promise<LiveOngoingAttack | null> {
  const idx = liveAttacks.findIndex((a) => a.id === attackId);
  if (idx === -1) return null;

  let current = liveAttacks[idx];
  if (mode === 'contain') {
    current.aiShieldPct = Math.max(current.aiShieldPct, 85);
  }
  const { updated, activity } = advanceLiveAttackStep(current, true);
  if (mode === 'contain' && updated.phase !== 'contained') {
    const second = advanceLiveAttackStep(updated, true);
    liveAttacks[idx] = second.updated;
    if (second.activity) pushAiActivity(second.activity);
  } else {
    liveAttacks[idx] = updated;
    if (activity) pushAiActivity(activity);
  }

  const finalAttack = liveAttacks[idx];
  if (finalAttack.phase === 'contained') {
    containedAttacksTotal += 1;
    if (ctxRef) {
      const memories = ctxRef.getSharedMemories();
      memories.unshift(
        synthesizeSelfLearningMemory(
          `Neutralized ${finalAttack.adversaryGroup} (${finalAttack.mitreTechnique})`,
          `AI Defender ${finalAttack.assignedAgentName} blocked ${finalAttack.sourceIp} and hardened ${finalAttack.targetName}.`,
          ['live-defense', finalAttack.targetSector.toLowerCase().replace(/\s+/g, '-')],
          finalAttack.assignedAgentId
        )
      );
      rulesLearnedTotal += 1;
      ctxRef.recordAudit(
        finalAttack.assignedAgentName,
        'LIVE_ATTACK_CONTAINED',
        'warning',
        `Contained live attack ${finalAttack.title} against ${finalAttack.targetName}`
      );
    }
    publishThreatAlert({
      severity: 'low',
      source: finalAttack.assignedAgentName,
      category: 'BLUE_FORCE_CONTAINMENT',
      title: `Contained ${finalAttack.adversaryGroup} targeting ${finalAttack.targetName}`,
      summary: `AI Defense Shield locked at ${finalAttack.aiShieldPct}% integrity; ${finalAttack.sourceIp} null-routed.`,
      targetAsset: finalAttack.targetAssetId,
      actionTaken: 'CONTAINED_AND_LEARNED',
    });
  }

  await runAiAttackBriefing(finalAttack);
  syncAgentMetrics(finalAttack.assignedAgentName);
  broadcastFullSync();
  return finalAttack;
}

export function createOperationalChallenge(input: {
  title: string;
  domain: OperationalChallenge['domain'];
  severity: OperationalChallenge['severity'];
  problemStatement: string;
  affectedSystems: string[];
}): OperationalChallenge {
  const ch: OperationalChallenge = {
    id: nextServerId('chl'),
    title: input.title.trim(),
    domain: input.domain || 'Cyber',
    severity: input.severity || 'high',
    status: 'open',
    problemStatement: input.problemStatement.trim(),
    affectedSystems: input.affectedSystems.length > 0 ? input.affectedSystems : ['cluster-inference-01'],
    createdAt: new Date().toISOString(),
    assignedAgent: 'Cortex-CTI',
  };
  challenges.unshift(ch);

  pushAiActivity({
    id: nextServerId('aiact'),
    timestamp: ch.createdAt,
    agentName: ch.assignedAgent,
    actionType: 'DETECTION',
    engine: 'autonomous-swarm',
    severity: ch.severity,
    summary: `New operational challenge logged: "${ch.title}" (${ch.domain}).`,
    targetRef: ch.id,
  });

  broadcastFullSync();
  return ch;
}

export async function resolveOperationalChallenge(challengeId: string): Promise<OperationalChallenge | null> {
  const ch = challenges.find((c) => c.id === challengeId);
  if (!ch) return null;

  ch.status = 'analyzing';
  broadcastFullSync();

  const nodes = ctxRef?.getNetworkNodes() || [];
  const ai = createGeminiClient();
  let usedGemini = false;
  let diagnosis = '';
  let remediationSteps: string[] = [];
  let learnedTopic = '';
  let learnedObservation = '';

  if (ai) {
    try {
      const resp = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `You are ${ch.assignedAgent}, autonomous AI security engineer inside HF-CDF Sovereign OS.
Diagnose and resolve this live operational challenge affecting systems [${ch.affectedSystems.join(', ')}]:
Title: ${ch.title}
Domain: ${ch.domain}
Severity: ${ch.severity}
Problem: ${ch.problemStatement}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                diagnosis: { type: Type.STRING },
                remediationSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                learnedTopic: { type: Type.STRING },
                learnedObservation: { type: Type.STRING },
              },
              required: ['diagnosis', 'remediationSteps', 'learnedTopic', 'learnedObservation'],
            },
          },
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 12000)),
      ]);
      const parsed = JSON.parse(resp.text || '{}');
      if (parsed.diagnosis && Array.isArray(parsed.remediationSteps)) {
        diagnosis = parsed.diagnosis;
        remediationSteps = parsed.remediationSteps.slice(0, 4);
        learnedTopic = parsed.learnedTopic || `Resolved: ${ch.title}`;
        learnedObservation = parsed.learnedObservation || diagnosis;
        usedGemini = true;
      }
    } catch {
      // Fall back transparently to deterministic engine
    }
  }

  if (!usedGemini) {
    const fb = buildChallengeDiagnosisFallback(ch, nodes);
    diagnosis = fb.diagnosis;
    remediationSteps = fb.remediationSteps;
    learnedTopic = fb.learnedTopic;
    learnedObservation = fb.learnedObservation;
  }

  const nowIso = new Date().toISOString();
  ch.status = 'resolved';
  ch.resolvedAt = nowIso;
  ch.aiDiagnosis = diagnosis;
  ch.remediationSteps = remediationSteps;
  ch.aiSource = usedGemini ? 'gemini-4-hydrogen' : 'deterministic-engine';

  resolvedChallengesTotal += 1;
  syncAgentMetrics(ch.assignedAgent);

  if (ctxRef) {
    const rule = synthesizeSelfLearningMemory(
      learnedTopic,
      learnedObservation,
      ['challenge-resolved', ch.domain.toLowerCase().replace(/[^a-z0-9]+/g, '-')],
      'agent-cortex'
    );
    ch.learnedRuleId = rule.id;
    ctxRef.getSharedMemories().unshift(rule);
    rulesLearnedTotal += 1;
    ctxRef.recordAudit(
      ch.assignedAgent,
      'CHALLENGE_RESOLVED_BY_AI',
      'info',
      `Resolved operational challenge "${ch.title}" via ${ch.aiSource}`
    );
  }

  pushAiActivity({
    id: nextServerId('aiact'),
    timestamp: nowIso,
    agentName: ch.assignedAgent,
    actionType: 'CHALLENGE_RESOLVED',
    engine: usedGemini ? 'gemini-4-hydrogen' : 'autonomous-swarm',
    severity: 'info',
    summary: `Solved challenge "${ch.title}" and committed self-learned defense rule.`,
    targetRef: ch.id,
  });

  broadcastFullSync();
  return ch;
}

export async function analyzeNewsItemWithAi(newsId: string): Promise<LiveNewsItem | null> {
  const item = liveNews.find((n) => n.id === newsId);
  if (!item) return null;

  const nodes = ctxRef?.getNetworkNodes() || [];
  const iocs = ctxRef?.getIocs() || [];
  const ai = createGeminiClient();
  let usedGemini = false;

  if (ai) {
    try {
      const nodeList = nodes.map((n) => `${n.id} (${n.name}, ${n.zone}, status=${n.status})`).join('; ');
      const resp = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Analyze this live global security news bulletin against our sovereign infrastructure nodes [${nodeList}].
News Title: ${item.title}
Source: ${item.source}
Summary: ${item.summary}
CVEs: ${item.cveIds.join(', ') || 'None cited'}
Provide a concise 2-sentence operational impact assessment and defensive action.`,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 10000)),
      ]);
      const note = resp.text?.trim();
      if (note) {
        item.aiCorrelationNote = note;
        item.aiCorrelationSource = 'gemini-4-hydrogen';
        usedGemini = true;
      }
    } catch {
      // Fallback below
    }
  }

  if (!usedGemini) {
    const corr = correlateNewsWithPlatform(item, nodes, iocs);
    item.impactedAssetIds = corr.impactedAssetIds;
    item.impactScore = corr.impactScore;
    item.aiCorrelationNote = corr.note;
    item.aiCorrelationSource = 'deterministic-engine';
  }

  syncAgentMetrics('Cortex-CTI');
  pushAiActivity({
    id: nextServerId('aiact'),
    timestamp: new Date().toISOString(),
    agentName: 'Cortex-CTI',
    actionType: 'NEWS_CORRELATED',
    engine: usedGemini ? 'gemini-4-hydrogen' : 'autonomous-swarm',
    severity: item.severity,
    summary: `Correlated "${item.title.slice(0, 72)}" (${item.source}) -> Impact ${item.impactScore}/100.`,
    targetRef: item.id,
  });

  broadcastFullSync();
  return item;
}

export async function runAutonomousCycle(manualTrigger = false): Promise<LiveOpsStateSnapshot> {
  lastCycleAt = new Date().toISOString();
  cycleCounter += 1;

  // 1. Advance active uncontained attacks with autonomous AI swarm actions
  let newlyContained = 0;
  liveAttacks = liveAttacks.map((atk) => {
    if (atk.phase === 'contained') return atk;
    const { updated, activity } = advanceLiveAttackStep(atk, false, lastCycleAt);
    if (activity) {
      pushAiActivity(activity);
      syncAgentMetrics(atk.assignedAgentName);
    }
    if (updated.phase === 'contained') {
      containedAttacksTotal += 1;
      newlyContained += 1;
      if (ctxRef) {
        ctxRef.getSharedMemories().unshift(
          synthesizeSelfLearningMemory(
            `Autonomous Defense Playbook: ${updated.adversaryGroup}`,
            `Auto-contained ${updated.attackVector} targeting ${updated.targetName}.`,
            ['autonomous-defense', updated.targetSector.toLowerCase().replace(/\s+/g, '-')],
            updated.assignedAgentId
          )
        );
        rulesLearnedTotal += 1;
      }
    }
    return updated;
  });

  // Prune old contained attacks if list gets large, keeping latest 8
  if (liveAttacks.length > 8) {
    const active = liveAttacks.filter((a) => a.phase !== 'contained');
    const recentContained = liveAttacks.filter((a) => a.phase === 'contained').slice(0, 4);
    liveAttacks = [...active, ...recentContained];
  }

  // 2. Ensure live attack stream stays active when uncontained threats drop below 2
  const activeCount = liveAttacks.filter((a) => a.phase !== 'contained').length;
  if (activeCount < 2) {
    triggerLiveAttack();
  }

  // 3. Replenish open challenges so operators always have fresh challenges, and occasionally auto-solve if manual or periodic
  const openChallenges = challenges.filter((c) => c.status === 'open');
  if (openChallenges.length < 2) {
    const tpl = EXTRA_CHALLENGE_POOL[challengePoolCursor++ % EXTRA_CHALLENGE_POOL.length];
    challenges.unshift({
      id: nextServerId('chl'),
      ...tpl,
      status: 'open',
      createdAt: new Date().toISOString(),
    });
  }

  // Every 4th autonomous cycle (or on manual AI cycle trigger when nothing was contained), let AI solve oldest open challenge if > 2 open
  if ((manualTrigger && newlyContained === 0 && openChallenges.length >= 2) || (cycleCounter % 4 === 0 && openChallenges.length >= 3)) {
    const target = openChallenges[openChallenges.length - 1];
    if (target) {
      await resolveOperationalChallenge(target.id);
    }
  }

  // 4. Emit real telemetry pulse into Command Center events stream every 2nd cycle
  if (ctxRef && cycleCounter % 2 === 0) {
    const activeAtk = liveAttacks.find((a) => a.phase !== 'contained') || liveAttacks[0];
    if (activeAtk) {
      const events = ctxRef.getEvents();
      events.unshift({
        id: nextServerId('EVT'),
        timestamp: lastCycleAt,
        type: 'live',
        severity: activeAtk.phase === 'ai_intercepted' ? 'medium' : activeAtk.severity,
        source: activeAtk.sourceIp,
        destination: activeAtk.targetAssetId,
        category: activeAtk.targetSector,
        signature: `[AI-SWARM] ${activeAtk.assignedAgentName} -> ${activeAtk.phase.toUpperCase()}`,
        actionTaken: `SHIELD_${activeAtk.aiShieldPct}PCT`,
        verified: true,
      });
      if (events.length > 50) events.pop();
    }
  }

  broadcastFullSync();
  return getLiveOpsSnapshot();
}

export function setAutoPilot(enabled: boolean) {
  autoPilotEnabled = enabled;
  pushAiActivity({
    id: nextServerId('aiact'),
    timestamp: new Date().toISOString(),
    agentName: 'Sovereign AI Supervisor',
    actionType: 'SELF_LEARNING',
    engine: 'autonomous-swarm',
    severity: 'info',
    summary: enabled
      ? 'Autonomous AI Auto-Pilot ENGAGED: continuous attack interception & learning active.'
      : 'Autonomous AI Auto-Pilot PAUSED by operator.',
  });
  broadcastFullSync();
}

export async function initLiveOpsEngine(context: LiveOpsContext) {
  ctxRef = context;

  // Seed 2 initial live ongoing attacks immediately so first paint is never empty
  const agents = ctxRef.getAgents();
  liveAttacks = [
    createLiveAttackFromTemplate(LIVE_ATTACK_TEMPLATES[0], agents),
    createLiveAttackFromTemplate(LIVE_ATTACK_TEMPLATES[1], agents),
  ];

  pushAiActivity({
    id: nextServerId('aiact'),
    timestamp: new Date().toISOString(),
    agentName: 'HF-CDF Autonomous Core',
    actionType: 'DETECTION',
    engine: process.env.GEMINI_API_KEY ? 'gemini-4-hydrogen' : 'autonomous-swarm',
    severity: 'high',
    summary: `Live Autonomous Operations initialized. Tracking ${liveAttacks.length} active intrusions and syncing public threat newsfeeds.`,
  });

  if (process.env.VERCEL) {
    return;
  }

  // Immediately pull live public feeds in background
  refreshLiveNews().catch(() => {});

  // Start real autonomous defense loop
  if (!autonomousTimer) {
    autonomousTimer = setInterval(() => {
      if (autoPilotEnabled) {
        runAutonomousCycle(false).catch(() => {});
      }
    }, CYCLE_INTERVAL_MS);
  }

  // Refresh public live news every 5 minutes
  if (!newsTimer) {
    newsTimer = setInterval(() => {
      refreshLiveNews().catch(() => {});
    }, 300_000);
  }

  // SSE heartbeat keepalive
  if (!heartbeatTimer) {
    heartbeatTimer = setInterval(() => {
      for (const res of sseClients) {
        try {
          res.write(': keepalive\n\n');
        } catch {
          sseClients.delete(res);
        }
      }
    }, 15_000);
  }
}
