// ============================================================
// OmniWealth – App.tsx  (v7.0 — Responsive Hybrid Shell)
// Mobile  → BottomNav
// Desktop → Left Sidebar + expanded content area
// FAB     → fixed floating bottom-right, out of BottomNav
// ============================================================

import { useEffect, useState } from 'react';
import {
  Shield, BarChart2,
  LayoutDashboard, Wallet, TrendingUp, Brain, Settings, Plus, X,
} from 'lucide-react';
import { FiatDashboard }      from './components/FiatDashboard';
import { MarketDashboard }    from './components/MarketDashboard';
import { NetWorthDashboard }  from './components/NetWorthDashboard';
import { InsightsDashboard }  from './components/InsightsDashboard';
import { SettingsDashboard }  from './components/SettingsDashboard';
import { BottomNav }          from './components/BottomNav';
import { OnboardingWizard }   from './components/OnboardingWizard';
import { useAppStore }        from './store/useAppStore';
import type { AppTab }        from './store/useAppStore';
import { useFiatStore }       from './store/useFiatStore';
import { useMarketStore }     from './store/useMarketStore';
import { useNetWorthStore }   from './store/useNetWorthStore';
import { useInsightStore }    from './store/useInsightStore';
import { formatCompact }      from './utils/format';

export type Tab = AppTab;

// ── Sidebar nav items ───────────────────────────────────────────
const NAV_ITEMS: { key: AppTab; label: string; Icon: React.ElementType }[] = [
  { key: 'overview',  label: 'Home',     Icon: LayoutDashboard },
  { key: 'fiat',      label: 'Fiat',     Icon: Wallet          },
  { key: 'market',    label: 'Invest',   Icon: TrendingUp      },
  { key: 'insights',  label: 'Insights', Icon: Brain           },
  { key: 'settings',  label: 'Settings', Icon: Settings        },
];

