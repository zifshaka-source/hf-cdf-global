# HF-CDF Sovereign Intelligence Operating System Architecture

## 1. Core Architectural Layers

1. **Unified Command & Control Layer (`CommandCenter.tsx`, `GlobalThreatRadarD3.tsx`)**
   - **Executive Summary KPI View (Recharts)**: Real-time deterministic computation (`computeExecutiveKpis`) deriving **System Health (%)**, **Active Containment Progress (%)**, and **Threat Mitigation Efficiency (%)** from live OS host/service telemetry, incident containment state, IoC active blocks, and agent precision.
   - **Global Threat Radar (D3.js)**: Interactive `d3.geoNaturalEarth1` projection powered by `world-atlas/countries-110m.json` and `topojson-client`, plotting live security event trajectories, adversary C2 transit clusters, and monitored enclaves with interactive zoom/pan (`d3.zoom`) and cluster inspection.
   - **Telemetry & Multi-Spectral Surveillance**: Ingress telemetry, anomaly frequency, incident forecast, enclave posture matrix, live operational log stream, and interactive 4-feed multi-spectral reconnaissance station.

2. **Operating System Control Layer (`server/os-fabric.ts`, `OperatingSystemConsole.tsx`)**
   - **Host Introspection**: Live Linux container telemetry (`os.cpus()`, `os.loadavg()`, `os.totalmem()`, `os.freemem()`, `process.memoryUsage()`, `df`, and `ps`) surfaced through `/api/v1/os/telemetry`.
   - **Process & Worker Isolation**: Tracks host processes, platform daemon, and running compiler worker PIDs with real `SIGTERM` termination control (`POST /api/v1/os/processes/:pid/kill`).
   - **Persistent Storage Fabric (WASM SQLite + Disk Workspace)**: Stores workspace file metadata/versions, service registry, OS event bus traces, and compiler execution records inside `.hf_cdf_data/fabric.sqlite` via `sql.js`, synchronized with sandboxed disk files under `.hf_cdf_workspace/` (`sanitizeWorkspacePath` traversal guard).
   - **Service Control & Event Bus**: Supports `start`, `stop`, and `restart` operations (`POST /api/v1/os/services/:id/control`) and records trace-correlated operational events.

3. **Multi-Language Compiler & Execution Engine (`server/compiler-engine.ts`)**
   Runs real compilation and sandboxed execution (`POST /api/v1/compiler/execute`) using runtimes verified in this Linux container:
   - **TypeScript**: `esbuild` syntax/type-strip compilation -> SHA-256 artifact hash -> isolated Node worker subprocess (`5000ms` timeout, `128MB` heap ceiling).
   - **JavaScript**: `node --check` syntax verification -> isolated Node subprocess execution.
   - **Python 3**: `python3 -m py_compile` bytecode compilation -> isolated `python3` subprocess execution.
   - **SQL**: Executed directly against the live `sql.js` WebAssembly SQLite engine, returning structured columns/rows and execution metrics.
   - **WebAssembly (WAT)**: Assembled via `wabt` (`wat2wasm`) into binary `.wasm`, validated, hashed, and instantiated in V8 `WebAssembly.instantiate` to execute exported `main` kernels.
   - **POSIX Diagnostics**: Strict prefix-allowlisted container diagnostics (`validateRestrictedShellScript`) blocking shell metacharacters (`;&|\`$<>()`).

4. **Intelligence Ontology & Autonomous Reasoning (`server/ontology-engine.ts`, `OntologyFusionHub.tsx`)**
   - Multi-domain typed entity-relationship graph correlating Cyber incidents, live CISA KEV vulnerabilities, URLhaus IOCs, MITRE ATT&CK techniques, Financial clearing rails, Orbital QKD, and Subsea trunks.
   - Supports server-side `gemini-4-hydrogen` AIP synthesis with deterministic fallback inference.

## 2. Verification & Container Boundaries
- **Verified Runtimes**: Node v22 (`tsx`, `esbuild`), Python 3 (`python3`), WebAssembly (`wabt` + V8), WASM SQLite (`sql.js`), and Linux procps/coreutils.
- **Explicit Container Boundary**: Compilers not installed natively in this container (`gcc`, `clang`, `go`, `rustc`) are intentionally excluded rather than simulated.
- **Unit Tests**: Pure OS path sanitization, restricted shell validation, KPI computation, threat radar clustering, ontology fusion, and security validation are tested under `node:test` (`npx tsx --test src/core/*.test.ts`).
