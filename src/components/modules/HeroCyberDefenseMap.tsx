import React, { useEffect, useRef, useState } from 'react';
import { Shield, Zap, Radio, Globe, Layers, Eye, RefreshCw, Crosshair, Target } from 'lucide-react';
import { sound } from '../../core/sound-fx';

interface MapNode {
  id: string;
  name: string;
  callsign: string;
  lat: number;
  lng: number;
  type: 'sovereign_vault' | 'financial_core' | 'adversary_c2' | 'satellite_relay' | 'ixp_transit';
  status: 'defended' | 'engaged' | 'nominal' | 'attacking';
  shieldIntegrity: number; // 0 - 100%
  description: string;
  labelAlign: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  labelOffset?: [number, number];
}

interface AttackArc {
  id: string;
  fromId: string;
  toId: string;
  type: 'attack' | 'counter' | 'sync';
  color: string;
  progress: number;
  speed: number;
  label: string;
  packetRate: string;
}

// Global cyber defense enclaves, financial clearing cores, and adversary clusters
const CYBER_NODES: MapNode[] = [
  {
    id: 'ashburn-vault',
    name: 'Sovereign 400B Vault Alpha',
    callsign: 'ASHBURN-VAULT',
    lat: 39.04,
    lng: -77.48,
    type: 'sovereign_vault',
    status: 'engaged',
    shieldIntegrity: 82,
    description: 'Ashburn Sovereign Enclave · 128k H100 Encrypted Fabric',
    labelAlign: 'bottom-right',
    labelOffset: [16, 16],
  },
  {
    id: 'apple-hq',
    name: 'Apple Park Cupertino',
    callsign: 'AAPL-PARK',
    lat: 37.33,
    lng: -122.03,
    type: 'sovereign_vault',
    status: 'engaged',
    shieldIntegrity: 89,
    description: 'Cupertino, CA · iCloud Edge TLS 1.3 & Enclave Security Mesh',
    labelAlign: 'bottom-left',
    labelOffset: [-26, 26],
  },
  {
    id: 'microsoft-hq',
    name: 'Microsoft Redmond',
    callsign: 'MSFT-REDMOND',
    lat: 47.67,
    lng: -122.12,
    type: 'sovereign_vault',
    status: 'defended',
    shieldIntegrity: 96,
    description: 'Redmond, WA · Azure Cloud & Sovereign AI Fabric',
    labelAlign: 'top-right',
    labelOffset: [18, -22],
  },
  {
    id: 'google-hq',
    name: 'Googleplex HQ',
    callsign: 'GOOG-PLEX',
    lat: 37.42,
    lng: -122.08,
    type: 'sovereign_vault',
    status: 'engaged',
    shieldIntegrity: 91,
    description: 'Mountain View, CA · Gemini TPU Cluster & Global Edge',
    labelAlign: 'top-left',
    labelOffset: [-26, -4],
  },
  {
    id: 'nvidia-hq',
    name: 'NVIDIA Santa Clara',
    callsign: 'NVDA-HQ',
    lat: 37.36,
    lng: -121.96,
    type: 'sovereign_vault',
    status: 'engaged',
    shieldIntegrity: 84,
    description: 'Santa Clara, CA · CUDA Mesh & AI Accelerator Foundry',
    labelAlign: 'bottom-right',
    labelOffset: [18, 30],
  },
  {
    id: 'amazon-hq',
    name: 'Amazon AWS Seattle',
    callsign: 'AMZN-AWS',
    lat: 47.60,
    lng: -122.33,
    type: 'financial_core',
    status: 'defended',
    shieldIntegrity: 94,
    description: 'Seattle, WA · AWS Global Cloud & DynamoDB Clearinghouse',
    labelAlign: 'top-left',
    labelOffset: [-20, -18],
  },
  {
    id: 'tsmc-fab',
    name: 'TSMC Hsinchu Fab 18',
    callsign: 'TSMC-FAB18',
    lat: 24.78,
    lng: 120.99,
    type: 'sovereign_vault',
    status: 'engaged',
    shieldIntegrity: 87,
    description: 'Hsinchu, Taiwan · 3nm Advanced Semiconductor Lithography Fab',
    labelAlign: 'top-left',
    labelOffset: [-16, -14],
  },
  {
    id: 'panama-proxy',
    name: 'Panama Bulletproof Proxy',
    callsign: 'PANAMA-C2',
    lat: 8.98,
    lng: -79.51,
    type: 'ixp_transit',
    status: 'attacking',
    shieldIntegrity: 0,
    description: 'Flash-Drain Onion BGP Proxy & Relay',
    labelAlign: 'bottom-left',
    labelOffset: [-12, 16],
  },
  {
    id: 'europe-core',
    name: 'European Sovereign Core (DE-CIX & BoE)',
    callsign: 'EU-CORE-IXP',
    lat: 51.2,
    lng: 4.8,
    type: 'financial_core',
    status: 'defended',
    shieldIntegrity: 94,
    description: 'London-Frankfurt-Brussels Interbank Clearing Mesh',
    labelAlign: 'top-right',
    labelOffset: [10, -28],
  },
  {
    id: 'transnistria-c2',
    name: 'DarkSwarm Autonomous C2',
    callsign: 'DARKSWARM-C2',
    lat: 47.2,
    lng: 29.8,
    type: 'adversary_c2',
    status: 'attacking',
    shieldIntegrity: 0,
    description: 'Transnistrian Rogue Swarm Command Infrastructure',
    labelAlign: 'bottom-left',
    labelOffset: [-14, 16],
  },
  {
    id: 'tokyo-tfx',
    name: 'Tokyo TFX Liquidity Core',
    callsign: 'TOKYO-TFX',
    lat: 35.68,
    lng: 139.69,
    type: 'financial_core',
    status: 'defended',
    shieldIntegrity: 98,
    description: 'Otemachi High-Frequency Settlement Ledger',
    labelAlign: 'top-left',
    labelOffset: [-10, -14],
  },
  {
    id: 'singapore-mas',
    name: 'Monetary Authority Sovereign Vault',
    callsign: 'SINGAPORE-MAS',
    lat: 1.35,
    lng: 103.81,
    type: 'sovereign_vault',
    status: 'nominal',
    shieldIntegrity: 96,
    description: 'Straits Digital Reserve & Token Gateway',
    labelAlign: 'bottom-left',
    labelOffset: [-14, 18],
  },
  {
    id: 'satellite-c2',
    name: 'Volt-Agent-9 Satellite Relay',
    callsign: 'VOLT-SAT-9',
    lat: 14.0,
    lng: 118.0,
    type: 'adversary_c2',
    status: 'attacking',
    shieldIntegrity: 0,
    description: 'Orbital Maritime Uplink Adversary Cluster',
    labelAlign: 'bottom-right',
    labelOffset: [16, 16],
  },
  {
    id: 'sydney-enclave',
    name: 'Sydney Sovereign Data Enclave',
    callsign: 'SYDNEY-VAULT',
    lat: -33.86,
    lng: 151.2,
    type: 'sovereign_vault',
    status: 'nominal',
    shieldIntegrity: 100,
    description: 'APAC South Sovereign Mirror & Backup Ledger',
    labelAlign: 'top-left',
    labelOffset: [-12, -14],
  },
];

