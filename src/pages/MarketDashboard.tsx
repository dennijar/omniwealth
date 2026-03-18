import React, { useState } from 'react';
import {
  Coins, Landmark, LineChart, Globe2,
  Wifi, WifiOff, Newspaper, TrendingUp, Star,
} from 'lucide-react';
import { useBinanceTicker } from '../hooks/useBinanceTicker';
import { useMarketStore, selectConnectionStatus } from '../stores/useMarketStore';
import { MarketNews } from '../components/MarketNews';

// ─── Types ────────────────────────────────────────────────────────────────────

type Source = 'LIVE' | 'MOCK';

type Row = {
  symbol: string;
  name: string;
  priceText: string;
  changePct: number;
  meta?: string;
  source?: Source;
  flash?: 'up' | 'down' | null;
};

type TabId = 'News' | 'Crypto' | 'Stocks' | 'Forex & Commodities';

// ─── Expanded mock data ───────────────────────────────────────────────────────

const CRYPTO_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'LINKUSDT', 'BNBUSDT', 'DOGEUSDT'] as const;

const CRYPTO_DEF = [
  { symbol: 'BTC',  name: 'Bitcoin',        wsKey: 'BTCUSDT',  meta: 'USDT' },
  { symbol: 'ETH',  name: 'Ethereum',        wsKey: 'ETHUSDT',  meta: 'USDT' },
  { symbol: 'BNB',  name: 'BNB',             wsKey: 'BNBUSDT',  meta: 'USDT' },
  { symbol: 'SOL',  name: 'Solana',          wsKey: 'SOLUSDT',  meta: 'USDT' },
  { symbol: 'LINK', name: 'Chainlink',       wsKey: 'LINKUSDT', meta: 'USDT' },
  { symbol: 'DOGE', name: 'Dogecoin',        wsKey: 'DOGEUSDT', meta: 'USDT' },
] as const;

const IHSG_ROWS: Row[] = [
  { symbol: 'BBCA', name: 'Bank Central Asia',            priceText: 'Rp 9,850',  changePct:  1.25, meta: 'IDX', source: 'MOCK' },
  { symbol: 'BBRI', name: 'Bank Rakyat Indonesia',        priceText: 'Rp 5,125',  changePct: -0.85, meta: 'IDX', source: 'MOCK' },
  { symbol: 'BMRI', name: 'Bank Mandiri',                 priceText: 'Rp 6,200',  changePct:  0.81, meta: 'IDX', source: 'MOCK' },
  { symbol: 'AMMN', name: 'Amman Mineral Nusa Tenggara',  priceText: 'Rp 8,975',  changePct:  3.12, meta: 'IDX', source: 'MOCK' },
  { symbol: 'BREN', name: 'Barito Renewables Energy',     priceText: 'Rp 4,610',  changePct: -1.02, meta: 'IDX', source: 'MOCK' },
  { symbol: 'ASII', name: 'Astra International',          priceText: 'Rp 4,720',  changePct:  0.43, meta: 'IDX', source: 'MOCK' },
  { symbol: 'UNTR', name: 'United Tractors',              priceText: 'Rp 23,450', changePct: -0.21, meta: 'IDX', source: 'MOCK' },
  { symbol: 'MEDC', name: 'Medco Energi Internasional',   priceText: 'Rp 1,235',  changePct:  1.64, meta: 'IDX', source: 'MOCK' },
  { symbol: 'PTBA', name: 'Bukit Asam',                   priceText: 'Rp 2,880',  changePct: -0.52, meta: 'IDX', source: 'MOCK' },
  { symbol: 'BRPT', name: 'Barito Pacific',               priceText: 'Rp 1,070',  changePct:  2.87, meta: 'IDX', source: 'MOCK' },
  { symbol: 'INCO', name: 'Vale Indonesia',               priceText: 'Rp 3,250',  changePct: -1.21, meta: 'IDX', source: 'MOCK' },
  { symbol: 'PGAS', name: 'PGN (Perusahaan Gas Negara)',  priceText: 'Rp 1,545',  changePct:  0.65, meta: 'IDX', source: 'MOCK' },
  { symbol: 'GOTO', name: 'GoTo Gojek Tokopedia',         priceText: 'Rp 72',     changePct:  2.15, meta: 'IDX', source: 'MOCK' },
  { symbol: 'TLKM', name: 'Telkom Indonesia',             priceText: 'Rp 3,840',  changePct:  0.52, meta: 'IDX', source: 'MOCK' },
];

