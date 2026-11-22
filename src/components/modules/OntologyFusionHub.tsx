import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Database,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  AipQueryResult,
  OntologyGraphData,
  OntologyNode,
  OntologyObjectType,
} from '../../core/types';
import { queryOntology } from '../../core/ontology-engine';

interface OntologyFusionHubProps {
  onRefreshAllData: () => Promise<void>;
  onNotify: (message: string, type?: 'info' | 'success' | 'alert') => void;
  onSelectModule?: (moduleId: string) => void;
  onSelectIncident?: (incidentId: string) => void;
  initialAipQuery?: string | null;
  onConsumeInitialAipQuery?: () => void;
}

const OBJECT_TYPE_META: Record<
  OntologyObjectType,
  { label: string; color: string; short: string }
> = {
  organization: { label: 'Organizations', color: '#64d2ff', short: 'ORG' },
  asset: { label: 'Cluster Assets', color: '#0a84ff', short: 'ASSET' },
  incident: { label: 'Incidents', color: '#ff453a', short: 'INC' },
  vulnerability: { label: 'CISA KEVs', color: '#ff9f0a', short: 'KEV' },
  threat_actor: { label: 'Threat Actors', color: '#f43f5e', short: 'APT' },
  technique: { label: 'MITRE TTPs', color: '#a855f7', short: 'TTP' },
  ioc: { label: 'Indicators (IoC)', color: '#eab308', short: 'IOC' },
  agent: { label: 'AI Agents', color: '#30d158', short: 'AGENT' },
  domain_feed: { label: 'Domain Telemetry', color: '#38bdf8', short: 'DOMAIN' },
  learning_rule: { label: 'Self-Learned Rules', color: '#c084fc', short: 'RULE' },
};

const QUICK_AIP_PROMPTS = [
  'Correlate CISA KEVs with NVIDIA, Apple & GPU clusters',
  'Trace APT-41 exfiltration path & recommend containment',
  'Assess SWIFT clearing & Orbital QKD domain exposure',
];

