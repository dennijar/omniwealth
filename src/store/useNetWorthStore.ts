// ============================================================
// OmniWealth – useNetWorthStore (Zustand)
// Unified computed slice that aggregates:
//   • useFiatStore  → fiat balances, cash flows
//   • useMarketStore → enriched assets, PnL, portfolio value
//
// This is the SINGLE SOURCE OF TRUTH for Net Worth.
// It acts like a "view" in a relational DB — pure computed state.
// All values use Decimal.js for financial-grade precision.
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Decimal from 'decimal.js';
import { format, subMonths } from 'date-fns';
import { useFiatStore } from './useFiatStore';
import { useMarketStore } from './useMarketStore';
import type {
  NetWorthState,
  WealthSnapshot,
  AllocationSlice,
  WealthTrendPoint,
} from '../types/networth';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

// ── Helpers ───────────────────────────────────────────────────
function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Financial health scoring thresholds
function scoreMetric(value: number, thresholds: [number, number, number]): number {
  const [excellent, good, fair] = thresholds;
  if (value >= excellent) return 100;
  if (value >= good)      return 70 + ((value - good) / (excellent - good)) * 30;
  if (value >= fair)      return 40 + ((value - fair) / (good - fair)) * 30;
  return Math.max(0, (value / fair) * 40);
}

// Allocation colors
const ALLOCATION_COLORS: Record<string, string> = {
  'Cash & Banks':  '#6366F1',
  'Stocks':        '#3B82F6',
  'Crypto':        '#F59E0B',
  'Real Estate':   '#10B981',
  'Mutual Funds':  '#8B5CF6',
  'Commodities':   '#EF4444',
};

