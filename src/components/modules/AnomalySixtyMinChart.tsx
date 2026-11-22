import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BellRing,
  Pause,
  Play,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AnomalyPoint,
  appendRealtimeAnomalyTick,
  buildSixtyMinuteAnomalySeries,
  detectAnomalySpikes,
} from '../../core/anomaly-telemetry';
import { SecurityEvent } from '../../core/types';
import { sound } from '../../core/sound-fx';

interface AnomalySixtyMinChartProps {
  currentAnomalyScore: number;
  events: SecurityEvent[];
}

export const AnomalySixtyMinChart: React.FC<AnomalySixtyMinChartProps> = ({
  currentAnomalyScore,
  events,
}) => {
  const [spikeThreshold, setSpikeThreshold] = useState<number>(78);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [selectedSpikeId, setSelectedSpikeId] = useState<string | null>(null);
  const [series, setSeries] = useState<AnomalyPoint[]>(() =>
    buildSixtyMinuteAnomalySeries({
      currentAnomalyScore,
      events,
      spikeThreshold: 78,
    })
  );

  const prevEventCountRef = useRef<number>(events.length);

  // Recompute / react immediately when real events or threshold change
  useEffect(() => {
    const latestEvt = events[0];
    if (events.length > prevEventCountRef.current && latestEvt) {
      // Live probe or new event arrived: push an immediate spike tick to NOW
      const boosted =
        latestEvt.severity === 'critical'
          ? Math.max(currentAnomalyScore, 92)
          : latestEvt.severity === 'high'
          ? Math.max(currentAnomalyScore, 86)
          : currentAnomalyScore;
      setSeries((prev) =>
        appendRealtimeAnomalyTick({
          series: prev,
          nextScore: boosted,
          spikeThreshold,
          signature: latestEvt.signature,
        })
      );
    } else {
      setSeries(
        buildSixtyMinuteAnomalySeries({
          currentAnomalyScore,
          events,
          spikeThreshold,
        })
      );
    }
    prevEventCountRef.current = events.length;
  }, [events, currentAnomalyScore, spikeThreshold]);

  // Real-time 5-second rolling telemetry heartbeat
  useEffect(() => {
    if (!isStreaming) return;
    const timer = setInterval(() => {
      setSeries((prev) => {
        const last = prev[prev.length - 1];
        const baseline = last?.baselineScore ?? 45;
        const drift = Math.round((Math.random() - 0.44) * 14);
        const candidate = Math.max(24, Math.min(98, (last?.anomalyScore ?? currentAnomalyScore) + drift));
        // Blend gently toward current operational posture unless a natural burst hits
        const nextScore = Math.random() > 0.84 ? Math.min(96, baseline + 34) : Math.round(candidate * 0.65 + currentAnomalyScore * 0.35);
        return appendRealtimeAnomalyTick({
          series: prev,
          nextScore,
          spikeThreshold,
        });
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [isStreaming, currentAnomalyScore, spikeThreshold]);

  const spikes = useMemo(() => detectAnomalySpikes(series), [series]);
  const spikePoints = useMemo(() => series.filter((p) => p.isSpike), [series]);
  const peakScore = useMemo(
    () => series.reduce((max, pt) => Math.max(max, pt.anomalyScore), 0),
    [series]
  );
  const currentPoint = series[series.length - 1];
  const activeAlert = spikes.find((s) => s.id === selectedSpikeId) || spikes[0] || null;

  return (
    <div
      data-testid="anomaly-60m-chart"
      className="apple-card p-6 rounded-2xl space-y-5 shadow-xl"
    >
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
            <span className="text-[#ff453a] font-semibold uppercase tracking-[0.18em] flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-[#ff453a] animate-ping' : 'bg-[#86868b]'}`} />
              60-MINUTE ANOMALY TELEMETRY &amp; SPIKE DETECTOR
            </span>
            <span className="text-white/20">·</span>
            <span className="text-[#86868b]">ROLLING 60-MIN HORIZON</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#f5f5f7] tracking-tight">
            Real-Time 60-Minute Anomaly Score Curve &amp; Spike Detection Alerts
          </h2>
        </div>

        {/* Controls: Threshold + Stream Toggle */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1 bg-[#111113] p-1 rounded-xl border border-white/[0.08]">
            <span className="px-2 text-[10px] text-[#86868b]">SPIKE THRESHOLD:</span>
            {[
              { label: 'Strict 70', val: 70 },
              { label: 'Standard 78', val: 78 },
              { label: 'High 85', val: 85 },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => {
                  sound.play('click');
                  setSpikeThreshold(opt.val);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                  spikeThreshold === opt.val
                    ? 'bg-[#0071e3] text-white'
                    : 'text-[#86868b] hover:text-[#f5f5f7]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              sound.play('click');
              setIsStreaming((prev) => !prev);
            }}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
              isStreaming
                ? 'bg-[#30d158]/15 border-[#30d158]/35 text-[#30d158]'
                : 'bg-[#161618] border-white/[0.12] text-[#a1a1a6] hover:text-white'
            }`}
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isStreaming ? 'LIVE STREAMING' : 'STREAM PAUSED'}</span>
          </button>
        </div>
      </div>

      {/* Main Split: 60-Minute Recharts Plot (8 cols) + Spike Detection Alerts (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Recharts 60-Min Curve */}
        <div className="lg:col-span-8 p-4 rounded-xl bg-[#111113] border border-white/[0.08] flex flex-col space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-[#f5f5f7]">
                <span className="w-2.5 h-0.5 bg-[#ff453a] inline-block" />
                Anomaly Score
              </span>
              <span className="flex items-center gap-1.5 text-[#a1a1a6]">
                <span className="w-2.5 h-0.5 bg-[#0a84ff] inline-block" />
                Rolling Baseline
              </span>
              <span className="flex items-center gap-1.5 text-[#ff9f0a]">
                <span className="w-2 h-2 rounded-full bg-[#ff453a] border border-[#ff9f0a] inline-block" />
                Spike Detected ({spikes.length})
              </span>
            </div>
            <div className="flex items-center gap-3 tabular-nums text-[#a1a1a6]">
              <span>
                NOW: <strong className="text-[#f5f5f7]">{currentPoint?.anomalyScore ?? currentAnomalyScore}/100</strong>
              </span>
              <span>
                60M PEAK: <strong className="text-[#ff6961]">{peakScore}/100</strong>
              </span>
            </div>
          </div>

          <div className="min-h-[280px] flex-1 w-full">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={series} margin={{ top: 14, right: 14, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="anomaly60mFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff453a" stopOpacity={0.55} />
                    <stop offset="60%" stopColor="#ff9f0a" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#ff453a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="minuteLabel"
                  stroke="#86868b"
                  fontSize={10}
                  tickLine={false}
                  interval={9}
                />
                <YAxis domain={[0, 100]} stroke="#86868b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161618',
                    borderColor: 'rgba(255,255,255,0.16)',
                    borderRadius: '10px',
                    fontSize: '11px',
                    color: '#f5f5f7',
                  }}
                  formatter={(value: any, name: any) => [`${value ?? ''} / 100`, String(name ?? '')]}
                />
                <ReferenceLine
                  y={spikeThreshold}
                  stroke="#ff9f0a"
                  strokeDasharray="5 4"
                  label={{
                    value: `SPIKE ALERT >= ${spikeThreshold}`,
                    position: 'insideTopRight',
                    fill: '#ff9f0a',
                    fontSize: 10,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="anomalyScore"
                  stroke="#ff453a"
                  strokeWidth={2.2}
                  fill="url(#anomaly60mFill)"
                  fillOpacity={1}
                  name="Anomaly Score"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="baselineScore"
                  stroke="#0a84ff"
                  strokeWidth={1.6}
                  strokeDasharray="4 3"
                  dot={false}
                  name="Rolling Baseline"
                  isAnimationActive={false}
                />
                {spikePoints.map((pt) => (
                  <ReferenceDot
                    key={pt.timestampIso}
                    x={pt.minuteLabel}
                    y={pt.anomalyScore}
                    r={5}
                    fill="#ff453a"
                    stroke="#ffd60a"
                    strokeWidth={1.8}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Spike Detection Alerts Panel */}
        <div
          data-testid="spike-detection-alerts"
          className="lg:col-span-4 p-4 rounded-xl bg-[#111113] border border-white/[0.08] flex flex-col justify-between space-y-3"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#f5f5f7]">
                <BellRing className="w-4 h-4 text-[#ff453a]" />
                <span>Spike Detection Alerts</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold ${
                  spikes.length > 0
                    ? 'bg-[#ff453a]/15 text-[#ff6961] border-[#ff453a]/35'
                    : 'bg-[#30d158]/15 text-[#30d158] border-[#30d158]/35'
                }`}
              >
                {spikes.length} {spikes.length === 1 ? 'SPIKE' : 'SPIKES'}
              </span>
            </div>

            {spikes.length === 0 ? (
              <div className="p-4 rounded-xl border border-white/[0.06] bg-[#161618] text-xs text-[#86868b] space-y-1">
                <div className="text-[#30d158] font-mono font-semibold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>NO ANOMALY SPIKES ABOVE THRESHOLD</span>
                </div>
                <p>All telemetry scores over the last 60 minutes remain within baseline tolerance.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {spikes.slice(0, 6).map((spike) => {
                  const isActive = activeAlert?.id === spike.id;
                  return (
                    <button
                      key={spike.id}
                      type="button"
                      onClick={() => {
                        sound.play('click');
                        setSelectedSpikeId(spike.id);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all space-y-1 ${
                        isActive
                          ? 'border-[#ff453a]/55 bg-[#ff453a]/10'
                          : 'border-white/[0.07] bg-[#161618] hover:border-white/[0.16]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                            spike.severity === 'critical'
                              ? 'bg-[#ff453a]/20 text-[#ff6961]'
                              : 'bg-[#ff9f0a]/20 text-[#ffb340]'
                          }`}
                        >
                          {spike.severity} spike
                        </span>
                        <span className="text-[#a1a1a6] tabular-nums">{spike.minuteLabel} UTC</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold text-[#f5f5f7] tabular-nums">
                        <span>Score {spike.anomalyScore}/100</span>
                        <span className="text-[#ff6961] font-mono text-[11px]">
                          +{spike.delta} vs baseline
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[#86868b] truncate">
                        {spike.signature}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {activeAlert && (
            <div className="p-3 rounded-xl bg-[#0a0a0c] border border-white/[0.08] text-[11px] font-mono space-y-1">
              <div className="flex items-center justify-between text-[#ff9f0a]">
                <span className="flex items-center gap-1 font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  INSPECTED SPIKE TELEMETRY
                </span>
                <span>{activeAlert.minuteLabel}</span>
              </div>
              <div className="text-[#f5f5f7] truncate">{activeAlert.signature}</div>
              <div className="text-[#86868b] flex items-center justify-between">
                <span>Baseline: {activeAlert.baselineScore}</span>
                <span className="text-[#ff6961]">Delta: +{activeAlert.delta} pts</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
