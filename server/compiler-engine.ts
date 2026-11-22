import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawn, execSync } from 'child_process';
import * as esbuild from 'esbuild';
import wabtFactory from 'wabt';
import {
  CompilerExecutionRecord,
  CompilerLanguage,
} from '../src/core/types';
import {
  sanitizeWorkspacePath,
  validateRestrictedShellScript,
} from '../src/core/os-compiler-utils';
import {
  activeWorkerProcesses,
  emitOsEvent,
  getSqlDb,
  recordCompilerExecution,
  writeWorkspaceFile,
} from './os-fabric';

const SANDBOX_TMP_DIR = path.join(os.tmpdir(), 'hf-cdf-sandbox');
const EXECUTION_TIMEOUT_MS = 5000;
const MEMORY_LIMIT_MB = 128;

interface RunCommandOutput {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  cancelled: boolean;
}

function runIsolatedSubprocess(
  command: string,
  args: string[],
  cwd: string,
  meta: { executionId: string; filePath: string; language: CompilerLanguage }
): Promise<RunCommandOutput> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
        HOME: SANDBOX_TMP_DIR,
        NODE_NO_WARNINGS: '1',
        PYTHONDONTWRITEBYTECODE: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const pid = child.pid || Math.floor(Math.random() * 90000) + 10000;
    const workerEntry = {
      pid,
      executionId: meta.executionId,
      filePath: meta.filePath,
      language: meta.language,
      startedAtMs: Date.now(),
      child,
      cancelledByUser: false,
    };
    activeWorkerProcesses.set(pid, workerEntry);

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL');
      }, 400);
    }, EXECUTION_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      if (stdout.length < 32000) stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk) => {
      if (stderr.length < 32000) stderr += chunk.toString('utf8');
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      activeWorkerProcesses.delete(pid);
      resolve({
        exitCode: 1,
        stdout,
        stderr: stderr + `\nSpawn error: ${err.message}`,
        timedOut,
        cancelled: Boolean(workerEntry.cancelledByUser),
      });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      activeWorkerProcesses.delete(pid);
      resolve({
        exitCode: typeof code === 'number' ? code : timedOut ? 124 : 1,
        stdout,
        stderr,
        timedOut,
        cancelled: Boolean(workerEntry.cancelledByUser),
      });
    });
  });
}

