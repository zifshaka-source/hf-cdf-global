import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  ExternalLink,
  Flame,
  Globe,
  Newspaper,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  LiveAttackPhase,
  LiveNewsItem,
  LiveOngoingAttack,
  LiveOpsStateSnapshot,
  NewsCategory,
  OperationalChallenge,
  SeverityLevel,
} from '../../core/types';

interface LiveOpsNewsCenterProps {
  liveOps: LiveOpsStateSnapshot | null;
  onLiveOpsChange: (next: LiveOpsStateSnapshot) => void;
  onSelectModule: (moduleId: string) => void;
  onNotify: (message: string, type?: 'info' | 'success' | 'alert') => void;
}

const NEWS_CATEGORIES: Array<'All' | NewsCategory> = [
  'All',
  'Zero-Day & KEV',
  'Cyber Attacks',
  'AI Security',
  'Critical Infra',
  'Advisories',
];

function severityBadgeClass(sev: SeverityLevel): string {
  switch (sev) {
    case 'critical':
      return 'bg-[#ff453a]/15 text-[#ff6961] border-[#ff453a]/35';
    case 'high':
      return 'bg-[#ff9f0a]/15 text-[#ffb340] border-[#ff9f0a]/35';
    case 'medium':
      return 'bg-[#0a84ff]/15 text-[#64d2ff] border-[#0a84ff]/35';
    case 'low':
      return 'bg-[#30d158]/15 text-[#30d158] border-[#30d158]/35';
    default:
      return 'bg-white/[0.06] text-[#a1a1a6] border-white/[0.12]';
  }
}

function phaseBadge(phase: LiveAttackPhase): { label: string; cls: string } {
  switch (phase) {
    case 'probing':
      return {
        label: 'PROBING',
        cls: 'bg-[#ff9f0a]/15 text-[#ffb340] border-[#ff9f0a]/35',
      };
    case 'active_exploitation':
      return {
        label: 'ACTIVE EXPLOIT',
        cls: 'bg-[#ff453a]/20 text-[#ff6961] border-[#ff453a]/45',
      };
    case 'ai_intercepted':
      return {
        label: 'AI INTERCEPTED',
        cls: 'bg-[#0a84ff]/20 text-[#2997ff] border-[#0a84ff]/45',
      };
    case 'contained':
      return {
        label: 'CONTAINED',
        cls: 'bg-[#30d158]/15 text-[#30d158] border-[#30d158]/35',
      };
  }
}

function formatUtcShort(iso?: string): string {
  if (!iso) return '--:--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(11, 19) + ' UTC';
}

