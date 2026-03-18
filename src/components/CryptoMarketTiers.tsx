import React from 'react';
import { Activity, Wifi, AlertTriangle, Loader2 } from 'lucide-react';
import { useMarketStore, selectPriceData, selectConnectionStatus, selectIsConnected, selectPriceCount } from '../stores/useMarketStore';

interface TierConfig {
  id: string;
  title: string;
  subtitle: string;
  symbols: string[];
  accentClass: string;
  gradientClass: string;
  iconColor: string;
  borderAccent: string;
}

interface TickerRowProps {
  symbol: string;
  isLast: boolean;
}

const TIER_1: TierConfig = {
  id: "tier-1",
  title: "TIER 1: MACRO CUSHION",
  subtitle: "Foundation Assets -- High Conviction, Low Degen",
  symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "LINKUSDT"],
  accentClass: "text-cyan-400",
  gradientClass: "from-cyan-950/40 via-slate-900/60 to-slate-900/80",
  iconColor: "text-cyan-400",
  borderAccent: "border-cyan-800/30",
};

const TIER_4: TierConfig = {
  id: "tier-4",
  title: "TIER 4: DEGEN ZONE",
  subtitle: "Memecoin Exposure -- High Vol, High Conviction Chaos",
  symbols: ["DOGEUSDT", "SHIBUSDT", "PEPEUSDT", "FLOKIUSDT"],
  accentClass: "text-fuchsia-400",
  gradientClass: "from-fuchsia-950/40 via-slate-900/60 to-slate-900/80",
  iconColor: "text-fuchsia-400",
  borderAccent: "border-fuchsia-800/30",
};

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.001) return price.toFixed(6);
  return price.toFixed(8);
}

