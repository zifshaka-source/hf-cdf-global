import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exportConsolidatedReportBundle,
  exportEventsToCsv,
  exportIncidentsToCsv,
  exportIncidentsToJson,
} from './report-export-utils';
import { computeThirtyDayIncidentTrends } from './incident-trend-utils';
import {
  createEnterpriseThreatDispatch,
  deployVirtualSoldiers,
  PRESET_ATTACK_SCENARIOS,
  TOP_TECH_COMPANIES,
  transmitThreatWarning,
  VIRTUAL_SOLDIER_ROSTER,
} from './enterprise-defense-utils';
import { INITIAL_EVENTS, INITIAL_INCIDENTS } from './initial-data';

test('Report Export Utilities (JSON & CSV)', async (t) => {
  await t.test('formats incidents and events into audit-grade JSON report', () => {
    const jsonStr = exportIncidentsToJson(INITIAL_INCIDENTS, INITIAL_EVENTS, {
      classification: 'SOVEREIGN TOP SECRET',
      generatedBy: 'Commander Test',
    });

    const parsed = JSON.parse(jsonStr);
    assert.equal(typeof parsed, 'object');
    assert.equal(parsed.reportHeader.classification, 'SOVEREIGN TOP SECRET');
    assert.equal(parsed.reportHeader.generatedBy, 'Commander Test');
    assert.equal(parsed.executiveSummary.totalIncidents, INITIAL_INCIDENTS.length);
    assert.equal(parsed.incidentRegistry.length, INITIAL_INCIDENTS.length);
    assert.equal(parsed.securityEventsSummary.length, INITIAL_EVENTS.length);
    assert.ok(parsed.incidentRegistry[0].id);
    assert.ok(parsed.reportHeader.cryptographicSeal.startsWith('sha256:'));
  });

  await t.test('generates valid RFC-4180 CSV for incidents and security events', () => {
    const incCsv = exportIncidentsToCsv(INITIAL_INCIDENTS);
    assert.ok(incCsv.includes('Incident ID,Title,Severity,State'));
    const incLines = incCsv.split('\r\n');
    assert.equal(incLines.length, INITIAL_INCIDENTS.length + 1);

    const evtCsv = exportEventsToCsv(INITIAL_EVENTS);
    assert.ok(evtCsv.includes('Event ID,Timestamp,Severity,Category'));
    const evtLines = evtCsv.split('\r\n');
    assert.equal(evtLines.length, INITIAL_EVENTS.length + 1);
  });

  await t.test('creates ready-to-download consolidated JSON and CSV report bundles', () => {
    const jsonBundle = exportConsolidatedReportBundle(INITIAL_INCIDENTS, INITIAL_EVENTS, 'json');
    assert.ok(jsonBundle.filename.endsWith('.json'));
    assert.equal(jsonBundle.mimeType, 'application/json');
    assert.ok(jsonBundle.content.length > 100);

    const csvBundle = exportConsolidatedReportBundle(INITIAL_INCIDENTS, INITIAL_EVENTS, 'csv');
    assert.ok(csvBundle.filename.endsWith('.csv'));
    assert.ok(csvBundle.mimeType.includes('text/csv'));
    assert.ok(csvBundle.content.includes('### SECTION 1: INCIDENT REGISTRY'));
    assert.ok(csvBundle.content.includes('### SECTION 2: SECURITY EVENTS STREAM'));
  });
});

test('30-Day Incident Frequency & Severity Calculation', async (t) => {
  await t.test('computes exactly 30 rolling daily points with strict severity totals', () => {
    const analytics = computeThirtyDayIncidentTrends(INITIAL_INCIDENTS);
    assert.equal(analytics.series.length, 30);

    for (const point of analytics.series) {
      assert.equal(point.total, point.critical + point.high + point.medium);
      assert.ok(point.total >= 0);
      assert.ok(point.dayIndex >= 1 && point.dayIndex <= 30);
      assert.ok(point.date && typeof point.date === 'string');
      assert.ok(point.fullDate.match(/^\d{4}-\d{2}-\d{2}$/));
    }

    assert.ok(analytics.totalPeriodIncidents > 0);
    assert.ok(analytics.peakDay.count > 0);
    assert.ok(analytics.criticalRatioPct >= 0 && analytics.criticalRatioPct <= 100);
    assert.ok(analytics.overallContainmentRatePct >= 0 && analytics.overallContainmentRatePct <= 100);
  });
});

test('Inter-Enterprise Threat Warning & Virtual Soldier Defense Swarm', async (t) => {
  await t.test('contains rich directory of top tech enterprises and virtual soldier roster', () => {
    assert.ok(TOP_TECH_COMPANIES.length >= 8);
    const huggingFace = TOP_TECH_COMPANIES.find((c) => c.slug === 'huggingface');
    assert.ok(huggingFace, 'Hugging Face must be in enterprise roster');
    assert.equal(huggingFace?.domain, 'huggingface.co');

    const openAi = TOP_TECH_COMPANIES.find((c) => c.slug === 'openai');
    assert.ok(openAi, 'OpenAI must be in enterprise roster');

    assert.ok(VIRTUAL_SOLDIER_ROSTER.length >= 5);
    const sentinel = VIRTUAL_SOLDIER_ROSTER.find((s) => s.codeName === 'Sentinel-Zero');
    assert.ok(sentinel, 'Sentinel-Zero must be in soldier roster');
    assert.equal(sentinel?.status, 'ready');
  });

  await t.test('executes full attack warning transmission and virtual soldiers deployment lifecycle', () => {
    // 1. Create dispatch: OpenAI attacking Hugging Face scenario
    const preset = PRESET_ATTACK_SCENARIOS[0];
    const dispatch = createEnterpriseThreatDispatch({
      targetCompanyId: preset.targetCompanyId,
      attackingEntity: preset.sourceAttackingEntity,
      attackVector: preset.attackVector,
      targetAsset: preset.targetAsset,
      technicalDetails: preset.technicalDetails,
      actionablePreventionSteps: preset.actionablePreventionSteps,
    });

    assert.equal(dispatch.targetCompanyName, 'Hugging Face');
    assert.equal(dispatch.status, 'draft');
    assert.ok(dispatch.penetrationPct > 50);

    // 2. Transmit Prevention Alert
    const transmitted = transmitThreatWarning(dispatch);
    assert.equal(transmitted.status, 'transmitted');
    assert.ok(transmitted.cryptographicSignature?.startsWith('DILITHIUM-3:'));
    assert.ok(transmitted.combatLogs.length > 0);
    assert.ok(transmitted.penetrationPct < dispatch.penetrationPct);

    // 3. Deploy Virtual Soldiers
    const soldierIds = ['soldier-sentinel-zero', 'soldier-valkyrie-enforcer', 'soldier-cipher-weightguard'];
    const defended = deployVirtualSoldiers(transmitted, soldierIds);

    assert.equal(defended.status, 'neutralized');
    assert.equal(defended.penetrationPct, 0);
    assert.equal(defended.virtualSoldiersDeployed.length, 3);
    assert.ok(defended.virtualSoldiersDeployed.includes('Sentinel-Zero'));
    assert.ok(defended.virtualSoldiersDeployed.includes('Valkyrie-Enforcer'));
    assert.ok(defended.acknowledgmentReceipt?.responseMessage.includes('Thank you HF-CDF Alliance!'));
  });
});
