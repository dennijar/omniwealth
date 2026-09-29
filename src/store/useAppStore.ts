// ============================================================
// OmniWealth – useAppStore (Zustand + persist)  v2.0
// Global app-level state: onboarding, theme, preferences.
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useFiatStore }   from './useFiatStore';
import { useMarketStore } from './useMarketStore';
import { useAuthStore }   from './useAuthStore';
import { supabase }       from '../lib/supabase';

/** All localStorage keys owned by OmniWealth (never touch other origin keys). */
const APP_STORAGE_KEYS = [
  'omniwealth-app-store',
  'omniwealth-fiat-store',
  'omniwealth-market-store',
  'omniwealth-networth-store',
  'ow-theme',
] as const;

// ── Types ─────────────────────────────────────────────────────
export interface OnboardingData {
  monthlyIncome:  number;   // IDR
  bankName:       string;
  initialBalance: number;   // IDR
}

export type CurrencySymbol = 'Rp' | '$';

export type AppTab = 'overview' | 'fiat' | 'market' | 'insights' | 'settings';

// ── Store Interface ───────────────────────────────────────────
interface AppState {
  isFirstTimeSetup: boolean;
  activeTab:        AppTab;
  darkMode:         boolean;
  currency:         CurrencySymbol;
  isModalOpen:      boolean;

  // ── Actions ────────────────────────────────────────────────
  completeOnboarding: (data: OnboardingData) => Promise<void>;
  setActiveTab:       (tab: AppTab)          => void;
  setDarkMode:        (enabled: boolean)     => void;
  setCurrency:        (symbol: CurrencySymbol) => void;
  setModalOpen:       (isOpen: boolean)        => void;
  /** Download all store data as a JSON backup file */
  exportData:         () => void;
  /** Sign out of Supabase (ends the session everywhere) */
  logout:             () => Promise<void>;
  /**
   * Permanently delete ALL of the signed-in user's rows from the database
   * (transactions, budgets, assets, bank accounts), sign out, clear only
   * OmniWealth-owned localStorage keys, then reload. Returns an error
   * message on failure — the caller decides how to surface it.
   */
  resetAllData:       () => Promise<string | null>;
  /** Dev helper — re-trigger onboarding without clearing localStorage */
  resetOnboarding:    () => void;
}

// ── Store Implementation ──────────────────────────────────────
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isFirstTimeSetup: true,
      activeTab:        'overview',
      darkMode:         false,
      currency:         'Rp',
      isModalOpen:      false,

      // ── completeOnboarding ──────────────────────────────────
      completeOnboarding: async (data: OnboardingData) => {
        const { addBankAccount, addTransaction } = useFiatStore.getState();

        const account = await addBankAccount({
          bank_name:       data.bankName,
          initial_balance: data.initialBalance,
          currency:        'IDR',
          color:           '#6366F1',
          icon:            data.bankName[0]?.toUpperCase() ?? '#',
        });

        if (account && data.monthlyIncome > 0) {
          await addTransaction({
            bank_account_id: account.id,
            type:            'INCOME',
            category:        'Salary',
            amount:          data.monthlyIncome,
            date:            new Date().toISOString(),
            description:     'Pemasukan awal (setup onboarding)',
          });
        }

        set({ isFirstTimeSetup: false, activeTab: 'overview' });
      },

      // ── setActiveTab ────────────────────────────────────────
      setActiveTab: (tab) => set({ activeTab: tab }),

      // ── setDarkMode ─────────────────────────────────────────
      setDarkMode: (enabled: boolean) => {
        try {
          if (enabled) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          localStorage.setItem('ow-theme', enabled ? 'dark' : 'light');
        } catch (e) {
          console.error('[Theme] Failed to apply theme:', e);
        }
        set({ darkMode: enabled });
      },

      // ── setCurrency ─────────────────────────────────────────
      setCurrency: (symbol: CurrencySymbol) => set({ currency: symbol }),

      // ── setModalOpen ────────────────────────────────────────
      setModalOpen: (isOpen: boolean) => set({ isModalOpen: isOpen }),

      // ── exportData ──────────────────────────────────────────
      exportData: () => {
        const snapshot = {
          exportedAt: new Date().toISOString(),
          version:    '1.0',
          fiat:       useFiatStore.getState(),
          market:     useMarketStore.getState(),
        };
        // Strip functions — keep only serialisable data
        const clean = JSON.parse(JSON.stringify(snapshot, (_k, v) =>
          typeof v === 'function' ? undefined : v
        ));
        const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `omniwealth-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },

      // ── logout ──────────────────────────────────────────────
      logout: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);
      },

      // ── resetAllData (server-side delete + honest sign-out) ─
      resetAllData: async () => {
        const user = useAuthStore.getState().user;
        try {
          if (user) {
            // Delete the user's rows server-side; RLS scopes every
            // statement to auth.uid(), so this can only ever touch
            // the caller's own data.
            const [txs, budgets, assets, banks] = await Promise.all([
              supabase.from('transactions').delete().eq('user_id', user.id),
              supabase.from('budgets').delete().eq('user_id', user.id),
              supabase.from('assets').delete().eq('user_id', user.id),
              supabase.from('bank_accounts').delete().eq('user_id', user.id),
            ]);
            const firstError = txs.error ?? budgets.error ?? assets.error ?? banks.error;
            if (firstError) return `Gagal menghapus data di server: ${firstError.message}`;
          }

          await supabase.auth.signOut();
        } catch (err) {
          return `Gagal menghapus data: ${err instanceof Error ? err.message : 'unknown error'}`;
        }

        // Clear only OmniWealth-owned keys (never localStorage.clear()).
        for (const key of APP_STORAGE_KEYS) {
          try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
        }
        window.location.reload();
        return null;
      },

      // ── resetOnboarding ─────────────────────────────────────
      resetOnboarding: () => set({ isFirstTimeSetup: true }),
    }),
    {
      name:    'omniwealth-app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isFirstTimeSetup: state.isFirstTimeSetup,
        darkMode:         state.darkMode,
        currency:         state.currency,
      }),
    },
  ),
);
