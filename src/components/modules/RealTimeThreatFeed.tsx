import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Pause,
  Play,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { RealtimeThreatAlert, SeverityLevel } from '../../core/types';

interface RealTimeThreatFeedProps {
  onSelectIncident?: (incidentId: string) => void;
  onSelectModule?: (moduleId: string) => void;
}

function severityDotClass(sev: SeverityLevel): string {
  switch (sev) {
    case 'critical':
      return 'bg-[#ff453a]';
    case 'high':
      return 'bg-[#ff9f0a]';
    case 'medium':
      return 'bg-[#0a84ff]';
    default:
      return 'bg-[#30d158]';
  }
}

function severityBadgeClass(sev: SeverityLevel): string {
  switch (sev) {
    case 'critical':
      return 'bg-[#ff453a]/15 text-[#ff6961] border-[#ff453a]/40';
    case 'high':
      return 'bg-[#ff9f0a]/15 text-[#ffb340] border-[#ff9f0a]/40';
    case 'medium':
      return 'bg-[#0a84ff]/15 text-[#64d2ff] border-[#0a84ff]/40';
    default:
      return 'bg-[#30d158]/15 text-[#30d158] border-[#30d158]/35';
  }
}

export const RealTimeThreatFeed: React.FC<RealTimeThreatFeedProps> = ({
  onSelectIncident,
  onSelectModule,
}) => {
  const [alerts, setAlerts] = useState<RealtimeThreatAlert[]>([]);
  const [wsState, setWsState] = useState<'connecting' | 'connected' | 'reconnecting'>('connecting');
  const [connectedClients, setConnectedClients] = useState<number>(1);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high'>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<RealtimeThreatAlert | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    api
      .getThreatFeedHistory()
      .then((hist) => {
        if (mountedRef.current && Array.isArray(hist) && hist.length > 0) {
          setAlerts((prev) => (prev.length === 0 ? hist : prev));
        }
      })
      .catch(() => {});

    const connectWs = () => {
      if (!mountedRef.current) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws/threat-feed`;
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mountedRef.current) return;
          setWsState('connected');
        };

        ws.onmessage = (event) => {
          if (!mountedRef.current) return;
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'init' && Array.isArray(payload.alerts)) {
              setAlerts(payload.alerts);
              if (typeof payload.connectedClients === 'number') {
                setConnectedClients(payload.connectedClients);
              }
            } else if (payload.type === 'alert' && payload.alert) {
              setAlerts((prev) => {
                const deduped = prev.filter((a) => a.id !== payload.alert.id);
                return [payload.alert, ...deduped].slice(0, 50);
              });
              if (typeof payload.connectedClients === 'number') {
                setConnectedClients(payload.connectedClients);
              }
            } else if (payload.type === 'heartbeat' && typeof payload.connectedClients === 'number') {
              setConnectedClients(payload.connectedClients);
            }
          } catch {
            // Ignore malformed socket frames
          }
        };

        ws.onclose = () => {
          if (!mountedRef.current) return;
          setWsState('reconnecting');
          reconnectTimerRef.current = window.setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        setWsState('reconnecting');
        reconnectTimerRef.current = window.setTimeout(connectWs, 3000);
      }
    };

    connectWs();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  const visibleAlerts = useMemo(() => {
    if (severityFilter === 'critical') return alerts.filter((a) => a.severity === 'critical');
    if (severityFilter === 'high') {
      return alerts.filter((a) => a.severity === 'critical' || a.severity === 'high');
    }
    return alerts;
  }, [alerts, severityFilter]);

  // Duplicate list for seamless continuous horizontal ticker loop
  const marqueeAlerts = useMemo(() => {
    if (visibleAlerts.length === 0) return [];
    return [...visibleAlerts, ...visibleAlerts];
  }, [visibleAlerts]);

  return (
    <section
      data-testid="realtime-threat-feed"
      className="apple-card p-3.5 sm:p-4 space-y-2.5 border border-white/[0.1]"
      aria-label="Real-time Threat Feed"
    >
      {/* Top Control & WebSocket Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            data-testid="ws-connection-status"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border ${
              wsState === 'connected'
                ? 'bg-[#30d158]/15 border-[#30d158]/35 text-[#30d158]'
                : 'bg-[#ff9f0a]/15 border-[#ff9f0a]/35 text-[#ffb340]'
            }`}
          >
            {wsState === 'connected' ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            <span>
              {wsState === 'connected'
                ? `WS LIVE · ${alerts.length} ALERTS (${connectedClients} STREAM)`
                : 'WS RECONNECTING...'}
            </span>
          </span>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f5f5f7]">
            <Radio className="w-3.5 h-3.5 text-[#0a84ff] animate-pulse" />
            <span>REAL-TIME THREAT FEED TICKER</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-0.5 bg-[#0e0e10] p-0.5 rounded-lg border border-white/[0.08]">
            {(['all', 'high', 'critical'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSeverityFilter(lvl)}
                className={`px-2 py-1 rounded-md text-[10px] font-mono uppercase transition-colors ${
                  severityFilter === lvl
                    ? 'bg-white/[0.14] text-[#f5f5f7] font-semibold'
                    : 'text-[#86868b] hover:text-[#f5f5f7]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            aria-label={isPaused ? 'Resume scrolling threat ticker' : 'Pause scrolling threat ticker'}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#161618] hover:bg-[#222226] border border-white/[0.1] text-[10px] font-mono text-[#d1d1d6]"
          >
            {isPaused ? <Play className="w-3 h-3 text-[#30d158]" /> : <Pause className="w-3 h-3 text-[#ff9f0a]" />}
            <span>{isPaused ? 'Resume Ticker' : 'Pause Ticker'}</span>
          </button>

          {onSelectModule && (
            <button
              type="button"
              onClick={() => onSelectModule('agent-trust')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0071e3]/15 hover:bg-[#0071e3]/25 border border-[#0a84ff]/35 text-[10px] font-mono text-[#64d2ff]"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Agent Policy Gateway</span>
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Scrolling WebSocket Alert Ticker */}
      <div className="relative overflow-hidden rounded-xl bg-[#0a0a0c] border border-white/[0.08] py-2">
        {visibleAlerts.length === 0 ? (
          <div className="px-4 py-1 text-xs font-mono text-[#86868b] flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#ffb340]" />
            <span>No alerts match this severity filter on the WebSocket stream.</span>
          </div>
        ) : (
          <div
            data-testid="threat-ticker-track"
            className={`animate-ticker items-center gap-3 px-3 ${isPaused ? 'ticker-paused' : ''}`}
          >
            {marqueeAlerts.map((alert, idx) => (
              <button
                key={`${alert.id}-${idx}`}
                type="button"
                onClick={() => setSelectedAlert(alert)}
                className="shrink-0 inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#141417] hover:bg-[#1e1e23] border border-white/[0.08] hover:border-[#0a84ff]/40 text-left transition-colors"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${severityDotClass(alert.severity)}`} />
                <span
                  className={`px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase font-semibold ${severityBadgeClass(
                    alert.severity
                  )}`}
                >
                  {alert.severity}
                </span>
                <span className="text-[10px] font-mono text-[#86868b]">
                  {new Date(alert.timestamp).toISOString().slice(11, 19)}Z
                </span>
                <span className="text-xs font-medium text-[#f5f5f7] max-w-[320px] truncate">
                  {alert.title}
                </span>
                <span className="text-[10px] font-mono text-[#2997ff]">[{alert.targetAsset}]</span>
                <span className="text-[10px] font-mono text-[#30d158]">{alert.actionTaken}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Click-to-Inspect Alert Telemetry Drawer */}
      {selectedAlert && (
        <div
          data-testid="selected-threat-alert-detail"
          className="rounded-xl bg-[#111113] border border-[#0a84ff]/35 p-3 text-xs space-y-1.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase ${severityBadgeClass(selectedAlert.severity)}`}>
                {selectedAlert.severity}
              </span>
              <span className="text-[10px] font-mono text-[#2997ff]">{selectedAlert.category}</span>
              <span className="font-semibold text-[#f5f5f7]">{selectedAlert.title}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAlert(null)}
              aria-label="Close alert detail"
              className="p-1 rounded-md text-[#86868b] hover:text-[#f5f5f7]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-[#a1a1a6]">{selectedAlert.summary}</p>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] font-mono text-[#86868b]">
            <div className="flex flex-wrap items-center gap-3">
              <span>Source: <strong className="text-[#d1d1d6]">{selectedAlert.source}</strong></span>
              <span>Target: <strong className="text-[#d1d1d6]">{selectedAlert.targetAsset}</strong></span>
              <span className="inline-flex items-center gap-1 text-[#30d158]">
                <ShieldCheck className="w-3 h-3" />
                SHA-256: {selectedAlert.sha256Integrity.slice(0, 16)}...
              </span>
            </div>
            {selectedAlert.incidentId && onSelectIncident && (
              <button
                type="button"
                onClick={() => onSelectIncident(selectedAlert.incidentId!)}
                className="inline-flex items-center gap-1 text-[#0a84ff] hover:text-[#2997ff] font-semibold"
              >
                <span>Open Incident {selectedAlert.incidentId}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
