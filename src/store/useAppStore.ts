// ============================================================
// OmniWealth – useAppStore (Zustand + persist)  v2.0
// Global app-level state: onboarding, theme, preferences.
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useFiatStore }   from './useFiatStore';
import { useMarketStore } from './useMarketStore';

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

  // ── Actions ────────────────────────────────────────────────
  completeOnboarding: (data: OnboardingData) => void;
  setActiveTab:       (tab: AppTab)          => void;
  setDarkMode:        (enabled: boolean)     => void;
  setCurrency:        (symbol: CurrencySymbol) => void;
  /** Download all store data as a JSON backup file */
  exportData:         () => void;
  /** Wipe localStorage and reload the page */
  resetAllData:       () => void;
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

      // ── completeOnboarding ──────────────────────────────────
      completeOnboarding: (data: OnboardingData) => {
        const { addBankAccount, addTransaction } = useFiatStore.getState();

        const account = addBankAccount({
          bank_name:       data.bankName,
          initial_balance: data.initialBalance,
          currency:        'IDR',
          color:           '#6366F1',
          icon:            data.bankName[0]?.toUpperCase() ?? '🏦',
        });

        if (data.monthlyIncome > 0) {
          addTransaction({
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
        document.documentElement.classList.toggle('dark', enabled);
        set({ darkMode: enabled });
      },

      // ── setCurrency ─────────────────────────────────────────
      setCurrency: (symbol: CurrencySymbol) => set({ currency: symbol }),

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

      // ── resetAllData ────────────────────────────────────────
      resetAllData: () => {
        localStorage.clear();
        window.location.reload();
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
