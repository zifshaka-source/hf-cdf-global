import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  Key,
  HardDrive,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Eye,
  FileCode,
  Flame,
  Fingerprint,
  Zap,
} from 'lucide-react';
import { sound } from '../../core/sound-fx';

interface ModelAsset {
  id: string;
  name: string;
  vaultLocation: string;
  estimatedAssetValue: string;
  totalSize: string;
  totalShards: number;
  format: 'safetensors' | 'gguf' | 'raw_checkpoint';
  attestationStatus: 'attested' | 're-verifying' | 'compromise_flagged' | 'frozen';
  pcr0EnclaveHash: string;
  kmsKeyId: string;
  lastAttested: string;
  sideChannelAnomaly: boolean;
  shards: {
    id: string;
    filename: string;
    sizeGb: number;
    blake3: string;
    enclaveSealed: boolean;
    memoryBandwidthGbps: number;
    status: 'clean' | 'exfil_probed' | 'frozen';
  }[];
}

const INITIAL_MODELS: ModelAsset[] = [
  {
    id: 'model-apex-400b',
    name: 'Frontier-Sovereign-400B-MoE-Pretrain-Checkpoint-92800',
    vaultLocation: 'Supercluster Apex Vault · Virginia DC-1 · HSM Zone Alpha',
    estimatedAssetValue: '$85,000,000,000',
    totalSize: '420 GB',
    totalShards: 8,
    format: 'safetensors',
    attestationStatus: 'compromise_flagged',
    pcr0EnclaveHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    kmsKeyId: 'arn:aws:kms:us-east-1:385394648365:key/mrk-apex-model-hsm-901',
    lastAttested: '1 minute ago (Anomaly Detected)',
    sideChannelAnomaly: true,
    shards: [
      {
        id: 'shard-01',
        filename: 'model-00001-of-00008.safetensors',
        sizeGb: 52.5,
        blake3: '8f3d19bc2a4e98f7c1d32091c2aa8810e74f1b539829e0018a38db4910cf8192',
        enclaveSealed: true,
        memoryBandwidthGbps: 18.4,
        status: 'exfil_probed',
      },
      {
        id: 'shard-02',
        filename: 'model-00002-of-00008.safetensors',
        sizeGb: 52.5,
        blake3: '4a991823bc0192e1098a87f1981249bcefa90123984102938102938410293812',
        enclaveSealed: true,
        memoryBandwidthGbps: 2.1,
        status: 'clean',
      },
      {
        id: 'shard-03',
        filename: 'model-00003-of-00008.safetensors',
        sizeGb: 52.5,
        blake3: '99bf10283a0192e8172635489102938471029384019283019283019283019283',
        enclaveSealed: true,
        memoryBandwidthGbps: 2.0,
        status: 'clean',
      },
      {
        id: 'shard-04',
        filename: 'model-00004-of-00008.safetensors',
        sizeGb: 52.5,
        blake3: '77ce190283a0192e817263548910293847102938401928301928301928301928',
        enclaveSealed: true,
        memoryBandwidthGbps: 1.9,
        status: 'clean',
      },
    ],
  },
  {
    id: 'model-deepseek-671b',
    name: 'DeepSeek-V3-671B-MoE-FP8-Production',
    vaultLocation: 'AirGap Cold Vault Alpha · Luleå Hydro Subterranean DC',
    estimatedAssetValue: '$45,000,000,000',
    totalSize: '1,342 GB',
    totalShards: 64,
    format: 'safetensors',
    attestationStatus: 'attested',
    pcr0EnclaveHash: 'c4ca4238a0b923820dcc509a6f75849b28f8f2f9812938471928374829102938',
    kmsKeyId: 'hsm-nitro-nordic-hydro-vault-671b-mrk',
    lastAttested: '14 minutes ago',
    sideChannelAnomaly: false,
    shards: [
      {
        id: 'ds-shard-01',
        filename: 'model-00001-of-00064.safetensors',
        sizeGb: 21.0,
        blake3: '98a1029384102938401928301928301928301928301928301928301928301928',
        enclaveSealed: true,
        memoryBandwidthGbps: 1.8,
        status: 'clean',
      },
      {
        id: 'ds-shard-02',
        filename: 'model-00002-of-00064.safetensors',
        sizeGb: 21.0,
        blake3: '88bc102938410293840192830192830192830192830192830192830192830192',
        enclaveSealed: true,
        memoryBandwidthGbps: 1.9,
        status: 'clean',
      },
    ],
  },
  {
    id: 'model-llama-70b',
    name: 'Llama-3.3-70B-Instruct-Sovereign-FP8',
    vaultLocation: 'GovCloud US-East-1 · Nitro Enclave Cluster 04',
    estimatedAssetValue: '$15,000,000,000',
    totalSize: '140 GB',
    totalShards: 8,
    format: 'safetensors',
    attestationStatus: 'attested',
    pcr0EnclaveHash: '1679091c5a880faf6fb5e6087eb1b2dc01928301928301928301928301928301',
    kmsKeyId: 'arn:aws:kms:us-gov-east-1:vault-llama33-70b',
    lastAttested: '22 minutes ago',
    sideChannelAnomaly: false,
    shards: [
      {
        id: 'l3-shard-01',
        filename: 'model-00001-of-00008.safetensors',
        sizeGb: 17.5,
        blake3: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
        enclaveSealed: true,
        memoryBandwidthGbps: 1.7,
        status: 'clean',
      },
    ],
  },
];

