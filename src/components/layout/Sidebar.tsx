import React from 'react';
import {
  Activity,
  ShieldAlert,
  ShieldCheck,
  Bot,
  Network,
  Crosshair,
  Layers,
  Flame,
  Cpu,
  Share2,
  FileText,
  Plug,
  Settings,
  Radar,
  Radio,
  Terminal,
  Lock,
  Globe,
  Sword,
  Swords,
  Server,
  Landmark,
  Zap,
  Building2,
} from 'lucide-react';
import { useTheme } from '../../core/theme-context';

interface SidebarProps {
  currentModule: string;
  onSelectModule: (moduleId: string) => void;
  activeIncidentsCount: number;
  activeAgentsCount: number;
  liveAttacksCount?: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number | null;
  alert?: boolean;
}

interface SidebarGroup {
  group: string;
  items: SidebarItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  activeIncidentsCount,
  activeAgentsCount,
  liveAttacksCount = 0,
  collapsed,
  onToggleCollapse,
}) => {
  const moduleGroups: SidebarGroup[] = [
    {
      group: 'HF-CDF GLOBAL · 3 COMMAND PLANES',
      items: [
        { id: 'global-command', label: '1. Global Command HQ', icon: Globe, count: 6 },
        { id: 'customer-command', label: '2. Customer Command Portal', icon: Building2, count: null },
        { id: 'soc-command', label: '3. SOC Operations Command', icon: ShieldCheck, count: null },
      ],
    },
    {
      group: 'SOVEREIGN AI & WAR ROOM',
      items: [
        { id: 'enterprise-defense', label: 'Inter-Company Defense & Soldiers', icon: Swords, count: 10, alert: true },
        { id: 'model-warfare', label: 'Model Warfare & Training', icon: Swords, count: 5, alert: true },
        { id: 'war-room', label: 'War Room Cockpit', icon: Radio, count: null },
        { id: 'agent-barracks', label: 'Agent War Room & Barracks', icon: Sword, count: 8 },
        { id: 'model-vault', label: 'Model Weights Vault', icon: Lock, count: null },
      ],
    },
    {
      group: 'COMMAND & OPERATING SYSTEM',
      items: [
        { id: 'command-center', label: 'Command Center', icon: Activity, count: null },
        {
          id: 'live-ops',
          label: 'Live Ops, Attacks & News',
          icon: Radio,
          count: liveAttacksCount > 0 ? liveAttacksCount : null,
          alert: liveAttacksCount > 0,
        },
        { id: 'os-compiler', label: 'OS & Compiler Engine', icon: Terminal, count: null },
        { id: 'ontology-fusion', label: 'Ontology & Fusion Core', icon: Network, count: null },
        { id: 'live-attack-map', label: 'Live Attack Map & Combat', icon: Globe, count: 2, alert: true },
        { id: 'red-force', label: 'Red Force', icon: Crosshair, count: null },
        { id: 'blue-force', label: 'Blue Force', icon: ShieldCheck, count: null },
        {
          id: 'incidents',
          label: 'Incident Management',
          icon: ShieldAlert,
          count: activeIncidentsCount > 0 ? activeIncidentsCount : null,
          alert: activeIncidentsCount > 0,
        },
      ],
    },
    {
      group: 'AGENT & SWARM',
      items: [
        { id: 'agent-trust', label: 'Agent Trust & Gateway', icon: Lock, count: null },
        { id: 'civic-governance', label: 'Civic Governance & Integrity', icon: Landmark, count: null },
        { id: 'agents', label: 'Agent Intelligence', icon: Cpu, count: activeAgentsCount },
        { id: 'orchestration', label: 'Agent Orchestration', icon: Layers, count: null },
        { id: 'shared-intel', label: 'Shared Intelligence', icon: Share2, count: null },
      ],
    },
    {
      group: 'THREAT & NETWORK',
      items: [
        { id: 'threat-intel', label: 'Threat Intelligence', icon: Radar, count: null },
        { id: 'network-observatory', label: 'Network Observatory', icon: Network, count: null },
        { id: 'simulation-lab', label: 'Simulation Laboratory', icon: Flame, count: null },
      ],
    },
    {
      group: 'GLOBAL GEOPOLITICAL & ORBITAL',
      items: [
        { id: 'satellite-grid', label: 'Global Satellite Grid', icon: Globe, count: null },
        { id: 'sovereign-mesh', label: 'Sovereign Enclave Mesh', icon: Server, count: null },
        { id: 'cable-observatory', label: 'Undersea Cable Observatory', icon: Network, count: null },
        { id: 'financial-defense', label: 'Financial Clearing Shield', icon: Landmark, count: null },
        { id: 'infrastructure-superclusters', label: 'GPU Superclusters & Power', icon: Zap, count: null },
      ],
    },
    {
      group: 'STRATEGY & OPS',
      items: [
        { id: 'mission-control', label: 'Mission Control', icon: Radio, count: null },
        { id: 'analytics', label: 'Analytics & Performance', icon: Cpu, count: null },
        { id: 'reports', label: 'Reports & Export', icon: FileText, count: null },
        { id: 'integrations', label: 'Integrations & Hub', icon: Plug, count: null },
        { id: 'administration', label: 'Administration & RBAC', icon: Settings, count: null },
      ],
    },
    {
      group: 'DEVELOPER & PLATFORM OPS',
      items: [
        { id: 'developer-workbench', label: 'Developer Workbench', icon: Terminal, count: null },
      ],
    },
  ];

  useTheme();

  return (
    <aside
      className={`relative shrink-0 flex flex-col justify-between border-r border-white/[0.08] bg-[#0a0a0c]/88 backdrop-blur-2xl transition-all duration-300 select-none font-sans ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-end p-3.5 border-b border-white/[0.06]">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-[#86868b] hover:text-[#f5f5f7] rounded-lg hover:bg-white/[0.06] transition-colors mx-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        {moduleGroups.map((grp) => (
          <div key={grp.group} className="space-y-0.5">
            {!collapsed && (
              <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
                {grp.group}
              </div>
            )}
            {grp.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectModule(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white/[0.11] text-[#f5f5f7] font-semibold shadow-sm'
                      : 'text-[#a1a1a6] hover:text-[#f5f5f7] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-[#0a84ff]' : 'text-[#86868b]'
                      }`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!collapsed && item.count !== null && (
                    <span
                      className={`font-mono text-[10px] tabular-nums px-1.5 py-0.5 rounded-md font-medium ${
                        item.alert
                          ? 'bg-[#ff453a]/15 text-[#ff6961] border border-[#ff453a]/30'
                          : 'bg-white/[0.07] text-[#d1d1d6] border border-white/[0.08]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Operator Profile */}
      <div className="p-3.5 border-t border-white/[0.08] bg-[#0c0c0e]/90">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 text-xs">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0 bg-gradient-to-br from-[#0a84ff] to-[#0055b3]"
            >
              AC
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-[#f5f5f7] truncate">Authorized Commander</div>
              <div className="text-[10px] text-[#86868b] truncate">
                Sovereign OS · Level-5 Clearance
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-[11px] shadow-sm bg-gradient-to-br from-[#0a84ff] to-[#0055b3]"
            >
              AC
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
