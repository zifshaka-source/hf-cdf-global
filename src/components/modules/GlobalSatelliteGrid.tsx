import React, { useState } from 'react';
import {
  Globe,
  Radio,
  Zap,
  Shield,
  Activity,
  Crosshair,
  Wifi,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Send,
  Compass,
  Navigation,
} from 'lucide-react';
import { sound } from '../../core/sound-fx';

interface SatelliteNode {
  id: string;
  name: string;
  noradId: string;
  orbitType: 'LEO' | 'MEO' | 'GEO' | 'POLAR';
  altitudeKm: number;
  inclinationDeg: number;
  downlinkGbps: number;
  status: 'locked' | 'handshaking' | 'calibrating' | 'nominal';
  encryption: 'QKD Quantum' | 'AES-256-GCM' | 'BLAKE3';
  azimuth: number;
  elevation: number;
}

const SATELLITE_CONSTELLATION: SatelliteNode[] = [
  { id: 'sat-01', name: 'KH-14 Recon Orbital 01', noradId: 'NORAD-54821', orbitType: 'LEO', altitudeKm: 482, inclinationDeg: 97.4, downlinkGbps: 12.8, status: 'locked', encryption: 'QKD Quantum', azimuth: 142.4, elevation: 68.2 },
  { id: 'sat-02', name: 'Sovereign-Sentinel Geo 04', noradId: 'NORAD-48902', orbitType: 'GEO', altitudeKm: 35786, inclinationDeg: 0.05, downlinkGbps: 48.5, status: 'locked', encryption: 'AES-256-GCM', azimuth: 210.8, elevation: 42.5 },
  { id: 'sat-03', name: 'Quantum Key Mesh Polar 02', noradId: 'NORAD-61049', orbitType: 'POLAR', altitudeKm: 620, inclinationDeg: 89.2, downlinkGbps: 8.4, status: 'nominal', encryption: 'QKD Quantum', azimuth: 18.2, elevation: 84.1 },
  { id: 'sat-04', name: 'Defense Relay MEO Alpha', noradId: 'NORAD-39482', orbitType: 'MEO', altitudeKm: 20200, inclinationDeg: 55.0, downlinkGbps: 24.2, status: 'handshaking', encryption: 'BLAKE3', azimuth: 95.6, elevation: 31.0 },
  { id: 'sat-05', name: 'Inference Uplink StarMesh 08', noradId: 'NORAD-58911', orbitType: 'LEO', altitudeKm: 550, inclinationDeg: 53.0, downlinkGbps: 16.0, status: 'locked', encryption: 'AES-256-GCM', azimuth: 275.4, elevation: 58.9 },
  { id: 'sat-06', name: 'Tactical Recon SAR 03', noradId: 'NORAD-44102', orbitType: 'LEO', altitudeKm: 510, inclinationDeg: 98.2, downlinkGbps: 14.1, status: 'calibrating', encryption: 'QKD Quantum', azimuth: 44.2, elevation: 19.4 },
];

interface GlobalSatelliteGridProps {
  onNotify?: (message: string, type: 'info' | 'success' | 'alert') => void;
}

