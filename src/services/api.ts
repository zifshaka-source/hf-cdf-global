import {
  Agent,
  AgentDefenseOverviewSnapshot,
  AgentTrustStatus,
  AipQueryResult,
  CompilerExecutionRecord,
  CompilerLanguage,
  GovernedAgentProfile,
  Incident,
  IncidentState,
  IndicatorOfCompromise,
  LiveNewsItem,
  LiveOngoingAttack,
  LiveOpsStateSnapshot,
  Mission,
  NetworkNode,
  OntologyGraphData,
  OperationalChallenge,
  OsFileEntry,
  OsTelemetryBundle,
  PolicyGateEvaluation,
  RealtimeThreatAlert,
  RedBlueValidationRun,
  SecurityEvent,
  SharedIntelMemory,
  SimulationExecution,
  SimulationScenario,
} from '../core/types';

import {
  AutonomyMode,
  CloudEnvironmentType,
  CommercialPlanTier,
  IsolationTier,
  OperatingModel,
  RbacRole,
  RegionalClusterId,
  SecurityDomainType,
  TenantLocalizationConfig,
} from '../core/multi-tenant-types';

const API_BASE_URL = (
  typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL
    ? String((import.meta as any).env.VITE_API_BASE_URL)
    : ''
)
  .trim()
  .replace(/\/+$/, '');

export function resolveApiUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (!API_BASE_URL) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

export async function safeParseJsonResponse<T = any>(
  res: Response,
  fallbackError = 'Unexpected non-JSON response from backend API'
): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const rawText = await res.text();
  if (!rawText) {
    if (!res.ok) throw new Error(`${fallbackError} (HTTP ${res.status})`);
    return {} as T;
  }
  try {
    return JSON.parse(rawText) as T;
  } catch {
    const preview = rawText.replace(/\s+/g, ' ').trim().slice(0, 140);
    throw new Error(
      `Backend API unavailable or returned non-JSON (HTTP ${res.status}${contentType ? `, ${contentType}` : ''}): "${preview}". Ensure /api routes are deployed (vercel.json + api/index.ts) or set VITE_API_BASE_URL.`
    );
  }
}

let inMemoryAuthToken: string | null = null;

class ApiService {
  setAuthToken(token: string | null) {
    inMemoryAuthToken = token;
  }

  getAuthToken(): string | null {
    return inMemoryAuthToken;
  }

  private rawFetch(url: string, init: RequestInit = {}) {
    return fetch(resolveApiUrl(url), init);
  }

