// ============================================================
// OmniWealth – BottomNav.tsx  v2.0
// Native-feel PWA bottom navigation — 5 tabs:
//   Home · Fiat · [+ FAB] · Insights · Settings
// Now uses AppTab from useAppStore (includes 'settings').
// ============================================================

import React from 'react';
import {
  LayoutDashboard, Wallet, Plus,
  TrendingUp, Brain, Settings,
} from 'lucide-react';
import type { AppTab } from '../store/useAppStore';

// ── Types ─────────────────────────────────────────────────────
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

// ── Component ─────────────────────────────────────────────────
export function BottomNav({
  activeTab,
  onTabChange,
  insightGrade,
  gradeColorCls = 'text-rose-400',
}: BottomNavProps) {

  const leftTabs: NavItem[] = [
    { key: 'overview', label: 'Home',    icon: <LayoutDashboard size={20} /> },
    { key: 'fiat',     label: 'Fiat',    icon: <Wallet size={20} /> },
  ];

  const rightTabs: NavItem[] = [
    { key: 'market',   label: 'Invest',    icon: <TrendingUp size={20} /> },
    { key: 'insights', label: 'Insights',  icon: <Brain size={20} /> },
    { key: 'settings', label: 'Settings',  icon: <Settings size={20} /> },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#060D1F]/95 backdrop-blur-2xl border-t border-white/[0.07]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto max-w-md px-2">
        <div className="flex items-end justify-around h-16 relative">

          {/* ── Left tabs ──────────────────────────────────── */}
          {leftTabs.map((tab) => (
            <NavButton
              key={tab.key}
              tab={tab}
              isActive={activeTab === tab.key}
              onPress={() => onTabChange(tab.key)}
            />
          ))}

          {/* ── Center FAB (+) ─────────────────────────────── */}
          <div className="flex flex-col items-center pb-1 relative -top-3">
            <button
              onClick={() => onTabChange('overview')}
              aria-label="Add transaction"
              className="relative w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/40 active:scale-95 transition-transform duration-150 ring-4 ring-[#060D1F]"
            >
              <Plus size={26} strokeWidth={2.5} className="text-white" />
            </button>
            <span className="text-[9px] mt-1 text-white/25 font-medium">Add</span>
          </div>

          {/* ── Right tabs ─────────────────────────────────── */}
          {rightTabs.map((tab) => (
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
      </div>
    </nav>
  );
}

// ── NavButton sub-component ───────────────────────────────────
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
      className="relative flex flex-col items-center justify-end gap-1 h-full w-12 pb-2 transition-all duration-200 active:scale-95"
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
        <span className={`absolute top-1.5 right-0 text-[8px] font-black leading-none px-1 py-0.5 rounded-full bg-[#060D1F] border border-white/10 ${badgeColorCls}`}>
          {badge}
        </span>
      )}
    </button>
  );
}