export const GlobalSatelliteGrid: React.FC<GlobalSatelliteGridProps> = ({ onNotify }) => {
  const [satellites, setSatellites] = useState<SatelliteNode[]>(SATELLITE_CONSTELLATION);
  const [selectedSatId, setSelectedSatId] = useState<string>(SATELLITE_CONSTELLATION[0].id);
  const [isBeaming, setIsBeaming] = useState(false);

  const selectedSat = satellites.find((s) => s.id === selectedSatId) || satellites[0];

  const handleFrequencyHop = (satId: string) => {
    sound.play('radar');
    setSatellites((prev) =>
      prev.map((s) => (s.id === satId ? { ...s, status: 'handshaking', downlinkGbps: +(s.downlinkGbps * 1.15).toFixed(1) } : s))
    );
    onNotify?.(`Frequency hop executed for ${selectedSat.name}. Downlink stabilized.`, 'success');
  };

  const handleBeamformCalibrate = () => {
    sound.play('click');
    setIsBeaming(true);
    setTimeout(() => {
      setIsBeaming(false);
      onNotify?.(`Phased-array beamforming calibrated with ${selectedSat.name}. Phase jitter < 0.02 rad.`, 'info');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="apple-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white shadow-sm">
              <Globe className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-[#86868b] font-medium tracking-wide">
                <span>ORBITAL RECONNAISSANCE & DEFENSE GRID</span>
                <span className="text-white/20">·</span>
                <span className="text-[#30d158] font-semibold">6 SATELLITES LOCKED</span>
              </div>
              <h1 className="text-xl font-semibold text-white tracking-tight">Global Satellite Telemetry & Defense Command</h1>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleBeamformCalibrate}
              disabled={isBeaming}
              className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isBeaming ? 'Calibrating Phased Array...' : 'Calibrate Phased Array'}</span>
            </button>
          </div>
        </div>
        <p className="text-xs text-[#86868b] leading-relaxed max-w-4xl">
          Real-time orbital tracking and laser downlink synchronization across 6 military reconnaissance and QKD quantum encryption satellites protecting global enterprise enclaves.
        </p>
      </div>

      {/* Main Grid: Satellite List + Active Telemetry Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Satellite Constellation List (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-[#86868b] font-semibold tracking-wider uppercase">ORBITAL CONSTELLATION ({satellites.length})</span>
            <span className="text-xs text-[#30d158] font-medium">100% SECURE QKD MESH</span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {satellites.map((sat) => {
              const isSelected = sat.id === selectedSatId;
              return (
                <div
                  key={sat.id}
                  onClick={() => {
                    sound.play('click');
                    setSelectedSatId(sat.id);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2.5 ${
                    isSelected
                      ? 'border-[#0071e3]/60 bg-white/[0.05] shadow-sm ring-1 ring-[#0071e3]/40'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Radio className="w-4 h-4 text-[#0071e3]" />
                      <span className="font-semibold text-white text-xs">{sat.name}</span>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.06] text-white/80 border border-white/[0.08] font-mono font-medium">
                      {sat.orbitType}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-[#86868b] font-mono pt-2 border-t border-white/[0.06]">
                    <div>ID: <span className="text-white">{sat.noradId}</span></div>
                    <div>Alt: <span className="text-white">{sat.altitudeKm} KM</span></div>
                    <div className="text-right">Downlink: <span className="text-[#30d158] font-semibold">{sat.downlinkGbps} Gbps</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Satellite Live Telemetry Inspector (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="apple-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 text-[#0071e3]" />
                <span className="font-semibold text-white text-sm tracking-tight">{selectedSat.name} Telemetry</span>
              </div>
              <button
                onClick={() => handleFrequencyHop(selectedSat.id)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/90 border border-white/[0.08] text-xs flex items-center gap-1.5 transition-colors font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>Execute Frequency Hop</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                <span className="text-[#86868b]">NORAD Catalog ID:</span>
                <span className="text-white font-mono font-semibold">{selectedSat.noradId}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                <span className="text-[#86868b]">Orbit Classification:</span>
                <span className="text-white font-medium">{selectedSat.orbitType} ({selectedSat.altitudeKm} KM Altitude)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                <span className="text-[#86868b]">Orbital Inclination:</span>
                <span className="text-white font-mono">{selectedSat.inclinationDeg}°</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                <span className="text-[#86868b]">Encryption Standard:</span>
                <span className="text-[#30d158] font-semibold">{selectedSat.encryption}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                <span className="text-[#86868b]">Tracking Azimuth & Elevation:</span>
                <span className="text-[#ff9f0a] font-mono font-semibold">AZ {selectedSat.azimuth}° · EL {selectedSat.elevation}°</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
                <span className="text-[#86868b]">Laser Downlink Bandwidth:</span>
                <span className="text-white font-mono font-semibold">{selectedSat.downlinkGbps} Gbps (Active Handshake)</span>
              </div>
            </div>

            {/* Live Orbital Vector Canvas Simulation */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
              <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold">PHASED-ARRAY ANTENNA TRACKING ARRAY</div>
              <div className="text-xs text-[#a1a1a6] leading-relaxed">
                Station locked to orbital pass. Doppler frequency shift corrected to ±12 Hz. Zero packet loss across encrypted laser trunk.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
