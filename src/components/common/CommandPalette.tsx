import React, { useState, useEffect } from 'react';
import { Search, Zap, ShieldAlert, Cpu, Network, Layers, FileText, Settings, X } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModule: (moduleId: string) => void;
  onInjectEvent: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectModule,
  onInjectEvent,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands = [
    { id: 'cmd-center', label: 'Command Center · Executive KPIs, WebSocket Threat Feed & Radar', module: 'command-center', icon: Zap },
    { id: 'cmd-live-ops', label: 'Live Ops & News · Active Attacks, Live Bulletins & AI Defense', module: 'live-ops', icon: ShieldAlert },
    { id: 'cmd-agent-trust', label: 'Agent Trust & Gateway · SPIFFE Identities, 10-Gate Policy & Interception', module: 'agent-trust', icon: ShieldAlert },
    { id: 'cmd-civic-governance', label: 'Civic Governance & Integrity · Public Services, SHA-256 Provenance & Compliance', module: 'civic-governance', icon: FileText },
    { id: 'cmd-os-compiler', label: 'OS & Compiler Engine · Polyglot Execution & Host Kernel', module: 'os-compiler', icon: Layers },
    { id: 'cmd-ontology-fusion', label: 'Ontology & Fusion Core · Unified Graph, CISA KEV & AIP', module: 'ontology-fusion', icon: Network },
    { id: 'cmd-attack-map', label: 'Live Attack Map & Combat Theater · Global Threat Radar & Bank Defense', module: 'live-attack-map', icon: ShieldAlert },
    { id: 'cmd-war-room', label: 'War Room Cockpit · Global InfiniBand Supercluster Mesh', module: 'war-room', icon: Zap },
    { id: 'cmd-model-vault', label: 'Model Weights Vault · $145B+ Sovereign Shard Attestation', module: 'model-vault', icon: ShieldAlert },
    { id: 'cmd-incidents', label: 'Incident Management · Review Active Incidents', module: 'incidents', icon: ShieldAlert },
    { id: 'cmd-red', label: 'Red Force · Run Adversarial Simulation', module: 'red-force', icon: ShieldAlert },
    { id: 'cmd-blue', label: 'Blue Force · Defensive Containment Matrix', module: 'blue-force', icon: ShieldAlert },
    { id: 'cmd-agents', label: 'Agent Intelligence · Inspect Swarm Health', module: 'agents', icon: Cpu },
    { id: 'cmd-orchestration', label: 'Agent Orchestration · View Multi-Agent DAG', module: 'orchestration', icon: Layers },
    { id: 'cmd-threat', label: 'Threat Intelligence · Indicators of Compromise', module: 'threat-intel', icon: Search },
    { id: 'cmd-satellite', label: 'Global Satellite Grid · Military Recon & Orbital QKD', module: 'satellite-grid', icon: Zap },
    { id: 'cmd-sovereign', label: 'Sovereign Enclave Mesh · FedRAMP High, NIS2 & Cross-Border Vaults', module: 'sovereign-mesh', icon: ShieldAlert },
    { id: 'cmd-cables', label: 'Undersea Cable Observatory · Transoceanic Dark-Fiber & DWDM Monitoring', module: 'cable-observatory', icon: Network },
    { id: 'cmd-financial', label: 'Financial Clearing Shield · Fedwire, SWIFT & TARGET2 Sovereign Rail Defense', module: 'financial-defense', icon: ShieldAlert },
    { id: 'cmd-infrastructure', label: 'GPU Superclusters & Power · 368K Accelerators, Liquid Cooling & Tamper Bus', module: 'infrastructure-superclusters', icon: Cpu },
    { id: 'cmd-developer', label: 'Developer Workbench · CLI Terminal & Rule Engine', module: 'developer-workbench', icon: Settings },
    { id: 'cmd-reports', label: 'Reports · Export Post-Mortems & AARs', module: 'reports', icon: FileText },
    { id: 'cmd-admin', label: 'Administration · Roles, Policies & Audit', module: 'administration', icon: Settings },
  ];

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl border border-white/[0.14] bg-[#161618]/95 backdrop-blur-2xl shadow-2xl overflow-hidden space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08]">
          <Search className="w-4 h-4 text-[#0a84ff] shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or jump to module..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#f5f5f7] placeholder-[#6e6e73] focus:outline-none font-mono"
          />
          <button
            onClick={onClose}
            className="p-1 text-[#86868b] hover:text-[#f5f5f7] rounded-lg"
            aria-label="Close command palette"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          <div className="px-3 py-1 text-[10px] font-mono text-[#86868b] uppercase tracking-wider">
            Quick Actions & Navigation
          </div>

          <button
            onClick={() => {
              onInjectEvent();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono text-[#2997ff] hover:bg-white/[0.08] rounded-xl text-left transition-colors"
          >
            <Zap className="w-4 h-4 text-[#0a84ff] shrink-0" />
            <span>Simulate Synthetic Telemetry Probe (Red Lab)</span>
          </button>

          {filtered.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={() => {
                  onSelectModule(cmd.module);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono text-[#d1d1d6] hover:text-[#f5f5f7] hover:bg-white/[0.08] rounded-xl text-left transition-colors"
              >
                <Icon className="w-4 h-4 text-[#86868b] shrink-0" />
                <span>{cmd.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-2.5 px-4 bg-[#101012] border-t border-white/[0.08] flex items-center justify-between text-[11px] text-[#86868b] font-mono">
          <span>Navigation: Arrow Keys</span>
          <span>Select: Enter · Close: ESC</span>
        </div>
      </div>
    </div>
  );
};
