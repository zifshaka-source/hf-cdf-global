import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Cpu,
  Database,
  FileCode2,
  FilePlus2,
  HardDrive,
  History,
  Layers,
  Play,
  RefreshCw,
  RotateCw,
  Save,
  Server,
  Shield,
  Square,
  Terminal,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  CompilerExecutionRecord,
  CompilerLanguage,
  OsFileEntry,
  OsTelemetryBundle,
} from '../../core/types';
import { COMPILER_LANGUAGE_ADAPTERS } from '../../core/os-compiler-utils';
import { api } from '../../services/api';
import { sound } from '../../core/sound-fx';

interface OperatingSystemConsoleProps {
  onNotify?: (message: string, type?: 'info' | 'success' | 'alert') => void;
  initialTab?: 'compiler' | 'processes' | 'services';
}

const STARTER_TEMPLATES: Record<CompilerLanguage, string> = {
  python: `import json, platform\nprint(json.dumps({"runtime": platform.python_version(), "status": "verified"}))\n`,
  typescript: `const computeScore = (a: number, b: number): number => Math.round((a + b) / 2);\nconsole.log(JSON.stringify({ engine: "esbuild+node", score: computeScore(91, 97) }));\n`,
  javascript: `console.log(JSON.stringify({ node: process.version, pid: process.pid, ts: new Date().toISOString() }));\n`,
  sql: `SELECT file_path, language, status, duration_ms, exit_code\nFROM compiler_executions\nORDER BY started_at DESC\nLIMIT 15;\n`,
  wat: `(module\n  (func (export "main") (param $a i32) (param $b i32) (result i32)\n    (i32.add (local.get $a) (local.get $b))\n  )\n)\n`,
  shell: `uname -a\ndf -h .\nfree -m\n`,
};

