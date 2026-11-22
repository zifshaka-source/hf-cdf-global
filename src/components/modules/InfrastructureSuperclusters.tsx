import React, { useState } from 'react';
import {
  Server,
  Zap,
  Activity,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  RefreshCw,
  Cpu,
  Flame,
  CheckCircle2,
  AlertOctagon,
  Layers,
  Thermometer,
  Gauge,
} from 'lucide-react';
import { sound } from '../../core/sound-fx';

interface SuperclusterRegion {
  id: string;
  name: string;
  location: string;
  gpuHardware: string;
  gpuCount: number;
  powerDrawMW: number;
  coolingType: string;
  coolingFlowGPM: number;
  rackAverageTempC: number;
  tamperLoopState: 'INTACT' | 'TRIPPED';
  airGapState: 'ONLINE' | 'ISOLATED';
  status: 'OPTIMAL' | 'THROTTLED' | 'ATTACK_MITIGATION';
}

const SUPERCLUSTER_REGIONS: SuperclusterRegion[] = [
  { id: 'sc-ashburn', name: 'Ashburn Cryo-Enclave Alpha', location: 'Ashburn, Virginia (US-East)', gpuHardware: 'NVIDIA H100 SXM5 80GB', gpuCount: 128000, powerDrawMW: 142.4, coolingType: 'Direct-to-Chip Dielectric Liquid', coolingFlowGPM: 480, rackAverageTempC: 38.4, tamperLoopState: 'INTACT', airGapState: 'ONLINE', status: 'OPTIMAL' },
  { id: 'sc-silicon', name: 'Silicon Valley Training Pod Beta', location: 'Santa Clara, California (US-West)', gpuHardware: 'NVIDIA H100 InfiniBand NDR', gpuCount: 64000, powerDrawMW: 71.8, coolingType: 'Closed-Loop Glycol Chiller', coolingFlowGPM: 240, rackAverageTempC: 41.2, tamperLoopState: 'INTACT', airGapState: 'ONLINE', status: 'OPTIMAL' },
  { id: 'sc-frankfurt', name: 'Frankfurt DE-CIX Sovereign Pod', location: 'Frankfurt am Main (EU-Central)', gpuHardware: 'NVIDIA H200 Quantum-2 Fabric', gpuCount: 64000, powerDrawMW: 76.5, coolingType: 'Immersion Liquid Dielectric', coolingFlowGPM: 320, rackAverageTempC: 36.8, tamperLoopState: 'INTACT', airGapState: 'ONLINE', status: 'ATTACK_MITIGATION' },
  { id: 'sc-tokyo', name: 'Tokyo Subterranean Cryo-Core', location: 'Tokyo, Otemachi (AP-Northeast)', gpuHardware: 'NVIDIA B200 NVLink 5.0', gpuCount: 32000, powerDrawMW: 44.0, coolingType: 'Cryogenic Liquid Nitrogen Assist', coolingFlowGPM: 190, rackAverageTempC: 32.5, tamperLoopState: 'INTACT', airGapState: 'ONLINE', status: 'OPTIMAL' },
  { id: 'sc-dublin', name: 'Dublin Hyperscale Wind-Fed Enclave', location: 'Dublin Grange Castle (EU-West)', gpuHardware: 'NVIDIA H100 RoCE v2 Fabric', gpuCount: 48000, powerDrawMW: 54.2, coolingType: 'Direct Evaporative Free-Air', coolingFlowGPM: 210, rackAverageTempC: 42.0, tamperLoopState: 'INTACT', airGapState: 'ONLINE', status: 'OPTIMAL' },
  { id: 'sc-singapore', name: 'Singapore Tropical Tier-4 Core', location: 'Singapore Jurong (AP-Southeast)', gpuHardware: 'NVIDIA H100 Liquid Cold-Plate', gpuCount: 32000, powerDrawMW: 38.6, coolingType: 'Modular High-Delta Chillers', coolingFlowGPM: 160, rackAverageTempC: 44.1, tamperLoopState: 'INTACT', airGapState: 'ONLINE', status: 'THROTTLED' },
];

interface InfrastructureSuperclustersProps {
  onNotify?: (message: string, type: 'info' | 'success' | 'alert') => void;
}

