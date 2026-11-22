import React, { useEffect, useState } from 'react';
import { Lock, Terminal } from 'lucide-react';
import { DefConLevel } from '../../core/types';
import { DefConIndicator } from '../common/DefConIndicator';
import { sound } from '../../core/sound-fx';

interface TopBarProps {
  currentModule: string;
  onSelectModule: (moduleId: string) => void;
  defcon: DefConLevel;
  onOpenCommandPalette: () => void;
  roleLabel?: string;
  onSignOut?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentModule,
  onSelectModule,
  defcon,
  onOpenCommandPalette,
  roleLabel = 'GLOBAL OPERATOR',
  onSignOut,
}) => {
  const [utcClock, setUtcClock] = useState(() => new Date().toISOString().slice(11, 19));

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcClock(new Date().toISOString().slice(11, 19));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNavClick = (mod: string) => {
    sound.play('click');
    onSelectModule(mod);
  };

  return (
    <header className="sticky top-0 z-40 select-none font-sans border-b border-white/[0.08] bg-[#0a0a0c]/88 backdrop-blur-2xl">
      {/* Top Institutional Classification & Telemetry Strip */}
      <div className="flex items-center justify-between px-4 py-1 border-b border-white/[0.06] bg-[#050507] text-[10px] font-mono text-[#86868b]">
        <div className="flex items-center gap-2.5 truncate">
          <span className="inline-flex items-center gap-1 text-[#30d158] font-semibold">
            <Lock className="w-2.5 h-2.5" />
            <span>FIPS-140-3 LEVEL 4</span>
          </span>
          <span className="text-white/20">|</span>
          <span className="hidden md:inline text-[#d1d1d6] tracking-wider">
            HF-CDF GLOBAL · AUTONOMOUS CYBER DEFENSE COMMAND PLATFORM
          </span>
          <span className="hidden lg:inline text-white/20">|</span>
          <span className="hidden lg:inline text-[#a1a1a6]">
            MULTI-TENANT CONTROL PLANE + CUSTOMER DATA PLANES + SPIFFE
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 tabular-nums">
          <span className="hidden sm:inline text-[#a1a1a6]">5 REGIONAL CLUSTERS ACTIVE</span>
          <span className="text-[#f5f5f7] font-semibold">{utcClock} UTC</span>
        </div>
      </div>

      {/* Main Command Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        {/* Zone 1: Architectural Sovereign Brand Lockup */}
        <a
          href="#command"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('global-command');
          }}
          className="flex items-center gap-3 shrink-0 group focus:outline-none"
        >
          <div className="relative h-10 w-16 rounded-xl flex items-center justify-center overflow-hidden border border-white/[0.12] bg-gradient-to-b from-[#1f1f23] to-[#111113] shadow-[0_4px_16px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] p-1 transition-all duration-300 group-hover:scale-105 group-hover:border-white/25">
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
            <img
              src="/assets/aistudio/Golden_Touch_Technology_Emblem__1__b8a9d7df.webp"
              alt="HF-CDF Sovereign Emblem"
              className="w-full h-full object-contain contrast-125"
            />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-[0.14em] text-[#f5f5f7]">HF-CDF GLOBAL</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.1] text-[#64d2ff] font-semibold">
                MULTI-TENANT
              </span>
            </div>
            <span className="text-[9px] font-mono tracking-[0.16em] text-[#86868b] mt-1">
              CONTROL &amp; DEFENSE PLANE
            </span>
          </div>
        </a>

        {/* Zone 2: Apple Segmented Command Navigation */}
        <nav className="hidden xl:flex items-center gap-0.5 bg-[#141416] p-1 rounded-xl border border-white/[0.08] text-xs font-medium text-[#86868b] min-w-0 overflow-x-auto">
          {[
            { id: 'global-command', label: 'Global HQ' },
            { id: 'customer-command', label: 'Customer Portal' },
            { id: 'soc-command', label: 'SOC Command' },
            { id: 'command-center', label: 'Command' },
            { id: 'agent-trust', label: 'Agent Trust' },
            { id: 'incidents', label: 'Incidents' },
          ].map((item) => {
            const isActive = currentModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-white/[0.13] text-[#f5f5f7] font-semibold shadow-sm'
                    : 'hover:text-[#f5f5f7] hover:bg-white/[0.05]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-2 bottom-0 h-[2px] bg-[#0a84ff] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Tactical Posture & Quick Command */}
        <div className="flex items-center gap-2 shrink-0">
          <DefConIndicator level={defcon} />

          <button
            onClick={() => {
              sound.play('click');
              onOpenCommandPalette();
            }}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#d1d1d6] hover:text-[#f5f5f7] bg-[#161618] hover:bg-[#222226] border border-white/[0.1] rounded-lg transition-colors whitespace-nowrap shrink-0 font-mono"
            aria-label="Open command palette"
          >
            <Terminal className="w-3.5 h-3.5 text-[#0a84ff]" />
            <span>⌘K</span>
          </button>

          <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg border border-white/[0.1] bg-[#161618] text-[#f5f5f7] font-medium whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#30d158]" />
            <span className="text-[11px] font-mono font-semibold tracking-wide uppercase">{roleLabel}</span>
          </div>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="px-2.5 py-1.5 text-[11px] font-mono text-[#a1a1a6] hover:text-[#ff6961] bg-[#161618] border border-white/[0.08] rounded-lg"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
