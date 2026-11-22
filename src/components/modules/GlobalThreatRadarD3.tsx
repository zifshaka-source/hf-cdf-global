import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import {
  Globe,
  Layers,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  ShieldAlert,
  Crosshair,
  Zap,
  Compass,
  Radio,
  ArrowUpRight,
  ShieldCheck,
  Flame,
  Activity,
  LocateFixed,
} from 'lucide-react';
import {
  Incident,
  LiveOngoingAttack,
  NetworkNode,
  SecurityEvent,
  ThreatRadarArc,
  ThreatRadarCluster,
} from '../../core/types';
import { buildThreatRadarGeoClusters } from '../../core/os-compiler-utils';

interface GlobalThreatRadarD3Props {
  incidents: Incident[];
  events: SecurityEvent[];
  nodes?: NetworkNode[];
  liveAttacks?: LiveOngoingAttack[];
  onSelectIncident?: (incidentId: string) => void;
  onSelectVector?: (vectorId: string) => void;
}

export const GlobalThreatRadarD3: React.FC<GlobalThreatRadarD3Props> = ({
  incidents,
  events,
  nodes = [],
  liveAttacks = [],
  onSelectIncident,
  onSelectVector,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Projection & view configuration state
  const [projectionMode, setProjectionMode] = useState<'3d' | '2d'>('3d');
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeTab, setActiveTab] = useState<'vectors' | 'clusters'>('vectors');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'high'>('all');
  const [selectedVectorId, setSelectedVectorId] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [zoomFactor, setZoomFactor] = useState(1);

  // Mutable refs for high-frequency animation & interaction without React re-render churn
  const rotationRef = useRef<[number, number, number]>([-25, -20, 0]); // [yaw, pitch, roll]
  const isDraggingRef = useRef(false);
  const animFrameIdRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);

  // D3 DOM references updated dynamically
  const d3HandlesRef = useRef<{
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null;
    projection: d3.GeoProjection | null;
    path: d3.GeoPath<any, d3.GeoPermissibleObjects> | null;
    renderFrame: () => void;
  }>({
    svg: null,
    projection: null,
    path: null,
    renderFrame: () => {},
  });

  // Synthesize geo clusters & attack vector arcs from live telemetry
  const { clusters, arcs } = useMemo(() => {
    return buildThreatRadarGeoClusters({
      incidents,
      events,
      nodes,
      liveAttacks,
    });
  }, [incidents, events, nodes, liveAttacks]);

  // Filtered arcs based on user selection
  const filteredArcs = useMemo(() => {
    if (filterSeverity === 'all') return arcs;
    return arcs.filter((a) => a.severity === filterSeverity);
  }, [arcs, filterSeverity]);

  // Selected vector object
  const selectedVector = useMemo(() => {
    if (selectedVectorId) {
      const match = arcs.find((a) => a.id === selectedVectorId);
      if (match) return match;
    }
    return arcs[0] || null;
  }, [arcs, selectedVectorId]);

  // Selected cluster object
  const selectedCluster = useMemo(() => {
    if (selectedClusterId) {
      const match = clusters.find((c) => c.id === selectedClusterId);
      if (match) return match;
    }
    return clusters[0] || null;
  }, [clusters, selectedClusterId]);

  // Auto-select first active vector on mount
  useEffect(() => {
    if (!selectedVectorId && arcs.length > 0) {
      setSelectedVectorId(arcs[0].id);
    }
    if (!selectedClusterId && clusters.length > 0) {
      setSelectedClusterId(clusters[0].id);
    }
  }, [arcs, clusters, selectedVectorId, selectedClusterId]);

  // Smoothly center the globe on a given coordinate pair [lng, lat]
  const focusOnCoordinates = (lng: number, lat: number) => {
    if (projectionMode !== '3d') return;
    const startYaw = rotationRef.current[0];
    const startPitch = rotationRef.current[1];
    const targetYaw = -lng;
    const targetPitch = Math.max(-75, Math.min(75, -lat));

    // Calculate shortest yaw rotation path across circular boundary
    let deltaYaw = (targetYaw - startYaw) % 360;
    if (deltaYaw > 180) deltaYaw -= 360;
    if (deltaYaw < -180) deltaYaw += 360;

    const startTime = performance.now();
    const duration = 750; // ms

    if (transitionTimerRef.current) {
      cancelAnimationFrame(transitionTimerRef.current);
    }

    const animateTransition = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Apple easeOutCubic curve
      const ease = 1 - Math.pow(1 - progress, 3);

      rotationRef.current = [
        startYaw + deltaYaw * ease,
        startPitch + (targetPitch - startPitch) * ease,
        0,
      ];

      d3HandlesRef.current.renderFrame();

      if (progress < 1) {
        transitionTimerRef.current = requestAnimationFrame(animateTransition);
      } else {
        transitionTimerRef.current = null;
      }
    };

    transitionTimerRef.current = requestAnimationFrame(animateTransition);
  };

  // Focus on selected attack vector midpoint
  const handleFocusVector = (arc: ThreatRadarArc) => {
    setSelectedVectorId(arc.id);
    setActiveTab('vectors');
    if (onSelectVector) onSelectVector(arc.id);

    const midLng = (arc.sourceCoords[0] + arc.targetCoords[0]) / 2;
    const midLat = (arc.sourceCoords[1] + arc.targetCoords[1]) / 2;
    focusOnCoordinates(midLng, midLat);
  };

  // Focus on selected cluster
  const handleFocusCluster = (cluster: ThreatRadarCluster) => {
    setSelectedClusterId(cluster.id);
    setActiveTab('clusters');
    focusOnCoordinates(cluster.lng, cluster.lat);
  };

  // Main D3 initialization and rendering pipeline
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = 960;
    const height = 450;
    const globeRadius = 175 * zoomFactor;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    // Definitions: Gradients, Filters, Markers
    const defs = svg.append('defs');

    // Deep space backdrop vignette
    const spaceGrad = defs
      .append('radialGradient')
      .attr('id', 'd3-radar-space-bg')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '70%');
    spaceGrad.append('stop').attr('offset', '0%').attr('stop-color', '#121217');
    spaceGrad.append('stop').attr('offset', '65%').attr('stop-color', '#09090b');
    spaceGrad.append('stop').attr('offset', '100%').attr('stop-color', '#050507');

    // 3D Sphere ocean fill with luminous atmospheric limb shading
    const sphereGrad = defs
      .append('radialGradient')
      .attr('id', 'd3-globe-shading')
      .attr('cx', '35%')
      .attr('cy', '35%')
      .attr('r', '70%');
    sphereGrad.append('stop').attr('offset', '0%').attr('stop-color', '#1a1d26');
    sphereGrad.append('stop').attr('offset', '60%').attr('stop-color', '#0e1017');
    sphereGrad.append('stop').attr('offset', '100%').attr('stop-color', '#06070a');

    // Atmospheric halo glow
    const haloGrad = defs
      .append('radialGradient')
      .attr('id', 'd3-globe-halo')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
    haloGrad.append('stop').attr('offset', '82%').attr('stop-color', 'rgba(10, 132, 255, 0.0)');
    haloGrad.append('stop').attr('offset', '93%').attr('stop-color', 'rgba(10, 132, 255, 0.18)');
    haloGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(10, 132, 255, 0.35)');

    // Neon blur filter for attack trajectories
    const filterGlow = defs
      .append('filter')
      .attr('id', 'd3-arc-glow')
      .attr('x', '-30%')
      .attr('y', '-30%')
      .attr('width', '160%')
      .attr('height', '160%');
    filterGlow.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'blur');
    const feMerge = filterGlow.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Background Canvas
    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#d3-radar-space-bg)');

    // Layer groups
    const rootLayer = svg.append('g').attr('class', 'd3-root-layer');
    const haloLayer = rootLayer.append('g').attr('class', 'd3-halo-layer');
    const sphereLayer = rootLayer.append('g').attr('class', 'd3-sphere-layer');
    const graticuleLayer = rootLayer.append('g').attr('class', 'd3-graticule-layer');
    const landLayer = rootLayer.append('g').attr('class', 'd3-land-layer');
    const arcsLayer = rootLayer.append('g').attr('class', 'd3-arcs-layer');
    const pulsesLayer = rootLayer.append('g').attr('class', 'd3-pulses-layer');
    const markersLayer = rootLayer.append('g').attr('class', 'd3-markers-layer');

    // Initialize Projection: 3D Orthographic Globe vs 2D Natural Earth
    let projection: d3.GeoProjection;
    if (projectionMode === '3d') {
      projection = d3
        .geoOrthographic()
        .scale(globeRadius)
        .translate([width / 2, height / 2])
        .rotate(rotationRef.current)
        .clipAngle(90);
    } else {
      projection = d3
        .geoNaturalEarth1()
        .scale(165 * zoomFactor)
        .translate([width / 2, height / 2 + 10]);
    }

    const path = d3.geoPath().projection(projection);

    // 3D Sphere Outline / Background
    if (projectionMode === '3d') {
      // Atmospheric Halo outer ring
      haloLayer
        .append('circle')
        .attr('cx', width / 2)
        .attr('cy', height / 2)
        .attr('r', globeRadius * 1.05)
        .attr('fill', 'url(#d3-globe-halo)')
        .attr('pointer-events', 'none');

      // Sphere Body
      sphereLayer
        .append('circle')
        .attr('cx', width / 2)
        .attr('cy', height / 2)
        .attr('r', globeRadius)
        .attr('fill', 'url(#d3-globe-shading)')
        .attr('stroke', 'rgba(255, 255, 255, 0.12)')
        .attr('stroke-width', 1.2);
    }

    // Graticule grid
    const graticule = d3.geoGraticule10();
    const graticulePath = graticuleLayer
      .append('path')
      .datum(graticule)
      .attr('class', 'd3-graticule')
      .attr('d', path as any)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255, 255, 255, 0.05)')
      .attr('stroke-width', 0.5);

    // World Countries Landmasses
    const topo: any = worldAtlas;
    const countriesGeo: any = feature(topo, topo.objects.countries);

    const countryPaths = landLayer
      .selectAll('path.d3-country')
      .data(countriesGeo.features)
      .enter()
      .append('path')
      .attr('class', 'd3-country')
      .attr('d', path as any)
      .attr('fill', '#1a1a20')
      .attr('stroke', 'rgba(255, 255, 255, 0.12)')
      .attr('stroke-width', 0.45);

    // Great-Circle Attack Vector Arc Paths
    const arcElements = arcsLayer
      .selectAll('g.d3-arc-group')
      .data(filteredArcs, (d: any) => d.id)
      .enter()
      .append('g')
      .attr('class', 'd3-arc-group')
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        handleFocusVector(d);
      });

    // Outer glow trajectory
    arcElements
      .append('path')
      .attr('class', 'd3-arc-glow-path')
      .attr('d', (d) => {
        const line = { type: 'LineString', coordinates: [d.sourceCoords, d.targetCoords] };
        return path(line as any);
      })
      .attr('fill', 'none')
      .attr('stroke', (d) =>
        d.severity === 'critical' ? '#ff453a' : d.severity === 'high' ? '#ff9f0a' : '#0a84ff'
      )
      .attr('stroke-width', (d) => (d.id === selectedVectorId ? 3.5 : 2.2))
      .attr('stroke-opacity', (d) => (d.id === selectedVectorId ? 0.9 : 0.45))
      .attr('filter', 'url(#d3-arc-glow)');

    // Core dash trajectory
    arcElements
      .append('path')
      .attr('class', 'd3-arc-core-path')
      .attr('d', (d) => {
        const line = { type: 'LineString', coordinates: [d.sourceCoords, d.targetCoords] };
        return path(line as any);
      })
      .attr('fill', 'none')
      .attr('stroke', (d) =>
        d.severity === 'critical' ? '#ff6961' : d.severity === 'high' ? '#ffd60a' : '#64d2ff'
      )
      .attr('stroke-width', (d) => (d.id === selectedVectorId ? 1.8 : 1.1))
      .attr('stroke-dasharray', (d) => (d.severity === 'critical' ? '6,4' : '4,3'));

    // Photon pulse particles for each arc
    const pulseCircles = pulsesLayer
      .selectAll('circle.d3-pulse-particle')
      .data(filteredArcs, (d: any) => d.id)
      .enter()
      .append('circle')
      .attr('class', 'd3-pulse-particle')
      .attr('r', (d) => (d.id === selectedVectorId ? 4.5 : 3.2))
      .attr('fill', (d) =>
        d.severity === 'critical' ? '#ff3b30' : d.severity === 'high' ? '#ff9f0a' : '#0a84ff'
      )
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.2)
      .attr('pointer-events', 'none');

    // Geo Cluster Node Markers
    const clusterMarkers = markersLayer
      .selectAll('g.d3-cluster-marker')
      .data(clusters, (d: any) => d.id)
      .enter()
      .append('g')
      .attr('class', 'd3-cluster-marker')
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        handleFocusCluster(d);
      });

    // Outer radar ring
    clusterMarkers
      .append('circle')
      .attr('class', 'd3-marker-ring')
      .attr('r', (d) => 6 + (d.riskScore / 100) * 10)
      .attr('fill', (d) =>
        d.kind === 'adversary_cluster'
          ? '#ff453a'
          : d.severity === 'critical'
          ? '#ff453a'
          : d.severity === 'high'
          ? '#ff9f0a'
          : '#30d158'
      )
      .attr('fill-opacity', (d) => (d.id === selectedClusterId ? 0.28 : 0.12))
      .attr('stroke', (d) =>
        d.kind === 'adversary_cluster'
          ? '#ff453a'
          : d.severity === 'critical'
          ? '#ff453a'
          : d.severity === 'high'
          ? '#ff9f0a'
          : '#30d158'
      )
      .attr('stroke-width', (d) => (d.id === selectedClusterId ? 1.5 : 0.8))
      .attr('stroke-opacity', 0.8);

    // Inner core dot
    clusterMarkers
      .append('circle')
      .attr('class', 'd3-marker-dot')
      .attr('r', (d) => (d.id === selectedClusterId ? 4.5 : 3.2))
      .attr('fill', (d) =>
        d.kind === 'adversary_cluster'
          ? '#ff453a'
          : d.severity === 'critical'
          ? '#ff453a'
          : d.severity === 'high'
          ? '#ff9f0a'
          : '#30d158'
      )
      .attr('stroke', '#08080a')
      .attr('stroke-width', 1);

    // Smart label placement map to avoid overlaps in high-density European/American regions
    const smartLabelPlacements: Record<string, { dx: number; dy: number; anchor: 'start' | 'end' | 'middle' }> = {
      'cluster-ashburn': { dx: -12, dy: -8, anchor: 'end' },
      'cluster-silicon-valley': { dx: 0, dy: -14, anchor: 'middle' },
      'cluster-london': { dx: -12, dy: -6, anchor: 'end' },
      'cluster-frankfurt': { dx: 12, dy: -6, anchor: 'start' },
      'cluster-tokyo': { dx: 12, dy: 3, anchor: 'start' },
      'cluster-taipei': { dx: -12, dy: 6, anchor: 'end' },
      'adv-eastern-europe': { dx: 12, dy: 10, anchor: 'start' },
      'adv-maritime-relay': { dx: -12, dy: 10, anchor: 'end' },
      'adv-panama-proxy': { dx: 12, dy: 3, anchor: 'start' },
    };

    // Cluster label (crisp contrast stroke preventing overlaps)
    clusterMarkers
      .append('text')
      .attr('class', 'd3-marker-label')
      .attr('dx', (d: any) => smartLabelPlacements[d.id]?.dx ?? (d.lng > 60 ? -10 : 10))
      .attr('dy', (d: any) => smartLabelPlacements[d.id]?.dy ?? 3)
      .attr('text-anchor', (d: any) => smartLabelPlacements[d.id]?.anchor ?? (d.lng > 60 ? 'end' : 'start'))
      .attr('font-family', '"JetBrains Mono", monospace')
      .attr('font-size', (d: any) => (d.id === selectedClusterId ? '10px' : '8.5px'))
      .attr('font-weight', (d: any) => (d.id === selectedClusterId ? '700' : '500'))
      .attr('fill', (d: any) => (d.id === selectedClusterId ? '#ffffff' : '#a1a1a6'))
      .attr('stroke', '#08080a')
      .attr('stroke-width', (d: any) => (d.id === selectedClusterId ? 2.5 : 2))
      .attr('paint-order', 'stroke')
      .attr('opacity', (d: any) => (d.id === selectedClusterId || d.riskScore >= 80 || d.severity === 'critical' ? 1 : 0.7))
      .text((d: any) => `${d.name.split(' ')[0]} [${d.riskScore}]`);

    // Helper: is a geographic point visible on the front-facing 3D hemisphere?
    const isPointVisible = (coords: [number, number]): boolean => {
      if (projectionMode !== '3d') return true;
      const [yaw, pitch] = rotationRef.current;
      const centerCoords: [number, number] = [-yaw, -pitch];
      // d3.geoDistance returns radians; < PI/2 means on the front-facing hemisphere
      return d3.geoDistance(coords, centerCoords) < Math.PI / 2;
    };

    // Render frame updater called whenever projection or rotation updates
    const renderFrame = () => {
      if (!svgRef.current) return;

      if (projectionMode === '3d') {
        projection.rotate(rotationRef.current);
      }

      // Update land & graticule
      graticulePath.attr('d', path as any);
      countryPaths.attr('d', path as any);

      // Update arc paths
      arcElements.selectAll('path.d3-arc-glow-path').attr('d', (d: any) => {
        const line = { type: 'LineString', coordinates: [d.sourceCoords, d.targetCoords] };
        return path(line as any);
      });
      arcElements.selectAll('path.d3-arc-core-path').attr('d', (d: any) => {
        const line = { type: 'LineString', coordinates: [d.sourceCoords, d.targetCoords] };
        return path(line as any);
      });

      // Update markers visibility and position
      clusterMarkers.each(function (d: any) {
        const marker = d3.select(this);
        const visible = isPointVisible([d.lng, d.lat]);
        if (!visible) {
          marker.attr('display', 'none');
          return;
        }
        marker.attr('display', 'inline');
        const projected = projection([d.lng, d.lat]);
        if (projected) {
          marker.attr('transform', `translate(${projected[0]}, ${projected[1]})`);
        }
      });
    };

    // Save handles for rotation loop & drag
    d3HandlesRef.current = {
      svg,
      projection,
      path,
      renderFrame,
    };

    // Free drag-to-rotate interaction for 3D Globe
    if (projectionMode === '3d') {
      const dragBehavior = d3
        .drag<SVGSVGElement, unknown>()
        .on('start', () => {
          isDraggingRef.current = true;
          if (transitionTimerRef.current) {
            cancelAnimationFrame(transitionTimerRef.current);
            transitionTimerRef.current = null;
          }
        })
        .on('drag', (event) => {
          const k = 0.38 / zoomFactor;
          const [yaw, pitch, roll] = rotationRef.current;
          const nextYaw = yaw + event.dx * k;
          const nextPitch = Math.max(-75, Math.min(75, pitch - event.dy * k));
          rotationRef.current = [nextYaw, nextPitch, roll];
          renderFrame();
        })
        .on('end', () => {
          isDraggingRef.current = false;
        });

      svg.call(dragBehavior);
    } else {
      svg.on('.drag', null);
    }

    // Initial frame render
    renderFrame();

    // Pulse particles animation loop along great-circle arcs
    let lastPulseTime = performance.now();
    const animatePulses = (time: number) => {
      // Periodic pulse progression (cycles every 2.4s)
      const t = (time % 2400) / 2400;

      pulseCircles.each(function (d: any, i: number) {
        const particle = d3.select(this);
        // Stagger pulse phases across arcs
        const arcProgress = (t + i * 0.18) % 1;
        const interpolator = d3.geoInterpolate(d.sourceCoords, d.targetCoords);
        const currentCoord = interpolator(arcProgress);

        const visible = isPointVisible(currentCoord);
        if (!visible) {
          particle.attr('display', 'none');
          return;
        }

        const screenPt = projection(currentCoord);
        if (screenPt && !isNaN(screenPt[0]) && !isNaN(screenPt[1])) {
          particle
            .attr('display', 'inline')
            .attr('cx', screenPt[0])
            .attr('cy', screenPt[1])
            .attr('opacity', Math.sin(arcProgress * Math.PI) * 0.95);
        } else {
          particle.attr('display', 'none');
        }
      });

      // Auto-rotation step when active and not dragging
      if (autoRotate && !isDraggingRef.current && projectionMode === '3d') {
        const dt = Math.min(32, time - lastPulseTime);
        const [yaw, pitch, roll] = rotationRef.current;
        // ~10 degrees per second smooth rotation
        rotationRef.current = [(yaw + dt * 0.012) % 360, pitch, roll];
        renderFrame();
      }

      lastPulseTime = time;
      animFrameIdRef.current = requestAnimationFrame(animatePulses);
    };

    animFrameIdRef.current = requestAnimationFrame(animatePulses);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (transitionTimerRef.current) cancelAnimationFrame(transitionTimerRef.current);
    };
  }, [projectionMode, autoRotate, zoomFactor, filteredArcs, clusters, selectedVectorId, selectedClusterId]);

  // Zoom control handlers
  const handleZoomIn = () => {
    setZoomFactor((prev) => Math.min(2.2, Math.round((prev + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoomFactor((prev) => Math.max(0.75, Math.round((prev - 0.25) * 100) / 100));
  };

  const handleResetView = () => {
    setZoomFactor(1);
    rotationRef.current = [-25, -20, 0];
    d3HandlesRef.current.renderFrame();
  };

  return (
    <div
      ref={containerRef}
      data-testid="global-threat-radar-card"
      className="apple-card p-5 space-y-4"
    >
      {/* Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-[#f5f5f7] font-semibold">
            <Globe className="w-4 h-4 text-[#0a84ff] animate-pulse" />
            <span>GLOBAL THREAT RADAR · 3D D3.JS ORTHOGRAPHIC SPHERE</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#0a84ff]/10 text-[#0a84ff] border border-[#0a84ff]/30 font-mono font-medium">
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs text-[#a1a1a6]">
            Interactive 3D orthographic globe plotting live attack vectors, great-circle trajectories, and sovereign enclave clusters in real-time.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Projection Toggle: 3D Globe vs 2D Natural Earth */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#111113] border border-white/[0.08] text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setProjectionMode('3d')}
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                projectionMode === '3d'
                  ? 'bg-white/[0.14] text-[#f5f5f7] font-semibold shadow-sm'
                  : 'text-[#86868b] hover:text-[#f5f5f7]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>3D Globe</span>
            </button>
            <button
              type="button"
              onClick={() => setProjectionMode('2d')}
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                projectionMode === '2d'
                  ? 'bg-white/[0.14] text-[#f5f5f7] font-semibold shadow-sm'
                  : 'text-[#86868b] hover:text-[#f5f5f7]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2D Earth</span>
            </button>
          </div>

          {/* Auto-Rotation Toggle */}
          {projectionMode === '3d' && (
            <button
              type="button"
              onClick={() => setAutoRotate(!autoRotate)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors ${
                autoRotate
                  ? 'bg-[#0a84ff]/10 border-[#0a84ff]/30 text-[#0a84ff]'
                  : 'bg-[#161618] border-white/[0.1] text-[#86868b] hover:text-[#f5f5f7]'
              }`}
              title={autoRotate ? 'Pause auto-rotation' : 'Resume auto-rotation'}
            >
              {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{autoRotate ? 'Auto-Rotate' : 'Paused'}</span>
            </button>
          )}

          {/* Regional Theaters Presets */}
          {projectionMode === '3d' && (
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-[#111113] border border-white/[0.08] text-[11px] font-mono">
              <span className="px-2 text-[#636366] text-[10px]">THEATER:</span>
              <button
                type="button"
                onClick={() => focusOnCoordinates(-95, 38)}
                className="px-2 py-0.5 rounded text-[#a1a1a6] hover:text-[#f5f5f7] hover:bg-white/[0.06] transition-colors"
                title="Focus Americas Theater"
              >
                Americas
              </button>
              <button
                type="button"
                onClick={() => focusOnCoordinates(12, 50)}
                className="px-2 py-0.5 rounded text-[#a1a1a6] hover:text-[#f5f5f7] hover:bg-white/[0.06] transition-colors"
                title="Focus Europe Theater"
              >
                Europe
              </button>
              <button
                type="button"
                onClick={() => focusOnCoordinates(120, 25)}
                className="px-2 py-0.5 rounded text-[#a1a1a6] hover:text-[#f5f5f7] hover:bg-white/[0.06] transition-colors"
                title="Focus Asia-Pacific Theater"
              >
                APAC
              </button>
            </div>
          )}

          {/* Zoom Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg bg-[#161618] hover:bg-[#222226] border border-white/[0.1] text-xs font-mono text-[#f5f5f7]"
              title="Zoom In"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#0a84ff]" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg bg-[#161618] hover:bg-[#222226] border border-white/[0.1] text-xs font-mono text-[#a1a1a6] hover:text-[#f5f5f7]"
              title="Zoom Out"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="px-2.5 py-1.5 rounded-lg bg-[#161618] hover:bg-[#222226] border border-white/[0.1] text-xs font-mono text-[#a1a1a6] hover:text-[#f5f5f7] flex items-center gap-1"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 3D Globe Projection Viewport + Telemetry Intelligence Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Globe Viewport */}
        <div className="lg:col-span-8 relative rounded-xl border border-white/[0.08] overflow-hidden bg-[#08080a] shadow-2xl flex items-center justify-center">
          <svg
            ref={svgRef}
            viewBox="0 0 960 450"
            data-testid="d3-global-threat-radar"
            className="w-full h-[400px] sm:h-[450px] block select-none cursor-grab active:cursor-grabbing"
          />

          {/* Legend Overlay */}
          <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-3 text-[10px] font-mono bg-[#111113]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/[0.1] text-[#a1a1a6]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff453a] shadow-sm shadow-[#ff453a]/50" /> Critical Vector / C2
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff9f0a]" /> Elevated Attack / Incident
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0a84ff]" /> Monitored Route
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#30d158]" /> Shielded Sovereign Enclave
            </span>
            <span className="text-[#636366] border-l border-white/[0.1] pl-2">
              {projectionMode === '3d' ? 'Drag sphere to rotate' : '2D Map active'}
            </span>
          </div>

          {/* Live Arcs Counter Chip */}
          <div className="absolute top-3 right-3 flex items-center gap-2 bg-[#111113]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/[0.1] text-[11px] font-mono">
            <Radio className="w-3.5 h-3.5 text-[#ff453a] animate-pulse" />
            <span className="text-[#f5f5f7] font-semibold">{arcs.length} Live Vectors</span>
            <span className="text-[#636366]">·</span>
            <span className="text-[#a1a1a6]">{clusters.length} Clusters</span>
          </div>
        </div>

        {/* Telemetry Intelligence Drawer */}
        <div className="lg:col-span-4 flex flex-col justify-between p-4 rounded-xl border border-white/[0.08] bg-[#111113] space-y-3">
          {/* Tabs: Active Vectors vs Clusters */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#18181b] border border-white/[0.07] text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('vectors')}
              className={`flex-1 py-1 px-2.5 rounded-md text-center transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'vectors'
                  ? 'bg-white/[0.14] text-[#f5f5f7] font-semibold shadow-sm'
                  : 'text-[#86868b] hover:text-[#f5f5f7]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-[#ff9f0a]" />
              <span>Active Vectors ({arcs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('clusters')}
              className={`flex-1 py-1 px-2.5 rounded-md text-center transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'clusters'
                  ? 'bg-white/[0.14] text-[#f5f5f7] font-semibold shadow-sm'
                  : 'text-[#86868b] hover:text-[#f5f5f7]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-[#0a84ff]" />
              <span>Clusters ({clusters.length})</span>
            </button>
          </div>

          {/* TAB 1: ACTIVE LIVE ATTACK VECTORS */}
          {activeTab === 'vectors' && (
            <div className="flex-1 flex flex-col justify-between space-y-3 min-h-[300px]">
              {selectedVector ? (
                <div className="space-y-3">
                  {/* Vector Header & Severity Badge */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.08]">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-[#ff453a]" />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#86868b] font-semibold">
                        Vector Intelligence
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md uppercase font-semibold ${
                        selectedVector.severity === 'critical'
                          ? 'bg-[#ff453a]/15 text-[#ff6961] border border-[#ff453a]/30'
                          : selectedVector.severity === 'high'
                          ? 'bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30'
                          : 'bg-[#0a84ff]/15 text-[#64d2ff] border border-[#0a84ff]/30'
                      }`}
                    >
                      {selectedVector.severity}
                    </span>
                  </div>

                  {/* Vector Title */}
                  <div>
                    <h3 className="text-sm font-bold text-[#f5f5f7] leading-tight">
                      {selectedVector.vector}
                    </h3>
                    <div className="text-[11px] font-mono text-[#a1a1a6] mt-1 flex items-center gap-1.5">
                      <span className="text-[#ff6961]">{selectedVector.sourceLabel || 'External Threat'}</span>
                      <span className="text-[#636366]">➔</span>
                      <span className="text-[#30d158]">{selectedVector.targetLabel || 'Enclave Core'}</span>
                    </div>
                  </div>

                  {/* Coordinates Telemetry */}
                  <div className="p-2.5 rounded-lg bg-[#18181b] border border-white/[0.07] font-mono text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[#86868b]">Origin Coordinates:</span>
                      <span className="text-[#f5f5f7] tabular-nums">
                        {selectedVector.sourceCoords[1].toFixed(2)}°N, {selectedVector.sourceCoords[0].toFixed(2)}°E
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#86868b]">Target Coordinates:</span>
                      <span className="text-[#f5f5f7] tabular-nums">
                        {selectedVector.targetCoords[1].toFixed(2)}°N, {selectedVector.targetCoords[0].toFixed(2)}°E
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                      <span className="text-[#86868b]">Protocol / Transport:</span>
                      <span className="text-[#64d2ff]">{selectedVector.protocol || 'TLS 1.3 / TCP'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#86868b]">Telemetry Flow Rate:</span>
                      <span className="text-[#ffd60a] tabular-nums font-semibold">
                        {(selectedVector.packetRatePps || 1200).toLocaleString()} pps
                      </span>
                    </div>
                    {selectedVector.mitreTechnique && (
                      <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                        <span className="text-[#86868b]">MITRE Technique:</span>
                        <span className="text-[#ff9f0a] truncate max-w-[160px]" title={selectedVector.mitreTechnique}>
                          {selectedVector.mitreTechnique}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Track Vector on Globe Button */}
                  <button
                    type="button"
                    onClick={() => handleFocusVector(selectedVector)}
                    className="w-full py-1.5 px-3 rounded-lg bg-[#1c1c20] hover:bg-[#28282e] border border-white/[0.1] text-xs font-mono text-[#f5f5f7] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <LocateFixed className="w-3.5 h-3.5 text-[#0a84ff]" />
                    <span>Track Vector on 3D Globe</span>
                  </button>

                  {/* Vector Quick Selector Scroll */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono text-[#636366] uppercase tracking-wider">
                      Active Telemetry Vectors ({arcs.length})
                    </span>
                    <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                      {arcs.map((arc) => (
                        <button
                          key={arc.id}
                          type="button"
                          onClick={() => handleFocusVector(arc)}
                          className={`w-full text-left p-1.5 rounded-lg text-[11px] font-mono flex items-center justify-between border transition-colors ${
                            selectedVector.id === arc.id
                              ? 'bg-white/[0.12] border-[#0a84ff]/40 text-[#ffffff]'
                              : 'bg-[#18181b] border-white/[0.06] text-[#a1a1a6] hover:text-[#f5f5f7]'
                          }`}
                        >
                          <span className="truncate max-w-[190px]">{arc.vector}</span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded uppercase font-bold shrink-0 ${
                              arc.severity === 'critical' ? 'text-[#ff6961]' : 'text-[#ffd60a]'
                            }`}
                          >
                            {arc.severity}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-[#86868b] font-mono">
                  No active attack vectors detected.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GEOSPATIAL CLUSTERS */}
          {activeTab === 'clusters' && (
            <div className="flex-1 flex flex-col justify-between space-y-3 min-h-[300px]">
              {selectedCluster ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.08]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#86868b] font-semibold">
                      Cluster Node
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md uppercase font-semibold ${
                        selectedCluster.severity === 'critical'
                          ? 'bg-[#ff453a]/15 text-[#ff6961] border border-[#ff453a]/30'
                          : selectedCluster.severity === 'high'
                          ? 'bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30'
                          : 'bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30'
                      }`}
                    >
                      {selectedCluster.severity}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#f5f5f7]">{selectedCluster.name}</h3>
                    <div className="text-[11px] font-mono text-[#86868b] mt-0.5">
                      {selectedCluster.region} · {selectedCluster.lat.toFixed(2)}°, {selectedCluster.lng.toFixed(2)}°
                    </div>
                  </div>

                  <p className="text-xs text-[#a1a1a6] leading-relaxed">{selectedCluster.summary}</p>

                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                    <div className="p-2.5 rounded-lg bg-[#18181b] border border-white/[0.07]">
                      <div className="text-[10px] text-[#86868b]">RISK SCORE</div>
                      <div className="text-base font-bold text-[#ff9f0a] tabular-nums">
                        {selectedCluster.riskScore}/100
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#18181b] border border-white/[0.07]">
                      <div className="text-[10px] text-[#86868b]">ACTIVE EVENTS</div>
                      <div className="text-base font-bold text-[#f5f5f7] tabular-nums">
                        {selectedCluster.activeEventsCount}
                      </div>
                    </div>
                  </div>

                  {/* Focus Cluster Button */}
                  <button
                    type="button"
                    onClick={() => handleFocusCluster(selectedCluster)}
                    className="w-full py-1.5 px-3 rounded-lg bg-[#1c1c20] hover:bg-[#28282e] border border-white/[0.1] text-xs font-mono text-[#f5f5f7] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <LocateFixed className="w-3.5 h-3.5 text-[#0a84ff]" />
                    <span>Center Globe on Cluster</span>
                  </button>

                  {/* Cluster Quick List */}
                  <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                    {clusters.map((cluster) => (
                      <button
                        key={cluster.id}
                        type="button"
                        onClick={() => handleFocusCluster(cluster)}
                        className={`w-full text-left p-1.5 rounded-lg text-[11px] font-mono flex items-center justify-between border transition-colors ${
                          selectedCluster.id === cluster.id
                            ? 'bg-white/[0.12] border-[#0a84ff]/40 text-[#ffffff]'
                            : 'bg-[#18181b] border-white/[0.06] text-[#a1a1a6] hover:text-[#f5f5f7]'
                        }`}
                      >
                        <span className="truncate max-w-[180px]">{cluster.name}</span>
                        <span className="text-[10px] text-[#ffd60a] font-bold">[{cluster.riskScore}]</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Action Trigger: Inspect Priority Incident */}
          {incidents[0] && onSelectIncident && (
            <button
              type="button"
              onClick={() => onSelectIncident(incidents[0].id)}
              className="w-full py-2 px-3 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Inspect Priority Incident ({incidents[0].id.slice(0, 10)})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