// ── Store ─────────────────────────────────────────────────────
export const useNetWorthStore = create<NetWorthState>()(
  persist(
    (set, get) => ({
      snapshot:         null,
      allocationSlices: [],
      trendHistory:     [],
      isComputing:      false,

      // ══════════════════════════════════════════════════════
      // computeSnapshot — pulls live data from both stores
      // and builds a complete WealthSnapshot with Decimal precision
      // ══════════════════════════════════════════════════════
      computeSnapshot: () => {
        set({ isComputing: true });

        // ── Pull from Fiat store ────────────────────────────
        const fiatState  = useFiatStore.getState();
        const monthYear  = getCurrentMonthYear();

        const totalFiat   = new Decimal(fiatState.getTotalFiatBalance());
        const monthSummary = fiatState.getMonthSummary(monthYear);
        const monthlyIncome   = new Decimal(monthSummary.totalIncome);
        const monthlyExpense  = new Decimal(monthSummary.totalExpense);
        const monthlyNetFlow  = new Decimal(monthSummary.netFlow);
        const savingsRate = monthlyIncome.isZero()
          ? new Decimal(0)
          : monthlyNetFlow.dividedBy(monthlyIncome).times(100);

        // ── Pull from Market store ──────────────────────────
        const marketState      = useMarketStore.getState();
        const enrichedAssets   = marketState.enrichedAssets;
        const totalInvestments = new Decimal(marketState.getTotalInvestmentValue());
        const totalCapital     = new Decimal(marketState.getTotalCapital());
        const totalFloatingPnL = new Decimal(marketState.getTotalFloatingPnL());
        const totalReturnPct   = new Decimal(marketState.getTotalReturnPercentage());

        // ── Unified Net Worth ───────────────────────────────
        const netWorth = totalFiat.plus(totalInvestments);
        const pnlContrib = netWorth.isZero()
          ? new Decimal(0)
          : totalFloatingPnL.dividedBy(netWorth).times(100);

        const snapshot: WealthSnapshot = {
          computed_at:              new Date().toISOString(),
          total_fiat:               totalFiat.toNumber(),
          fiat_accounts_count:      fiatState.bankAccounts.length,
          monthly_net_flow:         monthlyNetFlow.toNumber(),
          monthly_income:           monthlyIncome.toNumber(),
          monthly_expense:          monthlyExpense.toNumber(),
          savings_rate:             savingsRate.toDecimalPlaces(1).toNumber(),
          total_investments:        totalInvestments.toNumber(),
          total_capital_deployed:   totalCapital.toNumber(),
          total_floating_pnl:       totalFloatingPnL.toNumber(),
          total_return_pct:         totalReturnPct.toNumber(),
          asset_count:              enrichedAssets.length,
          net_worth:                netWorth.toNumber(),
          net_worth_pnl_contribution: pnlContrib.toDecimalPlaces(2).toNumber(),
        };

        // ── Build allocation slices ─────────────────────────
        const totalNW = netWorth.toNumber();

        const allocationSlices: AllocationSlice[] = [];

        // Fiat slice
        if (totalFiat.greaterThan(0)) {
          allocationSlices.push({
            label:      'Cash & Banks',
            value:      totalFiat.toNumber(),
            percentage: totalNW > 0
              ? totalFiat.dividedBy(netWorth).times(100).toDecimalPlaces(1).toNumber()
              : 0,
            color: ALLOCATION_COLORS['Cash & Banks'],
          });
        }

        // Investment slices by class
        const portfolioSummary = marketState.getPortfolioSummary();
        const classLabelMap: Record<string, string> = {
          STOCK:       'Stocks',
          CRYPTO:      'Crypto',
          REAL_ESTATE: 'Real Estate',
          MUTUAL_FUND: 'Mutual Funds',
          COMMODITY:   'Commodities',
        };

        for (const [cls, data] of Object.entries(portfolioSummary.byClass)) {
          if (data.currentValue <= 0) continue;
          const label = classLabelMap[cls] ?? cls;
          allocationSlices.push({
            label,
            value:      data.currentValue,
            percentage: totalNW > 0
              ? new Decimal(data.currentValue)
                  .dividedBy(netWorth).times(100).toDecimalPlaces(1).toNumber()
              : 0,
            color: ALLOCATION_COLORS[label] ?? '#6B7280',
          });
        }

        // Sort by value desc
        allocationSlices.sort((a, b) => b.value - a.value);

        set({ snapshot, allocationSlices, isComputing: false });

        // Trigger trend history update
        get().generateTrendHistory();
      },

      // ══════════════════════════════════════════════════════
      // generateTrendHistory — simulates 6-month historical data
      // In production this would query a time-series DB table.
      // For SPA: we reconstruct from transaction history.
      // ══════════════════════════════════════════════════════
      generateTrendHistory: () => {
        const fiatState   = useFiatStore.getState();
        const marketState = useMarketStore.getState();
        const now         = new Date();

        // Build 7 monthly data points (6 months back + current)
        const history: WealthTrendPoint[] = [];

        for (let i = 6; i >= 0; i--) {
          const pointDate  = subMonths(now, i);
          const monthYear  = format(pointDate, 'yyyy-MM');

          // Reconstruct fiat balance at end of that month
          // (sum all transactions up to end of that month)
          const allTxs = fiatState.transactions.filter(
            (tx) => format(new Date(tx.date), 'yyyy-MM') <= monthYear,
          );

          const fiatAtPoint = fiatState.bankAccounts.reduce((total, acc) => {
            const initial = new Decimal(acc.initial_balance);
            const accountTxs = allTxs.filter((tx) => tx.bank_account_id === acc.id);
            const balance = accountTxs.reduce((bal, tx) => {
              const amt = new Decimal(tx.amount);
              if (tx.type === 'INCOME')   return bal.plus(amt);
              if (tx.type === 'EXPENSE' || tx.type === 'TRANSFER') return bal.minus(amt);
              return bal;
            }, initial);
            return new Decimal(total).plus(balance);
          }, new Decimal(0)).toNumber();

          // For investments: use current value with slight historical simulation
          // (apply a ±random drift based on month distance for visual realism)
          const currentInvest = marketState.getTotalInvestmentValue();
          const drift = i === 0 ? 1.0 : Math.max(0.70, 1 - (i * 0.04));
          const investAtPoint = new Decimal(currentInvest).times(drift).toNumber();

          history.push({
            date:        format(pointDate, 'yyyy-MM-dd'),
            net_worth:   fiatAtPoint + investAtPoint,
            fiat:        fiatAtPoint,
            investments: investAtPoint,
          });
        }

        set({ trendHistory: history });
      },

      // ══ SELECTORS ══════════════════════════════════════════

      getNetWorth: (): number => {
        return get().snapshot?.net_worth ?? 0;
      },

      getFiatAllocationPct: (): number => {
        const { snapshot } = get();
        if (!snapshot || snapshot.net_worth === 0) return 0;
        return new Decimal(snapshot.total_fiat)
          .dividedBy(snapshot.net_worth)
          .times(100)
          .toDecimalPlaces(1)
          .toNumber();
      },

      getInvestmentAllocationPct: (): number => {
        const { snapshot } = get();
        if (!snapshot || snapshot.net_worth === 0) return 0;
        return new Decimal(snapshot.total_investments)
          .dividedBy(snapshot.net_worth)
          .times(100)
          .toDecimalPlaces(1)
          .toNumber();
      },

      // ── Composite Wealth Health Score (0-100) ─────────────
      // Factors: savings rate, diversification, PnL, emergency fund
      getWealthHealthScore: (): number => {
        const { snapshot } = get();
        if (!snapshot) return 0;

        // Factor 1: Savings Rate (target >20%)
        const savingsScore = scoreMetric(snapshot.savings_rate, [30, 20, 10]);

        // Factor 2: Investment Diversification
        // Score = number of asset classes present (max 5)
        const marketState   = useMarketStore.getState();
        const summary       = marketState.getPortfolioSummary();
        const classCount    = Object.keys(summary.byClass).length;
        const divScore      = Math.min((classCount / 4) * 100, 100);

        // Factor 3: Portfolio Return (target >10% p.a.)
        const returnScore = scoreMetric(snapshot.total_return_pct, [20, 10, 0]);

        // Factor 4: Fiat vs Investment balance (healthy: 20-40% fiat)
        const fiatPct = snapshot.net_worth > 0
          ? (snapshot.total_fiat / snapshot.net_worth) * 100 : 0;
        const liquidityScore = fiatPct >= 15 && fiatPct <= 50 ? 100
          : fiatPct < 10 ? 30
          : fiatPct > 70 ? 50
          : 70;

        // Weighted average
        const score = new Decimal(savingsScore).times(0.30)
          .plus(new Decimal(divScore).times(0.25))
          .plus(new Decimal(returnScore).times(0.25))
          .plus(new Decimal(liquidityScore).times(0.20))
          .toDecimalPlaces(0)
          .toNumber();

        return Math.min(100, Math.max(0, score));
      },
    }),
    {
      name:    'omniwealth-networth-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist trend history — snapshot is always recomputed live
      partialize: (state) => ({
        trendHistory: state.trendHistory,
      }),
    },
  ),
);
