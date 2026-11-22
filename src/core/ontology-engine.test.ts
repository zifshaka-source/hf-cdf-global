import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_AGENTS,
  INITIAL_EVENTS,
  INITIAL_INCIDENTS,
  INITIAL_IOCS,
  INITIAL_NETWORK_NODES,
  INITIAL_SHARED_MEMORIES,
} from './initial-data';
import {
  CURATED_KEV_BASELINE,
  buildUnifiedOntology,
  correlateKevWithAssets,
  deterministicAipReasoner,
  queryOntology,
  synthesizeSelfLearningMemory,
} from './ontology-engine';

describe('HF-CDF Unified Ontology & Intelligence Fusion Engine', () => {
  it('correlates CISA KEV advisories against monitored enterprise & cluster assets', () => {
    const correlated = correlateKevWithAssets(CURATED_KEV_BASELINE, INITIAL_NETWORK_NODES);
    assert.ok(correlated.length >= 5, 'Should correlate baseline KEV entries');

    const pytorchKev = correlated.find((k) => k.cveID === 'CVE-2026-21849');
    assert.ok(pytorchKev, 'CVE-2026-21849 should be present');
    assert.ok(
      pytorchKev.correlatedAssets.includes('cluster-inference-01'),
      'PyTorch/Safetensors KEV should correlate with cluster-inference-01'
    );
    assert.ok(
      pytorchKev.correlatedAssets.includes('org-nvidia'),
      'PyTorch/Safetensors KEV should correlate with NVIDIA org profile'
    );
    assert.ok(pytorchKev.riskScore >= 80, 'Known ransomware KEV with matches must score >= 80');
  });

  it('builds a deduplicated cross-domain ontology connecting orgs, assets, incidents, KEVs, and agents', () => {
    const kevEntries = correlateKevWithAssets(CURATED_KEV_BASELINE, INITIAL_NETWORK_NODES);
    const graph = buildUnifiedOntology({
      agents: INITIAL_AGENTS,
      incidents: INITIAL_INCIDENTS,
      events: INITIAL_EVENTS,
      iocs: INITIAL_IOCS,
      networkNodes: INITIAL_NETWORK_NODES,
      sharedMemories: INITIAL_SHARED_MEMORIES,
      kevEntries,
    });

    assert.ok(graph.nodes.length >= 25, 'Graph should merge all domains into unified objects');
    assert.ok(graph.edges.length >= 20, 'Graph should wire cross-domain relationships');
    assert.equal(graph.stats.totalObjects, graph.nodes.length);
    assert.equal(graph.stats.totalRelationships, graph.edges.length);

    // Check cross-domain types are all represented
    const types = new Set(graph.nodes.map((n) => n.objectType));
    assert.ok(types.has('organization'));
    assert.ok(types.has('asset'));
    assert.ok(types.has('incident'));
    assert.ok(types.has('vulnerability'));
    assert.ok(types.has('agent'));
    assert.ok(types.has('domain_feed'));
    assert.ok(types.has('learning_rule'));
  });

  it('supports semantic keyword search and 1-hop neighborhood traversal', () => {
    const kevEntries = correlateKevWithAssets(CURATED_KEV_BASELINE, INITIAL_NETWORK_NODES);
    const graph = buildUnifiedOntology({
      agents: INITIAL_AGENTS,
      incidents: INITIAL_INCIDENTS,
      events: INITIAL_EVENTS,
      iocs: INITIAL_IOCS,
      networkNodes: INITIAL_NETWORK_NODES,
      sharedMemories: INITIAL_SHARED_MEMORIES,
      kevEntries,
    });

    const keywordRes = queryOntology(graph, { query: 'safetensors' });
    assert.ok(keywordRes.nodes.length >= 2, 'Keyword search should match incident, vault, and KEV');

    const hopRes = queryOntology(graph, { maxHopFromId: 'cluster-inference-01' });
    const hopIds = new Set(hopRes.nodes.map((n) => n.id));
    assert.ok(hopIds.has('cluster-inference-01'));
    assert.ok(hopIds.has('INC-2026-084'), '1-hop neighborhood should include impacting incident');
    assert.ok(hopIds.has('agent-aegis'), '1-hop neighborhood should include defending agent');
  });

  it('produces grounded AIP reasoning with cited entity IDs and deterministic actions', () => {
    const kevEntries = correlateKevWithAssets(CURATED_KEV_BASELINE, INITIAL_NETWORK_NODES);
    const graph = buildUnifiedOntology({
      agents: INITIAL_AGENTS,
      incidents: INITIAL_INCIDENTS,
      events: INITIAL_EVENTS,
      iocs: INITIAL_IOCS,
      networkNodes: INITIAL_NETWORK_NODES,
      sharedMemories: INITIAL_SHARED_MEMORIES,
      kevEntries,
    });

    const aip = deterministicAipReasoner(
      graph,
      'Trace APT-41 exfiltration across CISA KEVs and contain cluster-inference-01',
      'INC-2026-084'
    );

    assert.ok(aip.citedEntityIds.includes('INC-2026-084'));
    assert.ok(aip.recommendedActions.length > 0);
    assert.equal(aip.recommendedActions[0].actionType, 'contain_incident');
    assert.ok(aip.learnedRule && aip.learnedRule.tags.includes('self-learning'));
  });

  it('synthesizes persistent self-learning swarm memory rules', () => {
    const mem = synthesizeSelfLearningMemory(
      'CISA KEV Auto-Mitigation',
      'Quarantined cluster-inference-01 after CVE-2026-21849 correlation.',
      ['kev', 'containment']
    );
    assert.ok(mem.id.startsWith('mem-'));
    assert.ok(mem.tags.includes('self-learned'));
    assert.equal(mem.verifiedByHuman, true);
  });
});
