import React, { useState } from 'react';
import {
  Radar,
  Plus,
  Search,
  ExternalLink,
  Shield,
  Layers,
  Share2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { IndicatorOfCompromise } from '../../core/types';

interface ThreatIntelligenceProps {
  iocs: IndicatorOfCompromise[];
  knowledgeGraph: { nodes: any[]; links: any[] };
  onCreateIoc: (data: Partial<IndicatorOfCompromise>) => Promise<any>;
}

export const ThreatIntelligence: React.FC<ThreatIntelligenceProps> = ({
  iocs,
  knowledgeGraph,
  onCreateIoc,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newType, setNewType] = useState<'ipv4' | 'domain' | 'sha256' | 'cve'>('ipv4');
  const [newValue, setNewValue] = useState('');
  const [newActor, setNewActor] = useState('');

  const filteredIocs = iocs.filter((ioc) => {
    const matchesType = filterType === 'all' ? true : ioc.type === filterType;
    const matchesSearch =
      ioc.value.toLowerCase().includes(search.toLowerCase()) ||
      (ioc.threatActor || '').toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue) return;
    await onCreateIoc({
      type: newType,
      value: newValue,
      threatActor: newActor || 'Unknown Adversary',
      confidenceScore: 90,
      source: 'Analyst Threat Ingestion',
    });
    setShowAddModal(false);
    setNewValue('');
    setNewActor('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Radar className="w-5 h-5 text-cyan-400" />
            <span>Cyber Threat Intelligence (CTI) & Knowledge Graph</span>
          </h1>
          <p className="text-xs text-slate-400">
            Indicators of Compromise (IoCs), adversary attribution clusters, and multi-relational intelligence graph.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded border border-cyan-500/40 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Ingest New IoC</span>
        </button>
      </div>

      {/* Main Grid: IoC Table (7 cols) & CTI Knowledge Graph (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: IoC Repository Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">INDICATORS OF COMPROMISE</span>
              <span className="text-xs font-mono text-slate-400">({filteredIocs.length})</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search IoC value or actor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-900 border border-white/10 rounded text-slate-200 placeholder-slate-500 font-mono w-44"
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2 py-1 text-xs bg-slate-900 border border-white/10 rounded text-slate-200 font-mono"
              >
                <option value="all">All Types</option>
                <option value="ipv4">IPv4</option>
                <option value="domain">Domain</option>
                <option value="sha256">SHA256</option>
                <option value="cve">CVE</option>
                <option value="ja3_fingerprint">JA3</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-900/50">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/40 text-[11px] text-slate-400 uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Indicator Value</th>
                  <th className="p-3">Attributed Actor</th>
                  <th className="p-3">Confidence</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredIocs.map((ioc) => (
                  <tr key={ioc.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 uppercase text-cyan-400 font-bold text-[11px]">
                      {ioc.type}
                    </td>
                    <td className="p-3 font-medium text-slate-100 max-w-[220px] truncate">
                      {ioc.value}
                    </td>
                    <td className="p-3 text-slate-300 font-sans">{ioc.threatActor || '—'}</td>
                    <td className="p-3 tabular-nums font-bold text-indigo-300">
                      {ioc.confidenceScore}%
                    </td>
                    <td className="p-3">
                      {ioc.activeBlock ? (
                        <span className="text-[10px] text-red-400 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                          BLOCKED
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-white/5">
                          MONITORED
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Knowledge Graph Relationships (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-lg border border-white/10 bg-slate-900/50 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">CTI Relational Knowledge Graph</h2>
            </div>
            <span className="text-xs font-mono text-slate-500">STIX 2.1 COMPLIANT</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Multi-hop graph mapping active threat clusters, exploited CVEs, targeted inference assets, and defending agents.
          </p>

          <div className="space-y-2.5">
            {knowledgeGraph.links.map((link, idx) => (
              <div
                key={idx}
                className="p-3 rounded border border-white/5 bg-black/30 text-xs font-mono flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <span className="text-red-400 font-bold truncate">{link.source}</span>
                  <span className="text-slate-500">──({link.relationship})──►</span>
                  <span className="text-cyan-400 font-bold truncate">{link.target}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded border border-white/5 bg-black/20 text-xs space-y-1">
            <div className="text-slate-400 font-semibold text-[11px] font-mono">THREAT CLUSTER NOTE:</div>
            <div className="text-slate-300 text-[11px] leading-relaxed">
              APT-41 (ShadowPanda) and Volt Typhoon infrastructure observed using dynamic DNS proxies targeting enterprise model repositories and safetensors endpoints with tensor deserialization and shard exfiltration anomalies.
            </div>
          </div>
        </div>
      </div>

      {/* MITRE ATLAS (Adversarial Threat Landscape for AI Systems) Matrix */}
      <div className="p-5 rounded-lg border border-white/10 bg-slate-900/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div>
            <div className="text-[10px] font-mono text-cyan-400 uppercase">AI-SPECIFIC ADVERSARIAL TAXONOMY</div>
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>MITRE ATLAS™ Matrix for Machine Learning Systems</span>
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-black/40 px-2.5 py-1 rounded border border-white/10">
            5 ACTIVE DETECTIONS · 100% COVERAGE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            {
              id: 'AML.TA0000',
              tactic: 'ML Attack Staging',
              techniques: [
                { code: 'AML.T0000', name: 'Acquire Public Checkpoints', hits: 14, status: 'monitored' },
                { code: 'AML.T0002', name: 'Publish Poisoned Model to Hub', hits: 2, status: 'detected' },
              ],
            },
            {
              id: 'AML.TA0001',
              tactic: 'Initial Access',
              techniques: [
                { code: 'AML.T0010', name: 'ML Supply Chain Poisoning', hits: 3, status: 'contained' },
                { code: 'AML.T0040', name: 'Malicious Safetensors Header', hits: 1, status: 'blocked' },
              ],
            },
            {
              id: 'AML.TA0002',
              tactic: 'Model Evasion',
              techniques: [
                { code: 'AML.T0043', name: 'Adversarial Prompt Injection', hits: 48, status: 'filtered' },
                { code: 'AML.T0015', name: 'Token Smuggling / Jailbreak', hits: 19, status: 'filtered' },
              ],
            },
            {
              id: 'AML.TA0003',
              tactic: 'Model Theft',
              techniques: [
                { code: 'AML.T0024', name: 'Model Inversion via Queries', hits: 6, status: 'clamped' },
                { code: 'AML.T0048', name: 'Exfiltrate Model Weights Shard', hits: 1, status: 'investigating' },
              ],
            },
            {
              id: 'AML.TA0004',
              tactic: 'Inference Impact',
              techniques: [
                { code: 'AML.T0029', name: 'Denial of ML Service (Sponge)', hits: 5, status: 'rate_limited' },
                { code: 'AML.T0031', name: 'Erosion of Model Accuracy', hits: 0, status: 'clear' },
              ],
            },
          ].map((col) => (
            <div key={col.id} className="p-3 bg-black/40 rounded border border-white/5 space-y-2">
              <div className="border-b border-white/5 pb-1.5">
                <div className="text-[10px] font-mono text-cyan-400 font-bold">{col.id}</div>
                <div className="text-xs font-semibold text-slate-200 truncate">{col.tactic}</div>
              </div>
              <div className="space-y-1.5">
                {col.techniques.map((tech) => (
                  <div
                    key={tech.code}
                    className={`p-2 rounded border text-[11px] font-mono space-y-1 ${
                      tech.status === 'investigating'
                        ? 'bg-red-950/40 border-red-500/50 text-red-300'
                        : tech.status === 'detected' || tech.status === 'contained'
                        ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                        : 'bg-white/5 border-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-400">{tech.code}</span>
                      <span className="tabular-nums font-semibold">{tech.hits} hits</span>
                    </div>
                    <div className="font-medium truncate text-slate-100">{tech.name}</div>
                    <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                      STATUS: {tech.status.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal to Ingest IoC */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-lg border border-white/10 bg-slate-900 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Ingest Indicator of Compromise</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ESC
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Indicator Type</label>
                <select
                  value={newType}
                  onChange={(e: any) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded text-slate-100 font-mono"
                >
                  <option value="ipv4">IPv4 Address</option>
                  <option value="domain">Domain Name</option>
                  <option value="sha256">File Hash (SHA256)</option>
                  <option value="cve">Vulnerability (CVE)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Indicator Value</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 194.26.29.11 or bad-domain.xyz"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Attributed Threat Actor (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. APT-41 / ShadowPanda"
                  value={newActor}
                  onChange={(e) => setNewActor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded text-slate-100 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded border border-white/10 text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  Register IoC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