export const InfrastructureSuperclusters: React.FC<InfrastructureSuperclustersProps> = ({ onNotify }) => {
  const [clusters, setClusters] = useState<SuperclusterRegion[]>(SUPERCLUSTER_REGIONS);
  const [selectedClusterId, setSelectedClusterId] = useState<string>(SUPERCLUSTER_REGIONS[0].id);

  const selectedCluster = clusters.find((c) => c.id === selectedClusterId) || clusters[0];

  const handleToggleIsolation = (clusterId: string) => {
    sound.play('alert');
    setClusters((prev) =>
      prev.map((c) =>
        c.id === clusterId
          ? { ...c, airGapState: c.airGapState === 'ONLINE' ? 'ISOLATED' : 'ONLINE' }
          : c
      )
    );
    onNotify?.(`Physical fiber air-gap toggled for ${selectedCluster.name}. Network switches disconnected.`, 'alert');
  };

  const handleCoolingBoost = (clusterId: string) => {
    sound.play('click');
    setClusters((prev) =>
      prev.map((c) =>
        c.id === clusterId
          ? { ...c, coolingFlowGPM: +(c.coolingFlowGPM * 1.25).toFixed(0), rackAverageTempC: +(c.rackAverageTempC - 4.2).toFixed(1) }
          : c
      )
    );
    onNotify?.(`Cryogenic coolant pumps throttled to maximum for ${selectedCluster.name}.`, 'info');
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header Banner */}
      <div className="rounded-xl border border-purple-500/40 bg-slate-950 p-5 shadow-2xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-950 border border-purple-500/50 flex items-center justify-center text-purple-400 shadow">
              <Server className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-purple-300 font-bold">
                <span>GLOBAL GPU SUPERCLUSTER & SOVEREIGN DATACENTER MATRIX</span>
                <span>·</span>
                <span className="text-emerald-400">368,000 H100/B200 GPUS</span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight font-sans">
                Hyperscale AI Infrastructure & Power Grid Command Deck
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded bg-black/60 border border-purple-500/30 text-purple-300 flex items-center gap-2 font-bold">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>TOTAL POWER DRAW: 427.5 MW</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl font-sans">
          Centralized environmental, physical hardware, and cryogenic telemetry monitoring across 6 global GPU superclusters hosting multi-billion parameter frontier AI models.
        </p>
      </div>

      {/* Main Grid: Supercluster Regions + Deep Telemetry Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Clusters Roster (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-slate-400 font-bold">SUPERCLUSTER REGIONS ({clusters.length})</span>
            <span className="text-emerald-400">100% HARDWARE ENCLAVES INTACT</span>
          </div>

          <div className="space-y-3">
            {clusters.map((cluster) => {
              const isSelected = cluster.id === selectedClusterId;
              const isOnline = cluster.airGapState === 'ONLINE';

              return (
                <div
                  key={cluster.id}
                  onClick={() => {
                    sound.play('click');
                    setSelectedClusterId(cluster.id);
                  }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all space-y-2.5 ${
                    isSelected
                      ? 'border-purple-500/60 bg-purple-950/20 shadow-lg ring-1 ring-purple-500/40'
                      : 'border-white/10 bg-slate-900/40 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">{cluster.name}</span>
                      <div className="text-[11px] text-purple-300">{cluster.location}</div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                        isOnline
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-950 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {cluster.airGapState}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-2 border-t border-white/5">
                    <div>GPUs: <span className="text-white font-bold">{(cluster.gpuCount / 1000).toFixed(0)}k Units</span></div>
                    <div>Power: <span className="text-amber-400">{cluster.powerDrawMW} MW</span></div>
                    <div className="text-right">Temp: <span className="text-cyan-400 font-bold">{cluster.rackAverageTempC}°C</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Cluster Telemetry & Environmental Controls (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-xl border border-purple-500/40 bg-slate-950 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-white text-sm">{selectedCluster.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCoolingBoost(selectedCluster.id)}
                  className="px-2.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition-colors"
                >
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>Boost Coolant Flow</span>
                </button>
                <button
                  onClick={() => handleToggleIsolation(selectedCluster.id)}
                  className={`px-2.5 py-1.5 rounded font-bold text-[11px] flex items-center gap-1 transition-colors ${
                    selectedCluster.airGapState === 'ONLINE'
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
                  }`}
                >
                  {selectedCluster.airGapState === 'ONLINE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{selectedCluster.airGapState === 'ONLINE' ? 'Sever Enclave' : 'Restore Uplink'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Hardware Fleet Architecture:</span>
                <span className="text-white font-bold">{selectedCluster.gpuHardware} ({selectedCluster.gpuCount.toLocaleString()} Cores)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Facility Power Consumption:</span>
                <span className="text-amber-400 font-bold">{selectedCluster.powerDrawMW} Megawatts (Dedicated Substation)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Cryogenic Cooling System:</span>
                <span className="text-cyan-300 font-bold">{selectedCluster.coolingType} ({selectedCluster.coolingFlowGPM} GPM Flow)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Rack Exhaust Mean Temp:</span>
                <span className="text-emerald-400 font-bold">{selectedCluster.rackAverageTempC}°C (Delta T: 14.8°C)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Physical Microswitch Tamper Loop:</span>
                <span className="text-emerald-400 font-bold">{selectedCluster.tamperLoopState} (Zero Breaches)</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-black/80 border border-purple-500/30 space-y-2">
              <div className="text-[10px] text-purple-400 font-bold">SOVEREIGN MODEL WEIGHT VAULT HARDWARE LOCK</div>
              <div className="text-[11px] text-slate-300 leading-relaxed font-sans">
                All 128k H100 tensor cores locked to cryptographically attested PCIe firmware. Attempted memory extraction trips zero-delay galvanic optical killswitch.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