// High-priority attack, counter-defense, and inter-enclave sync streams
const INITIAL_ARCS: AttackArc[] = [
  {
    id: 'arc-1',
    fromId: 'transnistria-c2',
    toId: 'ashburn-vault',
    type: 'attack',
    color: '#ef4444',
    progress: 0.35,
    speed: 0.0035,
    label: 'DarkSwarm Exploit Egress Flood',
    packetRate: '920 MB/s',
  },
  {
    id: 'arc-2',
    fromId: 'satellite-c2',
    toId: 'nvidia-hq',
    type: 'attack',
    color: '#f43f5e',
    progress: 0.65,
    speed: 0.0028,
    label: 'Side-Channel Weights Extraction',
    packetRate: '800 Gbps',
  },
  {
    id: 'arc-3',
    fromId: 'ashburn-vault',
    toId: 'transnistria-c2',
    type: 'counter',
    color: '#06b6d4',
    progress: 0.85,
    speed: 0.0045,
    label: 'Sentinel-Zero eBPF Ingress Sever',
    packetRate: '100% Intercepted',
  },
  {
    id: 'arc-4',
    fromId: 'apple-hq',
    toId: 'satellite-c2',
    type: 'counter',
    color: '#22d3ee',
    progress: 0.15,
    speed: 0.004,
    label: 'Zero-Trust Enclave Isolation',
    packetRate: 'Null-Routed',
  },
  {
    id: 'arc-5',
    fromId: 'ashburn-vault',
    toId: 'europe-core',
    type: 'sync',
    color: '#10b981',
    progress: 0.5,
    speed: 0.002,
    label: 'Transatlantic Quantum Encrypted Sync',
    packetRate: '40 Gbps',
  },
  {
    id: 'arc-6',
    fromId: 'europe-core',
    toId: 'tokyo-tfx',
    type: 'sync',
    color: '#10b981',
    progress: 0.72,
    speed: 0.0018,
    label: 'Trans-Eurasian Interbank Heartbeat',
    packetRate: 'Nominal',
  },
  {
    id: 'arc-7',
    fromId: 'tokyo-tfx',
    toId: 'singapore-mas',
    type: 'sync',
    color: '#38bdf8',
    progress: 0.42,
    speed: 0.003,
    label: 'Pan-Asian Quantum Ledger Ring',
    packetRate: '99.999% SLA',
  },
  {
    id: 'arc-8',
    fromId: 'singapore-mas',
    toId: 'sydney-enclave',
    type: 'sync',
    color: '#38bdf8',
    progress: 0.22,
    speed: 0.0025,
    label: 'Oceanic Mirror Backup',
    packetRate: 'Active',
  },
];