  private async authFetch(url: string, init: RequestInit = {}) {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> | undefined),
    };
    if (inMemoryAuthToken) {
      headers['Authorization'] = `Bearer ${inMemoryAuthToken}`;
    }
    return this.rawFetch(url, { ...init, headers });
  }

  async getStatus() {
    try {
      const res = await this.rawFetch('/api/status');
      if (!res.ok) throw new Error('Status fetch failed');
      return await safeParseJsonResponse(res);
    } catch {
      return {
        defcon: 1,
        defconDescription: 'DEFCON 1 — MAXIMUM READINESS: ACTIVE CRITICAL INCIDENT UNCONTAINED',
        anomalyScore: 84,
        activeAgentCount: 6,
        totalAgents: 7,
        uncontainedIncidents: 1,
        totalIncidents: 3,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  async getAgents(): Promise<Agent[]> {
    try {
      const res = await this.rawFetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      return await safeParseJsonResponse(res);
    } catch {
      const { INITIAL_AGENTS } = await import('../core/initial-data');
      return INITIAL_AGENTS;
    }
  }

  async updateAgentStatus(id: string, status: string, author?: string) {
    const res = await this.rawFetch(`/api/agents/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, author }),
    });
    return await safeParseJsonResponse(res);
  }

  async createAgent(data: Partial<Agent>) {
    const res = await this.rawFetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await safeParseJsonResponse(res);
  }

  async getIncidents(): Promise<Incident[]> {
    try {
      const res = await this.rawFetch('/api/incidents');
      if (!res.ok) throw new Error('Failed to fetch incidents');
      return await safeParseJsonResponse(res);
    } catch {
      const { INITIAL_INCIDENTS } = await import('../core/initial-data');
      return INITIAL_INCIDENTS;
    }
  }

  async transitionIncident(id: string, nextState: IncidentState, author: string, role: string, notes: string) {
    const res = await this.rawFetch(`/api/incidents/${id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextState, author, role, notes }),
    });
    return await safeParseJsonResponse(res);
  }

  async containIncident(id: string, author: string, userRole: string, actionOverride?: string) {
    const res = await this.rawFetch(`/api/incidents/${id}/contain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, userRole, actionOverride }),
    });
    return await safeParseJsonResponse(res);
  }

  async getEvents(): Promise<SecurityEvent[]> {
    try {
      const res = await this.rawFetch('/api/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      return await safeParseJsonResponse(res);
    } catch {
      const { INITIAL_EVENTS } = await import('../core/initial-data');
      return INITIAL_EVENTS;
    }
  }

  async injectEvent(data: Partial<SecurityEvent>) {
    const res = await this.rawFetch('/api/events/inject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await safeParseJsonResponse(res);
  }

  async getIocs(): Promise<IndicatorOfCompromise[]> {
    try {
      const res = await this.rawFetch('/api/intel/iocs');
      if (!res.ok) throw new Error('Failed to fetch IoCs');
      return await safeParseJsonResponse(res);
    } catch {
      const { INITIAL_IOCS } = await import('../core/initial-data');
      return INITIAL_IOCS;
    }
  }

  async createIoc(data: Partial<IndicatorOfCompromise>) {
    const res = await this.rawFetch('/api/intel/iocs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await safeParseJsonResponse(res);
  }

  async getKnowledgeGraph() {
    try {
      const res = await this.rawFetch('/api/intel/knowledge-graph');
      if (!res.ok) throw new Error('Failed to fetch knowledge graph');
      return await safeParseJsonResponse(res);
    } catch {
      return {
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
      };
    }
  }

  async getNetworkNodes(): Promise<NetworkNode[]> {
    try {
      const res = await this.rawFetch('/api/network');
      if (!res.ok) throw new Error('Failed to fetch network');
      return await safeParseJsonResponse(res);
    } catch {
      const { INITIAL_NETWORK_NODES } = await import('../core/initial-data');
      return INITIAL_NETWORK_NODES;
    }
  }

  async toggleNodeIsolation(id: string, author?: string) {
    const res = await this.rawFetch(`/api/network/${id}/isolate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author }),
    });
    return await safeParseJsonResponse(res);
  }

  async getSimulations(): Promise<SimulationScenario[]> {
    try {
      const res = await this.rawFetch('/api/simulations');
      if (!res.ok) throw new Error('Failed to fetch simulations');
      return await safeParseJsonResponse(res);
    } catch {
      const { INITIAL_SIMULATION_SCENARIOS } = await import('../core/initial-data');
      return INITIAL_SIMULATION_SCENARIOS;
    }
  }

  async runSimulation(id: string, authorizedBy?: string): Promise<SimulationExecution> {
    const res = await this.rawFetch(`/api/simulations/${id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizedBy }),
    });
    return await safeParseJsonResponse(res);
  }

  async getSharedIntel(): Promise<SharedIntelMemory[]> {
    try {
      const res = await this.rawFetch('/api/shared-intel');
      if (!res.ok) throw new Error('Failed to fetch shared intel');
      return await safeParseJsonResponse(res);
    } catch {
      const { INITIAL_SHARED_MEMORIES } = await import('../core/initial-data');
      return INITIAL_SHARED_MEMORIES;
    }
  }

  async publishSharedIntel(data: Partial<SharedIntelMemory>) {
    const res = await this.rawFetch('/api/shared-intel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await safeParseJsonResponse(res);
  }

  async getMissions(): Promise<Mission[]> {
    try {
      const res = await this.rawFetch('/api/missions');
      if (!res.ok) throw new Error('Failed to fetch missions');
      return await safeParseJsonResponse(res);
    } catch {
      const { INITIAL_MISSIONS } = await import('../core/initial-data');
      return INITIAL_MISSIONS;
    }
  }

  async authorizeMission(id: string, authorizedBy?: string) {
    const res = await this.rawFetch(`/api/missions/${id}/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizedBy }),
    });
    return await safeParseJsonResponse(res);
  }

  async getAuditLog() {
    try {
      const res = await this.rawFetch('/api/audit');
      if (!res.ok) throw new Error('Failed to fetch audit');
      return await safeParseJsonResponse(res);
    } catch {
      return [
        {
          id: 'aud-fallback',
          timestamp: new Date().toISOString(),
          actor: 'System',
          action: 'ONLINE',
          severity: 'info',
          details: 'CDF Platform operational.',
        },
      ];
    }
  }

  async analyzeIncidentWithAI(incidentId: string) {
    const res = await this.rawFetch('/api/ai/analyze-incident', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId }),
    });
    return await safeParseJsonResponse(res);
  }

  // --- REST API v1 Client Methods (Blueprint Implementation) ---
  async getCurrentUser() {
    try {
      const res = await this.rawFetch('/api/v1/auth/me');
      if (!res.ok) throw new Error('Failed to fetch user');
      return await safeParseJsonResponse(res);
    } catch {
      return {
        id: 'user-commander',
        name: 'Authorized Commander',
        email: 'commander@hf-cdf.internal',
        role: 'authorized_commander',
        title: 'Authorized Sovereign Commander',
        hardwareToken: 'TIER-3 YUBIKEY FIPS-140-3',
        permissions: {
          canViewIncidents: true,
          canInvestigate: true,
          canManageAgents: true,
          canApproveContainment: true,
          canManageUsers: false,
          canViewAudit: true,
          canChangePolicies: true,
        },
      };
    }
  }

  async getAvailableRoles() {
    try {
      const res = await this.rawFetch('/api/v1/auth/roles');
      if (!res.ok) throw new Error('Failed to fetch roles');
      return await safeParseJsonResponse(res);
    } catch {
      return [];
    }
  }

  async switchRole(roleId: string) {
    const res = await this.rawFetch('/api/v1/auth/switch-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId }),
    });
    return await safeParseJsonResponse(res);
  }

  async getEvidence(incidentId: string) {
    try {
      const res = await this.rawFetch(`/api/v1/evidence/${incidentId}`);
      if (!res.ok) throw new Error('Failed to fetch evidence');
      return await safeParseJsonResponse(res);
    } catch {
      return [];
    }
  }

  async verifyEvidence(evidenceId: string) {
    const res = await this.rawFetch(`/api/v1/evidence/${evidenceId}/verify`, {
      method: 'POST',
    });
    return await safeParseJsonResponse(res);
  }

  async getWorkflows() {
    try {
      const res = await this.rawFetch('/api/v1/orchestration/workflows');
      if (!res.ok) throw new Error('Failed to fetch workflows');
      return await safeParseJsonResponse(res);
    } catch {
      return [];
    }
  }

  async approveWorkflow(id: string) {
    const res = await this.rawFetch(`/api/v1/orchestration/workflows/${id}/approve`, {
      method: 'POST',
    });
    return await safeParseJsonResponse(res);
  }

  async resetWorkflow(id: string) {
    const res = await this.rawFetch(`/api/v1/orchestration/workflows/${id}/reset`, {
      method: 'POST',
    });
    return await safeParseJsonResponse(res);
  }

  async getIntegrationsV1() {
    try {
      const res = await this.rawFetch('/api/v1/integrations');
      if (!res.ok) throw new Error('Failed to fetch connectors');
      return await safeParseJsonResponse(res);
    } catch {
      return [];
    }
  }

  async syncConnector(id: string) {
    const res = await this.rawFetch(`/api/v1/integrations/${id}/sync`, {
      method: 'POST',
    });
    return await safeParseJsonResponse(res);
  }

  async getSystemHealth() {
    try {
      const res = await this.rawFetch('/api/v1/system/health');
      if (!res.ok) throw new Error('Failed to fetch health');
      return await safeParseJsonResponse(res);
    } catch {
      return null;
    }
  }

  async getOntologyGraph(): Promise<OntologyGraphData | null> {
    try {
      const res = await this.rawFetch('/api/v1/ontology/graph');
      if (!res.ok) throw new Error('Failed to fetch unified ontology graph');
      return await safeParseJsonResponse(res);
    } catch {
      return null;
    }
  }

  async syncPublicFeeds() {
    const res = await this.rawFetch('/api/v1/feeds/sync', {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Public feed sync failed');
    return await safeParseJsonResponse(res);
  }

  async runAipQuery(query: string, selectedEntityId?: string): Promise<AipQueryResult> {
    const res = await this.rawFetch('/api/v1/aip/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, selectedEntityId }),
    });
    if (!res.ok) throw new Error('AIP query failed');
    return await safeParseJsonResponse(res);
  }

  async executeOntologyAction(actionType: string, targetId: string, author?: string) {
    const res = await this.rawFetch('/api/v1/ontology/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType, targetId, author }),
    });
    if (!res.ok) throw new Error('Ontology action failed');
    return await safeParseJsonResponse(res);
  }

  // --- Operating System & Compiler Execution Client Methods ---
  async getOsTelemetry(): Promise<OsTelemetryBundle | null> {
    try {
      const res = await this.rawFetch('/api/v1/os/telemetry');
      if (!res.ok) throw new Error('Failed to fetch OS telemetry');
      return await safeParseJsonResponse(res);
    } catch {
      return null;
    }
  }

  async killOsProcess(pid: number) {
    const res = await this.rawFetch(`/api/v1/os/processes/${pid}/kill`, { method: 'POST' });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Kill failed');
    return data;
  }

  async controlOsService(id: string, action: 'start' | 'stop' | 'restart') {
    const res = await this.rawFetch(`/api/v1/os/services/${id}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Service control failed');
    return data;
  }

  async listOsFiles(): Promise<OsFileEntry[]> {
    const res = await this.rawFetch('/api/v1/os/files');
    if (!res.ok) throw new Error('Failed to list OS files');
    return await safeParseJsonResponse(res);
  }

  async readOsFile(filePath: string): Promise<OsFileEntry> {
    const res = await this.rawFetch(`/api/v1/os/files/content?path=${encodeURIComponent(filePath)}`);
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to read file');
    return data;
  }

  async saveOsFile(filePath: string, content: string, language?: CompilerLanguage | 'text'): Promise<OsFileEntry> {
    const res = await this.rawFetch('/api/v1/os/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content, language }),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to save file');
    return data;
  }

  async deleteOsFile(filePath: string) {
    const res = await this.rawFetch(`/api/v1/os/files?path=${encodeURIComponent(filePath)}`, {
      method: 'DELETE',
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to delete file');
    return data;
  }

  async executeCompiler(params: {
    filePath: string;
    language: CompilerLanguage;
    source: string;
  }): Promise<CompilerExecutionRecord> {
    const res = await this.rawFetch('/api/v1/compiler/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Compiler execution failed');
    return data;
  }

  async getCompilerExecutions(): Promise<CompilerExecutionRecord[]> {
    try {
      const res = await this.rawFetch('/api/v1/compiler/executions');
      if (!res.ok) return [];
      return await safeParseJsonResponse(res);
    } catch {
      return [];
    }
  }

  // --- Live Operations, Real-Time Attacks, Newsroom & Challenges ---
  async getLiveOpsState(): Promise<LiveOpsStateSnapshot> {
    const res = await this.rawFetch('/api/v1/live/state');
    if (!res.ok) throw new Error('Failed to load live operations state');
    return await safeParseJsonResponse(res);
  }

  async setLiveAutoPilot(enabled: boolean): Promise<LiveOpsStateSnapshot> {
    const res = await this.rawFetch('/api/v1/live/autopilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) throw new Error('Failed to toggle AI auto-pilot');
    return await safeParseJsonResponse(res);
  }

  async runLiveAiCycle(): Promise<LiveOpsStateSnapshot> {
    const res = await this.rawFetch('/api/v1/live/ai-cycle', { method: 'POST' });
    if (!res.ok) throw new Error('AI defense cycle failed');
    return await safeParseJsonResponse(res);
  }

  async triggerLiveAttack(templateIndex?: number): Promise<{ attack: LiveOngoingAttack; state: LiveOpsStateSnapshot }> {
    const res = await this.rawFetch('/api/v1/live/attacks/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateIndex }),
    });
    if (!res.ok) throw new Error('Failed to trigger live attack');
    return await safeParseJsonResponse(res);
  }

  async counterLiveAttack(
    attackId: string,
    mode: 'counter' | 'contain' = 'counter'
  ): Promise<{ attack: LiveOngoingAttack; state: LiveOpsStateSnapshot }> {
    const res = await this.rawFetch(`/api/v1/live/attacks/${encodeURIComponent(attackId)}/counter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    if (!res.ok) throw new Error('Failed to execute AI countermeasure');
    return await safeParseJsonResponse(res);
  }

  async createChallenge(payload: {
    title: string;
    domain: OperationalChallenge['domain'];
    severity: OperationalChallenge['severity'];
    problemStatement: string;
    affectedSystems: string[];
  }): Promise<{ challenge: OperationalChallenge; state: LiveOpsStateSnapshot }> {
    const res = await this.rawFetch('/api/v1/live/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to post challenge');
    return data;
  }

  async resolveChallenge(id: string): Promise<{ challenge: OperationalChallenge; state: LiveOpsStateSnapshot }> {
    const res = await this.rawFetch(`/api/v1/live/challenges/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to resolve challenge');
    return data;
  }

  async refreshLiveNews(): Promise<{
    fetchedSources: string[];
    totalItems: number;
    newCorrelatedChallenges: number;
    state: LiveOpsStateSnapshot;
  }> {
    const res = await this.rawFetch('/api/v1/live/news/refresh', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to refresh live threat news');
    return await safeParseJsonResponse(res);
  }

  async analyzeNewsWithAi(newsId: string): Promise<{ item: LiveNewsItem; state: LiveOpsStateSnapshot }> {
    const res = await this.rawFetch(`/api/v1/live/news/${encodeURIComponent(newsId)}/analyze`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to correlate news item');
    return await safeParseJsonResponse(res);
  }

  // --- WebSocket Threat Feed History & Agent Defense / Policy Gateway ---
  async getThreatFeedHistory(): Promise<RealtimeThreatAlert[]> {
    try {
      const res = await this.rawFetch('/api/v1/threat-feed/history');
      if (!res.ok) return [];
      return await safeParseJsonResponse(res);
    } catch {
      return [];
    }
  }

  async getAgentDefenseOverview(): Promise<AgentDefenseOverviewSnapshot> {
    const res = await this.rawFetch('/api/v1/agent-defense/overview');
    if (!res.ok) throw new Error('Failed to load agent defense overview');
    return await safeParseJsonResponse(res);
  }

  async registerGovernedAgent(payload: {
    agentId: string;
    name: string;
    owner: string;
    organization?: string;
    agentType?: GovernedAgentProfile['agentType'];
    allowedTools: string[];
  }): Promise<{ agent: GovernedAgentProfile; overview: AgentDefenseOverviewSnapshot }> {
    const res = await this.rawFetch('/api/v1/agent-defense/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to register governed agent');
    return data;
  }

  async updateAgentTrustStatus(
    agentId: string,
    trustStatus: AgentTrustStatus
  ): Promise<{ agent: GovernedAgentProfile; overview: AgentDefenseOverviewSnapshot }> {
    const res = await this.rawFetch(`/api/v1/agent-defense/agents/${encodeURIComponent(agentId)}/trust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trustStatus }),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to update agent trust status');
    return data;
  }

  async evaluateAgentGateway(payload: {
    agentId: string;
    toolName: string;
    targetResource: string;
    justification: string;
    humanApproved?: boolean;
  }): Promise<{ evaluation: PolicyGateEvaluation; overview: AgentDefenseOverviewSnapshot }> {
    const res = await this.rawFetch('/api/v1/agent-defense/gateway/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Gateway policy evaluation failed');
    return data;
  }

  async toggleGlobalEmergencyStop(active: boolean, reason?: string): Promise<AgentDefenseOverviewSnapshot> {
    const res = await this.rawFetch('/api/v1/agent-defense/emergency-stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active, reason }),
    });
    if (!res.ok) throw new Error('Failed to toggle emergency stop');
    return await safeParseJsonResponse(res);
  }

  async runRedForceValidation(payload: {
    targetAgentId: string;
    attemptedTool: string;
    attackVector: string;
  }): Promise<{ run: RedBlueValidationRun; overview: AgentDefenseOverviewSnapshot }> {
    const res = await this.rawFetch('/api/v1/agent-defense/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Validation run failed');
    return data;
  }

  async getCivicGovernanceOverview(tenant = 'all') {
    const res = await this.rawFetch(`/api/v1/governance/overview?tenant=${encodeURIComponent(tenant)}`);
    if (!res.ok) throw new Error('Failed to load civic governance overview');
    return await safeParseJsonResponse(res);
  }

  async registerCivicService(payload: {
    tenantId?: string;
    institutionName: string;
    serviceName: string;
    owner?: string;
    criticality?: 'tier-0' | 'tier-1' | 'tier-2';
    authorizedEndpoint?: string;
  }) {
    const res = await this.rawFetch('/api/v1/governance/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to register service');
    return data;
  }

  async probeCivicService(serviceId: string) {
    const res = await this.rawFetch(`/api/v1/governance/services/${encodeURIComponent(serviceId)}/probe`, {
      method: 'POST',
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Service probe failed');
    return data;
  }

  async publishSignedRecord(payload: {
    tenantId?: string;
    title: string;
    issuingAuthority: string;
    contentBody: string;
    changeNotes?: string;
  }) {
    const res = await this.rawFetch('/api/v1/governance/publications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to sign publication record');
    return data;
  }

  async reviseSignedRecord(
    publicationId: string,
    payload: { contentBody: string; changeNotes: string; humanReviewedBy?: string }
  ) {
    const res = await this.rawFetch(`/api/v1/governance/publications/${encodeURIComponent(publicationId)}/revise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to revise publication');
    return data;
  }

  async verifySignedRecord(publicationId: string, candidateContent: string) {
    const res = await this.rawFetch(`/api/v1/governance/publications/${encodeURIComponent(publicationId)}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateContent }),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Provenance verification failed');
    return data;
  }

  async decideAccessReview(reviewId: string, decision: 'approved' | 'revoked', reviewer?: string) {
    const res = await this.rawFetch(`/api/v1/governance/access-reviews/${encodeURIComponent(reviewId)}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reviewer }),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Access review decision failed');
    return data;
  }

  async publishPolicyVersion(payload: {
    tenantId: string;
    policyName: string;
    version: string;
    changeSummary: string;
    rulePredicates: string[];
  }) {
    const res = await this.rawFetch('/api/v1/governance/policies/version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to publish policy version');
    return data;
  }

  async decideHumanApproval(
    approvalId: string,
    decision: 'approved' | 'rejected',
    decisionNote?: string
  ) {
    const res = await this.rawFetch(`/api/v1/governance/approvals/${encodeURIComponent(approvalId)}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, decisionNote }),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Approval decision failed');
    return data;
  }

  async ingestCanonicalTelemetry(payload: unknown) {
    const res = await this.rawFetch('/api/v1/governance/telemetry/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await safeParseJsonResponse(res);
  }

  async runFlagshipWorkflow(tenantId = 'tenant-public-digital') {
    const res = await this.rawFetch('/api/v1/governance/flagship-workflow/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Flagship workflow execution failed');
    return data;
  }

  async exportGovernanceEvidenceBundle() {
    const res = await this.rawFetch('/api/v1/governance/evidence-export');
    if (!res.ok) throw new Error('Failed to export evidence bundle');
    return await safeParseJsonResponse(res);
  }

  async getPublicMlStatus() {
    const res = await this.rawFetch('/api/v1/ml/status');
    if (!res.ok) throw new Error('Failed to load ML model status');
    return await safeParseJsonResponse(res);
  }

  async ingestPublicDataAndTrain(epochs = 34, learningRate = 0.15) {
    const res = await this.rawFetch('/api/v1/ml/ingest-and-train', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ epochs, learningRate }),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Public dataset ML training failed');
    return data;
  }

  async predictThreatWithMl(payload: {
    title: string;
    description: string;
    cvssScore?: number;
    kevFlag?: boolean;
    ransomwareFlag?: boolean;
    iocCount?: number;
  }) {
    const res = await this.rawFetch('/api/v1/ml/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'ML inference failed');
    return data;
  }

  async configureMlScheduler(payload: { enabled?: boolean; intervalMs?: number }) {
    const res = await this.rawFetch('/api/v1/ml/scheduler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to update ML scheduler');
    return data;
  }

  async inferTrafficPatternWithMl(payload: {
    trafficPattern: string;
    description: string;
    sourceEndpoint?: string;
    destinationEndpoint?: string;
    protocol?: string;
    destinationPort?: number;
    packetRatePps?: number;
    bytesTransferredKb?: number;
    cvssScore?: number;
    kevFlag?: boolean;
    ransomwareFlag?: boolean;
    iocCount?: number;
  }) {
    const res = await this.rawFetch('/api/v1/ml/infer-traffic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Traffic pattern inference failed');
    return data;
  }

  // ----------------------------------------------------
  // SERVER-VERIFIED AUTH & HF-CDF GLOBAL MULTI-TENANT APIs
  // ----------------------------------------------------
  async getAuthStatus() {
    const res = await this.authFetch('/api/v1/auth/status');
    return await safeParseJsonResponse(res);
  }

  async bootstrapAdmin(payload: { username: string; password: string; displayName?: string }) {
    const res = await this.rawFetch('/api/v1/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Admin claim failed');
    if (data.token) inMemoryAuthToken = data.token;
    return data;
  }

  async loginOperator(payload: {
    username: string;
    password: string;
    requestedRole?: RbacRole;
    requestedTenantId?: string;
  }) {
    const res = await this.rawFetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Authentication failed');
    if (data.token) inMemoryAuthToken = data.token;
    return data;
  }

  async logoutOperator() {
    await this.authFetch('/api/v1/auth/logout', { method: 'POST' });
    inMemoryAuthToken = null;
  }

  async switchAuthContext(role: RbacRole, assignedTenantId?: string) {
    const res = await this.authFetch('/api/v1/auth/switch-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, assignedTenantId }),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to switch RBAC context');
    if (data.token) inMemoryAuthToken = data.token;
    return data;
  }

  async getGlobalOverview() {
    const res = await this.authFetch('/api/v2/global/overview');
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to load Global Command overview');
    return data;
  }

  async onboardTenant(payload: {
    name: string;
    domain: string;
    industry: string;
    primaryEnvironment: CloudEnvironmentType;
    regionId: RegionalClusterId;
    isolationTier: IsolationTier;
    operatingModel: OperatingModel;
    autonomyMode: AutonomyMode;
    planTier: CommercialPlanTier;
  }) {
    const res = await this.authFetch('/api/v2/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to onboard organization');
    return data;
  }

  async getTenantWorkspace(tenantId: string) {
    const res = await this.authFetch(`/api/v2/tenants/${encodeURIComponent(tenantId)}/workspace`);
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || `Access denied (${res.status})`);
    return data;
  }

  async enrollTenantConnector(
    tenantId: string,
    payload: {
      name: string;
      environmentType: CloudEnvironmentType;
      packageFormat: 'helm' | 'terraform' | 'docker' | 'systemd' | 'powershell';
      permissionsGranted?: string[];
    }
  ) {
    const res = await this.authFetch(`/api/v2/tenants/${encodeURIComponent(tenantId)}/connectors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Connector enrollment failed');
    return data;
  }

  async revokeTenantConnector(tenantId: string, connectorId: string) {
    const res = await this.authFetch(
      `/api/v2/tenants/${encodeURIComponent(tenantId)}/connectors/${encodeURIComponent(connectorId)}/revoke`,
      { method: 'POST' }
    );
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Connector revocation failed');
    return data;
  }

  async registerTenantAsset(
    tenantId: string,
    payload: {
      name: string;
      assetType: 'k8s_cluster' | 'cloud_account' | 'identity_provider' | 'ai_model_endpoint' | 'database' | 'endpoint_fleet';
      provider: 'AWS' | 'Azure' | 'GCP' | 'On-Premises' | 'Kubernetes' | 'OpenAI/Custom';
      criticality: 'tier-0' | 'tier-1' | 'tier-2';
    }
  ) {
    const res = await this.authFetch(`/api/v2/tenants/${encodeURIComponent(tenantId)}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Asset registration failed');
    return data;
  }

  async registerTenantAgent(
    tenantId: string,
    payload: {
      name: string;
      force: 'BLUE_FORCE' | 'RED_FORCE';
      unitType: string;
      allowedTools: string[];
      allowedResources: string[];
      autonomyMode?: AutonomyMode;
    }
  ) {
    const res = await this.authFetch(`/api/v2/tenants/${encodeURIComponent(tenantId)}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Agent registration failed');
    return data;
  }

  async toggleTenantAgentKillSwitch(tenantId: string, agentId: string) {
    const res = await this.authFetch(
      `/api/v2/tenants/${encodeURIComponent(tenantId)}/agents/${encodeURIComponent(agentId)}/kill-switch`,
      { method: 'POST' }
    );
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Kill switch action failed');
    return data;
  }

  async evaluateTenantPolicyCheck(
    tenantId: string,
    payload: { agentId: string; toolName: string; targetResource: string; requestedAction?: string }
  ) {
    const res = await this.authFetch(`/api/v2/tenants/${encodeURIComponent(tenantId)}/policy-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Policy check failed');
    return data;
  }

  async approveTenantIncident(tenantId: string, incidentId: string, decision: 'approved' | 'rejected') {
    const res = await this.authFetch(
      `/api/v2/tenants/${encodeURIComponent(tenantId)}/incidents/${encodeURIComponent(incidentId)}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      }
    );
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Incident approval failed');
    return data;
  }

  async manageDelegatedGrant(
    tenantId: string,
    action: 'grant' | 'revoke',
    payload: { grantId?: string; scope?: string; reason?: string; durationHours?: number }
  ) {
    const res = await this.authFetch(`/api/v2/tenants/${encodeURIComponent(tenantId)}/delegated-grants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Delegated grant update failed');
    return data;
  }

  async getSocWorkspace() {
    const res = await this.authFetch('/api/v2/soc/workspace');
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to load SOC workspace');
    return data;
  }

  async runIsolationCheck() {
    const res = await this.authFetch('/api/v2/security/isolation-check', { method: 'POST' });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Isolation verification failed');
    return data;
  }

  async runFlagship29StepWorkflow() {
    const res = await this.authFetch('/api/v2/workflows/flagship-29-step', { method: 'POST' });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Flagship workflow failed');
    return data;
  }

  async runTenantRedForce(
    tenantId: string,
    payload: {
      scenarioName: string;
      unitType: string;
      targetAssetId: string;
      maxDurationMinutes: number;
      egressRestricted: boolean;
    }
  ) {
    const res = await this.authFetch(`/api/v2/tenants/${encodeURIComponent(tenantId)}/red-force`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok && !data?.exercise) throw new Error(data?.error || 'Red Force execution failed');
    return data;
  }

  async emergencyStopTenantRedForce(tenantId: string, exerciseId: string) {
    const res = await this.authFetch(
      `/api/v2/tenants/${encodeURIComponent(tenantId)}/red-force/${encodeURIComponent(exerciseId)}/stop`,
      { method: 'POST' }
    );
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Emergency stop failed');
    return data;
  }

  async ingestTenantTelemetry(
    tenantId: string,
    payload: { connectorId: string; assetId: string; domain: SecurityDomainType; signalMessage: string }
  ) {
    const res = await this.authFetch(`/api/v2/tenants/${encodeURIComponent(tenantId)}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Telemetry ingestion failed');
    return data;
  }

  async rotateTenantByok(tenantId: string) {
    const res = await this.authFetch(`/api/v2/tenants/${encodeURIComponent(tenantId)}/byok/rotate`, {
      method: 'POST',
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'BYOK key rotation failed');
    return data;
  }

  async updateTenantPolicy(
    tenantId: string,
    payload: {
      autonomyMode?: AutonomyMode;
      intelSharingOptIn?: boolean;
      dataClassification?: 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' | 'SOVEREIGN';
      retentionDays?: number;
      planTier?: CommercialPlanTier;
      localization?: TenantLocalizationConfig;
    }
  ) {
    const res = await this.authFetch(`/api/v2/tenants/${encodeURIComponent(tenantId)}/policy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Policy update failed');
    return data;
  }

  async getTenantAuditReport(tenantId: string) {
    const res = await this.authFetch(`/api/v2/tenants/${encodeURIComponent(tenantId)}/audit-report`);
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Audit report generation failed');
    return data;
  }

  async toggleRegionalFailover(regionId: RegionalClusterId) {
    const res = await this.authFetch(`/api/v2/regions/${encodeURIComponent(regionId)}/failover`, {
      method: 'POST',
    });
    const data = await safeParseJsonResponse(res);
    if (!res.ok) throw new Error(data?.error || 'Regional failover toggle failed');
    return data;
  }
}

export const api = new ApiService();
