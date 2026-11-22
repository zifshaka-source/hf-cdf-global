import React, { useState } from 'react';
import {
  Shield,
  Globe,
  Lock,
  Unlock,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Activity,
  Layers,
} from 'lucide-react';
import { sound } from '../../core/sound-fx';

interface SovereignEnclave {
  id: string;
  continent: string;
  jurisdiction: string;
  leadDatacenter: string;
  airGapStatus: 'SECURED' | 'BYPASS_ACTIVE' | 'QUARANTINED';
  treatyCompliance: string;
  shardCount: number;
  encryptionKeyHash: string;
}

const INITIAL_ENCLAVES: SovereignEnclave[] = [
  { id: 'enc-01', continent: 'North America', jurisdiction: 'US Federal & FedRAMP High', leadDatacenter: 'Ashburn Sovereign Enclave 01', airGapStatus: 'SECURED', treatyCompliance: 'ISO-27001 / FIPS 140-3 L4', shardCount: 128, encryptionKeyHash: 'SHA256:e3b0c442...855' },
  { id: 'enc-02', continent: 'Asia-Pacific', jurisdiction: 'Japan Sovereign Privacy Act', leadDatacenter: 'Tokyo TFX Liquidity Core', airGapStatus: 'SECURED', treatyCompliance: 'APEC CBPR / ISO-27001', shardCount: 64, encryptionKeyHash: 'SHA256:7f83b165...069' },
  { id: 'enc-03', continent: 'Europe (EMEA)', jurisdiction: 'EU GDPR & NIS2 Sovereign Enclave', leadDatacenter: 'Frankfurt DE-CIX Core', airGapStatus: 'SECURED', treatyCompliance: 'GDPR Article 46 / TISAX', shardCount: 96, encryptionKeyHash: 'SHA256:a665a459...7ae3' },
  { id: 'enc-04', continent: 'Latin America', jurisdiction: 'Brazil LGPD Sovereign Node', leadDatacenter: 'Sao Paulo Edge Interconnect', airGapStatus: 'SECURED', treatyCompliance: 'LGPD / ISO-27001', shardCount: 32, encryptionKeyHash: 'SHA256:5e884898...42d8' },
];

interface SovereignEnclaveMeshProps {
  onNotify?: (message: string, type: 'info' | 'success' | 'alert') => void;
}

export const SovereignEnclaveMesh: React.FC<SovereignEnclaveMeshProps> = ({ onNotify }) => {
  const [enclaves, setEnclaves] = useState<SovereignEnclave[]>(INITIAL_ENCLAVES);
  const [selectedEnclaveId, setSelectedEnclaveId] = useState<string>(INITIAL_ENCLAVES[0].id);

  const selectedEnclave = enclaves.find((e) => e.id === selectedEnclaveId) || enclaves[0];

  const handleToggleAirGap = (enclaveId: string) => {
    sound.play('alert');
    setEnclaves((prev) =>
      prev.map((e) =>
        e.id === enclaveId
          ? { ...e, airGapStatus: e.airGapStatus === 'SECURED' ? 'QUARANTINED' : 'SECURED' }
          : e
      )
    );
    onNotify?.(`Sovereign enclave air-gap state toggled for ${selectedEnclave.jurisdiction}.`, 'alert');
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header Banner */}
      <div className="rounded-xl border border-indigo-500/40 bg-slate-950 p-5 shadow-2xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shadow">
              <Server className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-indigo-300 font-bold">
                <span>CROSS-BORDER SOVEREIGN ENCLAVE MATRIX</span>
                <span>·</span>
                <span className="text-emerald-400">4 GEOPOLITICAL ZONES</span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight font-sans">Sovereign Enclave & Treaty Compliance Mesh</h1>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl font-sans">
          Manage geopolitical jurisdiction firewalls, air-gap enclaves, and cryptographic weight shard custody across North America, APAC, EMEA, and LatAm.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Enclaves List (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-slate-400 font-bold">SOVEREIGN JURISDICTIONS ({enclaves.length})</span>
            <span className="text-emerald-400">ALL TREATIES COMPLIANT</span>
          </div>

          <div className="space-y-3">
            {enclaves.map((enc) => {
              const isSelected = enc.id === selectedEnclaveId;
              const isSecured = enc.airGapStatus === 'SECURED';

              return (
                <div
                  key={enc.id}
                  onClick={() => {
                    sound.play('click');
                    setSelectedEnclaveId(enc.id);
                  }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all space-y-2.5 ${
                    isSelected
                      ? 'border-indigo-500/60 bg-indigo-950/30 shadow-lg ring-1 ring-indigo-500/40'
                      : 'border-white/10 bg-slate-900/40 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{enc.continent}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                        isSecured
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-950 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {enc.airGapStatus}
                    </span>
                  </div>

                  <div className="text-xs text-indigo-300 font-semibold">{enc.jurisdiction}</div>
                  <div className="text-[11px] text-slate-400">{enc.leadDatacenter}</div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-400">
                    <span>Shards: {enc.shardCount} H100 Tensors</span>
                    <span className="text-cyan-400">{enc.treatyCompliance.split('/')[0]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Enclave Details & Controls (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-xl border border-indigo-500/40 bg-slate-950 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-white text-sm">{selectedEnclave.continent} JURISDICTION DOSSIER</span>
              </div>
              <button
                onClick={() => handleToggleAirGap(selectedEnclave.id)}
                className={`px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
                  selectedEnclave.airGapStatus === 'SECURED'
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {selectedEnclave.airGapStatus === 'SECURED' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{selectedEnclave.airGapStatus === 'SECURED' ? 'Force Quarantine' : 'Restore Secured Enclave'}</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Geopolitical Jurisdiction:</span>
                <span className="text-white font-bold">{selectedEnclave.jurisdiction}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Primary Enclave Datacenter:</span>
                <span className="text-cyan-400 font-bold">{selectedEnclave.leadDatacenter}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Treaty Compliance Standard:</span>
                <span className="text-emerald-400 font-bold">{selectedEnclave.treatyCompliance}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Model Weight Shards:</span>
                <span className="text-indigo-300 font-bold">{selectedEnclave.shardCount} Shards (Encrypted HSM)</span>
              </div>
              <div className="pt-2">
                <span className="text-slate-400 block mb-1">Enclave Master Encryption Key:</span>
                <span className="text-[10px] text-slate-500 break-all bg-black/80 p-2 rounded block border border-white/5 font-mono">
                  {selectedEnclave.encryptionKeyHash}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
