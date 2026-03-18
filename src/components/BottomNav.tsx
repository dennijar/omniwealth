import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Brain, LayoutGrid, Settings, TrendingUp, Wallet } from 'lucide-react';

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  end?: boolean;
  badge?: React.ReactNode;
};

const navItems: NavItem[] = [
  { label: 'Home', to: '/', icon: <LayoutGrid size={20} />, end: true },
  { label: 'Fiat', to: '/fiat', icon: <Wallet size={20} /> },
  { label: 'Invest', to: '/invest', icon: <TrendingUp size={20} /> },
  { label: 'Terminal', to: '/markets', icon: <Activity size={20} /> },
  {
    label: 'Insights',
    to: '/insights',
    icon: <Brain size={20} />,
    badge: (
      <span className="absolute top-1 right-3 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#0B0E14] border border-white/10 text-[10px] font-black text-sky-400">
        B
      </span>
    ),
  },
  { label: 'Settings', to: '/settings', icon: <Settings size={20} /> },
];

const baseBtn =
  'relative flex flex-col items-center justify-center gap-1 h-full flex-1 transition-all duration-200 active:scale-95';

export function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#060D1F]/95 backdrop-blur-2xl border-t border-white/[0.07]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex justify-around items-center w-full h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => [baseBtn, isActive ? 'text-indigo-400' : 'text-gray-400'].join(' ')}
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300 ${
                    isActive ? 'w-5 bg-indigo-400' : 'w-0 bg-transparent'
                  }`}
                />
                <span className="transition-all duration-200">{item.icon}</span>
                <span className="text-[9px] font-semibold leading-none">{item.label}</span>
                {item.badge}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
