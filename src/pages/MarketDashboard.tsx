import React from 'react';
import { CryptoMarketTiers } from '../components/CryptoMarketTiers';
import { useBinanceTicker } from '../hooks/useBinanceTicker';
import { TrendingUp, BarChart3 } from 'lucide-react';

const WATCHED_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'LINKUSDT',
  'DOGEUSDT',
  'SHIBUSDT',
  'PEPEUSDT',
  'FLOKIUSDT',
];

export const MarketDashboard: React.FC = () => {
  useBinanceTicker(WATCHED_SYMBOLS);

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-slate-700/50">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-100">Bloomberg Lite</h1>
                <p className="text-xs text-slate-500 font-mono">Real-time Market Intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800/40 border border-slate-700/40">
              <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-mono text-slate-400">8 Assets Tracked</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <CryptoMarketTiers />
      </main>
    </div>
  );
};

export default MarketDashboard;
