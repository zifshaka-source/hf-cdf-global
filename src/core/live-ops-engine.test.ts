import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceLiveAttackStep,
  buildChallengeDiagnosisFallback,
  correlateNewsWithPlatform,
  createLiveAttackFromTemplate,
  extractCveIds,
  LIVE_ATTACK_TEMPLATES,
  parseCisaKevToNewsItems,
  parseRssXmlToNewsItems,
} from './live-ops-engine';
import { INITIAL_AGENTS, INITIAL_IOCS, INITIAL_NETWORK_NODES } from './initial-data';
import { OperationalChallenge } from './types';

test('extractCveIds extracts unique uppercase CVE identifiers', () => {
  const found = extractCveIds('Critical exploit cve-2026-21849 chained with CVE-2024-3400 and CVE-2026-21849');
  assert.deepEqual(found, ['CVE-2026-21849', 'CVE-2024-3400']);
});

test('parseRssXmlToNewsItems parses RSS items, strips HTML/CDATA, and correlates assets', () => {
  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0"><channel>
    <item>
      <title><![CDATA[Critical Zero-Day RCE CVE-2026-99102 Exploited in NVIDIA GPU Inference Clusters]]></title>
      <link>https://example.org/advisory-1</link>
      <pubDate>Fri, 21 Nov 2026 08:00:00 GMT</pubDate>
      <description><![CDATA[<p>Active exploitation targeting Kubernetes and Python inference pods via remote code execution.</p>]]></description>
    </item>
  </channel></rss>`;

  const items = parseRssXmlToNewsItems(
    sampleXml,
    'CISA Advisories',
    'Advisories',
    INITIAL_NETWORK_NODES,
    INITIAL_IOCS,
    5
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].source, 'CISA Advisories');
  assert.equal(items[0].category, 'Zero-Day & KEV');
  assert.equal(items[0].severity, 'critical');
  assert.deepEqual(items[0].cveIds, ['CVE-2026-99102']);
  assert.equal(items[0].summary.includes('<p>'), false);
  assert.ok(items[0].impactedAssetIds.length > 0);
});

test('parseCisaKevToNewsItems normalizes CISA KEV JSON array into newest-first news items', () => {
  const items = parseCisaKevToNewsItems(
    [
      {
        cveID: 'CVE-2025-11111',
        vendorProject: 'Palo Alto',
        product: 'PAN-OS',
        vulnerabilityName: 'Gateway Auth Bypass',
        dateAdded: '2026-11-18',
        shortDescription: 'Authentication bypass in ingress gateway.',
        requiredAction: 'Apply hotfix.',
        knownRansomwareCampaignUse: 'Known',
      },
    ],
    INITIAL_NETWORK_NODES,
    INITIAL_IOCS,
    5
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].severity, 'critical');
  assert.equal(items[0].category, 'Zero-Day & KEV');
  assert.ok(items[0].title.includes('CVE-2025-11111'));
});

test('createLiveAttackFromTemplate & advanceLiveAttackStep transition attack through full AI defense lifecycle', () => {
  const attack = createLiveAttackFromTemplate(LIVE_ATTACK_TEMPLATES[0], INITIAL_AGENTS, '2026-11-21T09:00:00Z');
  assert.equal(attack.phase, 'probing');

  const step1 = advanceLiveAttackStep(attack, false, '2026-11-21T09:00:05Z');
  assert.equal(step1.updated.phase, 'active_exploitation');
  assert.ok(step1.activity !== null);

  const step2 = advanceLiveAttackStep(step1.updated, false, '2026-11-21T09:00:10Z');
  assert.equal(step2.updated.phase, 'ai_intercepted');

  const step3 = advanceLiveAttackStep(step2.updated, false, '2026-11-21T09:00:15Z');
  assert.equal(step3.updated.phase, 'contained');
  assert.equal(step3.updated.aiShieldPct, 100);
  assert.equal(step3.updated.penetrationPct, 0);
});

test('correlateNewsWithPlatform scores gateway and AI cluster exposure accurately', () => {
  const res = correlateNewsWithPlatform(
    {
      title: 'Critical Kubernetes and NVIDIA GPU inference cluster breach',
      summary: 'Attackers target gateway TLS ingress and GPU inference nodes',
      cveIds: ['CVE-2026-21849'],
      severity: 'critical',
    },
    INITIAL_NETWORK_NODES,
    INITIAL_IOCS
  );
  assert.ok(res.impactScore >= 80);
  assert.ok(res.impactedAssetIds.length >= 1);
});

test('buildChallengeDiagnosisFallback generates actionable steps and learned rule metadata', () => {
  const ch: OperationalChallenge = {
    id: 'chl-1',
    title: 'Zero-Trust Policy Drift on Inference Node',
    domain: 'AI Infrastructure',
    severity: 'critical',
    status: 'open',
    problemStatement: 'Permissive egress port opened on inference node.',
    affectedSystems: ['cluster-inference-01'],
    createdAt: '2026-11-21T09:00:00Z',
    assignedAgent: 'Sentinel-Zero',
  };

  const out = buildChallengeDiagnosisFallback(ch, INITIAL_NETWORK_NODES);
  assert.ok(out.diagnosis.includes('cluster-inference-01') || out.diagnosis.includes('Inference'));
  assert.equal(out.remediationSteps.length, 3);
  assert.ok(out.learnedTopic.includes('Resolved Challenge'));
});

test('batch same-millisecond attack steps always generate strictly unique activity, attack, and log IDs', () => {
  const fixedIso = '2026-11-21T09:00:00.000Z';
  const attackIds = new Set<string>();
  const activityIds = new Set<string>();
  const logIds = new Set<string>();

  for (let i = 0; i < 40; i++) {
    const atk = createLiveAttackFromTemplate(LIVE_ATTACK_TEMPLATES[i % LIVE_ATTACK_TEMPLATES.length], INITIAL_AGENTS, fixedIso);
    attackIds.add(atk.id);
    atk.logs.forEach((l) => logIds.add(l.id));

    const s1 = advanceLiveAttackStep(atk, false, fixedIso);
    if (s1.activity) activityIds.add(s1.activity.id);
    s1.updated.logs.forEach((l) => logIds.add(l.id));

    const s2 = advanceLiveAttackStep(s1.updated, true, fixedIso);
    if (s2.activity) activityIds.add(s2.activity.id);
    s2.updated.logs.forEach((l) => logIds.add(l.id));
  }

  assert.equal(attackIds.size, 40);
  assert.equal(activityIds.size, 80);
  assert.ok(logIds.size >= 160);
});

