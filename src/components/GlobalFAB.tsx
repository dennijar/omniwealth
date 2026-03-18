import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Banknote, Building2, Plus, Wallet } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

type ActionId = 'log_tx' | 'add_bank' | 'add_invest';

type Action = {
  id: ActionId;
  label: string;
  target: 'fiat' | 'invest';
  icon: React.ReactNode;
  onFire: () => void;
};

function contextFromPath(pathname: string): 'home' | 'fiat' | 'invest' | 'insights' | 'settings' {
  if (pathname.startsWith('/fiat')) return 'fiat';
  if (pathname.startsWith('/invest')) return 'invest';
  if (pathname.startsWith('/insights')) return 'insights';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'home';
}

function dispatchOw(name: 'ow:open-tx-modal' | 'ow:open-bank-modal' | 'ow:open-asset-modal') {
  window.dispatchEvent(new Event(name));
}

export function GlobalFAB() {
  const navigate = useNavigate();
  const location = useLocation();
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const [open, setOpen] = React.useState(false);

  const ctx = contextFromPath(location.pathname);

  const go = (to: string, tab: Parameters<typeof setActiveTab>[0]) => {
    setActiveTab(tab);
    navigate(to);
  };

  // All hooks must be called before any early return — Rules of Hooks.
  const actions: Action[] = React.useMemo(
    () => [
      {
        id: 'log_tx',
        label: 'Log Transaction',
        target: 'fiat',
        icon: <Wallet className="w-4 h-4" />,
        onFire: () => {
          go('/fiat', 'fiat');
          queueMicrotask(() => dispatchOw('ow:open-tx-modal'));
        },
      },
      {
        id: 'add_bank',
        label: 'Add Bank Account',
        target: 'fiat',
        icon: <Building2 className="w-4 h-4" />,
        onFire: () => {
          go('/fiat', 'fiat');
          queueMicrotask(() => dispatchOw('ow:open-bank-modal'));
        },
      },
      {
        id: 'add_invest',
        label: 'Add Investment',
        target: 'invest',
        icon: <Banknote className="w-4 h-4" />,
        onFire: () => {
          go('/invest', 'market');
          queueMicrotask(() => dispatchOw('ow:open-asset-modal'));
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Hide FAB on Insights/Settings — guard placed AFTER all hooks.
  if (ctx === 'insights' || ctx === 'settings') return null;

  const filtered = actions.filter((a) => {
    if (ctx === 'home') return true;
    if (ctx === 'fiat') return a.target === 'fiat';
    if (ctx === 'invest') return a.target === 'invest';
    return true;
  });

  const close = () => setOpen(false);

  const handleAction = (action: Action) => {
    close();
    action.onFire();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open action menu"
        className="
          fixed right-4 bottom-24 md:bottom-8 md:right-8
          w-14 h-14 rounded-full
          bg-indigo-500 text-white
          shadow-[0_12px_30px_rgba(99,102,241,0.35)]
          border border-indigo-400/30
          flex items-center justify-center
          active:scale-[0.98] transition
          z-[9999]
        "
      >
        <Plus className={`w-6 h-6 transition-transform ${open ? 'rotate-45' : 'rotate-0'}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm touch-none"
            onClick={close}
          />

          <div
            role="dialog"
            aria-modal="true"
            className="
              fixed z-[9999]
              left-0 right-0 bottom-0
              md:left-1/2 md:top-1/2 md:bottom-auto md:right-auto
              md:-translate-x-1/2 md:-translate-y-1/2
              w-full md:max-w-md
              bg-slate-900 border border-white/10
              rounded-t-3xl md:rounded-3xl
              shadow-2xl
              p-6
            "
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="md:hidden w-12 h-1.5 rounded-full bg-white/10 mx-auto -mt-2 mb-4" />

            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] text-white/40 font-mono tracking-widest uppercase">Universal Menu</p>
                <h3 className="text-white font-bold text-base">Quick Actions</h3>
              </div>
              <button
                type="button"
                onClick={close}
                className="text-white/40 hover:text-white/70 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              {filtered.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleAction(a)}
                  className="
                    w-full text-left
                    flex items-center gap-3
                    px-4 py-3 rounded-2xl
                    bg-white/[0.04] hover:bg-white/[0.07]
                    border border-white/10
                    transition-colors
                    active:scale-[0.99]
                  "
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-300">
                    {a.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white/90">{a.label}</div>
                    <div className="text-[10px] text-white/35 font-mono">
                      Auto-visit: {a.target === 'fiat' ? 'Fiat' : 'Invest'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default GlobalFAB;

