// ============================================================
// OmniWealth – NetWorthDashboard.tsx
// The command center: aggregates ALL assets (Fiat + Investments)
// into a unified Net Worth view with PnL, allocation, and health.
//
// Data flow:
//   useNetWorthStore.computeSnapshot()
//     ├─ useFiatStore  → bank balances, cash flows
//     └─ useMarketStore → enriched assets, PnL
//   → WealthSnapshot → rendered here
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, RefreshCw, Shield,
  Wallet, BarChart2, Building2, Coins, Layers,
  ArrowUpRight, ArrowDownLeft, Activity, Zap,
  ChevronRight, Info, CheckCircle2, AlertTriangle,
  XCircle, Target, PieChart,
} from 'lucide-react';
import { useNetWorthStore } from '../store/useNetWorthStore';
import { useMarketStore, ASSET_CLASS_CONFIG } from '../store/useMarketStore';
import { useFiatStore } from '../store/useFiatStore';
import { AssetCard } from './AssetCard';
import type { AllocationSlice, HealthMetric } from '../types/networth';
import type { AssetClass } from '../types/market';

// ── Format helpers ────────────────────────────────────────────
function fmtIDR(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(val);
}

function fmtCompact(val: number): string {
  const abs  = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(2)} M`;
  if (abs >= 1_000_000)     return `${sign}Rp ${(abs / 1_000_000).toFixed(1)} Jt`;
  if (abs >= 1_000)         return `${sign}Rp ${(abs / 1_000).toFixed(0)} Rb`;
  return fmtIDR(val);
}

function fmtPct(val: number, showSign = false): string {
  const sign = showSign && val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

// ── Donut SVG ─────────────────────────────────────────────────
function DonutChart({ slices, size = 180 }: {
  slices: AllocationSlice[];
  size?: number;
}) {
  const r = 70;
  const cx = size / 2;
  const cy = size / 2;
  const total = slices.reduce((s, sl) => s + sl.percentage, 0);

  let cumulativeAngle = -90; // Start at top

  const paths = slices.map((sl, i) => {
    const pct    = total > 0 ? sl.percentage : 100 / slices.length;
    const angle  = (pct / 100) * 360;
    const startA = cumulativeAngle;
    cumulativeAngle += angle;
    const endA   = cumulativeAngle;

    const rad1 = (startA * Math.PI) / 180;
    const rad2 = (endA   * Math.PI) / 180;

    const x1 = cx + r * Math.cos(rad1);
    const y1 = cy + r * Math.sin(rad1);
    const x2 = cx + r * Math.cos(rad2);
    const y2 = cy + r * Math.sin(rad2);

    const largeArc = angle > 180 ? 1 : 0;

    const d = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    return <path key={i} d={d} fill={sl.color} opacity={0.85} />;
  });

  // Inner circle cutout (donut effect)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g>{paths}</g>
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#060D1F" />
    </svg>
  );
}

// ── Spark mini trend bar ──────────────────────────────────────
function MiniTrendBar({ history }: { history: { net_worth: number }[] }) {
  if (history.length < 2) return null;
  const max  = Math.max(...history.map((h) => h.net_worth));
  const min  = Math.min(...history.map((h) => h.net_worth));
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-0.5 h-8">
      {history.map((p, i) => {
        const h = ((p.net_worth - min) / range) * 100;
        const isLast = i === history.length - 1;
        return (
          <div
            key={i}
            className={`flex-1 rounded-t-sm transition-all duration-500 ${
              isLast ? 'bg-indigo-400' : 'bg-white/15'
            }`}
            style={{ height: `${Math.max(8, h)}%` }}
            title={fmtCompact(p.net_worth)}
          />
        );
      })}
    </div>
  );
}

// ── Health Score Ring ─────────────────────────────────────────
function HealthRing({ score }: { score: number }) {
  const r   = 36;
  const c   = 2 * Math.PI * r;
  const pct = Math.min(score / 100, 1);
  const color =
    score >= 80 ? '#10B981' :
    score >= 60 ? '#6366F1' :
    score >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <svg width={90} height={90} viewBox="0 0 90 90" className="-rotate-90">
      <circle cx={45} cy={45} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
      <circle
        cx={45} cy={45} r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={`${c * pct} ${c}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
    </svg>
  );
}

