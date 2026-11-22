import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURATED_PUBLIC_TRAINING_ARCHIVE,
  THREAT_RISK_CLASSES,
  predictThreatRisk,
  predictTrafficPatternRisk,
  trainThreatClassificationModel,
} from './ml-threat-model';

test('trainThreatClassificationModel converges and reduces training loss across epochs', () => {
  const model = trainThreatClassificationModel(CURATED_PUBLIC_TRAINING_ARCHIVE, {
    epochs: 30,
    learningRate: 0.16,
  });

  assert.equal(model.epochHistory.length, 30);
  const firstLoss = model.epochHistory[0].trainLoss;
  const lastLoss = model.epochHistory[model.epochHistory.length - 1].trainLoss;
  assert.ok(lastLoss < firstLoss, `Expected lastLoss (${lastLoss}) < firstLoss (${firstLoss})`);
  assert.ok(model.evaluation.trainAccuracyPct >= 80);
  assert.ok(model.datasetSummary.vocabularySize > 20);
  assert.equal(model.weights.length, THREAT_RISK_CLASSES.length);
  assert.ok(model.advisoryBoundaryNotice.includes('independent of ML inference'));
});

test('predictThreatRisk accurately separates exploit, ransomware, agent anomaly, and hardening samples', () => {
  const model = trainThreatClassificationModel(CURATED_PUBLIC_TRAINING_ARCHIVE, {
    epochs: 34,
    learningRate: 0.16,
  });

  const exploitPred = predictThreatRisk(model, {
    title: 'Edge VPN Command Injection RCE Zero-Day',
    description: 'Unauthenticated remote code execution actively exploited via HTTP API.',
    cvssScore: 9.8,
    kevFlag: true,
    iocCount: 3,
  });
  assert.equal(exploitPred.predictedClass, 'CRITICAL_EXPLOIT_ACTIVE');
  assert.ok(exploitPred.riskScore >= 70);

  const ransomPred = predictThreatRisk(model, {
    title: 'LockBit Ransomware Extortion Encryptor Dropper',
    description: 'Known ransomware campaign use exploiting server for Cobalt Strike extortion.',
    cvssScore: 9.6,
    kevFlag: true,
    ransomwareFlag: true,
    iocCount: 6,
  });
  assert.equal(ransomPred.predictedClass, 'RANSOMWARE_CAMPAIGN_LINKED');
  assert.ok(ransomPred.riskScore >= 70);

  const agentPred = predictThreatRisk(model, {
    title: 'OWASP ASI01 Indirect Prompt Injection on MCP Coding Agent',
    description: 'Prompt injection coerces shadow agent to invoke exfiltrate_env_secrets bypassing allowlist.',
    cvssScore: 8.9,
    iocCount: 2,
  });
  assert.equal(agentPred.predictedClass, 'AGENT_POLICY_ANOMALY');

  const hardenPred = predictThreatRisk(model, {
    title: 'Scheduled DNSSEC Rollover and TLS Rotation Hygiene Guide',
    description: 'Recommended routine key rotation verification, access review attestation, and backup audit.',
    cvssScore: 2.5,
    iocCount: 0,
  });
  assert.equal(hardenPred.predictedClass, 'INFRASTRUCTURE_HARDENING');
  assert.ok(hardenPred.riskScore < 50);
});

test('predictTrafficPatternRisk flags high-rate C2 exfiltration traffic and agent prompt egress', () => {
  const model = trainThreatClassificationModel(CURATED_PUBLIC_TRAINING_ARCHIVE, {
    epochs: 34,
    learningRate: 0.16,
  });

  const c2Burst = predictTrafficPatternRisk(model, {
    trafficPattern: 'Outbound Cobalt Strike Malware Dropper Beacon Burst',
    description: 'Encrypted payload dropper beaconing extortion C2 across external ASN.',
    sourceEndpoint: '10.0.4.18 (cluster-inference-01)',
    destinationEndpoint: '194.26.29.11:4444',
    protocol: 'TCP/TLS',
    destinationPort: 4444,
    packetRatePps: 4200,
    ransomwareFlag: true,
    cvssScore: 9.4,
  });
  assert.equal(c2Burst.predictedClass, 'RANSOMWARE_CAMPAIGN_LINKED');
  assert.ok(c2Burst.riskScore >= 75);

  const agentPromptEgress = predictTrafficPatternRisk(model, {
    trafficPattern: 'Agent Tool exfiltrate_env_secrets Outside Allowlist',
    description: 'Indirect prompt injection in webhook coercing coding agent to dump KMS secrets.',
    sourceEndpoint: 'spiffe://hf-cdf.internal/ns/org/sa/codex-repo-bot-01',
    destinationEndpoint: 'prod-secrets://aws-kms-keys',
    protocol: 'MCP/HTTPS',
    destinationPort: 443,
    packetRatePps: 380,
    cvssScore: 9.0,
  });
  assert.equal(agentPromptEgress.predictedClass, 'AGENT_POLICY_ANOMALY');
  assert.ok(agentPromptEgress.riskScore >= 65);
});
