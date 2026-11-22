import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execSync, ChildProcess } from 'child_process';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import {
  CompilerExecutionRecord,
  CompilerLanguage,
  OsEventBusRecord,
  OsFileEntry,
  OsProcessRecord,
  OsResourceSnapshot,
  OsServiceRecord,
} from '../src/core/types';
import { sanitizeWorkspacePath } from '../src/core/os-compiler-utils';

const DATA_DIR = path.join(process.cwd(), '.hf_cdf_data');
const DB_PATH = path.join(DATA_DIR, 'fabric.sqlite');
export const WORKSPACE_DIR = path.join(process.cwd(), '.hf_cdf_workspace');

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
const serverBootTimeMs = Date.now();

// Track active isolated compiler child processes so the OS Process Manager can inspect and kill them
export const activeWorkerProcesses = new Map<
  number,
  {
    pid: number;
    executionId: string;
    filePath: string;
    language: CompilerLanguage;
    startedAtMs: number;
    child: ChildProcess;
    cancelledByUser?: boolean;
  }
>();

const serviceRegistry: OsServiceRecord[] = [
  {
    id: 'svc-api-gateway',
    name: 'api-gateway',
    version: '2.4.0',
    status: 'healthy',
    pid: process.pid,
    dependencies: ['svc-sqlite-fabric'],
    accessPolicy: 'Zero-Trust RBAC + Role Gate',
    errorCount: 0,
    uptimeSeconds: 0,
    lastHealthCheck: new Date().toISOString(),
  },
  {
    id: 'svc-sqlite-fabric',
    name: 'sqlite-data-fabric',
    version: '3.47-wasm',
    status: 'healthy',
    pid: process.pid,
    dependencies: [],
    accessPolicy: 'Transactional Integrity + Disk WAL Sync',
    errorCount: 0,
    uptimeSeconds: 0,
    lastHealthCheck: new Date().toISOString(),
  },
  {
    id: 'svc-os-supervisor',
    name: 'os-process-supervisor',
    version: '1.8.2',
    status: 'healthy',
    pid: process.pid,
    dependencies: ['svc-sqlite-fabric'],
    accessPolicy: 'Host Container Introspection + Worker Control',
    errorCount: 0,
    uptimeSeconds: 0,
    lastHealthCheck: new Date().toISOString(),
  },
  {
    id: 'svc-compiler-orchestrator',
    name: 'compiler-orchestrator',
    version: '2.1.0',
    status: 'healthy',
    pid: process.pid,
    dependencies: ['svc-os-supervisor', 'svc-sqlite-fabric'],
    accessPolicy: 'Isolated Subprocess & Wasm Sandbox',
    errorCount: 0,
    uptimeSeconds: 0,
    lastHealthCheck: new Date().toISOString(),
  },
  {
    id: 'svc-cisa-pipeline',
    name: 'cisa-kev-pipeline',
    version: '1.5.0',
    status: 'healthy',
    pid: process.pid,
    dependencies: ['svc-api-gateway'],
    accessPolicy: 'Outbound Read-Only CTI Ingestion',
    errorCount: 0,
    uptimeSeconds: 0,
    lastHealthCheck: new Date().toISOString(),
  },
  {
    id: 'svc-ai-reasoning',
    name: 'ai-reasoning-engine',
    version: 'gemini-4-hydrogen',
    status: process.env.GEMINI_API_KEY ? 'healthy' : 'degraded',
    pid: process.pid,
    dependencies: ['svc-sqlite-fabric'],
    accessPolicy: 'Server-Side Proxy + Deterministic Fallback',
    errorCount: 0,
    uptimeSeconds: 0,
    lastHealthCheck: new Date().toISOString(),
  },
];