export const OntologyFusionHub: React.FC<OntologyFusionHubProps> = ({
  onRefreshAllData,
  onNotify,
  onSelectModule,
  onSelectIncident,
  initialAipQuery,
  onConsumeInitialAipQuery,
}) => {
  const [graphData, setGraphData] = useState<OntologyGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingFeeds, setSyncingFeeds] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('INC-2026-084');
  const [typeFilter, setTypeFilter] = useState<'all' | OntologyObjectType>('all');
  const [explorerQuery, setExplorerQuery] = useState('');
  const [hopIsolation, setHopIsolation] = useState(false);
  const [centerTab, setCenterTab] = useState<'graph' | 'timeline' | 'kev'>('graph');
  const [graphZoom, setGraphZoom] = useState(1);

  // AIP Natural Language Command State
  const [aipInput, setAipInput] = useState('');
  const [aipLoading, setAipLoading] = useState(false);
  const [aipResult, setAipResult] = useState<AipQueryResult | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  const loadOntology = async () => {
    setLoading(true);
    const data = await api.getOntologyGraph();
    if (data) {
      setGraphData(data);
      if (!data.nodes.some((n) => n.id === selectedNodeId) && data.nodes[0]) {
        setSelectedNodeId(data.nodes[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOntology();
  }, []);

  useEffect(() => {
    if (initialAipQuery && !loading && graphData) {
      handleRunAipQuery(initialAipQuery);
      onConsumeInitialAipQuery?.();
    }
  }, [initialAipQuery, loading, Boolean(graphData)]);

  const handleSyncPublicFeeds = async () => {
    setSyncingFeeds(true);
    try {
      const res = await api.syncPublicFeeds();
      if (res?.graph) {
        setGraphData(res.graph);
      } else {
        await loadOntology();
      }
      await onRefreshAllData();
      onNotify(
        `Public threat pipelines synchronized (${res.liveCisaFetched ? 'Live CISA KEV' : 'Baseline KEV'} · +${res.ingestedNewRecords} records, swarm memory updated)`,
        'success'
      );
    } catch {
      onNotify('Failed to synchronize public threat feeds.', 'alert');
    } finally {
      setSyncingFeeds(false);
    }
  };

  const handleRunAipQuery = async (customQuery?: string) => {
    const q = (customQuery ?? aipInput).trim();
    if (!q) return;
    if (customQuery) setAipInput(customQuery);
    setAipLoading(true);
    try {
      const result = await api.runAipQuery(q, selectedNodeId);
      setAipResult(result);
      await loadOntology();
      await onRefreshAllData();
      onNotify(`AIP Investigation complete · Self-learning rule committed to swarm memory`, 'info');
    } catch {
      onNotify('AIP Ontology query encountered an error.', 'alert');
    } finally {
      setAipLoading(false);
    }
  };

  const handleExecuteAction = async (actionType: string, targetId: string) => {
    const actionKey = `${actionType}:${targetId}`;
    setExecutingActionId(actionKey);
    try {
      const res = await api.executeOntologyAction(actionType, targetId, 'Authorized Commander');
      if (res?.graph) {
        setGraphData(res.graph);
      } else {
        await loadOntology();
      }
      await onRefreshAllData();
      onNotify(res.summary || `Executed ${actionType} on ${targetId}`, 'success');
    } catch {
      onNotify(`Action ${actionType} failed for ${targetId}.`, 'alert');
    } finally {
      setExecutingActionId(null);
    }
  };

  const filteredSubgraph = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [] };
    return queryOntology(graphData, {
      query: explorerQuery,
      objectTypes: typeFilter === 'all' ? undefined : [typeFilter],
      maxHopFromId: hopIsolation ? selectedNodeId : undefined,
    });
  }, [graphData, explorerQuery, typeFilter, hopIsolation, selectedNodeId]);

  const selectedNode = useMemo(() => {
    if (!graphData) return undefined;
    return graphData.nodes.find((n) => n.id === selectedNodeId) || graphData.nodes[0];
  }, [graphData, selectedNodeId]);

  const selectedNeighbors = useMemo(() => {
    if (!graphData || !selectedNode) return [];
    const items: { edgeId: string; relationship: string; direction: 'out' | 'in'; node: OntologyNode }[] = [];
    for (const edge of graphData.edges) {
      if (edge.source === selectedNode.id) {
        const target = graphData.nodes.find((n) => n.id === edge.target);
        if (target) items.push({ edgeId: edge.id, relationship: edge.relationship, direction: 'out', node: target });
      } else if (edge.target === selectedNode.id) {
        const source = graphData.nodes.find((n) => n.id === edge.source);
        if (source) items.push({ edgeId: edge.id, relationship: edge.relationship, direction: 'in', node: source });
      }
    }
    return items;
  }, [graphData, selectedNode]);

  // 2-hop Cross-Domain Blast Radius calculation for Object Inspector
  const blastRadius = useMemo(() => {
    if (!graphData || !selectedNode) return { reachableCount: 0, domains: [] as string[] };
    const hop1 = new Set<string>([selectedNode.id]);
    for (const e of graphData.edges) {
      if (e.source === selectedNode.id) hop1.add(e.target);
      if (e.target === selectedNode.id) hop1.add(e.source);
    }
    const hop2 = new Set<string>(hop1);
    for (const e of graphData.edges) {
      if (hop1.has(e.source)) hop2.add(e.target);
      if (hop1.has(e.target)) hop2.add(e.source);
    }
    hop2.delete(selectedNode.id);
    const domains = Array.from(
      new Set(
        graphData.nodes
          .filter((n) => hop2.has(n.id))
          .map((n) => n.domain)
      )
    );
    return { reachableCount: hop2.size, domains };
  }, [graphData, selectedNode]);

  // Deterministic radial coordinates for SVG Ontology Graph (860 x 500 viewBox)
  const positionedGraph = useMemo(() => {
    const sourceNodes = hopIsolation
      ? filteredSubgraph.nodes
      : graphData?.nodes.slice(0, 28) || [];
    const allowedIds = new Set(sourceNodes.map((n) => n.id));
    const sourceEdges = (hopIsolation ? filteredSubgraph.edges : graphData?.edges || []).filter(
      (e) => allowedIds.has(e.source) && allowedIds.has(e.target)
    );

    const cx = 430;
    const cy = 250;

    // Group by ring tier so everything stays well-spaced and readable
    const coreRing = sourceNodes.filter(
      (n) => n.objectType === 'incident' || n.objectType === 'threat_actor' || n.id === selectedNodeId
    );
    const midRing = sourceNodes.filter(
      (n) => !coreRing.includes(n) && (n.objectType === 'asset' || n.objectType === 'vulnerability' || n.objectType === 'ioc')
    );
    const outerRing = sourceNodes.filter((n) => !coreRing.includes(n) && !midRing.includes(n));

    const coords = new Map<string, { x: number; y: number }>();

    const placeRing = (list: OntologyNode[], rx: number, ry: number, offsetAngle = 0) => {
      if (list.length === 0) return;
      list.forEach((node, idx) => {
        if (list.length === 1 && rx < 110) {
          coords.set(node.id, { x: cx, y: cy });
          return;
        }
        const angle = offsetAngle + (idx / list.length) * Math.PI * 2;
        coords.set(node.id, {
          x: cx + Math.cos(angle) * rx,
          y: cy + Math.sin(angle) * ry,
        });
      });
    };

    placeRing(coreRing, 92, 66, -Math.PI / 2);
    placeRing(midRing, 225, 138, 0.25);
    placeRing(outerRing, 360, 205, -0.15);

    return { nodes: sourceNodes, edges: sourceEdges, coords };
  }, [graphData, filteredSubgraph, hopIsolation, selectedNodeId]);

  const getSuggestedActionsForNode = (node: OntologyNode) => {
    const actions: { actionType: string; targetId: string; label: string; tone: 'danger' | 'primary' | 'amber' }[] = [];
    if (node.objectType === 'incident' && node.status !== 'contained' && node.status !== 'resolved') {
      actions.push({
        actionType: 'contain_incident',
        targetId: node.id,
        label: 'Approve & Contain Incident',
        tone: 'danger',
      });
    }
    if (node.objectType === 'asset') {
      actions.push({
        actionType: 'isolate_node',
        targetId: node.id,
        label: node.status === 'isolated' ? 'Restore Network Node' : 'Isolate & Quarantine Node',
        tone: 'amber',
      });
    }
    if (node.objectType === 'ioc' && node.status !== 'blocked') {
      actions.push({
        actionType: 'block_ioc',
        targetId: node.id,
        label: 'Block Indicator at Perimeter',
        tone: 'danger',
      });
    }
    if (node.objectType === 'agent') {
      actions.push({
        actionType: 'deploy_agent',
        targetId: node.id,
        label: 'Deploy Agent to Active Duty',
        tone: 'primary',
      });
    }
    actions.push({
      actionType: 'synthesize_learning',
      targetId: node.id,
      label: 'Commit Rule to Swarm Memory',
      tone: 'primary',
    });
    return actions;
  };

  if (loading && !graphData) {
    return (
      <div className="apple-card p-8 rounded-2xl border border-white/[0.08] text-center space-y-3">
        <RefreshCw className="w-6 h-6 text-[#0a84ff] animate-spin mx-auto" />
        <div className="text-sm font-semibold text-white">Compiling Unified Intelligence Ontology...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5 font-sans">
      {/* Unified Fusion Header */}
      <div className="apple-card p-6 rounded-2xl border border-white/[0.08] shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#86868b] font-mono">
              <span className="text-[#2997ff] font-semibold">HF-CDF SOVEREIGN ONTOLOGY</span>
              <span>·</span>
              <span>UNIFIED DATA PIPELINES + AIP REASONING + DETERMINISTIC CONTAINMENT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Unified Intelligence &amp; Ontology Fusion Core
            </h1>
            <p className="text-xs sm:text-sm text-[#a1a1a6] max-w-3xl">
              Single operational pane correlating live CISA KEV vulnerabilities, STIX/TAXII feeds, Fortune 500 &amp; GPU superclusters, Orbital QKD, Subsea trunks, SWIFT clearing, and self-learning swarm memory.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleSyncPublicFeeds}
              disabled={syncingFeeds}
              className="px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-60 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-sm whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingFeeds ? 'animate-spin' : ''}`} />
              <span>{syncingFeeds ? 'Syncing CISA KEV & Feeds...' : 'Sync Live Public Feeds'}</span>
            </button>
            {onSelectModule && (
              <button
                type="button"
                onClick={() => onSelectModule('shared-intel')}
                className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap"
              >
                <BrainCircuit className="w-3.5 h-3.5 text-[#c084fc]" />
                <span>Swarm Memory ({graphData?.stats.selfLearnedRulesCount ?? 0})</span>
              </button>
            )}
          </div>
        </div>

        {/* Crisp KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-white/[0.08]">
          <div>
            <div className="text-[11px] text-[#86868b]">Ontology Objects</div>
            <div className="text-xl font-bold text-white tabular-nums">{graphData?.stats.totalObjects ?? 0}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#86868b]">Cross-Domain Links</div>
            <div className="text-xl font-bold text-[#2997ff] tabular-nums">{graphData?.stats.totalRelationships ?? 0}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#86868b]">Critical Risk Nodes</div>
            <div className="text-xl font-bold text-[#ff453a] tabular-nums">{graphData?.stats.criticalRiskObjects ?? 0}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#86868b]">Matched CISA KEVs</div>
            <div className="text-xl font-bold text-[#ff9f0a] tabular-nums">{graphData?.stats.kevMatchedCount ?? 0}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#86868b]">Self-Learned Rules</div>
            <div className="text-xl font-bold text-[#c084fc] tabular-nums">{graphData?.stats.selfLearnedRulesCount ?? 0}</div>
          </div>
        </div>
      </div>

      {/* AIP Natural Language Investigation & Autonomous Reasoning Bar */}
      <div className="apple-card p-5 rounded-2xl border border-white/[0.08] space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Sparkles className="w-4 h-4 text-[#c084fc]" />
            <span>AIP NATURAL LANGUAGE ONTOLOGY INVESTIGATION (GEMINI 4 HYDROGEN + GRAPH ENGINE)</span>
          </div>
          <span className="text-[11px] font-mono text-[#86868b]">
            Focused: {selectedNode?.id || 'All Entities'}
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunAipQuery();
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <label htmlFor="aip-query-input" className="sr-only">
            Ask the Unified Intelligence Ontology
          </label>
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="aip-query-input"
              type="text"
              value={aipInput}
              onChange={(e) => setAipInput(e.target.value)}
              placeholder="Ask across all cyber incidents, CISA KEVs, Fortune 500 orgs, orbital, subsea, and financial systems..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs sm:text-sm text-white placeholder-[#6e6e73] focus:outline-none focus:border-[#0a84ff]"
            />
          </div>
          <button
            type="submit"
            disabled={aipLoading || !aipInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#c084fc]/20 hover:bg-[#c084fc]/30 border border-[#c084fc]/40 text-[#e9d5ff] disabled:opacity-50 text-xs font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <BrainCircuit className={`w-4 h-4 ${aipLoading ? 'animate-spin' : ''}`} />
            <span>{aipLoading ? 'Reasoning...' : 'Investigate Ontology'}</span>
          </button>
        </form>

        {/* Quick Investigation Prompts */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[#86868b]">Quick Prompts:</span>
          {QUICK_AIP_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleRunAipQuery(prompt)}
              disabled={aipLoading}
              className="px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-[11px] text-[#d1d1d6] hover:text-white transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* AIP Investigation Result */}
        {aipResult && (
          <div className="p-4 rounded-xl bg-black/50 border border-[#c084fc]/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <span className="text-[#c084fc] font-semibold">
                ENGINE: {aipResult.source.toUpperCase()} · CONFIDENCE {aipResult.confidence}%
              </span>
              <span className="text-[#30d158] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Self-Learning Rule Stored in Swarm Memory
              </span>
            </div>

            <div className="text-xs sm:text-sm text-[#e5e5ea] whitespace-pre-line leading-relaxed">
              {aipResult.answer}
            </div>

            {aipResult.citedEntityIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-[#86868b] mr-1">Cited Objects:</span>
                {aipResult.citedEntityIds.map((entityId) => (
                  <button
                    key={entityId}
                    type="button"
                    onClick={() => {
                      setSelectedNodeId(entityId);
                      setCenterTab('graph');
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                      selectedNodeId === entityId
                        ? 'bg-[#0a84ff]/20 border-[#0a84ff] text-white'
                        : 'bg-white/[0.04] border-white/10 text-[#64d2ff] hover:bg-white/10'
                    }`}
                  >
                    {entityId}
                  </button>
                ))}
              </div>
            )}

            {aipResult.recommendedActions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
                <span className="text-[11px] text-[#86868b]">Deterministic Actions:</span>
                {aipResult.recommendedActions.map((act) => {
                  const key = `${act.actionType}:${act.targetId}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={executingActionId === key}
                      onClick={() => handleExecuteAction(act.actionType, act.targetId)}
                      className="px-3 py-1.5 rounded-lg bg-[#ff453a]/15 hover:bg-[#ff453a]/25 border border-[#ff453a]/40 text-[#ff8a80] text-xs font-semibold transition-all flex items-center gap-1.5"
                      title={act.rationale}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{executingActionId === key ? 'Executing...' : act.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main 3-Pane Unified Ontology & Fusion Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Pane (3 Cols): Object Explorer & Foundry Data Pipelines */}
        <div className="lg:col-span-3 space-y-5">
          <div className="apple-card p-4 rounded-2xl border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                Ontology Objects
              </h2>
              <span className="text-[11px] font-mono text-[#86868b] tabular-nums">
                {filteredSubgraph.nodes.length} shown
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#86868b] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={explorerQuery}
                onChange={(e) => setExplorerQuery(e.target.value)}
                placeholder="Filter entities..."
                aria-label="Filter ontology entities"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white placeholder-[#6e6e73] focus:outline-none focus:border-[#0a84ff]"
              />
            </div>

            {/* Object Type Selector */}
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'incident', label: 'Incidents' },
                  { id: 'vulnerability', label: 'KEVs' },
                  { id: 'asset', label: 'Assets' },
                  { id: 'organization', label: 'Orgs' },
                  { id: 'agent', label: 'Agents' },
                  { id: 'learning_rule', label: 'Learned' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id)}
                  className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    typeFilter === tab.id
                      ? 'bg-white/15 text-white font-semibold'
                      : 'bg-white/[0.03] text-[#86868b] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable Object List */}
            <div className="max-h-[340px] overflow-y-auto space-y-1.5 pr-1">
              {filteredSubgraph.nodes.map((node) => {
                const meta = OBJECT_TYPE_META[node.objectType];
                const isSelected = selectedNode?.id === node.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[#0a84ff]/15 border-[#0a84ff]/55 text-white'
                        : 'bg-black/30 border-white/[0.06] text-[#d1d1d6] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                      <span style={{ color: meta.color }} className="font-bold">
                        {meta.short}
                      </span>
                      <span
                        className={`tabular-nums font-semibold ${
                          node.riskScore >= 80
                            ? 'text-[#ff453a]'
                            : node.riskScore >= 60
                            ? 'text-[#ff9f0a]'
                            : 'text-[#30d158]'
                        }`}
                      >
                        RISK {node.riskScore}
                      </span>
                    </div>
                    <div className="text-xs font-medium truncate mt-0.5">{node.label}</div>
                    <div className="text-[10px] text-[#86868b] truncate">
                      {node.domain} · {node.status}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data Ingestion Pipelines (Foundry Layer) */}
          <div className="apple-card p-4 rounded-2xl border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#0a84ff]" />
                <span>Data Pipelines</span>
              </h2>
              <span className="text-[10px] font-mono text-[#30d158]">ACTIVE</span>
            </div>

            <div className="space-y-2">
              {graphData?.pipelines.map((pipe) => (
                <div
                  key={pipe.id}
                  className="p-2.5 rounded-xl bg-black/35 border border-white/[0.06] space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-white truncate">{pipe.name}</span>
                    <span
                      className={`text-[10px] font-mono uppercase shrink-0 ${
                        pipe.status === 'live' ? 'text-[#30d158]' : 'text-[#ff9f0a]'
                      }`}
                    >
                      {pipe.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#86868b] tabular-nums">
                    <span>{pipe.category}</span>
                    <span>{pipe.recordsIngested.toLocaleString()} recs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Pane (6 Cols): Interactive Ontology Graph / Unified Fusion Stream / CISA KEV Matrix */}
        <div className="lg:col-span-6 space-y-4">
          <div className="apple-card p-5 rounded-2xl border border-white/[0.08] space-y-4">
            {/* Center Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08]">
                {[
                  { id: 'graph', label: 'Ontology Graph' },
                  { id: 'timeline', label: 'Fused Threat Stream' },
                  { id: 'kev', label: 'CISA KEV Matrix' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCenterTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      centerTab === tab.id
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-[#86868b] hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {centerTab === 'graph' && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHopIsolation(!hopIsolation)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono border transition-colors ${
                      hopIsolation
                        ? 'bg-[#0a84ff]/20 border-[#0a84ff] text-white'
                        : 'bg-white/[0.04] border-white/10 text-[#a1a1a6] hover:text-white'
                    }`}
                  >
                    {hopIsolation ? '1-Hop Focus: ON' : 'Full Graph'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGraphZoom((z) => Math.max(0.75, +(z - 0.15).toFixed(2)))}
                    aria-label="Zoom out ontology graph"
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[#a1a1a6] hover:text-white"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setGraphZoom((z) => Math.min(1.45, +(z + 0.15).toFixed(2)))}
                    aria-label="Zoom in ontology graph"
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[#a1a1a6] hover:text-white"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Tab 1: Interactive SVG Ontology Graph */}
            {centerTab === 'graph' && (
              <div className="space-y-3">
                <div className="relative w-full h-[460px] rounded-xl bg-[#07080b] border border-white/[0.07] overflow-hidden">
                  <svg
                    viewBox="0 0 860 500"
                    className="w-full h-full select-none"
                    style={{
                      transform: `scale(${graphZoom})`,
                      transformOrigin: 'center center',
                      transition: 'transform 180ms ease',
                    }}
                  >
                    <defs>
                      <radialGradient id="ontologyGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#0a84ff" stopOpacity="0.14" />
                        <stop offset="100%" stopColor="#05070b" stopOpacity="0" />
                      </radialGradient>
                      <pattern id="ontologyBlueprintGrid" width="28" height="28" patternUnits="userSpaceOnUse">
                        <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="0.7" />
                      </pattern>
                      <marker id="arrow-active" viewBox="0 0 10 10" refX="19" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 1 L 10 5 L 0 9 z" fill="#2997ff" />
                      </marker>
                      <marker id="arrow-muted" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                        <path d="M 0 1 L 10 5 L 0 9 z" fill="rgba(255,255,255,0.22)" />
                      </marker>
                    </defs>
                    <rect width="860" height="500" fill="url(#ontologyBlueprintGrid)" />
                    <rect width="860" height="500" fill="url(#ontologyGlow)" />

                    {/* Subtle Semantic Rings */}
                    <ellipse cx="430" cy="250" rx="92" ry="66" fill="none" stroke="rgba(10,132,255,0.2)" strokeDasharray="3 4" />
                    <ellipse cx="430" cy="250" rx="225" ry="138" fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 4" />
                    <ellipse cx="430" cy="250" rx="360" ry="205" fill="none" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 4" />

                    {/* Relationship Edges with Directional Arrowheads */}
                    {positionedGraph.edges.map((edge) => {
                      const p1 = positionedGraph.coords.get(edge.source);
                      const p2 = positionedGraph.coords.get(edge.target);
                      if (!p1 || !p2) return null;
                      const isConnectedToSelected =
                        edge.source === selectedNode?.id || edge.target === selectedNode?.id;
                      const isThreatPath =
                        edge.relationship === 'impacts_asset' ||
                        edge.relationship === 'exposes_asset' ||
                        edge.relationship === 'attributed_to';
                      const midX = (p1.x + p2.x) / 2;
                      const midY = (p1.y + p2.y) / 2;
                      return (
                        <g key={edge.id}>
                          <line
                            x1={p1.x}
                            y1={p1.y}
                            x2={p2.x}
                            y2={p2.y}
                            stroke={
                              isConnectedToSelected
                                ? '#2997ff'
                                : isThreatPath
                                ? 'rgba(255,69,58,0.28)'
                                : 'rgba(255,255,255,0.12)'
                            }
                            strokeWidth={isConnectedToSelected ? 1.8 : 1}
                            strokeDasharray={isThreatPath ? '4 3' : undefined}
                            markerEnd={isConnectedToSelected ? 'url(#arrow-active)' : 'url(#arrow-muted)'}
                          />
                          {isConnectedToSelected && hopIsolation && (
                            <text
                              x={midX}
                              y={midY - 4}
                              textAnchor="middle"
                              fill="#64d2ff"
                              fontSize="8.5"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              {edge.relationship}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Ontology Nodes */}
                    {positionedGraph.nodes.map((node) => {
                      const pos = positionedGraph.coords.get(node.id);
                      if (!pos) return null;
                      const meta = OBJECT_TYPE_META[node.objectType];
                      const isSelected = node.id === selectedNode?.id;
                      const isNeighbor = selectedNeighbors.some((sn) => sn.node.id === node.id);
                      const radius = isSelected ? 15 : node.riskScore >= 85 ? 11.5 : 9;

                      return (
                        <g
                          key={node.id}
                          onClick={() => setSelectedNodeId(node.id)}
                          className="cursor-pointer"
                        >
                          {isSelected && (
                            <circle
                              cx={pos.x}
                              cy={pos.y}
                              r={radius + 6}
                              fill="none"
                              stroke="#ffffff"
                              strokeOpacity="0.65"
                              strokeWidth="1.5"
                            />
                          )}
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r={radius}
                            fill="#0d1117"
                            stroke={meta.color}
                            strokeWidth={isSelected || isNeighbor ? 2.5 : 1.6}
                          />
                          <text
                            x={pos.x}
                            y={pos.y + 3}
                            textAnchor="middle"
                            fill={meta.color}
                            fontSize="7"
                            fontWeight="700"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {meta.short.slice(0, 3)}
                          </text>
                          <text
                            x={pos.x}
                            y={pos.y + radius + 12}
                            textAnchor="middle"
                            fill={isSelected || isNeighbor ? '#ffffff' : '#a1a1a6'}
                            fontSize="9"
                            fontWeight={isSelected ? '600' : '400'}
                          >
                            {node.label.length > 22 ? `${node.label.slice(0, 20)}…` : node.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Compact Color Legend */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#a1a1a6]">
                  {(
                    [
                      'incident',
                      'vulnerability',
                      'asset',
                      'organization',
                      'agent',
                      'domain_feed',
                      'learning_rule',
                    ] as OntologyObjectType[]
                  ).map((t) => (
                    <span key={t} className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: OBJECT_TYPE_META[t].color }}
                      />
                      <span>{OBJECT_TYPE_META[t].label}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Unified Cross-Domain Fusion Stream */}
            {centerTab === 'timeline' && (
              <div className="max-h-[490px] overflow-y-auto space-y-2.5 pr-1">
                {graphData?.fusionTimeline.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-xl bg-black/40 border border-white/[0.07] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold uppercase ${
                            evt.severity === 'critical'
                              ? 'text-[#ff453a]'
                              : evt.severity === 'high'
                              ? 'text-[#ff9f0a]'
                              : 'text-[#2997ff]'
                          }`}
                        >
                          [{evt.domain}] · {evt.severity.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[#86868b] tabular-nums">
                        {new Date(evt.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-white">{evt.title}</div>
                    <p className="text-[11px] text-[#a1a1a6] leading-relaxed">{evt.description}</p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {evt.linkedEntityIds.slice(0, 4).map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setSelectedNodeId(id);
                            setCenterTab('graph');
                          }}
                          className="px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/10 text-[10px] font-mono text-[#64d2ff]"
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: CISA KEV Exposure Matrix */}
            {centerTab === 'kev' && (
              <div className="max-h-[490px] overflow-y-auto space-y-2.5 pr-1">
                {graphData?.kevEntries.map((kev) => (
                  <div
                    key={kev.cveID}
                    className="p-3.5 rounded-xl bg-black/40 border border-white/[0.07] space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedNodeId(`kev-${kev.cveID}`)}
                        className="text-xs font-mono font-bold text-[#ff9f0a] hover:underline"
                      >
                        {kev.cveID} · {kev.vendorProject} ({kev.product})
                      </button>
                      <span className="text-[11px] font-mono font-bold text-[#ff453a] tabular-nums">
                        RISK {kev.riskScore}/100 · DUE {kev.dueDate}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-white">{kev.vulnerabilityName}</div>
                    <p className="text-[11px] text-[#a1a1a6]">{kev.shortDescription}</p>
                    <div className="text-[11px] text-[#30d158] font-mono">
                      Required Action: {kev.requiredAction}
                    </div>
                    {kev.correlatedAssets.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-[#86868b]">Impacted Ontology Objects:</span>
                        {kev.correlatedAssets.map((assetId) => (
                          <button
                            key={assetId}
                            type="button"
                            onClick={() => {
                              setSelectedNodeId(assetId);
                              setCenterTab('graph');
                            }}
                            className="px-2 py-0.5 rounded bg-[#ff453a]/15 border border-[#ff453a]/30 text-[10px] font-mono text-[#ff8a80] hover:bg-[#ff453a]/25"
                          >
                            {assetId}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane (3 Cols): Object Inspector & Deterministic Actions */}
        <div className="lg:col-span-3 space-y-4">
          {selectedNode ? (
            <div className="apple-card p-4 rounded-2xl border border-white/[0.08] space-y-4">
              <div className="space-y-1 pb-3 border-b border-white/[0.08]">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span
                    className="font-bold uppercase"
                    style={{ color: OBJECT_TYPE_META[selectedNode.objectType].color }}
                  >
                    {OBJECT_TYPE_META[selectedNode.objectType].label}
                  </span>
                  <span className="text-[#86868b]">{selectedNode.domain}</span>
                </div>
                <h2 className="text-sm font-bold text-white leading-snug">{selectedNode.label}</h2>
                <div className="text-[11px] font-mono text-[#86868b]">ID: {selectedNode.id}</div>
              </div>

              {/* Risk & Status */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#86868b]">State: <strong className="text-white uppercase font-mono text-[11px]">{selectedNode.status}</strong></span>
                  <span className="font-mono font-bold text-white tabular-nums">{selectedNode.riskScore}/100</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full ${
                      selectedNode.riskScore >= 80
                        ? 'bg-[#ff453a]'
                        : selectedNode.riskScore >= 55
                        ? 'bg-[#ff9f0a]'
                        : 'bg-[#30d158]'
                    }`}
                    style={{ width: `${selectedNode.riskScore}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-[#d1d1d6] leading-relaxed">{selectedNode.summary}</p>

              {/* Cross-Domain Blast Radius Analytics */}
              <div className="p-2.5 rounded-lg bg-black/50 border border-white/[0.08] space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#86868b] uppercase">2-Hop Blast Radius</span>
                  <span className="text-[#2997ff] font-bold tabular-nums">{blastRadius.reachableCount} Entities</span>
                </div>
                <div className="text-[10px] font-mono text-[#cbd5e1] truncate">
                  Domains: {blastRadius.domains.length > 0 ? blastRadius.domains.join(' · ') : selectedNode.domain}
                </div>
              </div>

              {/* Metadata Fields */}
              <div className="space-y-1.5 pt-2 border-t border-white/[0.06] text-[11px]">
                {Object.entries(selectedNode.metadata).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-[#86868b] font-mono truncate">{k}</span>
                    <span className="text-white font-mono text-right truncate max-w-[160px]">
                      {Array.isArray(v) ? v.join(', ') : String(v)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Deterministic Ontology Actions */}
              <div className="space-y-2 pt-3 border-t border-white/[0.08]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#86868b]">
                  Deterministic Ontology Actions
                </div>
                {getSuggestedActionsForNode(selectedNode).map((act) => {
                  const key = `${act.actionType}:${act.targetId}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={executingActionId === key}
                      onClick={() => handleExecuteAction(act.actionType, act.targetId)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                        act.tone === 'danger'
                          ? 'bg-[#ff453a] hover:bg-[#e03126] text-white'
                          : act.tone === 'amber'
                          ? 'bg-[#ff9f0a]/20 hover:bg-[#ff9f0a]/30 border border-[#ff9f0a]/40 text-[#ffd60a]'
                          : 'bg-[#0a84ff]/15 hover:bg-[#0a84ff]/25 border border-[#0a84ff]/40 text-[#64d2ff]'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{executingActionId === key ? 'Executing...' : act.label}</span>
                    </button>
                  );
                })}

                {selectedNode.objectType === 'incident' && onSelectIncident && (
                  <button
                    type="button"
                    onClick={() => onSelectIncident(selectedNode.id)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-medium text-white flex items-center justify-center gap-1.5"
                  >
                    <span>Open Full Incident Case</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Linked Relationships (1-Hop Traversal) */}
              <div className="space-y-2 pt-3 border-t border-white/[0.08]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#86868b]">
                  Connected Relationships ({selectedNeighbors.length})
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {selectedNeighbors.map((rel) => (
                    <button
                      key={rel.edgeId}
                      type="button"
                      onClick={() => setSelectedNodeId(rel.node.id)}
                      className="w-full text-left p-2 rounded-lg bg-black/35 hover:bg-white/[0.06] border border-white/[0.06] transition-colors"
                    >
                      <div className="text-[10px] font-mono text-[#2997ff]">
                        {rel.direction === 'out' ? `→ ${rel.relationship}` : `← ${rel.relationship}`}
                      </div>
                      <div className="text-[11px] font-medium text-white truncate">
                        {rel.node.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="apple-card p-6 rounded-2xl border border-white/[0.08] text-xs text-[#86868b]">
              Select any object in the Ontology Graph to inspect properties and execute containment actions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