// ── Health Metric Card ────────────────────────────────────────
function HealthMetricCard({ metric }: { metric: HealthMetric }) {
  const statusIcon = {
    excellent: <CheckCircle2 size={12} className="text-emerald-400" />,
    good:      <CheckCircle2 size={12} className="text-indigo-400" />,
    fair:      <AlertTriangle size={12} className="text-amber-400" />,
    poor:      <XCircle size={12} className="text-rose-400" />,
  }[metric.status];

  const barColor = {
    excellent: 'from-emerald-600 to-emerald-400',
    good:      'from-indigo-600 to-indigo-400',
    fair:      'from-amber-600 to-amber-400',
    poor:      'from-rose-700 to-rose-500',
  }[metric.status];

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-xl p-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {statusIcon}
          <span className="text-white/60 text-xs font-medium">{metric.label}</span>
        </div>
        <span className="text-white/80 text-xs font-bold">{metric.value}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${metric.score}%` }}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-white/25 text-[10px]">{metric.description}</span>
        <span className="text-white/25 text-[10px]">Target: {metric.benchmark}</span>
      </div>
    </div>
  );
}

// ── Asset Class Icon ──────────────────────────────────────────
function ClassIcon({ cls }: { cls: string }) {
  switch (cls) {
    case 'STOCK':       return <BarChart2 size={12} />;
    case 'CRYPTO':      return <Coins size={12} />;
    case 'REAL_ESTATE': return <Building2 size={12} />;
    default:            return <Layers size={12} />;
  }
}

// ── Main Component ────────────────────────────────────────────
export const NetWorthDashboard: React.FC<{
  onNavigateFiat: () => void;
  onNavigateMarket: () => void;
}> = ({ onNavigateFiat, onNavigateMarket }) => {

  const computeSnapshot    = useNetWorthStore((s) => s.computeSnapshot);
  const snapshot           = useNetWorthStore((s) => s.snapshot);
  const allocationSlices   = useNetWorthStore((s) => s.allocationSlices);
  const trendHistory       = useNetWorthStore((s) => s.trendHistory);
  const isComputing        = useNetWorthStore((s) => s.isComputing);
  const getWealthHealthScore = useNetWorthStore((s) => s.getWealthHealthScore);

  const syncMarketData     = useMarketStore((s) => s.syncMarketData);
  const isSyncing          = useMarketStore((s) => s.isSyncing);
  const enrichedAssets     = useMarketStore((s) => s.enrichedAssets);
  const getPortfolioSummary = useMarketStore((s) => s.getPortfolioSummary);
  const lastSyncedAt       = useMarketStore((s) => s.lastSyncedAt);

  const bankAccounts       = useFiatStore((s) => s.bankAccounts);
  const getBalanceByBank   = useFiatStore((s) => s.getBalanceByBank);
  const getRecentTransactions = useFiatStore((s) => s.getRecentTransactions);

  const [showAllBanks, setShowAllBanks]     = useState(false);
  const [showTopAssets, setShowTopAssets]   = useState(false);
  const [tooltipSlice, setTooltipSlice]     = useState<string | null>(null);

  // ── Init: sync market data then compute snapshot ──────────
  const handleRefresh = useCallback(async () => {
    await syncMarketData();
    computeSnapshot();
  }, [syncMarketData, computeSnapshot]);

  useEffect(() => {
    // On mount: trigger market sync → then snapshot
    (async () => {
      await syncMarketData();
      computeSnapshot();
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-compute whenever market sync finishes
  useEffect(() => {
    if (!isSyncing && enrichedAssets.length > 0) {
      computeSnapshot();
    }
  }, [isSyncing, enrichedAssets.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived values
  const healthScore    = getWealthHealthScore();
  const portfolioSummary = getPortfolioSummary();
  const recentTxs      = getRecentTransactions(5);
  const topAssets      = [...enrichedAssets]
    .sort((a, b) => b.current_value_num - a.current_value_num)
    .slice(0, showTopAssets ? 6 : 3);

  const isNetPositive  = (snapshot?.total_floating_pnl ?? 0) >= 0;
  const netWorth       = snapshot?.net_worth ?? 0;

  // ── Health Metrics ────────────────────────────────────────
  const healthMetrics: HealthMetric[] = snapshot ? [
    {
      id:          'savings',
      label:       'Savings Rate',
      description: 'Monthly income saved',
      score:       Math.min(snapshot.savings_rate * 3.33, 100),
      status:      snapshot.savings_rate >= 30 ? 'excellent'
                 : snapshot.savings_rate >= 20 ? 'good'
                 : snapshot.savings_rate >= 10 ? 'fair' : 'poor',
      value:       `${snapshot.savings_rate.toFixed(1)}%`,
      benchmark:   '>20%',
    },
    {
      id:          'diversification',
      label:       'Diversification',
      description: 'Asset class spread',
      score:       Math.min((Object.keys(portfolioSummary.byClass).length / 4) * 100, 100),
      status:      Object.keys(portfolioSummary.byClass).length >= 4 ? 'excellent'
                 : Object.keys(portfolioSummary.byClass).length >= 3 ? 'good'
                 : Object.keys(portfolioSummary.byClass).length >= 2 ? 'fair' : 'poor',
      value:       `${Object.keys(portfolioSummary.byClass).length} classes`,
      benchmark:   '4+ classes',
    },
    {
      id:          'return',
      label:       'Portfolio Return',
      description: 'Floating PnL on cost basis',
      score:       Math.min(Math.max(snapshot.total_return_pct * 5, 0), 100),
      status:      snapshot.total_return_pct >= 20 ? 'excellent'
                 : snapshot.total_return_pct >= 10 ? 'good'
                 : snapshot.total_return_pct >= 0  ? 'fair' : 'poor',
      value:       fmtPct(snapshot.total_return_pct, true),
      benchmark:   '>10% p.a.',
    },
    {
      id:          'liquidity',
      label:       'Liquidity Buffer',
      description: 'Fiat vs total wealth',
      score:       (() => {
        const fp = snapshot.net_worth > 0
          ? (snapshot.total_fiat / snapshot.net_worth) * 100 : 0;
        return fp >= 15 && fp <= 50 ? 100 : fp < 10 ? 30 : fp > 70 ? 50 : 70;
      })(),
      status:      (() => {
        const fp = snapshot.net_worth > 0
          ? (snapshot.total_fiat / snapshot.net_worth) * 100 : 0;
        return fp >= 15 && fp <= 50 ? 'excellent' : fp >= 10 ? 'good' : 'fair';
      })(),
      value:       snapshot.net_worth > 0
        ? `${((snapshot.total_fiat / snapshot.net_worth) * 100).toFixed(0)}% fiat`
        : '—',
      benchmark:   '15-50% fiat',
    },
  ] : [];

  // ── Loading skeleton ──────────────────────────────────────
  if (!snapshot && (isComputing || isSyncing)) {
    return (
      <div className="min-h-screen bg-[#060D1F] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto animate-pulse">
            <Shield size={28} className="text-indigo-400" />
          </div>
          <p className="text-white/40 text-sm">Computing your net worth…</p>
          <div className="flex items-center gap-2 justify-center text-white/25 text-xs">
            <RefreshCw size={12} className="animate-spin" />
            Aggregating market data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060D1F] text-white">
      {/* ── Sync bar ─────────────────────────────────────────── */}
      <div className="bg-white/[0.02] border-b border-white/[0.05] px-6 py-2 flex items-center gap-3 text-[11px] text-white/30">
        <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
        {isSyncing
          ? 'Fetching live market prices…'
          : lastSyncedAt
          ? `Prices synced at ${new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(lastSyncedAt))}`
          : 'Ready'
        }
        <button
          onClick={handleRefresh}
          disabled={isSyncing || isComputing}
          className="ml-auto flex items-center gap-1.5 hover:text-white/60 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={10} className={(isSyncing || isComputing) ? 'animate-spin' : ''} />
          Refresh All
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ════════════════════════════════════════════════════
            SECTION 1 — NET WORTH HERO
        ════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0D1B38] via-[#0F1E42] to-[#08122B] border border-white/[0.08] p-6 sm:p-8">
          {/* Ambient glow */}
          <div className={`absolute -top-20 -right-20 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-1000 ${
            isNetPositive ? 'bg-emerald-500' : 'bg-rose-500'
          }`} />
          <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left: Net Worth number */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Shield size={11} className="text-indigo-400" />
                  </div>
                  <p className="text-white/40 text-xs font-medium tracking-wide uppercase">Total Net Worth</p>
                </div>

                <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tighter leading-none mb-1">
                  {fmtCompact(netWorth)}
                </h1>
                <p className="text-white/25 text-sm font-mono mb-4">{fmtIDR(netWorth)}</p>

                {/* PnL badge */}
                {snapshot && (
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${
                    isNetPositive
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    {isNetPositive
                      ? <TrendingUp size={15} />
                      : <TrendingDown size={15} />
                    }
                    Portfolio PnL:&nbsp;
                    <span>{isNetPositive ? '+' : ''}{fmtCompact(snapshot.total_floating_pnl)}</span>
                    <span className="opacity-60">
                      ({fmtPct(snapshot.total_return_pct, true)})
                    </span>
                  </div>
                )}

                {/* Mini trend */}
                {trendHistory.length > 1 && (
                  <div className="mt-4 max-w-xs">
                    <p className="text-white/20 text-[10px] mb-1.5">6-Month Trajectory</p>
                    <MiniTrendBar history={trendHistory} />
                  </div>
                )}
              </div>

              {/* Right: Donut + legend */}
              <div className="flex items-center gap-6">
                {/* Donut */}
                <div className="relative flex-shrink-0">
                  {allocationSlices.length > 0 ? (
                    <DonutChart slices={allocationSlices} size={160} />
                  ) : (
                    <div className="w-40 h-40 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <PieChart size={32} className="text-white/20" />
                    </div>
                  )}
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-white/30 text-[9px]">Allocation</p>
                    <p className="text-white font-black text-sm">{allocationSlices.length} types</p>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-2 min-w-[140px]">
                  {allocationSlices.map((sl) => (
                    <div
                      key={sl.label}
                      className={`flex items-center justify-between gap-3 p-2 rounded-lg transition-all cursor-pointer ${
                        tooltipSlice === sl.label ? 'bg-white/8' : 'hover:bg-white/5'
                      }`}
                      onMouseEnter={() => setTooltipSlice(sl.label)}
                      onMouseLeave={() => setTooltipSlice(null)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: sl.color }}
                        />
                        <span className="text-white/55 text-xs">{sl.label}</span>
                      </div>
                      <span className="text-white/80 text-xs font-bold">{sl.percentage.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            SECTION 2 — SPLIT OVERVIEW: Fiat vs Investments
        ════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Fiat Card */}
          <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/60 to-[#0A1025] p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                    <Wallet size={14} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-indigo-300/70 text-xs font-semibold">Cash & Banks</p>
                    <p className="text-white/30 text-[10px]">{snapshot?.fiat_accounts_count ?? 0} accounts</p>
                  </div>
                </div>
                <button
                  onClick={onNavigateFiat}
                  className="flex items-center gap-1 text-indigo-400/60 hover:text-indigo-400 text-xs transition-colors"
                >
                  Manage <ChevronRight size={12} />
                </button>
              </div>

              <p className="text-3xl font-black text-white mb-1">
                {fmtCompact(snapshot?.total_fiat ?? 0)}
              </p>
              <p className="text-white/30 text-xs font-mono mb-4">
                {fmtIDR(snapshot?.total_fiat ?? 0)}
              </p>

              {/* Monthly flow pills */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-500/10 border border-emerald-500/15 rounded-xl p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <ArrowUpRight size={11} className="text-emerald-400" />
                    <span className="text-emerald-400/70 text-[10px]">Income</span>
                  </div>
                  <p className="text-emerald-400 text-sm font-bold">
                    {fmtCompact(snapshot?.monthly_income ?? 0)}
                  </p>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/15 rounded-xl p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <ArrowDownLeft size={11} className="text-rose-400" />
                    <span className="text-rose-400/70 text-[10px]">Expense</span>
                  </div>
                  <p className="text-rose-400 text-sm font-bold">
                    {fmtCompact(snapshot?.monthly_expense ?? 0)}
                  </p>
                </div>
              </div>

              {/* Savings rate bar */}
              {(snapshot?.monthly_income ?? 0) > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-white/30 text-[10px]">Monthly Savings Rate</span>
                    <span className={`text-[10px] font-bold ${
                      (snapshot?.savings_rate ?? 0) >= 20 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {snapshot?.savings_rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        (snapshot?.savings_rate ?? 0) >= 20
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                          : 'bg-gradient-to-r from-amber-600 to-amber-400'
                      }`}
                      style={{ width: `${Math.min(snapshot?.savings_rate ?? 0, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Mini bank list */}
              <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
                {(showAllBanks ? bankAccounts : bankAccounts.slice(0, 3)).map((acc) => {
                  const bal = getBalanceByBank(acc.id);
                  return (
                    <div key={acc.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: acc.color + '33', color: acc.color }}
                        >
                          {acc.icon}
                        </div>
                        <span className="text-white/50 text-xs">{acc.bank_name}</span>
                      </div>
                      <span className="text-white/70 text-xs font-semibold">
                        {fmtCompact(bal)}
                      </span>
                    </div>
                  );
                })}
                {bankAccounts.length > 3 && (
                  <button
                    onClick={() => setShowAllBanks((v) => !v)}
                    className="text-indigo-400/50 hover:text-indigo-400 text-[10px] w-full text-left transition-colors"
                  >
                    {showAllBanks ? '▲ Show less' : `▼ +${bankAccounts.length - 3} more accounts`}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Investments Card */}
          <div className={`relative overflow-hidden rounded-2xl border p-5 ${
            isNetPositive
              ? 'border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-[#0A1025]'
              : 'border-rose-500/20 bg-gradient-to-br from-rose-950/30 to-[#0A1025]'
          }`}>
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none ${
              isNetPositive ? 'bg-emerald-500/10' : 'bg-rose-500/10'
            }`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                    isNetPositive
                      ? 'bg-emerald-500/15 border-emerald-500/25'
                      : 'bg-rose-500/15 border-rose-500/25'
                  }`}>
                    <BarChart2 size={14} className={isNetPositive ? 'text-emerald-400' : 'text-rose-400'} />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${isNetPositive ? 'text-emerald-300/70' : 'text-rose-300/70'}`}>
                      Investments
                    </p>
                    <p className="text-white/30 text-[10px]">{snapshot?.asset_count ?? 0} assets tracked</p>
                  </div>
                </div>
                <button
                  onClick={onNavigateMarket}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    isNetPositive ? 'text-emerald-400/60 hover:text-emerald-400' : 'text-rose-400/60 hover:text-rose-400'
                  }`}
                >
                  Portfolio <ChevronRight size={12} />
                </button>
              </div>

              <p className="text-3xl font-black text-white mb-1">
                {fmtCompact(snapshot?.total_investments ?? 0)}
              </p>
              <p className="text-white/30 text-xs font-mono mb-4">
                {fmtIDR(snapshot?.total_investments ?? 0)}
              </p>

              {/* PnL + Return */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className={`rounded-xl p-2.5 border ${
                  isNetPositive
                    ? 'bg-emerald-500/10 border-emerald-500/15'
                    : 'bg-rose-500/10 border-rose-500/15'
                }`}>
                  <div className="flex items-center gap-1 mb-1">
                    {isNetPositive
                      ? <TrendingUp size={11} className="text-emerald-400" />
                      : <TrendingDown size={11} className="text-rose-400" />
                    }
                    <span className={`text-[10px] ${isNetPositive ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                      Floating PnL
                    </span>
                  </div>
                  <p className={`text-sm font-bold ${isNetPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isNetPositive ? '+' : ''}{fmtCompact(snapshot?.total_floating_pnl ?? 0)}
                  </p>
                </div>
                <div className={`rounded-xl p-2.5 border ${
                  isNetPositive
                    ? 'bg-emerald-500/10 border-emerald-500/15'
                    : 'bg-rose-500/10 border-rose-500/15'
                }`}>
                  <div className="flex items-center gap-1 mb-1">
                    <Target size={11} className={isNetPositive ? 'text-emerald-400' : 'text-rose-400'} />
                    <span className={`text-[10px] ${isNetPositive ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                      Return
                    </span>
                  </div>
                  <p className={`text-sm font-bold ${isNetPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {fmtPct(snapshot?.total_return_pct ?? 0, true)}
                  </p>
                </div>
              </div>

              {/* Class breakdown */}
              <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                {(Object.entries(portfolioSummary.byClass) as [AssetClass, typeof portfolioSummary.byClass[AssetClass]][])
                  .sort(([, a], [, b]) => b.currentValue - a.currentValue)
                  .map(([cls, data]) => {
                    const cfg   = ASSET_CLASS_CONFIG[cls];
                    const isUp  = data.pnl >= 0;
                    return (
                      <div key={cls} className="flex items-center gap-2">
                        <span style={{ color: cfg.color }}>
                          <ClassIcon cls={cls} />
                        </span>
                        <span className="text-white/45 text-xs flex-1">{cfg.label}</span>
                        <span className="text-white/65 text-xs font-semibold">
                          {fmtCompact(data.currentValue)}
                        </span>
                        <span className={`text-[10px] font-bold w-14 text-right ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isUp ? '+' : ''}{data.returnPct.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            SECTION 3 — WEALTH HEALTH SCORE
        ════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-400" />
              <h3 className="text-white font-bold text-base">Wealth Health Score</h3>
            </div>
            <div className="flex items-center gap-1.5 text-white/30 text-[11px]">
              <Info size={11} />
              Composite of 4 financial indicators
            </div>
          </div>

          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left gap-6 mb-5">
            {/* Ring */}
            <div className="flex justify-center items-center w-full sm:w-auto py-4">
              <div className="relative flex-shrink-0">
                <HealthRing score={healthScore} />
                <div className="absolute inset-0 flex flex-col items-center justify-center rotate-90 w-full h-full">
                  <span className="text-2xl font-black text-white">{healthScore}</span>
                  <span className="text-white/30 text-[10px]">/ 100</span>
                </div>
              </div>
            </div>

            {/* Score label */}
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
              <p className={`text-xl font-black mb-1 ${
                healthScore >= 80 ? 'text-emerald-400' :
                healthScore >= 60 ? 'text-indigo-400' :
                healthScore >= 40 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {healthScore >= 80 ? 'Excellent'
                : healthScore >= 60 ? 'Good'
                : healthScore >= 40 ? 'Fair'
                : 'Needs Attention'}
              </p>
              <p className="text-white/35 text-sm max-w-sm">
                {healthScore >= 80
                  ? 'Your finances are in great shape. Keep compounding your wealth systematically.'
                  : healthScore >= 60
                  ? 'Solid foundation. Focus on increasing savings rate and diversification.'
                  : healthScore >= 40
                  ? 'Room to improve. Consider increasing investments and tracking expenses.'
                  : 'Take action now. Review your budget and start investing consistently.'}
              </p>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {healthMetrics.map((m) => (
              <HealthMetricCard key={m.id} metric={m} />
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            SECTION 4 — TOP HOLDINGS + RECENT TRANSACTIONS
        ════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Top Holdings */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Activity size={14} className="text-indigo-400" />
                Top Holdings
              </h3>
              <button
                onClick={onNavigateMarket}
                className="text-indigo-400/50 hover:text-indigo-400 text-xs flex items-center gap-1 transition-colors"
              >
                View All <ChevronRight size={11} />
              </button>
            </div>

            {topAssets.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-center">
                <BarChart2 size={28} className="text-white/15 mx-auto mb-2" />
                <p className="text-white/30 text-sm">No assets synced yet.</p>
                <button
                  onClick={handleRefresh}
                  className="mt-3 text-indigo-400 text-xs hover:text-indigo-300 transition-colors"
                >
                  Sync Market Data →
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {topAssets.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      compact
                    />
                  ))}
                </div>
                {enrichedAssets.length > 3 && (
                  <button
                    onClick={() => setShowTopAssets((v) => !v)}
                    className="mt-3 w-full py-2 rounded-xl border border-white/8 text-white/30 hover:text-white/60 text-xs transition-colors hover:bg-white/5"
                  >
                    {showTopAssets ? '▲ Show fewer' : `▼ Show ${Math.min(enrichedAssets.length - 3, 3)} more`}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Recent Transactions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <ArrowUpRight size={14} className="text-indigo-400" />
                Recent Transactions
              </h3>
              <button
                onClick={onNavigateFiat}
                className="text-indigo-400/50 hover:text-indigo-400 text-xs flex items-center gap-1 transition-colors"
              >
                Ledger <ChevronRight size={11} />
              </button>
            </div>

            <div className="bg-white/[0.025] border border-white/8 rounded-2xl overflow-hidden">
              {recentTxs.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-white/30 text-sm">No transactions yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {recentTxs.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        tx.type === 'INCOME'   ? 'bg-emerald-500/15' :
                        tx.type === 'EXPENSE'  ? 'bg-rose-500/15' :
                        'bg-indigo-500/15'
                      }`}>
                        {tx.type === 'INCOME'
                          ? <ArrowUpRight size={13} className="text-emerald-400" />
                          : tx.type === 'EXPENSE'
                          ? <ArrowDownLeft size={13} className="text-rose-400" />
                          : <ArrowUpRight size={13} className="text-indigo-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-xs font-medium truncate">{tx.category}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="text-[10px] px-1 py-0.5 rounded font-medium"
                            style={{ backgroundColor: tx.bankColor + '33', color: tx.bankColor }}
                          >
                            {tx.bankName}
                          </span>
                          <span className="text-white/25 text-[10px]">
                            {new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' })
                              .format(new Date(tx.date))}
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs font-bold flex-shrink-0 ${
                        tx.type === 'INCOME'  ? 'text-emerald-400' :
                        tx.type === 'EXPENSE' ? 'text-rose-400' :
                        'text-indigo-400'
                      }`}>
                        {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : '⇄'}
                        {fmtCompact(parseFloat(tx.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            SECTION 5 — QUICK NAVIGATE CARDS
        ════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={onNavigateFiat}
            className="group text-left rounded-2xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/35 p-5 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                <Wallet size={18} className="text-indigo-400" />
              </div>
              <ChevronRight size={18} className="text-indigo-400/40 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </div>
            <h4 className="text-white font-bold text-base mb-1">Fiat Ledger</h4>
            <p className="text-white/35 text-sm">
              Manage bank accounts, log income &amp; expenses, track budgets.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-indigo-400/70 text-xs font-semibold">
                {fmtCompact(snapshot?.total_fiat ?? 0)} across {snapshot?.fiat_accounts_count ?? 0} accounts
              </span>
            </div>
          </button>

          <button
            onClick={onNavigateMarket}
            className={`group text-left rounded-2xl border p-5 transition-all duration-200 ${
              isNetPositive
                ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/35'
                : 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/35'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                isNetPositive
                  ? 'bg-emerald-500/15 border-emerald-500/25'
                  : 'bg-rose-500/15 border-rose-500/25'
              }`}>
                <TrendingUp size={18} className={isNetPositive ? 'text-emerald-400' : 'text-rose-400'} />
              </div>
              <ChevronRight size={18} className={`${isNetPositive ? 'text-emerald-400/40 group-hover:text-emerald-400' : 'text-rose-400/40 group-hover:text-rose-400'} group-hover:translate-x-0.5 transition-all`} />
            </div>
            <h4 className="text-white font-bold text-base mb-1">Investment Portfolio</h4>
            <p className="text-white/35 text-sm">
              Live prices, PnL tracking, asset allocation across stocks, crypto &amp; real estate.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className={`text-xs font-semibold ${isNetPositive ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                {fmtCompact(snapshot?.total_investments ?? 0)} · {fmtPct(snapshot?.total_return_pct ?? 0, true)} return
              </span>
            </div>
          </button>
        </div>

        <div className="h-16" />
      </div>
    </div>
  );
};
