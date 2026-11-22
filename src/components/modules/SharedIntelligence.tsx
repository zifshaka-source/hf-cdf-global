import React, { useState } from 'react';
import {
  Share2,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Tag,
  Cpu,
  Filter,
} from 'lucide-react';
import { SharedIntelMemory } from '../../core/types';

interface SharedIntelligenceProps {
  memories: SharedIntelMemory[];
  onPublishMemory: (data: Partial<SharedIntelMemory>) => Promise<any>;
}

export const SharedIntelligence: React.FC<SharedIntelligenceProps> = ({
  memories,
  onPublishMemory,
}) => {
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newObs, setNewObs] = useState('');
  const [newTags, setNewTags] = useState('ebpf, telemetry');
  const [newConfidence, setNewConfidence] = useState(90);

  const allTags = Array.from(new Set(memories.flatMap((m) => m.tags)));

  const filteredMemories = memories.filter((m) => {
    const matchesTag = tagFilter === 'all' ? true : m.tags.includes(tagFilter);
    const matchesSearch =
      m.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.observation.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTag && matchesSearch;
  });

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic || !newObs) return;

    await onPublishMemory({
      topic: newTopic,
      observation: newObs,
      confidence: newConfidence,
      tags: newTags.split(',').map((t) => t.trim()),
    });

    setShowAddModal(false);
    setNewTopic('');
    setNewObs('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <span>Shared Intelligence & Swarm Hive Memory</span>
          </h1>
          <p className="text-xs text-slate-400">
            Ephemeral inter-agent knowledge layer with confidence weights, provenance, and TTL expiration policies.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded border border-indigo-500/40 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Publish Swarm Observation</span>
        </button>
      </div>

      {/* Filter and Tag Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-white/10 bg-slate-900/40 text-xs">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search memory entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-white/10 rounded text-slate-200 placeholder-slate-500 font-mono w-60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setTagFilter('all')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
              tagFilter === 'all'
                ? 'bg-indigo-500 text-white font-bold'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            All Tags
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                tagFilter === tag
                  ? 'bg-indigo-500 text-white font-bold'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMemories.map((mem) => (
          <div
            key={mem.id}
            className="p-5 rounded-lg border border-white/10 bg-slate-900/50 space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-indigo-400 font-bold flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{mem.originAgentId}</span>
                </span>
                <span className="text-emerald-400 font-semibold">{mem.confidence}% CONF</span>
              </div>

              <h3 className="text-sm font-semibold text-white">{mem.topic}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{mem.observation}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5 text-[11px] font-mono">
              <div className="flex flex-wrap gap-1">
                {mem.tags.map((t) => (
                  <span key={t} className="px-1.5 py-0.5 rounded bg-black/40 text-slate-400">
                    #{t}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-slate-500 text-[10px]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Expires: {mem.expiresAt.slice(0, 10)}</span>
                </span>
                <span>{mem.verifiedByHuman ? 'VERIFIED' : 'AUTONOMOUS'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal to Publish Memory */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-lg border border-white/10 bg-slate-900 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Publish Swarm Observation</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ESC
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Topic / Anomaly Header</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Memory Injection Pattern in Worker 4"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Observation Notes</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detailed telemetry observation..."
                  value={newObs}
                  onChange={(e) => setNewObs(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="k8s, memory, ebpf"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
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
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Publish to Swarm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