function formatChange(change: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

function stripUSDT(symbol: string): string {
  return symbol.replace(/USDT$/i, "");
}

const TickerRow: React.FC<TickerRowProps> = React.memo(({ symbol, isLast }) => {
  const data = useMarketStore(selectPriceData(symbol));
  let flashBg = "";
  if (data?.flashDirection === "up") flashBg = "bg-emerald-500/10";
  else if (data?.flashDirection === "down") flashBg = "bg-red-500/10";

  let priceFlashColor = "text-slate-200";
  if (data?.flashDirection === "up") priceFlashColor = "text-emerald-400";
  else if (data?.flashDirection === "down") priceFlashColor = "text-red-400";

  const borderClass = isLast ? "" : "border-b border-slate-800/40";

  return (
    <div
      className={`
        grid grid-cols-3 items-center px-5 py-3.5
        transition-colors duration-300 ease-out
        hover:bg-slate-800/20
        ${flashBg} ${borderClass}
      `}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-md bg-slate-800/60 border border-slate-700/40">
          <span className="text-xs font-bold text-slate-300">
            {stripUSDT(symbol).slice(0, 2)}
          </span>
          {data?.flashDirection && (
            <span
              className={`
                absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full
                ${data.flashDirection === "up" ? "bg-emerald-400" : "bg-red-400"}
              `}
            />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100 font-mono tracking-wide">
            {stripUSDT(symbol)}
          </p>
          <p className="text-[10px] text-slate-500 font-mono">{symbol}</p>
        </div>
      </div>

      <div className="text-center">
        {data ? (
          <span
            className={`
              text-sm font-mono font-semibold tracking-tight
              transition-colors duration-300 ease-out
              ${priceFlashColor}
            `}
          >
            ${formatPrice(data.price)}
          </span>
        ) : (
          <div className="flex items-center justify-center">
            <div className="w-16 h-4 bg-slate-800/60 rounded animate-pulse" />
          </div>
        )}
      </div>

      <div className="text-right">
        {data ? (
          <span
            className={`
              inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold
              ${
                data.change24h >= 0
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }
            `}
          >
            {formatChange(data.change24h)}
          </span>
        ) : (
          <div className="flex justify-end">
            <div className="w-16 h-6 bg-slate-800/60 rounded animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
});

TickerRow.displayName = "TickerRow";

interface TierCardProps {
  config: TierConfig;
}

const TierCard: React.FC<TierCardProps> = React.memo(({ config }) => {
  return (
    <div
      className={`
        relative overflow-hidden rounded-xl
        border border-slate-800/60
        bg-gradient-to-b from-slate-900/95 to-slate-950/95
        backdrop-blur-xl shadow-2xl shadow-black/20
      `}
    >
      <div
        className={`
          relative px-5 py-4
          bg-gradient-to-r ${config.gradientClass}
          border-b ${config.borderAccent}
        `}
      >
        <div className="absolute inset-0 opacity-[0.03] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.05)_2px,rgba(255,255,255,0.05)_4px)]" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`
                flex items-center justify-center w-9 h-9
                rounded-lg bg-slate-800/50 border border-slate-700/30
                ${config.iconColor}
              `}
            >
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-sm font-bold tracking-[0.15em] font-mono ${config.accentClass}`}>
                {config.title}
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5 tracking-wide">
                {config.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`
                  animate-ping absolute inline-flex h-full w-full rounded-full opacity-50
                  ${config.id === "tier-1" ? "bg-cyan-400" : "bg-fuchsia-400"}
                `}
              />
              <span
                className={`
                  relative inline-flex rounded-full h-2.5 w-2.5
                  ${config.id === "tier-1" ? "bg-cyan-400" : "bg-fuchsia-400"}
                `}
              />
            </span>
            <span className="text-[10px] text-slate-500 font-mono">LIVE</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 px-5 py-2 border-b border-slate-800/40 bg-slate-900/50">
        <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Asset</span>
        <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase text-center">Price</span>
        <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase text-right">24h</span>
      </div>

      <div>
        {config.symbols.map((symbol, index) => (
          <TickerRow key={symbol} symbol={symbol} isLast={index === config.symbols.length - 1} />
        ))}
      </div>

      <div
        className={`
          h-[1px] w-full
          ${
            config.id === "tier-1"
              ? "bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"
              : "bg-gradient-to-r from-transparent via-fuchsia-500/20 to-transparent"
          }
        `}
      />
    </div>
  );
});

TierCard.displayName = "TierCard";

const StatusBar: React.FC = React.memo(() => {
  const status = useMarketStore(selectConnectionStatus);
  const isConnected = useMarketStore(selectIsConnected);
  const priceCount = useMarketStore(selectPriceCount);
  const errorMessage = useMarketStore((state) => state.connection.errorMessage);

  const isConnecting = status === 'connecting';
  const isError = status === 'error';

  return (
      <div
        className={`flex items-center justify-between px-5 py-2.5 rounded-lg border backdrop-blur-sm ${
          isConnected ? 'bg-emerald-950/20 border-emerald-800/20' : isError ? 'bg-red-950/20 border-red-800/20' : 'bg-amber-950/20 border-amber-800/20'
        }`}
      >
        <div className="flex items-center gap-3">
          {isConnected && (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-mono text-emerald-400 tracking-wide">STREAM ACTIVE</span>
              <span className="text-[10px] text-slate-600 font-mono">|</span>
              <span className="text-[10px] text-slate-500 font-mono">{priceCount} symbols tracked</span>
            </>
          )}
          {isConnecting && (
            <>
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="text-xs font-mono text-amber-400 tracking-wide">CONNECTING</span>
            </>
          )}
          {isError && (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-mono text-red-400 tracking-wide">{errorMessage || 'CONNECTION FAILED'}</span>
            </>
          )}
        </div>
        <span className="text-[10px] text-slate-600 font-mono tracking-wider">BINANCE WSS</span>
      </div>
    );
  }
);

StatusBar.displayName = "StatusBar";

export const CryptoMarketTiers: React.FC = () => {
  return (
    <section className="w-full max-w-6xl mx-auto space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Market Intelligence</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono tracking-wide">Real-time tier monitoring -- WebSocket stream</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
          <span>v24.0</span>
          <span className="text-slate-800">|</span>
          <span>GLOBAL STATE</span>
        </div>
      </div>

      <StatusBar />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TierCard config={TIER_1} />
        <TierCard config={TIER_4} />
      </div>

      <div className="flex items-center justify-between px-1 pt-1">
        <p className="text-[10px] text-slate-700 font-mono">Data sourced from Binance public WebSocket -- no API keys required</p>
        <p className="text-[10px] text-slate-700 font-mono">Flash: GREEN = tick up | RED = tick down | Duration: 300ms</p>
      </div>
    </section>
  );
};

export default CryptoMarketTiers;
