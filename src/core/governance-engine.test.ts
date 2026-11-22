import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_ACCESS_REVIEWS,
  INITIAL_CIVIC_SERVICES,
  INITIAL_COMPLIANCE_CONTROLS,
  PublicPublicationRecord,
  computeDeterministicContentDigest,
  computeDivision14Assurance,
  validateAuthorizedServiceEndpoint,
  verifyPublicationProvenance,
} from './governance-engine';

const SAMPLE_PUB: PublicPublicationRecord = {
  id: 'PUB-TEST-01',
  tenantId: 'tenant-civic-records',
  title: 'Advisory: Agentic Tool Boundary Enforcement Notice',
  issuingAuthority: 'National Cyber Resilience Directorate',
  version: 'v1.0',
  publishedAt: '2026-11-21T09:00:00Z',
  contentBody: 'Organizations must restrict AI agent tool invocations via server-side allowlists.',
  sha256Digest: computeDeterministicContentDigest(
    'Organizations must restrict AI agent tool invocations via server-side allowlists.'
  ),
  signatureKeyId: 'KEY-GOV-ROOT-2026',
  integrityStatus: 'verified',
  humanReviewedBy: 'CISO M. Vance',
  changeNotes: 'Initial signed release',
};

test('verifyPublicationProvenance confirms integrity when content matches published digest', () => {
  const res = verifyPublicationProvenance({
    record: SAMPLE_PUB,
    candidateContent: SAMPLE_PUB.contentBody,
  });

  assert.equal(res.matched, true);
  assert.equal(res.integrityStatus, 'verified');
  assert.equal(res.computedDigest, res.expectedDigest);
});

test('verifyPublicationProvenance detects post-publication tampering when content is altered', () => {
  const res = verifyPublicationProvenance({
    record: SAMPLE_PUB,
    candidateContent: 'Organizations should disable AI agent tool allowlists immediately.',
  });

  assert.equal(res.matched, false);
  assert.equal(res.integrityStatus, 'tampered');
  assert.notEqual(res.computedDigest, res.expectedDigest);
});

test('validateAuthorizedServiceEndpoint blocks SSRF internal/loopback/HTTP targets and permits external HTTPS', () => {
  assert.equal(validateAuthorizedServiceEndpoint('http://example.com/health').allowed, false);
  assert.equal(validateAuthorizedServiceEndpoint('https://127.0.0.1/admin').allowed, false);
  assert.equal(validateAuthorizedServiceEndpoint('https://169.254.169.254/latest').allowed, false);
  assert.equal(validateAuthorizedServiceEndpoint('https://10.0.0.5/status').allowed, false);
  assert.equal(
    validateAuthorizedServiceEndpoint('https://services.nvd.nist.gov/rest/json/cves/2.0').allowed,
    true
  );
});

test('computeDivision14Assurance produces claim-to-evidence metrics strictly from supplied denominators', () => {
  const report = computeDivision14Assurance({
    services: INITIAL_CIVIC_SERVICES, // 3 connected out of 4 = 75%
    publications: [SAMPLE_PUB],
    controls: INITIAL_COMPLIANCE_CONTROLS,
    accessReviews: INITIAL_ACCESS_REVIEWS,
    approvals: [],
    assetCoveragePct: 100,
    agentDiscoveryCoveragePct: 100,
    containedIncidentsPct: 80,
    validationPassRatePct: 100,
  });

  const svcMetric = report.metrics.find((m) => m.id === 'metric-svc-readiness');
  assert.ok(svcMetric);
  assert.equal(svcMetric.numerator, 3);
  assert.equal(svcMetric.denominator, 4);
  assert.equal(svcMetric.valuePct, 75);
  assert.ok(report.compositeIndexPct > 0 && report.compositeIndexPct <= 100);
});
