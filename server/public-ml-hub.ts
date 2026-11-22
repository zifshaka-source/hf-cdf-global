import {
  CURATED_PUBLIC_TRAINING_ARCHIVE,
  PublicDatasetConnectorStatus,
  PublicDatasetSourceId,
  PublicThreatSample,
  ThreatPredictionResult,
  TrafficPatternInferenceInput,
  TrainedThreatModelSnapshot,
  inferPublicRecordLabel,
  predictThreatRisk,
  predictTrafficPatternRisk,
  trainThreatClassificationModel,
} from '../src/core/ml-threat-model';
import { emitOsEvent, getSqlDb, persistDbToDisk } from './os-fabric';
import { publishThreatAlert } from './threat-ws-hub';

export interface MlInferenceLogEntry {
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

export interface MlSchedulerStatus {
  enabled: boolean;
  intervalMs: number;
  isSyncing: boolean;
  syncRunCount: number;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  lastSyncTrigger: 'boot' | 'scheduled' | 'manual' | 'none';
  lastLiveFetchedCount: number;
}

let activeModel: TrainedThreatModelSnapshot | null = null;
let trainingCorpus: PublicThreatSample[] = [...CURATED_PUBLIC_TRAINING_ARCHIVE];
let connectorStatuses: PublicDatasetConnectorStatus[] = [];
let recordAuditFn:
  | ((actor: string, action: string, severity: 'info' | 'warning' | 'critical', details: string) => void)
  | null = null;

// Periodic ML service scheduler state
let schedulerEnabled = true;
let schedulerIntervalMs = 5 * 60 * 1000; // 5 minutes default
let schedulerTimer: NodeJS.Timeout | null = null;
let isSyncing = false;
let syncRunCount = 0;
let lastSyncAt: string | null = null;
let nextSyncAt: string | null = null;
let lastSyncTrigger: MlSchedulerStatus['lastSyncTrigger'] = 'none';
let lastLiveFetchedCount = 0;
let recentInferences: MlInferenceLogEntry[] = [];

function ensureMlTables() {
  try {
    const db = getSqlDb();
    db.run(`
      CREATE TABLE IF NOT EXISTS ml_model_snapshots (
        model_id TEXT PRIMARY KEY,
        trained_at TEXT NOT NULL,
        validation_accuracy_pct REAL NOT NULL,
        macro_f1_pct REAL NOT NULL,
        total_samples INTEGER NOT NULL,
        live_samples INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        snapshot_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS public_dataset_connectors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        acquisition_mode TEXT NOT NULL,
        status TEXT NOT NULL,
        records_ingested INTEGER NOT NULL,
        last_fetched_at TEXT NOT NULL,
        latency_ms INTEGER NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS public_training_corpus (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        acquisition_mode TEXT NOT NULL,
        label TEXT NOT NULL,
        title TEXT NOT NULL,
        published_at TEXT NOT NULL,
        sample_json TEXT NOT NULL
      );
    `);
    persistDbToDisk();
  } catch {
    // SQLite may not be ready in unit tests
  }
}

function loadPersistedMlState(): boolean {
  try {
    const db = getSqlDb();
    const modelRes = db.exec(
      `SELECT snapshot_json FROM ml_model_snapshots ORDER BY trained_at DESC LIMIT 1`
    );
    if (modelRes.length > 0 && modelRes[0].values.length > 0) {
      activeModel = JSON.parse(String(modelRes[0].values[0][0])) as TrainedThreatModelSnapshot;
    }

    const connRes = db.exec(`SELECT payload_json FROM public_dataset_connectors`);
    if (connRes.length > 0 && connRes[0].values.length > 0) {
      connectorStatuses = connRes[0].values.map(
        (r) => JSON.parse(String(r[0])) as PublicDatasetConnectorStatus
      );
    }

    const corpusRes = db.exec(`SELECT sample_json FROM public_training_corpus LIMIT 260`);
    if (corpusRes.length > 0 && corpusRes[0].values.length > 0) {
      trainingCorpus = corpusRes[0].values.map(
        (r) => JSON.parse(String(r[0])) as PublicThreatSample
      );
    }
    return activeModel !== null;
  } catch {
    return false;
  }
}

function persistMlState() {
  try {
    const db = getSqlDb();
    if (activeModel) {
      db.run(
        `INSERT OR REPLACE INTO ml_model_snapshots (
          model_id, trained_at, validation_accuracy_pct, macro_f1_pct,
          total_samples, live_samples, checksum, snapshot_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          activeModel.modelId,
          activeModel.trainedAt,
          activeModel.evaluation.validationAccuracyPct,
          activeModel.evaluation.macroF1Pct,
          activeModel.datasetSummary.totalSamples,
          activeModel.datasetSummary.liveApiSamples,
          activeModel.modelChecksum,
          JSON.stringify(activeModel),
        ]
      );
      db.run(
        `DELETE FROM ml_model_snapshots WHERE model_id NOT IN (
          SELECT model_id FROM ml_model_snapshots ORDER BY trained_at DESC LIMIT 8
        )`
      );
    }

    for (const c of connectorStatuses) {
      db.run(
        `INSERT OR REPLACE INTO public_dataset_connectors (
          id, name, acquisition_mode, status, records_ingested, last_fetched_at, latency_ms, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.id,
          c.name,
          c.acquisitionMode,
          c.status,
          c.recordsIngested,
          c.lastFetchedAt,
          c.latencyMs,
          JSON.stringify(c),
        ]
      );
    }

    for (const s of trainingCorpus.slice(0, 260)) {
      db.run(
        `INSERT OR REPLACE INTO public_training_corpus (
          id, source_id, acquisition_mode, label, title, published_at, sample_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.sourceId, s.acquisitionMode, s.label, s.title, s.publishedAt, JSON.stringify(s)]
      );
    }
    persistDbToDisk();
  } catch {
    // ignore if db not mounted
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 6500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'HF-CDF-Governance-ML/2.0',
        Accept: 'application/json, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRssItems(xml: string, limit = 15): Array<{ title: string; description: string; link: string; pubDate: string }> {
  const items: Array<{ title: string; description: string; link: string; pubDate: string }> = [];
  const itemMatches = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  for (const block of itemMatches.slice(0, limit)) {
    const titleMatch = block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = block.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i);
    const linkMatch = block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i);
    const dateMatch = block.match(/<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i);

    const title = decodeXmlEntities(titleMatch?.[1] || '');
    const description = decodeXmlEntities(descMatch?.[1] || '');
    if (title.length >= 6) {
      items.push({
        title,
        description: description || title,
        link: decodeXmlEntities(linkMatch?.[1] || ''),
        pubDate: dateMatch?.[1] ? new Date(decodeXmlEntities(dateMatch[1])).toISOString() : new Date().toISOString(),
      });
    }
  }
  return items;
}

function buildBaselineConnectorStatuses(): PublicDatasetConnectorStatus[] {
  const now = new Date().toISOString();
  const countFor = (id: PublicDatasetSourceId) =>
    CURATED_PUBLIC_TRAINING_ARCHIVE.filter((s) => s.sourceId === id).length;

  return [
    {
      id: 'cisa-kev',
      name: 'CISA Known Exploited Vulnerabilities (KEV)',
      provider: 'Cybersecurity and Infrastructure Security Agency',
      endpointUrl: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
      license: 'Public Domain (US Government)',
      acquisitionMode: 'curated-public-archive',
      status: 'fallback_archive',
      recordsIngested: countFor('cisa-kev'),
      lastFetchedAt: now,
      latencyMs: 0,
      notes: 'Initialized with verified KEV baseline; click Fetch Live Public Data to pull live CISA catalog.',
    },
    {
      id: 'nist-nvd-2',
      name: 'NIST National Vulnerability Database (NVD CVE 2.0)',
      provider: 'National Institute of Standards and Technology',
      endpointUrl: 'https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20',
      license: 'Public Domain (NIST NVD 2.0)',
      acquisitionMode: 'curated-public-archive',
      status: 'fallback_archive',
      recordsIngested: countFor('nist-nvd-2'),
      lastFetchedAt: now,
      latencyMs: 0,
      notes: 'Initialized with verified NVD CVE records; click Fetch Live Public Data to query NVD 2.0 API.',
    },
    {
      id: 'abusech-urlhaus',
      name: 'Abuse.ch URLhaus Recent Malware Payloads',
      provider: 'abuse.ch (Bern University of Applied Sciences)',
      endpointUrl: 'https://urlhaus.abuse.ch/downloads/csv_recent/',
      license: 'CC0 1.0 Public Domain Dedication',
      acquisitionMode: 'curated-public-archive',
      status: 'fallback_archive',
      recordsIngested: countFor('abusech-urlhaus'),
      lastFetchedAt: now,
      latencyMs: 0,
      notes: 'Initialized with URLhaus ransomware dropper baseline; supports live CSV feed pull.',
    },
    {
      id: 'cisa-advisories',
      name: 'CISA Cybersecurity Advisories RSS',
      provider: 'CISA.gov Public Feed',
      endpointUrl: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
      license: 'Public Domain',
      acquisitionMode: 'curated-public-archive',
      status: 'fallback_archive',
      recordsIngested: countFor('cisa-advisories'),
      lastFetchedAt: now,
      latencyMs: 0,
      notes: 'Baseline infrastructure hardening advisories ready for live RSS refresh.',
    },
    {
      id: 'sans-isc',
      name: 'SANS Internet Storm Center Handlers Diary',
      provider: 'SANS Institute (ISC)',
      endpointUrl: 'https://isc.sans.edu/rssfeed_full.xml',
      license: 'Public Informational Feed',
      acquisitionMode: 'curated-public-archive',
      status: 'fallback_archive',
      recordsIngested: countFor('sans-isc'),
      lastFetchedAt: now,
      latencyMs: 0,
      notes: 'Baseline operational handler advisories ready for live RSS sync.',
    },
    {
      id: 'mitre-owasp-agentic',
      name: 'OWASP Agentic V2 & MITRE ATLAS Taxonomy',
      provider: 'OWASP / MITRE Public Frameworks',
      endpointUrl: 'https://atlas.mitre.org/',
      license: 'Apache 2.0 / CC BY-SA',
      acquisitionMode: 'curated-public-archive',
      status: 'synced',
      recordsIngested: countFor('mitre-owasp-agentic'),
      lastFetchedAt: now,
      latencyMs: 1,
      notes: 'Verified agentic prompt-injection, shadow agent, and MCP tool misuse supervision set.',
    },
  ];
}

function scheduleNextSyncTimer() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  if (!schedulerEnabled) {
    nextSyncAt = null;
    return;
  }
  nextSyncAt = new Date(Date.now() + schedulerIntervalMs).toISOString();
  schedulerTimer = setInterval(() => {
    ingestPublicDataAndTrainModel({ trigger: 'scheduled' }).catch(() => {
      // handled cleanly by connector statuses
    });
  }, schedulerIntervalMs);
}

export function initPublicMlHub(deps?: {
  recordAudit?: (actor: string, action: string, severity: 'info' | 'warning' | 'critical', details: string) => void;
}) {
  if (deps?.recordAudit) recordAuditFn = deps.recordAudit;
  ensureMlTables();
  const loaded = loadPersistedMlState();
  if (!loaded || !activeModel) {
    connectorStatuses = buildBaselineConnectorStatuses();
    trainingCorpus = [...CURATED_PUBLIC_TRAINING_ARCHIVE];
    activeModel = trainThreatClassificationModel(trainingCorpus, { epochs: 32, learningRate: 0.15 });
    persistMlState();
  }

  if (!process.env.VERCEL) {
    // Start periodic public feed sync & retraining loop (non-blocking initial pull after 2.5s)
    scheduleNextSyncTimer();
    setTimeout(() => {
      if (schedulerEnabled && !isSyncing) {
        ingestPublicDataAndTrainModel({ trigger: 'boot' }).catch(() => {
          // non-fatal background sync
        });
      }
    }, 2500);
  }
}

export function configureMlScheduler(params: {
  enabled?: boolean;
  intervalMs?: number;
}): MlSchedulerStatus {
  if (typeof params.enabled === 'boolean') {
    schedulerEnabled = params.enabled;
  }
  if (typeof params.intervalMs === 'number' && params.intervalMs >= 30_000 && params.intervalMs <= 3_600_000) {
    schedulerIntervalMs = params.intervalMs;
  }
  scheduleNextSyncTimer();
  emitOsEvent(
    'ai-ml-trainer',
    'ML_SCHEDULER_UPDATED',
    'info',
    `Periodic public dataset ML sync ${schedulerEnabled ? 'ENABLED' : 'PAUSED'} (interval: ${Math.round(schedulerIntervalMs / 1000)}s).`
  );
  return getMlSchedulerStatus();
}

export function getMlSchedulerStatus(): MlSchedulerStatus {
  return {
    enabled: schedulerEnabled,
    intervalMs: schedulerIntervalMs,
    isSyncing,
    syncRunCount,
    lastSyncAt,
    nextSyncAt,
    lastSyncTrigger,
    lastLiveFetchedCount,
  };
}

export async function ingestPublicDataAndTrainModel(options?: {
  epochs?: number;
  learningRate?: number;
  trigger?: 'boot' | 'scheduled' | 'manual';
}): Promise<{
  model: TrainedThreatModelSnapshot;
  connectors: PublicDatasetConnectorStatus[];
  liveFetchedCount: number;
  totalCorpusCount: number;
  scheduler: MlSchedulerStatus;
}> {
  if (isSyncing && activeModel) {
    return {
      model: activeModel,
      connectors: connectorStatuses,
      liveFetchedCount: lastLiveFetchedCount,
      totalCorpusCount: trainingCorpus.length,
      scheduler: getMlSchedulerStatus(),
    };
  }
  isSyncing = true;
  try {
    const nowIso = new Date().toISOString();
    const liveSamples: PublicThreatSample[] = [];
    const nextConnectors: PublicDatasetConnectorStatus[] = [];

    // 1. CISA KEV JSON Live Fetch
    const kevUrl = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
    const kevStart = Date.now();
    try {
      const res = await fetchWithTimeout(kevUrl, 7000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { vulnerabilities?: Array<Record<string, unknown>> };
      const vulns = (json.vulnerabilities || []).slice(-35).reverse();
      let count = 0;
      for (const v of vulns) {
        const cveId = String(v.cveID || '');
        const title = `${cveId} ${String(v.vendorProject || '')} ${String(v.product || '')}: ${String(
          v.vulnerabilityName || ''
        )}`.trim();
        const desc = String(v.shortDescription || v.requiredAction || title);
        const ransom = String(v.knownRansomwareCampaignUse || '').toLowerCase() === 'known';
        if (cveId) {
          liveSamples.push({
            id: `LIVE-KEV-${cveId}`,
            sourceId: 'cisa-kev',
            acquisitionMode: 'live-public-api',
            title,
            description: desc,
            label: inferPublicRecordLabel({
              title,
              description: desc,
              ransomwareFlag: ransom,
              kevFlag: true,
              cvssScore: ransom ? 9.6 : 8.8,
              sourceId: 'cisa-kev',
            }),
            cvssScore: ransom ? 9.6 : 8.8,
            kevFlag: true,
            ransomwareFlag: ransom,
            iocCount: ransom ? 5 : 3,
            publishedAt: String(v.dateAdded || nowIso),
            referenceUrl: `https://nvd.nist.gov/vuln/detail/${cveId}`,
          });
          count += 1;
        }
      }
      nextConnectors.push({
        id: 'cisa-kev',
        name: 'CISA Known Exploited Vulnerabilities (KEV)',
        provider: 'CISA.gov',
        endpointUrl: kevUrl,
        license: 'Public Domain (US Government)',
        acquisitionMode: 'live-public-api',
        status: 'synced',
        recordsIngested: count,
        lastFetchedAt: nowIso,
        latencyMs: Date.now() - kevStart,
        notes: `Live-ingested ${count} recent CISA KEV advisories via official JSON catalog.`,
      });
    } catch (err: any) {
      const fallback = CURATED_PUBLIC_TRAINING_ARCHIVE.filter((s) => s.sourceId === 'cisa-kev');
      nextConnectors.push({
        id: 'cisa-kev',
        name: 'CISA Known Exploited Vulnerabilities (KEV)',
        provider: 'CISA.gov',
        endpointUrl: kevUrl,
        license: 'Public Domain (US Government)',
        acquisitionMode: 'curated-public-archive',
        status: 'fallback_archive',
        recordsIngested: fallback.length,
        lastFetchedAt: nowIso,
        latencyMs: Date.now() - kevStart,
        notes: `Live endpoint unavailable (${err?.message || 'network timeout'}); using labeled curated archive.`,
      });
    }

    // 2. NIST NVD CVE 2.0 Live Fetch
    const nvdUrl = 'https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20';
    const nvdStart = Date.now();
    try {
      const res = await fetchWithTimeout(nvdUrl, 7000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { vulnerabilities?: Array<{ cve?: Record<string, any> }> };
      let count = 0;
      for (const wrapper of (json.vulnerabilities || []).slice(0, 20)) {
        const cve = wrapper.cve;
        if (!cve?.id) continue;
        const engDesc =
          (cve.descriptions || []).find((d: any) => d.lang === 'en')?.value || String(cve.id);
        const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0];
        const baseScore = Number(metrics?.cvssData?.baseScore || 6.5);
        liveSamples.push({
          id: `LIVE-NVD-${cve.id}`,
          sourceId: 'nist-nvd-2',
          acquisitionMode: 'live-public-api',
          title: `${cve.id} (${String(cve.vulnStatus || 'Analyzed')})`,
          description: engDesc.slice(0, 480),
          label: inferPublicRecordLabel({
            title: cve.id,
            description: engDesc,
            cvssScore: baseScore,
            sourceId: 'nist-nvd-2',
          }),
          cvssScore: baseScore,
          kevFlag: false,
          iocCount: baseScore >= 8 ? 3 : 1,
          publishedAt: String(cve.published || nowIso),
          referenceUrl: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
        });
        count += 1;
      }
      nextConnectors.push({
        id: 'nist-nvd-2',
        name: 'NIST National Vulnerability Database (NVD CVE 2.0)',
        provider: 'NIST',
        endpointUrl: nvdUrl,
        license: 'Public Domain (NIST NVD 2.0)',
        acquisitionMode: 'live-public-api',
        status: 'synced',
        recordsIngested: count,
        lastFetchedAt: nowIso,
        latencyMs: Date.now() - nvdStart,
        notes: `Live-ingested ${count} CVE records from NIST NVD 2.0 REST API.`,
      });
    } catch (err: any) {
      const fallback = CURATED_PUBLIC_TRAINING_ARCHIVE.filter((s) => s.sourceId === 'nist-nvd-2');
      nextConnectors.push({
        id: 'nist-nvd-2',
        name: 'NIST National Vulnerability Database (NVD CVE 2.0)',
        provider: 'NIST',
        endpointUrl: nvdUrl,
        license: 'Public Domain (NIST NVD 2.0)',
        acquisitionMode: 'curated-public-archive',
        status: 'fallback_archive',
        recordsIngested: fallback.length,
        lastFetchedAt: nowIso,
        latencyMs: Date.now() - nvdStart,
        notes: `NVD API unavailable (${err?.message || 'timeout'}); using labeled curated archive.`,
      });
    }

    // 3. Abuse.ch URLhaus Recent Malware Payloads (CSV recent public feed)
    const urlhausUrl = 'https://urlhaus.abuse.ch/downloads/csv_recent/';
    const uhStart = Date.now();
    try {
      const res = await fetchWithTimeout(urlhausUrl, 7000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const csvText = await res.text();
      const lines = csvText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'))
        .slice(0, 20);
      if (lines.length === 0) throw new Error('Empty URLhaus feed');
      let count = 0;
      for (const line of lines) {
        const cols = line.split('","').map((c) => c.replace(/^"|"$/g, ''));
        if (cols.length < 7) continue;
        const entryId = cols[0];
        const dateAdded = cols[1] || nowIso;
        const rawUrl = cols[2] || '';
        const threat = cols[5] || 'malware_download';
        const tags = cols[6] || 'dropper';
        const uhLink = cols[7] || urlhausUrl;
        const host = rawUrl.replace(/^https?:\/\//i, '').split('/')[0] || 'unknown-host';
        liveSamples.push({
          id: `LIVE-UH-${entryId || count}`,
          sourceId: 'abusech-urlhaus',
          acquisitionMode: 'live-public-api',
          title: `URLhaus ${threat} distribution host ${host}`,
          description: `Active malware payload distribution endpoint (${threat}) tagged [${tags}].`,
          label: 'RANSOMWARE_CAMPAIGN_LINKED',
          cvssScore: 8.7,
          ransomwareFlag: /ransom|lockbit|cobalt|loader|mirai|botnet|mozi|rat|stealer/i.test(
            `${threat} ${tags}`
          ),
          iocCount: 6,
          publishedAt: dateAdded,
          referenceUrl: uhLink,
        });
        count += 1;
      }
      if (count === 0) throw new Error('No parsed URLhaus rows');
      nextConnectors.push({
        id: 'abusech-urlhaus',
        name: 'Abuse.ch URLhaus Recent Malware Payloads',
        provider: 'abuse.ch',
        endpointUrl: urlhausUrl,
        license: 'CC0 1.0 Public Domain',
        acquisitionMode: 'live-public-api',
        status: 'synced',
        recordsIngested: count,
        lastFetchedAt: nowIso,
        latencyMs: Date.now() - uhStart,
        notes: `Live-ingested ${count} active malware distribution URLs from abuse.ch URLhaus recent feed.`,
      });
    } catch (err: any) {
      const fallback = CURATED_PUBLIC_TRAINING_ARCHIVE.filter((s) => s.sourceId === 'abusech-urlhaus');
      nextConnectors.push({
        id: 'abusech-urlhaus',
        name: 'Abuse.ch URLhaus Recent Malware Payloads',
        provider: 'abuse.ch',
        endpointUrl: urlhausUrl,
        license: 'CC0 1.0 Public Domain',
        acquisitionMode: 'curated-public-archive',
        status: 'fallback_archive',
        recordsIngested: fallback.length,
        lastFetchedAt: nowIso,
        latencyMs: Date.now() - uhStart,
        notes: `URLhaus unavailable (${err?.message || 'timeout'}); using labeled curated archive.`,
      });
    }

    // 4. CISA Advisories RSS
    const cisaRssUrl = 'https://www.cisa.gov/cybersecurity-advisories/all.xml';
    const cisaStart = Date.now();
    try {
      const res = await fetchWithTimeout(cisaRssUrl, 6500);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const items = parseRssItems(xml, 16);
      if (items.length === 0) throw new Error('Empty RSS feed');
      items.forEach((item, idx) => {
        liveSamples.push({
          id: `LIVE-CISA-RSS-${idx}-${Buffer.from(item.title).toString('hex').slice(0, 8)}`,
          sourceId: 'cisa-advisories',
          acquisitionMode: 'live-public-api',
          title: item.title,
          description: item.description.slice(0, 480),
          label: inferPublicRecordLabel({
            title: item.title,
            description: item.description,
            sourceId: 'cisa-advisories',
          }),
          cvssScore: /critical|rce|exploit|kev/i.test(item.title) ? 8.5 : 3.2,
          publishedAt: item.pubDate,
          referenceUrl: item.link,
        });
      });
      nextConnectors.push({
        id: 'cisa-advisories',
        name: 'CISA Cybersecurity Advisories RSS',
        provider: 'CISA.gov',
        endpointUrl: cisaRssUrl,
        license: 'Public Domain',
        acquisitionMode: 'live-public-api',
        status: 'synced',
        recordsIngested: items.length,
        lastFetchedAt: nowIso,
        latencyMs: Date.now() - cisaStart,
        notes: `Live-ingested ${items.length} advisories from CISA official RSS feed.`,
      });
    } catch (err: any) {
      const fallback = CURATED_PUBLIC_TRAINING_ARCHIVE.filter((s) => s.sourceId === 'cisa-advisories');
      nextConnectors.push({
        id: 'cisa-advisories',
        name: 'CISA Cybersecurity Advisories RSS',
        provider: 'CISA.gov',
        endpointUrl: cisaRssUrl,
        license: 'Public Domain',
        acquisitionMode: 'curated-public-archive',
        status: 'fallback_archive',
        recordsIngested: fallback.length,
        lastFetchedAt: nowIso,
        latencyMs: Date.now() - cisaStart,
        notes: `CISA RSS unavailable (${err?.message || 'timeout'}); using labeled curated archive.`,
      });
    }

    // 5. SANS ISC RSS
    const sansUrl = 'https://isc.sans.edu/rssfeed_full.xml';
    const sansStart = Date.now();
    try {
      const res = await fetchWithTimeout(sansUrl, 6500);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const items = parseRssItems(xml, 14);
      if (items.length === 0) throw new Error('Empty SANS feed');
      items.forEach((item, idx) => {
        liveSamples.push({
          id: `LIVE-SANS-${idx}-${Buffer.from(item.title).toString('hex').slice(0, 8)}`,
          sourceId: 'sans-isc',
          acquisitionMode: 'live-public-api',
          title: item.title,
          description: item.description.slice(0, 480),
          label: inferPublicRecordLabel({
            title: item.title,
            description: item.description,
            sourceId: 'sans-isc',
          }),
          cvssScore: /ransom|exploit|backdoor|cve/i.test(item.title) ? 7.8 : 2.9,
          publishedAt: item.pubDate,
          referenceUrl: item.link,
        });
      });
      nextConnectors.push({
        id: 'sans-isc',
        name: 'SANS Internet Storm Center Handlers Diary',
        provider: 'SANS Institute (ISC)',
        endpointUrl: sansUrl,
        license: 'Public Informational Feed',
        acquisitionMode: 'live-public-api',
        status: 'synced',
        recordsIngested: items.length,
        lastFetchedAt: nowIso,
        latencyMs: Date.now() - sansStart,
        notes: `Live-ingested ${items.length} SANS ISC operational diary reports.`,
      });
    } catch (err: any) {
      const fallback = CURATED_PUBLIC_TRAINING_ARCHIVE.filter((s) => s.sourceId === 'sans-isc');
      nextConnectors.push({
        id: 'sans-isc',
        name: 'SANS Internet Storm Center Handlers Diary',
        provider: 'SANS Institute (ISC)',
        endpointUrl: sansUrl,
        license: 'Public Informational Feed',
        acquisitionMode: 'curated-public-archive',
        status: 'fallback_archive',
        recordsIngested: fallback.length,
        lastFetchedAt: nowIso,
        latencyMs: Date.now() - sansStart,
        notes: `SANS ISC feed unavailable (${err?.message || 'timeout'}); using labeled curated archive.`,
      });
    }

    // 6. MITRE ATLAS & OWASP Agentic curated security corpus
    const agenticBaseline = CURATED_PUBLIC_TRAINING_ARCHIVE.filter(
      (s) => s.sourceId === 'mitre-owasp-agentic'
    );
    nextConnectors.push({
      id: 'mitre-owasp-agentic',
      name: 'OWASP Agentic V2 & MITRE ATLAS Taxonomy',
      provider: 'OWASP / MITRE',
      endpointUrl: 'https://atlas.mitre.org/',
      license: 'Apache 2.0 / CC BY-SA',
      acquisitionMode: 'curated-public-archive',
      status: 'synced',
      recordsIngested: agenticBaseline.length,
      lastFetchedAt: nowIso,
      latencyMs: 1,
      notes: 'Agentic prompt injection, MCP tool abuse, and SPIFFE workload anomaly supervision set.',
    });

    const dedup = new Map<string, PublicThreatSample>();
    for (const s of liveSamples) dedup.set(s.id, s);
    for (const s of CURATED_PUBLIC_TRAINING_ARCHIVE) {
      if (!dedup.has(s.id)) dedup.set(s.id, s);
    }

    trainingCorpus = Array.from(dedup.values()).slice(0, 240);
    connectorStatuses = nextConnectors;

    activeModel = trainThreatClassificationModel(trainingCorpus, {
      epochs: options?.epochs ?? 34,
      learningRate: options?.learningRate ?? 0.15,
    });

    syncRunCount += 1;
    lastSyncAt = new Date().toISOString();
    lastSyncTrigger = options?.trigger || 'manual';
    lastLiveFetchedCount = liveSamples.length;
    if (schedulerEnabled) {
      nextSyncAt = new Date(Date.now() + schedulerIntervalMs).toISOString();
    }

    persistMlState();
    emitOsEvent(
      'ai-ml-trainer',
      'ML_MODEL_RETRAINED',
      'info',
      `[${lastSyncTrigger.toUpperCase()}] Trained ${activeModel.modelId} on ${trainingCorpus.length} records (${liveSamples.length} live API). Val Acc: ${activeModel.evaluation.validationAccuracyPct}%, Macro F1: ${activeModel.evaluation.macroF1Pct}%.`
    );
    recordAuditFn?.(
      'ML Assurance Pipeline',
      'PUBLIC_DATA_ML_TRAINING_COMPLETED',
      'info',
      `[${lastSyncTrigger}] Model ${activeModel.modelId} trained on ${trainingCorpus.length} public records (${liveSamples.length} live API).`
    );
    publishThreatAlert({
      severity: 'info',
      source: 'ML Threat Classifier',
      category: 'KEV_CORRELATION',
      title: `AI Model Trained (${lastSyncTrigger}): ${activeModel.modelId}`,
      summary: `Supervised Softmax classifier calibrated on ${trainingCorpus.length} public records (${liveSamples.length} live). Macro F1: ${activeModel.evaluation.macroF1Pct}%.`,
      targetAsset: 'agent-trust-inference',
      actionTaken: 'MODEL_WEIGHTS_SEALED',
    });

    return {
      model: activeModel,
      connectors: connectorStatuses,
      liveFetchedCount: liveSamples.length,
      totalCorpusCount: trainingCorpus.length,
      scheduler: getMlSchedulerStatus(),
    };
  } finally {
    isSyncing = false;
  }
}

