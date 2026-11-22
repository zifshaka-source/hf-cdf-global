import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendRealtimeAnomalyTick,
  buildSixtyMinuteAnomalySeries,
  detectAnomalySpikes,
} from './anomaly-telemetry';
import { SecurityEvent } from './types';

const SAMPLE_EVENTS: SecurityEvent[] = [
  {
    id: 'EVT-TEST-01',
    timestamp: new Date(Date.UTC(2026, 10, 21, 9, 45, 0)).toISOString(),
    type: 'live',
    severity: 'critical',
    source: '194.26.29.112',
    destination: 'cluster-inference-01',
    category: 'Exfiltration',
    signature: 'SAFETENSORS_EXFIL_BURST',
    actionTaken: 'FLAGGED_AND_THROTTLED',
    verified: true,
  },
  {
    id: 'EVT-TEST-02',
    timestamp: new Date(Date.UTC(2026, 10, 21, 9, 20, 0)).toISOString(),
    type: 'simulated',
    severity: 'medium',
    source: '172.16.99.12',
    destination: '10.0.4.18',
    category: 'Probe',
    signature: 'LOW_BASELINE_RECON',
    actionTaken: 'OBSERVED',
    verified: true,
  },
];

test('buildSixtyMinuteAnomalySeries generates exactly 60 rolling minute points ending at NOW', () => {
  const nowMs = Date.UTC(2026, 10, 21, 10, 0, 0);
  const series = buildSixtyMinuteAnomalySeries({
    currentAnomalyScore: 86,
    events: SAMPLE_EVENTS,
    spikeThreshold: 78,
    nowMs,
  });

  assert.equal(series.length, 60);
  assert.equal(series[0].minutesAgo, 59);
  assert.equal(series[59].minutesAgo, 0);
  assert.equal(series[59].minuteLabel, 'NOW');
  assert.ok(series[59].anomalyScore >= 86);
  assert.equal(series[59].isSpike, true);
});

test('detectAnomalySpikes identifies real critical event bursts and filters non-spike points', () => {
  const nowMs = Date.UTC(2026, 10, 21, 10, 0, 0);
  const series = buildSixtyMinuteAnomalySeries({
    currentAnomalyScore: 52,
    events: SAMPLE_EVENTS,
    spikeThreshold: 78,
    nowMs,
  });

  const spikes = detectAnomalySpikes(series);
  assert.ok(spikes.length >= 1);
  const safetensorsSpike = spikes.find((s) => s.signature === 'SAFETENSORS_EXFIL_BURST');
  assert.ok(safetensorsSpike, 'Expected critical event signature to produce a spike alert');
  assert.equal(safetensorsSpike?.severity, 'critical');
});

test('appendRealtimeAnomalyTick shifts the 60-minute window forward and flags new spikes', () => {
  const nowMs = Date.UTC(2026, 10, 21, 10, 0, 0);
  const initial = buildSixtyMinuteAnomalySeries({
    currentAnomalyScore: 50,
    events: [],
    spikeThreshold: 78,
    nowMs,
  });

  const updated = appendRealtimeAnomalyTick({
    series: initial,
    nextScore: 93,
    spikeThreshold: 78,
    signature: 'LIVE_PROBE_SURGE',
    timestampMs: nowMs + 60_000,
  });

  assert.equal(updated.length, 60);
  assert.equal(updated[59].minuteLabel, 'NOW');
  assert.equal(updated[59].anomalyScore, 93);
  assert.equal(updated[59].isSpike, true);
  assert.equal(updated[59].triggerSignature, 'LIVE_PROBE_SURGE');
  assert.notEqual(updated[58].minuteLabel, 'NOW');
});