// ── Desktop Left Sidebar ─────────────────────────────────────────
function Sidebar({
  activeTab,
  onTabChange,
  insightGrade,
  gradeColorCls,
}: {
  activeTab: AppTab;
  onTabChange: (t: AppTab) => void;
  insightGrade?: string;
  gradeColorCls: string;
}) {
  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 min-h-screen bg-[#060D1F]/95 border-r border-white/[0.06] sticky top-0 z-40">
      {/* Brand */}
      <div className="px-5 py-4 flex items-center gap-3 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
          <Shield size={15} className="text-white" />
        </div>
        <span className="text-white font-black text-sm tracking-tight">OmniWealth</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                isActive
                  ? 'bg-indigo-500/15 text-indigo-400'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-white/30 group-hover:text-white/50'} />
              {label}
              {/* Insight grade badge */}
              {key === 'insights' && insightGrade && (
                <span className={`ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full bg-white/5 ${gradeColorCls}`}>
                  {insightGrade}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom version pill */}
      <div className="px-5 py-3 border-t border-white/[0.06]">
        <p className="text-white/20 text-[10px] font-mono">v4.0.0 · OmniWealth</p>
      </div>
    </aside>
  );
}

// ── App Shell (post-onboarding) ──────────────────────────────────
function AppShell() {
  const activeTab    = useAppStore((s) => s.activeTab) as Tab;
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const darkMode     = useAppStore((s) => s.darkMode);

  const getTotalFiatBalance     = useFiatStore((s) => s.getTotalFiatBalance);
  const getTotalInvestmentValue = useMarketStore((s) => s.getTotalInvestmentValue);
  const getNetWorth             = useNetWorthStore((s) => s.getNetWorth);
  const getWealthHealthScore    = useNetWorthStore((s) => s.getWealthHealthScore);
  const computeInsights         = useInsightStore((s) => s.computeInsights);
  const insights                = useInsightStore((s) => s.insights);

  const fiatTotal   = getTotalFiatBalance();
  const investTotal = getTotalInvestmentValue();
  const netWorth    = getNetWorth() || fiatTotal + investTotal;
  const healthScore = getWealthHealthScore();

  const insightGrade = insights?.financialScore?.grade ?? '–';
  const insightGradeColor =
    insightGrade === 'A+' || insightGrade === 'A' ? 'text-emerald-400' :
    insightGrade === 'B'                           ? 'text-blue-400'    :
    insightGrade === 'C'                           ? 'text-amber-400'   :
    'text-rose-400';

  const healthColor =
    healthScore >= 80 ? 'text-emerald-400' :
    healthScore >= 60 ? 'text-indigo-400'  :
    healthScore >= 40 ? 'text-amber-400'   :
    'text-rose-400';

  // ── FAB open state (for add-menu expansions if needed) ────────
  const [isFabOpen, setIsFabOpen] = useState(false);

  // ── Sync dark mode to DOM ──────────────────────────────────────
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      console.log('[Theme] Applied: dark');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('[Theme] Applied: light');
    }
    localStorage.setItem('ow-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // ── Standalone PWA detector (context-aware zoom lock) ─────────
  // Only locks zoom when running as an installed PWA (home screen),
  // preserving normal browser pinch-zoom for web users.
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true);

    if (isStandalone) {
      // Lock viewport zoom — native app feel
      const meta = document.querySelector('meta[name="viewport"]');
      if (meta) {
        meta.setAttribute(
          'content',
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
        );
      }
      // Prevent overscroll bounce (iOS rubber-band effect)
      document.body.classList.add('pwa-standalone');
      console.log('[PWA] Running in standalone mode — zoom locked, bounce disabled.');
    }
  }, []);

  // ── Pre-warm insights engine ───────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => computeInsights(), 800);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const tabLabel =
    activeTab === 'overview'  ? 'Net Worth'       :
    activeTab === 'fiat'      ? 'Fiat Ledger'     :
    activeTab === 'market'    ? 'Investasi'        :
    activeTab === 'insights'  ? 'Insight Keuangan' :
    'Settings';

  // ── FAB nav target per active tab ─────────────────────────────
  const handleFab = () => {
    // On fiat tab — FAB opens transaction modal via custom event
    if (activeTab === 'fiat') {
      window.dispatchEvent(new CustomEvent('ow:open-tx-modal'));
    } else if (activeTab === 'market') {
      window.dispatchEvent(new CustomEvent('ow:open-asset-modal'));
    } else {
      setIsFabOpen((v) => !v);
    }
  };

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark' : ''} bg-slate-50 dark:bg-slate-950`}>

      {/* ── Desktop Left Sidebar ─────────────────────────────── */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        insightGrade={insightGrade !== '–' ? insightGrade : undefined}
        gradeColorCls={insightGradeColor}
      />

      {/* ── Main Column ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen relative overflow-x-hidden pb-20 md:pb-0">

        {/* ── Slim Header ───────────────────────────────────── */}
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-b border-slate-200 dark:border-white/[0.06]">
          <div className="px-4 flex items-center justify-between h-12 gap-3 max-w-5xl mx-auto">

            {/* Brand (mobile only — desktop shows sidebar brand) */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
                <Shield size={13} className="text-white" />
              </div>
              <span className="text-slate-900 dark:text-white font-black text-sm tracking-tight">OmniWealth</span>
            </div>

            {/* Tab label */}
            <span className="text-xs font-semibold text-slate-400 dark:text-white/30 truncate md:ml-0">
              {tabLabel}
            </span>

            {/* Net worth pill */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.07] rounded-xl px-2.5 py-1.5 flex-shrink-0">
              <BarChart2 size={11} className={healthColor} />
              <p className="text-xs font-black text-slate-900 dark:text-white leading-none">
                {formatCompact(netWorth)}
              </p>
            </div>
          </div>
        </header>

        {/* ── Tab Panels ────────────────────────────────────── */}
        <main className="flex-1">
          <div className="max-w-5xl mx-auto w-full">
            <div className={activeTab === 'overview'  ? 'block' : 'hidden'}>
              <NetWorthDashboard
                onNavigateFiat={()    => setActiveTab('fiat')}
                onNavigateMarket={() => setActiveTab('market')}
              />
            </div>
            <div className={activeTab === 'fiat'      ? 'block' : 'hidden'}>
              <FiatDashboard />
            </div>
            <div className={activeTab === 'market'    ? 'block' : 'hidden'}>
              <MarketDashboard />
            </div>
            <div className={activeTab === 'insights'  ? 'block' : 'hidden'}>
              <InsightsDashboard />
            </div>
            <div className={activeTab === 'settings'  ? 'block' : 'hidden'}>
              <SettingsDashboard />
            </div>
          </div>
        </main>

        {/* ── Floating Action Button (relocated out of BottomNav) ── */}
        <button
          id="global-fab"
          onClick={handleFab}
          aria-label="Add"
          className={`fixed right-6 bottom-24 md:bottom-10 z-50 w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl shadow-indigo-500/40 transition-all duration-200 hover:scale-110 active:scale-95 ${
            isFabOpen ? 'rotate-45' : 'rotate-0'
          }`}
        >
          {isFabOpen
            ? <X size={24} className="text-white" />
            : <Plus size={24} className="text-white" />
          }
        </button>

        {/* ── Mobile Bottom Nav (hidden on desktop) ──────────── */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={(t) => setActiveTab(t)}
          insightGrade={insightGrade !== '–' ? insightGrade : undefined}
          gradeColorCls={insightGradeColor}
        />
      </div>

    </div>
  );
}

// ── Root App — onboarding gate ────────────────────────────────────
export function App() {
  const isFirstTimeSetup = useAppStore((s) => s.isFirstTimeSetup);

  if (isFirstTimeSetup) {
    return <OnboardingWizard />;
  }

  return <AppShell />;
}