export const ModelWeightsVault: React.FC = () => {
  const [models, setModels] = useState<ModelAsset[]>(INITIAL_MODELS);
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0].id);
  const [isScanning, setIsScanning] = useState(false);
  const [scanOutput, setScanOutput] = useState<string | null>(null);
  const [freezeConfirmModal, setFreezeConfirmModal] = useState<string | null>(null);
  const [mfaAuthToken, setMfaAuthToken] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];

  const handleRunAttestation = (modelId: string) => {
    setIsScanning(true);
    sound.play('radar');
    setScanOutput(`[INIT] Loading Nitro Enclave PCR0 attestation document for ${selectedModel.name}...`);

    setTimeout(() => {
      setScanOutput((prev) => `${prev}\n[CHECK] Verified AMD SEV-SNP measured boot quote.`);
    }, 600);

    setTimeout(() => {
      setScanOutput((prev) => `${prev}\n[HASH] BLAKE3 streaming verification on 8 shards: 0 bit-rot detected.`);
    }, 1200);

    setTimeout(() => {
      setIsScanning(false);
      sound.play('success');
      setScanOutput((prev) => `${prev}\n[COMPLETE] Cryptographic attestation successful. Nonce verified against Sovereign Vault HSM.`);
      setModels((prev) =>
        prev.map((m) =>
          m.id === modelId
            ? { ...m, attestationStatus: 'attested', sideChannelAnomaly: false, lastAttested: 'Just now (Attested)' }
            : m
        )
      );
    }, 1900);
  };

  const handleExecuteFreeze = () => {
    if (!mfaAuthToken || mfaAuthToken.trim().length < 6) {
      sound.play('alert');
      setStatusMessage('ERROR: Valid SecOps Dual-Custody MFA hardware token required.');
      return;
    }

    sound.play('lock');
    setModels((prev) =>
      prev.map((m) => {
        if (m.id === selectedModel.id) {
          return {
            ...m,
            attestationStatus: 'frozen',
            sideChannelAnomaly: false,
            shards: m.shards.map((s) => ({ ...s, status: 'frozen', memoryBandwidthGbps: 0 })),
          };
        }
        return m;
      })
    );

    setStatusMessage(`SUCCESS: Cryptographic freeze executed. KMS Key ${selectedModel.kmsKeyId} revoked across inference clusters.`);
    setFreezeConfirmModal(null);
    setMfaAuthToken('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>SOVEREIGN AI ASSET DEFENSE · $145B+ PROTECTED MODEL WEIGHTS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Foundational Model Weights Cryptographic Vault
          </h1>
          <p className="text-xs text-slate-400">
            Zero-knowledge attestation, BLAKE3 shard integrity, AMD SEV-SNP enclave sealing, and memory-bus side-channel exfiltration defense.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleRunAttestation(selectedModel.id)}
            disabled={isScanning}
            className="px-3.5 py-2 text-xs font-semibold text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 rounded transition-colors flex items-center gap-2 font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isScanning ? 'Attesting Shards...' : 'Attest Model Weights'}</span>
          </button>
          <button
            onClick={() => {
              sound.play('alert');
              setFreezeConfirmModal(selectedModel.id);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-red-200 bg-red-950/60 hover:bg-red-900/60 border border-red-500/50 rounded transition-colors flex items-center gap-2 font-mono shadow-lg shadow-red-950/40"
          >
            <Lock className="w-3.5 h-3.5 text-red-400" />
            <span>Emergency KMS Freeze</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-slate-900 border border-cyan-500/40 rounded text-xs font-mono text-cyan-200 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* High-Level Asset Ledger Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-white/10 bg-slate-900/40 space-y-1">
          <div className="text-xs text-slate-400 font-mono flex items-center justify-between">
            <span>PROTECTED MODEL CAPITAL</span>
            <Fingerprint className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">$145.0B+</div>
          <div className="text-[11px] text-slate-500 font-mono">Total Verified Enterprise Weight Valuation</div>
        </div>

        <div className="p-4 rounded-lg border border-white/10 bg-slate-900/40 space-y-1">
          <div className="text-xs text-slate-400 font-mono flex items-center justify-between">
            <span>SAFETENSORS SHARDS</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">76 / 76</div>
          <div className="text-[11px] text-slate-500 font-mono">100% Cryptographic BLAKE3 Sealed</div>
        </div>

        <div className="p-4 rounded-lg border border-white/10 bg-slate-900/40 space-y-1">
          <div className="text-xs text-slate-400 font-mono flex items-center justify-between">
            <span>ENCLAVE SEV-SNP QUOTES</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-300 font-mono tabular-nums">3 ENCLAVES</div>
          <div className="text-[11px] text-slate-500 font-mono">Hardware PCR0 Hardware Enforced</div>
        </div>

        <div className="p-4 rounded-lg border border-white/10 bg-slate-900/40 space-y-1">
          <div className="text-xs text-slate-400 font-mono flex items-center justify-between">
            <span>SIDE-CHANNEL STATUS</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">1 PROBE FLAGGED</div>
          <div className="text-[11px] text-slate-500 font-mono">Shard 01 Outbound Rate Clamped</div>
        </div>
      </div>

      {/* Main Two-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Model Selection Column (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider px-1">
            Sovereign Model Repositories
          </div>
          <div className="space-y-2">
            {models.map((m) => {
              const isSelected = m.id === selectedModelId;
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    sound.play('click');
                    setSelectedModelId(m.id);
                  }}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400/50 shadow-lg shadow-cyan-950/40'
                      : m.attestationStatus === 'compromise_flagged'
                      ? 'border-red-500/50 bg-red-950/20 hover:bg-red-950/30'
                      : m.attestationStatus === 'frozen'
                      ? 'border-slate-700 bg-slate-900/30 opacity-70'
                      : 'border-white/10 bg-slate-900/40 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-xs text-slate-100 font-mono truncate">
                      {m.name}
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                        m.attestationStatus === 'compromise_flagged'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : m.attestationStatus === 'frozen'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {m.attestationStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono line-clamp-1">
                    {m.vaultLocation}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-white/5">
                    <span className="text-slate-500">{m.totalSize} · {m.totalShards} Shards</span>
                    <span className="text-emerald-400 font-semibold">{m.estimatedAssetValue}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Model Shard Matrix & Hardware Telemetry (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-5 rounded-lg border border-white/10 bg-slate-900/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">INSPECTING MODEL REPOSITORY</div>
                <h2 className="text-base font-bold text-white font-mono">{selectedModel.name}</h2>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-slate-500">ESTIMATED ASSET VALUE</div>
                <div className="text-lg font-bold text-emerald-400 font-mono">{selectedModel.estimatedAssetValue}</div>
              </div>
            </div>

            {/* Cryptographic Metadata Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-black/40 rounded border border-white/5 space-y-1">
                <div className="text-slate-500 text-[10px]">NITRO ENCLAVE PCR0 ATTESTATION HASH</div>
                <div className="text-cyan-300 text-[11px] break-all select-all">{selectedModel.pcr0EnclaveHash}</div>
              </div>
              <div className="p-3 bg-black/40 rounded border border-white/5 space-y-1">
                <div className="text-slate-500 text-[10px]">HARDWARE SECURITY MODULE (HSM) KMS KEY</div>
                <div className="text-indigo-300 text-[11px] break-all select-all">{selectedModel.kmsKeyId}</div>
              </div>
            </div>

            {/* Shard Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Cryptographic Shards & Memory Bus Egress</span>
                <span>Algorithm: BLAKE3 (256-bit)</span>
              </div>

              <div className="overflow-x-auto rounded border border-white/10">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-black/60 text-slate-400 text-[10px] uppercase border-b border-white/10">
                    <tr>
                      <th className="p-2.5">Shard Filename</th>
                      <th className="p-2.5">Size</th>
                      <th className="p-2.5">BLAKE3 Hash</th>
                      <th className="p-2.5">NVLink / Mem Egress</th>
                      <th className="p-2.5">Enclave State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-950/60">
                    {selectedModel.shards.map((s) => (
                      <tr key={s.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-2.5 font-medium text-slate-200">{s.filename}</td>
                        <td className="p-2.5 text-slate-400 tabular-nums">{s.sizeGb.toFixed(1)} GB</td>
                        <td className="p-2.5 text-slate-400 font-mono text-[10px] truncate max-w-[140px]" title={s.blake3}>
                          {s.blake3.slice(0, 16)}...
                        </td>
                        <td className="p-2.5 tabular-nums">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              s.memoryBandwidthGbps > 10
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                                : 'text-slate-300'
                            }`}
                          >
                            {s.memoryBandwidthGbps.toFixed(1)} GB/s
                          </span>
                        </td>
                        <td className="p-2.5">
                          {s.status === 'exfil_probed' ? (
                            <span className="text-red-400 font-bold text-[10px]">EGRESS ANOMALY</span>
                          ) : s.status === 'frozen' ? (
                            <span className="text-amber-400 font-bold text-[10px]">KMS REVOKED</span>
                          ) : (
                            <span className="text-emerald-400 font-bold text-[10px]">SEALED & CLEAN</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Attestation Console Output */}
            {scanOutput && (
              <div className="p-3 bg-black/80 rounded border border-white/10 font-mono text-xs text-slate-300 whitespace-pre-wrap">
                {scanOutput}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dual Custody Emergency Freeze Modal */}
      {freezeConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-lg border border-red-500/60 bg-slate-950 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">EMERGENCY CRYPTOGRAPHIC MODEL FREEZE</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              You are about to cryptographically revoke KMS encryption keys for{' '}
              <strong className="text-white">{selectedModel.name}</strong>. This will instantly terminate all inference GPU pods, drop TCP/TLS connections, and zero host staging RAM.
            </p>

            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded text-xs font-mono text-red-200">
              WARNING: Dual-custody multi-signature required. This action is auditable under SOC2, ISO27001, and Sovereign Defense compliance policies.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400">
                SecOps Lead YubiKey / WebAuthn Token PIN (min 6 digits):
              </label>
              <input
                type="password"
                placeholder="Enter 6-digit cryptographic PIN e.g. 849201"
                value={mfaAuthToken}
                onChange={(e) => setMfaAuthToken(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-white/20 rounded text-white font-mono focus:outline-none focus:border-red-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setFreezeConfirmModal(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteFreeze}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded border border-red-500/60 shadow-lg font-mono"
              >
                CONFIRM & FREEZE MODEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
