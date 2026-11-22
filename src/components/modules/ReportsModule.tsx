import React, { useState } from 'react';
import {
  FileText,
  Download,
  FileCheck,
  Shield,
  Filter,
  CheckCircle2,
  FileJson,
  FileSpreadsheet,
  Layers,
  Database,
  Lock,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Incident, SecurityEvent } from '../../core/types';
import { INITIAL_EVENTS, INITIAL_INCIDENTS } from '../../core/initial-data';
import {
  exportConsolidatedReportBundle,
  exportEventsToCsv,
  exportIncidentsToCsv,
  exportIncidentsToJson,
} from '../../core/report-export-utils';

interface ReportsModuleProps {
  incidents?: Incident[];
  events?: SecurityEvent[];
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  incidents = INITIAL_INCIDENTS,
  events = INITIAL_EVENTS,
}) => {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exportScope, setExportScope] = useState<'consolidated' | 'incidents' | 'events'>('consolidated');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'high'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportStatus, setLastExportStatus] = useState<string | null>(null);

  // Filtered lists based on severity
  const filteredIncidents = React.useMemo(() => {
    if (filterSeverity === 'all') return incidents;
    if (filterSeverity === 'critical') return incidents.filter((i) => i.severity === 'critical');
    return incidents.filter((i) => i.severity === 'critical' || i.severity === 'high');
  }, [incidents, filterSeverity]);

  const filteredEvents = React.useMemo(() => {
    if (filterSeverity === 'all') return events;
    if (filterSeverity === 'critical') return events.filter((e) => e.severity === 'critical');
    return events.filter((e) => e.severity === 'critical' || e.severity === 'high');
  }, [events, filterSeverity]);

  // Execute download of formatted report file
  const handleExportTelemetryReport = () => {
    setIsExporting(true);

    setTimeout(() => {
      let fileContent = '';
      let filename = '';
      let mimeType = '';

      const dateStr = new Date().toISOString().slice(0, 10);
      const timeTag = Date.now().toString(36).slice(-4).toUpperCase();

      if (exportScope === 'incidents') {
        if (exportFormat === 'json') {
          fileContent = exportIncidentsToJson(filteredIncidents, [], {
            classification: 'RESTRICTED // SOVEREIGN INCIDENT AUDIT',
            generatedBy: 'Authorized Commander · HF-CDF Operational OS',
          });
          filename = `HF-CDF_Incident_Registry_${dateStr}_${timeTag}.json`;
          mimeType = 'application/json';
        } else {
          fileContent = exportIncidentsToCsv(filteredIncidents);
          filename = `HF-CDF_Incident_Registry_${dateStr}_${timeTag}.csv`;
          mimeType = 'text/csv;charset=utf-8;';
        }
      } else if (exportScope === 'events') {
        if (exportFormat === 'json') {
          const report = {
            reportHeader: {
              reportId: `REP-EVT-${timeTag}`,
              title: 'HF-CDF REAL-TIME SECURITY EVENTS SUMMARY DOSSIER',
              generatedAt: new Date().toISOString(),
              totalEvents: filteredEvents.length,
            },
            securityEvents: filteredEvents,
          };
          fileContent = JSON.stringify(report, null, 2);
          filename = `HF-CDF_Security_Events_${dateStr}_${timeTag}.json`;
          mimeType = 'application/json';
        } else {
          fileContent = exportEventsToCsv(filteredEvents);
          filename = `HF-CDF_Security_Events_${dateStr}_${timeTag}.csv`;
          mimeType = 'text/csv;charset=utf-8;';
        }
      } else {
        // Consolidated Bundle (Incidents + Events)
        const bundle = exportConsolidatedReportBundle(
          filteredIncidents,
          filteredEvents,
          exportFormat,
          {
            classification: 'RESTRICTED // SOVEREIGN CONSOLIDATED FORENSICS',
            generatedBy: 'Authorized Commander · HF-CDF Multi-Agent OS',
          }
        );
        fileContent = bundle.content;
        filename = bundle.filename;
        mimeType = bundle.mimeType;
      }

      // Trigger browser file download
      const blob = new Blob([fileContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsExporting(false);
      setLastExportStatus(
        `Successfully generated and exported ${filename} (${(blob.size / 1024).toFixed(1)} KB)`
      );
    }, 450);
  };

  // Pre-configured executive reports catalog
  const standardReports = [
    {
      id: 'REP-2026-084',
      title: 'Incident Post-Mortem: Model Weight Exfiltration Attempt',
      category: 'Incident Response Report',
      date: '2026-11-04',
      author: 'Authorized Commander & Agent Chronos',
      summary:
        'Technical root cause assessment, forensic timeline reconstruction, and containment action verification regarding attempted 70B shard exfiltration.',
      incidentSubset: incidents.filter((i) => i.id === 'INC-2026-084'),
    },
    {
      id: 'REP-AAR-001',
      title: 'Red Force Simulation After-Action Review (AAR)',
      category: 'Adversarial Simulation',
      date: '2026-11-04',
      author: 'Vanguard-Red & Blue Force Swarm',
      summary:
        'Detailed evaluation of Blue Force defense latencies against MITRE ATT&CK techniques T1041, T1078, and T1059 in sandbox environment.',
      incidentSubset: incidents.filter((i) => i.severity === 'critical'),
    },
    {
      id: 'REP-CTI-WEEKLY',
      title: 'Weekly Threat Landscape & Adversary Attribution Bulletin',
      category: 'Threat Intelligence',
      date: '2026-11-03',
      author: 'Agent Cortex-CTI',
      summary:
        'Emerging adversary infrastructure targeting AI model repositories, PyPI package poisoning vectors, and JA3 fingerprint clusters.',
      incidentSubset: incidents,
    },
    {
      id: 'REP-EXEC-Q4',
      title: 'Executive Cybersecurity Posture & DEFCON Readiness Summary',
      category: 'Executive Briefing',
      date: '2026-11-01',
      author: 'CISO Office',
      summary:
        'Quarterly overview of swarm precision, zero-trust microsegmentation compliance, and hardware-accelerated eBPF deployment.',
      incidentSubset: incidents,
    },
  ];

  const handleDownloadStandardReport = (report: typeof standardReports[0], format: 'json' | 'csv') => {
    const subset = report.incidentSubset.length > 0 ? report.incidentSubset : incidents;
    const bundle = exportConsolidatedReportBundle(subset, events.slice(0, 10), format, {
      classification: `CONFIDENTIAL // ${report.category.toUpperCase()}`,
      generatedBy: report.author,
    });

    const blob = new Blob([bundle.content], { type: bundle.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.id}_${format.toUpperCase()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setLastExportStatus(`Exported ${report.id} as formatted ${format.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <h1 className="text-xl font-bold text-[#f5f5f7] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0a84ff]" />
            <span>Operational Reports & Forensic Export</span>
          </h1>
          <p className="text-xs text-[#a1a1a6] mt-0.5">
            Export audit-grade incident dossiers and real-time security event telemetry as formatted JSON or CSV report files.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#86868b]">
          <span className="w-2 h-2 rounded-full bg-[#30d158]" />
          <span>FIPS-140-3 AUDIT COMPLIANT</span>
        </div>
      </div>

      {/* PRIMARY FEATURE: LIVE INCIDENT & EVENT TELEMETRY EXPORTER CARD */}
      <div
        data-testid="reports-telemetry-exporter"
        className="apple-card p-6 space-y-5 border-white/[0.12] bg-[#111113]/90 relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#f5f5f7]">
              <Database className="w-4 h-4 text-[#0a84ff]" />
              <span>LIVE INCIDENT & SECURITY EVENT REPORT EXPORTER</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#0a84ff]/10 text-[#0a84ff] border border-[#0a84ff]/30 font-mono">
                REAL-TIME DATA
              </span>
            </div>
            <p className="text-xs text-[#a1a1a6]">
              Select export scope and format to extract complete cryptographic incident summaries, MITRE tactics, containment timestamps, and event telemetry.
            </p>
          </div>

          {/* Quick Metrics Badge Row */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-[#18181b] border border-white/[0.08] text-center">
              <span className="text-[10px] text-[#86868b] block">INCIDENTS</span>
              <span className="text-sm font-bold text-[#f5f5f7] tabular-nums">
                {filteredIncidents.length}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#18181b] border border-white/[0.08] text-center">
              <span className="text-[10px] text-[#86868b] block">EVENTS</span>
              <span className="text-sm font-bold text-[#f5f5f7] tabular-nums">
                {filteredEvents.length}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#18181b] border border-white/[0.08] text-center">
              <span className="text-[10px] text-[#86868b] block">CRITICAL</span>
              <span className="text-sm font-bold text-[#ff453a] tabular-nums">
                {filteredIncidents.filter((i) => i.severity === 'critical').length}
              </span>
            </div>
          </div>
        </div>

        {/* Configuration Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          {/* Control 1: Format Selection (JSON vs CSV) */}
          <div className="p-3 rounded-xl bg-[#161618] border border-white/[0.07] space-y-2">
            <label className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider block">
              1. Report Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="format-json-btn"
                onClick={() => setExportFormat('json')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  exportFormat === 'json'
                    ? 'bg-[#0a84ff]/15 border-[#0a84ff]/40 text-[#ffffff] font-bold shadow-sm'
                    : 'bg-[#18181b] border-white/[0.06] text-[#86868b] hover:text-[#f5f5f7]'
                }`}
              >
                <FileJson className="w-4 h-4 text-[#0a84ff]" />
                <span>JSON</span>
              </button>
              <button
                type="button"
                data-testid="format-csv-btn"
                onClick={() => setExportFormat('csv')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  exportFormat === 'csv'
                    ? 'bg-[#30d158]/15 border-[#30d158]/40 text-[#ffffff] font-bold shadow-sm'
                    : 'bg-[#18181b] border-white/[0.06] text-[#86868b] hover:text-[#f5f5f7]'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-[#30d158]" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Control 2: Export Scope */}
          <div className="p-3 rounded-xl bg-[#161618] border border-white/[0.07] space-y-2">
            <label className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider block">
              2. Target Scope
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              {(
                [
                  { id: 'consolidated', label: 'All Telemetry' },
                  { id: 'incidents', label: 'Incidents' },
                  { id: 'events', label: 'Events' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setExportScope(tab.id)}
                  className={`py-2 px-1 rounded-lg border text-center transition-all ${
                    exportScope === tab.id
                      ? 'bg-white/[0.14] border-white/[0.2] text-[#f5f5f7] font-semibold'
                      : 'bg-[#18181b] border-white/[0.06] text-[#86868b] hover:text-[#f5f5f7]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Control 3: Severity Filter */}
          <div className="p-3 rounded-xl bg-[#161618] border border-white/[0.07] space-y-2">
            <label className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider block">
              3. Severity Filter
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'high', label: 'High+' },
                  { id: 'critical', label: 'Critical' },
                ] as const
              ).map((sev) => (
                <button
                  key={sev.id}
                  type="button"
                  onClick={() => setFilterSeverity(sev.id)}
                  className={`py-2 px-1 rounded-lg border text-center transition-all ${
                    filterSeverity === sev.id
                      ? 'bg-white/[0.14] border-white/[0.2] text-[#f5f5f7] font-semibold'
                      : 'bg-[#18181b] border-white/[0.06] text-[#86868b] hover:text-[#f5f5f7]'
                  }`}
                >
                  {sev.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button & Live Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="text-xs font-mono text-[#a1a1a6] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#30d158]" />
            <span>
              Ready to compile {filteredIncidents.length} incidents and {filteredEvents.length} security events into RFC-compliant {exportFormat.toUpperCase()}.
            </span>
          </div>

          <button
            type="button"
            data-testid="export-telemetry-btn"
            onClick={handleExportTelemetryReport}
            disabled={isExporting}
            className="py-2.5 px-5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>
              {isExporting
                ? 'Compiling Telemetry Dossier...'
                : `Export ${exportScope.toUpperCase()} (${exportFormat.toUpperCase()})`}
            </span>
          </button>
        </div>

        {/* Success Alert Banner */}
        {lastExportStatus && (
          <div className="p-3 rounded-lg bg-[#30d158]/10 border border-[#30d158]/30 text-xs font-mono text-[#30d158] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{lastExportStatus}</span>
          </div>
        )}
      </div>

      {/* PRE-COMPILED EXECUTIVE & COMPLIANCE REPORTS */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#f5f5f7] uppercase tracking-wider font-mono">
          Executive Dossiers & After-Action Reviews
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {standardReports.map((rep) => (
            <div
              key={rep.id}
              className="apple-card p-5 space-y-3 flex flex-col justify-between border-white/[0.08] hover:border-white/[0.14] transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[#0a84ff]">{rep.id}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-[#a1a1a6] border border-white/[0.06]">
                    {rep.category}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-[#f5f5f7]">{rep.title}</h3>
                <p className="text-xs text-[#a1a1a6] leading-relaxed">{rep.summary}</p>
              </div>

              <div className="space-y-3 pt-3 border-t border-white/[0.06] text-xs font-mono">
                <div className="flex items-center justify-between text-[#86868b] text-[11px]">
                  <span>Author: {rep.author}</span>
                  <span>Date: {rep.date}</span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-[#636366]">EXPORT FORMATS:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadStandardReport(rep, 'json')}
                      className="px-2.5 py-1 text-xs font-medium text-[#f5f5f7] bg-[#18181b] hover:bg-[#242428] border border-white/[0.08] rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <FileJson className="w-3.5 h-3.5 text-[#0a84ff]" />
                      <span>JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadStandardReport(rep, 'csv')}
                      className="px-2.5 py-1 text-xs font-medium text-[#f5f5f7] bg-[#18181b] hover:bg-[#242428] border border-white/[0.08] rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#30d158]" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
