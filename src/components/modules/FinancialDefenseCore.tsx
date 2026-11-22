import React, { useState } from 'react';
import {
  Landmark,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Activity,
  ArrowRight,
  DollarSign,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Radio,
} from 'lucide-react';
import { sound } from '../../core/sound-fx';

interface InterbankRail {
  id: string;
  name: string;
  acronym: string;
  region: string;
  dailyVolumeUSD: string;
  currentVelocityUSDPerSec: string;
  status: 'SHIELDED' | 'ACTIVE_INTERCEPT' | 'RATE_LIMITED';
  fraudDropRate: string;
  encryptionStandard: string;
  settlementLatencyMs: number;
}

const INTERBANK_RAILS: InterbankRail[] = [
  { id: 'rail-01', name: 'Federal Reserve Wire Service', acronym: 'Fedwire Funds', region: 'North America (US)', dailyVolumeUSD: '$4.2 Trillion', currentVelocityUSDPerSec: '$48,500,000/s', status: 'SHIELDED', fraudDropRate: '99.99%', encryptionStandard: 'FIPS 140-3 Level 4 HSM', settlementLatencyMs: 14.2 },
  { id: 'rail-02', name: 'Society for Worldwide Interbank Financial Telecommunication', acronym: 'SWIFT Alliance Gateway', region: 'Global / Europe', dailyVolumeUSD: '$5.8 Trillion', currentVelocityUSDPerSec: '$67,200,000/s', status: 'ACTIVE_INTERCEPT', fraudDropRate: '99.94%', encryptionStandard: 'Hardware QKD Dark-Fiber', settlementLatencyMs: 28.5 },
  { id: 'rail-03', name: 'Trans-European Automated Real-time Gross Settlement', acronym: 'TARGET2 / BoE', region: 'Eurozone & UK', dailyVolumeUSD: '$2.9 Trillion', currentVelocityUSDPerSec: '$33,800,000/s', status: 'SHIELDED', fraudDropRate: '99.98%', encryptionStandard: 'Kyber-1024 Post-Quantum', settlementLatencyMs: 19.8 },
  { id: 'rail-04', name: 'Bank of Japan Financial Network', acronym: 'BOJ-NET FX Rail', region: 'Asia-Pacific (Japan)', dailyVolumeUSD: '$1.8 Trillion', currentVelocityUSDPerSec: '$21,400,000/s', status: 'SHIELDED', fraudDropRate: '100.0%', encryptionStandard: 'AES-256-GCM Sovereign', settlementLatencyMs: 16.0 },
  { id: 'rail-05', name: 'Clearing House Interbank Payments System', acronym: 'CHIPS Liquidity Net', region: 'Global Foreign Exchange', dailyVolumeUSD: '$1.9 Trillion', currentVelocityUSDPerSec: '$22,100,000/s', status: 'RATE_LIMITED', fraudDropRate: '99.89%', encryptionStandard: 'BGP FlowSpec Filtered', settlementLatencyMs: 34.1 },
  { id: 'rail-06', name: 'Cross-Border Interbank Payment System', acronym: 'CIPS Beijing', region: 'Asia-Pacific (China)', dailyVolumeUSD: '$3.1 Trillion', currentVelocityUSDPerSec: '$38,200,000/s', status: 'SHIELDED', fraudDropRate: '99.96%', encryptionStandard: 'SM9 Sovereign Cryptography', settlementLatencyMs: 21.4 },
  { id: 'rail-07', name: 'Clearing House Automated Payment System', acronym: 'CHAPS London', region: 'United Kingdom', dailyVolumeUSD: '$1.2 Trillion', currentVelocityUSDPerSec: '$15,600,000/s', status: 'SHIELDED', fraudDropRate: '99.99%', encryptionStandard: 'FIPS 140-3 Level 3', settlementLatencyMs: 18.2 },
  { id: 'rail-08', name: 'Brazilian Instant Payments System', acronym: 'PIX Central Bank', region: 'Latin America (Brazil)', dailyVolumeUSD: '$950 Billion', currentVelocityUSDPerSec: '$12,800,000/s', status: 'ACTIVE_INTERCEPT', fraudDropRate: '99.91%', encryptionStandard: 'ECDSA P-384 Sovereign', settlementLatencyMs: 11.5 },
];

