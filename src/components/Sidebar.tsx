import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Brain, LayoutGrid, Settings, Shield, TrendingUp, Wallet } from 'lucide-react';

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  end?: boolean;
  badge?: React.ReactNode;
};

const navItems: NavItem[] = [
  { label: 'Home', to: '/', icon: <LayoutGrid size={18} />, end: true },
  { label: 'Fiat', to: '/fiat', icon: <Wallet size={18} /> },
  { label: 'Invest', to: '/invest', icon: <TrendingUp size={18} /> },
  { label: 'Terminal', to: '/markets', icon: <Activity size={18} /> },
  {
    label: 'Insights',
    to: '/insights',
    icon: <Brain size={18} />,
    badge: (
      <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0B0E14] border border-white/10 text-[11px] font-black text-sky-400">
        B
      </span>
    ),
  },
  { label: 'Settings', to: '/settings', icon: <Settings size={18} /> },
];

const linkBase =
  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors';

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 min-h-screen bg-[#0B0E14] border-r border-white/5 flex-col">
      <div className="px-5 pt-6 pb-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)]">
            <Shield size={20} className="text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-white font-extrabold tracking-tight">OmniWealth</div>
          </div>
        </div>
      </div>

      <nav className="px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                linkBase,
                isActive
                  ? 'bg-indigo-950/50 text-indigo-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5',
              ].join(' ')
            }
          >
            <span className="text-current">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