const US_ROWS: Row[] = [
  { symbol: 'NVDA',  name: 'NVIDIA Corporation',          priceText: '$880.50',   changePct:  2.34, meta: 'NASDAQ', source: 'MOCK' },
  { symbol: 'MSFT',  name: 'Microsoft Corporation',       priceText: '$415.80',   changePct:  0.58, meta: 'NASDAQ', source: 'MOCK' },
  { symbol: 'AAPL',  name: 'Apple Inc.',                  priceText: '$172.45',   changePct: -0.21, meta: 'NASDAQ', source: 'MOCK' },
  { symbol: 'META',  name: 'Meta Platforms',              priceText: '$495.30',   changePct:  1.14, meta: 'NASDAQ', source: 'MOCK' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',               priceText: '$162.70',   changePct:  0.73, meta: 'NASDAQ', source: 'MOCK' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices',      priceText: '$178.20',   changePct:  1.92, meta: 'NASDAQ', source: 'MOCK' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',                  priceText: '$165.30',   changePct:  1.12, meta: 'NASDAQ', source: 'MOCK' },
  { symbol: 'PLTR',  name: 'Palantir Technologies',       priceText: '$22.85',    changePct:  3.40, meta: 'NYSE',   source: 'MOCK' },
  { symbol: 'COIN',  name: 'Coinbase Global',             priceText: '$218.60',   changePct:  4.22, meta: 'NASDAQ', source: 'MOCK' },
  { symbol: 'RIVN',  name: 'Rivian Automotive',           priceText: '$10.45',    changePct: -2.33, meta: 'NASDAQ', source: 'MOCK' },
  { symbol: 'PLUG',  name: 'Plug Power Inc.',             priceText: '$3.12',     changePct: -1.88, meta: 'NASDAQ', source: 'MOCK' },
  { symbol: 'XOM',   name: 'Exxon Mobil Corp.',           priceText: '$118.70',   changePct:  0.34, meta: 'NYSE',   source: 'MOCK' },
  { symbol: 'JPM',   name: 'JPMorgan Chase',              priceText: '$198.45',   changePct:  0.89, meta: 'NYSE',   source: 'MOCK' },
];

const FX_ROWS: Row[] = [
  { symbol: 'XAU/USD', name: 'Gold Spot',              priceText: '$2,150.30', changePct:  0.42, meta: 'Spot',    source: 'MOCK' },
  { symbol: 'USD/IDR', name: 'US Dollar / Rupiah',     priceText: '15,820',    changePct:  0.15, meta: 'Spot',    source: 'MOCK' },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar',       priceText: '1.0842',    changePct: -0.18, meta: 'Spot',    source: 'MOCK' },
  { symbol: 'GBP/USD', name: 'Pound / US Dollar',      priceText: '1.2634',    changePct:  0.08, meta: 'Spot',    source: 'MOCK' },
  { symbol: 'USD/JPY', name: 'US Dollar / Yen',        priceText: '151.78',    changePct:  0.31, meta: 'Spot',    source: 'MOCK' },
  { symbol: 'XAG/USD', name: 'Silver Spot',            priceText: '$24.85',    changePct: -0.63, meta: 'Spot',    source: 'MOCK' },
  { symbol: 'COPPER',  name: 'Copper Futures',         priceText: '$3.91',     changePct:  1.02, meta: 'Futures', source: 'MOCK' },
  { symbol: 'WTI',     name: 'Crude Oil Futures',      priceText: '$81.20',    changePct: -1.45, meta: 'Futures', source: 'MOCK' },
  { symbol: 'NATGAS',  name: 'Natural Gas Futures',    priceText: '$1.72',     changePct: -2.21, meta: 'Futures', source: 'MOCK' },
];

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function ChangeBadge({ value }: { value: number }) {
  const sign = value > 0 ? '+' : '';
  const cls =
    value > 0 ? 'bg-emerald-500/10 text-emerald-400' :
    value < 0 ? 'bg-red-500/10 text-red-400' :
    'bg-white/5 text-indigo-300/50';
  return (
    <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium tabular-nums ${cls}`}>
      {sign}{value.toFixed(2)}%
    </span>
  );
}

function AssetIcon({ symbol }: { symbol: string }) {
  const letters = symbol.replace(/[^A-Z]/g, '').slice(0, 3);
  return (
    <div className="w-8 h-8 rounded-xl bg-indigo-900/40 border border-indigo-800/40 flex items-center justify-center flex-shrink-0">
      <span className="text-[9px] font-black text-indigo-300/80 tracking-tight leading-none">
        {letters}
      </span>
    </div>
  );
}

function LivePing() {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
    </span>
  );
}

// ─── Watchlist star (stateful per row) ───────────────────────────────────────

function StarButton({ symbol }: { symbol: string }) {
  const [starred, setStarred] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); setStarred((v) => !v); }}
      title={starred ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      className={`
        p-1.5 rounded-lg transition-colors duration-150 flex-shrink-0
        ${starred
          ? 'text-amber-400 hover:text-amber-300'
          : 'text-indigo-700 hover:text-indigo-400'}
      `}
    >
      <Star className="w-3.5 h-3.5" fill={starred ? 'currentColor' : 'none'} />
    </button>
  );
}

// ─── Terminal Card (scrollable) ───────────────────────────────────────────────

function TerminalCard({
  title, icon, rows, footerLeft, footerRight, liveSource = false, fullWidth = false,
}: {
  title: string;
  icon: React.ReactNode;
  rows: Row[];
  footerLeft?: string;
  footerRight?: string;
  liveSource?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <section
      className={`bg-[#131127] border border-indigo-900/40 rounded-2xl shadow-lg overflow-hidden flex flex-col${fullWidth ? ' w-full' : ''}`}
    >
      {/* Card header */}
      <header className="px-5 py-3.5 border-b border-indigo-900/40 flex items-center justify-between bg-indigo-900/10 flex-shrink-0">
        <h2 className="text-sm font-bold text-indigo-200 flex items-center gap-2">
          <span className="text-indigo-400">{icon}</span>
          {title}
        </h2>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          {liveSource ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <LivePing /> LIVE
            </span>
          ) : (
            <span className="text-indigo-600 tracking-widest uppercase">MOCK</span>
          )}
        </div>
      </header>

      {/* Scrollable table body */}
      <div className="overflow-y-auto max-h-[600px] scrollbar-hide">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] text-indigo-400/60 font-mono tracking-widest uppercase bg-[#131127] sticky top-0 z-10 shadow-[0_1px_0_rgba(99,102,241,0.15)]">
              <th className="text-left pl-3 pr-2 py-2.5 w-8" />
              <th className="text-left px-3 py-2.5">Asset</th>
              <th className="text-right px-4 py-2.5">Price</th>
              <th className="text-right px-4 py-2.5">24h</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.symbol}
                className="border-b border-indigo-900/25 last:border-0 hover:bg-indigo-800/20 transition-colors duration-150 group"
              >
                {/* Star */}
                <td className="pl-3 pr-1 py-3">
                  <StarButton symbol={r.symbol} />
                </td>
                {/* Asset info */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AssetIcon symbol={r.symbol} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-indigo-100 tracking-tight">{r.symbol}</span>
                        {r.meta && (
                          <span className="text-[9px] font-mono text-indigo-500 bg-indigo-900/40 px-1 py-0.5 rounded">
                            {r.meta}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-indigo-400/40 truncate mt-0.5">{r.name}</div>
                    </div>
                  </div>
                </td>
                {/* Price */}
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-mono font-bold text-indigo-100 tabular-nums">{r.priceText}</span>
                </td>
                {/* 24h */}
                <td className="px-4 py-3 text-right">
                  <ChangeBadge value={r.changePct} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {(footerLeft || footerRight) && (
        <footer className="px-5 py-2.5 border-t border-indigo-900/40 flex items-center justify-between text-[10px] text-indigo-600 font-mono bg-indigo-950/30 flex-shrink-0">
          <span>{footerLeft}</span>
          <span>{rows.length} assets</span>
        </footer>
      )}
    </section>
  );
}

// ─── Connection Banner ─────────────────────────────────────────────────────────

function ConnectionBanner() {
  const status = useMarketStore(selectConnectionStatus);
  if (status === 'connected') return null;

  const cfg: Record<string, { label: string; cls: string; Icon: typeof Wifi }> = {
    connecting:   { label: 'Connecting to Binance WebSocket...', cls: 'text-amber-400 bg-amber-500/10 border-amber-700/30', Icon: Wifi },
    disconnected: { label: 'WebSocket disconnected. Retrying...', cls: 'text-indigo-400 bg-indigo-900/30 border-indigo-800/40', Icon: WifiOff },
    error:        { label: 'WebSocket error. Live feed unavailable.', cls: 'text-red-400 bg-red-500/10 border-red-800/30', Icon: WifiOff },
  };
  const c = cfg[status] ?? cfg['disconnected'];
  const { Icon } = c;

  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-xs font-mono ${c.cls}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {c.label}
    </div>
  );
}

// ─── Internal Tab Bar ─────────────────────────────────────────────────────────

const TABS: { id: TabId; icon: React.ReactNode; label: string }[] = [
  { id: 'News',               icon: <Newspaper className="w-3.5 h-3.5" />,  label: 'News'         },
  { id: 'Crypto',             icon: <Coins className="w-3.5 h-3.5" />,      label: 'Crypto'       },
  { id: 'Stocks',             icon: <Landmark className="w-3.5 h-3.5" />,   label: 'Stocks'       },
  { id: 'Forex & Commodities',icon: <Globe2 className="w-3.5 h-3.5" />,     label: 'Forex & Commo'},
];

function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav
      className="flex items-center gap-0.5 overflow-x-auto no-scrollbar border-b border-indigo-900/40"
      aria-label="Market sections"
    >
      {TABS.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`
              flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap
              border-b-2 transition-all duration-150 -mb-px
              ${isActive
                ? 'border-indigo-500 text-indigo-300 bg-indigo-900/20'
                : 'border-transparent text-indigo-500 hover:text-indigo-300 hover:bg-indigo-900/10'}
            `}
          >
            <span className={isActive ? 'text-indigo-400' : 'text-indigo-600'}>{t.icon}</span>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Ticker Strip ─────────────────────────────────────────────────────────────

function TickerStrip({ cryptoRows }: { cryptoRows: Row[] }) {
  const items = [
    ...cryptoRows.slice(0, 4).map((r) => ({
      label: r.symbol, value: r.priceText, change: r.changePct, live: r.source === 'LIVE',
    })),
    { label: 'XAU/USD', value: '$2,150.30', change: 0.42,  live: false },
    { label: 'USD/IDR', value: '15,820',    change: 0.15,  live: false },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-center gap-2 bg-[#131127] border border-indigo-900/40 rounded-xl px-3 py-2"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold text-indigo-300">{it.label}</span>
              {it.live && <LivePing />}
            </div>
            <div className="text-xs font-mono font-semibold text-indigo-100 tabular-nums mt-0.5">
              {it.value}
            </div>
          </div>
          <ChangeBadge value={it.change} />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const MarketDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('News');

  useBinanceTicker([...CRYPTO_SYMBOLS]);
  const livePrices = useMarketStore((state) => state.prices);

  const cryptoRows: Row[] = CRYPTO_DEF.map((def) => {
    const d = livePrices[def.wsKey];
    const isLive = !!d && d.price > 0;
    const priceText = isLive
      ? `$${d.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '—';
    return {
      symbol:    def.symbol,
      name:      def.name,
      priceText,
      changePct: d?.changePercent24h ?? 0,
      meta:      def.meta,
      source:    isLive ? 'LIVE' : 'MOCK',
      flash:     d?.flashDirection ?? null,
    };
  });

  const cryptoIsLive = cryptoRows.some((r) => r.source === 'LIVE');

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 text-white space-y-5">

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[10px] font-mono text-indigo-500 tracking-widest uppercase">
              OmniWealth Terminal
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-indigo-100 tracking-tight leading-none">
            Market Screener
          </h1>
        </div>
        <ConnectionBanner />
      </div>

      {/* Ticker strip */}
      <TickerStrip cryptoRows={cryptoRows} />

      {/* Main terminal shell */}
      <div className="bg-[#131127] border border-indigo-900/40 rounded-2xl shadow-xl overflow-hidden">
        <TabBar active={activeTab} onChange={setActiveTab} />

        <div className="p-4 md:p-6">
          {activeTab === 'News' && <MarketNews />}

          {activeTab === 'Crypto' && (
            <TerminalCard
              title="Global Crypto"
              icon={<Coins className="w-4 h-4" />}
              rows={cryptoRows}
              footerLeft="Binance WebSocket"
              footerRight="24h rolling"
              liveSource={cryptoIsLive}
              fullWidth
            />
          )}

          {activeTab === 'Stocks' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <TerminalCard
                title="Indonesian Stocks (IHSG)"
                icon={<Landmark className="w-4 h-4" />}
                rows={IHSG_ROWS}
                footerLeft="IDX selected"
                footerRight=""
              />
              <TerminalCard
                title="US Equities"
                icon={<LineChart className="w-4 h-4" />}
                rows={US_ROWS}
                footerLeft="NYSE / NASDAQ"
                footerRight=""
              />
            </div>
          )}

          {activeTab === 'Forex & Commodities' && (
            <TerminalCard
              title="Forex & Commodities"
              icon={<Globe2 className="w-4 h-4" />}
              rows={FX_ROWS}
              footerLeft="FX / Metals / Energy"
              footerRight=""
              fullWidth
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketDashboard;