interface InterceptedTransaction {
  id: string;
  timestamp: string;
  originInstitution: string;
  destinationInstitution: string;
  amountUSD: number;
  rail: string;
  riskScore: number;
  anomalyReason: string;
  status: 'QUARANTINED' | 'BLOCKED' | 'CLEARED';
}

const SAMPLE_INTERCEPTS: InterceptedTransaction[] = [
  { id: 'TX-94102', timestamp: '21:24:18 UTC', originInstitution: 'Sovereign Private Custody Zurich', destinationInstitution: 'Offshore Shell Entity ASN-49120', amountUSD: 142000000, rail: 'SWIFT FIN', riskScore: 98, anomalyReason: 'Out-of-band wire authorization payload with mismatched BGP ASN route signature', status: 'QUARANTINED' },
  { id: 'TX-94103', timestamp: '21:22:45 UTC', originInstitution: 'Tokyo FX Liquidity Core', destinationInstitution: 'Federal Reserve Member Bank 04', amountUSD: 850000000, rail: 'Fedwire Funds', riskScore: 12, anomalyReason: 'Nominal sovereign settlement packet verified via RFC 3161 hardware timestamp', status: 'CLEARED' },
  { id: 'TX-94104', timestamp: '21:19:02 UTC', originInstitution: 'Frankfurt Interbank DE-CIX', destinationInstitution: 'Unknown Synthetic Proxy Cayman', amountUSD: 68500000, rail: 'TARGET2', riskScore: 94, anomalyReason: 'Rapid micro-chunked velocity anomaly mimicking flash loan liquidity drain', status: 'BLOCKED' },
  { id: 'TX-94105', timestamp: '21:15:30 UTC', originInstitution: 'London Clearing House', destinationInstitution: 'Panama Offshore Trust Alpha', amountUSD: 310000000, rail: 'CHAPS London', riskScore: 96, anomalyReason: 'Unauthorized SWIFT MT103 message injection attempt from compromised node', status: 'QUARANTINED' },
  { id: 'TX-94106', timestamp: '21:10.12 UTC', originInstitution: 'People Bank of China CIPS Gateway', destinationInstitution: 'Singapore Digital Asset Hub', amountUSD: 520000000, rail: 'CIPS Beijing', riskScore: 88, anomalyReason: 'High-frequency arbitrage burst exceeding statistical risk thresholds', status: 'BLOCKED' },
  { id: 'TX-94107', timestamp: '21:05:40 UTC', originInstitution: 'São Paulo PIX Settlement', destinationInstitution: 'Cayman Islands Clearing Entity', amountUSD: 45000000, rail: 'PIX Central Bank', riskScore: 91, anomalyReason: 'Suspicious payload obfuscation attempting to bypass AML velocity limits', status: 'QUARANTINED' },
];

interface FinancialDefenseCoreProps {
  onNotify?: (message: string, type: 'info' | 'success' | 'alert') => void;
}

