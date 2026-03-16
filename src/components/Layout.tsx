import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, TrendingUp, Menu } from 'lucide-react';
import { useBinanceTicker } from '../hooks/useBinanceTicker';

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

export const Layout: React.FC = () => {
  useBinanceTicker(WATCHED_SYMBOLS);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
      isActive
        ? 'bg-slate-800/60 text-slate-100 border border-slate-700/50'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
    }`;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <aside className="w-64 border-r border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        <div className="p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-slate-700/50 flex items-center justify-center">
              <Menu className="w-5 h-5 text-slate-300" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100">Crypto Hub</h1>
              <p className="text-xs text-slate-500 font-mono">v24.0</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          <NavLink to="/" className={navLinkClass}>
            <Home className="w-4 h-4" />
            <span>Portfolio</span>
          </NavLink>
          <NavLink to="/markets" className={navLinkClass}>
            <TrendingUp className="w-4 h-4" />
            <span>Markets</span>
          </NavLink>
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="p-3 bg-slate-800/40 border border-slate-700/40 rounded-lg">
            <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
              Real-time data powered by Binance WebSocket. Global state managed via Zustand.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
