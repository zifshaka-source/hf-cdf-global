import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Activity,
  Layers,
  Flame,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Incident } from '../../core/types';
import { computeThirtyDayIncidentTrends } from '../../core/incident-trend-utils';

interface IncidentThirtyDayTrendChartProps {
  incidents: Incident[];
  onSelectIncident?: (incidentId: string) => void;
}

export const IncidentThirtyDayTrendChart: React.FC<IncidentThirtyDayTrendChartProps> = ({
  incidents,
  onSelectIncident,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'high' | 'containment'>('all');

  const analytics = useMemo(() => {
    return computeThirtyDayIncidentTrends(incidents);
  }, [incidents]);

  return (
    <div
      data-testid="incident-thirty-day-trend-chart"
      className="apple-card p-5 space-y-4 border-white/[0.08] bg-[#111113]/90"
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#f5f5f7]">
            <TrendingUp className="w-4 h-4 text-[#30d158]" />
            <span>30-DAY INCIDENT FREQUENCY & SEVERITY SPECTRUM</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/30 font-mono">
              ROLLING 30-DAY TELEMETRY
            </span>
          </div>
          <p className="text-xs text-[#a1a1a6]">
            Multi-series Recharts trajectory plotting daily incident volume, critical and high severity distributions, and containment velocity based on live incident states.
          </p>
        </div>

        {/* View Filter Toggles */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#18181b] border border-white/[0.08] text-[11px] font-mono">
          {(
            [
              { id: 'all', label: 'All Curves' },
              { id: 'critical', label: 'Critical Only' },
              { id: 'high', label: 'High Only' },
              { id: 'containment', label: 'Containment' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                activeFilter === filter.id
                  ? 'bg-white/[0.14] text-[#f5f5f7] font-semibold shadow-sm'
                  : 'text-[#86868b] hover:text-[#f5f5f7]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Header Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-[#161618] border border-white/[0.06] space-y-1">
          <span className="text-[10px] text-[#86868b] uppercase block">30-DAY TOTAL VOLUME</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#f5f5f7] tabular-nums">
              {analytics.totalPeriodIncidents}
            </span>
            <span className="text-[10px] text-[#86868b]">incidents</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#161618] border border-white/[0.06] space-y-1">
          <span className="text-[10px] text-[#86868b] uppercase block">PEAK ACTIVITY DAY</span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-[#ffd60a] tabular-nums">
              {analytics.peakDay.date}
            </span>
            <span className="text-[10px] text-[#a1a1a6]">
              ({analytics.peakDay.count} cases)
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#161618] border border-white/[0.06] space-y-1">
          <span className="text-[10px] text-[#86868b] uppercase block">CRITICAL RATIO</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#ff453a] tabular-nums">
              {analytics.criticalRatioPct}%
            </span>
            <span className="text-[10px] text-[#ff6961]">high-priority</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#161618] border border-white/[0.06] space-y-1">
          <span className="text-[10px] text-[#86868b] uppercase block">CONTAINMENT EFFICIENCY</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#30d158] tabular-nums">
              {analytics.overallContainmentRatePct}%
            </span>
            <span className="text-[10px] text-[#30d158]">mitigated</span>
          </div>
        </div>
      </div>

      {/* Main Recharts LineChart */}
      <div className="h-[290px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={analytics.series}
            margin={{ top: 12, right: 20, left: -14, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255, 255, 255, 0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="#86868b"
              fontSize={10.5}
              fontFamily='"JetBrains Mono", monospace'
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
            />
            <YAxis
              stroke="#86868b"
              fontSize={10.5}
              fontFamily='"JetBrains Mono", monospace'
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0].payload;
                return (
                  <div className="p-3 rounded-xl bg-[#161618]/95 backdrop-blur-md border border-white/[0.12] shadow-2xl font-mono text-xs space-y-2 min-w-[210px]">
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08]">
                      <span className="font-bold text-[#f5f5f7]">{label}</span>
                      <span className="text-[10px] text-[#86868b]">Day {point.dayIndex}/30</span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#a1a1a6] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#f5f5f7]" /> Total Incidents:
                        </span>
                        <span className="font-bold text-[#f5f5f7] tabular-nums">{point.total}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#ff6961] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#ff453a]" /> Critical Severity:
                        </span>
                        <span className="font-bold text-[#ff453a] tabular-nums">{point.critical}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#ffd60a] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#ff9f0a]" /> High Severity:
                        </span>
                        <span className="font-bold text-[#ff9f0a] tabular-nums">{point.high}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#64d2ff] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#0a84ff]" /> Medium/Low:
                        </span>
                        <span className="font-bold text-[#0a84ff] tabular-nums">{point.medium}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                        <span className="text-[#30d158] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#30d158]" /> Contained:
                        </span>
                        <span className="font-bold text-[#30d158] tabular-nums">{point.contained}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '8px',
                fontSize: '11px',
                fontFamily: '"JetBrains Mono", monospace',
              }}
            />

            {(activeFilter === 'all' || activeFilter === 'containment') && (
              <Line
                type="monotone"
                dataKey="total"
                name="Total Incidents"
                stroke="#f5f5f7"
                strokeWidth={2}
                dot={{ r: 2, fill: '#ffffff' }}
                activeDot={{ r: 5, fill: '#ffffff' }}
              />
            )}

            {(activeFilter === 'all' || activeFilter === 'critical') && (
              <Line
                type="monotone"
                dataKey="critical"
                name="Critical Severity"
                stroke="#ff453a"
                strokeWidth={2.2}
                dot={{ r: 2.5, fill: '#ff453a' }}
                activeDot={{ r: 5.5, fill: '#ff453a' }}
              />
            )}

            {(activeFilter === 'all' || activeFilter === 'high') && (
              <Line
                type="monotone"
                dataKey="high"
                name="High Severity"
                stroke="#ff9f0a"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={{ r: 2, fill: '#ff9f0a' }}
                activeDot={{ r: 5, fill: '#ff9f0a' }}
              />
            )}

            {activeFilter === 'all' && (
              <Line
                type="monotone"
                dataKey="medium"
                name="Medium/Low"
                stroke="#0a84ff"
                strokeWidth={1.8}
                dot={{ r: 1.5, fill: '#0a84ff' }}
              />
            )}

            {(activeFilter === 'all' || activeFilter === 'containment') && (
              <Line
                type="monotone"
                dataKey="contained"
                name="Contained Status"
                stroke="#30d158"
                strokeWidth={2}
                dot={{ r: 2, fill: '#30d158' }}
                activeDot={{ r: 5, fill: '#30d158' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Context Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.06] text-[11px] font-mono text-[#86868b]">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ff453a]" /> Critical Priority Spike
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ff9f0a]" /> High Severity Wave
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#30d158]" /> Contained State Verification
          </span>
        </div>

        <span>
          Based on {incidents.length} active platform incidents & historical baseline
        </span>
      </div>
    </div>
  );
};
