// ============================================================
// OmniWealth – MarketDashboard.tsx
// Full investment portfolio view: live prices, PnL, allocation
// Integrates with useMarketStore (Zustand) + aggregation engine
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, RefreshCw, Plus, BarChart2,
  Coins, Building2, Layers, AlertCircle, CheckCircle2,
  Activity, PieChart, Wallet, ArrowUpRight,
} from 'lucide-react';
import { useMarketStore, ASSET_CLASS_CONFIG } from '../store/useMarketStore';
import { AssetCard } from './AssetCard';
import { AddAssetModal } from './AddAssetModal';
import type { AssetClass, EnrichedAsset } from '../types/market';

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

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(iso));
}

// ── Class icon ────────────────────────────────────────────────
function ClassIcon({ cls, size = 14 }: { cls: AssetClass; size?: number }) {
  switch (cls) {
    case 'STOCK':       return <BarChart2 size={size} />;
    case 'CRYPTO':      return <Coins size={size} />;
    case 'REAL_ESTATE': return <Building2 size={size} />;
    default:            return <Layers size={size} />;
  }
}

// ── Allocation bar ────────────────────────────────────────────
function AllocationBar({ summary }: { summary: ReturnType<typeof useMarketStore.getState>['getPortfolioSummary'] extends () => infer R ? R : never }) {
  const classes = Object.entries(summary.byClass) as [AssetClass, (typeof summary.byClass)[AssetClass]][];
  if (classes.length === 0) return null;

  return (
    <div className="w-full h-2 rounded-full overflow-hidden flex gap-px bg-white/5">
      {classes.map(([cls, data]) => {
        const cfg = ASSET_CLASS_CONFIG[cls];
        return (
          <div
            key={cls}
            className="h-full transition-all duration-700"
            style={{ width: `${data.allocation}%`, backgroundColor: cfg.color }}
            title={`${cfg.label}: ${data.allocation.toFixed(1)}%`}
          />
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export const MarketDashboard: React.FC = () => {
  const syncMarketData        = useMarketStore((s) => s.syncMarketData);
  const isSyncing             = useMarketStore((s) => s.isSyncing);
  const lastSyncedAt          = useMarketStore((s) => s.lastSyncedAt);
  const syncErrors            = useMarketStore((s) => s.syncErrors);
  const enrichedAssets        = useMarketStore((s) => s.enrichedAssets);
  const removeAsset           = useMarketStore((s) => s.removeAsset);
  const updateManualValuation = useMarketStore((s) => s.updateManualValuation);
  const getTotalInvestmentValue = useMarketStore((s) => s.getTotalInvestmentValue);
  const getTotalFloatingPnL     = useMarketStore((s) => s.getTotalFloatingPnL);
  const getTotalCapital         = useMarketStore((s) => s.getTotalCapital);
  const getTotalReturnPercentage = useMarketStore((s) => s.getTotalReturnPercentage);
  const getPortfolioSummary     = useMarketStore((s) => s.getPortfolioSummary);

  const [activeFilter, setActiveFilter] = useState<AssetClass | 'ALL'>('ALL');
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [editValuation, setEditValuation] = useState<{ id: string; val: number } | null>(null);
  const [newValuation, setNewValuation] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'pnl' | 'return'>('value');

  // ── Auto-sync on mount ────────────────────────────────────
  useEffect(() => {
    syncMarketData();
    // Auto-refresh every 90 seconds
    const interval = setInterval(syncMarketData, 90_000);
    return () => clearInterval(interval);
  }, [syncMarketData]);

  const handleSync = useCallback(() => {
    if (!isSyncing) syncMarketData();
  }, [isSyncing, syncMarketData]);

  const handleEditValuation = (id: string, currentVal: number) => {
    setEditValuation({ id, val: currentVal });
    setNewValuation(currentVal.toFixed(0));
  };

  const handleSaveValuation = async () => {
    if (!editValuation || !newValuation) return;
    updateManualValuation(editValuation.id, parseFloat(newValuation));
    await syncMarketData();
    setEditValuation(null);
  };

  // Derived
  const totalValue   = getTotalInvestmentValue();
  const totalPnL     = getTotalFloatingPnL();
  const totalCapital = getTotalCapital();
  const returnPct    = getTotalReturnPercentage();
  const summary      = getPortfolioSummary();
  const isProfitable = totalPnL >= 0;

  // ── Filter & sort assets ──────────────────────────────────
  const filtered: EnrichedAsset[] = enrichedAssets
    .filter((a) => activeFilter === 'ALL' || a.asset_class === activeFilter)
    .sort((a, b) => {
      if (sortBy === 'value')  return b.current_value_num - a.current_value_num;
      if (sortBy === 'pnl')    return b.floating_pnl_num - a.floating_pnl_num;
      if (sortBy === 'return') return b.return_pct_num - a.return_pct_num;
      return 0;
    });

  // ── Class filter tabs ─────────────────────────────────────
  const filterTabs: { key: AssetClass | 'ALL'; label: string }[] = [
    { key: 'ALL',         label: 'All Assets' },
    { key: 'STOCK',       label: 'Stocks'      },
    { key: 'CRYPTO',      label: 'Crypto'      },
    { key: 'REAL_ESTATE', label: 'Real Estate' },
    { key: 'MUTUAL_FUND', label: 'Funds'       },
  ];

  return (
    <div className="min-h-screen bg-[#060D1F] text-white">

      {/* ── Sync Status Bar ──────────────────────────────────── */}
      {(lastSyncedAt || syncErrors.length > 0) && (
        <div className={`px-6 py-2 flex items-center gap-3 text-xs border-b ${
          syncErrors.length > 0
            ? 'bg-amber-500/5 border-amber-500/20 text-amber-400/70'
            : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400/50'
        }`}>
          {syncErrors.length > 0
            ? <AlertCircle size={11} />
            : <CheckCircle2 size={11} />
          }
          {lastSyncedAt && `Last synced: ${fmtTime(lastSyncedAt)}`}
          {syncErrors.length > 0 && (
            <span className="text-amber-400/50">
              · {syncErrors.length} asset(s) on fallback pricing
            </span>
          )}
          <button onClick={handleSync} disabled={isSyncing} className="ml-auto flex items-center gap-1 hover:text-white transition-colors">
            <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing…' : 'Refresh'}
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Portfolio Hero ────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0F1B35] via-[#121F3D] to-[#0A1428] p-6 sm:p-8">
          {/* Ambient glow */}
          <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none opacity-30 ${
            isProfitable ? 'bg-emerald-500' : 'bg-rose-500'
          }`} />
          <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-white/40 text-sm flex items-center gap-2 mb-1">
                  <PieChart size={13} className="text-indigo-400" />
                  Total Investment Portfolio
                </p>
                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                  {fmtCompact(totalValue)}
                </h2>
                <p className="text-white/30 text-sm mt-1 font-mono">{fmtIDR(totalValue)}</p>
              </div>

              {/* PnL block */}
              <div className={`rounded-2xl border px-5 py-4 ${
                isProfitable
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-rose-500/10 border-rose-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {isProfitable
                    ? <TrendingUp size={16} className="text-emerald-400" />
                    : <TrendingDown size={16} className="text-rose-400" />
                  }
                  <span className={`text-xs font-medium ${isProfitable ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                    Floating PnL
                  </span>
                </div>
                <p className={`text-2xl font-black ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isProfitable ? '+' : ''}{fmtCompact(totalPnL)}
                </p>
                <p className={`text-lg font-bold mt-0.5 ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {isProfitable ? '+' : ''}{returnPct.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                {
                  label: 'Capital Deployed',
                  value: fmtCompact(totalCapital),
                  icon: <Wallet size={13} className="text-indigo-400" />,
                  cls: 'text-white/80',
                },
                {
                  label: 'Unrealized Gain',
                  value: `${isProfitable ? '+' : ''}${fmtCompact(totalPnL)}`,
                  icon: isProfitable
                    ? <TrendingUp size={13} className="text-emerald-400" />
                    : <TrendingDown size={13} className="text-rose-400" />,
                  cls: isProfitable ? 'text-emerald-400' : 'text-rose-400',
                },
                {
                  label: 'Total Assets',
                  value: enrichedAssets.length.toString(),
                  icon: <Activity size={13} className="text-purple-400" />,
                  cls: 'text-white/80',
                },
                {
                  label: 'Best Performer',
                  value: enrichedAssets.length
                    ? (enrichedAssets.sort((a, b) => b.return_pct_num - a.return_pct_num)[0]?.name.split(' ')[0] ?? '—')
                    : '—',
                  icon: <ArrowUpRight size={13} className="text-amber-400" />,
                  cls: 'text-amber-400',
                },
              ].map((s) => (
                <div key={s.label} className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    {s.icon}
                    <span className="text-white/35 text-[10px]">{s.label}</span>
                  </div>
                  <p className={`text-sm font-bold ${s.cls}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Allocation bar */}
            {Object.keys(summary.byClass).length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/30 text-xs">Portfolio Allocation</span>
                  <div className="flex items-center gap-3">
                    {(Object.keys(summary.byClass) as AssetClass[]).map((cls) => {
                      const c = ASSET_CLASS_CONFIG[cls];
                      return (
                        <div key={cls} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                          <span className="text-white/30 text-[10px]">
                            {c.label} {summary.byClass[cls].allocation.toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <AllocationBar summary={summary} />
              </div>
            )}
          </div>
        </div>

        {/* ── Class PnL Summary Cards ───────────────────────── */}
        {Object.keys(summary.byClass).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(Object.entries(summary.byClass) as [AssetClass, typeof summary.byClass[AssetClass]][]).map(([cls, data]) => {
              const cfg       = ASSET_CLASS_CONFIG[cls];
              const isUp      = data.pnl >= 0;
              return (
                <button
                  key={cls}
                  onClick={() => setActiveFilter(cls === activeFilter ? 'ALL' : cls)}
                  className={`
                    text-left rounded-xl border p-3 transition-all duration-200
                    ${activeFilter === cls
                      ? `${cfg.border} ${cfg.bg}`
                      : 'border-white/8 bg-white/3 hover:border-white/15'
                    }
                  `}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span style={{ color: cfg.color }}>
                      <ClassIcon cls={cls} size={12} />
                    </span>
                    <span className="text-white/50 text-[10px] font-semibold">{cfg.label}</span>
                  </div>
                  <p className="text-white/85 text-sm font-bold leading-tight">{fmtCompact(data.currentValue)}</p>
                  <p className={`text-[11px] font-semibold mt-0.5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isUp ? '+' : ''}{data.returnPct.toFixed(2)}%
                  </p>
                  <p className="text-white/25 text-[9px] mt-0.5">{data.count} asset{data.count !== 1 ? 's' : ''}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Asset List Header ─────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {filterTabs.map((tab) => {
              const active = activeFilter === tab.key;
              const cfg    = tab.key !== 'ALL' ? ASSET_CLASS_CONFIG[tab.key] : null;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border
                    ${active
                      ? 'text-white border-current'
                      : 'text-white/35 border-white/10 hover:border-white/20 hover:text-white/60'
                    }
                  `}
                  style={active && cfg ? {
                    borderColor: cfg.color,
                    backgroundColor: cfg.color + '22',
                    color: cfg.color,
                  } : active ? { borderColor: '#6366F1', backgroundColor: '#6366F122', color: '#818CF8' } : {}}
                >
                  {tab.label}
                  {tab.key !== 'ALL' && enrichedAssets.filter((a) => a.asset_class === tab.key).length > 0 && (
                    <span className="ml-1.5 opacity-60">
                      {enrichedAssets.filter((a) => a.asset_class === tab.key).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-xs bg-white/5 border border-white/10 text-white/60 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="value">Sort: Value</option>
              <option value="pnl">Sort: PnL</option>
              <option value="return">Sort: Return %</option>
            </select>

            {/* Sync button */}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white text-xs font-medium transition-all disabled:opacity-50"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing…' : 'Sync'}
            </button>

            {/* Add Asset */}
            <button
              onClick={() => setShowAddAsset(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-400 text-xs font-semibold transition-all"
            >
              <Plus size={12} /> Add Asset
            </button>
          </div>
        </div>

        {/* ── Empty / Loading state ─────────────────────────── */}
        {isSyncing && enrichedAssets.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/8 bg-white/3 h-44 animate-pulse" />
            ))}
          </div>
        )}

        {!isSyncing && enrichedAssets.length === 0 && (
          <div className="text-center py-16">
            <PieChart size={40} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No assets yet. Add your first investment.</p>
            <button
              onClick={() => setShowAddAsset(true)}
              className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-sm font-semibold hover:bg-indigo-500/25 transition-all"
            >
              <Plus size={14} className="inline mr-1.5" />
              Add First Asset
            </button>
          </div>
        )}

        {/* ── Asset Grid ───────────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onRemove={removeAsset}
                onEditValuation={handleEditValuation}
              />
            ))}
          </div>
        )}

        {/* ── Bottom padding ────────────────────────────────── */}
        <div className="h-20" />
      </div>

      {/* ── Floating Action Button ────────────────────────────── */}
      <button
        onClick={() => setShowAddAsset(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 transition-all hover:scale-110 active:scale-95 z-30"
      >
        <Plus size={22} className="text-white" />
      </button>

      {/* ── Modals ─────────────────────────────────────────────── */}
      {showAddAsset && (
        <AddAssetModal onClose={() => setShowAddAsset(false)} />
      )}

      {/* Edit Valuation Modal */}
      {editValuation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0F1729] border border-white/10 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-white font-bold mb-1">Update Manual Valuation</h3>
            <p className="text-white/40 text-sm mb-4">Enter the current appraised / NAV value per unit.</p>
            <input
              type="number"
              step="any"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-indigo-500/50 transition-all mb-4"
              value={newValuation}
              onChange={(e) => setNewValuation(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditValuation(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-semibold hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveValuation}
                className="flex-1 py-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-sm font-bold hover:bg-indigo-500/25 transition-all"
              >
                Save & Recalculate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
