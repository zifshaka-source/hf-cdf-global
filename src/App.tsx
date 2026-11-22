import React, { useState, useEffect, useRef } from 'react';
import { api } from './services/api';
import { ShieldCheck } from 'lucide-react';
import {
  Agent,
  AgentStatus,
  Incident,
  IncidentState,
  IndicatorOfCompromise,
  LiveOpsStateSnapshot,
  Mission,
  NetworkNode,
  OsTelemetryBundle,
  SecurityEvent,
  SharedIntelMemory,
  SimulationExecution,
  SimulationScenario,
} from './core/types';
import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { CommandPalette } from './components/common/CommandPalette';
import { CommandCenter } from './components/modules/CommandCenter';
import { LiveOpsNewsCenter } from './components/modules/LiveOpsNewsCenter';
import { OperatingSystemConsole } from './components/modules/OperatingSystemConsole';
import { AgentTrustCenter } from './components/modules/AgentTrustCenter';
import { CivicGovernance } from './components/modules/CivicGovernance';
import { OntologyFusionHub } from './components/modules/OntologyFusionHub';
import { RedForce } from './components/modules/RedForce';
import { BlueForce } from './components/modules/BlueForce';
import { IncidentManagement } from './components/modules/IncidentManagement';
import { AgentIntelligence } from './components/modules/AgentIntelligence';
import { AgentOrchestration } from './components/modules/AgentOrchestration';
import { ThreatIntelligence } from './components/modules/ThreatIntelligence';
import { NetworkObservatory } from './components/modules/NetworkObservatory';
import { SimulationLab } from './components/modules/SimulationLab';
import { SharedIntelligence } from './components/modules/SharedIntelligence';
import { MissionControl } from './components/modules/MissionControl';
import { AnalyticsPerformance } from './components/modules/AnalyticsPerformance';
import { ReportsModule } from './components/modules/ReportsModule';
import { IntegrationsModule } from './components/modules/IntegrationsModule';
import { AdminModule } from './components/modules/AdminModule';
import { DeveloperWorkbench } from './components/modules/DeveloperWorkbench';
import { ModelWeightsVault } from './components/modules/ModelWeightsVault';
import { WarRoomCockpit } from './components/modules/WarRoomCockpit';
import { LiveAttackMapCombat } from './components/modules/LiveAttackMapCombat';
import { AgentWarBarracks } from './components/modules/AgentWarBarracks';
import { GlobalSatelliteGrid } from './components/modules/GlobalSatelliteGrid';
import { SovereignEnclaveMesh } from './components/modules/SovereignEnclaveMesh';
import { SubseaCableObservatory } from './components/modules/SubseaCableObservatory';
import { FinancialDefenseCore } from './components/modules/FinancialDefenseCore';
import { InfrastructureSuperclusters } from './components/modules/InfrastructureSuperclusters';
import { ModelWarfareTrainingArena } from './components/modules/ModelWarfareTrainingArena';
import { EnterpriseThreatWarningSoldiers } from './components/modules/EnterpriseThreatWarningSoldiers';
import { GlobalCommandHub } from './components/modules/GlobalCommandHub';
import { CustomerCommandPortal } from './components/modules/CustomerCommandPortal';
import { SocCommandWorkspace } from './components/modules/SocCommandWorkspace';
import { INITIAL_TENANT_ORGANIZATIONS } from './core/multi-tenant-engine';

