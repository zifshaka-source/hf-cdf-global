import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Activity,
  Cpu,
  AlertTriangle,
  Radio,
  Zap,
  ArrowRight,
  Server,
  Globe,
  Camera,
  Video,
  Focus,
  Layers,
  ShieldCheck,
  Target,
  Terminal,
  Swords,
  TrendingUp,
  Scan,
  RefreshCw,
} from 'lucide-react';
import {
  Agent,
  Incident,
  IndicatorOfCompromise,
  LiveOpsStateSnapshot,
  NetworkNode,
  OsTelemetryBundle,
  SecurityEvent,
  TelemetryType,
} from '../../core/types';
import { computeExecutiveKpis } from '../../core/os-compiler-utils';
import { DefConIndicator } from '../common/DefConIndicator';
import { sound } from '../../core/sound-fx';
import { GlobalThreatRadarD3 } from './GlobalThreatRadarD3';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { LiveSurveillanceEnvironment } from './LiveSurveillanceEnvironment';
import { RealTimeThreatFeed } from './RealTimeThreatFeed';
import { AnomalySixtyMinChart } from './AnomalySixtyMinChart';
import { IncidentThirtyDayTrendChart } from './IncidentThirtyDayTrendChart';
import { EnterpriseThreatWarningSoldiers } from './EnterpriseThreatWarningSoldiers';
import { SURVEILLANCE_FEED_IMAGES } from '../../core/media-assets';
import { api } from '../../services/api';

interface CommandCenterProps {
  status: any;
  agents: Agent[];
  incidents: Incident[];
  events: SecurityEvent[];
  iocs?: IndicatorOfCompromise[];
  nodes?: NetworkNode[];
  osTelemetry?: OsTelemetryBundle | null;
  liveOps?: LiveOpsStateSnapshot | null;
  onSelectModule: (moduleId: string) => void;
  onSelectIncident: (incidentId: string) => void;
  onContainIncident?: (incidentId: string) => Promise<any>;
  onInjectEvent: () => void;
  onSyncFeeds?: () => Promise<void>;
}

interface TrackingTarget {
  id: string;
  label: string;
  type: 'facility' | 'vehicle' | 'biometric' | 'telecom';
  xPercent: number;
  yPercent: number;
  telemetry: string;
  threatState: 'nominal' | 'inspected' | 'locked';
}

interface TrackingFeed {
  id: 'sat' | 'flir' | 'vault' | 'fiber';
  callsign: string;
  title: string;
  location: string;
  imageSrc: string;
  coordinates: string;
  altitudeDepth: string;
  sensorType: string;
  opticalBandwidth: string;
  statusBadge: string;
  targets: TrackingTarget[];
}

const TRACKING_FEEDS: TrackingFeed[] = [
  {
    id: 'sat',
    callsign: 'SAT-ORBIT-KH14',
    title: 'Ashburn Model Supercluster · Sovereign Datacenter Compound',
    location: 'Ashburn, VA · Vault Enclave Sector 1',
    imageSrc: SURVEILLANCE_FEED_IMAGES.sat,
    coordinates: '39°02\'38.4"N 77°29\'15.2"W',
    altitudeDepth: 'LEO 482 KM · INCL 97.4°',
    sensorType: 'KH-14 Multi-Spectral Optical (0.15m GSD)',
    opticalBandwidth: '3.8 Gbps Laser Downlink',
    statusBadge: 'PERSISTENT ORBITAL TRACK · OPTICAL LINK CLEAN',
    targets: [
      {
        id: 'TGT-SAT-01',
        label: 'Satellite Uplink Array Bravo',
        type: 'facility',
        xPercent: 78,
        yPercent: 35,
        telemetry: 'AZ 142° · EL 48° · 4.8 GHz Carrier Nominal',
        threatState: 'locked',
      },
      {
        id: 'TGT-SAT-02',
        label: 'Cryo-Chiller Core Alpha',
        type: 'facility',
        xPercent: 38,
        yPercent: 24,
        telemetry: 'Core Temp 18.2°C · Glycol Pressure 42 PSI',
        threatState: 'nominal',
      },
      {
        id: 'TGT-SAT-03',
        label: 'North Perimeter Barrier Gate',
        type: 'facility',
        xPercent: 50,
        yPercent: 80,
        telemetry: 'Barrier Armed · Laser Tripwire 100% Active',
        threatState: 'inspected',
      },
    ],
  },
  {
    id: 'flir',
    callsign: 'DRONE-FLIR-04',
    title: 'Aerospace Perimeter Patrol · Stratospheric FLIR Vector',
    location: 'North Perimeter Buffer Sector 4',
    imageSrc: SURVEILLANCE_FEED_IMAGES.flir,
    coordinates: '39°03\'12.1"N 77°28\'50.4"W',
    altitudeDepth: 'FL 240 (7,315 M) · AIRBORNE',
    sensorType: 'InSb LWIR 8-12μm Thermal Imaging (640x512)',
    opticalBandwidth: 'Direct Mil-COFDM 1.2 Gbps',
    statusBadge: 'HIGH GAIN · WHITE-HOT POLARITY · TARGET LOCK ARMED',
    targets: [
      {
        id: 'TGT-FLIR-01',
        label: 'Armed Mobile Patrol Unit SEC-71',
        type: 'vehicle',
        xPercent: 53,
        yPercent: 64,
        telemetry: 'Speed 18 KM/H · Bearing 240° · Exhaust 84°C',
        threatState: 'locked',
      },
      {
        id: 'TGT-FLIR-02',
        label: 'Facility Hangar 04',
        type: 'facility',
        xPercent: 74,
        yPercent: 22,
        telemetry: 'Interior Ambient 21°C · Tamper Sensors Armed',
        threatState: 'nominal',
      },
      {
        id: 'TGT-FLIR-03',
        label: 'Perimeter Sentry Unit',
        type: 'facility',
        xPercent: 31,
        yPercent: 55,
        telemetry: 'Biometric Beacon Verified · Team Bravo Sentry',
        threatState: 'inspected',
      },
    ],
  },
  {
    id: 'vault',
    callsign: 'VAULT-AIRLOCK-01',
    title: 'Subterranean Frontier Weights Enclave · Airlock Portal',
    location: 'Subterranean Vault Level -5',
    imageSrc: SURVEILLANCE_FEED_IMAGES.vault,
    coordinates: '39°02\'37.9"N 77°29\'16.1"W',
    altitudeDepth: '-42 METERS SUBTERRANEAN',
    sensorType: '4K Hardened Optical & Biometric Interlock Sensor',
    opticalBandwidth: 'Armored Hardwire 10 Gbps',
    statusBadge: 'LEVEL-5 SECURITY AIRLOCK · INTERLOCK ENGAGED',
    targets: [
      {
        id: 'TGT-VAULT-01',
        label: 'Titanium Blast Door Hydraulic Seal',
        type: 'biometric',
        xPercent: 58,
        yPercent: 45,
        telemetry: 'Hydraulic Locks 100% · Blast Rating 500 PSI',
        threatState: 'locked',
      },
      {
        id: 'TGT-VAULT-02',
        label: 'Biometric Palm/Iris Scanner Console',
        type: 'biometric',
        xPercent: 69,
        yPercent: 48,
        telemetry: 'Dual-Iris Verified · Session Auth: Officer M. Vance',
        threatState: 'inspected',
      },
      {
        id: 'TGT-VAULT-03',
        label: 'Service Vault Trunk Conduit',
        type: 'facility',
        xPercent: 18,
        yPercent: 62,
        telemetry: 'RoCEv2 Fiber Trunk · Tamper Accelerometer 0.00G',
        threatState: 'nominal',
      },
    ],
  },
  {
    id: 'fiber',
    callsign: 'QKD-TERMINAL-02',
    title: 'Transatlantic Subsea Cable Landing & Quantum Distribution Hub',
    location: 'Dover Strait Subsea Cable Terminal',
    imageSrc: SURVEILLANCE_FEED_IMAGES.fiber,
    coordinates: '51°14\'02.0"N 1°23\'55.0"E',
    altitudeDepth: 'SEA LEVEL TERMINAL ROOM',
    sensorType: 'Opto-Electronic Optical Power & Quantum BER Monitor',
    opticalBandwidth: '32 DWDM Wavelengths · 32 Tbps Aggregated',
    statusBadge: '32 DWDM CHANNELS · QBER 0.72% · NO PHYSICAL TAMPER',
    targets: [
      {
        id: 'TGT-FIBER-01',
        label: 'Quantum Key Distribution (QKD) Unit A',
        type: 'telecom',
        xPercent: 80,
        yPercent: 42,
        telemetry: 'Key Rate 14.2 kbps · Single Photon Detector 99.4%',
        threatState: 'locked',
      },
      {
        id: 'TGT-FIBER-02',
        label: 'Atlantic Subsea Armored Trunk Conduit',
        type: 'telecom',
        xPercent: 40,
        yPercent: 76,
        telemetry: 'Armored Trunk 01 · Return Loss -42 dB Nominal',
        threatState: 'nominal',
      },
      {
        id: 'TGT-FIBER-03',
        label: 'Network Operations Terminal Station',
        type: 'facility',
        xPercent: 48,
        yPercent: 45,
        telemetry: 'Operator ID: C. Davies · Cryptographic Seal Verified',
        threatState: 'inspected',
      },
    ],
  },
];

