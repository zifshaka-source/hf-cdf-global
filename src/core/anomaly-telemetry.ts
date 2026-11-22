import { SecurityEvent } from './types';

export interface AnomalyPoint {
  timestampIso: string;
  minuteLabel: string;
  minutesAgo: number;
  anomalyScore: number;
  baselineScore: number;
  upperThreshold: number;
  isSpike: boolean;
  spikeDelta: number;
  triggerSignature?: string;
}

export interface SpikeAlert {
  id: string;
  minuteLabel: string;
  timestampIso: string;
  anomalyScore: number;
  baselineScore: number;
  delta: number;
  severity: 'elevated' | 'critical';
  signature: string;
}

function clampScore(value: number): number {
  return Math.max(5, Math.min(100, Math.round(value)));
}

function formatUtcHhMm(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Deterministically maps SecurityEvents and live anomaly posture onto a 60-minute
 * rolling telemetry timeline (`-59m` to `NOW`) with statistical baseline + spike detection.
 */
export function buildSixtyMinuteAnomalySeries(params: {
  currentAnomalyScore: number;
  events: SecurityEvent[];
  spikeThreshold?: number;
  nowMs?: number;
}): AnomalyPoint[] {
  const {
    currentAnomalyScore,
    events,
    spikeThreshold = 78,
    nowMs = Date.now(),
  } = params;

  const anchorMinuteMs = Math.floor(nowMs / 60_000) * 60_000;
  const clampedNow = clampScore(currentAnomalyScore);

  // Distribute recent high/critical events into distinct minute offsets inside the 60m window
  // so real telemetry (and newly injected probes) show concrete historical & live peaks.
  const eventBoostByMinute = new Map<number, { boost: number; signature: string }>();

  events.forEach((evt, idx) => {
    const parsedMs = Date.parse(evt.timestamp);
    let minutesAgo: number;
    if (!Number.isNaN(parsedMs) && anchorMinuteMs - parsedMs >= 0 && anchorMinuteMs - parsedMs < 60 * 60_000) {
      minutesAgo = Math.floor((anchorMinuteMs - parsedMs) / 60_000);
    } else {
      // Anchor older curated baseline telemetry events evenly inside the 60m telemetry horizon
      const slotOffsets = [4, 13, 24, 37, 48, 55];
      minutesAgo = slotOffsets[idx % slotOffsets.length];
    }

    const severityBoost =
      evt.severity === 'critical' ? 36 : evt.severity === 'high' ? 28 : evt.severity === 'medium' ? 16 : 8;

    const existing = eventBoostByMinute.get(minutesAgo);
    if (!existing || severityBoost > existing.boost) {
      eventBoostByMinute.set(minutesAgo, {
        boost: severityBoost,
        signature: evt.signature,
      });
    }
  });

  const points: AnomalyPoint[] = [];

  for (let i = 59; i >= 0; i--) {
    const pointMs = anchorMinuteMs - i * 60_000;
    const harmonic =
      Math.sin((59 - i) * 0.24) * 7 +
      Math.cos((59 - i) * 0.53) * 4;
    const baseline = clampScore(44 + Math.sin((59 - i) * 0.14) * 5);

    const mappedEvent = eventBoostByMinute.get(i);
    let score = baseline + harmonic + (mappedEvent ? mappedEvent.boost : 0);

    // Anchor current minute (`i === 0`) to live system anomaly score (or recent probe boost)
    if (i === 0) {
      score = Math.max(clampedNow, mappedEvent ? baseline + mappedEvent.boost + 6 : clampedNow);
    }

    const finalScore = clampScore(score);
    const delta = finalScore - baseline;
    const effectiveThreshold = Math.min(spikeThreshold, baseline + 24);
    const isSpike = finalScore >= effectiveThreshold || delta >= 22;

    points.push({
      timestampIso: new Date(pointMs).toISOString(),
      minuteLabel: i === 0 ? 'NOW' : formatUtcHhMm(pointMs),
      minutesAgo: i,
      anomalyScore: finalScore,
      baselineScore: baseline,
      upperThreshold: spikeThreshold,
      isSpike,
      spikeDelta: delta,
      triggerSignature: mappedEvent?.signature,
    });
  }

  return points;
}

/**
 * Advances a 60-minute rolling series by 1 minute for live streaming visualization.
 */
export function appendRealtimeAnomalyTick(params: {
  series: AnomalyPoint[];
  nextScore: number;
  spikeThreshold?: number;
  signature?: string;
  timestampMs?: number;
}): AnomalyPoint[] {
  const {
    series,
    nextScore,
    spikeThreshold = 78,
    signature,
    timestampMs = Date.now(),
  } = params;

  const baseSlice = series.slice(-59).map((pt, idx) => ({
    ...pt,
    minutesAgo: 59 - idx,
    minuteLabel: pt.minuteLabel === 'NOW' ? formatUtcHhMm(Date.parse(pt.timestampIso) || timestampMs - 60_000) : pt.minuteLabel,
  }));

  const prevBaseline = baseSlice[baseSlice.length - 1]?.baselineScore ?? 45;
  const nextBaseline = clampScore(prevBaseline + Math.sin(baseSlice.length * 0.3) * 2);
  const clampedNext = clampScore(nextScore);
  const delta = clampedNext - nextBaseline;
  const effectiveThreshold = Math.min(spikeThreshold, nextBaseline + 24);
  const isSpike = clampedNext >= effectiveThreshold || delta >= 22;

  const nextPoint: AnomalyPoint = {
    timestampIso: new Date(timestampMs).toISOString(),
    minuteLabel: 'NOW',
    minutesAgo: 0,
    anomalyScore: clampedNext,
    baselineScore: nextBaseline,
    upperThreshold: spikeThreshold,
    isSpike,
    spikeDelta: delta,
    triggerSignature: signature,
  };

  return [...baseSlice, nextPoint];
}

/**
 * Extracts spike detection alerts ordered newest-first.
 */
export function detectAnomalySpikes(points: AnomalyPoint[]): SpikeAlert[] {
  return points
    .filter((pt) => pt.isSpike)
    .map((pt, idx) => ({
      id: `SPK-${pt.minutesAgo}-${idx}`,
      minuteLabel: pt.minuteLabel,
      timestampIso: pt.timestampIso,
      anomalyScore: pt.anomalyScore,
      baselineScore: pt.baselineScore,
      delta: pt.spikeDelta,
      severity: (pt.anomalyScore >= 85 || pt.spikeDelta >= 28 ? 'critical' : 'elevated') as
        | 'critical'
        | 'elevated',
      signature:
        pt.triggerSignature ||
        (pt.anomalyScore >= 85
          ? 'SYNCHRONIZED_EGRESS_ENTROPY_BURST'
          : 'HEURISTIC_BEHAVIORAL_DRIFT_SPIKE'),
    }))
    .reverse();
}