export const FinancialDefenseCore: React.FC<FinancialDefenseCoreProps> = ({ onNotify }) => {
  const [rails, setRails] = useState<InterbankRail[]>(INTERBANK_RAILS);
  const [intercepts, setIntercepts] = useState<InterceptedTransaction[]>(SAMPLE_INTERCEPTS);
  const [selectedRailId, setSelectedRailId] = useState<string>(INTERBANK_RAILS[0].id);

  const selectedRail = rails.find((r) => r.id === selectedRailId) || rails[0];

  const handleAuthorizeRelease = (txId: string) => {
    sound.play('click');
    setIntercepts((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, status: 'CLEARED', riskScore: 15 } : tx))
    );
    onNotify?.(`Transaction ${txId} cleared after multi-signature cryptographic proof verification.`, 'info');
  };

  const handleEnforceBlock = (txId: string) => {
    sound.play('alert');
    setIntercepts((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, status: 'BLOCKED' } : tx))
    );
    onNotify?.(`Transaction ${txId} permanently blocked. Funds reverted to sovereign escrow.`, 'alert');
  };

  const handleToggleRailLockdown = (railId: string) => {
    sound.play('alert');
    setRails((prev) =>
      prev.map((r) =>
        r.id === railId
          ? { ...r, status: r.status === 'SHIELDED' ? 'ACTIVE_INTERCEPT' : 'SHIELDED' }
          : r
      )
    );
    onNotify?.(`Interbank rail status toggled for ${selectedRail.name}.`, 'alert');
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Top Banner */}
      <div className="rounded-xl border border-amber-500/40 bg-slate-950 p-5 shadow-2xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-950 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow">
              <Landmark className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-amber-400 font-bold">
                <span>GLOBAL FINANCIAL CLEARING & LIQUIDITY DEFENSE SHIELD</span>
                <span>·</span>
                <span className="text-emerald-400">$16.6 TRILLION DAILY PROTECTION</span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight font-sans">
                Interbank Clearing & High-Value Settlement Defense Core
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded bg-black/60 border border-amber-500/30 text-amber-300 flex items-center gap-2 font-bold">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>MONITORED VELOCITY: $192.6M / SEC</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl font-sans">
          Mission-critical defense architecture protecting tier-1 sovereign interbank financial rails (SWIFT, Fedwire, TARGET2, CHIPS, BOJ-NET) from state-sponsored wire diversion, quantum decrypt incursions, and BGP settlement hijacking.
        </p>
      </div>

      {/* Main Grid: Interbank Rails + Live Intercepted Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interbank Rails Roster (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-slate-400 font-bold">MONITORED SETTLEMENT RAILS ({rails.length})</span>
            <span className="text-emerald-400">99.98% MEAN FRAUD DROP</span>
          </div>

          <div className="space-y-3">
            {rails.map((rail) => {
              const isSelected = rail.id === selectedRailId;
              const isShielded = rail.status === 'SHIELDED';

              return (
                <div
                  key={rail.id}
                  onClick={() => {
                    sound.play('click');
                    setSelectedRailId(rail.id);
                  }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all space-y-2.5 ${
                    isSelected
                      ? 'border-amber-500/60 bg-amber-950/20 shadow-lg ring-1 ring-amber-500/40'
                      : 'border-white/10 bg-slate-900/40 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">{rail.name}</span>
                      <div className="text-[11px] text-amber-400 font-bold">{rail.acronym}</div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                        isShielded
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-950 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {rail.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-2 border-t border-white/5">
                    <div>Daily Vol: <span className="text-white font-bold">{rail.dailyVolumeUSD}</span></div>
                    <div>Rate: <span className="text-cyan-400">{rail.currentVelocityUSDPerSec}</span></div>
                    <div className="text-right">Latency: <span className="text-amber-400 font-bold">{rail.settlementLatencyMs}ms</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Rail Telemetry & Live Intercept Actions (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-xl border border-amber-500/40 bg-slate-950 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white text-sm">{selectedRail.acronym} DEFENSE PROFILE</span>
              </div>
              <button
                onClick={() => handleToggleRailLockdown(selectedRail.id)}
                className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1.5 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Toggle Rail Scrubbing</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Jurisdiction & Region:</span>
                <span className="text-white font-bold">{selectedRail.region}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Daily Clearing Throughput:</span>
                <span className="text-emerald-400 font-bold">{selectedRail.dailyVolumeUSD}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Cryptographic Standard:</span>
                <span className="text-cyan-300 font-bold">{selectedRail.encryptionStandard}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Autonomous Drop Accuracy:</span>
                <span className="text-white font-bold">{selectedRail.fraudDropRate}</span>
              </div>
            </div>

            {/* Live Intercepted Transactions Stream */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>SUSPICIOUS TRANSACTION INTERCEPTS</span>
                </span>
                <span className="text-[10px] text-slate-400">HUMAN GATE AUTHORIZATION</span>
              </div>

              <div className="space-y-2">
                {intercepts.map((tx) => (
                  <div key={tx.id} className="p-3 rounded-lg border border-red-500/30 bg-black/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-400">{tx.id}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-300">{tx.timestamp}</span>
                      </div>
                      <span className="text-emerald-400 font-bold text-xs">${(tx.amountUSD / 1000000).toFixed(1)}M USD</span>
                    </div>

                    <div className="text-[11px] text-slate-300 leading-relaxed font-sans">
                      {tx.anomalyReason}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-[10px] text-slate-400 font-mono">STATUS: <span className="text-amber-400 font-bold">{tx.status}</span></span>
                      {tx.status === 'QUARANTINED' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEnforceBlock(tx.id)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold"
                          >
                            Block & Escrow
                          </button>
                          <button
                            onClick={() => handleAuthorizeRelease(tx.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded text-[10px] font-bold"
                          >
                            Verify & Release
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
