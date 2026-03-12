// ============================================================
// OmniWealth – useInsightStore (Zustand)
// Financial Intelligence computed slice
//
// This store is a pure "read-only view" over the raw stores.
// It runs insightEngine functions and exposes the results.
// All computation is synchronous and zero-latency (local data).
// ============================================================

import { create } from 'zustand';
import { format }  from 'date-fns';
import { runInsightEngine } from '../lib/insightEngine';
import { useFiatStore }     from './useFiatStore';
import { useNetWorthStore } from './useNetWorthStore';
import type { FinancialInsights } from '../types/insights';

// ── Store Interface ───────────────────────────────────────────
interface InsightState {
  insights:    FinancialInsights | null;
  isComputing: boolean;
  error:       string | null;

  /** Run the full insight engine against current store data */
  computeInsights: () => void;

  /** Derived selector: returns current insights or triggers compute */
  getFinancialInsights: () => FinancialInsights | null;

  /** Clear cached insights (force recompute next access) */
  invalidate: () => void;
}

// ── Store Implementation ──────────────────────────────────────
export const useInsightStore = create<InsightState>()((set, get) => ({
  insights:    null,
  isComputing: false,
  error:       null,

  // ── computeInsights ────────────────────────────────────────
  // Pulls raw data from fiat + networth stores, runs all
  // insight engine functions, and caches results in state.
  computeInsights: () => {
    // Guard against concurrent runs
    if (get().isComputing) return;
    set({ isComputing: true, error: null });

    try {
      const fiatState  = useFiatStore.getState();
      const nwState    = useNetWorthStore.getState();

      const currentMonthYear = format(new Date(), 'yyyy-MM');
      const monthSummary     = fiatState.getMonthSummary(currentMonthYear);
      const totalFiat        = fiatState.getTotalFiatBalance();
      const netWorth         = nwState.getNetWorth() || totalFiat;

      const insights = runInsightEngine({
        transactions:     fiatState.transactions,
        budgets:          fiatState.budgets,
        totalFiatBalance: totalFiat,
        currentNetWorth:  netWorth,
        monthlyIncome:    monthSummary.totalIncome,
        monthlyExpense:   monthSummary.totalExpense,
      });

      set({ insights, isComputing: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Insight computation failed';
      set({ isComputing: false, error: msg });
    }
  },

  // ── getFinancialInsights ───────────────────────────────────
  // Derived selector — triggers compute if stale (> 60s old)
  // or if no insights exist yet. Returns cached value immediately.
  getFinancialInsights: (): FinancialInsights | null => {
    const { insights, computeInsights } = get();

    if (!insights) {
      computeInsights();
      return null;
    }

    // Re-compute if data is more than 60 seconds old
    const ageSeconds = (Date.now() - new Date(insights.generatedAt).getTime()) / 1000;
    if (ageSeconds > 60) {
      computeInsights();
    }

    return insights;
  },

  // ── invalidate ────────────────────────────────────────────
  invalidate: () => set({ insights: null }),
}));
