import React, { useState, useEffect } from 'react';
import {
  Radio,
  Eye,
  Crosshair,
  Flame,
  Layers,
  Lock,
  Unlock,
  RefreshCw,
  Gauge,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { sound } from '../../core/sound-fx';
import { SURVEILLANCE_FEED_IMAGES } from '../../core/media-assets';

interface LiveSurveillanceEnvironmentProps {
  feedId: 'sat' | 'flir' | 'vault' | 'fiber';
  spectrumMode: 'optical' | 'flir_thermal' | 'night_vision' | 'sar_radar' | string;
  zoomLevel: number;
  selectedTargetId: string;
  isLidarScanning: boolean;
  showBoundingBoxes?: boolean;
  onSelectTarget?: (targetId: string) => void;
  onNotify?: (message: string) => void;
  compact?: boolean;
}

export const LiveSurveillanceEnvironment: React.FC<LiveSurveillanceEnvironmentProps> = ({
  feedId,
  spectrumMode,
  zoomLevel,
  selectedTargetId,
  isLidarScanning,
  showBoundingBoxes = true,
  onSelectTarget,
  onNotify,
  compact = false,
}) => {
  const [tick, setTick] = useState(0);
  const [liveUtc, setLiveUtc] = useState('');
  const [imageLoaded, setImageLoaded] = useState(true);

  // Satellite LEO telemetry state
  const [laserGimbalAzimuth, setLaserGimbalAzimuth] = useState(142.48);
  const [laserGimbalElevation, setLaserGimbalElevation] = useState(48.22);
  const [satFilterMode, setSatFilterMode] = useState<'0.15m MULTISPECTRAL' | 'PANCHROMATIC' | 'SWIR-IR'>('0.15m MULTISPECTRAL');
  const [isGimbalSteering, setIsGimbalSteering] = useState(false);

  // Drone FLIR telemetry state
  const [patrolPosition, setPatrolPosition] = useState(48);
  const [flirPalette, setFlirPalette] = useState<'WHITE-HOT' | 'BLACK-HOT' | 'IRONBOW' | 'RAINBOW'>('WHITE-HOT');
  const [droneExhaustTemp, setDroneExhaustTemp] = useState(84.6);
  const [interceptorDeployed, setInterceptorDeployed] = useState(false);

  // Vault Airlock physical state
  const [blastDoorSealed, setBlastDoorSealed] = useState(true);
  const [chamberPressurePsi, setChamberPressurePsi] = useState(492.4);
  const [cryoCoolantGpm, setCryoCoolantGpm] = useState(185);
  const [tamperVibrationG, setTamperVibrationG] = useState(0.002);

  // QKD Fiber optic state
  const [qkdKeyRateKbps, setQkdKeyRateKbps] = useState(14.6);
  const [qberPercent, setQberPercent] = useState(0.72);
  const [spadHitCount, setSpadHitCount] = useState(14280);
  const [isCalibratingPhase, setIsCalibratingPhase] = useState(false);
  const [activeFiberTrunk, setActiveFiberTrunk] = useState<'TRUNK-A (PRIMARY)' | 'TRUNK-B (DARK-FIBER)'>('TRUNK-A (PRIMARY)');

  // Live real-world time & telemetry ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveUtc(now.toISOString().replace('T', ' ').substring(0, 23) + ' UTC');
    };
    updateTime();
    const clockTimer = setInterval(updateTime, 100);

    const telemetryTimer = setInterval(() => {
      setTick((prev) => (prev + 1) % 7200);
      setLaserGimbalAzimuth((az) => +(az + (Math.random() * 0.06 - 0.03)).toFixed(2));
      setPatrolPosition((pos) => 44 + Math.sin(Date.now() / 1800) * 14);
      setTamperVibrationG(+(0.001 + Math.random() * 0.002).toFixed(3));
      setSpadHitCount((cnt) => cnt + Math.floor(Math.random() * 60 - 30));
      setQberPercent((qber) => Math.max(0.45, Math.min(1.15, +(qber + (Math.random() * 0.02 - 0.01)).toFixed(2))));
    }, 250);

    return () => {
      clearInterval(clockTimer);
      clearInterval(telemetryTimer);
    };
  }, []);

  // Trigger subtle smooth transition whenever feed image switches
  useEffect(() => {
    setImageLoaded(false);
    const id = requestAnimationFrame(() => setImageLoaded(true));
    return () => cancelAnimationFrame(id);
  }, [feedId]);

  const handleSteerGimbal = () => {
    sound.play('click');
    setIsGimbalSteering(true);
    onNotify?.('LEO SAT: Phased-array optical downlink gimbal recalibrating look-angles...');
    setTimeout(() => {
      setLaserGimbalAzimuth(146.12);
      setLaserGimbalElevation(52.84);
      setIsGimbalSteering(false);
      sound.play('success');
      onNotify?.('LEO SAT: Downlink carrier phase locked. SNR boosted to 31.2 dB.');
    }, 850);
  };

  const handleCycleSatFilter = () => {
    sound.play('click');
    const modes: Array<'0.15m MULTISPECTRAL' | 'PANCHROMATIC' | 'SWIR-IR'> = [
      '0.15m MULTISPECTRAL',
      'PANCHROMATIC',
      'SWIR-IR',
    ];
    const next = modes[(modes.indexOf(satFilterMode) + 1) % modes.length];
    setSatFilterMode(next);
    onNotify?.(`LEO SAT: Spectral sensor mode set to ${next}.`);
  };

  const handleDeployInterceptor = () => {
    sound.play('alert');
    setInterceptorDeployed(true);
    setDroneExhaustTemp(96.8);
    onNotify?.('DRONE FLIR: Autonomous interceptor SEC-79 airborne. Speed 48 KM/H, vector 315°.');
    setTimeout(() => {
      setInterceptorDeployed(false);
      setDroneExhaustTemp(84.6);
    }, 6000);
  };

  const handleToggleBlastDoor = () => {
    sound.play('lock');
    if (blastDoorSealed) {
      setBlastDoorSealed(false);
      setChamberPressurePsi(14.7);
      onNotify?.('VAULT: Primary hydraulic airlock disengaged. Pressure equalized to ambient.');
    } else {
      setBlastDoorSealed(true);
      setChamberPressurePsi(510.0);
      onNotify?.('VAULT: Primary hydraulic blast door sealed. 510 PSI positive seal rating.');
    }
  };

  const handleOverrideCryo = () => {
    sound.play('click');
    const next = cryoCoolantGpm > 210 ? 185 : cryoCoolantGpm + 35;
    setCryoCoolantGpm(next);
    onNotify?.(`VAULT: Liquid nitrogen flow rate overridden to ${next} GPM.`);
  };

  const handleCalibrateQkd = () => {
    sound.play('click');
    setIsCalibratingPhase(true);
    onNotify?.('QKD: Sweeping interferometer piezo actuators to counter thermal drift...');
    setTimeout(() => {
      setQberPercent(0.48);
      setQkdKeyRateKbps(16.9);
      setIsCalibratingPhase(false);
      sound.play('success');
      onNotify?.('QKD: Quantum phase realignment complete. QBER reduced to 0.48%.');
    }, 900);
  };

  // Real spectrum + per-sensor shader styling so image appearance visibly shifts on every toggle
  const getSpectrumFilter = () => {
    const baseFilters: string[] = [];
    switch (spectrumMode) {
      case 'flir_thermal':
        baseFilters.push('invert(0.9) contrast(155%) saturate(220%) hue-rotate(180deg) brightness(108%)');
        break;
      case 'night_vision':
        baseFilters.push('grayscale(100%) sepia(100%) hue-rotate(78deg) saturate(310%) contrast(140%) brightness(95%)');
        break;
      case 'sar_radar':
        baseFilters.push('grayscale(100%) contrast(225%) brightness(115%)');
        break;
      default:
        baseFilters.push('contrast(106%) brightness(102%)');
        break;
    }

    if (feedId === 'sat') {
      if (satFilterMode === 'PANCHROMATIC') baseFilters.push('grayscale(100%) contrast(125%)');
      if (satFilterMode === 'SWIR-IR') baseFilters.push('hue-rotate(140deg) saturate(160%) contrast(120%)');
    }

    if (feedId === 'flir') {
      if (flirPalette === 'BLACK-HOT') baseFilters.push('invert(100%) contrast(130%)');
      if (flirPalette === 'IRONBOW') baseFilters.push('sepia(85%) hue-rotate(310deg) saturate(260%) contrast(130%)');
      if (flirPalette === 'RAINBOW') baseFilters.push('sepia(60%) hue-rotate(190deg) saturate(320%) contrast(125%)');
    }

    return baseFilters.join(' ');
  };

  const currentImageSrc = SURVEILLANCE_FEED_IMAGES[feedId] || SURVEILLANCE_FEED_IMAGES.sat;

  return (
    <div
      data-testid="live-surveillance-viewport"
      data-active-feed={feedId}
      className="relative w-full h-full bg-[#0a0a0c] overflow-hidden select-none font-sans"
    >
      {/* 1. REAL-WORLD HIGH-RESOLUTION SENSORY BASE LAYER */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          key={`${feedId}-${currentImageSrc}`}
          src={currentImageSrc}
          alt={`Real-World Telemetry: ${feedId}`}
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-700 ease-out ${
            imageLoaded ? 'opacity-100' : 'opacity-80'
          }`}
          style={{
            filter: getSpectrumFilter(),
            transform: `scale(${zoomLevel})`,
          }}
        />

        {/* Active LiDAR Sweep Visual Overlay */}
        {isLidarScanning && (
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            <div
              className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#0a84ff] to-transparent shadow-[0_0_24px_6px_rgba(10,132,255,0.65)] transition-all duration-150"
              style={{ top: `${(tick * 9) % 100}%` }}
            />
            <div className="absolute inset-0 bg-[#0a84ff]/10" />
          </div>
        )}

        {/* Dynamic Scanline & Vignette Shader */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/50 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />

        {/* Subtle Geodetic Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
      </div>

      {/* 2. REAL-WORLD LIVE HUD TELEMETRY OVERLAY */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs font-mono pointer-events-none">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-white shadow-lg">
          <div className="w-2 h-2 rounded-full bg-[#30d158] animate-pulse" />
          <span className="font-semibold text-white tracking-wide">
            {feedId === 'sat' && 'KH-14 RECON · PASS #18,492'}
            {feedId === 'flir' && 'DRONE-FLIR-04 · PERIMETER AIRBORNE'}
            {feedId === 'vault' && 'VAULT-AIRLOCK-01 · LEVEL -5 SUBTERRANEAN'}
            {feedId === 'fiber' && 'QKD-DOVER-02 · SUBSEA OPTICAL TERMINAL'}
          </span>
          <span className="text-[#86868b]">|</span>
          <span className="text-[#a1a1a6] text-[11px] hidden sm:inline">
            {feedId === 'sat' && 'Ashburn, VA · 39°02\'38.4"N 77°29\'15.2"W'}
            {feedId === 'flir' && 'North Buffer Sector · Alt 7,315m FL240'}
            {feedId === 'vault' && 'Subterranean Core · Depth -42.0m Solid Bedrock'}
            {feedId === 'fiber' && 'Dover Strait Cable Station · 51°14\'02.0"N 1°23\'55.0"E'}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[11px] text-[#a1a1a6] shadow-lg">
          <span className="text-white font-semibold tabular-nums">{liveUtc || '2026-11-21 09:00:00 UTC'}</span>
          <span className="text-[#86868b] hidden sm:inline">|</span>
          <span className="text-[#30d158] font-medium hidden sm:flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            LIVE FEED LOCKED
          </span>
        </div>
      </div>

      {/* 3. DYNAMIC VECTOR SENSOR SCHEMATICS & TARGET TRACKING RETICLES */}
      {showBoundingBoxes && feedId === 'sat' && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute pointer-events-auto cursor-pointer"
            style={{ left: '78%', top: '35%', transform: 'translate(-50%, -50%)' }}
            onClick={() => onSelectTarget?.('TGT-SAT-01')}
          >
            <div
              className={`w-14 h-14 border rounded-sm relative flex items-center justify-center transition-all ${
                selectedTargetId === 'TGT-SAT-01'
                  ? 'border-[#ff453a] bg-[#ff453a]/15 shadow-[0_0_15px_rgba(255,69,58,0.5)]'
                  : 'border-[#0071e3]/80 hover:border-white'
              }`}
            >
              <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-white" />
              <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-white" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-white" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-white" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#0071e3] animate-ping" />
            </div>
            <div className="mt-1 px-2 py-0.5 rounded bg-black/90 border border-white/15 text-[10px] font-mono text-white whitespace-nowrap">
              Uplink Array Bravo · AZ {laserGimbalAzimuth}° EL {laserGimbalElevation}°
            </div>
          </div>

          <div
            className="absolute pointer-events-auto cursor-pointer"
            style={{ left: '38%', top: '24%', transform: 'translate(-50%, -50%)' }}
            onClick={() => onSelectTarget?.('TGT-SAT-02')}
          >
            <div
              className={`w-12 h-12 border rounded-sm relative flex items-center justify-center transition-all ${
                selectedTargetId === 'TGT-SAT-02'
                  ? 'border-[#ff453a] bg-[#ff453a]/15'
                  : 'border-[#30d158]/80 hover:border-white'
              }`}
            >
              <div className="w-1 h-1 rounded-full bg-[#30d158]" />
            </div>
            <div className="mt-1 px-2 py-0.5 rounded bg-black/90 border border-white/15 text-[10px] font-mono text-white whitespace-nowrap">
              Cryo-Chiller Alpha · 18.2°C (42 PSI)
            </div>
          </div>
        </div>
      )}

      {showBoundingBoxes && feedId === 'flir' && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute pointer-events-auto cursor-pointer transition-all duration-300"
            style={{ left: `${patrolPosition}%`, top: '64%', transform: 'translate(-50%, -50%)' }}
            onClick={() => onSelectTarget?.('TGT-FLIR-01')}
          >
            <div className="w-16 h-16 border border-[#ff9f0a] rounded-sm relative flex items-center justify-center bg-[#ff9f0a]/10">
              <Crosshair className="w-5 h-5 text-[#ff9f0a] animate-spin" style={{ animationDuration: '10s' }} />
            </div>
            <div className="mt-1 px-2 py-0.5 rounded bg-black/90 border border-[#ff9f0a]/40 text-[10px] font-mono text-[#ff9f0a] whitespace-nowrap">
              Patrol SEC-71 · Exhaust {droneExhaustTemp}°C · 18 KM/H
            </div>
          </div>
        </div>
      )}

      {showBoundingBoxes && feedId === 'vault' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="px-6 py-3 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/15 shadow-2xl text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-xs font-mono font-semibold">
                {blastDoorSealed ? (
                  <>
                    <Lock className="w-4 h-4 text-[#30d158]" />
                    <span className="text-[#30d158]">TITANIUM HYDRAULIC BLAST INTERLOCK ENGAGED</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 text-[#ff453a]" />
                    <span className="text-[#ff453a]">BLAST INTERLOCK EQUALIZING · DECONTAMINATION OPEN</span>
                  </>
                )}
              </div>
              <div className="text-[11px] font-mono text-[#a1a1a6]">
                Chamber Pressure: <span className="text-white font-bold">{chamberPressurePsi} PSI</span> · Nitrogen Flow:{' '}
                <span className="text-white font-bold">{cryoCoolantGpm} GPM</span> · Tamper G-Force:{' '}
                <span className="text-[#30d158] font-bold">{tamperVibrationG} G</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBoundingBoxes && feedId === 'fiber' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-16 left-4 right-4 h-24 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 p-3 pointer-events-auto">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#a1a1a6] mb-1">
              <span className="text-white font-semibold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#0071e3]" />
                DWDM COHERENT QKD PHASE WAVEFORM
              </span>
              <span>
                Key Rate: <strong className="text-white">{qkdKeyRateKbps} kbps</strong> | Detections:{' '}
                <strong className="text-white">{spadHitCount}/s</strong> | QBER:{' '}
                <strong className="text-[#30d158]">{qberPercent}%</strong>
              </span>
            </div>
            <svg className="w-full h-12" preserveAspectRatio="none">
              <path
                d={Array.from({ length: 48 })
                  .map((_, i) => {
                    const x = (i / 47) * 780;
                    const y = 24 + Math.sin(i * 0.4 + tick * 0.25) * 16 + (Math.random() * 2 - 1);
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ')}
                stroke="#0071e3"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </div>
        </div>
      )}

      {/* 4. APPLE PRO ACTION CONTROL DOCK */}
      {!compact && (
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#121216]/90 backdrop-blur-xl border border-white/10 text-xs font-mono shadow-2xl">
          <div className="flex items-center gap-2">
            {feedId === 'sat' && (
              <>
                <button
                  onClick={handleSteerGimbal}
                  disabled={isGimbalSteering}
                  className="px-3 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Crosshair className={`w-3.5 h-3.5 ${isGimbalSteering ? 'animate-spin' : ''}`} />
                  <span>{isGimbalSteering ? 'Realigning Gimbal...' : 'Steer Laser Gimbal'}</span>
                </button>
                <button
                  onClick={handleCycleSatFilter}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium flex items-center gap-1.5 transition-all"
                >
                  <Eye className="w-3.5 h-3.5 text-[#2997ff]" />
                  <span>Sensor: {satFilterMode}</span>
                </button>
              </>
            )}

            {feedId === 'flir' && (
              <>
                <button
                  onClick={handleDeployInterceptor}
                  disabled={interceptorDeployed}
                  className="px-3 py-1.5 rounded-lg bg-[#ff9f0a] hover:bg-[#ff9500] text-black font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>{interceptorDeployed ? 'Scrambling Drone...' : 'Scramble Interceptor'}</span>
                </button>
                <button
                  onClick={() => {
                    const palettes: Array<'WHITE-HOT' | 'BLACK-HOT' | 'IRONBOW' | 'RAINBOW'> = [
                      'WHITE-HOT',
                      'BLACK-HOT',
                      'IRONBOW',
                      'RAINBOW',
                    ];
                    const next = palettes[(palettes.indexOf(flirPalette) + 1) % palettes.length];
                    setFlirPalette(next);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium flex items-center gap-1.5 transition-all"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#ff9f0a]" />
                  <span>Palette: {flirPalette}</span>
                </button>
              </>
            )}

            {feedId === 'vault' && (
              <>
                <button
                  onClick={handleToggleBlastDoor}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                    blastDoorSealed
                      ? 'bg-[#30d158] hover:bg-[#28cd41] text-black'
                      : 'bg-[#ff453a] hover:bg-[#e03126] text-white'
                  }`}
                >
                  {blastDoorSealed ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{blastDoorSealed ? 'Blast Interlock Sealed' : 'Disengage Interlock'}</span>
                </button>
                <button
                  onClick={handleOverrideCryo}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium flex items-center gap-1.5 transition-all"
                >
                  <Gauge className="w-3.5 h-3.5 text-[#2997ff]" />
                  <span>Boost Cryo ({cryoCoolantGpm} GPM)</span>
                </button>
              </>
            )}

            {feedId === 'fiber' && (
              <>
                <button
                  onClick={handleCalibrateQkd}
                  disabled={isCalibratingPhase}
                  className="px-3 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCalibratingPhase ? 'animate-spin' : ''}`} />
                  <span>{isCalibratingPhase ? 'Calibrating...' : 'Align QKD Phase'}</span>
                </button>
                <button
                  onClick={() => {
                    const next = activeFiberTrunk.includes('PRIMARY') ? 'TRUNK-B (DARK-FIBER)' : 'TRUNK-A (PRIMARY)';
                    setActiveFiberTrunk(next);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium flex items-center gap-1.5 transition-all"
                >
                  <Layers className="w-3.5 h-3.5 text-[#bf5af2]" />
                  <span>Route: {activeFiberTrunk}</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#86868b]">
            <span className="flex items-center gap-1 text-[#30d158]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-ping" />
              TELEMETRY NOMINAL
            </span>
            <span>BANDWIDTH: 3.8 GBPS</span>
            <span>FRAME RATE: 60.0 FPS</span>
          </div>
        </div>
      )}
    </div>
  );
};
