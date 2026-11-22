import React, { useState, useEffect } from 'react';
import {
  Plug,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  ShieldCheck,
  Activity,
  Layers,
  Database,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api';
import { sound } from '../../core/sound-fx';

interface EnterpriseConnector {
  id: string;
  name: string;
  category: string;
  vendor: string;
  status: 'connected' | 'syncing' | 'degraded' | 'disconnected';
  lastSync: string;
  latencyMs: number;
  eventsIngestedPerSec: number;
  description: string;
  version: string;
  capabilities: string[];
}

export const IntegrationsModule: React.FC = () => {
  const [connectors, setConnectors] = useState<EnterpriseConnector[]>([]);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);

  const fetchConnectors = async () => {
    try {
      const data = await api.getIntegrationsV1();
      if (data && data.length > 0) {
        setConnectors(data);
      }
    } catch (err) {
      console.error('Failed to load connectors:', err);
    }
  };

  useEffect(() => {
    fetchConnectors();
  }, []);

  const handleSyncConnector = async (id: string) => {
    setSyncingId(id);
    sound.play('radar');
    try {
      const res = await api.syncConnector(id);
      setSyncResult(res);
      sound.play('success');
      await fetchConnectors();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Plug className="w-5 h-5 text-cyan-400" />
            <span>Enterprise Security Connector Mesh & Ingestion Hub</span>
          </h1>
          <p className="text-xs text-slate-400">
            Bidirectional interfaces for SIEMs, host EDRs, network probes, and threat sharing feeds (Section 26.2).
          </p>
        </div>

        <button
          onClick={fetchConnectors}
          className="px-3 py-1.5 text-xs font-mono text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh All Feeds</span>
        </button>
      </div>

      {/* Sync Status Banner */}
      {syncResult && (
        <div className="p-3 rounded-lg border border-cyan-500/40 bg-cyan-950/30 text-xs font-mono text-cyan-300 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>
              SYNCHRONIZED: {syncResult.name} · Latency: {syncResult.latencyMs}ms · Ingested:{' '}
              {syncResult.eventsIngested} telemetry events
            </span>
          </div>
          <button
            onClick={() => setSyncResult(null)}
            className="text-slate-400 hover:text-white text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {connectors.map((connector) => {
          const isSyncing = syncingId === connector.id;

          return (
            <div
              key={connector.id}
              className="p-5 rounded-lg border border-white/10 bg-slate-900/50 space-y-3 flex flex-col justify-between hover:border-white/20 transition-all shadow-md"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                    {connector.category}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                    CONNECTED
                  </span>
                </div>

                <h3 className="font-bold text-sm text-white">{connector.name}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
                  {connector.description}
                </p>

                <div className="flex flex-wrap gap-1 pt-1">
                  {connector.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="px-1.5 py-0.5 rounded bg-black/60 border border-white/5 text-[9px] font-mono text-slate-300"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>LATENCY: {connector.latencyMs}ms</span>
                  <span>{connector.eventsIngestedPerSec} EVT/S</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 truncate">
                  LAST SYNC: {connector.lastSync}
                </div>

                <button
                  onClick={() => handleSyncConnector(connector.id)}
                  disabled={isSyncing}
                  className="w-full py-1.5 px-3 rounded text-xs font-mono font-semibold bg-white/5 hover:bg-cyan-950/50 hover:text-cyan-300 hover:border-cyan-500/40 border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>{isSyncing ? 'Synchronizing...' : 'Test Sync Feed'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
