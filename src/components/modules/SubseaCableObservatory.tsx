import React, { useState } from 'react';
import {
  Network,
  Activity,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Globe,
  Wifi,
} from 'lucide-react';
import { sound } from '../../core/sound-fx';

interface SubseaCable {
  id: string;
  name: string;
  route: string;
  capacityTbps: number;
  ber: number; // Bit Error Rate
  status: 'OPTIMAL' | 'SCRUBBING_ACTIVE' | 'RE-ROUTING';
  latencyMs: number;
  fiberPairs: number;
}

const INITIAL_CABLES: SubseaCable[] = [
  { id: 'cable-01', name: 'TAT-14 Transatlantic Express', route: 'New York (US) → Bude (UK)', capacityTbps: 32.4, ber: 0.0000001, status: 'OPTIMAL', latencyMs: 58.4, fiberPairs: 8 },
  { id: 'cable-02', name: 'APCN-2 Asia Pacific Ring', route: 'Tokyo (JP) → Singapore (SG)', capacityTbps: 28.0, ber: 0.0000002, status: 'OPTIMAL', latencyMs: 64.2, fiberPairs: 6 },
  { id: 'cable-03', name: 'SEA-ME-WE 6 Eurasian Trunk', route: 'Marseille (FR) → Singapore (SG)', capacityTbps: 42.6, ber: 0.0000014, status: 'SCRUBBING_ACTIVE', latencyMs: 82.1, fiberPairs: 12 },
  { id: 'cable-04', name: 'Curie Cable South America', route: 'Los Angeles (US) → Valparaiso (CL)', capacityTbps: 72.0, ber: 0.0000001, status: 'OPTIMAL', latencyMs: 94.0, fiberPairs: 16 },
  { id: 'cable-05', name: 'JUPITER Trans-Pacific Cable', route: 'Los Angeles (US) → Maruyama (JP)', capacityTbps: 60.0, ber: 0.0000003, status: 'OPTIMAL', latencyMs: 78.5, fiberPairs: 10 },
];

interface SubseaCableObservatoryProps {
  onNotify?: (message: string, type: 'info' | 'success' | 'alert') => void;
}

export const SubseaCableObservatory: React.FC<SubseaCableObservatoryProps> = ({ onNotify }) => {
  const [cables, setCables] = useState<SubseaCable[]>(INITIAL_CABLES);
  const [selectedCableId, setSelectedCableId] = useState<string>(INITIAL_CABLES[0].id);

  const selectedCable = cables.find((c) => c.id === selectedCableId) || cables[0];

  const handleRerouteCable = (cableId: string) => {
    sound.play('radar');
    setCables((prev) =>
      prev.map((c) => (c.id === cableId ? { ...c, status: 'RE-ROUTING', latencyMs: +(c.latencyMs * 1.1).toFixed(1) } : c))
    );
    onNotify?.(`Autonomous DWDM fiber rerouting initiated for ${selectedCable.name}.`, 'alert');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="apple-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white shadow-sm">
              <Network className="w-5 h-5 text-[#30d158]" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-[#86868b] font-medium tracking-wide">
                <span>GLOBAL FIBER & UNDERSEA CABLE OBSERVATORY</span>
                <span className="text-white/20">·</span>
                <span className="text-[#0071e3] font-semibold">5 TRANSOCEANIC TRUNKS</span>
              </div>
              <h1 className="text-xl font-semibold text-white tracking-tight">Undersea Cable Interception & DWDM Observatory</h1>
            </div>
          </div>
        </div>
        <p className="text-xs text-[#86868b] leading-relaxed max-w-4xl">
          Real-time optical spectrum monitoring, bit error rate (BER) analysis, and automated DWDM optical rerouting across transoceanic dark-fiber landing stations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Cables List (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-[#86868b] font-semibold tracking-wider uppercase">TRANSOCEANIC TRUNKS ({cables.length})</span>
            <span className="text-xs text-[#30d158] font-medium">235 TBPS TOTAL CAPACITY</span>
          </div>

          <div className="space-y-3">
            {cables.map((cab) => {
              const isSelected = cab.id === selectedCableId;
              const isOptimal = cab.status === 'OPTIMAL';

              return (
                <div
                  key={cab.id}
                  onClick={() => {
                    sound.play('click');
                    setSelectedCableId(cab.id);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2.5 ${
                    isSelected
                      ? 'border-[#0071e3]/60 bg-white/[0.05] shadow-sm ring-1 ring-[#0071e3]/40'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{cab.name}</span>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-medium ${
                        isOptimal
                          ? 'bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30'
                          : 'bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30'
                      }`}
                    >
                      {cab.status}
                    </span>
                  </div>

                  <div className="text-xs text-[#a1a1a6]">{cab.route}</div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-[#86868b] font-mono pt-2 border-t border-white/[0.06]">
                    <div>Capacity: <strong className="text-white font-medium">{cab.capacityTbps} Tbps</strong></div>
                    <div>Latency: <strong className="text-[#ff9f0a] font-medium">{cab.latencyMs}ms</strong></div>
                    <div className="text-right">Pairs: <strong className="text-white font-medium">{cab.fiberPairs} Pairs</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Cable Spectrum & Controls (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="apple-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <Wifi className="w-4 h-4 text-[#30d158]" />
                <span className="font-semibold text-white text-sm tracking-tight">{selectedCable.name} Spectrum</span>
              </div>
              <button
                onClick={() => handleRerouteCable(selectedCable.id)}
                className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/90 border border-white/[0.08] text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>Reroute Optical Path</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                <span className="text-[#86868b]">Route Landfall:</span>
                <span className="text-white font-medium">{selectedCable.route}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                <span className="text-[#86868b]">Total Optical Capacity:</span>
                <span className="text-white font-mono font-semibold">{selectedCable.capacityTbps} Tbps (DWDM Coherent)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                <span className="text-[#86868b]">Bit Error Rate (BER):</span>
                <span className="text-[#30d158] font-mono font-semibold">{selectedCable.ber} (FEC Corrected)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                <span className="text-[#86868b]">End-to-End Latency:</span>
                <span className="text-[#ff9f0a] font-mono font-semibold">{selectedCable.latencyMs}ms</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                <span className="text-[#86868b]">Active Fiber Pairs:</span>
                <span className="text-white font-mono">{selectedCable.fiberPairs} Pairs (Low-Loss Silica)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