export const LiveOpsNewsCenter: React.FC<LiveOpsNewsCenterProps> = ({
  liveOps,
  onLiveOpsChange,
  onSelectModule,
  onNotify,
}) => {
  const [attackFilter, setAttackFilter] = useState<'all' | 'active' | 'contained'>('all');
  const [expandedAttackLogs, setExpandedAttackLogs] = useState<Record<string, boolean>>({});
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [challengeFilter, setChallengeFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [showNewChallengeForm, setShowNewChallengeForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDomain, setNewDomain] = useState<OperationalChallenge['domain']>('Cyber');
  const [newSeverity, setNewSeverity] = useState<SeverityLevel>('high');
  const [newAffectedSystems, setNewAffectedSystems] = useState('cluster-inference-01, ingress-waf-01');
  const [newProblemStatement, setNewProblemStatement] = useState('');

  const [newsCategory, setNewsCategory] = useState<'All' | NewsCategory>('All');
  const [newsQuery, setNewsQuery] = useState('');
  const [mlBulletinPred, setMlBulletinPred] = useState<{
    newsId: string;
    title: string;
    predictedClass: string;
    riskScore: number;
    confidencePct: number;
  } | null>(null);

  const attacks = liveOps?.attacks || [];
  const challenges = liveOps?.challenges || [];
  const news = liveOps?.news || [];
  const aiFeed = liveOps?.aiFeed || [];

  const filteredAttacks = useMemo(() => {
    if (attackFilter === 'active') return attacks.filter((a) => a.phase !== 'contained');
    if (attackFilter === 'contained') return attacks.filter((a) => a.phase === 'contained');
    return attacks;
  }, [attacks, attackFilter]);

  const filteredChallenges = useMemo(() => {
    if (challengeFilter === 'open') return challenges.filter((c) => c.status !== 'resolved');
    if (challengeFilter === 'resolved') return challenges.filter((c) => c.status === 'resolved');
    return challenges;
  }, [challenges, challengeFilter]);

  const filteredNews = useMemo(() => {
    const q = newsQuery.trim().toLowerCase();
    return news.filter((item) => {
      if (newsCategory !== 'All' && item.category !== newsCategory) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        item.cveIds.some((c) => c.toLowerCase().includes(q)) ||
        item.impactedAssetIds.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [news, newsCategory, newsQuery]);

  const handleToggleAutoPilot = async () => {
    if (!liveOps) return;
    setBusyAction('autopilot');
    try {
      const next = await api.setLiveAutoPilot(!liveOps.autoPilotEnabled);
      onLiveOpsChange(next);
      onNotify(
        next.autoPilotEnabled
          ? 'Autonomous AI Auto-Pilot engaged: live interception active'
          : 'Autonomous AI Auto-Pilot paused',
        next.autoPilotEnabled ? 'success' : 'info'
      );
    } catch {
      onNotify('Failed to update AI Auto-Pilot mode', 'alert');
    } finally {
      setBusyAction(null);
    }
  };

  const handleRunAiCycle = async () => {
    setBusyAction('cycle');
    try {
      const next = await api.runLiveAiCycle();
      onLiveOpsChange(next);
      onNotify('AI Defense Swarm executed live interception & learning cycle', 'success');
    } catch {
      onNotify('Failed to run AI defense cycle', 'alert');
    } finally {
      setBusyAction(null);
    }
  };

  const handleTriggerAttack = async () => {
    setBusyAction('trigger');
    try {
      const res = await api.triggerLiveAttack();
      onLiveOpsChange(res.state);
      onNotify(`Live multi-vector attack detected: ${res.attack.title}`, 'alert');
    } catch {
      onNotify('Failed to trigger live attack simulation', 'alert');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCounterAttack = async (attack: LiveOngoingAttack, mode: 'counter' | 'contain') => {
    setBusyAction(`atk-${attack.id}-${mode}`);
    try {
      const res = await api.counterLiveAttack(attack.id, mode);
      onLiveOpsChange(res.state);
      onNotify(
        res.attack.phase === 'contained'
          ? `Contained ${res.attack.adversaryGroup} targeting ${res.attack.targetName}`
          : `${res.attack.assignedAgentName} deployed AI countermeasure (${res.attack.aiShieldPct}% shield)`,
        res.attack.phase === 'contained' ? 'success' : 'info'
      );
    } catch {
      onNotify('Countermeasure dispatch failed', 'alert');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newProblemStatement.trim()) return;
    setBusyAction('create-challenge');
    try {
      const systems = newAffectedSystems
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await api.createChallenge({
        title: newTitle.trim(),
        domain: newDomain,
        severity: newSeverity,
        affectedSystems: systems.length > 0 ? systems : ['cluster-inference-01'],
        problemStatement: newProblemStatement.trim(),
      });
      onLiveOpsChange(res.state);
      setNewTitle('');
      setNewProblemStatement('');
      setShowNewChallengeForm(false);
      onNotify(`Operational challenge logged: ${res.challenge.title}`, 'info');
    } catch {
      onNotify('Failed to create operational challenge', 'alert');
    } finally {
      setBusyAction(null);
    }
  };

  const handleResolveChallenge = async (ch: OperationalChallenge) => {
    setBusyAction(`resolve-${ch.id}`);
    try {
      const res = await api.resolveChallenge(ch.id);
      onLiveOpsChange(res.state);
      onNotify(`AI resolved "${res.challenge.title}" and committed learned rule`, 'success');
    } catch {
      onNotify('Failed to run AI challenge resolution', 'alert');
    } finally {
      setBusyAction(null);
    }
  };

  const handleRefreshNews = async () => {
    setBusyAction('refresh-news');
    try {
      const res = await api.refreshLiveNews();
      onLiveOpsChange(res.state);
      onNotify(
        `Synced ${res.totalItems} live bulletins from ${res.fetchedSources.length} global feeds`,
        'success'
      );
    } catch {
      onNotify('Failed to refresh live threat feeds', 'alert');
    } finally {
      setBusyAction(null);
    }
  };

  const handleAnalyzeNews = async (item: LiveNewsItem) => {
    setBusyAction(`news-${item.id}`);
    try {
      const [res, mlPred] = await Promise.all([
        api.analyzeNewsWithAi(item.id),
        api.predictThreatWithMl({
          title: item.title,
          description: item.summary,
          cvssScore: item.severity === 'critical' ? 9.4 : item.severity === 'high' ? 7.8 : 4.2,
          kevFlag: item.category === 'Zero-Day & KEV',
          ransomwareFlag: /ransomware|lockbit|extortion/i.test(`${item.title} ${item.summary}`),
          iocCount: item.cveIds.length + 1,
        }),
      ]);
      onLiveOpsChange(res.state);
      setMlBulletinPred({
        newsId: item.id,
        title: item.title,
        predictedClass: mlPred.predictedClass,
        riskScore: mlPred.riskScore,
        confidencePct: mlPred.confidencePct,
      });
      onNotify(
        `AI + ML correlated "${item.title.slice(0, 42)}..." -> ${mlPred.predictedClass} (${mlPred.riskScore}/100)`,
        'info'
      );
    } catch {
      onNotify('Failed to correlate bulletin with AI', 'alert');
    } finally {
      setBusyAction(null);
    }
  };

  const stats = liveOps?.stats || {
    activeAttacksCount: 0,
    containedAttacksTotal: 0,
    openChallengesCount: 0,
    resolvedChallengesTotal: 0,
    liveNewsCount: 0,
    aiActionsExecutedTotal: 0,
    rulesLearnedTotal: 0,
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Top Autonomous AI Command Header */}
      <section className="apple-card p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#30d158]/15 border border-[#30d158]/30 text-[#30d158] text-[10px] font-mono font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
                LIVE SSE STREAM
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0a84ff]/15 border border-[#0a84ff]/30 text-[#2997ff] text-[10px] font-mono font-semibold">
                <Bot className="w-3 h-3" />
                {liveOps?.geminiConfigured ? 'GEMINI 4 HYDROGEN + SWARM' : 'AUTONOMOUS AI SWARM'}
              </span>
              <span className="text-[11px] font-mono text-[#86868b]">
                Last AI Cycle: {formatUtcShort(liveOps?.lastCycleAt)} · News Sync: {formatUtcShort(liveOps?.lastNewsSyncAt)}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f5f5f7]">
              Live Operations, Active Attacks &amp; Threat Newsroom
            </h1>
            <p className="text-xs sm:text-sm text-[#a1a1a6] max-w-3xl">
              Autonomous AI swarm actively intercepts multi-vector attacks, ingests live CISA KEV &amp; global cyber bulletins, and diagnoses operational challenges in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleAutoPilot}
              disabled={busyAction === 'autopilot' || !liveOps}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                liveOps?.autoPilotEnabled
                  ? 'bg-[#30d158]/15 border-[#30d158]/40 text-[#30d158] hover:bg-[#30d158]/25'
                  : 'bg-[#1c1c1e] border-white/[0.12] text-[#a1a1a6] hover:text-[#f5f5f7]'
              }`}
            >
              {liveOps?.autoPilotEnabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{liveOps?.autoPilotEnabled ? 'Auto-Pilot: ON' : 'Auto-Pilot: PAUSED'}</span>
            </button>

            <button
              type="button"
              onClick={handleRunAiCycle}
              disabled={busyAction === 'cycle'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white transition-all shadow-sm disabled:opacity-60"
            >
              <Zap className={`w-3.5 h-3.5 ${busyAction === 'cycle' ? 'animate-spin' : ''}`} />
              <span>Run AI Cycle Now</span>
            </button>

            <button
              type="button"
              onClick={handleTriggerAttack}
              disabled={busyAction === 'trigger'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#ff453a]/15 hover:bg-[#ff453a]/25 text-[#ff6961] border border-[#ff453a]/35 transition-all disabled:opacity-60"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Trigger Live Attack</span>
            </button>

            <button
              type="button"
              onClick={handleRefreshNews}
              disabled={busyAction === 'refresh-news'}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#1c1c1e] hover:bg-[#2c2c2e] text-[#f5f5f7] border border-white/[0.12] transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busyAction === 'refresh-news' ? 'animate-spin' : ''}`} />
              <span>Refresh Live Feeds</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectModule('civic-governance')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#0a84ff]/15 hover:bg-[#0a84ff]/25 text-[#64d2ff] border border-[#0a84ff]/35 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Governance &amp; ML Studio</span>
            </button>
          </div>
        </div>

        {mlBulletinPred && (
          <div className="p-3 rounded-xl bg-[#0a84ff]/10 border border-[#0a84ff]/35 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="text-[#64d2ff]">
              ML Bulletin Classification ({mlBulletinPred.newsId}):{' '}
              <strong>{mlBulletinPred.predictedClass}</strong> · Risk {mlBulletinPred.riskScore}/100 ({mlBulletinPred.confidencePct}%)
            </span>
            <button
              type="button"
              onClick={() => onSelectModule('civic-governance')}
              className="text-[#f5f5f7] underline"
            >
              Inspect Model Studio
            </button>
          </div>
        )}

        {/* KPI Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-1">
          <div className="rounded-xl bg-[#0e0e10] border border-white/[0.08] px-3.5 py-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#86868b]">Active Attacks</div>
            <div className="text-xl font-bold text-[#ff6961] tabular-nums mt-0.5">{stats.activeAttacksCount}</div>
          </div>
          <div className="rounded-xl bg-[#0e0e10] border border-white/[0.08] px-3.5 py-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#86868b]">Contained</div>
            <div className="text-xl font-bold text-[#30d158] tabular-nums mt-0.5">{stats.containedAttacksTotal}</div>
          </div>
          <div className="rounded-xl bg-[#0e0e10] border border-white/[0.08] px-3.5 py-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#86868b]">Open Challenges</div>
            <div className="text-xl font-bold text-[#ffb340] tabular-nums mt-0.5">{stats.openChallengesCount}</div>
          </div>
          <div className="rounded-xl bg-[#0e0e10] border border-white/[0.08] px-3.5 py-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#86868b]">Solved Challenges</div>
            <div className="text-xl font-bold text-[#30d158] tabular-nums mt-0.5">{stats.resolvedChallengesTotal}</div>
          </div>
          <div className="rounded-xl bg-[#0e0e10] border border-white/[0.08] px-3.5 py-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#86868b]">Live Bulletins</div>
            <div className="text-xl font-bold text-[#f5f5f7] tabular-nums mt-0.5">{stats.liveNewsCount}</div>
          </div>
          <div className="rounded-xl bg-[#0e0e10] border border-white/[0.08] px-3.5 py-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#86868b]">AI Actions Run</div>
            <div data-testid="ai-actions-count" className="text-xl font-bold text-[#0a84ff] tabular-nums mt-0.5">
              {stats.aiActionsExecutedTotal}
            </div>
          </div>
          <div className="rounded-xl bg-[#0e0e10] border border-white/[0.08] px-3.5 py-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#86868b]">Rules Learned</div>
            <div className="text-xl font-bold text-[#64d2ff] tabular-nums mt-0.5">{stats.rulesLearnedTotal}</div>
          </div>
        </div>
      </section>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Live Happening Attacks + Emerging Challenges */}
        <div className="xl:col-span-7 space-y-5">
          {/* Panel 1: Live Happening Attacks */}
          <section className="apple-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#ff453a]/15 border border-[#ff453a]/30 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-[#ff6961]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#f5f5f7]">Live Happening Attacks &amp; AI Counter-Ops</h2>
                  <p className="text-[11px] text-[#86868b]">
                    Real-time multi-vector intrusions countered autonomously by assigned swarm defenders
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-[#101012] p-1 rounded-xl border border-white/[0.08]">
                {(['all', 'active', 'contained'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setAttackFilter(tab)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-colors ${
                      attackFilter === tab
                        ? 'bg-white/[0.12] text-[#f5f5f7]'
                        : 'text-[#86868b] hover:text-[#f5f5f7]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div data-testid="live-attacks-list" className="space-y-3.5 max-h-[620px] overflow-y-auto pr-1">
              {filteredAttacks.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#0e0e10] border border-white/[0.06] text-center text-xs text-[#86868b]">
                  No attacks match this filter. Click &ldquo;Trigger Live Attack&rdquo; to simulate or wait for the next autonomous cycle.
                </div>
              ) : (
                filteredAttacks.map((atk) => {
                  const phase = phaseBadge(atk.phase);
                  const isExpanded = Boolean(expandedAttackLogs[atk.id]);
                  const visibleLogs = isExpanded ? atk.logs : atk.logs.slice(0, 3);
                  return (
                    <article
                      key={atk.id}
                      className="rounded-xl bg-[#0e0e10] border border-white/[0.08] p-4 space-y-3 hover:border-white/[0.16] transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-semibold ${phase.cls}`}>
                              {phase.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono uppercase ${severityBadgeClass(atk.severity)}`}>
                              {atk.severity}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[10px] font-mono text-[#d1d1d6]">
                              {atk.mitreTechnique}
                            </span>
                            {atk.cveRef && (
                              <span className="px-2 py-0.5 rounded-md bg-[#0a84ff]/15 border border-[#0a84ff]/30 text-[10px] font-mono text-[#64d2ff]">
                                {atk.cveRef}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-[#f5f5f7]">{atk.title}</h3>
                          <div className="text-[11px] font-mono text-[#a1a1a6] flex flex-wrap gap-x-3 gap-y-1">
                            <span>Adversary: {atk.adversaryGroup} ({atk.sourceIp})</span>
                            <span>Target: {atk.targetName} [{atk.targetRegion}]</span>
                            <span className="text-[#2997ff]">Defender: {atk.assignedAgentName}</span>
                          </div>
                        </div>

                        {atk.phase !== 'contained' && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCounterAttack(atk, 'counter')}
                              disabled={busyAction === `atk-${atk.id}-counter`}
                              className="px-2.5 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white text-[11px] font-semibold transition-colors disabled:opacity-60"
                            >
                              Deploy AI Countermeasure
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCounterAttack(atk, 'contain')}
                              disabled={busyAction === `atk-${atk.id}-contain`}
                              className="px-2.5 py-1.5 rounded-lg bg-[#30d158]/15 hover:bg-[#30d158]/25 text-[#30d158] border border-[#30d158]/35 text-[11px] font-semibold transition-colors disabled:opacity-60"
                            >
                              Contain Attack
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Dual Penetration vs AI Shield Telemetry Bars */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-[#a1a1a6]">Adversary Penetration</span>
                            <span className="text-[#ff6961] font-semibold tabular-nums">{atk.penetrationPct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#ff9f0a] to-[#ff453a] transition-all duration-500"
                              style={{ width: `${atk.penetrationPct}%` }}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-[#a1a1a6]">AI Defense Shield</span>
                            <span className="text-[#30d158] font-semibold tabular-nums">{atk.aiShieldPct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#0a84ff] to-[#30d158] transition-all duration-500"
                              style={{ width: `${atk.aiShieldPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Honest AI Assessment */}
                      {atk.aiAssessment && (
                        <div className="rounded-lg bg-[#141417] border border-white/[0.08] p-2.5 text-xs text-[#d1d1d6] space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-[#86868b]">
                            <span className="text-[#2997ff] font-semibold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              AI TACTICAL ASSESSMENT
                            </span>
                            <span>
                              Engine: {atk.aiAssessmentSource === 'gemini-4-hydrogen' ? 'Gemini 4 Hydrogen' : 'Autonomous Swarm'}
                            </span>
                          </div>
                          <p className="leading-relaxed">{atk.aiAssessment}</p>
                        </div>
                      )}

                      {/* Live Combat & AI Interception Logs */}
                      <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#86868b]">
                            Live Combat &amp; AI Log ({atk.logs.length})
                          </span>
                          {atk.logs.length > 3 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedAttackLogs((prev) => ({ ...prev, [atk.id]: !prev[atk.id] }))
                              }
                              className="inline-flex items-center gap-1 text-[10px] font-mono text-[#0a84ff] hover:text-[#2997ff]"
                            >
                              {isExpanded ? (
                                <>
                                  <span>Show less</span>
                                  <ChevronUp className="w-3 h-3" />
                                </>
                              ) : (
                                <>
                                  <span>View all {atk.logs.length}</span>
                                  <ChevronDown className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <div className="space-y-1">
                          {visibleLogs.map((log) => (
                            <div key={log.id} className="text-[11px] font-mono flex items-start gap-2 text-[#d1d1d6]">
                              <span className="text-[#86868b] shrink-0">{formatUtcShort(log.timestamp).slice(0, 8)}</span>
                              <span
                                className={`shrink-0 font-semibold ${
                                  log.kind === 'adversary'
                                    ? 'text-[#ff6961]'
                                    : log.kind === 'containment'
                                    ? 'text-[#30d158]'
                                    : 'text-[#2997ff]'
                                }`}
                              >
                                [{log.actor}]
                              </span>
                              <span className="leading-snug">{log.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          {/* Panel 2: Emerging Challenges & Operational Problems */}
          <section className="apple-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#ff9f0a]/15 border border-[#ff9f0a]/30 flex items-center justify-center">
                  <Wrench className="w-4 h-4 text-[#ffb340]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#f5f5f7]">Emerging Challenges &amp; Problem Solving</h2>
                  <p className="text-[11px] text-[#86868b]">
                    Submit live operational problems or let the AI diagnose, remediate, and synthesize self-learning rules
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-[#101012] p-1 rounded-xl border border-white/[0.08]">
                  {(['all', 'open', 'resolved'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setChallengeFilter(tab)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-colors ${
                        challengeFilter === tab
                          ? 'bg-white/[0.12] text-[#f5f5f7]'
                          : 'text-[#86868b] hover:text-[#f5f5f7]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewChallengeForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post New Challenge</span>
                </button>
              </div>
            </div>

            {showNewChallengeForm && (
              <form
                onSubmit={handleCreateChallenge}
                className="rounded-xl bg-[#141417] border border-[#0a84ff]/35 p-4 space-y-3"
              >
                <div className="text-xs font-semibold text-[#f5f5f7]">Post New Operational Challenge for AI Swarm</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1 space-y-1">
                    <label htmlFor="chl-title" className="text-[11px] font-mono text-[#a1a1a6] block">
                      Challenge Title
                    </label>
                    <input
                      id="chl-title"
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Zero-day TLS side-channel on ingress"
                      className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7] placeholder-[#6e6e73] focus:outline-none focus:border-[#0a84ff]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="chl-domain" className="text-[11px] font-mono text-[#a1a1a6] block">
                      Domain
                    </label>
                    <select
                      id="chl-domain"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value as OperationalChallenge['domain'])}
                      className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7] focus:outline-none focus:border-[#0a84ff]"
                    >
                      <option value="Cyber">Cyber</option>
                      <option value="AI Infrastructure">AI Infrastructure</option>
                      <option value="Financial">Financial</option>
                      <option value="Orbital & Subsea">Orbital &amp; Subsea</option>
                      <option value="Supply Chain">Supply Chain</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="chl-severity" className="text-[11px] font-mono text-[#a1a1a6] block">
                      Severity
                    </label>
                    <select
                      id="chl-severity"
                      value={newSeverity}
                      onChange={(e) => setNewSeverity(e.target.value as SeverityLevel)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7] focus:outline-none focus:border-[#0a84ff]"
                    >
                      <option value="critical">critical</option>
                      <option value="high">high</option>
                      <option value="medium">medium</option>
                      <option value="low">low</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="chl-systems" className="text-[11px] font-mono text-[#a1a1a6] block">
                    Affected Systems (comma-separated)
                  </label>
                  <input
                    id="chl-systems"
                    type="text"
                    value={newAffectedSystems}
                    onChange={(e) => setNewAffectedSystems(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs font-mono text-[#f5f5f7] focus:outline-none focus:border-[#0a84ff]"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="chl-problem" className="text-[11px] font-mono text-[#a1a1a6] block">
                    Problem Statement &amp; Observed Symptoms
                  </label>
                  <textarea
                    id="chl-problem"
                    required
                    rows={3}
                    value={newProblemStatement}
                    onChange={(e) => setNewProblemStatement(e.target.value)}
                    placeholder="Describe the anomalous behavior, exposure, or operational bottleneck..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0a0c] border border-white/[0.12] text-xs text-[#f5f5f7] placeholder-[#6e6e73] focus:outline-none focus:border-[#0a84ff]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewChallengeForm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-[#a1a1a6] hover:text-[#f5f5f7]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busyAction === 'create-challenge'}
                    className="px-3.5 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold transition-colors disabled:opacity-60"
                  >
                    Submit Challenge
                  </button>
                </div>
              </form>
            )}

            <div data-testid="live-challenges-list" className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
              {filteredChallenges.map((ch) => (
                <article
                  key={ch.id}
                  className="rounded-xl bg-[#0e0e10] border border-white/[0.08] p-4 space-y-2.5 hover:border-white/[0.16] transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-mono uppercase font-semibold ${
                            ch.status === 'resolved'
                              ? 'bg-[#30d158]/15 text-[#30d158] border-[#30d158]/35'
                              : ch.status === 'analyzing'
                              ? 'bg-[#0a84ff]/15 text-[#2997ff] border-[#0a84ff]/35'
                              : 'bg-[#ff9f0a]/15 text-[#ffb340] border-[#ff9f0a]/35'
                          }`}
                        >
                          {ch.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono uppercase ${severityBadgeClass(ch.severity)}`}>
                          {ch.severity}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[10px] font-mono text-[#d1d1d6]">
                          {ch.domain}
                        </span>
                        <span className="text-[10px] font-mono text-[#86868b]">Agent: {ch.assignedAgent}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-[#f5f5f7]">{ch.title}</h3>
                    </div>

                    {ch.status !== 'resolved' && (
                      <button
                        type="button"
                        onClick={() => handleResolveChallenge(ch)}
                        disabled={busyAction === `resolve-${ch.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white text-[11px] font-semibold shrink-0 transition-colors disabled:opacity-60"
                      >
                        <Cpu className={`w-3.5 h-3.5 ${busyAction === `resolve-${ch.id}` ? 'animate-spin' : ''}`} />
                        <span>Let AI Diagnose &amp; Resolve</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-[#a1a1a6] leading-relaxed">{ch.problemStatement}</p>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {ch.affectedSystems.map((sys) => (
                      <span
                        key={sys}
                        className="px-2 py-0.5 rounded-md bg-[#161618] border border-white/[0.08] text-[10px] font-mono text-[#d1d1d6]"
                      >
                        {sys}
                      </span>
                    ))}
                  </div>

                  {ch.status === 'resolved' && ch.aiDiagnosis && (
                    <div className="rounded-xl bg-[#121614] border border-[#30d158]/30 p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                        <span className="inline-flex items-center gap-1 text-[#30d158] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          AI DIAGNOSIS &amp; REMEDIATION COMPLETE
                        </span>
                        <span className="text-[#86868b]">
                          Engine: {ch.aiSource === 'gemini-4-hydrogen' ? 'Gemini 4 Hydrogen' : 'Autonomous Swarm'}
                        </span>
                      </div>
                      <p className="text-xs text-[#e5e5ea] leading-relaxed">{ch.aiDiagnosis}</p>
                      {ch.remediationSteps && ch.remediationSteps.length > 0 && (
                        <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#d1d1d6] font-mono">
                          {ch.remediationSteps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      )}
                      {ch.learnedRuleId && (
                        <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-[#64d2ff]">
                          <span>Self-Learned Rule Committed ({ch.learnedRuleId})</span>
                          <button
                            type="button"
                            onClick={() => onSelectModule('shared-intel')}
                            className="underline hover:text-white"
                          >
                            View in Shared Intel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Live AI Decision Stream + Global Threat & Tech Newsroom */}
        <div className="xl:col-span-5 space-y-5 xl:sticky xl:top-2">
          {/* Panel 3: Autonomous AI Activity Stream */}
          <section className="apple-card p-5 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#0a84ff] animate-pulse" />
                <h2 className="text-sm font-bold text-[#f5f5f7]">Autonomous AI Decision Stream</h2>
              </div>
              <span className="text-[10px] font-mono text-[#30d158]">LIVE ACTIONS</span>
            </div>

            <div data-testid="live-ai-feed" className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {aiFeed.length === 0 ? (
                <div className="text-xs text-[#86868b] py-4 text-center">Waiting for autonomous telemetry...</div>
              ) : (
                aiFeed.slice(0, 18).map((act) => (
                  <div
                    key={act.id}
                    className="rounded-lg bg-[#0e0e10] border border-white/[0.07] p-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[#2997ff] font-semibold truncate">{act.agentName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[#a1a1a6]">
                          {act.actionType}
                        </span>
                      </div>
                      <span className="text-[#86868b] shrink-0">
                        {act.engine === 'gemini-4-hydrogen' ? 'Gemini 4H' : 'Swarm'} · {formatUtcShort(act.timestamp).slice(0, 8)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#d1d1d6] leading-snug">{act.summary}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Panel 4: Live Global Threat & Tech Newsroom */}
          <section className="apple-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-[#0a84ff]" />
                <div>
                  <h2 className="text-sm font-bold text-[#f5f5f7]">Live Global Threat &amp; Tech Newsroom</h2>
                  <p className="text-[11px] text-[#86868b]">
                    Real-time advisories from CISA KEV, BleepingComputer, The Hacker News &amp; SANS ISC
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#a1a1a6] flex items-center gap-1">
                <Globe className="w-3 h-3 text-[#30d158]" />
                {filteredNews.length} items
              </span>
            </div>

            {/* Search & Category Filter */}
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#86868b] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={newsQuery}
                  onChange={(e) => setNewsQuery(e.target.value)}
                  placeholder="Filter live news by CVE, vendor, asset, or threat..."
                  aria-label="Filter live threat news"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#0a0a0c] border border-white/[0.1] text-xs text-[#f5f5f7] placeholder-[#6e6e73] focus:outline-none focus:border-[#0a84ff]"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {NEWS_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewsCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
                      newsCategory === cat
                        ? 'bg-[#0a84ff]/20 border-[#0a84ff]/45 text-[#64d2ff]'
                        : 'bg-[#101012] border-white/[0.08] text-[#86868b] hover:text-[#f5f5f7]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* News List */}
            <div data-testid="live-news-list" className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
              {filteredNews.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#0e0e10] border border-white/[0.06] text-center space-y-2">
                  <AlertTriangle className="w-5 h-5 text-[#ffb340] mx-auto" />
                  <div className="text-xs text-[#a1a1a6]">No live news items matched or feed sync pending.</div>
                  <button
                    type="button"
                    onClick={handleRefreshNews}
                    className="px-3 py-1.5 rounded-lg bg-[#0071e3] text-white text-xs font-semibold"
                  >
                    Sync Live Feeds Now
                  </button>
                </div>
              ) : (
                filteredNews.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl bg-[#0e0e10] border border-white/[0.08] p-3.5 space-y-2 hover:border-white/[0.16] transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-[#2997ff]">{item.source}</span>
                        <span className={`px-1.5 py-0.5 rounded border uppercase ${severityBadgeClass(item.severity)}`}>
                          {item.severity}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[#a1a1a6]">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-[#86868b] tabular-nums">Impact {item.impactScore}/100</span>
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs sm:text-[13px] font-semibold text-[#f5f5f7] hover:text-[#2997ff] transition-colors leading-snug"
                    >
                      {item.title}
                    </a>

                    <p className="text-[11px] text-[#a1a1a6] leading-relaxed line-clamp-3">{item.summary}</p>

                    {(item.cveIds.length > 0 || item.impactedAssetIds.length > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.cveIds.map((cve) => (
                          <span
                            key={cve}
                            className="px-1.5 py-0.5 rounded bg-[#ff453a]/15 border border-[#ff453a]/30 text-[10px] font-mono text-[#ff6961]"
                          >
                            {cve}
                          </span>
                        ))}
                        {item.impactedAssetIds.map((assetId) => (
                          <span
                            key={assetId}
                            className="px-1.5 py-0.5 rounded bg-[#0a84ff]/15 border border-[#0a84ff]/30 text-[10px] font-mono text-[#64d2ff]"
                          >
                            Exposed: {assetId}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.aiCorrelationNote && (
                      <div className="rounded-lg bg-[#141417] border border-white/[0.08] p-2.5 text-[11px] text-[#d1d1d6] space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#86868b]">
                          <span className="text-[#30d158] font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            AI EXPOSURE CORRELATION
                          </span>
                          <span>
                            {item.aiCorrelationSource === 'gemini-4-hydrogen' ? 'Gemini 4 Hydrogen' : 'Autonomous Swarm'}
                          </span>
                        </div>
                        <p className="leading-snug">{item.aiCorrelationNote}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
                      <span className="text-[10px] font-mono text-[#86868b]">
                        {new Date(item.publishedAt).toLocaleString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAnalyzeNews(item)}
                          disabled={busyAction === `news-${item.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-white/[0.12] text-[11px] font-semibold text-[#f5f5f7] transition-colors disabled:opacity-60"
                        >
                          <Activity className={`w-3 h-3 text-[#0a84ff] ${busyAction === `news-${item.id}` ? 'animate-spin' : ''}`} />
                          <span>Correlate Impact with AI</span>
                        </button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-[#2997ff] hover:text-white"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