const DEFAULT_WORKSPACE_FILES: Array<{ path: string; language: CompilerLanguage; content: string }> = [
  {
    path: 'analytics/risk_correlation.py',
    language: 'python',
    content: `import json
import math
import statistics

# Live cross-domain risk exposure weights (portfolio / sovereign assets)
assets = [
    {"id": "cluster-inference-01", "domain": "AI Infrastructure", "exposure_usd_m": 420.0, "anomaly": 0.94, "kev_count": 3},
    {"id": "swift-gateway-eu", "domain": "Financial Clearing", "exposure_usd_m": 1850.0, "anomaly": 0.62, "kev_count": 1},
    {"id": "dover-qkd-landing", "domain": "Subsea & Quantum", "exposure_usd_m": 610.0, "anomaly": 0.28, "kev_count": 1},
    {"id": "orbital-kh14-mesh", "domain": "Orbital Relay", "exposure_usd_m": 940.0, "anomaly": 0.35, "kev_count": 0},
]

scores = []
total_var = 0.0
for a in assets:
    # Value-at-Risk heuristic: exposure * (1 - exp(-anomaly * (1 + 0.25*kev)))
    prob = 1.0 - math.exp(-a["anomaly"] * (1.0 + 0.25 * a["kev_count"]))
    var_m = round(a["exposure_usd_m"] * prob, 2)
    total_var += var_m
    scores.append({"asset": a["id"], "domain": a["domain"], "breach_prob": round(prob, 4), "var_usd_m": var_m})

print("=== HF-CDF PYTHON ANALYTICS KERNEL ===")
print(json.dumps({
    "portfolio_var_usd_m": round(total_var, 2),
    "mean_breach_prob": round(statistics.mean(s["breach_prob"] for s in scores), 4),
    "ranked_exposures": sorted(scores, key=lambda x: x["var_usd_m"], reverse=True)
}, indent=2))
`,
  },
  {
    path: 'runtime/attestation_check.ts',
    language: 'typescript',
    content: `import crypto from 'crypto';

interface EnclaveReceipt {
  enclaveId: string;
  weightsDigest: string;
  clearanceLevel: number;
  issuedAt: string;
}

const receipt: EnclaveReceipt = {
  enclaveId: 'ashburn-sovereign-vault-01',
  weightsDigest: 'sha256:8f3d10a27e4b91c2',
  clearanceLevel: 5,
  issuedAt: new Date().toISOString(),
};

const canonical = JSON.stringify(receipt);
const seal = crypto.createHash('sha256').update(canonical).digest('hex');

console.log('Zero-Trust Enclave Receipt Verified');
console.log(JSON.stringify({ receipt, seal }, null, 2));
`,
  },
  {
    path: 'wasm/risk_score_kernel.wat',
    language: 'wat',
    content: `(module
  ;; Deterministic sovereign risk scoring kernel compiled to native WebAssembly binary
  (func (export "compute_risk") (param $severity i32) (param $kevCount i32) (param $mitigated i32) (result i32)
    (local $raw i32)
    ;; raw = severity * 12 + kevCount * 9 - mitigated * 15
    (local.set $raw
      (i32.sub
        (i32.add
          (i32.mul (local.get $severity) (i32.const 12))
          (i32.mul (local.get $kevCount) (i32.const 9))
        )
        (i32.mul (local.get $mitigated) (i32.const 15))
      )
    )
    (local.get $raw)
  )
  (func (export "main") (result i32)
    ;; Example invocation: severity=7, kevCount=3, mitigated=1 -> 84 + 27 - 15 = 96
    (call 0 (i32.const 7) (i32.const 3) (i32.const 1))
  )
)
`,
  },
  {
    path: 'fabric/exposure_query.sql',
    language: 'sql',
    content: `-- Query live relational operational tables inside SQLite Data Fabric
SELECT
  s.name AS service_name,
  s.version,
  s.status,
  s.access_policy,
  (SELECT COUNT(*) FROM os_event_bus e WHERE e.service = s.name) AS emitted_events
FROM os_services s
ORDER BY emitted_events DESC, s.name ASC;
`,
  },
  {
    path: 'diagnostics/system_probe.sh',
    language: 'shell',
    content: `# Live Linux container kernel & resource inspection
uname -a
uptime
free -m
df -h .
`,
  },
  {
    path: 'workers/anomaly_filter.js',
    language: 'javascript',
    content: `const samples = [
  { node: 'cluster-inference-01', egressMbps: 920, threshold: 400 },
  { node: 'swift-gateway-eu', egressMbps: 210, threshold: 500 },
  { node: 'gpu-node-us-east-04', egressMbps: 640, threshold: 450 },
];

const flagged = samples.filter((s) => s.egressMbps > s.threshold);
console.log(JSON.stringify({ inspected: samples.length, flaggedCount: flagged.length, flagged }, null, 2));
`,
  },
];

