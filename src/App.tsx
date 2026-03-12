// ============================================================
// OmniWealth – App.tsx  (v6.0 — Mobile-First + Onboarding Gate)
// ============================================================

import { useEffect } from 'react';
import { Shield, BarChart2 } from 'lucide-react';
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

// Re-export for backward compat
export type Tab = AppTab;

// ── App Shell (post-onboarding) ───────────────────────────────
function AppShell() {
  // ── Tab state from useAppStore ─────────────────────────────
  const activeTab    = useAppStore((s) => s.activeTab) as Tab;
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const darkMode     = useAppStore((s) => s.darkMode);

  // ── Financial data for the header pill ────────────────────
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

  // ── Insights grade for BottomNav badge ────────────────────
  const insightGrade = insights?.financialScore?.grade ?? '–';
  const insightGradeColor =
    insightGrade === 'A+' || insightGrade === 'A' ? 'text-emerald-400' :
    insightGrade === 'B'                           ? 'text-blue-400'    :
    insightGrade === 'C'                           ? 'text-amber-400'   :
    'text-rose-400';

  // ── Header pill health color ───────────────────────────────
  const healthColor =
    healthScore >= 80 ? 'text-emerald-400' :
    healthScore >= 60 ? 'text-indigo-400'  :
    healthScore >= 40 ? 'text-amber-400'   :
    'text-rose-400';

  // ── Apply persisted dark mode on mount ───────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // ── Pre-warm insights engine ───────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => computeInsights(), 800);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tabLabel =
    activeTab === 'overview' ? 'Net Worth'      :
    activeTab === 'fiat'     ? 'Fiat Ledger'    :
    activeTab === 'market'   ? 'Investasi'      :
    'Insight Keuangan';

  return (
    // ── Mobile container: max-w-md, centered, clip overflow ───
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-x-hidden pb-20 shadow-2xl">

      {/* ════════════════════════════════════════════════════════
          SLIM HEADER — brand + current tab label + net worth
      ════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-b border-slate-200 dark:border-white/[0.06]">
        <div className="px-4 flex items-center justify-between h-12 gap-3">

          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
              <Shield size={13} className="text-white" />
            </div>
            <div className="leading-tight">
              <span className="text-slate-900 dark:text-white font-black text-sm tracking-tight">OmniWealth</span>
            </div>
          </div>

          {/* Tab label (center) */}
          <span className="text-xs font-semibold text-slate-400 dark:text-white/30 truncate">
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

      {/* ════════════════════════════════════════════════════════
          TAB PANELS — CSS visibility (zero remount cost)
      ════════════════════════════════════════════════════════ */}
      <main>
        <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
          <NetWorthDashboard
            onNavigateFiat={()    => setActiveTab('fiat')}
            onNavigateMarket={() => setActiveTab('market')}
          />
        </div>
        <div className={activeTab === 'fiat' ? 'block' : 'hidden'}>
          <FiatDashboard />
        </div>
        <div className={activeTab === 'market' ? 'block' : 'hidden'}>
          <MarketDashboard />
        </div>
        <div className={activeTab === 'insights' ? 'block' : 'hidden'}>
          <InsightsDashboard />
        </div>
        <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
          <SettingsDashboard />
        </div>
      </main>

      {/* ════════════════════════════════════════════════════════
          BOTTOM NAV — fixed, full width of the mobile container
      ════════════════════════════════════════════════════════ */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t)}
        insightGrade={insightGrade !== '–' ? insightGrade : undefined}
        gradeColorCls={insightGradeColor}
      />

    </div>
  );
}

// ── Root App — onboarding gate ────────────────────────────────
export function App() {
  const isFirstTimeSetup = useAppStore((s) => s.isFirstTimeSetup);

  // Onboarding takes over the entire viewport
  if (isFirstTimeSetup) {
    return <OnboardingWizard />;
  }

  return <AppShell />;
}


