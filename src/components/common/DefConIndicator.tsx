import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { DefConLevel } from '../../core/types';

interface DefConIndicatorProps {
  level: DefConLevel;
  className?: string;
}

export const DefConIndicator: React.FC<DefConIndicatorProps> = ({ level, className = '' }) => {
  const getColors = () => {
    switch (level) {
      case 1:
        return {
          bg: 'bg-[#ff453a]/15 border-[#ff453a]/40 text-[#ff453a]',
          indicator: 'bg-[#ff453a]',
          icon: ShieldAlert,
          label: 'DEFCON 1 · CRITICAL',
        };
      case 2:
        return {
          bg: 'bg-[#ff9f0a]/15 border-[#ff9f0a]/40 text-[#ff9f0a]',
          indicator: 'bg-[#ff9f0a]',
          icon: AlertTriangle,
          label: 'DEFCON 2 · SEVERE',
        };
      case 3:
        return {
          bg: 'bg-[#ffd60a]/15 border-[#ffd60a]/35 text-[#ffd60a]',
          indicator: 'bg-[#ffd60a]',
          icon: AlertTriangle,
          label: 'DEFCON 3 · ELEVATED',
        };
      case 4:
        return {
          bg: 'bg-[#0a84ff]/15 border-[#0a84ff]/40 text-[#2997ff]',
          indicator: 'bg-[#0a84ff]',
          icon: ShieldCheck,
          label: 'DEFCON 4 · GUARDED',
        };
      default:
        return {
          bg: 'bg-[#30d158]/15 border-[#30d158]/40 text-[#30d158]',
          indicator: 'bg-[#30d158]',
          icon: ShieldCheck,
          label: 'DEFCON 5 · NOMINAL',
        };
    }
  };

  const config = getColors();
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[11px] font-semibold tracking-wider font-mono tabular-nums whitespace-nowrap ${config.bg} ${className}`}
      aria-label={`Current defense readiness posture: DefCon ${level}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{config.label}</span>
      <span className="text-white/25">/</span>
      <span className="text-[#a1a1a6]">STAGE {level}</span>
    </div>
  );
};