export function classifyWithTrainedModel(input: {
  title: string;
  description: string;
  cvssScore?: number;
  kevFlag?: boolean;
  ransomwareFlag?: boolean;
  iocCount?: number;
}): ThreatPredictionResult {
  if (!activeModel) {
    connectorStatuses = buildBaselineConnectorStatuses();
    trainingCorpus = [...CURATED_PUBLIC_TRAINING_ARCHIVE];
    activeModel = trainThreatClassificationModel(trainingCorpus, { epochs: 32, learningRate: 0.15 });
  }
  return predictThreatRisk(activeModel!, input);
}

export function classifyTrafficPattern(input: TrafficPatternInferenceInput): MlInferenceLogEntry {
  if (!activeModel) {
    connectorStatuses = buildBaselineConnectorStatuses();
    trainingCorpus = [...CURATED_PUBLIC_TRAINING_ARCHIVE];
    activeModel = trainThreatClassificationModel(trainingCorpus, { epochs: 32, learningRate: 0.15 });
  }
  const prediction = predictTrafficPatternRisk(activeModel!, input);
  const entry: MlInferenceLogEntry = {
    inferenceId: `INF-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 89)}`,
    timestamp: new Date().toISOString(),
    trafficPattern: input.trafficPattern,
    sourceEndpoint: input.sourceEndpoint || 'unknown-source',
    destinationEndpoint: input.destinationEndpoint || 'unknown-destination',
    protocol: input.protocol || 'TCP/HTTPS',
    destinationPort: input.destinationPort,
    packetRatePps: input.packetRatePps,
    prediction,
  };
  recentInferences = [entry, ...recentInferences].slice(0, 20);
  emitOsEvent(
    'agent-trust-ml-inference',
    'TRAFFIC_MODEL_INFERENCE',
    prediction.riskScore >= 75 ? 'warning' : 'info',
    `${entry.inferenceId}: "${entry.trafficPattern}" -> ${prediction.predictedClass} (Risk ${prediction.riskScore}/100, ${prediction.confidencePct}%).`
  );
  if (prediction.riskScore >= 75) {
    publishThreatAlert({
      severity: prediction.riskScore >= 88 ? 'critical' : 'high',
      source: 'AgentTrust ML Inference',
      category: prediction.predictedClass === 'AGENT_POLICY_ANOMALY' ? 'AGENT_POLICY_BLOCK' : 'TELEMETRY_EVENT',
      title: `ML Suspicious Traffic: ${prediction.predictedClass}`,
      summary: `${entry.trafficPattern} (${entry.sourceEndpoint} → ${entry.destinationEndpoint}) scored ${prediction.riskScore}/100 (${prediction.confidencePct}%).`,
      targetAsset: entry.destinationEndpoint,
      actionTaken: 'ML_TRAFFIC_FLAGGED_FOR_GATEWAY',
    });
  }
  return entry;
}

export function getPublicMlStatusSnapshot() {
  if (!activeModel) {
    connectorStatuses = buildBaselineConnectorStatuses();
    trainingCorpus = [...CURATED_PUBLIC_TRAINING_ARCHIVE];
    activeModel = trainThreatClassificationModel(trainingCorpus, { epochs: 32, learningRate: 0.15 });
  }
  return {
    model: activeModel!,
    connectors: connectorStatuses,
    scheduler: getMlSchedulerStatus(),
    recentInferences,
    recentCorpusSamples: trainingCorpus.slice(0, 24),
    totalCorpusCount: trainingCorpus.length,
  };
}