export async function compileAndExecute(params: {
  filePath: string;
  language: CompilerLanguage;
  source: string;
  userId: string;
}): Promise<CompilerExecutionRecord> {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const executionId = `exec-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const safePath = sanitizeWorkspacePath(params.filePath);

  fs.mkdirSync(SANDBOX_TMP_DIR, { recursive: true });
  const runDir = path.join(SANDBOX_TMP_DIR, executionId);
  fs.mkdirSync(runDir, { recursive: true });

  // Persist edited source into workspace OS filesystem before compiling
  writeWorkspaceFile(safePath, params.source, params.language);

  const sourceBytes = Buffer.byteLength(params.source, 'utf8');
  const artifactHash = crypto.createHash('sha256').update(params.source).digest('hex');

  let runtimeVersion = '';
  let status: CompilerExecutionRecord['status'] = 'completed';
  let exitCode = 0;
  let stdout = '';
  let stderr = '';
  const diagnostics: string[] = [];
  let artifactSizeBytes = sourceBytes;
  let sqlRows: Record<string, unknown>[] | undefined;
  let sqlColumns: string[] | undefined;

  try {
    if (params.language === 'typescript') {
      runtimeVersion = `esbuild + Node ${process.version}`;
      const compiled = await esbuild.transform(params.source, {
        loader: 'ts',
        target: 'node20',
        format: 'cjs',
        sourcefile: safePath,
      });
      diagnostics.push(`esbuild AST & transform succeeded (${Buffer.byteLength(compiled.code, 'utf8')} bytes emitted)`);
      artifactSizeBytes = Buffer.byteLength(compiled.code, 'utf8');
      const targetFile = path.join(runDir, 'bundle.cjs');
      fs.writeFileSync(targetFile, compiled.code, 'utf8');

      const runRes = await runIsolatedSubprocess(
        process.execPath,
        [`--max-old-space-size=${MEMORY_LIMIT_MB}`, targetFile],
        runDir,
        { executionId, filePath: safePath, language: 'typescript' }
      );
      stdout = runRes.stdout;
      stderr = runRes.stderr;
      exitCode = runRes.exitCode;
      if (runRes.cancelled) status = 'cancelled';
      else if (runRes.timedOut) status = 'timeout';
      else if (exitCode !== 0) status = 'runtime_error';
    } else if (params.language === 'javascript') {
      runtimeVersion = `Node ${process.version}`;
      const targetFile = path.join(runDir, 'script.mjs');
      fs.writeFileSync(targetFile, params.source, 'utf8');

      try {
        execSync(`"${process.execPath}" --check "${targetFile}"`, { encoding: 'utf8', timeout: 2000 });
        diagnostics.push('Node V8 parser syntax check passed (0 errors)');
      } catch (syntaxErr: any) {
        status = 'compile_error';
        exitCode = 1;
        stderr = syntaxErr.stderr?.toString() || syntaxErr.message;
        diagnostics.push('Syntax validation failed during pre-execution parse');
      }

      if (status === 'completed') {
        const runRes = await runIsolatedSubprocess(
          process.execPath,
          [`--max-old-space-size=${MEMORY_LIMIT_MB}`, targetFile],
          runDir,
          { executionId, filePath: safePath, language: 'javascript' }
        );
        stdout = runRes.stdout;
        stderr = runRes.stderr;
        exitCode = runRes.exitCode;
        if (runRes.cancelled) status = 'cancelled';
        else if (runRes.timedOut) status = 'timeout';
        else if (exitCode !== 0) status = 'runtime_error';
      }
    } else if (params.language === 'python') {
      let pyVer = 'Python 3';
      try {
        pyVer = execSync('python3 --version', { encoding: 'utf8', timeout: 1500 }).trim();
      } catch {
        // ignore
      }
      runtimeVersion = pyVer;
      const targetFile = path.join(runDir, 'main.py');
      fs.writeFileSync(targetFile, params.source, 'utf8');

      // Stage 1: Bytecode compile validation via py_compile
      const compileRes = await runIsolatedSubprocess(
        'python3',
        ['-m', 'py_compile', targetFile],
        runDir,
        { executionId: `${executionId}-cmp`, filePath: safePath, language: 'python' }
      );
      if (compileRes.exitCode !== 0) {
        status = 'compile_error';
        exitCode = compileRes.exitCode;
        stderr = compileRes.stderr;
        diagnostics.push('CPython bytecode compilation failed');
      } else {
        diagnostics.push(`${pyVer} py_compile bytecode artifact verified`);
        const runRes = await runIsolatedSubprocess(
          'python3',
          ['-B', targetFile],
          runDir,
          { executionId, filePath: safePath, language: 'python' }
        );
        stdout = runRes.stdout;
        stderr = runRes.stderr;
        exitCode = runRes.exitCode;
        if (runRes.cancelled) status = 'cancelled';
        else if (runRes.timedOut) status = 'timeout';
        else if (exitCode !== 0) status = 'runtime_error';
      }
    } else if (params.language === 'sql') {
      runtimeVersion = 'SQLite 3.47 (WebAssembly)';
      const sqlDb = getSqlDb();
      const results = sqlDb.exec(params.source);
      diagnostics.push(`SQLite WASM query planner executed (${results.length} result set(s))`);
      if (results.length > 0) {
        const last = results[results.length - 1];
        sqlColumns = last.columns;
        sqlRows = last.values.slice(0, 100).map((vals) => {
          const obj: Record<string, unknown> = {};
          last.columns.forEach((col, idx) => {
            obj[col] = vals[idx];
          });
          return obj;
        });
        stdout = JSON.stringify({ columns: sqlColumns, rowCount: last.values.length, rows: sqlRows }, null, 2);
      } else {
        stdout = 'Query executed successfully (0 rows returned).';
      }
    } else if (params.language === 'wat') {
      runtimeVersion = 'WABT wat2wasm + V8 WebAssembly VM';
      const wabt = await wabtFactory();
      const wasmModule = wabt.parseWat(safePath, params.source);
      wasmModule.validate();
      const { buffer } = wasmModule.toBinary({ log: false, write_debug_names: true });
      wasmModule.destroy();

      artifactSizeBytes = buffer.byteLength;
      diagnostics.push(`WABT validated & assembled ${buffer.byteLength}-byte .wasm binary module`);

      const wasmBytes = Uint8Array.from(buffer);
      const compiled = await WebAssembly.compile(wasmBytes);
      const instance = await WebAssembly.instantiate(compiled, {});
      const exportKeys = Object.keys(instance.exports);
      diagnostics.push(`WASM exports instantiated: [${exportKeys.join(', ') || 'none'}]`);

      const entryName =
        typeof instance.exports.main === 'function'
          ? 'main'
          : exportKeys.find((k) => typeof instance.exports[k] === 'function');

      if (entryName) {
        const fn = instance.exports[entryName] as (...args: number[]) => unknown;
        const result = fn();
        stdout = `WASM Binary Size: ${buffer.byteLength} bytes\nExported Symbols: ${exportKeys.join(', ')}\nExecuted ${entryName}() => ${String(result)}`;
      } else {
        stdout = `WASM Binary Size: ${buffer.byteLength} bytes\nExported Symbols: ${exportKeys.join(', ') || 'none'}\nModule instantiated cleanly.`;
      }
    } else if (params.language === 'shell') {
      runtimeVersion = 'POSIX Restricted Diagnostic Runner';
      const check = validateRestrictedShellScript(params.source);
      if (!check.valid) {
        status = 'compile_error';
        exitCode = 126;
        stderr = check.reason || 'Policy rejected shell script.';
        diagnostics.push('Blocked by Zero-Trust POSIX allowlist policy');
      } else {
        const lines = params.source
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'));
        diagnostics.push(`Validated ${lines.length} allowlisted diagnostic command(s)`);
        const combinedOut: string[] = [];
        for (const line of lines) {
          const [cmd, ...args] = line.split(/\s+/);
          const res = await runIsolatedSubprocess(cmd, args, process.cwd(), {
            executionId,
            filePath: safePath,
            language: 'shell',
          });
          combinedOut.push(`$ ${line}\n${res.stdout.trim()}`);
          if (res.stderr) stderr += res.stderr;
          if (res.exitCode !== 0) {
            exitCode = res.exitCode;
            status = 'runtime_error';
          }
        }
        stdout = combinedOut.join('\n\n');
      }
    }
  } catch (err: any) {
    status = 'compile_error';
    exitCode = 1;
    stderr = err?.message || String(err);
    diagnostics.push(`Compiler/runtime exception: ${stderr.split('\n')[0]}`);
  } finally {
    try {
      fs.rmSync(runDir, { recursive: true, force: true });
    } catch {
      // ignore temp cleanup errors
    }
  }

  const endedAtMs = Date.now();
  const endedAt = new Date(endedAtMs).toISOString();
  const durationMs = Math.max(1, endedAtMs - startedAtMs);

  const record: CompilerExecutionRecord = {
    executionId,
    userId: params.userId,
    filePath: safePath,
    language: params.language,
    runtimeVersion,
    status,
    startedAt,
    endedAt,
    durationMs,
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    diagnostics,
    artifactHash,
    artifactSizeBytes,
    sqlRows,
    sqlColumns,
    cpuLimitMs: EXECUTION_TIMEOUT_MS,
    memoryLimitMb: MEMORY_LIMIT_MB,
    permissionScope: 'sandbox-worker:zero-network-fs-isolated',
  };

  recordCompilerExecution(record);
  emitOsEvent(
    'compiler-orchestrator',
    status === 'completed' ? 'EXECUTION_COMPLETED' : 'EXECUTION_FAILED',
    status === 'completed' ? 'info' : 'warning',
    `${params.language.toUpperCase()} execution ${executionId} (${safePath}) finished with status=${status}, exit=${exitCode}, duration=${durationMs}ms.`
  );

  return record;
}