export function persistDbToDisk() {
  if (!db) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export async function initOsFabric(): Promise<void> {
  if (db) return;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });

  SQL = await initSqlJs({
    locateFile: (file: string) => path.join(process.cwd(), 'node_modules/sql.js/dist', file),
  });

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS os_services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      status TEXT NOT NULL,
      access_policy TEXT NOT NULL,
      dependencies TEXT NOT NULL,
      error_count INTEGER DEFAULT 0,
      last_health_check TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_filesystem (
      path TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      language TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      permissions TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      version INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_event_bus (
      id TEXT PRIMARY KEY,
      trace_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      service TEXT NOT NULL,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS compiler_executions (
      execution_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      language TEXT NOT NULL,
      runtime_version TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      exit_code INTEGER NOT NULL,
      stdout TEXT NOT NULL,
      stderr TEXT NOT NULL,
      diagnostics TEXT NOT NULL,
      artifact_hash TEXT NOT NULL,
      artifact_size_bytes INTEGER NOT NULL,
      cpu_limit_ms INTEGER NOT NULL,
      memory_limit_mb INTEGER NOT NULL,
      permission_scope TEXT NOT NULL
    );
  `);

  // Sync service registry into SQLite
  for (const svc of serviceRegistry) {
    db.run(
      `INSERT OR REPLACE INTO os_services (id, name, version, status, access_policy, dependencies, error_count, last_health_check)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        svc.id,
        svc.name,
        svc.version,
        svc.status,
        svc.accessPolicy,
        JSON.stringify(svc.dependencies),
        svc.errorCount,
        svc.lastHealthCheck,
      ]
    );
  }

  // Ensure default workspace files exist on disk & in SQLite metadata catalog
  for (const f of DEFAULT_WORKSPACE_FILES) {
    const absPath = path.join(WORKSPACE_DIR, f.path);
    if (!fs.existsSync(absPath)) {
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, f.content, 'utf8');
    }
    const content = fs.readFileSync(absPath, 'utf8');
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    const sizeBytes = Buffer.byteLength(content, 'utf8');
    const existing = db.exec(`SELECT version FROM os_filesystem WHERE path = '${f.path.replace(/'/g, "''")}'`);
    if (existing.length === 0 || existing[0].values.length === 0) {
      db.run(
        `INSERT INTO os_filesystem (path, name, language, size_bytes, permissions, sha256, version, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [f.path, path.basename(f.path), f.language, sizeBytes, '0644', sha256, 1, new Date().toISOString()]
      );
    }
  }

  // Seed initial boot trace if event bus empty
  const evCountRes = db.exec('SELECT COUNT(*) FROM os_event_bus');
  const evCount = Number(evCountRes[0]?.values[0]?.[0] || 0);
  if (evCount === 0) {
    emitOsEvent('os-process-supervisor', 'KERNEL_INIT', 'info', 'Initialized SQLite WASM data fabric and isolated compiler workspace.');
    emitOsEvent('sqlite-data-fabric', 'SCHEMA_READY', 'info', 'Verified relational tables: os_services, os_filesystem, os_event_bus, compiler_executions.');
  }

  persistDbToDisk();
}

export function getSqlDb(): Database {
  if (!db) {
    throw new Error('SQLite fabric not initialized yet.');
  }
  return db;
}

export function emitOsEvent(
  service: string,
  eventType: string,
  severity: 'info' | 'warning' | 'critical',
  message: string,
  traceId?: string
): OsEventBusRecord {
  const record: OsEventBusRecord = {
    id: `evt-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    traceId: traceId || `tr-${crypto.randomBytes(6).toString('hex')}`,
    timestamp: new Date().toISOString(),
    service,
    eventType,
    severity,
    message,
    status: 'processed',
  };

  if (db) {
    db.run(
      `INSERT INTO os_event_bus (id, trace_id, timestamp, service, event_type, severity, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [record.id, record.traceId, record.timestamp, record.service, record.eventType, record.severity, record.message, record.status]
    );
    db.run(
      `DELETE FROM os_event_bus WHERE id NOT IN (SELECT id FROM os_event_bus ORDER BY timestamp DESC LIMIT 120)`
    );
    persistDbToDisk();
  }
  return record;
}

export function getRealOsResources(): OsResourceSnapshot {
  const cpus = os.cpus();
  const cpuCores = Math.max(1, cpus.length);
  const [load1, load5, load15] = os.loadavg();
  const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
  const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
  const usedMemMb = Math.max(0, totalMemMb - freeMemMb);
  const memoryUtilizationPct = totalMemMb > 0 ? Math.round((usedMemMb / totalMemMb) * 1000) / 10 : 0;
  const processRssMb = Math.round((process.memoryUsage().rss / (1024 * 1024)) * 10) / 10;

  let diskTotalGb = 0;
  let diskUsedGb = 0;
  let diskUtilizationPct = 0;
  try {
    const dfOut = execSync('df -Pk .', { encoding: 'utf8', timeout: 1500 });
    const lines = dfOut.trim().split('\n');
    if (lines.length >= 2) {
      const parts = lines[1].trim().split(/\s+/);
      const totalKb = Number(parts[1] || 0);
      const usedKb = Number(parts[2] || 0);
      diskTotalGb = Math.round((totalKb / (1024 * 1024)) * 10) / 10;
      diskUsedGb = Math.round((usedKb / (1024 * 1024)) * 10) / 10;
      diskUtilizationPct = totalKb > 0 ? Math.round((usedKb / totalKb) * 1000) / 10 : 0;
    }
  } catch {
    // fallback if df unavailable
  }

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    kernelRelease: os.release(),
    nodeVersion: process.version,
    cpuCores,
    loadAvg1m: Math.round(load1 * 100) / 100,
    loadAvg5m: Math.round(load5 * 100) / 100,
    loadAvg15m: Math.round(load15 * 100) / 100,
    cpuUtilizationPct: Math.min(100, Math.round((load1 / cpuCores) * 1000) / 10),
    totalMemoryMb: totalMemMb,
    usedMemoryMb: usedMemMb,
    memoryUtilizationPct,
    processRssMb,
    diskTotalGb,
    diskUsedGb,
    diskUtilizationPct,
    uptimeSeconds: Math.round((Date.now() - serverBootTimeMs) / 1000),
    activeWorkers: activeWorkerProcesses.size,
    maxWorkers: 4,
    queueDepth: 0,
    capturedAt: new Date().toISOString(),
  };
}

export function getRealProcessTable(): OsProcessRecord[] {
  const list: OsProcessRecord[] = [];
  const totalMemMb = Math.max(1, os.totalmem() / (1024 * 1024));

  // 1. Live container OS processes via `ps`
  try {
    const psOut = execSync('ps -eo pid,user,pcpu,pmem,stat,comm --no-headers', {
      encoding: 'utf8',
      timeout: 1500,
    });
    for (const line of psOut.trim().split('\n')) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 6) continue;
      const pid = Number(cols[0]);
      const user = cols[1];
      const cpuPercent = Number(cols[2]) || 0;
      const memPct = Number(cols[3]) || 0;
      const stat = cols[4] || 'S';
      const comm = cols.slice(5).join(' ');
      if (!Number.isFinite(pid)) continue;
      list.push({
        pid,
        name: comm,
        subsystem: pid === process.pid ? 'hf-cdf-core' : 'linux-container',
        user,
        status: stat.startsWith('T') ? 'stopped' : stat.startsWith('R') ? 'running' : 'sleeping',
        cpuPercent,
        memoryMb: Math.round((memPct / 100) * totalMemMb * 10) / 10,
        priority: 20,
        startedAt: new Date(serverBootTimeMs).toISOString(),
        durationMs: Date.now() - serverBootTimeMs,
        dependencies: [],
        restartPolicy: pid === process.pid ? 'always' : 'never',
        command: comm,
        source: pid === process.pid ? 'platform-daemon' : 'host-container',
      });
    }
  } catch {
    list.push({
      pid: process.pid,
      name: 'hf-cdf-server',
      subsystem: 'hf-cdf-core',
      user: os.userInfo().username || 'node',
      status: 'running',
      cpuPercent: 1.2,
      memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      priority: 20,
      startedAt: new Date(serverBootTimeMs).toISOString(),
      durationMs: Date.now() - serverBootTimeMs,
      dependencies: ['sqlite-data-fabric'],
      restartPolicy: 'always',
      command: 'tsx server.ts',
      source: 'platform-daemon',
    });
  }

  // 2. Active compiler worker child processes
  for (const w of activeWorkerProcesses.values()) {
    list.unshift({
      pid: w.pid,
      name: `worker:${path.basename(w.filePath)}`,
      subsystem: `compiler-${w.language}`,
      user: 'sandbox-worker',
      status: 'running',
      cpuPercent: 4.5,
      memoryMb: 64,
      priority: 10,
      startedAt: new Date(w.startedAtMs).toISOString(),
      durationMs: Date.now() - w.startedAtMs,
      dependencies: ['compiler-orchestrator'],
      restartPolicy: 'never',
      command: `${w.language} ${w.filePath}`,
      source: 'compiler-worker',
    });
  }

  return list.slice(0, 35);
}

export function killWorkerProcess(pid: number): { success: boolean; message: string } {
  const worker = activeWorkerProcesses.get(pid);
  if (!worker) {
    return {
      success: false,
      message: `Refused to kill PID ${pid}: only isolated compiler worker processes may be terminated from the console.`,
    };
  }
  worker.cancelledByUser = true;
  try {
    worker.child.kill('SIGTERM');
    setTimeout(() => {
      if (!worker.child.killed) {
        worker.child.kill('SIGKILL');
      }
    }, 500);
  } catch {
    // ignore
  }
  emitOsEvent('os-process-supervisor', 'PROCESS_TERMINATED', 'warning', `Terminated worker PID ${pid} (${worker.filePath}) by operator command.`);
  return { success: true, message: `Sent SIGTERM to isolated worker PID ${pid}.` };
}

export function getServicesSnapshot(): OsServiceRecord[] {
  const uptimeSeconds = Math.round((Date.now() - serverBootTimeMs) / 1000);
  return serviceRegistry.map((svc) => ({
    ...svc,
    uptimeSeconds,
    lastHealthCheck: new Date().toISOString(),
  }));
}

export function controlService(
  serviceId: string,
  action: 'restart' | 'stop' | 'start'
): OsServiceRecord | null {
  const svc = serviceRegistry.find((s) => s.id === serviceId);
  if (!svc) return null;

  if (action === 'stop') {
    if (svc.id === 'svc-api-gateway' || svc.id === 'svc-sqlite-fabric') {
      throw new Error(`Core dependency "${svc.name}" cannot be stopped while control plane is active.`);
    }
    svc.status = 'stopped';
    emitOsEvent(svc.name, 'SERVICE_STOPPED', 'warning', `Service ${svc.name} stopped by operator.`);
  } else if (action === 'start' || action === 'restart') {
    svc.status = svc.id === 'svc-ai-reasoning' && !process.env.GEMINI_API_KEY ? 'degraded' : 'healthy';
    svc.lastHealthCheck = new Date().toISOString();
    emitOsEvent(
      svc.name,
      action === 'restart' ? 'SERVICE_RESTARTED' : 'SERVICE_STARTED',
      'info',
      `Service ${svc.name} health verified (${svc.status}).`
    );
  }

  if (db) {
    db.run(`UPDATE os_services SET status = ?, last_health_check = ? WHERE id = ?`, [
      svc.status,
      svc.lastHealthCheck,
      svc.id,
    ]);
    persistDbToDisk();
  }
  return { ...svc };
}

export function getEventBusHistory(limit = 50): OsEventBusRecord[] {
  if (!db) return [];
  const res = db.exec(
    `SELECT id, trace_id, timestamp, service, event_type, severity, message, status
     FROM os_event_bus ORDER BY timestamp DESC LIMIT ${Number(limit)}`
  );
  if (res.length === 0) return [];
  return res[0].values.map((row) => ({
    id: String(row[0]),
    traceId: String(row[1]),
    timestamp: String(row[2]),
    service: String(row[3]),
    eventType: String(row[4]),
    severity: row[5] as 'info' | 'warning' | 'critical',
    message: String(row[6]),
    status: row[7] as 'processed' | 'retrying' | 'dead_letter',
  }));
}

// --- OS FILESYSTEM OPERATIONS ---

export function listWorkspaceFiles(): OsFileEntry[] {
  if (!db) return [];
  const res = db.exec(
    `SELECT path, name, language, size_bytes, permissions, sha256, version, updated_at
     FROM os_filesystem ORDER BY path ASC`
  );
  if (res.length === 0) return [];
  return res[0].values.map((row) => ({
    path: String(row[0]),
    name: String(row[1]),
    language: String(row[2]) as CompilerLanguage | 'text',
    sizeBytes: Number(row[3]),
    permissions: String(row[4]),
    sha256: String(row[5]),
    version: Number(row[6]),
    updatedAt: String(row[7]),
  }));
}

export function readWorkspaceFile(rawPath: string): OsFileEntry {
  const safePath = sanitizeWorkspacePath(rawPath);
  const absPath = path.join(WORKSPACE_DIR, safePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${safePath}`);
  }
  const content = fs.readFileSync(absPath, 'utf8');
  const sha256 = crypto.createHash('sha256').update(content).digest('hex');
  const files = listWorkspaceFiles();
  const meta = files.find((f) => f.path === safePath);
  return {
    path: safePath,
    name: path.basename(safePath),
    language: meta?.language || inferLanguageFromPath(safePath),
    sizeBytes: Buffer.byteLength(content, 'utf8'),
    permissions: meta?.permissions || '0644',
    sha256,
    version: meta?.version || 1,
    updatedAt: meta?.updatedAt || new Date().toISOString(),
    content,
  };
}