import {
  INITIAL_AGENTS,
  INITIAL_EVENTS,
  INITIAL_INCIDENTS,
  INITIAL_IOCS,
  INITIAL_MISSIONS,
  INITIAL_NETWORK_NODES,
  INITIAL_SHARED_MEMORIES,
  INITIAL_SIMULATION_SCENARIOS,
} from './core/initial-data';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authStatusLoading, setAuthStatusLoading] = useState<boolean>(true);
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean>(false);
  const [authSession, setAuthSession] = useState<{ sub: string; displayName: string; role: string } | null>(null);
  const [loginCommand, setLoginCommand] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState<string>(INITIAL_TENANT_ORGANIZATIONS[0].id);
  const [tenantDirectory, setTenantDirectory] = useState<Array<{ id: string; name: string }>>(() =>
    INITIAL_TENANT_ORGANIZATIONS.map((t) => ({ id: t.id, name: t.name }))
  );

  useEffect(() => {
    let active = true;
    api
      .getAuthStatus()
      .then((res) => {
        if (!active) return;
        setNeedsBootstrap(Boolean(res?.needsBootstrap));
        if (res?.authenticated && res?.session) {
          setIsAuthenticated(true);
          setAuthSession(res.session);
        }
      })
      .catch((err: any) => {
        if (!active) return;
        if (err?.message && /non-JSON|unavailable|Failed to fetch/i.test(err.message)) {
          setLoginError(err.message);
        }
      })
      .finally(() => {
        if (active) setAuthStatusLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = needsBootstrap
        ? await api.bootstrapAdmin({
            username: loginCommand.trim(),
            password: loginPassword,
            displayName: loginCommand.trim(),
          })
        : await api.loginOperator({
            username: loginCommand.trim(),
            password: loginPassword,
          });
      setIsAuthenticated(true);
      setNeedsBootstrap(false);
      setAuthSession(res.session);
      setLoginPassword('');
    } catch (err: any) {
      setLoginError(err?.message || 'Authentication denied.');
    }
  };

  const handleSignOut = async () => {
    await api.logoutOperator();
    setIsAuthenticated(false);
    setAuthSession(null);
  };

  const [currentModule, setCurrentModule] = useState<string>('global-command');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('INC-2026-084');
  const [pendingAipQuery, setPendingAipQuery] = useState<string | null>(null);
  const [status, setStatus] = useState<any>({
    defcon: 1,
    defconDescription: 'DEFCON 1 — MAXIMUM READINESS: ACTIVE CRITICAL INCIDENT UNCONTAINED',
    anomalyScore: 84,
    activeAgentCount: 6,
    totalAgents: 7,
    uncontainedIncidents: 1,
    totalIncidents: 3,
    lastUpdated: new Date().toISOString(),
  });
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [events, setEvents] = useState<SecurityEvent[]>(INITIAL_EVENTS);
  const [iocs, setIocs] = useState<IndicatorOfCompromise[]>(INITIAL_IOCS);
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>(INITIAL_NETWORK_NODES);
  const [simulations, setSimulations] = useState<SimulationScenario[]>(INITIAL_SIMULATION_SCENARIOS);
  const [sharedMemories, setSharedMemories] = useState<SharedIntelMemory[]>(INITIAL_SHARED_MEMORIES);
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);
  const [knowledgeGraph, setKnowledgeGraph] = useState<any>({
    nodes: [
      { id: 'actor-apt41', label: 'APT-41 (ShadowPanda)', type: 'threat_actor', status: 'active' },
      { id: 'tech-t1041', label: 'T1041: Exfiltration Over C2', type: 'technique', status: 'flagged' },
      { id: 'cve-2026-21849', label: 'CVE-2026-21849 (PyPI Lib)', type: 'vulnerability', status: 'critical' },
      { id: 'asset-inf-01', label: 'cluster-inference-01', type: 'asset', status: 'compromised' },
      { id: 'agent-sentinel', label: 'Sentinel-Zero (Agent)', type: 'agent', status: 'defending' },
    ],
    links: [
      { source: 'actor-apt41', target: 'tech-t1041', relationship: 'employs' },
      { source: 'tech-t1041', target: 'asset-inf-01', relationship: 'targets' },
      { source: 'agent-sentinel', target: 'asset-inf-01', relationship: 'shields' },
    ],
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'alert' } | null>(null);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [osTelemetry, setOsTelemetry] = useState<OsTelemetryBundle | null>(null);
  const [liveOpsState, setLiveOpsState] = useState<LiveOpsStateSnapshot | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentModule]);

  // Initial Data Fetch
  const refreshAllData = async () => {
    try {
      const [
        statusRes,
        agentsRes,
        incidentsRes,
        eventsRes,
        iocsRes,
        networkRes,
        simsRes,
        sharedRes,
        missionsRes,
        kgRes,
        osRes,
      ] = await Promise.all([
        api.getStatus(),
        api.getAgents(),
        api.getIncidents(),
        api.getEvents(),
        api.getIocs(),
        api.getNetworkNodes(),
        api.getSimulations(),
        api.getSharedIntel(),
        api.getMissions(),
        api.getKnowledgeGraph(),
        api.getOsTelemetry(),
      ]);

      setStatus(statusRes);
      setAgents(agentsRes);
      setIncidents(incidentsRes);
      setEvents(eventsRes);
      setIocs(iocsRes);
      setNetworkNodes(networkRes);
      setSimulations(simsRes);
      setSharedMemories(sharedRes);
      setMissions(missionsRes);
      setKnowledgeGraph(kgRes);
      if (osRes) setOsTelemetry(osRes);
    } catch (err) {
      console.error('Error hydrating cyber defense state:', err);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    api
      .getLiveOpsState()
      .then((snap) => {
        if (active) setLiveOpsState(snap);
      })
      .catch(() => {});

    const es = new EventSource('/api/v1/live/stream');
    es.addEventListener('state_sync', (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data);
        if (!active) return;
        if (payload.liveOps) {
          setLiveOpsState(payload.liveOps);
          setStatus((prev: any) => ({
            ...prev,
            activeAgentCount: Array.isArray(payload.agents)
              ? payload.agents.filter((a: Agent) => a.status === 'active').length
              : prev.activeAgentCount,
            anomalyScore: Math.min(
              99,
              Math.max(42, 68 + (payload.liveOps.stats?.activeAttacksCount || 0) * 6)
            ),
            lastUpdated: new Date().toISOString(),
          }));
        }
        if (Array.isArray(payload.agents) && payload.agents.length > 0) {
          setAgents(payload.agents);
        }
        if (Array.isArray(payload.events) && payload.events.length > 0) {
          setEvents(payload.events);
        }
        if (Array.isArray(payload.sharedMemories) && payload.sharedMemories.length > 0) {
          setSharedMemories(payload.sharedMemories);
        }
      } catch {
        // Ignore malformed SSE payload
      }
    });

    return () => {
      active = false;
      es.close();
    };
  }, [isAuthenticated]);

  const showToast = (message: string, type: 'info' | 'success' | 'alert' = 'info') => {
    setTimeout(() => {
      setNotification({ message, type });
      setTimeout(() => {
        setNotification(null);
      }, 4000);
    }, 0);
  };

  // Operational Handlers
  const handleSelectIncident = (incidentId: string) => {
    setSelectedIncidentId(incidentId);
    setCurrentModule('incidents');
    api.getIncidents().then(setIncidents).catch(() => {});
  };

  const handleContainIncident = async (incidentId: string, actionOverride?: string) => {
    const res = await api.containIncident(
      incidentId,
      'Authorized Commander',
      'authorized_commander',
      actionOverride
    );
    if (res.success) {
      showToast(`Containment Enforced: ${res.containmentAction}`, 'success');
      await refreshAllData();
    }
    return res;
  };

  const handleTransitionIncident = async (
    incidentId: string,
    nextState: IncidentState,
    notes: string
  ) => {
    const updated = await api.transitionIncident(
      incidentId,
      nextState,
      'Authorized Commander',
      'authorized_commander',
      notes
    );
    showToast(`Incident state updated to ${nextState.toUpperCase()}`, 'info');
    await refreshAllData();
    return updated;
  };

  const handleInjectEvent = async () => {
    const signatures = [
      'CHUNKED_SAFETENSORS_SOCKET_ANOMALY',
      'ADVERSARIAL_JAILBREAK_TOKEN_BURST',
      'UNAUTHORIZED_STS_TOKEN_SWAP',
      'EBPF_PTRACE_HOOK_ATTEMPT',
    ];
    const signature = signatures[Math.floor(Math.random() * signatures.length)];

    await api.injectEvent({
      severity: 'high',
      source: '172.16.99.12 (Red Team Sandbox)',
      destination: '10.0.4.18:8000',
      category: 'Simulated Adversary Probe',
      signature,
      type: 'simulated',
    });

    showToast(`Simulated telemetry event injected: ${signature}`, 'alert');
    await refreshAllData();
  };

  const handleRunSimulation = async (scenarioId: string): Promise<SimulationExecution> => {
    const exec = await api.runSimulation(scenarioId, 'Authorized Commander (Lab Authorization)');
    showToast(`Simulation completed: ${exec.scenarioId}`, 'success');
    await refreshAllData();
    return exec;
  };

  const handleUpdateAgentStatus = async (agentId: string, agentStatus: AgentStatus) => {
    await api.updateAgentStatus(agentId, agentStatus, 'Authorized Commander');
    showToast(`Agent status set to ${agentStatus.toUpperCase()}`, 'info');
    await refreshAllData();
  };

  const handleCreateAgent = async (agentData: Partial<Agent>) => {
    await api.createAgent(agentData);
    showToast(`Agent ${agentData.name} successfully provisioned`, 'success');
    await refreshAllData();
  };

  const handleCreateIoc = async (iocData: Partial<IndicatorOfCompromise>) => {
    await api.createIoc(iocData);
    showToast(`IoC registered: ${iocData.value}`, 'success');
    await refreshAllData();
  };

  const handleToggleIsolation = async (nodeId: string) => {
    const res = await api.toggleNodeIsolation(nodeId, 'Authorized Commander');
    showToast(`Node ${res.name} isolation toggled to ${res.status}`, 'alert');
    await refreshAllData();
  };

  const handlePublishMemory = async (memData: Partial<SharedIntelMemory>) => {
    await api.publishSharedIntel(memData);
    showToast(`Observation published to swarm memory`, 'success');
    await refreshAllData();
  };

  const handleAuthorizeMission = async (missionId: string) => {
    await api.authorizeMission(missionId, 'Chief Information Security Officer (CISO)');
    showToast(`Mission operational authorization granted`, 'success');
    await refreshAllData();
  };

  const handleOverrideDefcon = (level: number) => {
    setStatus((prev: any) => ({
      ...prev,
      defcon: level,
      defconDescription: `DEFCON ${level} — MANUAL DEVELOPER OVERRIDE ENGAGED`,
    }));
    showToast(`DEFCON posture overridden to ${level}`, 'alert');
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#000000] text-[#f5f5f7] font-sans p-4 select-none relative overflow-hidden">
        <div className="relative w-full max-w-md p-8 rounded-2xl border border-white/[0.12] bg-[#141416]/95 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.88)] space-y-6">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#86868b] pb-3 border-b border-white/[0.08]">
            <span className="text-[#30d158] font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              FIPS-140-3 ENCLAVE GATE
            </span>
            <span className="text-[#a1a1a6]">CLEARANCE: LEVEL 5</span>
          </div>

          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative h-20 w-44 rounded-xl flex items-center justify-center overflow-hidden border border-white/[0.12] bg-gradient-to-b from-[#1f1f23] to-[#111113] p-2.5 shadow-xl group">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
              <img
                src="/assets/aistudio/Golden_Touch_Technology_Emblem__1__b8a9d7df.webp"
                alt="HF-CDF Sovereign Emblem Logo"
                className="w-full h-full object-contain contrast-125"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-[0.12em] text-[#f5f5f7]">HF-CDF SOVEREIGN OS</h1>
              <p className="text-[11px] font-mono text-[#86868b] mt-1">
                STRATEGIC INTELLIGENCE &amp; POLYGLOT COMMAND FABRIC
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {needsBootstrap && (
              <div className="p-3 rounded-xl bg-[#0a84ff]/10 border border-[#0a84ff]/30 text-[11px] font-mono text-[#64d2ff]">
                FIRST-RUN SETUP: Claim the initial Global Operator credential (hashed on server via scrypt).
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="login-cmd" className="text-[11px] font-mono font-semibold text-[#a1a1a6] uppercase tracking-wider block">
                {needsBootstrap ? 'Claim Commander ID / Email' : 'Commander ID'}
              </label>
              <input
                id="login-cmd"
                type="text"
                value={loginCommand}
                onChange={(e) => setLoginCommand(e.target.value)}
                placeholder={needsBootstrap ? 'e.g. commander@hfcdf.global' : 'Enter Commander ID'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0c] border border-white/[0.12] text-[#f5f5f7] placeholder-[#6e6e73] text-xs font-mono focus:outline-none focus:border-[#0a84ff] transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-pwd" className="text-[11px] font-mono font-semibold text-[#a1a1a6] uppercase tracking-wider block">
                {needsBootstrap ? 'Create Sovereign Passphrase (min 8 chars)' : 'Passphrase'}
              </label>
              <input
                id="login-pwd"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter Passphrase"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0c] border border-white/[0.12] text-[#f5f5f7] placeholder-[#6e6e73] text-xs font-mono focus:outline-none focus:border-[#0a84ff] transition-colors"
                required
              />
            </div>

            {loginError && (
              <div className="p-2.5 rounded-xl bg-[#ff453a]/10 border border-[#ff453a]/35 text-[#ff6961] text-xs font-mono text-center">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={authStatusLoading}
              className="w-full py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs tracking-wide transition-all shadow-lg active:scale-[0.99] disabled:opacity-50"
            >
              {authStatusLoading
                ? 'Checking Enclave Auth...'
                : needsBootstrap
                ? 'Claim Admin & Launch HF-CDF GLOBAL'
                : 'Authenticate & Initialize HF-CDF GLOBAL'}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-white/[0.08]">
            <span className="text-[10px] text-[#86868b] font-mono block tracking-wider">
              SERVER-VERIFIED SCRYPT &amp; HMAC BEARER AUTHENTICATION
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] antialiased">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm flex items-center justify-between">
          <span className="mx-auto">
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
          <button
            onClick={() => setMapsQuotaExceeded(false)}
            className="text-amber-900 hover:text-amber-700 font-bold px-2 text-base leading-none"
            title="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}
      {/* Universal TopBar */}
      <TopBar
        currentModule={currentModule}
        onSelectModule={setCurrentModule}
        defcon={status?.defcon || 1}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        roleLabel={authSession?.role || 'global_operator'}
        onSignOut={handleSignOut}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Modular Sidebar (16 Sectors) */}
        <Sidebar
          currentModule={currentModule}
          onSelectModule={setCurrentModule}
          activeIncidentsCount={incidents.filter((i) => i.state !== 'closed').length}
          activeAgentsCount={agents.filter((a) => a.status === 'active').length}
          liveAttacksCount={liveOpsState?.stats?.activeAttacksCount ?? 0}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Viewport Content View */}
        <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          {/* Notification Toast */}
          {notification && (
            <div
              className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg border text-xs font-mono shadow-2xl transition-all flex items-center gap-2 ${
                notification.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                  : notification.type === 'alert'
                  ? 'bg-red-950/90 border-red-500/50 text-red-200'
                  : 'bg-[#161618]/95 border-white/[0.15] text-[#f5f5f7]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current shrink-0" />
              <span>{notification.message}</span>
            </div>
          )}

          {/* Interface 1: Global Command HQ */}
          {currentModule === 'global-command' && (
            <GlobalCommandHub
              onOpenCustomerPortal={(tid) => {
                setSelectedTenantId(tid);
                setCurrentModule('customer-command');
              }}
              onOpenSocCommand={() => setCurrentModule('soc-command')}
              onRoleSwitched={(nextSession) => setAuthSession(nextSession)}
              onNotify={(msg, type) => {
                showToast(msg, type);
                api
                  .getGlobalOverview()
                  .then((ov) => {
                    if (ov?.tenants) {
                      setTenantDirectory(ov.tenants.map((t: any) => ({ id: t.id, name: t.name })));
                    }
                  })
                  .catch(() => {});
              }}
            />
          )}

          {/* Interface 2: Customer Command Portal (Isolated Tenant Environment) */}
          {currentModule === 'customer-command' && (
            <CustomerCommandPortal
              tenantId={selectedTenantId}
              availableTenants={tenantDirectory}
              onChangeTenantId={setSelectedTenantId}
              onNotify={showToast}
            />
          )}

          {/* Interface 3: Security Operations Command (Authorized SOC Analysts) */}
          {currentModule === 'soc-command' && (
            <SocCommandWorkspace
              onOpenTenant={(tid) => {
                setSelectedTenantId(tid);
                setCurrentModule('customer-command');
              }}
              onNotify={(msg, type) => {
                showToast(msg, type);
                api
                  .getGlobalOverview()
                  .then((ov) => {
                    if (ov?.tenants) {
                      setTenantDirectory(ov.tenants.map((t: any) => ({ id: t.id, name: t.name })));
                    }
                  })
                  .catch(() => {});
              }}
            />
          )}

          {/* Module 01: Command Center */}
          {currentModule === 'command-center' && (
            <CommandCenter
              status={status}
              agents={agents}
              incidents={incidents}
              events={events}
              iocs={iocs}
              nodes={networkNodes}
              osTelemetry={osTelemetry}
              liveOps={liveOpsState}
              onSelectModule={setCurrentModule}
              onSelectIncident={handleSelectIncident}
              onContainIncident={handleContainIncident}
              onInjectEvent={handleInjectEvent}
              onSyncFeeds={async () => {
                await api.syncPublicFeeds();
                await refreshAllData();
                showToast('Public threat feeds (CISA KEV & URLhaus) synced to Ontology', 'success');
              }}
            />
          )}

          {/* Module: Agent Intelligence Registry, 10-Gate Policy Gateway & Trust Center */}
          {currentModule === 'agent-trust' && (
            <AgentTrustCenter
              onSelectModule={setCurrentModule}
              onSelectIncident={handleSelectIncident}
              onNotify={showToast}
            />
          )}

          {/* Module: Civic Digital Governance & Public Information Integrity */}
          {currentModule === 'civic-governance' && (
            <CivicGovernance onNotify={showToast} />
          )}

          {/* Module: Live Operations, Active Attacks & Threat Newsroom */}
          {currentModule === 'live-ops' && (
            <LiveOpsNewsCenter
              liveOps={liveOpsState}
              onLiveOpsChange={setLiveOpsState}
              onSelectModule={setCurrentModule}
              onNotify={showToast}
            />
          )}

          {/* Module: Sovereign Operating Environment & Multi-Language Compiler */}
          {currentModule === 'os-compiler' && (
            <OperatingSystemConsole onNotify={showToast} />
          )}

          {/* Module: Unified Intelligence & Ontology Fusion Core */}
          {currentModule === 'ontology-fusion' && (
            <OntologyFusionHub
              onRefreshAllData={refreshAllData}
              onNotify={showToast}
              onSelectModule={setCurrentModule}
              onSelectIncident={handleSelectIncident}
              initialAipQuery={pendingAipQuery}
              onConsumeInitialAipQuery={() => setPendingAipQuery(null)}
            />
          )}

          {/* Module: Inter-Enterprise Threat Warning & Virtual Soldiers */}
          {currentModule === 'enterprise-defense' && (
            <EnterpriseThreatWarningSoldiers onNotify={showToast} />
          )}

          {/* Module: Model Warfare & Live Training Arena */}
          {currentModule === 'model-warfare' && (
            <ModelWarfareTrainingArena
              onNotify={showToast}
              onSelectIncident={handleSelectIncident}
            />
          )}

          {/* Module: Live Attack Map & Combat Theater */}
          {currentModule === 'live-attack-map' && (
            <LiveAttackMapCombat
              onNotify={showToast}
              onRaiseDefcon={handleOverrideDefcon}
            />
          )}

          {/* Module: Agent War Room & Barracks */}
          {currentModule === 'agent-barracks' && (
            <AgentWarBarracks onNotify={showToast} />
          )}

          {/* Module 02: Red Force */}
          {currentModule === 'red-force' && (
            <RedForce
              scenarios={simulations}
              onRunSimulation={handleRunSimulation}
            />
          )}

          {/* Module 03: Blue Force */}
          {currentModule === 'blue-force' && (
            <BlueForce
              incidents={incidents}
              agents={agents}
              events={events}
              onSelectIncident={handleSelectIncident}
              onContainIncident={handleContainIncident}
            />
          )}

          {/* Module 04: Agent Intelligence */}
          {currentModule === 'agents' && (
            <AgentIntelligence
              agents={agents}
              onUpdateAgentStatus={handleUpdateAgentStatus}
              onCreateAgent={handleCreateAgent}
            />
          )}

          {/* Module 05: Agent Orchestration */}
          {currentModule === 'orchestration' && <AgentOrchestration />}

          {/* Module 06: Threat Intelligence */}
          {currentModule === 'threat-intel' && (
            <ThreatIntelligence
              iocs={iocs}
              knowledgeGraph={knowledgeGraph}
              onCreateIoc={handleCreateIoc}
            />
          )}

          {/* Module 07: Network Observatory */}
          {currentModule === 'network-observatory' && (
            <NetworkObservatory
              nodes={networkNodes}
              onToggleIsolation={handleToggleIsolation}
            />
          )}

          {/* Module 08: Simulation Laboratory */}
          {currentModule === 'simulation-lab' && (
            <SimulationLab
              scenarios={simulations}
              onRunSimulation={handleRunSimulation}
            />
          )}

          {/* Module 09: Incident Management */}
          {currentModule === 'incidents' && (
            <IncidentManagement
              incidents={incidents}
              selectedIncidentId={selectedIncidentId}
              onTransitionIncident={handleTransitionIncident}
              onContainIncident={handleContainIncident}
            />
          )}

          {/* Global Geopolitical & Orbital Modules */}
          {currentModule === 'satellite-grid' && (
            <GlobalSatelliteGrid onNotify={showToast} />
          )}
          {currentModule === 'sovereign-mesh' && (
            <SovereignEnclaveMesh onNotify={showToast} />
          )}
          {currentModule === 'cable-observatory' && (
            <SubseaCableObservatory onNotify={showToast} />
          )}
          {currentModule === 'financial-defense' && (
            <FinancialDefenseCore onNotify={showToast} />
          )}
          {currentModule === 'infrastructure-superclusters' && (
            <InfrastructureSuperclusters onNotify={showToast} />
          )}
          {currentModule === 'shared-intel' && (
            <SharedIntelligence
              memories={sharedMemories}
              onPublishMemory={handlePublishMemory}
            />
          )}

          {/* Module 11: Mission Control */}
          {currentModule === 'mission-control' && (
            <MissionControl
              missions={missions}
              onAuthorizeMission={handleAuthorizeMission}
            />
          )}

          {/* Module 12: Analytics & Performance */}
          {currentModule === 'analytics' && <AnalyticsPerformance />}

          {/* Module 13: Reports */}
          {currentModule === 'reports' && (
            <ReportsModule incidents={incidents} events={events} />
          )}

          {/* Module 14: Integrations */}
          {currentModule === 'integrations' && <IntegrationsModule />}

          {/* Module 15: Administration & RBAC */}
          {currentModule === 'administration' && <AdminModule />}


          {/* Sovereign War Room & Global Mesh */}
          {currentModule === 'war-room' && <WarRoomCockpit />}

          {/* Sovereign Model Weights Cryptographic Vault */}
          {currentModule === 'model-vault' && <ModelWeightsVault />}

          {/* Module 16: Developer & Company Ops Workbench */}
          {currentModule === 'developer-workbench' && (
            <DeveloperWorkbench
              agents={agents}
              nodes={networkNodes}
              events={events}
              defcon={status?.defcon || 1}
              onOverrideDefcon={handleOverrideDefcon}
              onInjectEvent={handleInjectEvent}
              onToggleNodeIsolation={handleToggleIsolation}
              onUpdateAgentStatus={handleUpdateAgentStatus}
            />
          )}
        </main>
      </div>

      {/* Quick Navigation Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectModule={setCurrentModule}
        onInjectEvent={handleInjectEvent}
      />
    </div>
  );
}
