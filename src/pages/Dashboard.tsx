import React from 'react';
import { useMarketStore } from '../stores/useMarketStore';
import { Wallet, TrendingUp, DollarSign } from 'lucide-react';

interface PortfolioAsset {
  symbol: string;
  amount: number;
  displayName: string;
}

const PORTFOLIO_ASSETS: PortfolioAsset[] = [
  { symbol: 'BTCUSDT', amount: 0.5, displayName: 'Bitcoin' },
  { symbol: 'ETHUSDT', amount: 2.5, displayName: 'Ethereum' },
  { symbol: 'SOLUSDT', amount: 10, displayName: 'Solana' },
  { symbol: 'LINKUSDT', amount: 50, displayName: 'Chainlink' },
];

const PortfolioCard: React.FC<{ asset: PortfolioAsset }> = ({ asset }) => {
  const priceData = useMarketStore((state) => state.prices[asset.symbol]);
  
  const currentValue = priceData ? priceData.price * asset.amount : 0;
  const isPositive = priceData ? priceData.changePercent24h >= 0 : false;

  return (
    <div className="p-4 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-slate-700/50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{asset.displayName}</h3>
          <p className="text-xs text-slate-500 font-mono">{asset.amount} {asset.symbol.replace('USDT', '')}</p>
        </div>
        {priceData && (
          <span className={`text-xs font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{priceData.changePercent24h.toFixed(2)}%
          </span>
        )}
      </div>
      
      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-slate-100 font-mono">
            ${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        {priceData && (
          <p className="text-xs text-slate-500 font-mono">
            @ ${priceData.price.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  // Optimized selector: only triggers re-render when portfolio asset prices change, not ALL prices
  const totalValue = useMarketStore((state) => {
    return PORTFOLIO_ASSETS.reduce((sum, asset) => {
      const priceData = state.prices[asset.symbol];
      return sum + (priceData ? priceData.price * asset.amount : 0);
    }, 0);
  });

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-slate-700/50">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">Portfolio Dashboard</h1>
              <p className="text-xs text-slate-500 font-mono">Your Net Worth & Holdings</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="p-6 bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800/60 rounded-xl backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-mono tracking-wider uppercase">Total Net Worth</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-slate-100 font-mono">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm text-slate-500 font-mono">USD</span>
          </div>
          <p className="text-xs text-slate-600 mt-2 font-mono">Live pricing via global market store</p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-300 tracking-wide uppercase">Holdings</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PORTFOLIO_ASSETS.map((asset) => (
              <PortfolioCard key={asset.symbol} asset={asset} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