export const CommandCenter: React.FC<CommandCenterProps> = ({
  status,
  agents,
  incidents,
  events,
  iocs = [],
  nodes = [],
  osTelemetry = null,
  liveOps = null,
  onSelectModule,
  onSelectIncident,
  onContainIncident,
  onInjectEvent,
  onSyncFeeds,
}) => {
  const [telemetryFilter, setTelemetryFilter] = useState<'all' | TelemetryType>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [isSyncingFeeds, setIsSyncingFeeds] = useState(false);
  const [newEventIds, setNewEventIds] = useState<string[]>([]);
  const seenEventIdsRef = useRef<Set<string>>(new Set(events.map((e) => e.id)));
  const [displayedEvents, setDisplayedEvents] = useState<SecurityEvent[]>(events);

  useEffect(() => {
    if (isPaused) return;
    const incomingNewIds: string[] = [];
    events.forEach((evt) => {
      if (!seenEventIdsRef.current.has(evt.id)) {
        seenEventIdsRef.current.add(evt.id);
        incomingNewIds.push(evt.id);
      }
    });
    setDisplayedEvents(events);
    if (incomingNewIds.length > 0) {
      setNewEventIds((prev) => Array.from(new Set([...incomingNewIds, ...prev])));
      const clearTimer = setTimeout(() => {
        setNewEventIds((prev) => prev.filter((id) => !incomingNewIds.includes(id)));
      }, 4500);
      return () => clearTimeout(clearTimer);
    }
  }, [events, isPaused]);

  // High-Security Firm Visual Tracking Station State
  const [activeFeedId, setActiveFeedId] = useState<'sat' | 'flir' | 'vault' | 'fiber' | 'matrix'>('sat');
  const [isAutoCycling, setIsAutoCycling] = useState<boolean>(true);
  const [spectrumMode, setSpectrumMode] = useState<'optical' | 'flir_thermal' | 'night_vision' | 'sar_radar'>('optical');
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 4>(1);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('TGT-SAT-01');
  const [isLidarScanning, setIsLidarScanning] = useState(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [sensorMessage, setSensorMessage] = useState<string | null>(null);

  // Live Real-World Surveillance Feed Auto-Cycle (cycles SAT -> FLIR -> VAULT -> FIBER every 6s)
  useEffect(() => {
    if (!isAutoCycling || activeFeedId === 'matrix') return;
    const feedOrder: Array<'sat' | 'flir' | 'vault' | 'fiber'> = ['sat', 'flir', 'vault', 'fiber'];
    const cycleTimer = setInterval(() => {
      const idx = feedOrder.indexOf(activeFeedId as 'sat' | 'flir' | 'vault' | 'fiber');
      const nextFeedId = feedOrder[(idx + 1) % feedOrder.length];
      const nextFeed = TRACKING_FEEDS.find((f) => f.id === nextFeedId);
      setActiveFeedId(nextFeedId);
      if (nextFeed?.targets[0]?.id) {
        setSelectedTargetId(nextFeed.targets[0].id);
      }
    }, 6000);
    return () => clearInterval(cycleTimer);
  }, [isAutoCycling, activeFeedId]);

  const handleAdvanceFeed = () => {
    sound.play('click');
    const feedOrder: Array<'sat' | 'flir' | 'vault' | 'fiber'> = ['sat', 'flir', 'vault', 'fiber'];
    const idx = feedOrder.indexOf(activeFeedId as 'sat' | 'flir' | 'vault' | 'fiber');
    const nextFeedId = feedOrder[(idx + 1) % feedOrder.length];
    const nextFeed = TRACKING_FEEDS.find((f) => f.id === nextFeedId);
    setActiveFeedId(nextFeedId);
    if (nextFeed?.targets[0]?.id) {
      setSelectedTargetId(nextFeed.targets[0].id);
    }
  };

  const currentFeed = TRACKING_FEEDS.find((f) => f.id === activeFeedId) || TRACKING_FEEDS[0];
  const currentTarget = currentFeed.targets.find((t) => t.id === selectedTargetId) || currentFeed.targets[0];
  const currentFeedIndex = Math.max(0, TRACKING_FEEDS.findIndex((f) => f.id === currentFeed.id));

  const handleTriggerLidarSweep = () => {
    sound.play('radar');
    setIsLidarScanning(true);
    setSensorMessage('ACTIVE MULTI-SPECTRAL LIDAR PULSE EXECUTED · 40,000 PTS/SEC · 0 PERIMETER BREACHES DETECTED');
    setTimeout(() => {
      setIsLidarScanning(false);
    }, 3200);
    setTimeout(() => {
      setSensorMessage(null);
    }, 6500);
  };

  const handleDispatchSentry = () => {
    sound.play('alert');
    setSensorMessage(`SENTINEL PERIMETER REINFORCEMENT: Autonomous drone patrol and optical cameras locked on ${currentTarget?.label}`);
    setTimeout(() => {
      setSensorMessage(null);
    }, 5500);
  };

  const handleSelectTarget = (targetId: string) => {
    sound.play('click');
    setSelectedTargetId(targetId);
  };

  const getSpectrumFilterStyle = (mode: string) => {
    switch (mode) {
      case 'flir_thermal':
        return { filter: 'invert(0.9) contrast(1.4) brightness(0.95)' };
      case 'night_vision':
        return { filter: 'contrast(1.3) brightness(1.15) sepia(1) hue-rotate(60deg) saturate(2)' };
      case 'sar_radar':
        return { filter: 'contrast(1.4) brightness(0.9) hue-rotate(180deg) saturate(1.5)' };
      default:
        return { filter: 'contrast(1.08) brightness(1.02)' };
    }
  };

  const filteredEvents = displayedEvents.filter((e) =>
    telemetryFilter === 'all' ? true : e.type === telemetryFilter
  );

  const activeAgents = agents.filter((a) => a.status === 'active');
  const execKpis = computeExecutiveKpis({
    incidents,
    agents,
    iocs,
    nodes,
    events,
    resources: osTelemetry?.resources ?? null,
    services: osTelemetry?.services ?? [],
  });
  const priorityUncontained = incidents.find(
    (i) => i.state !== 'contained' && i.state !== 'resolved' && i.state !== 'closed'
  );

  const [mlOverview, setMlOverview] = useState<{
    modelId: string;
    valAccPct: number;
    totalSamples: number;
    liveSamples: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getPublicMlStatus()
      .then((snap) => {
        if (!cancelled && snap?.model) {
          setMlOverview({
            modelId: snap.model.modelId,
            valAccPct: snap.model.evaluation?.validationAccuracyPct ?? 0,
            totalSamples: snap.model.datasetSummary?.totalSamples ?? 0,
            liveSamples: snap.model.datasetSummary?.liveApiSamples ?? 0,
          });
        }
      })
      .catch(() => {
        // silent fallback if offline
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSyncFeedsClick = async () => {
    if (!onSyncFeeds || isSyncingFeeds) return;
    setIsSyncingFeeds(true);
    try {
      await onSyncFeeds();
    } finally {
      setIsSyncingFeeds(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Sovereign Institutional Command & Control Header */}
      <div className="apple-card p-6 rounded-2xl shadow-2xl space-y-5 relative overflow-hidden">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded-md bg-[#ff453a]/15 border border-[#ff453a]/35 text-[#ff6961] font-bold">
                  DEFCON {status?.defcon || 1}
                </span>
                <span className="text-white/20">/</span>
                <span className="text-[#0a84ff] font-semibold tracking-wider">SOVEREIGN COMMAND OS</span>
                <span className="text-white/20">/</span>
                <span className="text-[#30d158] font-medium inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  WEIGHTS VAULT ATTESTED
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#f5f5f7]">
                Global Intelligence &amp; Autonomous Defense Command
              </h1>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono text-[#a1a1a6] shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-[#111113] border border-white/[0.08] tabular-nums">
                UNCONTAINED:{' '}
                <strong className="text-[#ff453a]">
                  {execKpis.totalIncidentsCount - execKpis.containedCount}
                </strong>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[#111113] border border-white/[0.08] tabular-nums">
                MITIGATION EFFICIENCY:{' '}
                <strong className="text-[#0a84ff]">{execKpis.threatMitigationEfficiencyPct}%</strong>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#a1a1a6] leading-relaxed max-w-4xl">
            Unified multi-domain operating system correlating live CISA KEV &amp; URLhaus feeds, host kernel &amp; polyglot compiler telemetry, SWIFT clearing rails, orbital QKD, subsea DWDM trunks, and autonomous cyber defense swarms.
          </p>

          {/* Disciplined Action Strip */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/[0.08]">
            {priorityUncontained && onContainIncident && (
              <button
                type="button"
                onClick={() => {
                  sound.play('alert');
                  onContainIncident(priorityUncontained.id);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0071e3] hover:bg-[#0077ed] rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Contain Priority ({priorityUncontained.id})</span>
              </button>
            )}
            {onSyncFeeds && (
              <button
                type="button"
                disabled={isSyncingFeeds}
                onClick={handleSyncFeedsClick}
                className="px-3 py-1.5 text-xs font-medium text-[#f5f5f7] bg-[#1c1c1e] hover:bg-[#2c2c2e] rounded-xl border border-white/[0.1] transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#0a84ff] ${isSyncingFeeds ? 'animate-spin' : ''}`} />
                <span>{isSyncingFeeds ? 'Syncing Feeds...' : 'Sync CISA KEV & URLhaus'}</span>
              </button>
            )}
            {[
              { id: 'enterprise-defense', label: 'Inter-Company Warning & Soldiers', icon: Swords, accent: 'text-[#ff453a]', onClick: () => {
                const el = document.getElementById('enterprise-threat-defense');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  onSelectModule('enterprise-defense');
                }
              } },
              { id: 'civic-governance', label: mlOverview ? `Governance & ML (${mlOverview.valAccPct}%)` : 'Governance & ML Studio', icon: ShieldCheck, accent: 'text-[#64d2ff]', onClick: () => onSelectModule('civic-governance') },
              { id: 'agent-trust', label: 'Agent Trust & Gateway', icon: ShieldCheck, accent: 'text-[#30d158]', onClick: () => onSelectModule('agent-trust') },
              { id: 'os-compiler', label: 'OS & Compiler Engine', icon: Terminal, accent: 'text-[#0a84ff]', onClick: () => onSelectModule('os-compiler') },
              { id: 'ontology-fusion', label: 'Ontology & Fusion Core', icon: Layers, accent: 'text-[#64d2ff]', onClick: () => onSelectModule('ontology-fusion') },
              { id: 'model-warfare', label: 'Model War & Training', icon: Swords, accent: 'text-[#ff9f0a]', onClick: () => onSelectModule('model-warfare') },
              { id: 'live-attack-map', label: 'Live Threat Theater', icon: Globe, accent: 'text-[#0a84ff]', onClick: () => onSelectModule('live-attack-map') },
              { id: 'incidents', label: `Incidents (${incidents.filter((i) => i.state !== 'closed').length})`, icon: ShieldAlert, accent: 'text-[#ff453a]', onClick: () => onSelectModule('incidents') },
              { id: 'simulate', label: 'Simulate Probe', icon: Zap, accent: 'text-[#ff9f0a]', onClick: () => { sound.play('radar'); onInjectEvent(); } },
            ].map((btn) => {
              const Icon = btn.icon;
              return (
                <button
                  key={btn.id}
                  onClick={() => {
                    sound.play('click');
                    btn.onClick();
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-[#d1d1d6] hover:text-[#f5f5f7] bg-[#161618] hover:bg-[#242428] rounded-xl border border-white/[0.08] hover:border-white/[0.18] transition-all flex items-center gap-1.5"
                >
                  <Icon className={`w-3.5 h-3.5 ${btn.accent}`} />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 6-Domain Sovereign Fusion Telemetry Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-white/[0.08]">
          {[
            { domain: 'CYBER / SOC', metric: `${incidents.length} ACTIVE CASES`, status: 'MONITORING', color: 'text-[#ff453a]', mod: 'incidents' },
            { domain: 'OS KERNEL / RUNTIME', metric: osTelemetry ? `${osTelemetry.resources.cpuUtilizationPct}% CPU · ${osTelemetry.resources.memoryUtilizationPct}% RAM` : 'HOST ACTIVE', status: 'SQLITE + WORKERS', color: 'text-[#0a84ff]', mod: 'os-compiler' },
            { domain: 'SWIFT / FEDWIRE', metric: '$5.8T RAIL SHIELD', status: 'INTERCEPTING', color: 'text-[#64d2ff]', mod: 'financial-defense' },
            { domain: 'ORBITAL QKD', metric: '48 LEO SATELLITES', status: 'QBER 0.72%', color: 'text-[#30d158]', mod: 'satellite-grid' },
            { domain: 'GOVERNANCE & ML', metric: mlOverview ? `${mlOverview.totalSamples} PUB RECS (${mlOverview.valAccPct}%)` : 'MODEL CALIBRATED', status: 'DIV 14 + ML', color: 'text-[#64d2ff]', mod: 'civic-governance' },
            { domain: 'AI SWARM MEMORY', metric: `${activeAgents.length}/${agents.length} DEFENDERS`, status: 'SELF-LEARNING', color: 'text-[#ff9f0a]', mod: 'shared-intel' },
          ].map((tile) => (
            <button
              key={tile.domain}
              onClick={() => onSelectModule(tile.mod)}
              className="text-left p-3 rounded-xl bg-[#111113] hover:bg-[#1a1a1e] border border-white/[0.07] hover:border-white/[0.16] transition-colors"
            >
              <div className="text-[10px] font-mono text-[#86868b]">{tile.domain}</div>
              <div className="text-xs font-bold text-[#f5f5f7] mt-0.5 truncate tabular-nums">{tile.metric}</div>
              <div className={`text-[10px] font-mono font-semibold mt-0.5 ${tile.color}`}>{tile.status}</div>
            </button>
          ))}
        </div>
      </div>

      {/* WEBSOCKET REAL-TIME THREAT FEED SCROLLING TICKER */}
      <RealTimeThreatFeed
        onSelectIncident={onSelectIncident}
        onSelectModule={onSelectModule}
      />

      {/* HIGH-FIDELITY EXECUTIVE SUMMARY KPI VIEW (RECHARTS) */}
      <div className="apple-card p-6 space-y-5" data-testid="executive-kpi-summary">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#0a84ff] font-semibold">
              Executive Operational Posture
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#f5f5f7] tracking-tight">
              Executive Summary KPIs · Live System Health, Containment &amp; Mitigation Efficiency
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#a1a1a6]">
            <span className="px-2.5 py-1 rounded-lg bg-[#111113] border border-white/[0.08]">
              SERVICES: <strong className="text-[#30d158]">{execKpis.healthyServicesCount}/{execKpis.totalServicesCount || 5}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#111113] border border-white/[0.08]">
              IOC BLOCKS: <strong className="text-[#0a84ff]">{execKpis.blockedIocsCount}/{execKpis.totalIocsCount}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* 3 Executive Glassmorphism KPI Containers */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
            <div className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#86868b]">
                  System Health
                </div>
                <div className="text-2xl font-bold text-[#f5f5f7] tabular-nums">
                  {execKpis.systemHealthPct}%
                </div>
                <div className="text-[11px] text-[#a1a1a6]">
                  Host services, enclave mesh &amp; memory headroom
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#30d158]/15 border border-[#30d158]/30 text-[10px] font-mono text-[#30d158]">
                  NOMINAL
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#86868b]">
                  Active Containment Progress
                </div>
                <div className="text-2xl font-bold text-[#0a84ff] tabular-nums">
                  {execKpis.containmentProgressPct}%
                </div>
                <div className="text-[11px] text-[#a1a1a6]">
                  {execKpis.containedCount} of {execKpis.totalIncidentsCount} incidents isolated or resolved
                </div>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                    execKpis.containmentProgressPct >= 80
                      ? 'bg-[#30d158]/15 border-[#30d158]/30 text-[#30d158]'
                      : 'bg-[#ff9f0a]/15 border-[#ff9f0a]/30 text-[#ff9f0a]'
                  }`}
                >
                  {execKpis.containmentProgressPct >= 80 ? 'ON TARGET' : 'IN PROGRESS'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#86868b]">
                  Threat Mitigation Efficiency
                </div>
                <div className="text-2xl font-bold text-[#64d2ff] tabular-nums">
                  {execKpis.threatMitigationEfficiencyPct}%
                </div>
                <div className="text-[11px] text-[#a1a1a6]">
                  Weighted agent precision, IoC enforcement &amp; event clearance
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0a84ff]/15 border border-[#0a84ff]/30 text-[10px] font-mono text-[#2997ff]">
                  VERIFIED
                </span>
              </div>
            </div>
          </div>

          {/* Executive KPI Trajectory Recharts Visualization */}
          <div className="lg:col-span-7 p-4 rounded-xl bg-[#111113] border border-white/[0.08] flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-xs font-mono">
              <span className="text-[#f5f5f7] font-semibold">
                EXECUTIVE KPI TRAJECTORY (HEALTH · CONTAINMENT · MITIGATION)
              </span>
              <span className="text-[10px] text-[#86868b]">LIVE TELEMETRY SERIES</span>
            </div>
            <div className="min-h-[240px] flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={execKpis.series} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="kpiBlueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0a84ff" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#0a84ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="kpiCyanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64d2ff" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#64d2ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="kpiGreenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#30d158" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#30d158" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="#86868b" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#86868b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#161618',
                      borderColor: 'rgba(255,255,255,0.14)',
                      borderRadius: '10px',
                      fontSize: '11px',
                      color: '#f5f5f7',
                    }}
                  />
                  <Area type="monotone" dataKey="systemHealth" stroke="#30d158" strokeWidth={2} fillOpacity={1} fill="url(#kpiGreenGrad)" name="System Health (%)" />
                  <Area type="monotone" dataKey="mitigationEfficiency" stroke="#64d2ff" strokeWidth={2.2} fillOpacity={1} fill="url(#kpiCyanGrad)" name="Mitigation Efficiency (%)" />
                  <Area type="monotone" dataKey="containmentProgress" stroke="#0a84ff" strokeWidth={2} strokeDasharray="4 3" fillOpacity={1} fill="url(#kpiBlueGrad)" name="Containment Progress (%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* D3.JS INTERACTIVE GLOBAL THREAT RADAR */}
      <GlobalThreatRadarD3
        incidents={incidents}
        events={events}
        nodes={nodes}
        liveAttacks={liveOps?.attacks ?? []}
        onSelectIncident={onSelectIncident}
      />

      {/* REAL-TIME 60-MINUTE ANOMALY SCORE & SPIKE DETECTION VISUALIZATION */}
      <AnomalySixtyMinChart
        currentAnomalyScore={status?.anomalyScore ?? 84}
        events={events}
      />

      {/* 30-DAY ROLLING INCIDENT FREQUENCY & SEVERITY LEVEL LINECHART (RECHARTS) */}
      <IncidentThirtyDayTrendChart
        incidents={incidents}
        onSelectIncident={onSelectIncident}
      />

      {/* Sovereign KPI Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className={`p-5 rounded-2xl apple-card transition-all ${
          (status?.defcon || 1) === 1
            ? 'border-[#ff453a]/40 bg-[#ff453a]/5 shadow-lg shadow-[#ff453a]/10'
            : 'border-white/[0.08]'
        } space-y-2`}>
          <div className="text-xs text-[#86868b] font-medium flex items-center justify-between">
            <span>Readiness Posture</span>
            <Activity className="w-4 h-4 text-[#ff453a] animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div className="pt-0.5">
            <DefConIndicator level={status?.defcon || 1} />
          </div>
          <div className="text-[11px] text-[#86868b] truncate">
            {status?.defconDescription}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl apple-card space-y-2">
          <div className="text-xs text-[#86868b] font-medium flex items-center justify-between">
            <span>Active Swarm Defenses</span>
            <Cpu className="w-4 h-4 text-[#0a84ff]" />
          </div>
          <div className="text-2xl font-bold text-[#f5f5f7] tabular-nums">
            {activeAgents.length} <span className="text-xs text-[#86868b] font-normal">/ {agents.length} AGENTS</span>
          </div>
          <div className="text-[11px] text-[#30d158]">
            99.2% Mean Precision · Heuristics Operational
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl apple-card space-y-2">
          <div className="text-xs text-[#86868b] font-medium flex items-center justify-between">
            <span>Threat Anomaly Index</span>
            <AlertTriangle className="w-4 h-4 text-[#ff9f0a]" />
          </div>
          <div className="text-2xl font-bold text-[#ff9f0a] tabular-nums">
            {status?.anomalyScore ?? 84} <span className="text-xs text-[#86868b] font-normal">/ 100</span>
          </div>
          <div className="text-[11px] text-[#86868b]">
            Weighted by unverified signature velocity
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl apple-card space-y-2">
          <div className="text-xs text-[#86868b] font-medium flex items-center justify-between">
            <span>Sovereign Enclave Fabric</span>
            <Server className="w-4 h-4 text-[#30d158]" />
          </div>
          <div className="text-2xl font-bold text-[#f5f5f7] tabular-nums">
            {nodes.length || 6} <span className="text-xs text-[#86868b] font-normal">DATACENTER NODES</span>
          </div>
          <div className="text-[11px] text-[#86868b]">
            {nodes.filter((n) => n.status === 'isolated').length} Isolated Quarantined · {nodes.filter((n) => n.status === 'healthy').length || 5} Healthy
          </div>
        </div>
      </div>

      {/* Advanced Telemetry Section: Ingress Telemetry & Anomaly Frequency + Global Threat Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Ingress Telemetry & Anomaly Frequency side-by-side (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Component 1: Ingress Telemetry */}
          <div className="apple-card p-6 rounded-2xl space-y-4 shadow-xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 text-xs text-[#f5f5f7] font-semibold">
                <Activity className="w-4 h-4 text-[#0a84ff]" />
                <span>INGRESS TELEMETRY</span>
              </div>
              <span className="text-[10px] font-mono text-[#30d158] bg-[#30d158]/10 px-2.5 py-0.5 rounded-full border border-[#30d158]/30">
                LIVE
              </span>
            </div>

            <div className="min-h-[300px] flex-1 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[
                    { time: '10:00', intercept: 120 },
                    { time: '10:05', intercept: 145 },
                    { time: '10:10', intercept: 110 },
                    { time: '10:15', intercept: 230 },
                    { time: '10:20', intercept: 310 },
                    { time: '10:25', intercept: 190 },
                    { time: '10:30', intercept: 165 },
                    { time: '10:35', intercept: 280 },
                    { time: '10:40', intercept: 340 },
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="ingressGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0a84ff" stopOpacity={0.65} />
                      <stop offset="95%" stopColor="#0a84ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#86868b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#86868b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161618', borderColor: 'rgba(255,255,255,0.14)', borderRadius: '10px', fontSize: '11px', color: '#f5f5f7' }}
                  />
                  <Area type="monotone" dataKey="intercept" stroke="#0a84ff" strokeWidth={2} fillOpacity={1} fill="url(#ingressGradient)" name="Ingress Packets (k)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Component 2: Anomaly Frequency */}
          <div className="apple-card p-6 rounded-2xl space-y-4 shadow-xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 text-xs text-[#f5f5f7] font-semibold">
                <AlertTriangle className="w-4 h-4 text-[#ff453a]" />
                <span>ANOMALY FREQUENCY</span>
              </div>
              <span className="text-[10px] font-mono text-[#ff453a] bg-[#ff453a]/10 px-2.5 py-0.5 rounded-full border border-[#ff453a]/30">
                REAL-TIME
              </span>
            </div>

            <div className="min-h-[300px] flex-1 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[
                    { time: '10:00', anomaly: 32 },
                    { time: '10:05', anomaly: 45 },
                    { time: '10:10', anomaly: 28 },
                    { time: '10:15', anomaly: 68 },
                    { time: '10:20', anomaly: 84 },
                    { time: '10:25', anomaly: 52 },
                    { time: '10:30', anomaly: 41 },
                    { time: '10:35', anomaly: 78 },
                    { time: '10:40', anomaly: 92 },
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="anomalyFreqGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff453a" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#ff453a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#86868b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#86868b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161618', borderColor: 'rgba(255,255,255,0.14)', borderRadius: '10px', fontSize: '11px', color: '#f5f5f7' }}
                  />
                  <Area type="monotone" dataKey="anomaly" stroke="#ff453a" strokeWidth={2} fillOpacity={1} fill="url(#anomalyFreqGradient)" name="Anomaly Score" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Side: Global Threat Heatmap Widget & Attack Vector Statistics (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="apple-card p-6 rounded-2xl space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 text-xs text-[#f5f5f7] font-semibold">
                <Globe className="w-4 h-4 text-[#0a84ff]" />
                <span>SOVEREIGN ENCLAVE POSTURE MATRIX</span>
              </div>
              <span className="text-[10px] font-mono text-[#86868b]">6 REGIONS</span>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { region: 'Ashburn Sovereign Enclave', lat: '39.04° N', risk: 'CRITICAL', score: 92, status: 'Active Defense' },
                { region: 'Tokyo Inference Supercluster', lat: '35.68° N', risk: 'NOMINAL', score: 18, status: 'Shielded' },
                { region: 'Frankfurt DE-CIX Interbank', lat: '51.16° N', risk: 'ELEVATED', score: 64, status: 'Scrubbing' },
                { region: 'London Financial Core', lat: '51.50° N', risk: 'NOMINAL', score: 22, status: 'Shielded' },
                { region: 'Singapore Edge Node 04', lat: '1.35° N', risk: 'MODERATE', score: 45, status: 'Monitoring' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-white/[0.07] bg-[#111113] hover:bg-[#1a1a1e] transition-all flex items-center justify-between">
                  <div>
                    <div className="text-[#f5f5f7] font-semibold text-xs">{item.region}</div>
                    <div className="text-[11px] text-[#86868b]">{item.lat} · {item.status}</div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold ${
                      item.risk === 'CRITICAL'
                        ? 'bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/30'
                        : item.risk === 'ELEVATED'
                        ? 'bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30'
                        : 'bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30'
                    }`}>
                      {item.score}% RISK
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Regional Attack Vector Statistics BarChart Widget */}
          <div className="apple-card p-6 rounded-2xl space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 text-xs text-[#f5f5f7] font-semibold">
                <Activity className="w-4 h-4 text-[#30d158]" />
                <span>ATTACK VECTOR STATISTICS BY REGION</span>
              </div>
              <span className="text-[10px] font-mono text-[#30d158] bg-[#30d158]/10 px-2.5 py-0.5 rounded-full border border-[#30d158]/30">
                AGGREGATED
              </span>
            </div>

            <div className="h-52 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { region: 'North Am', ddos: 420, sideChannel: 280, zeroDay: 190 },
                    { region: 'Europe', ddos: 310, sideChannel: 210, zeroDay: 140 },
                    { region: 'Asia-Pac', ddos: 580, sideChannel: 390, zeroDay: 260 },
                    { region: 'LatAm', ddos: 180, sideChannel: 90, zeroDay: 70 },
                    { region: 'Mid-East', ddos: 240, sideChannel: 150, zeroDay: 110 },
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <XAxis dataKey="region" stroke="#86868b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#86868b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161618', borderColor: 'rgba(255,255,255,0.14)', borderRadius: '10px', fontSize: '11px', color: '#f5f5f7' }}
                  />
                  <Bar dataKey="ddos" fill="#0a84ff" name="DDoS / Flood" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sideChannel" fill="#ff9f0a" name="Side-Channel" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="zeroDay" fill="#ff453a" name="Zero-Day" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Anomaly Prediction & Incident Forecast Graph */}
      <div className="apple-card p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2 text-xs text-[#f5f5f7] font-semibold">
            <TrendingUp className="w-4 h-4 text-[#0a84ff]" />
            <span>REAL-TIME ANOMALY PREDICTION & INCIDENT FORECAST (AI PROJECTION)</span>
          </div>
          <span className="text-[10px] font-mono text-[#2997ff] bg-[#0a84ff]/15 px-2.5 py-0.5 rounded-full border border-[#0a84ff]/30">
            PREDICTIVE HORIZON · 4H
          </span>
        </div>

        <div className="min-h-[300px] w-full pt-2">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={[
                { time: '10:00', actual: 12, forecasted: 14 },
                { time: '10:10', actual: 18, forecasted: 19 },
                { time: '10:20', actual: 24, forecasted: 22 },
                { time: '10:30', actual: 42, forecasted: 39 },
                { time: '10:40', actual: 68, forecasted: 65 },
                { time: '10:50 (Forecast)', actual: null, forecasted: 84 },
                { time: '11:00 (Forecast)', actual: null, forecasted: 110 },
                { time: '11:10 (Forecast)', actual: null, forecasted: 95 },
                { time: '11:20 (Forecast)', actual: null, forecasted: 72 },
              ]}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0a84ff" stopOpacity={0.65} />
                  <stop offset="95%" stopColor="#0a84ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5e5ce6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#5e5ce6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#86868b" fontSize={11} tickLine={false} />
              <YAxis stroke="#86868b" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#161618', borderColor: 'rgba(255,255,255,0.14)', borderRadius: '10px', fontSize: '11px', color: '#f5f5f7' }}
              />
              <Area type="monotone" dataKey="actual" stroke="#0a84ff" strokeWidth={2.5} fillOpacity={1} fill="url(#actualGradient)" name="Actual Incident Frequency" />
              <Area type="monotone" dataKey="forecasted" stroke="#5e5ce6" strokeWidth={2.5} strokeDasharray="4 4" fillOpacity={1} fill="url(#forecastGradient)" name="AI Forecasted Frequency" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Operational Log Terminal */}
      <div className="apple-card p-6 rounded-2xl space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] text-xs">
          <div className="flex items-center gap-2 text-[#f5f5f7] font-semibold">
            <Terminal className="w-4 h-4 text-[#0a84ff]" />
            <span>OPERATIONAL AUDIT TRAIL & KERNEL TRACE</span>
          </div>
          <span className="text-[11px] text-[#30d158] flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-ping" />
            <span>STREAMING LIVE</span>
          </span>
        </div>

        <div className="h-28 overflow-y-auto font-mono text-[11px] space-y-1.5 bg-[#0d0d0f] p-3.5 rounded-xl border border-white/[0.08] text-[#a1a1a6]">
          {[
            `[05:04:12 UTC] [SENTINEL-ZERO] eBPF XDP hook dropped 4,210 SYN packets from rogue ASN 49512.`,
            `[05:03:55 UTC] [AEGIS-HEURISTIC] Token entropy check isolated jailbreak embedding in inference worker #3.`,
            `[05:02:18 UTC] [VALKYRIE-ENFORCER] Merkle root validation confirmed 100% integrity on 400B weights shard.`,
            `[05:01:40 UTC] [CORTEX-CTI] BGP FlowSpec advertisement sent to DE-CIX Frankfurt clearing point.`,
            `[05:00:12 UTC] [CHRONO-AUDIT] Block #1,492,088 successfully appended to WORM optical ledger.`,
            `[04:58:30 UTC] [GHOST-COUNTER] Adversary Volt-Agent-9 successfully trapped in honeypot decoy sandbox.`,
          ].map((log, idx) => (
            <div key={idx} className="leading-relaxed">
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* SENSORY SURVEILLANCE & RECONNAISSANCE MATRIX (Apple Pro Multi-Vector Viewport) */}
      <div className="apple-card p-6 sm:p-7 rounded-2xl border border-white/[0.08] shadow-2xl space-y-5">
        {/* Radar Station Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 text-xs">
              <Camera className="w-4 h-4 text-[#0a84ff]" />
              <span className="font-semibold text-white tracking-wide">HIGH-RESOLUTION SENSORY SURVEILLANCE MATRIX</span>
              <span className="text-[#6e6e73]">·</span>
              <span className="text-[#a1a1a6]">TIER-1 SOVEREIGN SPECIFICATION</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#86868b]">
              <span>4 PERSISTENT ACTIVE FEEDS</span>
              <span aria-hidden="true">·</span>
              <span>GEODETIC RETICLE LOCK ACTIVE</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#30d158] flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#30d158] animate-ping inline-block" />
                <span>ALL FEEDS NOMINAL</span>
              </span>
            </div>
          </div>

          {/* Quick Action Commands */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <button
              type="button"
              data-testid="toggle-feed-autocycle"
              onClick={() => {
                sound.play('click');
                setIsAutoCycling((prev) => !prev);
              }}
              className={`px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 font-medium ${
                isAutoCycling
                  ? 'bg-[#30d158]/15 text-[#30d158] border-[#30d158]/35'
                  : 'bg-white/5 text-[#a1a1a6] border-white/10 hover:text-white'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAutoCycling && activeFeedId !== 'matrix' ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
              <span>{isAutoCycling ? 'Auto-Cycle: ON (6s)' : 'Auto-Cycle: Paused'}</span>
            </button>

            <button
              type="button"
              data-testid="next-surveillance-feed"
              onClick={handleAdvanceFeed}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all flex items-center gap-1.5 font-medium"
            >
              <span>Feed {currentFeedIndex + 1}/{TRACKING_FEEDS.length} →</span>
            </button>

            <button
              onClick={handleTriggerLidarSweep}
              disabled={isLidarScanning}
              className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 font-medium ${
                isLidarScanning
                  ? 'bg-[#ff9f0a]/20 text-[#ff9f0a] border border-[#ff9f0a]/40 animate-pulse'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>{isLidarScanning ? 'LIDAR SWEEPING...' : 'Execute Lidar Sweep'}</span>
            </button>

            <button
              onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
              className={`px-3.5 py-1.5 rounded-full border transition-all flex items-center gap-1.5 font-medium ${
                showBoundingBoxes
                  ? 'bg-white/20 text-white border-white/20'
                  : 'bg-white/5 text-[#86868b] border-white/10 hover:text-white'
              }`}
            >
              <Focus className="w-3.5 h-3.5" />
              <span>Motion Vectors: {showBoundingBoxes ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={handleDispatchSentry}
              className="px-3.5 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white transition-all flex items-center gap-1.5 font-semibold shadow-sm active:scale-95"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Reinforce Perimeter</span>
            </button>
          </div>
        </div>

        {/* Multi-Camera Feeds & Spectrum Controls Bar (Apple Pro Segmented Style) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs bg-white/[0.03] p-2 rounded-2xl border border-white/[0.06]">
          {/* Feed Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            {TRACKING_FEEDS.map((feed) => {
              const isActive = activeFeedId === feed.id;
              return (
                <button
                  key={feed.id}
                  onClick={() => {
                    sound.play('click');
                    setIsAutoCycling(false);
                    setActiveFeedId(feed.id);
                    setSelectedTargetId(feed.targets[0]?.id || '');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 font-medium ${
                    isActive
                      ? 'bg-white/15 text-white font-semibold shadow-sm'
                      : 'text-[#86868b] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Video className="w-3.5 h-3.5 shrink-0" />
                  <span>{feed.callsign}</span>
                </button>
              );
            })}

            <button
              onClick={() => {
                sound.play('click');
                setActiveFeedId(activeFeedId === 'matrix' ? 'sat' : 'matrix');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 font-medium ${
                activeFeedId === 'matrix'
                  ? 'bg-white/20 text-white font-semibold shadow-sm'
                  : 'text-[#86868b] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>4-Matrix Wall</span>
            </button>
          </div>

          {/* Spectrum Filter & Zoom Controls */}
          {activeFeedId !== 'matrix' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-0.5 bg-black/40 p-1 rounded-full border border-white/[0.08]">
                <span className="px-2 text-[10px] text-[#86868b] font-medium uppercase">SPECTRUM:</span>
                {(['optical', 'flir_thermal', 'night_vision', 'sar_radar'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      sound.play('click');
                      setSpectrumMode(mode);
                    }}
                    className={`px-2.5 py-1 text-[11px] rounded-full transition-all font-medium ${
                      spectrumMode === mode
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-[#86868b] hover:text-white'
                    }`}
                  >
                    {mode === 'optical'
                      ? 'Visible 4K'
                      : mode === 'flir_thermal'
                      ? 'FLIR Thermal'
                      : mode === 'night_vision'
                      ? 'NVG Green'
                      : 'SAR Radar'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-0.5 bg-black/40 p-1 rounded-full border border-white/[0.08]">
                <span className="px-2 text-[10px] text-[#86868b] font-medium uppercase">ZOOM:</span>
                {([1, 2, 4] as const).map((z) => (
                  <button
                    key={z}
                    onClick={() => {
                      sound.play('click');
                      setZoomLevel(z);
                    }}
                    className={`px-2.5 py-1 text-[11px] rounded-full transition-all font-medium ${
                      zoomLevel === z
                        ? 'bg-[#0071e3] text-white shadow-sm font-semibold'
                        : 'text-[#86868b] hover:text-white'
                    }`}
                  >
                    {z}X
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sensor Message Alert Toast */}
        {sensorMessage && (
          <div className="p-3 rounded-xl bg-[#0a84ff]/15 border border-[#0a84ff]/30 text-white text-xs font-mono flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0a84ff] animate-spin" />
              <span>{sensorMessage}</span>
            </div>
            <span className="text-[10px] text-[#86868b]">TELEMETRY SYNCED</span>
          </div>
        )}

        {/* MAIN VISUAL TRACKING VIEWPORT */}
        {activeFeedId === 'matrix' ? (
          /* 4-MATRIX CCTV QUAD VIDEO WALL */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TRACKING_FEEDS.map((feed) => (
              <div
                key={feed.id}
                onClick={() => {
                  sound.play('click');
                  setActiveFeedId(feed.id);
                  setSelectedTargetId(feed.targets[0]?.id || '');
                }}
                className="group relative aspect-[16/9] rounded-2xl overflow-hidden border border-white/10 bg-black cursor-pointer hover:border-white/30 transition-all shadow-xl"
              >
                <div className="w-full h-full pointer-events-none">
                  <LiveSurveillanceEnvironment
                    feedId={feed.id}
                    spectrumMode={spectrumMode}
                    zoomLevel={1}
                    selectedTargetId=""
                    isLidarScanning={false}
                    compact={true}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* Quad HUD Overlays */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-mono text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-ping" />
                  <span className="font-semibold text-white">{feed.callsign}</span>
                  <span className="text-[#86868b]">{feed.location.split('·')[0]}</span>
                </div>

                <div className="absolute top-2.5 right-2.5 bg-black/80 px-2.5 py-0.5 rounded-full border border-white/10 text-[9px] font-mono text-[#a1a1a6]">
                  60.0 FPS LOCKED
                </div>

                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-sans text-white bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="truncate font-medium">{feed.title}</span>
                  <span className="text-[#0a84ff] shrink-0 font-medium group-hover:underline">Focus Viewport</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* SINGLE FOCUSED LIVE TARGETING VIEWPORT */
          <div className="relative aspect-[16/9] min-h-[380px] max-h-[600px] w-full rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl">
            <LiveSurveillanceEnvironment
              feedId={currentFeed.id}
              spectrumMode={spectrumMode}
              zoomLevel={zoomLevel}
              selectedTargetId={selectedTargetId}
              isLidarScanning={isLidarScanning}
              showBoundingBoxes={showBoundingBoxes}
              onSelectTarget={handleSelectTarget}
              onNotify={(msg) => setSensorMessage(msg)}
              compact={false}
            />
          </div>
        )}

        {/* BOTTOM TARGET SELECTOR STRIP: CLICKABLE TACTICAL TILES */}
        {activeFeedId !== 'matrix' && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between text-xs text-[#86868b]">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#0a84ff]" />
                <span>INTERACTIVE SECTOR TARGET LOCK SELECTOR</span>
              </span>
              <span>CLICK TO LOCK RETICLE & TELEMETRY</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {currentFeed.targets.map((tgt) => {
                const isSelected = tgt.id === currentTarget?.id;
                return (
                  <button
                    key={tgt.id}
                    onClick={() => handleSelectTarget(tgt.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all space-y-1.5 ${
                      isSelected
                        ? 'border-[#0a84ff] bg-[#0a84ff]/15 text-white shadow-lg'
                        : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-[#a1a1a6] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className={isSelected ? 'text-white' : 'text-[#f5f5f7]'}>
                        {tgt.label}
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                          tgt.threatState === 'locked'
                            ? 'bg-[#ff453a]/20 text-[#ff453a] border border-[#ff453a]/30'
                            : tgt.threatState === 'inspected'
                            ? 'bg-[#0a84ff]/20 text-[#2997ff] border border-[#0a84ff]/30'
                            : 'bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/30'
                        }`}
                      >
                        {tgt.threatState}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#86868b] leading-snug truncate font-mono">
                      {tgt.telemetry}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PHYSICAL PERIMETER & SENSOR TELEMETRY STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-xs font-mono">
          <div className="p-2.5 rounded bg-black/40 border border-white/5 space-y-0.5">
            <div className="text-[10px] text-slate-500 uppercase">OPTICAL FIBER LINE LOSS</div>
            <div className="font-bold text-emerald-400">0.02 dB/km · NOMINAL</div>
            <div className="text-[9px] text-slate-400">32 DWDM Channels Locked</div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <div className="text-[10px] text-[#86868b] tracking-wider uppercase font-semibold">PERIMETER SEISMIC SENSORS</div>
            <div className="font-semibold text-sm text-[#30d158]">0.00 G · ZERO INTRUSION</div>
            <div className="text-[11px] text-[#86868b]">Piezoelectric Array Active</div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <div className="text-[10px] text-[#86868b] tracking-wider uppercase font-semibold">AUTONOMOUS PATROL DRONE</div>
            <div className="font-semibold text-sm text-[#0a84ff]">BATTERY 87% · ON ROUTE</div>
            <div className="text-[11px] text-[#86868b]">Flight Endurance: 4h 12m</div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <div className="text-[10px] text-[#86868b] tracking-wider uppercase font-semibold">AIRLOCK BLAST PRESSURE</div>
            <div className="font-semibold text-sm text-[#ff9f0a]">1,013 hPa · NOMINAL</div>
            <div className="text-[11px] text-[#86868b]">Level-5 Biometric Sealed</div>
          </div>
        </div>
      </div>

      {/* Main Split: Critical Incidents & Live Telemetry Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Incidents & Agent Readiness (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Critical Incidents Card */}
          <div className="apple-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-[#ff453a]" />
                <h2 className="text-sm font-semibold text-white tracking-tight">Active High-Priority Incidents</h2>
              </div>
              <button
                onClick={() => onSelectModule('incidents')}
                className="text-xs text-[#2997ff] hover:text-[#64d2ff] font-medium flex items-center gap-1 transition-colors"
              >
                <span>View All Incidents</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {incidents.slice(0, 3).map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => onSelectIncident(inc.id)}
                  className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all cursor-pointer space-y-2.5 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-white/90 group-hover:text-[#2997ff] transition-colors">
                          {inc.id}
                        </span>
                        <span className="text-white/20">·</span>
                        <span
                          className={`font-semibold text-[11px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            inc.severity === 'critical'
                              ? 'bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/30'
                              : inc.severity === 'high'
                              ? 'bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30'
                              : 'bg-[#ffd60a]/15 text-[#ffd60a] border border-[#ffd60a]/30'
                          }`}
                        >
                          {inc.severity}
                        </span>
                        <span className="text-white/20">·</span>
                        <span className="text-[#86868b] capitalize">{inc.state}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white truncate">{inc.title}</h3>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectIncident(inc.id);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] rounded-lg shrink-0 transition-all"
                    >
                      Inspect
                    </button>
                  </div>

                  <p className="text-xs text-[#a1a1a6] line-clamp-2 leading-relaxed">
                    {inc.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#86868b] font-mono">
                    <span>Assets: {inc.affectedAssets.join(', ')}</span>
                    <span className="text-white/20">·</span>
                    <span>Tactics: {inc.mitreTactics.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Defense Swarm Readiness */}
          <div className="apple-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-[#0a84ff]" />
                <h2 className="text-sm font-semibold text-white tracking-tight">Defensive Agent Swarm Status</h2>
              </div>
              <button
                onClick={() => onSelectModule('agents')}
                className="text-xs text-[#2997ff] hover:text-[#64d2ff] font-medium flex items-center gap-1 transition-colors"
              >
                <span>Manage Fleet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {agents.slice(0, 4).map((ag) => (
                <div
                  key={ag.id}
                  className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">{ag.name}</div>
                      <div className="text-[11px] text-[#86868b] font-mono">{ag.role}</div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-medium ${
                        ag.status === 'active'
                          ? 'bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30'
                          : ag.status === 'investigating'
                          ? 'bg-[#0a84ff]/15 text-[#2997ff] border border-[#0a84ff]/30'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {ag.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#86868b] font-mono tabular-nums pt-2 border-t border-white/[0.06]">
                    <span>Health: <strong className="text-white">{ag.health}%</strong></span>
                    <span>Latency: <strong className="text-white">{ag.meanResponseTimeMs}ms</strong></span>
                    <span>Precision: <strong className="text-[#30d158]">{ag.precisionRate}%</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Security Telemetry Feed (5 cols) */}
        <div className="lg:col-span-5 apple-card p-6 space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <Radio className="w-4 h-4 text-[#30d158] animate-pulse" />
              <h2 className="text-sm font-semibold text-white tracking-tight">Live Telemetry Feed</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="px-2.5 py-1 text-xs text-[#86868b] hover:text-white rounded-lg border border-white/[0.08] hover:bg-white/[0.06] transition-colors"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>

          {/* Filter segment */}
          <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06] text-xs">
            {(['all', 'live', 'simulated', 'historical'] as const).map((filterVal) => (
              <button
                key={filterVal}
                onClick={() => setTelemetryFilter(filterVal)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  telemetryFilter === filterVal
                    ? 'bg-white/15 text-white shadow-sm font-semibold'
                    : 'text-[#86868b] hover:text-white'
                }`}
              >
                {filterVal}
              </button>
            ))}
          </div>

          {/* Telemetry Stream List */}
          <div
            data-testid="command-activity-feed"
            className="flex-1 overflow-y-auto space-y-2.5 max-h-[520px] pr-1"
          >
            {filteredEvents.map((evt) => {
              const isNew = newEventIds.includes(evt.id);
              return (
                <div
                  key={evt.id}
                  data-new-event={isNew ? 'true' : 'false'}
                  className={`p-3.5 rounded-xl border transition-colors text-xs space-y-2 ${
                    isNew
                      ? 'animate-event-enter border-[#0a84ff]/45 bg-[#0a84ff]/[0.07]'
                      : 'border-white/[0.06] bg-black/30 hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded ${
                          evt.type === 'live'
                            ? 'bg-[#30d158]/15 text-[#30d158]'
                            : evt.type === 'simulated'
                            ? 'bg-[#ff9f0a]/15 text-[#ff9f0a]'
                            : 'bg-[#bf5af2]/15 text-[#bf5af2]'
                        }`}
                      >
                        {evt.type}
                      </span>
                      <span className="text-white/80 font-bold">{evt.id}</span>
                      {isNew && (
                        <span className="px-1.5 py-0.5 rounded bg-[#0a84ff]/20 border border-[#0a84ff]/40 text-[#64d2ff] text-[9px] font-bold uppercase tracking-wider">
                          NEW
                        </span>
                      )}
                    </div>
                    <span className="text-[#86868b] text-[10px] tabular-nums">
                      {evt.timestamp.slice(11, 19)} UTC
                    </span>
                  </div>

                <div className="text-white font-medium text-xs">
                  {evt.signature}
                </div>

                <div className="text-[11px] text-[#86868b] font-mono truncate">
                  <span className="text-white/40">SRC:</span> {evt.source}{' '}
                  <span className="text-white/40">→ DST:</span> {evt.destination}
                </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06] text-[11px] text-[#86868b]">
                    <span>Action: <strong className="text-white/90 font-medium">{evt.actionTaken}</strong></span>
                    {evt.mitreTechniqueId && (
                      <span className="font-mono text-[#2997ff] bg-[#0a84ff]/10 px-1.5 py-0.5 rounded text-[10px]">
                        {evt.mitreTechniqueId}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global Sovereign Intelligence & Threat Ledger */}
      <div className="apple-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <Globe className="w-5 h-5 text-[#0a84ff]" />
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight">Global Sovereign Intelligence & Threat Ledger</h2>
                <p className="text-xs text-[#86868b]">Real-time worldwide telemetry across 48 sovereign enclaves, quantum QKD links, and frontier model nodes.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#30d158]/10 border border-[#30d158]/20 text-[#30d158] text-xs font-mono font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#30d158] animate-ping" />
                48/48 Enclaves Secure
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'Ashburn Supercluster Alpha',
                region: 'Virginia, USA',
                nodes: '1,024x B200',
                model: 'Titan-Defense-70B',
                qkd: 'QKD Coherent (99.998%)',
                status: 'Nominal',
                hash: 'sha256:8f3d19bc2a4e98f7',
              },
              {
                title: 'Tokyo Sovereign Hub Omega',
                region: 'Tokyo, Japan',
                nodes: '2,048x H100',
                model: 'Frontier-Sovereign-400B',
                qkd: 'QKD Coherent (99.999%)',
                status: 'Nominal',
                hash: 'sha256:4a991823bc0192e1',
              },
              {
                title: 'Frankfurt Interbank Enclave',
                region: 'Frankfurt, Germany',
                nodes: '512x H100',
                model: 'Valkyrie-Zero-32B',
                qkd: 'QKD Coherent (99.991%)',
                status: 'Nominal',
                hash: 'sha256:77ce190283a0192e',
              },
              {
                title: 'Luleå Subterranean Hydro',
                region: 'Luleå, Sweden',
                nodes: '256x H200 NVL',
                model: 'Chimera-Quantum-14B',
                qkd: 'QKD Coherent (100.0%)',
                status: 'Nominal',
                hash: 'sha256:99bf10283a0192e8',
              },
            ].map((enclave, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-white/[0.08] bg-black/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{enclave.title}</span>
                  <span className="text-[10px] font-mono text-[#30d158] bg-[#30d158]/10 px-2 py-0.5 rounded border border-[#30d158]/20">
                    {enclave.status}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-[#86868b] font-mono">
                  <div>Region: <span className="text-white/80">{enclave.region}</span></div>
                  <div>Compute: <span className="text-white/80">{enclave.nodes}</span></div>
                  <div>Model Active: <span className="text-white/80">{enclave.model}</span></div>
                  <div>Quantum Link: <span className="text-[#2997ff]">{enclave.qkd}</span></div>
                  <div className="truncate text-[10px] text-white/40 pt-1">Hash: {enclave.hash}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* INTER-ENTERPRISE THREAT WARNING & VIRTUAL SOLDIERS SWARM DEPLOYMENT */}
        <div id="enterprise-threat-defense" className="pt-2">
          <EnterpriseThreatWarningSoldiers />
        </div>
      </div>
  );
};