export const OperatingSystemConsole: React.FC<OperatingSystemConsoleProps> = ({
  onNotify,
  initialTab = 'compiler',
}) => {
  const [activeTab, setActiveTab] = useState<'compiler' | 'processes' | 'services'>(initialTab);
  const [telemetry, setTelemetry] = useState<OsTelemetryBundle | null>(null);
  const [files, setFiles] = useState<OsFileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [editorSource, setEditorSource] = useState<string>('');
  const [savedSource, setSavedSource] = useState<string>('');
  const [language, setLanguage] = useState<CompilerLanguage>('python');
  const [executions, setExecutions] = useState<CompilerExecutionRecord[]>([]);
  const [latestExecution, setLatestExecution] = useState<CompilerExecutionRecord | null>(null);

  const [isExecuting, setIsExecuting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [showNewFileForm, setShowNewFileForm] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');
  const [newFileLang, setNewFileLang] = useState<CompilerLanguage>('python');
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  const loadTelemetry = useCallback(async () => {
    const data = await api.getOsTelemetry();
    if (data) setTelemetry(data);
  }, []);

  useEffect(() => {
    let active = true;
    const initWorkspace = async () => {
      setIsLoadingFiles(true);
      try {
        const [fileList, execList] = await Promise.all([
          api.listOsFiles(),
          api.getCompilerExecutions(),
        ]);
        if (!active) return;
        setFiles(fileList);
        setExecutions(execList);
        if (execList.length > 0) {
          setLatestExecution(execList[0]);
        }
        if (fileList.length > 0) {
          const defaultFile =
            fileList.find((f) => f.path.endsWith('.py')) || fileList[0];
          const loaded = await api.readOsFile(defaultFile.path);
          if (!active) return;
          setSelectedPath(loaded.path);
          const content = loaded.content ?? '';
          setEditorSource(content);
          setSavedSource(content);
          if (loaded.language !== 'text') {
            setLanguage(loaded.language);
          }
        }
      } catch (err) {
        if (active) {
          onNotify?.(
            `Failed to load OS workspace: ${err instanceof Error ? err.message : String(err)}`,
            'alert'
          );
        }
      } finally {
        if (active) setIsLoadingFiles(false);
      }
    };
    loadTelemetry();
    initWorkspace();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      loadTelemetry();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadTelemetry]);

  const handleOpenFile = async (filePath: string) => {
    try {
      sound.play('click');
      const loaded = await api.readOsFile(filePath);
      setSelectedPath(loaded.path);
      const content = loaded.content ?? '';
      setEditorSource(content);
      setSavedSource(content);
      if (loaded.language !== 'text') {
        setLanguage(loaded.language);
      }
    } catch (err) {
      onNotify?.(
        `Could not read ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
        'alert'
      );
    }
  };

  const handleSaveFile = async () => {
    if (!selectedPath) return;
    setIsSaving(true);
    try {
      const saved = await api.saveOsFile(selectedPath, editorSource, language);
      setSavedSource(editorSource);
      setFiles((prev) =>
        prev.map((f) => (f.path === saved.path ? { ...f, ...saved } : f))
      );
      sound.play('click');
      onNotify?.(`Saved ${saved.path} (v${saved.version})`, 'success');
      await loadTelemetry();
    } catch (err) {
      onNotify?.(
        `Save failed: ${err instanceof Error ? err.message : String(err)}`,
        'alert'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFilePath.trim();
    if (!trimmed) return;
    const adapter = COMPILER_LANGUAGE_ADAPTERS.find((a) => a.id === newFileLang);
    const finalPath = trimmed.includes('.')
      ? trimmed
      : `${trimmed}${adapter?.extension || '.txt'}`;

    try {
      const created = await api.saveOsFile(
        finalPath,
        STARTER_TEMPLATES[newFileLang],
        newFileLang
      );
      setFiles((prev) => [created, ...prev.filter((f) => f.path !== created.path)]);
      setSelectedPath(created.path);
      setEditorSource(STARTER_TEMPLATES[newFileLang]);
      setSavedSource(STARTER_TEMPLATES[newFileLang]);
      setLanguage(newFileLang);
      setNewFilePath('');
      setShowNewFileForm(false);
      onNotify?.(`Created workspace file ${created.path}`, 'success');
      await loadTelemetry();
    } catch (err) {
      onNotify?.(
        `File creation blocked: ${err instanceof Error ? err.message : String(err)}`,
        'alert'
      );
    }
  };

  const handleDeleteFile = async (filePath: string) => {
    try {
      await api.deleteOsFile(filePath);
      const remaining = files.filter((f) => f.path !== filePath);
      setFiles(remaining);
      if (selectedPath === filePath) {
        if (remaining.length > 0) {
          await handleOpenFile(remaining[0].path);
        } else {
          setSelectedPath('');
          setEditorSource('');
          setSavedSource('');
        }
      }
      onNotify?.(`Deleted ${filePath}`, 'info');
      await loadTelemetry();
    } catch (err) {
      onNotify?.(
        `Delete failed: ${err instanceof Error ? err.message : String(err)}`,
        'alert'
      );
    }
  };

  const handleCompileAndExecute = async () => {
    if (!selectedPath || isExecuting) return;
    setIsExecuting(true);
    sound.play('radar');
    try {
      const record = await api.executeCompiler({
        filePath: selectedPath,
        language,
        source: editorSource,
      });
      setSavedSource(editorSource);
      setLatestExecution(record);
      setExecutions((prev) => [record, ...prev.slice(0, 29)]);
      const freshFiles = await api.listOsFiles();
      setFiles(freshFiles);
      await loadTelemetry();
      if (record.status === 'completed') {
        onNotify?.(
          `Executed ${record.filePath} (${record.language}) in ${record.durationMs}ms`,
          'success'
        );
      } else {
        onNotify?.(
          `${record.language.toUpperCase()} returned ${record.status} (exit ${record.exitCode})`,
          'alert'
        );
      }
    } catch (err) {
      onNotify?.(
        `Execution failed: ${err instanceof Error ? err.message : String(err)}`,
        'alert'
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKillProcess = async (pid: number) => {
    setBusyActionId(`pid-${pid}`);
    try {
      await api.killOsProcess(pid);
      onNotify?.(`Sent SIGTERM to worker PID ${pid}`, 'info');
      await loadTelemetry();
    } catch (err) {
      onNotify?.(
        `Cannot terminate PID ${pid}: ${err instanceof Error ? err.message : String(err)}`,
        'alert'
      );
    } finally {
      setBusyActionId(null);
    }
  };

  const handleControlService = async (
    id: string,
    action: 'start' | 'stop' | 'restart'
  ) => {
    setBusyActionId(`svc-${id}`);
    try {
      await api.controlOsService(id, action);
      onNotify?.(`Service "${id}" action "${action}" completed`, 'success');
      await loadTelemetry();
    } catch (err) {
      onNotify?.(
        `Service control failed: ${err instanceof Error ? err.message : String(err)}`,
        'alert'
      );
    } finally {
      setBusyActionId(null);
    }
  };

  const activeAdapter = useMemo(
    () =>
      COMPILER_LANGUAGE_ADAPTERS.find((a) => a.id === language) ||
      COMPILER_LANGUAGE_ADAPTERS[0],
    [language]
  );

  const isDirty = editorSource !== savedSource;
  const lineCount = editorSource ? editorSource.split('\n').length : 1;
  const resources = telemetry?.resources;

  return (
    <div className="space-y-6 font-sans">
      {/* OS Header & Live Container Spec */}
      <div className="apple-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded-md bg-[#0a84ff]/15 border border-[#0a84ff]/35 text-[#2997ff] font-semibold">
                HF-CDF OS KERNEL FABRIC
              </span>
              <span className="text-[#6e6e73]">/</span>
              <span className="text-[#a1a1a6]">
                {resources
                  ? `${resources.hostname} · ${resources.platform} (${resources.arch}) · Kernel ${resources.kernelRelease}`
                  : 'Inspecting host runtime...'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#f5f5f7] tracking-tight">
              Sovereign Operating Environment &amp; Multi-Language Compiler
            </h1>
            <p className="text-xs text-[#a1a1a6] max-w-4xl">
              Real Linux container process &amp; resource telemetry, persistent WASM SQLite relational storage, service lifecycle control, and isolated polyglot compilation across TypeScript, JavaScript, Python 3, SQL, WebAssembly (WAT), and allowlisted POSIX diagnostics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {(
              [
                { id: 'compiler', label: 'Compiler & Runtime', icon: FileCode2 },
                { id: 'processes', label: 'OS Processes & Resources', icon: Cpu },
                { id: 'services', label: 'Services & Event Bus', icon: Layers },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 transition-all border ${
                    isActive
                      ? 'bg-[#0071e3] text-white border-[#0a84ff] shadow-sm'
                      : 'bg-[#161618] text-[#a1a1a6] hover:text-[#f5f5f7] border-white/[0.1]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Host Resource Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-white/[0.08] text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-[#111113] border border-white/[0.08]">
            <div className="text-[10px] text-[#86868b]">CPU UTILIZATION</div>
            <div className="text-sm font-bold text-[#2997ff] tabular-nums mt-0.5">
              {resources ? `${resources.cpuUtilizationPct}% · ${resources.cpuCores} CORES` : '—'}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#111113] border border-white/[0.08]">
            <div className="text-[10px] text-[#86868b]">MEMORY (HOST)</div>
            <div className="text-sm font-bold text-[#f5f5f7] tabular-nums mt-0.5">
              {resources
                ? `${resources.usedMemoryMb}/${resources.totalMemoryMb} MB (${resources.memoryUtilizationPct}%)`
                : '—'}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#111113] border border-white/[0.08]">
            <div className="text-[10px] text-[#86868b]">RUNTIME RSS</div>
            <div className="text-sm font-bold text-[#f5f5f7] tabular-nums mt-0.5">
              {resources ? `${resources.processRssMb} MB` : '—'}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#111113] border border-white/[0.08]">
            <div className="text-[10px] text-[#86868b]">DISK WORKSPACE</div>
            <div className="text-sm font-bold text-[#f5f5f7] tabular-nums mt-0.5">
              {resources
                ? `${resources.diskUsedGb}/${resources.diskTotalGb} GB (${resources.diskUtilizationPct}%)`
                : '—'}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#111113] border border-white/[0.08]">
            <div className="text-[10px] text-[#86868b]">WORKER SLOTS</div>
            <div className="text-sm font-bold text-[#30d158] tabular-nums mt-0.5">
              {resources ? `${resources.activeWorkers}/${resources.maxWorkers} ACTIVE` : '—'}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#111113] border border-white/[0.08]">
            <div className="text-[10px] text-[#86868b]">EXECUTIONS LOGGED</div>
            <div className="text-sm font-bold text-[#64d2ff] tabular-nums mt-0.5">
              {telemetry ? telemetry.executionsCount : executions.length}
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: MULTI-LANGUAGE COMPILER & EXECUTION WORKBENCH */}
      {activeTab === 'compiler' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left File Explorer */}
          <div className="lg:col-span-3 apple-card p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#f5f5f7]">
                  <HardDrive className="w-3.5 h-3.5 text-[#0a84ff]" />
                  <span>WORKSPACE FILES</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewFileForm(!showNewFileForm)}
                  className="px-2 py-1 rounded-lg bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-white/[0.1] text-[11px] font-mono text-[#f5f5f7] flex items-center gap-1"
                >
                  <FilePlus2 className="w-3 h-3 text-[#0a84ff]" />
                  <span>New</span>
                </button>
              </div>

              {showNewFileForm && (
                <form
                  onSubmit={handleCreateFile}
                  className="p-3 rounded-xl bg-[#111113] border border-white/[0.1] space-y-2"
                >
                  <input
                    type="text"
                    value={newFilePath}
                    onChange={(e) => setNewFilePath(e.target.value)}
                    placeholder="analytics/probe.py"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#1c1c1e] border border-white/[0.1] text-xs font-mono text-[#f5f5f7] focus:outline-none focus:border-[#0a84ff]"
                    required
                  />
                  <select
                    value={newFileLang}
                    onChange={(e) => setNewFileLang(e.target.value as CompilerLanguage)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#1c1c1e] border border-white/[0.1] text-xs font-mono text-[#f5f5f7]"
                  >
                    {COMPILER_LANGUAGE_ADAPTERS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-mono font-semibold"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewFileForm(false)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#1c1c1e] text-[#a1a1a6] hover:text-[#f5f5f7] text-xs font-mono"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {isLoadingFiles ? (
                  <div className="text-xs font-mono text-[#86868b] py-4 text-center">
                    Scanning .hf_cdf_workspace...
                  </div>
                ) : (
                  files.map((file) => {
                    const isSelected = selectedPath === file.path;
                    return (
                      <div
                        key={file.path}
                        className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#0a84ff]/15 border-[#0a84ff]/50 text-[#f5f5f7]'
                            : 'bg-[#111113] border-white/[0.07] text-[#a1a1a6] hover:border-white/[0.16] hover:text-[#f5f5f7]'
                        }`}
                        onClick={() => handleOpenFile(file.path)}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-medium truncate">
                            {file.path}
                          </div>
                          <div className="text-[10px] font-mono text-[#86868b] flex items-center gap-2">
                            <span className="uppercase">{file.language}</span>
                            <span>·</span>
                            <span>{file.sizeBytes}B</span>
                            <span>·</span>
                            <span>v{file.version}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.path);
                          }}
                          title={`Delete ${file.path}`}
                          className="p-1 text-[#6e6e73] hover:text-[#ff453a] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] text-[10px] font-mono text-[#86868b] space-y-1">
              <div className="text-[#2997ff] font-semibold">PERSISTENT FABRIC STORAGE</div>
              <div>Disk Root: .hf_cdf_workspace/</div>
              <div>SQLite Store: .hf_cdf_data/fabric.sqlite</div>
            </div>
          </div>

          {/* Center Editor & Execution Controls */}
          <div className="lg:col-span-5 apple-card p-4 flex flex-col space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
              <div className="min-w-0">
                <div className="text-xs font-mono font-semibold text-[#f5f5f7] truncate">
                  {selectedPath || 'No file selected'}
                  {isDirty && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30">
                      UNSAVED
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-[#86868b] mt-0.5">
                  {activeAdapter.runtimeName} · {activeAdapter.isolationPolicy}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  aria-label="Compiler Language Adapter"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as CompilerLanguage)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#111113] border border-white/[0.12] text-xs font-mono text-[#f5f5f7] focus:outline-none focus:border-[#0a84ff]"
                >
                  {COMPILER_LANGUAGE_ADAPTERS.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative flex-1 min-h-[340px] flex rounded-xl border border-white/[0.1] bg-[#0d0d0f] overflow-hidden">
              <div
                aria-hidden="true"
                className="w-10 py-3 bg-[#141416] border-r border-white/[0.08] text-right pr-2 font-mono text-[11px] leading-5 text-[#6e6e73] select-none overflow-hidden"
              >
                {Array.from({ length: Math.min(lineCount, 120) }, (_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>
              <textarea
                value={editorSource}
                onChange={(e) => setEditorSource(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleCompileAndExecute();
                  }
                }}
                spellCheck={false}
                aria-label="Compiler Source Code Editor"
                className="flex-1 p-3 bg-transparent text-xs font-mono leading-5 text-[#f5f5f7] focus:outline-none resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveFile}
                  disabled={!selectedPath || isSaving}
                  className="px-3 py-2 rounded-xl bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-white/[0.1] text-xs font-mono text-[#f5f5f7] flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 text-[#a1a1a6]" />
                  <span>{isSaving ? 'Saving...' : 'Save File'}</span>
                </button>
                <span className="text-[10px] font-mono text-[#86868b]">
                  {lineCount} lines · ⌘/Ctrl+Enter to Run
                </span>
              </div>

              <button
                type="button"
                data-testid="compiler-execute-btn"
                onClick={handleCompileAndExecute}
                disabled={!selectedPath || isExecuting}
                className="px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-mono font-semibold tracking-wide flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isExecuting ? 'Compiling & Running...' : 'Compile & Execute'}</span>
              </button>
            </div>
          </div>

          {/* Right Output & Execution Audit Inspector */}
          <div className="lg:col-span-4 apple-card p-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#f5f5f7]">
                <Terminal className="w-3.5 h-3.5 text-[#0a84ff]" />
                <span>EXECUTION OUTPUT &amp; ARTIFACT</span>
              </div>
              {latestExecution && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold uppercase flex items-center gap-1 ${
                    latestExecution.status === 'completed'
                      ? 'bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/35'
                      : 'bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/35'
                  }`}
                >
                  {latestExecution.status === 'completed' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  <span>{latestExecution.status}</span>
                </span>
              )}
            </div>

            {latestExecution ? (
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-xl bg-[#111113] border border-white/[0.08]">
                    <div className="text-[9px] text-[#86868b]">DURATION</div>
                    <div className="font-bold text-[#2997ff] tabular-nums">
                      {latestExecution.durationMs} ms
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#111113] border border-white/[0.08]">
                    <div className="text-[9px] text-[#86868b]">EXIT CODE</div>
                    <div className="font-bold text-[#f5f5f7] tabular-nums">
                      {latestExecution.exitCode}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#111113] border border-white/[0.08]">
                    <div className="text-[9px] text-[#86868b]">ARTIFACT</div>
                    <div className="font-bold text-[#f5f5f7] tabular-nums">
                      {latestExecution.artifactSizeBytes} B
                    </div>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-[#86868b] truncate">
                  SHA-256: <span className="text-[#a1a1a6]">{latestExecution.artifactHash}</span>
                </div>

                {latestExecution.diagnostics.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-[#111113] border border-white/[0.08] space-y-1">
                    <div className="text-[10px] font-mono text-[#2997ff] font-semibold">
                      COMPILER DIAGNOSTICS
                    </div>
                    {latestExecution.diagnostics.map((diag, i) => (
                      <div key={i} className="text-[11px] font-mono text-[#f5f5f7]">
                        {diag}
                      </div>
                    ))}
                  </div>
                )}

                {/* Structured SQL Table if SQL query returned rows */}
                {latestExecution.sqlColumns && latestExecution.sqlRows && (
                  <div className="rounded-xl border border-white/[0.1] bg-[#111113] overflow-x-auto max-h-48">
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead className="bg-[#161618] text-[#2997ff] border-b border-white/[0.08]">
                        <tr>
                          {latestExecution.sqlColumns.map((col) => (
                            <th key={col} className="px-2.5 py-1.5 font-semibold whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06] text-[#f5f5f7]">
                        {latestExecution.sqlRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-white/[0.04]">
                            {latestExecution.sqlColumns!.map((col) => (
                              <td key={col} className="px-2.5 py-1.5 whitespace-nowrap">
                                {String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex-1 flex flex-col space-y-2 min-h-[140px]">
                  <div className="text-[10px] font-mono text-[#86868b] uppercase">STDOUT</div>
                  <pre
                    data-testid="compiler-stdout"
                    className="flex-1 p-3 rounded-xl bg-[#0d0d0f] border border-white/[0.08] text-[11px] font-mono text-[#f5f5f7] overflow-auto max-h-48 whitespace-pre-wrap break-words"
                  >
                    {latestExecution.stdout || '(no stdout emitted)'}
                  </pre>
                  {latestExecution.stderr && (
                    <>
                      <div className="text-[10px] font-mono text-[#ff453a] uppercase">STDERR</div>
                      <pre className="p-2.5 rounded-xl bg-[#ff453a]/10 border border-[#ff453a]/30 text-[11px] font-mono text-[#ff8a80] overflow-auto max-h-32 whitespace-pre-wrap break-words">
                        {latestExecution.stderr}
                      </pre>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-xs font-mono text-[#86868b]">
                Select a workspace file and click Compile &amp; Execute to run inside an isolated worker.
              </div>
            )}

            {/* Recent Execution Audit History */}
            <div className="pt-2 border-t border-white/[0.08] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#2997ff] uppercase font-semibold">
                <History className="w-3 h-3" />
                <span>Recent Executions ({executions.length})</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {executions.slice(0, 6).map((ex) => (
                  <button
                    key={ex.executionId}
                    type="button"
                    onClick={() => setLatestExecution(ex)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#111113] hover:bg-[#1c1c1e] border border-white/[0.07] flex items-center justify-between text-[11px] font-mono"
                  >
                    <span className="truncate text-[#f5f5f7]">{ex.filePath}</span>
                    <span className="text-[#86868b] shrink-0 ml-2">
                      {ex.language} · {ex.durationMs}ms ·{' '}
                      <strong className={ex.status === 'completed' ? 'text-[#30d158]' : 'text-[#ff453a]'}>
                        {ex.exitCode}
                      </strong>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REAL OS PROCESSES & CONTAINER RESOURCES */}
      {activeTab === 'processes' && (
        <div className="apple-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div>
              <h2 className="text-sm font-bold text-[#f5f5f7] flex items-center gap-2">
                <Server className="w-4 h-4 text-[#0a84ff]" />
                <span>LIVE PROCESS TABLE &amp; WORKER ISOLATION CONTROLS</span>
              </h2>
              <p className="text-xs text-[#a1a1a6] mt-0.5">
                Inspect active Linux host container processes, Node platform daemon memory/CPU readings, and running compiler worker sandboxes.
              </p>
            </div>
            <button
              type="button"
              onClick={loadTelemetry}
              className="px-3 py-1.5 rounded-xl bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-white/[0.1] text-xs font-mono text-[#f5f5f7] flex items-center gap-1.5 self-start"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#0a84ff]" />
              <span>Refresh Kernel Table</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111113]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#161618] text-[#a1a1a6] border-b border-white/[0.08]">
                <tr>
                  <th className="px-3 py-2.5">PID</th>
                  <th className="px-3 py-2.5">PROCESS / SUBSYSTEM</th>
                  <th className="px-3 py-2.5">SOURCE</th>
                  <th className="px-3 py-2.5">STATUS</th>
                  <th className="px-3 py-2.5">CPU %</th>
                  <th className="px-3 py-2.5">MEM (MB)</th>
                  <th className="px-3 py-2.5">COMMAND</th>
                  <th className="px-3 py-2.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-[#d1d1d6]">
                {(telemetry?.processes || []).map((proc) => (
                  <tr key={`${proc.source}-${proc.pid}`} className="hover:bg-white/[0.04]">
                    <td className="px-3 py-2 font-bold text-[#2997ff] tabular-nums">{proc.pid}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-[#f5f5f7]">{proc.name}</div>
                      <div className="text-[10px] text-[#86868b]">{proc.subsystem}</div>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-[#a1a1a6]">{proc.source}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-semibold ${
                          proc.status === 'running'
                            ? 'bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30'
                            : proc.status === 'terminated'
                            ? 'bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/30'
                            : 'bg-[#1c1c1e] text-[#a1a1a6]'
                        }`}
                      >
                        {proc.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{proc.cpuPercent.toFixed(1)}%</td>
                    <td className="px-3 py-2 tabular-nums">{proc.memoryMb} MB</td>
                    <td className="px-3 py-2 text-[11px] text-[#86868b] max-w-xs truncate">
                      {proc.command}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {proc.source === 'compiler-worker' && proc.status === 'running' ? (
                        <button
                          type="button"
                          disabled={busyActionId === `pid-${proc.pid}`}
                          onClick={() => handleKillProcess(proc.pid)}
                          className="px-2.5 py-1 rounded-lg bg-[#ff453a]/15 hover:bg-[#ff453a]/25 border border-[#ff453a]/35 text-[#ff453a] text-[10px] font-semibold"
                        >
                          Terminate
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#6e6e73]">PROTECTED</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SERVICE CONTROL PLANE & CORRELATED EVENT BUS */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Services Registry */}
          <div className="lg:col-span-6 apple-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#f5f5f7]">
                <Shield className="w-4 h-4 text-[#0a84ff]" />
                <span>SUBSYSTEM SERVICE REGISTRY</span>
              </div>
              <span className="text-[11px] font-mono text-[#86868b]">
                {(telemetry?.services || []).filter((s) => s.status === 'healthy').length}/
                {(telemetry?.services || []).length} HEALTHY
              </span>
            </div>

            <div className="space-y-3">
              {(telemetry?.services || []).map((svc) => (
                <div
                  key={svc.id}
                  className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.08] space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#f5f5f7] flex items-center gap-2">
                        <span>{svc.name}</span>
                        <span className="text-[10px] font-mono text-[#86868b]">v{svc.version}</span>
                      </div>
                      <div className="text-[10px] font-mono text-[#86868b] mt-0.5">
                        PID {svc.pid} · Deps: {svc.dependencies.join(', ') || 'None'} · {svc.accessPolicy}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold ${
                        svc.status === 'healthy'
                          ? 'bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/35'
                          : svc.status === 'degraded'
                          ? 'bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/35'
                          : 'bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/35'
                      }`}
                    >
                      {svc.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px] font-mono">
                    <span className="text-[#86868b]">
                      Errors: <strong className="text-[#f5f5f7]">{svc.errorCount}</strong> · Check:{' '}
                      {svc.lastHealthCheck.slice(11, 19)} UTC
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busyActionId === `svc-${svc.id}`}
                        onClick={() => handleControlService(svc.id, 'restart')}
                        className="px-2 py-1 rounded-lg bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-white/[0.1] text-[#f5f5f7] flex items-center gap-1"
                      >
                        <RotateCw className="w-3 h-3 text-[#0a84ff]" />
                        <span>Restart</span>
                      </button>
                      {svc.status !== 'stopped' ? (
                        <button
                          type="button"
                          disabled={busyActionId === `svc-${svc.id}`}
                          onClick={() => handleControlService(svc.id, 'stop')}
                          className="px-2 py-1 rounded-lg bg-[#ff453a]/15 hover:bg-[#ff453a]/25 border border-[#ff453a]/35 text-[#ff453a] flex items-center gap-1"
                        >
                          <Square className="w-3 h-3" />
                          <span>Stop</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyActionId === `svc-${svc.id}`}
                          onClick={() => handleControlService(svc.id, 'start')}
                          className="px-2 py-1 rounded-lg bg-[#30d158]/15 hover:bg-[#30d158]/25 border border-[#30d158]/35 text-[#30d158] flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          <span>Start</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Correlated Event Bus & Trace Logs */}
          <div className="lg:col-span-6 apple-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#f5f5f7]">
                <Database className="w-4 h-4 text-[#0a84ff]" />
                <span>STRUCTURED OS EVENT BUS (TRACE CORRELATED)</span>
              </div>
              <span className="text-[11px] font-mono text-[#30d158] flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                <span>SQLITE PERSISTED</span>
              </span>
            </div>

            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {(telemetry?.eventBus || []).map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl bg-[#111113] border border-white/[0.08] space-y-1 font-mono text-xs"
                >
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded-md uppercase font-semibold ${
                          evt.severity === 'critical'
                            ? 'bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/30'
                            : evt.severity === 'warning'
                            ? 'bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30'
                            : 'bg-[#0a84ff]/15 text-[#2997ff] border border-[#0a84ff]/30'
                        }`}
                      >
                        {evt.severity}
                      </span>
                      <span className="text-[#2997ff] font-semibold">{evt.service}</span>
                      <span className="text-[#86868b]">{evt.eventType}</span>
                    </div>
                    <span className="text-[#6e6e73] tabular-nums">
                      {evt.timestamp.slice(11, 19)} UTC
                    </span>
                  </div>
                  <div className="text-xs text-[#f5f5f7]">{evt.message}</div>
                  <div className="text-[10px] text-[#6e6e73]">
                    Trace: {evt.traceId} · State: {evt.status.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
