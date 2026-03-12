// ============================================================
// OmniWealth – BottomNav.tsx  v3.0
// Normalized: 5 even tabs, no artificial FAB gap.
// FAB has been relocated to App.tsx as a floating button.
// Hidden on desktop (≥md) — replaced by the sidebar.
// ============================================================

import React from 'react';
import {
  LayoutDashboard, Wallet,
  TrendingUp, Brain, Settings,
} from 'lucide-react';
import type { AppTab } from '../store/useAppStore';

// ── Types ──────────────────────────────────────────────────────
interface NavItem {
  key:   AppTab;
  label: string;
  icon:  React.ReactNode;
}

interface BottomNavProps {
  activeTab:      AppTab;
  onTabChange:    (tab: AppTab) => void;
  insightGrade?:  string;
  gradeColorCls?: string;
}

// ── All 5 tabs — evenly spaced ──────────────────────────────────
const ALL_TABS: NavItem[] = [
  { key: 'overview',  label: 'Home',     icon: <LayoutDashboard size={20} /> },
  { key: 'fiat',      label: 'Fiat',     icon: <Wallet size={20} />          },
  { key: 'market',    label: 'Invest',   icon: <TrendingUp size={20} />      },
  { key: 'insights',  label: 'Insights', icon: <Brain size={20} />           },
  { key: 'settings',  label: 'Settings', icon: <Settings size={20} />        },
];

// ── Component ──────────────────────────────────────────────────
export function BottomNav({
  activeTab,
  onTabChange,
  insightGrade,
  gradeColorCls = 'text-rose-400',
}: BottomNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#060D1F]/95 backdrop-blur-2xl border-t border-white/[0.07]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex justify-around items-center w-full h-16 px-2">
        {ALL_TABS.map((tab) => (
          <NavButton
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onPress={() => onTabChange(tab.key)}
            badge={
              tab.key === 'insights' && insightGrade && insightGrade !== '–'
                ? insightGrade
                : undefined
            }
            badgeColorCls={gradeColorCls}
          />
        ))}
      </div>
    </nav>
  );
}

// ── NavButton sub-component ────────────────────────────────────
interface NavButtonProps {
  tab:            NavItem;
  isActive:       boolean;
  onPress:        () => void;
  badge?:         string;
  badgeColorCls?: string;
}

function NavButton({ tab, isActive, onPress, badge, badgeColorCls = 'text-rose-400' }: NavButtonProps) {
  return (
    <button
      onClick={onPress}
      aria-current={isActive ? 'page' : undefined}
      className="relative flex flex-col items-center justify-center gap-1 h-full flex-1 transition-all duration-200 active:scale-95"
    >
      {/* Active pill indicator */}
      <span
        className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300 ${
          isActive ? 'w-5 bg-indigo-400' : 'w-0 bg-transparent'
        }`}
      />

      {/* Icon */}
      <span className={`transition-all duration-200 ${
        isActive ? 'text-indigo-400 scale-110' : 'text-white/30 scale-100'
      }`}>
        {tab.icon}
      </span>

      {/* Label */}
      <span className={`text-[9px] font-semibold leading-none transition-colors duration-200 ${
        isActive ? 'text-indigo-400' : 'text-white/25'
      }`}>
        {tab.label}
      </span>

      {/* Badge */}
      {badge && (
        <span className={`absolute top-1 right-2 text-[8px] font-black leading-none px-1 py-0.5 rounded-full bg-[#060D1F] border border-white/10 ${badgeColorCls}`}>
          {badge}
        </span>
      )}
    </button>
  );
}
