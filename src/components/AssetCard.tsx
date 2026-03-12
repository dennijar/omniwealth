// ============================================================
// OmniWealth – AssetCard.tsx
// Reusable enriched asset display card with live PnL indicators
// Tailwind CSS + Lucide React, production-grade component
// ============================================================

import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, Building2, Coins, BarChart2,
  Layers, ChevronDown, ChevronUp, Wifi, WifiOff, Pencil, Trash2,
} from 'lucide-react';
import type { EnrichedAsset, AssetClass, AssetStatus } from '../types/market';
import { ASSET_CLASS_CONFIG } from '../store/useMarketStore';

// ── Formatting helpers (inline for portability) ───────────────
function fmtIDR(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(val);
}

function fmtCompact(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(2)} M`;
  if (abs >= 1_000_000)     return `${sign}Rp ${(abs / 1_000_000).toFixed(1)} Jt`;
  if (abs >= 1_000)         return `${sign}Rp ${(abs / 1_000).toFixed(0)} Rb`;
  return fmtIDR(val);
}

function fmtQty(qty: string, cls: AssetClass): string {
  const n = parseFloat(qty);
  if (cls === 'CRYPTO') return n.toLocaleString('id-ID', { maximumFractionDigits: 8 });
  return n.toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

// ── Asset class icon resolver ─────────────────────────────────
function AssetClassIcon({ cls, size = 14 }: { cls: AssetClass; size?: number }) {
  const props = { size, strokeWidth: 2 };
  switch (cls) {
    case 'STOCK':       return <BarChart2 {...props} />;
    case 'CRYPTO':      return <Coins {...props} />;
    case 'REAL_ESTATE': return <Building2 {...props} />;
    case 'COMMODITY':   return <Layers {...props} />;
    case 'MUTUAL_FUND': return <Layers {...props} />;
    default:            return <BarChart2 {...props} />;
  }
}

// ── Price source badge ────────────────────────────────────────
function SourceBadge({ source }: { source: AssetStatus }) {
  const map: Record<AssetStatus, { label: string; icon: React.ReactNode; cls: string }> = {
    LIVE:     { label: 'Live',     icon: <Wifi size={10} />,    cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    FALLBACK: { label: 'Fallback', icon: <WifiOff size={10} />, cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20'       },
    MANUAL:   { label: 'Manual',   icon: <Pencil size={10} />,  cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20'          },
    ERROR:    { label: 'Error',    icon: <WifiOff size={10} />, cls: 'text-rose-400 bg-rose-500/10 border-rose-500/20'          },
  };
  const cfg = map[source] ?? map.FALLBACK;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Component Props ───────────────────────────────────────────
export interface AssetCardProps {
  asset: EnrichedAsset;
  onRemove?: (id: string) => void;
  onEditValuation?: (id: string, currentVal: number) => void;
  compact?: boolean;
}

// ── AssetCard ─────────────────────────────────────────────────
export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  onRemove,
  onEditValuation,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  const isProfit   = asset.floating_pnl_num >= 0;
  const cfg        = ASSET_CLASS_CONFIG[asset.asset_class];
  const pnlPrefix  = isProfit ? '+' : '';

  // ── Compact variant ───────────────────────────────────────
  if (compact) {
    return (
      <div className={`
        relative rounded-xl border p-3.5 transition-all duration-200
        hover:border-white/20 hover:bg-white/[0.04] cursor-pointer
        ${cfg.border} bg-white/[0.025]
      `}>
        <div className="flex items-center justify-between gap-2">
          {/* Left: icon + name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: cfg.color + '22' }}
            >
              <span style={{ color: cfg.color }}>
                <AssetClassIcon cls={asset.asset_class} size={14} />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white/90 text-xs font-semibold truncate">{asset.name}</p>
              <p className="text-white/30 text-[10px]">{asset.symbol ?? asset.asset_class}</p>
            </div>
          </div>

          {/* Right: PnL */}
          <div className="text-right flex-shrink-0">
            <p className={`text-sm font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
              {pnlPrefix}{asset.return_pct_num.toFixed(2)}%
            </p>
            <p className={`text-[10px] font-medium ${isProfit ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
              {pnlPrefix}{fmtCompact(asset.floating_pnl_num)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Full variant ──────────────────────────────────────────
  return (
    <div className={`
      relative rounded-2xl border transition-all duration-200
      bg-white/[0.025] hover:bg-white/[0.04]
      ${cfg.border} overflow-hidden
    `}>
      {/* Top accent line */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${cfg.color}55, transparent)` }} />

      <div className="p-4">
        {/* ── Header row ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Left: icon + identity */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: cfg.color + '22' }}
            >
              <span style={{ color: cfg.color }}>
                <AssetClassIcon cls={asset.asset_class} size={18} />
              </span>
            </div>
            <div>
              <h4 className="text-white/95 font-bold text-sm leading-tight">{asset.name}</h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                {asset.symbol && (
                  <span className="text-white/40 text-xs font-mono">{asset.symbol}</span>
                )}
                <span className="text-white/20 text-xs">·</span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ color: cfg.color, backgroundColor: cfg.color + '22' }}
                >
                  {cfg.label}
                </span>
                <SourceBadge source={asset.price_source} />
              </div>
            </div>
          </div>

          {/* Right: current value */}
          <div className="text-right">
            <p className="text-white/90 font-black text-base leading-tight">
              {fmtCompact(asset.current_value_num)}
            </p>
            <p className="text-white/30 text-xs mt-0.5">Current Value</p>
          </div>
        </div>

        {/* ── Core metrics row ────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {/* Live Price */}
          <div className="bg-white/5 rounded-xl p-2.5">
            <p className="text-white/35 text-[10px] mb-1">Live Price</p>
            <p className="text-white/80 text-xs font-bold leading-tight">
              {fmtCompact(asset.live_price_num)}
            </p>
          </div>
          {/* Quantity */}
          <div className="bg-white/5 rounded-xl p-2.5">
            <p className="text-white/35 text-[10px] mb-1">Quantity</p>
            <p className="text-white/80 text-xs font-bold leading-tight">
              {fmtQty(asset.quantity, asset.asset_class)}
            </p>
          </div>
          {/* Avg Buy */}
          <div className="bg-white/5 rounded-xl p-2.5">
            <p className="text-white/35 text-[10px] mb-1">Avg Buy</p>
            <p className="text-white/80 text-xs font-bold leading-tight">
              {fmtCompact(parseFloat(asset.average_buy_price))}
            </p>
          </div>
        </div>

        {/* ── PnL Banner ──────────────────────────────────── */}
        <div className={`
          rounded-xl px-3.5 py-2.5 flex items-center justify-between
          ${isProfit
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : 'bg-rose-500/10 border border-rose-500/20'}
        `}>
          <div className="flex items-center gap-2">
            {isProfit
              ? <TrendingUp size={15} className="text-emerald-400" />
              : <TrendingDown size={15} className="text-rose-400" />
            }
            <div>
              <p className={`text-xs font-medium ${isProfit ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                Floating PnL
              </p>
              <p className={`text-sm font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                {pnlPrefix}{fmtCompact(asset.floating_pnl_num)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-[10px] ${isProfit ? 'text-emerald-400/60' : 'text-rose-400/60'}`}>Return</p>
            <p className={`text-xl font-black tabular-nums ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
              {pnlPrefix}{asset.return_pct_num.toFixed(2)}
              <span className="text-sm font-semibold">%</span>
            </p>
          </div>
        </div>

        {/* ── Expand toggle ────────────────────────────────── */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full mt-2.5 flex items-center justify-center gap-1 text-white/20 hover:text-white/50 text-[11px] transition-colors"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Less' : 'Details'}
        </button>

        {/* ── Expanded details ─────────────────────────────── */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/8 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/35">Capital Deployed</span>
                <span className="text-white/65 font-semibold">{fmtCompact(asset.total_capital_num)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/35">Sector</span>
                <span className="text-white/65 font-semibold">{asset.sector ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/35">Currency</span>
                <span className="text-white/65 font-semibold">{asset.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/35">Last Updated</span>
                <span className="text-white/65 font-semibold">
                  {new Intl.DateTimeFormat('id-ID', {
                    hour: '2-digit', minute: '2-digit',
                  }).format(new Date(asset.last_updated))}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              {(asset.asset_class === 'REAL_ESTATE' || asset.asset_class === 'MUTUAL_FUND') && onEditValuation && (
                <button
                  onClick={() => onEditValuation(asset.id, asset.live_price_num)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-semibold transition-all"
                >
                  <Pencil size={11} /> Update Valuation
                </button>
              )}
              {onRemove && (
                <button
                  onClick={() => onRemove(asset.id)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold transition-all"
                >
                  <Trash2 size={11} /> Remove
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetCard;
