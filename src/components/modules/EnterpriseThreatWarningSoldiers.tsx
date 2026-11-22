import React, { useState } from 'react';
import {
  ShieldAlert,
  Send,
  Sword,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Flame,
  Radio,
  Lock,
  Zap,
  Terminal,
  Activity,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Layers,
  ExternalLink,
  Cpu,
  UserCheck,
} from 'lucide-react';
import {
  CompanyProfile,
  EnterpriseThreatDispatch,
  VirtualSoldierUnit,
} from '../../core/types';
import {
  createEnterpriseThreatDispatch,
  deployVirtualSoldiers,
  PRESET_ATTACK_SCENARIOS,
  TOP_TECH_COMPANIES,
  transmitThreatWarning,
  VIRTUAL_SOLDIER_ROSTER,
} from '../../core/enterprise-defense-utils';

interface EnterpriseThreatWarningSoldiersProps {
  onNotify?: (message: string, type: 'success' | 'alert' | 'info') => void;
}

export const EnterpriseThreatWarningSoldiers: React.FC<EnterpriseThreatWarningSoldiersProps> = ({
  onNotify,
}) => {
  // Directory & active target state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('comp-huggingface');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('scenario-openai-huggingface');
  const [sectorFilter, setSectorFilter] = useState<string>('all');

  // Form inputs for detailed attack dispatch
  const initialPreset = PRESET_ATTACK_SCENARIOS[0];
  const [attackingEntity, setAttackingEntity] = useState(initialPreset.sourceAttackingEntity);
  const [targetAsset, setTargetAsset] = useState(initialPreset.targetAsset);
  const [attackVector, setAttackVector] = useState(initialPreset.attackVector);
  const [mitreTechnique, setMitreTechnique] = useState(initialPreset.mitreTechnique);
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium'>(initialPreset.severity);
  const [sourceIps, setSourceIps] = useState(initialPreset.sourceIps.join(', '));
  const [technicalDetails, setTechnicalDetails] = useState(initialPreset.technicalDetails);
  const [preventionSteps, setPreventionSteps] = useState(initialPreset.actionablePreventionSteps.join('\n'));

  // Selected virtual soldiers to deploy
  const [selectedSoldierIds, setSelectedSoldierIds] = useState<string[]>([
    'soldier-sentinel-zero',
    'soldier-valkyrie-enforcer',
    'soldier-cipher-weightguard',
  ]);

  // Active Dispatches List
  const [dispatches, setDispatches] = useState<EnterpriseThreatDispatch[]>([
    createEnterpriseThreatDispatch({
      targetCompanyId: 'comp-huggingface',
      attackingEntity: 'OpenAI Autonomous Red-Agent Swarm Alpha (Simulated Divergent Weights Probe)',
      targetAsset: 'huggingface.co/models/safetensors-primary-vault/shard-0001.safetensors',
      attackVector: 'T1195.002 Supply Chain Poisoning & High-Speed Shard Exfiltration',
      mitreTechnique: 'T1195.002 · Compromise Software Dependencies',
      severity: 'critical',
      technicalDetails:
        'Autonomous rogue agent cluster launched automated pull-request tensor injection against 70B parameter safetensors shard. Concurrently opened multi-threaded TLS 1.3 egress connections attempting to exfiltrate proprietary model weights to external ASN 41382 bulletproof proxies.',
      actionablePreventionSteps: [
        '1. Immediately revoke active Hugging Face API access tokens associated with automated CI/CD runners.',
        '2. Enforce hardware-attested Merkle tree checksums on all safetensors shards before allowing downloads.',
        '3. Block egress network traffic targeting external ASN 41382 and IP range 194.26.29.0/24.',
        '4. Deploy HF-CDF Virtual Soldiers (Sentinel-Zero and Valkyrie-Enforcer) to establish an impenetrable defensive perimeter.',
      ],
    }),
  ]);

  const [activeDispatchId, setActiveDispatchId] = useState<string>(dispatches[0].id);
  const [isTransmittingAlert, setIsTransmittingAlert] = useState(false);
  const [isDeployingSoldiers, setIsDeployingSoldiers] = useState(false);

  const selectedCompany = TOP_TECH_COMPANIES.find((c) => c.id === selectedCompanyId) || TOP_TECH_COMPANIES[0];
  const activeDispatch = dispatches.find((d) => d.id === activeDispatchId) || dispatches[0];

  // Filter companies by sector
  const filteredCompanies = TOP_TECH_COMPANIES.filter((comp) => {
    if (sectorFilter === 'all') return true;
    if (sectorFilter === 'model_hubs') return comp.sector === 'AI Model Hub' || comp.sector === 'Frontier LLM Provider';
    if (sectorFilter === 'cloud') return comp.sector === 'Hyperscale Cloud' || comp.sector === 'Hardware & Foundry';
    if (sectorFilter === 'secops') return comp.sector === 'SecOps & EDR' || comp.sector === 'Edge & CDN';
    return true;
  });

  // Handle switching preset scenarios
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = PRESET_ATTACK_SCENARIOS.find((p) => p.id === presetId);
    if (!preset) return;

    setSelectedCompanyId(preset.targetCompanyId);
    setAttackingEntity(preset.sourceAttackingEntity);
    setTargetAsset(preset.targetAsset);
    setAttackVector(preset.attackVector);
    setMitreTechnique(preset.mitreTechnique);
    setSeverity(preset.severity);
    setSourceIps(preset.sourceIps.join(', '));
    setTechnicalDetails(preset.technicalDetails);
    setPreventionSteps(preset.actionablePreventionSteps.join('\n'));

    // Create or select dispatch
    const newDispatch = createEnterpriseThreatDispatch({
      targetCompanyId: preset.targetCompanyId,
      attackingEntity: preset.sourceAttackingEntity,
      targetAsset: preset.targetAsset,
      attackVector: preset.attackVector,
      mitreTechnique: preset.mitreTechnique,
      severity: preset.severity,
      sourceIps: preset.sourceIps,
      technicalDetails: preset.technicalDetails,
      actionablePreventionSteps: preset.actionablePreventionSteps,
    });

    setDispatches((prev) => [newDispatch, ...prev]);
    setActiveDispatchId(newDispatch.id);
  };

  // Toggle soldier selection
  const handleToggleSoldier = (soldierId: string) => {
    setSelectedSoldierIds((prev) =>
      prev.includes(soldierId) ? prev.filter((id) => id !== soldierId) : [...prev, soldierId]
    );
  };

  // Action 1: Transmit Prevention Alert to Company
  const handleTransmitPreventionAlert = () => {
    if (!activeDispatch) return;
    setIsTransmittingAlert(true);

    setTimeout(() => {
      const updated = transmitThreatWarning(activeDispatch);
      setDispatches((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setIsTransmittingAlert(false);
      if (onNotify) {
        onNotify(
          `Live attack prevention details cryptographically transmitted to ${selectedCompany.name} (${selectedCompany.securityContact})!`,
          'success'
        );
      }
    }, 600);
  };

  // Action 2: Deploy Virtual Soldiers Swarm
  const handleDeployVirtualSoldiers = () => {
    if (!activeDispatch || selectedSoldierIds.length === 0) return;
    setIsDeployingSoldiers(true);

    setTimeout(() => {
      const updated = deployVirtualSoldiers(activeDispatch, selectedSoldierIds);
      setDispatches((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setIsDeployingSoldiers(false);
      if (onNotify) {
        onNotify(
          `Virtual Soldiers successfully deployed to defend ${selectedCompany.name}! Attacking agent swarm neutralized.`,
          'success'
        );
      }
    }, 900);
  };

  return (
    <div
      data-testid="enterprise-threat-warning-soldiers"
      className="space-y-6"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <h1 className="text-xl font-bold text-[#f5f5f7] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#ff453a]" />
            <span>Inter-Enterprise Threat Warning & Virtual Soldier Swarm Defense</span>
          </h1>
          <p className="text-xs text-[#a1a1a6] mt-0.5">
            Warn top frontier AI & tech enterprises with full real-world attacking telemetry to prevent attacks, then deploy autonomous Virtual Soldier squads to neutralize rogue agents.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-[#0a84ff]/10 text-[#0a84ff] border border-[#0a84ff]/30 font-semibold">
            CDF ALLIANCE ACTIVE
          </span>
          <span className="text-[#86868b]">10 ENTERPRISES MONITORED</span>
        </div>
      </div>

      {/* QUICK PRESET SCENARIO BUTTONS (INCLUDING EXACT USER SCENARIO: OPENAI AGENTS ATTACKING HUGGING FACE) */}
      <div className="apple-card p-4 space-y-3 bg-[#111113]/90 border-white/[0.08]">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#86868b] uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#ffd60a]" /> Quick Scenario Presets:
          </span>
          <span className="text-[#636366]">Click to auto-populate attack telemetry & targets</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {PRESET_ATTACK_SCENARIOS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset.id)}
              className={`p-2.5 rounded-xl border text-left transition-all font-mono text-xs flex flex-col justify-between space-y-1.5 ${
                selectedPresetId === preset.id
                  ? 'bg-[#0a84ff]/15 border-[#0a84ff]/40 text-[#f5f5f7] shadow-sm'
                  : 'bg-[#161618] border-white/[0.06] text-[#a1a1a6] hover:text-[#f5f5f7] hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-white/[0.06] text-[#64d2ff]">
                  {preset.severity}
                </span>
                {selectedPresetId === preset.id && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158]" />
                )}
              </div>
              <span className="font-semibold text-xs leading-snug line-clamp-2">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKBENCH: ENTERPRISE DIRECTORY & ATTACK DISPATCH FORM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: TOP COMPANIES DIRECTORY (4 COLS) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="apple-card p-4 space-y-3 border-white/[0.08]">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[#f5f5f7]">
                <Building2 className="w-4 h-4 text-[#0a84ff]" />
                <span>Top Enterprises Directory</span>
              </div>
              <span className="text-[11px] font-mono text-[#86868b]">
                {TOP_TECH_COMPANIES.length} Hubs
              </span>
            </div>

            {/* Sector Filter Bar */}
            <div className="flex items-center gap-1 text-[10px] font-mono p-1 rounded-lg bg-[#18181b] border border-white/[0.06]">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'model_hubs', label: 'AI/LLM' },
                  { id: 'cloud', label: 'Cloud' },
                  { id: 'secops', label: 'SecOps' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSectorFilter(tab.id)}
                  className={`flex-1 py-1 rounded text-center transition-colors ${
                    sectorFilter === tab.id
                      ? 'bg-white/[0.12] text-[#f5f5f7] font-semibold'
                      : 'text-[#86868b] hover:text-[#f5f5f7]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Companies List */}
            <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
              {filteredCompanies.map((comp) => {
                const isSelected = selectedCompanyId === comp.id;
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => {
                      setSelectedCompanyId(comp.id);
                      setTargetAsset(`${comp.domain}/api/v1/core-infrastructure`);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all font-mono flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#18181b] border-[#0a84ff]/50 shadow-md ring-1 ring-[#0a84ff]/30'
                        : 'bg-[#141416] border-white/[0.06] hover:bg-[#1a1a1e] text-[#a1a1a6]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: comp.logoColor }}
                      />
                      <div>
                        <div className="text-xs font-semibold text-[#f5f5f7] flex items-center gap-1.5">
                          <span>{comp.name}</span>
                          {comp.id === 'comp-huggingface' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#ffd21e]/10 text-[#ffd21e] border border-[#ffd21e]/30">
                              TARGET HUB
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#86868b]">{comp.domain}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                          comp.allianceStatus === 'Under Active Attack'
                            ? 'bg-[#ff453a]/15 text-[#ff6961] border border-[#ff453a]/30 animate-pulse'
                            : comp.allianceStatus === 'Shielded by CDF'
                            ? 'bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30'
                            : 'bg-white/[0.06] text-[#a1a1a6]'
                        }`}
                      >
                        {comp.allianceStatus === 'Under Active Attack' ? 'ATTACKED' : 'PARTNER'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REAL-WORLD ATTACK TELEMETRY DISPATCH & VIRTUAL SOLDIERS (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="apple-card p-5 space-y-4 border-white/[0.08] bg-[#111113]/90">
            {/* Header / Active Target Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-[#86868b] uppercase tracking-wider font-semibold">
                  Recipient Enterprise & Warning Dispatch Target:
                </span>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#f5f5f7] flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full inline-block"
                      style={{ backgroundColor: selectedCompany.logoColor }}
                    />
                    <span>{selectedCompany.name}</span>
                  </h2>
                  <span className="text-xs font-mono text-[#86868b]">
                    ({selectedCompany.domain})
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-[#86868b]">DISPATCH STATUS:</span>
                <span
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] uppercase ${
                    activeDispatch.status === 'neutralized'
                      ? 'bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30'
                      : activeDispatch.status === 'transmitted'
                      ? 'bg-[#0a84ff]/15 text-[#64d2ff] border border-[#0a84ff]/30'
                      : 'bg-[#ff453a]/15 text-[#ff6961] border border-[#ff453a]/30'
                  }`}
                >
                  {activeDispatch.status === 'neutralized'
                    ? 'SOLDIERS ENGAGED & NEUTRALIZED'
                    : activeDispatch.status === 'transmitted'
                    ? 'WARNING TRANSMITTED'
                    : 'ATTACK IMMINENT'}
                </span>
              </div>
            </div>

            {/* FORM: FULL ATTACK TELEMETRY DETAILS */}
            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Attacking Threat Entity */}
                <div className="space-y-1">
                  <label className="text-[11px] text-[#86868b] font-semibold flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-[#ff453a]" />
                    <span>Attacking Entity / Rogue Agent Swarm</span>
                  </label>
                  <input
                    type="text"
                    value={attackingEntity}
                    onChange={(e) => setAttackingEntity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-white/[0.08] text-[#f5f5f7] focus:border-[#0a84ff] focus:outline-none"
                    placeholder="e.g. OpenAI Autonomous Red-Agent Swarm Alpha"
                  />
                </div>

                {/* Target Asset / Weight Shard */}
                <div className="space-y-1">
                  <label className="text-[11px] text-[#86868b] font-semibold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#ffd60a]" />
                    <span>Target Asset URI & Model Shard</span>
                  </label>
                  <input
                    type="text"
                    value={targetAsset}
                    onChange={(e) => setTargetAsset(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-white/[0.08] text-[#f5f5f7] focus:border-[#0a84ff] focus:outline-none"
                    placeholder="huggingface.co/models/safetensors-primary-vault"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Attack Vector */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] text-[#86868b] font-semibold">
                    Attack Vector & MITRE Technique
                  </label>
                  <input
                    type="text"
                    value={attackVector}
                    onChange={(e) => setAttackVector(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-white/[0.08] text-[#f5f5f7] focus:border-[#0a84ff] focus:outline-none"
                  />
                </div>

                {/* Severity */}
                <div className="space-y-1">
                  <label className="text-[11px] text-[#86868b] font-semibold">Severity Level</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-white/[0.08] text-[#f5f5f7] focus:border-[#0a84ff] focus:outline-none"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                  </select>
                </div>
              </div>

              {/* Source IPs & Bulletproof ASNs */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#86868b] font-semibold">
                  Source Attacking IPs & Transit ASNs
                </label>
                <input
                  type="text"
                  value={sourceIps}
                  onChange={(e) => setSourceIps(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-white/[0.08] text-[#f5f5f7] focus:border-[#0a84ff] focus:outline-none"
                  placeholder="194.26.29.112 (ASN 41382), 185.220.101.47"
                />
              </div>

              {/* Full Technical Details */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#86868b] font-semibold">
                  Real-World Attack Telemetry & Exploit Mechanism
                </label>
                <textarea
                  rows={3}
                  value={technicalDetails}
                  onChange={(e) => setTechnicalDetails(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-white/[0.08] text-[#f5f5f7] focus:border-[#0a84ff] focus:outline-none leading-relaxed"
                />
              </div>

              {/* Actionable Prevention Steps to Send */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#30d158] font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Actionable Prevention Steps Sent to {selectedCompany.name} to Thwart Attack</span>
                </label>
                <textarea
                  rows={3}
                  value={preventionSteps}
                  onChange={(e) => setPreventionSteps(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-white/[0.08] text-[#a1a1a6] focus:border-[#0a84ff] focus:outline-none leading-relaxed text-[11px]"
                />
              </div>
            </div>

            {/* ACTION 1: SEND PREVENTION ALERT BUTTON */}
            <div className="p-3.5 rounded-xl bg-[#161618] border border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-mono text-[#a1a1a6] space-y-0.5">
                <div className="text-[#f5f5f7] font-semibold flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-[#0a84ff]" />
                  <span>Step 1: Dispatch Emergency Prevention Telemetry</span>
                </div>
                <div>
                  Recipient: <span className="text-[#64d2ff]">{selectedCompany.securityContact}</span> · Inter-Enterprise Rail (TLS 1.3 / Dilithium-3 Signed)
                </div>
              </div>

              <button
                type="button"
                data-testid="send-prevention-alert-btn"
                onClick={handleTransmitPreventionAlert}
                disabled={isTransmittingAlert}
                className="py-2 px-4 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isTransmittingAlert
                    ? 'Transmitting Signed Alert...'
                    : `Send Prevention Alert to ${selectedCompany.name}`}
                </span>
              </button>
            </div>

            {/* ACTION 2: VIRTUAL SOLDIERS SELECTION & DEPLOYMENT */}
            <div className="p-4 rounded-xl bg-[#141417] border border-white/[0.09] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                <div className="space-y-0.5">
                  <div className="text-xs font-mono font-semibold text-[#f5f5f7] flex items-center gap-1.5">
                    <Sword className="w-4 h-4 text-[#ffd60a]" />
                    <span>Step 2: Deploy Virtual Soldiers Swarm to Protect {selectedCompany.name}</span>
                  </div>
                  <p className="text-[11px] text-[#a1a1a6]">
                    Select autonomous soldier units to dispatch directly to {selectedCompany.name}'s infrastructure to intercept attacking agents.
                  </p>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-[#ffd60a] border border-[#ffd60a]/30 font-semibold">
                  {selectedSoldierIds.length} SOLDIERS READY
                </span>
              </div>

              {/* Soldiers Squad Roster Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 font-mono">
                {VIRTUAL_SOLDIER_ROSTER.map((soldier) => {
                  const isChecked = selectedSoldierIds.includes(soldier.id);
                  return (
                    <div
                      key={soldier.id}
                      onClick={() => handleToggleSoldier(soldier.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all text-xs space-y-1.5 select-none ${
                        isChecked
                          ? 'bg-[#18181b] border-[#30d158]/50 ring-1 ring-[#30d158]/30 shadow-sm'
                          : 'bg-[#121214] border-white/[0.05] text-[#86868b] hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-[#30d158]" />
                          <span>{soldier.codeName}</span>
                        </span>
                        <span className="text-[10px] text-[#30d158] font-semibold">
                          PWR: {soldier.combatPower}%
                        </span>
                      </div>
                      <p className="text-[10px] text-[#a1a1a6] line-clamp-2 leading-relaxed">
                        {soldier.specialty}
                      </p>
                      <div className="text-[9px] text-[#636366] truncate">
                        Armor: {soldier.armorType}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Deploy Soldiers Action Trigger */}
              <button
                type="button"
                data-testid="deploy-virtual-soldiers-btn"
                onClick={handleDeployVirtualSoldiers}
                disabled={isDeployingSoldiers || selectedSoldierIds.length === 0}
                className="w-full py-2.5 px-4 rounded-xl bg-[#30d158] hover:bg-[#34c759] text-black text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#30d158]/10 disabled:opacity-50"
              >
                <Sword className="w-4 h-4" />
                <span>
                  {isDeployingSoldiers
                    ? `Deploying Swarm Soldiers to ${selectedCompany.name}...`
                    : `Deploy ${selectedSoldierIds.length} Virtual Soldiers to Defend ${selectedCompany.name}`}
                </span>
              </button>
            </div>

            {/* COMBAT & NEUTRALIZATION OUTCOME REPORT */}
            {activeDispatch.status === 'neutralized' && activeDispatch.acknowledgmentReceipt && (
              <div
                data-testid="combat-neutralization-success"
                className="p-4 rounded-xl bg-[#30d158]/10 border border-[#30d158]/40 space-y-3 font-mono"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#30d158]/20">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#30d158]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>ATTACK INTERCEPTED & NEUTRALIZED BY VIRTUAL SOLDIERS</span>
                  </div>
                  <span className="text-[10px] text-[#a1a1a6]">
                    Penetration: 0% · Shards Attested
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#0e1410] border border-[#30d158]/20 text-xs space-y-1.5">
                  <div className="text-[11px] text-[#86868b] uppercase font-semibold">
                    Official Acknowledgment Receipt from {selectedCompany.name}:
                  </div>
                  <p className="text-xs text-[#d1d1d6] leading-relaxed italic">
                    "{activeDispatch.acknowledgmentReceipt.responseMessage}"
                  </p>
                  <div className="text-[10px] text-[#30d158] pt-1">
                    Confirmed by: {activeDispatch.acknowledgmentReceipt.receivedBy} (
                    {new Date(activeDispatch.acknowledgmentReceipt.timestamp).toLocaleTimeString()} UTC)
                  </div>
                </div>

                {/* Soldiers Action Log */}
                <div className="space-y-1 text-[11px]">
                  <span className="text-[10px] text-[#86868b] uppercase">Soldier Swarm Actions Log:</span>
                  {activeDispatch.combatLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 rounded bg-[#161618] border border-white/[0.05] text-[#a1a1a6] flex items-center justify-between"
                    >
                      <span className="truncate max-w-[550px]">{log.action}</span>
                      <span className="text-[10px] text-[#30d158] font-bold shrink-0">
                        [{log.outcome.toUpperCase()}]
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
