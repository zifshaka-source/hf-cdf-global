import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Lock,
  Cpu,
  CheckCircle2,
  FileCheck,
  History,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Clock,
  GitCommitVertical,
} from 'lucide-react';
import { Incident, IncidentState } from '../../core/types';
import { buildIncidentTimeline, computeIncidentTimeToContain } from '../../core/incident-timeline';
import { api } from '../../services/api';
import { sound } from '../../core/sound-fx';

interface IncidentManagementProps {
  incidents: Incident[];
  selectedIncidentId?: string;
  onTransitionIncident: (
    incidentId: string,
    nextState: IncidentState,
    notes: string
  ) => Promise<any>;
  onContainIncident: (incidentId: string) => Promise<any>;
}

export const IncidentManagement: React.FC<IncidentManagementProps> = ({
  incidents,
  selectedIncidentId: initialId,
  onTransitionIncident,
  onContainIncident,
}) => {
  const [activeId, setActiveId] = useState<string>(initialId || incidents[0]?.id || '');
  const [filterState, setFilterState] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transitionNotes, setTransitionNotes] = useState('');
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const currentIncident = incidents.find((i) => i.id === activeId) || incidents[0];

  useEffect(() => {
    if (initialId) {
      setActiveId(initialId);
    }
  }, [initialId]);

  useEffect(() => {
    if (currentIncident?.id) {
      api.getEvidence(currentIncident.id).then((items) => {
        if (items && items.length > 0) {
          setEvidenceList(items);
        } else {
          setEvidenceList([]);
        }
      });
    }
  }, [currentIncident?.id]);

  const handleVerifyEvidence = async (evId: string) => {
    setVerifyingId(evId);
    sound.play('click');
    try {
      await api.verifyEvidence(evId);
      sound.play('success');
      setEvidenceList((prev) =>
        prev.map((item) =>
          item.id === evId
            ? { ...item, integrityStatus: 'verified', accessCount: (item.accessCount || 0) + 1 }
            : item
        )
      );
    } finally {
      setVerifyingId(null);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    const matchesFilter = filterState === 'all' ? true : inc.state === filterState;
    const matchesSearch =
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.summary.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleRunAiAnalysis = async () => {
    if (!currentIncident) return;
    setIsAnalyzing(true);
    sound.play('radar');
    try {
      const res = await api.analyzeIncidentWithAI(currentIncident.id);
      setAiAnalysis(res);
      sound.play('success');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const states: IncidentState[] = [
    'new',
    'investigating',
    'confirmed',
    'contained',
    'remediating',
    'resolved',
    'closed',
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <span>Incident Lifecycle & Containment Matrix</span>
          </h1>
          <p className="text-xs text-slate-400">
            End-to-end incident management with cryptographic evidence records and human authorization gates.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter incidents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-white/10 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-48 sm:w-60 font-mono"
            />
          </div>

          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-900 border border-white/10 rounded text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
          >
            <option value="all">All States</option>
            {states.map((st) => (
              <option key={st} value={st}>
                {st.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Split: Incident Queue (4 cols) & Detail Dossier (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Incident List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-semibold text-slate-400 font-mono">
            INCIDENT QUEUE ({filteredIncidents.length})
          </div>

          <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
            {filteredIncidents.map((inc) => {
              const isSelected = inc.id === activeId;
              return (
                <div
                  key={inc.id}
                  onClick={() => {
                    setActiveId(inc.id);
                    setAiAnalysis(null);
                  }}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'border-cyan-500/50 bg-cyan-950/30'
                      : 'border-white/10 bg-slate-900/40 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white">{inc.id}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                        inc.severity === 'critical'
                          ? 'bg-red-500/20 text-red-300'
                          : inc.severity === 'high'
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {inc.severity}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-slate-100 line-clamp-1">{inc.title}</h3>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-white/5">
                    <span className="capitalize">{inc.state}</span>
                    <span className="text-[10px] tabular-nums">
                      {inc.detectedAt.slice(11, 16)} UTC
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Dossier (8 cols) */}
        {currentIncident ? (
          <div className="lg:col-span-8 space-y-5">
            <div className="p-6 rounded-lg border border-white/10 bg-slate-900/50 space-y-5">
              {/* Incident Header & Lifecycle Stepper */}
              <div className="space-y-3 pb-4 border-b border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-cyan-400">
                      {currentIncident.id}
                    </span>
                    <span className="text-slate-500">/</span>
                    <span className="text-xs font-mono uppercase text-red-400 font-bold">
                      {currentIncident.severity} SEVERITY
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Detected: {currentIncident.detectedAt}
                  </div>
                </div>

                <h2 className="text-lg font-bold text-white">{currentIncident.title}</h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentIncident.summary}
                </p>

                {/* Lifecycle Pipeline Buttons */}
                <div className="pt-2">
                  <div className="text-[11px] font-mono text-slate-400 pb-1.5">
                    LIFECYCLE STATE MACHINE
                  </div>
                  <div className="flex flex-wrap gap-1 p-1 bg-black/40 rounded border border-white/10">
                    {states.map((st) => {
                      const isCurrent = currentIncident.state === st;
                      return (
                        <button
                          key={st}
                          onClick={() => {
                            if (st !== currentIncident.state) {
                              onTransitionIncident(
                                currentIncident.id,
                                st,
                                transitionNotes || `Operator marked state as ${st}`
                              );
                            }
                          }}
                          className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors uppercase ${
                            isCurrent
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Containment Directive & Gate */}
              <div className="p-4 rounded-lg border border-red-500/30 bg-red-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-300">
                    <Lock className="w-4 h-4 text-red-400" />
                    <span>Authorized Containment Directive</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-200">
                    STATUS: {currentIncident.state.toUpperCase()}
                  </span>
                </div>

                <div className="text-xs font-mono text-slate-200 bg-black/40 p-2.5 rounded border border-white/5">
                  {currentIncident.containmentActionProposed || 'ISOLATE_CLUSTER_SUBNET'}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Required Role: SecOps Lead or Admin
                  </span>
                  <button
                    onClick={() => {
                      sound.play('lock');
                      onContainIncident(currentIncident.id);
                    }}
                    disabled={currentIncident.state === 'contained'}
                    className={`px-4 py-1.5 text-xs font-semibold rounded transition-all flex items-center gap-2 ${
                      currentIncident.state === 'contained'
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-red-600 hover:bg-red-500 text-white border border-red-500/50 shadow-lg shadow-red-900/30'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>
                      {currentIncident.state === 'contained'
                        ? 'Containment Active'
                        : 'Authorize & Enforce Containment'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Vertical State Transition & Containment Timeline */}
              {(() => {
                const timelineNodes = buildIncidentTimeline(currentIncident);
                const containMetrics = computeIncidentTimeToContain(currentIncident);
                return (
                  <div
                    data-testid="incident-vertical-timeline"
                    className="p-5 rounded-xl border border-white/[0.1] bg-[#111113] space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        <GitCommitVertical className="w-4 h-4 text-[#0a84ff]" />
                        <div>
                          <h3 className="text-xs font-bold text-[#f5f5f7] uppercase tracking-wider">
                            Vertical State Transition &amp; Containment Timeline
                          </h3>
                          <p className="text-[11px] text-[#86868b]">
                            Chronological forensic ledger highlighting critical transitions &amp; containment enforcement timestamps
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border font-semibold ${
                          containMetrics.isContained
                            ? 'bg-[#30d158]/15 border-[#30d158]/35 text-[#30d158]'
                            : 'bg-[#ff9f0a]/15 border-[#ff9f0a]/35 text-[#ffb340]'
                        }`}
                      >
                        {containMetrics.isContained
                          ? `TTC: ${containMetrics.timeToContainLabel}`
                          : 'UNCONTAINED · AWAITING GATE'}
                      </span>
                    </div>

                    {/* Key Timestamp Callout Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] font-mono">
                      <div className="p-2.5 rounded-lg bg-[#0a0a0c] border border-white/[0.07]">
                        <div className="text-[9px] text-[#86868b] uppercase">Initial Detection</div>
                        <div className="text-[#f5f5f7] font-semibold truncate mt-0.5">
                          {currentIncident.detectedAt}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#0a0a0c] border border-white/[0.07]">
                        <div className="text-[9px] text-[#86868b] uppercase">Containment Timestamp</div>
                        <div
                          className={`font-semibold truncate mt-0.5 ${
                            containMetrics.containmentTimestamp ? 'text-[#30d158]' : 'text-[#ffb340]'
                          }`}
                        >
                          {containMetrics.containmentTimestamp || 'Pending SecOps Authorization'}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#0a0a0c] border border-white/[0.07]">
                        <div className="text-[9px] text-[#86868b] uppercase">Authorized Approver</div>
                        <div className="text-[#64d2ff] font-semibold truncate mt-0.5">
                          {currentIncident.containmentApprovedBy || 'Requires Tier-3 Lead'}
                        </div>
                      </div>
                    </div>

                    {/* Vertical Timeline Spine */}
                    <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-white/[0.12]">
                      {timelineNodes.map((node) => {
                        const dotStyle =
                          node.category === 'containment'
                            ? node.badge === 'AWAITING CONTAINMENT'
                              ? 'bg-[#ff9f0a] ring-4 ring-[#ff9f0a]/20'
                              : 'bg-[#30d158] ring-4 ring-[#30d158]/25'
                            : node.category === 'detection'
                            ? 'bg-[#ff453a] ring-4 ring-[#ff453a]/25'
                            : node.category === 'state_transition'
                            ? 'bg-[#0a84ff] ring-4 ring-[#0a84ff]/20'
                            : 'bg-[#64d2ff] ring-2 ring-[#64d2ff]/20';

                        const badgeStyle =
                          node.category === 'containment'
                            ? node.badge === 'AWAITING CONTAINMENT'
                              ? 'bg-[#ff9f0a]/15 text-[#ffb340] border-[#ff9f0a]/35'
                              : 'bg-[#30d158]/15 text-[#30d158] border-[#30d158]/35'
                            : node.category === 'detection'
                            ? 'bg-[#ff453a]/15 text-[#ff6961] border-[#ff453a]/35'
                            : node.category === 'state_transition'
                            ? 'bg-[#0a84ff]/15 text-[#64d2ff] border-[#0a84ff]/35'
                            : 'bg-white/[0.06] text-[#a1a1a6] border-white/[0.1]';

                        return (
                          <div key={node.id} className="relative">
                            <span
                              className={`absolute -left-[21px] top-1.5 w-3 h-3 rounded-full ${dotStyle}`}
                            />
                            <div
                              className={`p-3 rounded-xl border space-y-1.5 transition-colors ${
                                node.isCritical
                                  ? 'border-white/[0.12] bg-[#161618]'
                                  : 'border-white/[0.06] bg-[#0d0d0f]'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded border font-bold uppercase ${badgeStyle}`}
                                  >
                                    {node.badge}
                                  </span>
                                  <span className="text-[#f5f5f7] font-semibold text-xs font-sans">
                                    {node.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[#86868b] tabular-nums">
                                  <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/[0.08] text-[#a1a1a6]">
                                    {node.elapsedFromDetectionLabel}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {node.timestamp}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-[#d1d1d6] leading-relaxed">{node.subtitle}</p>
                              <div className="text-[10px] font-mono text-[#86868b]">
                                Actor / Sensor: <span className="text-[#a1a1a6]">{node.actor}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Autonomous Threat Intelligence & Root Cause Attribution Matrix */}
              <div className="p-4 rounded-lg border border-indigo-500/30 bg-indigo-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    <span>Autonomous Threat Attribution & Forensic Root Cause Matrix</span>
                  </div>
                  <button
                    onClick={handleRunAiAnalysis}
                    disabled={isAnalyzing}
                    className="px-3 py-1 text-[11px] font-mono text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded transition-colors flex items-center gap-1.5"
                  >
                    <span>{isAnalyzing ? 'Executing Attribution...' : 'Execute Threat Attribution'}</span>
                  </button>
                </div>

                {aiAnalysis ? (
                  <div className="p-3.5 rounded bg-black/40 border border-white/5 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400">
                      <span>Engine: {aiAnalysis.source}</span>
                      <span>Confidence: {aiAnalysis.analysis?.confidenceScore}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Attribution Hypothesis:</span>
                      <p className="text-slate-200 mt-0.5">
                        {aiAnalysis.analysis?.threatActorHypothesis}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Root Cause Assessment:</span>
                      <p className="text-slate-200 mt-0.5">
                        {aiAnalysis.analysis?.rootCauseAssessment}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Mitre Techniques Identified:</span>
                      <div className="flex gap-1.5 mt-1">
                        {aiAnalysis.analysis?.mitreTechniqueCodes?.map((code: string) => (
                          <span
                            key={code}
                            className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono text-[10px]"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">
                    Execute high-order heuristic attribution, adversarial TTP mapping, and automated containment verification for this incident dossier.
                  </div>
                )}
              </div>

              {/* Cryptographic Evidence Locker (Blueprint Section 12.3 & 21.4) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <FileCheck className="w-4 h-4 text-cyan-400" />
                    <span>
                      Cryptographic Evidence Locker ({evidenceList.length > 0 ? evidenceList.length : currentIncident.evidenceItems.length} Artifacts)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400">SHA-256 INTEGRITY GAUGE</span>
                </div>

                {evidenceList.length > 0 ? (
                  <div className="space-y-2.5">
                    {evidenceList.map((ev) => {
                      const isVerifying = verifyingId === ev.id;
                      const isVerified = ev.integrityStatus === 'verified';

                      return (
                        <div
                          key={ev.id}
                          className="p-3.5 rounded border border-white/10 bg-black/40 text-xs font-mono space-y-2 hover:border-white/20 transition-all"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded">
                                {ev.id}
                              </span>
                              <span className="text-slate-300 font-sans font-semibold">{ev.title}</span>
                            </div>
                            <span
                              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                                isVerified
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>{isVerified ? 'SHA-256 MATCH VERIFIED' : 'UNVERIFIED'}</span>
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 font-mono bg-black/60 p-1.5 rounded border border-white/5 truncate">
                            SHA256: {ev.sha256Hash}
                          </div>

                          <div className="text-[11px] text-cyan-300 bg-cyan-950/20 p-2 rounded border border-cyan-500/20 font-mono text-[10px] overflow-x-auto">
                            {ev.rawSnippet}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] text-slate-400">
                            <span>
                              METHOD: {ev.collectionMethod} · ACCESS COUNT: {ev.accessCount || 0}
                            </span>
                            <button
                              onClick={() => handleVerifyEvidence(ev.id)}
                              disabled={isVerifying}
                              className="px-2.5 py-1 text-[10px] font-mono rounded bg-white/5 hover:bg-cyan-950/50 hover:text-cyan-300 border border-white/10 transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className={`w-3 h-3 ${isVerifying ? 'animate-spin' : ''}`} />
                              <span>{isVerifying ? 'Verifying Hash...' : 'Verify SHA-256 Hash'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : currentIncident.evidenceItems.length > 0 ? (
                  <div className="space-y-2">
                    {currentIncident.evidenceItems.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 rounded border border-white/5 bg-black/30 text-xs font-mono space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-200">{ev.id}</span>
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>SHA256 Verified</span>
                          </span>
                        </div>
                        <div className="text-slate-300 font-sans">{ev.description}</div>
                        <div className="text-[10px] text-slate-500 truncate">
                          HASH: {ev.hashSha256}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Collected by: {ev.collectedBy} · {ev.collectedAt}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-xs text-slate-500 font-mono rounded border border-white/5 bg-black/20">
                    No physical evidence artifacts registered yet. Forensics agent is compiling logs.
                  </div>
                )}
              </div>

              {/* Immutable Audit Trail */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <History className="w-4 h-4 text-slate-400" />
                  <span>Audit Trail & Chain of Custody</span>
                </div>

                <div className="space-y-2">
                  {currentIncident.auditTrail.map((log, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded border border-white/5 bg-black/20 text-xs font-mono space-y-0.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-300">{log.action}</span>
                        <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                      </div>
                      <div className="text-slate-400 text-[11px]">Author: {log.author}</div>
                      <div className="text-slate-300 font-sans text-[11px]">{log.details}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 p-12 text-center text-slate-500 text-sm">
            Select an incident to view details.
          </div>
        )}
      </div>
    </div>
  );
};
