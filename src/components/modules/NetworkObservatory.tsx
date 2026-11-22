import React, { useState } from 'react';
import {
  Network,
  Shield,
  Server,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
} from 'lucide-react';
import { NetworkNode } from '../../core/types';
import { sound } from '../../core/sound-fx';

interface NetworkObservatoryProps {
  nodes: NetworkNode[];
  onToggleIsolation: (nodeId: string) => Promise<any>;
}

export const NetworkObservatory: React.FC<NetworkObservatoryProps> = ({
  nodes,
  onToggleIsolation,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(nodes[0]?.id || '');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [isToggling, setIsToggling] = useState(false);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const filteredNodes = nodes.filter((n) =>
    filterZone === 'all' ? true : n.zone === filterZone
  );

  const handleToggle = async () => {
    if (!selectedNode) return;
    setIsToggling(true);
    sound.play('lock');
    try {
      await onToggleIsolation(selectedNode.id);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2.5">
            <Network className="w-5 h-5 text-[#0071e3]" />
            <span>Network Observatory & Topology Infrastructure</span>
          </h1>
          <p className="text-xs text-[#86868b] mt-0.5">
            Real-time infrastructure zone mapping, telemetry ingress/egress, and host quarantine controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-xl text-white font-medium focus:outline-none focus:ring-1 focus:ring-[#0071e3]"
          >
            <option value="all" className="bg-[#121216] text-white">All Enclave Zones</option>
            <option value="external_dmz" className="bg-[#121216] text-white">External DMZ</option>
            <option value="ingress_cluster" className="bg-[#121216] text-white">Ingress Cluster</option>
            <option value="app_workloads" className="bg-[#121216] text-white">App Workloads</option>
            <option value="database_tier" className="bg-[#121216] text-white">Database Tier</option>
            <option value="isolated_vault" className="bg-[#121216] text-white">Isolated Vault</option>
          </select>
        </div>
      </div>

      {/* Visual Network Topology Canvas */}
      <div className="relative apple-card overflow-hidden p-6 min-h-[360px] flex flex-col justify-between">
        {/* Topology Background Graphic */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <img
            src="/src/assets/images/network_threat_topology_1793863607029.jpg"
            alt="Infrastructure Topology Graph"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover filter contrast-125"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Topology Nodes Grid Overlay */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredNodes.map((node) => {
            const isSelected = node.id === selectedNodeId;
            return (
              <div
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2.5 backdrop-blur-md ${
                  isSelected
                    ? 'border-[#0071e3]/60 bg-white/[0.08] shadow-sm ring-1 ring-[#0071e3]/40'
                    : node.status === 'isolated'
                    ? 'border-[#ff453a]/40 bg-[#ff453a]/10'
                    : node.status === 'compromised'
                    ? 'border-[#ff9f0a]/40 bg-[#ff9f0a]/10'
                    : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white truncate max-w-[150px]">{node.name}</span>
                  <span
                    className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-medium ${
                      node.status === 'healthy'
                        ? 'bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30'
                        : node.status === 'isolated'
                        ? 'bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/30'
                        : 'bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30'
                    }`}
                  >
                    {node.status}
                  </span>
                </div>

                <div className="text-xs font-mono text-white/80">{node.ip}</div>

                <div className="flex items-center justify-between text-xs text-[#86868b] pt-2 border-t border-white/[0.06]">
                  <span className="capitalize">Zone: {node.zone.replace('_', ' ')}</span>
                  <span>Vulns: <strong className="text-white font-mono">{node.vulnerabilitiesCount}</strong></span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative z-10 pt-4 flex items-center justify-between text-xs text-[#86868b] border-t border-white/[0.06]">
          <span>TOPOLOGY RADAR: CONTINUOUS SYNTHETIC MESH MONITORING</span>
          <span className="font-mono text-white/80">PORTS INSPECTED: 80, 443, 6379, 8000, 50051</span>
        </div>
      </div>

      {/* Selected Node Inspector & Quarantine Action */}
      {selectedNode && (
        <div className="apple-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div>
              <div className="text-xs font-medium text-[#86868b] tracking-wider uppercase">HOST INSPECTION FILE</div>
              <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2 mt-0.5">
                <Server className="w-5 h-5 text-[#0071e3]" />
                <span>{selectedNode.name}</span>
              </h3>
              <div className="text-xs text-[#86868b] font-mono mt-1">
                IP: <span className="text-white">{selectedNode.ip}</span> · Zone: <span className="text-white uppercase">{selectedNode.zone.replace('_', ' ')}</span>
              </div>
            </div>

            <button
              onClick={handleToggle}
              disabled={isToggling}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
                selectedNode.status === 'isolated'
                  ? 'bg-[#30d158] hover:bg-[#28b84d] text-white shadow-sm'
                  : 'bg-[#ff453a] hover:bg-[#d9382e] text-white shadow-sm'
              }`}
            >
              {selectedNode.status === 'isolated' ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Restore Host Connectivity</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Isolate & Quarantine Host</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1">
              <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold">ASSIGNED DEFENSE AGENT</div>
              <div className="text-sm font-semibold text-white">
                {selectedNode.agentAssigned || 'General Sentry'}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1">
              <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold">ACTIVE OPEN PORTS</div>
              <div className="text-sm font-semibold font-mono text-white">
                {selectedNode.openPorts.join(', ')}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1">
              <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold">KNOWN CVE VULNERABILITIES</div>
              <div className="text-sm font-semibold text-[#ff9f0a]">
                {selectedNode.vulnerabilitiesCount} CVEs Tracked
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
