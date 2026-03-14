// ============================================================
// OmniWealth – App.tsx  (v7.0 — Responsive Hybrid Shell)
// Mobile  → BottomNav
// Desktop → Left Sidebar + expanded content area
// FAB     → fixed floating bottom-right, out of BottomNav
// ============================================================

import { useEffect, useState } from 'react';
import {
  Shield, BarChart2,
  LayoutDashboard, Wallet, TrendingUp, Brain, Settings, Plus, X, Landmark, Activity, Loader2,
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
import { useAuthStore }       from './store/useAuthStore';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { LoginScreen }        from './components/LoginScreen';
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
  const isModalOpen  = useAppStore((s) => s.isModalOpen);

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

  // ── Context-Aware Actions Configuration ──────────────────────
  const ACTIONS = [
    { id: 'log_tx', label: 'Log Transaction', targetTab: 'fiat', event: 'ow:open-tx-modal', icon: <Activity size={18} />, colorCls: 'text-indigo-400', bgCls: 'bg-indigo-500/20' },
    { id: 'add_bank', label: 'Add Bank Account', targetTab: 'fiat', event: 'ow:open-bank-modal', icon: <Landmark size={18} />, colorCls: 'text-emerald-400', bgCls: 'bg-emerald-500/20' },
    { id: 'add_invest', label: 'Add Investment', targetTab: 'market', event: 'ow:open-asset-modal', icon: <TrendingUp size={18} />, colorCls: 'text-purple-400', bgCls: 'bg-purple-500/20' },
  ];

  type ActionType = typeof ACTIONS[0];

  const visibleActions = ACTIONS.filter(a => {
    if (activeTab === 'overview') return true;
    if (activeTab === 'fiat') return a.targetTab === 'fiat';
    if (activeTab === 'market') return a.targetTab === 'market';
    return false; // For others, handled below
  });

  const hideFab = activeTab === 'insights' || activeTab === 'settings';

  const handleFab = () => setIsFabOpen((v) => !v);

  const executeAction = (action: ActionType) => {
    setIsFabOpen(false);
    if (activeTab !== action.targetTab) {
      setActiveTab(action.targetTab as AppTab);
    }
    // Slight delay to ensure the target tab has mounted and its useEffect listeners are ready
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(action.event));
    }, 50);
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

        {/* ── Global Action Menu (Triggered by FAB) ──────────── */}
        {!hideFab && isFabOpen && (
          <>
            {/* Backdrop to close menu */}
            <div 
              className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm touch-none transition-opacity"
              onClick={() => setIsFabOpen(false)}
            />
            
            {/* Menu Modal: Bottom Sheet on Mobile, Floating on Desktop */}
            <div className="fixed bottom-0 left-0 w-full md:max-w-sm md:bottom-28 md:right-6 md:left-auto md:w-max bg-[#0F172A] md:bg-[#0F172A]/90 md:backdrop-blur-xl rounded-t-3xl md:rounded-2xl pb-safe p-6 md:p-4 z-[9999] shadow-2xl transition-transform transform translate-y-0 border-t md:border border-white/10 flex flex-col gap-2">
              <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2 md:hidden px-2">Select Action</h3>
              {visibleActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => executeAction(action)}
                  className="flex items-center gap-4 bg-white/5 hover:bg-white/10 px-5 py-4 md:py-3 md:px-4 rounded-2xl md:rounded-xl transition-all w-full text-left"
                >
                  <div className={`w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${action.bgCls}`}>
                    <span className={action.colorCls}>{action.icon}</span>
                  </div>
                  <span className="text-base md:text-sm font-semibold text-white">{action.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Floating Action Button (Universal Toggler) ───────── */}
        {!hideFab && (
          <button
            id="global-fab"
            onClick={handleFab}
            aria-label="Add"
            className={`fixed right-6 md:bottom-10 z-[9999] w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl shadow-indigo-500/40 transition-all duration-300 ${
              isFabOpen ? 'rotate-45' : 'hover:scale-110 active:scale-95 text-white'
            } ${
              isModalOpen ? 'opacity-0 pointer-events-none translate-y-10 bottom-24' : 'opacity-100 translate-y-0 bottom-24'
            }`}
          >
            {isFabOpen
              ? <X size={24} className="text-white" />
              : <Plus size={24} className="text-white" />
            }
          </button>
        )}

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

// ── Root App — onboarding gate and auth shell ─────────────────────
export function App() {
  const isFirstTimeSetup = useAppStore((s) => s.isFirstTimeSetup);
  const { user, isLoadingAuth, setUser, setSession, setLoadingAuth } = useAuthStore();

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/10 mb-6">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Supabase Configuration Missing</h1>
        <p className="text-slate-400 max-w-md mb-6 leading-relaxed">
          Please add your valid <code className="bg-slate-900 border border-white/10 px-1.5 py-0.5 rounded text-indigo-400">VITE_SUPABASE_URL</code> and <code className="bg-slate-900 border border-white/10 px-1.5 py-0.5 rounded text-indigo-400">VITE_SUPABASE_ANON_KEY</code> to the <code className="bg-slate-900 border border-white/10 px-1.5 py-0.5 rounded text-slate-300">.env.local</code> file and restart the development server.
        </p>
        <div className="text-left bg-slate-900 border border-white/10 rounded-xl p-4 w-full max-w-md font-mono text-xs sm:text-sm text-slate-300 overflow-x-auto">
          <span className="text-indigo-400">VITE_SUPABASE_URL</span>=https://your-project.supabase.co<br/>
          <span className="text-indigo-400">VITE_SUPABASE_ANON_KEY</span>=eyJhbGciOiJIUzI1Ni...
        </div>
      </div>
    );
  }

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        useFiatStore.getState().fetchUserData();
        useMarketStore.getState().fetchUserData();
      }
      setLoadingAuth(false);
    });

    // 2. Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        useFiatStore.getState().fetchUserData();
        useMarketStore.getState().fetchUserData();
      }
      setLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUser, setLoadingAuth]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium tracking-wide">Authenticating securely...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (isFirstTimeSetup) {
    return <OnboardingWizard />;
  }

  return <AppShell />;
}