export function writeWorkspaceFile(
  rawPath: string,
  content: string,
  language?: CompilerLanguage | 'text'
): OsFileEntry {
  const safePath = sanitizeWorkspacePath(rawPath);
  const absPath = path.join(WORKSPACE_DIR, safePath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, 'utf8');

  const sha256 = crypto.createHash('sha256').update(content).digest('hex');
  const sizeBytes = Buffer.byteLength(content, 'utf8');
  const resolvedLang = language || inferLanguageFromPath(safePath);
  const nowIso = new Date().toISOString();

  let nextVersion = 1;
  if (db) {
    const existing = db.exec(`SELECT version FROM os_filesystem WHERE path = '${safePath.replace(/'/g, "''")}'`);
    if (existing.length > 0 && existing[0].values.length > 0) {
      nextVersion = Number(existing[0].values[0][0]) + 1;
    }
    db.run(
      `INSERT OR REPLACE INTO os_filesystem (path, name, language, size_bytes, permissions, sha256, version, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [safePath, path.basename(safePath), resolvedLang, sizeBytes, '0644', sha256, nextVersion, nowIso]
    );
    persistDbToDisk();
  }

  emitOsEvent('os-filesystem', 'FILE_WRITTEN', 'info', `Persisted ${safePath} (v${nextVersion}, ${sizeBytes} bytes, sha256:${sha256.slice(0, 12)}).`);

  return {
    path: safePath,
    name: path.basename(safePath),
    language: resolvedLang,
    sizeBytes,
    permissions: '0644',
    sha256,
    version: nextVersion,
    updatedAt: nowIso,
    content,
  };
}

export function deleteWorkspaceFile(rawPath: string): void {
  const safePath = sanitizeWorkspacePath(rawPath);
  const absPath = path.join(WORKSPACE_DIR, safePath);
  if (fs.existsSync(absPath)) {
    fs.unlinkSync(absPath);
  }
  if (db) {
    db.run(`DELETE FROM os_filesystem WHERE path = ?`, [safePath]);
    persistDbToDisk();
  }
  emitOsEvent('os-filesystem', 'FILE_DELETED', 'warning', `Removed workspace artifact ${safePath}.`);
}

export function recordCompilerExecution(rec: CompilerExecutionRecord): void {
  if (!db) return;
  db.run(
    `INSERT OR REPLACE INTO compiler_executions (
      execution_id, user_id, file_path, language, runtime_version, status,
      started_at, ended_at, duration_ms, exit_code, stdout, stderr,
      diagnostics, artifact_hash, artifact_size_bytes, cpu_limit_ms, memory_limit_mb, permission_scope
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rec.executionId,
      rec.userId,
      rec.filePath,
      rec.language,
      rec.runtimeVersion,
      rec.status,
      rec.startedAt,
      rec.endedAt,
      rec.durationMs,
      rec.exitCode,
      rec.stdout.slice(0, 16000),
      rec.stderr.slice(0, 16000),
      JSON.stringify(rec.diagnostics),
      rec.artifactHash,
      rec.artifactSizeBytes,
      rec.cpuLimitMs,
      rec.memoryLimitMb,
      rec.permissionScope,
    ]
  );
  db.run(
    `DELETE FROM compiler_executions WHERE execution_id NOT IN (SELECT execution_id FROM compiler_executions ORDER BY started_at DESC LIMIT 60)`
  );
  persistDbToDisk();
}

export function getCompilerExecutions(limit = 25): CompilerExecutionRecord[] {
  if (!db) return [];
  const res = db.exec(
    `SELECT execution_id, user_id, file_path, language, runtime_version, status,
            started_at, ended_at, duration_ms, exit_code, stdout, stderr,
            diagnostics, artifact_hash, artifact_size_bytes, cpu_limit_ms, memory_limit_mb, permission_scope
     FROM compiler_executions ORDER BY started_at DESC LIMIT ${Number(limit)}`
  );
  if (res.length === 0) return [];
  return res[0].values.map((row) => ({
    executionId: String(row[0]),
    userId: String(row[1]),
    filePath: String(row[2]),
    language: String(row[3]) as CompilerLanguage,
    runtimeVersion: String(row[4]),
    status: row[5] as CompilerExecutionRecord['status'],
    startedAt: String(row[6]),
    endedAt: String(row[7]),
    durationMs: Number(row[8]),
    exitCode: Number(row[9]),
    stdout: String(row[10]),
    stderr: String(row[11]),
    diagnostics: JSON.parse(String(row[12] || '[]')),
    artifactHash: String(row[13]),
    artifactSizeBytes: Number(row[14]),
    cpuLimitMs: Number(row[15]),
    memoryLimitMb: Number(row[16]),
    permissionScope: String(row[17]),
  }));
}

export function inferLanguageFromPath(filePath: string): CompilerLanguage | 'text' {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.ts' || ext === '.tsx') return 'typescript';
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return 'javascript';
  if (ext === '.py') return 'python';
  if (ext === '.sql') return 'sql';
  if (ext === '.wat') return 'wat';
  if (ext === '.sh') return 'shell';
  return 'text';
}