// High-fidelity continental coastline coordinates (lng, lat) for military vector projection
const CONTINENT_PATHS: [number, number][][] = [
  // North America
  [
    [-168, 66], [-160, 58], [-140, 60], [-130, 52], [-124, 48], [-124, 38],
    [-118, 32], [-110, 24], [-105, 20], [-97, 26], [-90, 30], [-82, 25],
    [-80, 27], [-81, 32], [-75, 36], [-70, 42], [-65, 45], [-60, 47],
    [-65, 52], [-60, 56], [-65, 62], [-85, 66], [-95, 69], [-120, 70],
    [-140, 70], [-160, 71], [-168, 66],
  ],
  // South America
  [
    [-77, 8], [-72, 11], [-60, 10], [-50, 0], [-35, -5], [-35, -12],
    [-40, -22], [-48, -28], [-53, -33], [-60, -40], [-66, -45], [-65, -54],
    [-74, -52], [-74, -44], [-71, -30], [-76, -18], [-80, -5], [-77, 8],
  ],
  // Europe
  [
    [-9, 38], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54],
    [5, 58], [10, 60], [15, 66], [25, 71], [30, 68], [32, 60],
    [28, 55], [20, 54], [14, 53], [12, 45], [16, 40], [24, 38],
    [28, 41], [36, 42], [38, 46], [30, 46], [22, 44], [14, 44],
    [4, 43], [0, 39], [-5, 36], [-9, 38],
  ],
  // Great Britain & Ireland
  [
    [-5, 50], [1, 51], [0, 53], [-3, 58], [-6, 56], [-4, 52], [-5, 50],
  ],
  // Africa
  [
    [-17, 15], [-17, 21], [-12, 28], [-5, 36], [10, 37], [20, 32],
    [32, 31], [34, 28], [43, 12], [51, 10], [42, -2], [40, -15],
    [35, -25], [30, -32], [26, -34], [18, -34], [14, -23], [12, -10],
    [9, 4], [3, 6], [-5, 5], [-12, 8], [-17, 15],
  ],
  // Asia
  [
    [32, 31], [35, 34], [40, 38], [50, 40], [52, 25], [60, 25],
    [68, 23], [72, 18], [80, 13], [80, 8], [82, 15], [88, 22],
    [92, 21], [98, 12], [103, 1], [105, 10], [108, 18], [118, 24],
    [122, 30], [120, 38], [128, 38], [130, 42], [132, 34], [140, 36],
    [142, 44], [140, 52], [144, 60], [150, 58], [160, 56], [170, 60],
    [180, 65], [170, 68], [150, 72], [125, 73], [105, 77], [85, 73],
    [70, 70], [60, 68], [55, 60], [45, 50], [40, 42], [32, 31],
  ],
  // Japan
  [
    [130, 32], [133, 34], [139, 35], [141, 41], [142, 44], [141, 41], [135, 35], [130, 32],
  ],
  // Australia
  [
    [114, -22], [115, -34], [120, -35], [135, -35], [145, -39], [150, -36],
    [153, -28], [150, -22], [145, -15], [142, -11], [136, -12], [130, -15],
    [125, -14], [118, -20], [114, -22],
  ],
];

interface HeroCyberDefenseMapProps {
  onNodeSelect?: (node: MapNode) => void;
}

