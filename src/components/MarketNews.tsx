import React from 'react';
import { AlertTriangle, Newspaper, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { useNewsStream } from '../hooks/useNewsStream';
import type { NewsItemPayload, NewsSentiment, NewsPriority, FlashAlert } from '../hooks/useNewsStream';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(ts: number): string {
  const diffMs  = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr  < 24) return `${diffHr}h ${diffMin % 60}m ago`;
  return new Date(ts).toLocaleDateString();
}

// ─── Sentiment badge ──────────────────────────────────────────────────────────

const SentimentBadge = React.memo(function SentimentBadge({ sentiment }: { sentiment: NewsSentiment }) {
  const map = {
    bullish: { label: 'Bullish',  Icon: TrendingUp,   cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    bearish: { label: 'Bearish',  Icon: TrendingDown,  cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20'         },
    neutral: { label: 'Neutral',  Icon: Minus,         cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'   },
  };
  const { label, Icon, cls } = map[sentiment];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cls}`}>
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  );
});

// ─── Priority tag ─────────────────────────────────────────────────────────────

const PriorityTag = React.memo(function PriorityTag({ priority }: { priority: NewsPriority }) {
  if (priority === 'STANDARD') return null;
  const map = {
    CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/30',
    HIGH:     'text-amber-400 bg-amber-500/10 border-amber-500/30',
    STANDARD: '',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase border ${map[priority]}`}>
      {priority === 'CRITICAL' && <Zap className="w-2.5 h-2.5" />}
      {priority}
    </span>
  );
});

// ─── Symbol chip ──────────────────────────────────────────────────────────────

const SymbolChip = React.memo(function SymbolChip({ symbol }: { symbol: string }) {
  return (
    <span className="inline-flex items-center text-[10px] font-mono font-bold text-indigo-400 bg-indigo-900/40 border border-indigo-800/40 px-2 py-0.5 rounded-md">
      {symbol}
    </span>
  );
});

// ─── News card (memoized — only re-renders when its own item or flash status changes) ─────

interface NewsCardProps {
  item: NewsItemPayload;
  isFlashing: boolean;
}

const NewsCard = React.memo(function NewsCard({ item, isFlashing }: NewsCardProps) {
  return (
    <article
      className={`
        rounded-2xl border overflow-hidden transition-all duration-500
        ${isFlashing
          ? 'border-red-500/70 bg-red-950/20 shadow-[0_0_24px_rgba(239,68,68,0.20)] animate-pulse'
          : 'border-indigo-900/40 bg-indigo-950/20 hover:bg-indigo-900/20'}
      `}
    >
      {/* Flash banner */}
      {isFlashing && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-red-500/15 border-b border-red-500/30">
          <Zap className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span className="text-[11px] font-black text-red-400 tracking-widest uppercase">
            FLASH EVENT — CRITICAL PRIORITY INTERRUPT
          </span>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-indigo-900/25">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2 text-[10px] text-indigo-500 font-mono min-w-0">
            <span className="truncate font-semibold">{item.source}</span>
            <span className="text-indigo-800">·</span>
            <span className="flex-shrink-0 text-indigo-600">{fmtTime(item.timestamp)}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PriorityTag priority={item.priority} />
            <SentimentBadge sentiment={item.sentiment} />
          </div>
        </div>
        <h3
          className={`text-sm font-bold leading-snug ${
            isFlashing ? 'text-red-100' : 'text-indigo-100'
          }`}
        >
          {item.headline}
        </h3>
      </div>

      {/* Implication */}
      <div className="px-5 py-4">
        <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-2">
          Market Implication
        </p>
        <p className="text-xs text-indigo-300/70 leading-relaxed">{item.implication}</p>
      </div>

      {/* Watch symbols */}
      <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
        <span className="text-[9px] font-mono text-indigo-700 uppercase tracking-widest">Watch:</span>
        {item.watchSymbols.map((s) => (
          <SymbolChip key={s} symbol={s} />
        ))}
      </div>
    </article>
  );
},
// Custom comparison: re-render only when the item id changes OR flash status changes
(prev, next) =>
  prev.item.id === next.item.id &&
  prev.isFlashing === next.isFlashing
);

// ─── Flash overlay banner ─────────────────────────────────────────────────────

function FlashBanner({ alert }: { alert: FlashAlert | null }) {
  if (!alert) return null;
  const remaining = Math.max(0, Math.ceil((alert.expiresAt - Date.now()) / 1_000));
  return (
    <div className="flex items-center gap-3 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
      <div className="relative flex h-3 w-3 flex-shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-red-400 tracking-wide uppercase">
          Flash Event Active
        </p>
        <p className="text-[10px] text-red-400/60 font-mono mt-0.5">
          Critical interrupt received · Returning to standard feed in {remaining}s
        </p>
      </div>
      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 animate-pulse" />
    </div>
  );
}

// ─── Error boundary ───────────────────────────────────────────────────────────

class MarketNewsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-indigo-900/40 bg-indigo-950/30 p-5">
          <div className="flex items-center gap-2 text-indigo-300">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold">News feed failed to render.</span>
          </div>
          <p className="text-xs text-indigo-500 mt-1">Please refresh the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function MarketNews() {
  const { feed, flashAlert } = useNewsStream();

  return (
    <MarketNewsErrorBoundary>
      <section className="flex flex-col gap-4">

        {/* Section header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-900/40 border border-indigo-800/40">
            <Newspaper className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-indigo-200 tracking-wide">
              Analyst Intelligence Feed
            </h2>
            <p className="text-[10px] text-indigo-500 font-mono mt-0.5">
              Event-driven stream · Updates arrive automatically
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {flashAlert ? (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-red-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                </span>
                FLASH
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                LIVE
              </span>
            )}
            <span className="text-[9px] font-mono text-indigo-700 bg-indigo-950/60 border border-indigo-900/40 px-2 py-1 rounded-lg">
              {feed.length} items
            </span>
          </div>
        </div>

        {/* Flash alert banner */}
        {flashAlert && <FlashBanner alert={flashAlert} />}

        {/* Feed */}
        <div className="flex flex-col gap-4">
          {feed.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              isFlashing={flashAlert?.itemId === item.id}
            />
          ))}
        </div>

      </section>
    </MarketNewsErrorBoundary>
  );
}

export default MarketNews;