export const HeroCyberDefenseMap: React.FC<HeroCyberDefenseMapProps> = ({ onNodeSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeLayer, setActiveLayer] = useState<'all' | 'attacks' | 'defense'>('all');
  const [hoveredNode, setHoveredNode] = useState<MapNode | null>(null);
  const [pingRipple, setPingRipple] = useState<{ x: number; y: number; r: number; alpha: number } | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Helper: Equirectangular projection
  const project = (lng: number, lat: number, width: number, height: number) => {
    const paddingX = width * 0.04;
    const paddingY = height * 0.08;
    const innerW = width - paddingX * 2;
    const innerH = height - paddingY * 2;

    const x = paddingX + ((lng + 180) / 360) * innerW;
    const y = paddingY + ((90 - lat) / 180) * innerH;
    return { x, y };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let radarAngle = 0;
    const arcs = [...INITIAL_ARCS];

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const radarCenterX = width * 0.5;
      const radarCenterY = height * 0.48;

      ctx.clearRect(0, 0, width, height);

      // 1. Subtle Coordinates Graticule Grid
      ctx.save();
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 8]);

      for (let lng = -180; lng <= 180; lng += 45) {
        const { x } = project(lng, 0, width, height);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let lat = -60; lat <= 80; lat += 30) {
        const { y } = project(0, lat, width, height);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // 2. High-Precision Vector Continental Outlines
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1.2;

      CONTINENT_PATHS.forEach((path) => {
        ctx.beginPath();
        path.forEach((pt, idx) => {
          const { x, y } = project(pt[0], pt[1], width, height);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();

      // 3. Clean Tactical Geodesic Grid Indicator
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 113, 227, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.48, 120, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 4. Animated Cyber Attack & Counter Defense Trajectory Arcs
      arcs.forEach((arc) => {
        if (activeLayer === 'attacks' && arc.type !== 'attack') return;
        if (activeLayer === 'defense' && arc.type === 'attack') return;

        const fromNode = CYBER_NODES.find((n) => n.id === arc.fromId);
        const toNode = CYBER_NODES.find((n) => n.id === arc.toId);
        if (!fromNode || !toNode) return;

        const start = project(fromNode.lng, fromNode.lat, width, height);
        const end = project(toNode.lng, toNode.lat, width, height);

        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const curvature = Math.min(80, Math.max(25, dist * 0.22));
        const controlX = midX;
        const controlY = midY - curvature;

        // Base track
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(controlX, controlY, end.x, end.y);
        ctx.strokeStyle =
          arc.type === 'attack'
            ? 'rgba(239, 68, 68, 0.25)'
            : arc.type === 'counter'
            ? 'rgba(6, 182, 212, 0.35)'
            : 'rgba(16, 185, 129, 0.25)';
        ctx.lineWidth = arc.type === 'counter' ? 2 : 1.2;
        ctx.stroke();

        // Advance particle
        if (!isPaused) {
          arc.progress += arc.speed;
          if (arc.progress > 1) arc.progress = 0;
        }

        const t = arc.progress;
        const px =
          (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * controlX + t * t * end.x;
        const py =
          (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * controlY + t * t * end.y;

        // Particle head
        ctx.beginPath();
        ctx.arc(px, py, arc.type === 'attack' ? 3.5 : 4, 0, Math.PI * 2);
        ctx.fillStyle = arc.color;
        ctx.shadowColor = arc.color;
        ctx.shadowBlur = 10;
        ctx.fill();

        // Tail
        const trailT = Math.max(0, t - 0.08);
        const tx =
          (1 - trailT) * (1 - trailT) * start.x +
          2 * (1 - trailT) * trailT * controlX +
          trailT * trailT * end.x;
        const ty =
          (1 - trailT) * (1 - trailT) * start.y +
          2 * (1 - trailT) * trailT * controlY +
          trailT * trailT * end.y;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = arc.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      });

      // 5. Draw Sovereign Enclaves & Adversary Nodes (Zero-Collision Typography)
      CYBER_NODES.forEach((node) => {
        const { x, y } = project(node.lng, node.lat, width, height);
        const isHovered = hoveredNode?.id === node.id;

        ctx.save();

        // Radar sweep intercept phosphor calculation
        const nodeAngle = Math.atan2(y - radarCenterY, x - radarCenterX);
        let angleDiff = (radarAngle - nodeAngle) % (Math.PI * 2);
        if (angleDiff < 0) angleDiff += Math.PI * 2;
        if (angleDiff < 0.5) {
          const phosphor = 1 - angleDiff / 0.5;
          ctx.beginPath();
          ctx.arc(x, y, 6 + phosphor * 10, 0, Math.PI * 2);
          ctx.strokeStyle =
            node.type === 'adversary_c2'
              ? `rgba(239, 68, 68, ${phosphor * 0.8})`
              : `rgba(34, 211, 238, ${phosphor * 0.8})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Outer pulse ring
        const pulsePhase = (Date.now() % 2400) / 2400;
        const ringRadius = 5 + pulsePhase * 12;
        const ringAlpha = (1 - pulsePhase) * 0.6;

        ctx.beginPath();
        ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle =
          node.type === 'adversary_c2'
            ? `rgba(239, 68, 68, ${ringAlpha})`
            : node.status === 'engaged'
            ? `rgba(245, 158, 11, ${ringAlpha})`
            : `rgba(6, 182, 212, ${ringAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Core dot
        ctx.beginPath();
        ctx.arc(x, y, isHovered ? 5.5 : 4, 0, Math.PI * 2);
        ctx.fillStyle =
          node.type === 'adversary_c2'
            ? '#ef4444'
            : node.status === 'engaged'
            ? '#f59e0b'
            : '#06b6d4';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fill();

        // Corner Target Brackets [ ]
        const bSize = 6;
        ctx.strokeStyle =
          node.type === 'adversary_c2' ? 'rgba(239, 68, 68, 0.7)' : 'rgba(34, 211, 238, 0.7)';
        ctx.lineWidth = 1;

        // Top-left bracket
        ctx.beginPath();
        ctx.moveTo(x - bSize - 2, y - bSize + 2);
        ctx.lineTo(x - bSize - 2, y - bSize - 2);
        ctx.lineTo(x - bSize + 2, y - bSize - 2);
        ctx.stroke();

        // Bottom-right bracket
        ctx.beginPath();
        ctx.moveTo(x + bSize + 2, y + bSize - 2);
        ctx.lineTo(x + bSize + 2, y + bSize + 2);
        ctx.lineTo(x + bSize - 2, y + bSize + 2);
        ctx.stroke();

        // Clean Non-Colliding Label Offset with Leader Lines
        let lx = x + 10;
        let ly = y - 4;
        let align: CanvasTextAlign = 'left';

        if (node.labelOffset) {
          lx = x + node.labelOffset[0];
          ly = y + node.labelOffset[1];
          align = node.labelOffset[0] < 0 ? 'right' : 'left';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(lx, ly - 3);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.lineWidth = 0.9;
          ctx.stroke();
        } else if (node.labelAlign === 'top-left') {
          lx = x - 10;
          ly = y - 8;
          align = 'right';
        } else if (node.labelAlign === 'top-right') {
          lx = x + 10;
          ly = y - 8;
          align = 'left';
        } else if (node.labelAlign === 'bottom-left') {
          lx = x - 10;
          ly = y + 12;
          align = 'right';
        } else if (node.labelAlign === 'bottom-right') {
          lx = x + 10;
          ly = y + 12;
          align = 'left';
        }

        ctx.textAlign = align;

        // Primary Name
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(241, 245, 249, 0.9)';
        ctx.fillText(node.name, lx, ly);

        // Sub-badge: Shield / Adversary
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle =
          node.type === 'adversary_c2'
            ? '#ef4444'
            : node.status === 'engaged'
            ? '#f59e0b'
            : '#22d3ee';
        ctx.fillText(
          node.type === 'adversary_c2'
            ? 'ADVERSARY C2 NODE'
            : `${node.shieldIntegrity}% SHIELD INTEGRITY`,
          lx,
          ly + (node.labelAlign.startsWith('top') ? -11 : 11)
        );

        ctx.restore();
      });

      // 6. Interactive Defense Ping Wave
      if (pingRipple) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pingRipple.x, pingRipple.y, pingRipple.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(6, 182, 212, ${pingRipple.alpha})`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeLayer, hoveredNode, isPaused, pingRipple]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    sound.play('radar');

    const clicked = CYBER_NODES.find((node) => {
      const { x: nx, y: ny } = project(node.lng, node.lat, rect.width, rect.height);
      const dist = Math.hypot(nx - x, ny - y);
      return dist < 22;
    });

    if (clicked && onNodeSelect) {
      sound.play('click');
      onNodeSelect(clicked);
    }

    let r = 5;
    let alpha = 0.8;
    const interval = setInterval(() => {
      r += 6;
      alpha -= 0.05;
      if (alpha <= 0) {
        clearInterval(interval);
        setPingRipple(null);
      } else {
        setPingRipple({ x, y, r, alpha });
      }
    }, 24);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const matched = CYBER_NODES.find((node) => {
      const { x: nx, y: ny } = project(node.lng, node.lat, rect.width, rect.height);
      const dist = Math.hypot(nx - x, ny - y);
      return dist < 22;
    });

    setHoveredNode(matched || null);
  };

  return (
    <div className="relative w-full h-[460px] bg-[#080a0f] rounded-lg border border-white/[0.08] overflow-hidden shadow-2xl">
      {/* HTML5 Canvas Vector Radar Map */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Top Telemetry HUD Bar */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-auto text-xs z-20">
        <div className="bg-[#0b0e14]/90 backdrop-blur-xl px-3 py-1.5 rounded-md border border-white/[0.08] flex items-center gap-2.5 text-[#a1a1a6] shadow-lg font-mono text-[11px]">
          <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-ping" />
          <span className="text-white font-semibold tracking-wider">AUTONOMOUS RADAR MESH</span>
          <span className="text-[#525866]">·</span>
          <span className="text-[#10b981] font-medium">360° GEODESIC SWEEP</span>
          <span className="text-[#525866]">·</span>
          <span className="tabular-nums">ARCS: 8 ACTIVE</span>
          <span className="text-[#525866]">·</span>
          <span className="tabular-nums text-white">4.8M PKTS/S</span>
        </div>

        {/* Sovereign Segmented Layer Filters & Controls */}
        <div className="flex items-center gap-2">
          <div className="bg-[#0b0e14]/90 backdrop-blur-xl p-1 rounded-md border border-white/[0.08] flex items-center gap-0.5">
            <button
              onClick={() => setActiveLayer('all')}
              className={`px-3 py-1 rounded text-[11px] font-mono font-medium transition-all ${
                activeLayer === 'all'
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-400/25 shadow-sm'
                  : 'text-[#86868b] hover:text-white border border-transparent'
              }`}
            >
              All Signals
            </button>
            <button
              onClick={() => setActiveLayer('attacks')}
              className={`px-3 py-1 rounded text-[11px] font-mono font-medium transition-all ${
                activeLayer === 'attacks'
                  ? 'bg-red-500/15 text-red-400 border border-red-500/25 font-semibold shadow-sm'
                  : 'text-[#86868b] hover:text-white border border-transparent'
              }`}
            >
              Adversary Arcs
            </button>
            <button
              onClick={() => setActiveLayer('defense')}
              className={`px-3 py-1 rounded text-[11px] font-mono font-medium transition-all ${
                activeLayer === 'defense'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-semibold shadow-sm'
                  : 'text-[#86868b] hover:text-white border border-transparent'
              }`}
            >
              Sovereign Shields
            </button>
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="bg-[#0b0e14]/90 hover:bg-[#141822] text-[#a1a1a6] hover:text-white px-3 py-1.5 rounded-md border border-white/[0.08] text-[11px] font-mono font-medium transition-all active:scale-95"
          >
            {isPaused ? 'Resume' : 'Freeze'}
          </button>
        </div>
      </div>

      {/* Hovered Node Tooltip HUD */}
      {hoveredNode && (
        <div className="absolute bottom-3 right-3 bg-[#0b0e14]/95 backdrop-blur-xl p-3.5 rounded-lg border border-white/[0.12] text-xs shadow-2xl space-y-1.5 pointer-events-none max-w-sm animate-fadeIn z-30">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-1.5">
            <span className="font-semibold text-white text-xs truncate">{hoveredNode.name}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider ${
                hoveredNode.type === 'adversary_c2'
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
              }`}
            >
              {hoveredNode.type.replace('_', ' ')}
            </span>
          </div>
          <div className="text-[11px] text-[#a1a1a6] leading-relaxed">{hoveredNode.description}</div>
          <div className="flex justify-between text-[10px] font-mono text-[#86868b] pt-1 border-t border-white/5">
            <span>COORDS: {hoveredNode.lat.toFixed(2)}°, {hoveredNode.lng.toFixed(2)}°</span>
            <span className="text-[#10b981] font-semibold">SHIELD: {hoveredNode.shieldIntegrity}%</span>
          </div>
        </div>
      )}

      {/* Bottom Coordinates Status HUD */}
      <div className="absolute bottom-3 left-3 text-[10px] font-mono text-[#717786] bg-[#0b0e14]/85 backdrop-blur-md px-3 py-1 rounded-md border border-white/[0.06] pointer-events-none tracking-wider">
        GEODESIC PROJECTION · EQUICYLINDER 360° MESH
      </div>
    </div>
  );
};
