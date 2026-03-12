// ============================================================
// OmniWealth – useMarketStore (Zustand + persist middleware)
// Market Data Aggregation State — Slice 2 of the store layer
//
// Responsibilities:
//   • Hold raw Asset definitions (the "DB" layer in SPA)
//   • Hold enrichedAssets[] after aggregation
//   • Expose syncMarketData() → calls aggregateMarketData()
//   • Derived selectors: total value, total PnL, portfolio summary
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Decimal from 'decimal.js';
import { aggregateMarketData } from '../services/marketAggregator';
import type {
  Asset,
  EnrichedAsset,
  AssetClass,
  ClassSummary,
  MarketState,
  PortfolioSummary,
  CreateAssetPayload,
} from '../types/market';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

// ── UUID helper ───────────────────────────────────────────────
function uuid(): string {
  return crypto.randomUUID();
}



// ── Asset class display config ────────────────────────────────
export const ASSET_CLASS_CONFIG: Record<
  AssetClass,
  { label: string; color: string; bg: string; border: string }
> = {
  STOCK:       { label: 'Stocks',      color: '#3B82F6', bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  CRYPTO:      { label: 'Crypto',      color: '#F59E0B', bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
  REAL_ESTATE: { label: 'Real Estate', color: '#10B981', bg: 'bg-emerald-500/10',border: 'border-emerald-500/20'},
  COMMODITY:   { label: 'Commodity',   color: '#EF4444', bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
  MUTUAL_FUND: { label: 'Mutual Fund', color: '#8B5CF6', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
};

// ── Store ─────────────────────────────────────────────────────
export const useMarketStore = create<MarketState>()(
  persist(
    (set, get) => ({
      assets:         [],
      enrichedAssets: [],
      isSyncing:      false,
      lastSyncedAt:   null,
      syncErrors:     [],

      // ══ ACTIONS ════════════════════════════════════════════

      // ── syncMarketData ────────────────────────────────────
      // Calls the aggregation engine; handles loading & error state
      syncMarketData: async () => {
        const { assets, isSyncing } = get();
        if (isSyncing) return; // debounce concurrent calls

        set({ isSyncing: true, syncErrors: [] });

        try {
          const response = await aggregateMarketData(assets);
          set({
            assets:         response.assets,
            enrichedAssets: response.enrichedAssets,
            lastSyncedAt:   response.syncedAt,
            syncErrors:     response.errors,
            isSyncing:      false,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown aggregation error';
          // Emergency fallback: enrich all with avg_buy_price
          const fallback = assets.map((asset) => {
            const price = new Decimal(asset.manual_valuation ?? asset.average_buy_price);
            const qty   = new Decimal(asset.quantity);
            const capital = new Decimal(asset.average_buy_price).times(qty);
            const curVal  = price.times(qty);
            const pnl     = curVal.minus(capital);
            const retPct  = capital.isZero() ? new Decimal(0) : pnl.dividedBy(capital).times(100);
            return {
              ...asset,
              live_price:           price.toFixed(2),
              current_value:        curVal.toFixed(2),
              total_capital:        capital.toFixed(2),
              floating_pnl_nominal: pnl.toFixed(2),
              return_percentage:    retPct.toFixed(4),
              price_source:         'error',
              last_updated:         asset.lastSyncedAt ?? new Date().toISOString(),
              live_price_num:       price.toNumber(),
              current_value_num:    curVal.toNumber(),
              total_capital_num:    capital.toNumber(),
              floating_pnl_num:     pnl.toNumber(),
              return_pct_num:       retPct.toDecimalPlaces(2).toNumber(),
            } satisfies EnrichedAsset;
          });
          set({
            enrichedAssets: fallback,
            syncErrors:     [msg],
            isSyncing:      false,
            lastSyncedAt:   new Date().toISOString(),
          });
        }
      },

      // ── addAsset ──────────────────────────────────────────
      addAsset: (payload: CreateAssetPayload): Asset => {
        const newAsset: Asset = {
          id:                uuid(),
          name:              payload.name,
          symbol:            payload.symbol ?? null,
          asset_class:       payload.asset_class,
          quantity:          new Decimal(payload.quantity).toFixed(8),
          average_buy_price: new Decimal(payload.average_buy_price).toFixed(2),
          manual_valuation:  payload.manual_valuation
                               ? new Decimal(payload.manual_valuation).toFixed(2)
                               : null,
          currency:          payload.currency ?? 'IDR',
          sector:            payload.sector ?? null,
          logo_url:          null,
          created_at:        new Date().toISOString(),
          // ── 3-Tier Fallback init ──
          livePrice:         payload.manual_valuation ? payload.manual_valuation : payload.average_buy_price,
          priceSource:       payload.manual_valuation ? 'manual' : 'cached',
          lastSyncedAt:      null,
        };
        set((state) => ({ assets: [...state.assets, newAsset] }));
        return newAsset;
      },

      // ── removeAsset ───────────────────────────────────────
      removeAsset: (id: string) => {
        set((state) => ({
          assets:         state.assets.filter((a) => a.id !== id),
          enrichedAssets: state.enrichedAssets.filter((a) => a.id !== id),
        }));
      },

      // ── updateManualValuation ─────────────────────────────
      updateManualValuation: (id: string, value: number) => {
        set((state) => ({
          assets: state.assets.map((a) =>
            a.id === id
              ? { 
                  ...a, 
                  manual_valuation: new Decimal(value).toFixed(2),
                  livePrice: value,
                  priceSource: 'manual'
                }
              : a,
          ),
        }));
      },

      // ══ SELECTORS ══════════════════════════════════════════

      // Sum of all current_value across enriched assets
      getTotalInvestmentValue: (): number => {
        return get().enrichedAssets.reduce(
          (sum, a) => new Decimal(sum).plus(new Decimal(a.current_value)).toNumber(),
          0,
        );
      },

      // Sum of all floating_pnl_nominal
      getTotalFloatingPnL: (): number => {
        return get().enrichedAssets.reduce(
          (sum, a) => new Decimal(sum).plus(new Decimal(a.floating_pnl_nominal)).toNumber(),
          0,
        );
      },

      // Sum of all total_capital
      getTotalCapital: (): number => {
        return get().enrichedAssets.reduce(
          (sum, a) => new Decimal(sum).plus(new Decimal(a.total_capital)).toNumber(),
          0,
        );
      },

      // Weighted portfolio return %
      getTotalReturnPercentage: (): number => {
        const total   = get().getTotalInvestmentValue();
        const capital = get().getTotalCapital();
        if (capital === 0) return 0;
        return new Decimal(total)
          .minus(capital)
          .dividedBy(capital)
          .times(100)
          .toDecimalPlaces(2)
          .toNumber();
      },

      // Full breakdown by asset class
      getPortfolioSummary: (): PortfolioSummary => {
        const { enrichedAssets } = get();
        const totalValue = get().getTotalInvestmentValue();

        const byClass = {} as Record<AssetClass, ClassSummary>;

        for (const asset of enrichedAssets) {
          const cls = asset.asset_class;
          if (!byClass[cls]) {
            byClass[cls] = {
              count: 0, currentValue: 0, capital: 0, pnl: 0,
              returnPct: 0, allocation: 0,
            };
          }
          const c = byClass[cls];
          c.count       += 1;
          c.currentValue = new Decimal(c.currentValue).plus(asset.current_value).toNumber();
          c.capital      = new Decimal(c.capital).plus(asset.total_capital).toNumber();
          c.pnl          = new Decimal(c.pnl).plus(asset.floating_pnl_nominal).toNumber();
        }

        // Second pass: compute returnPct & allocation
        for (const cls of Object.keys(byClass) as AssetClass[]) {
          const c = byClass[cls];
          c.returnPct  = c.capital > 0
            ? new Decimal(c.currentValue).minus(c.capital)
                .dividedBy(c.capital).times(100)
                .toDecimalPlaces(2).toNumber()
            : 0;
          c.allocation = totalValue > 0
            ? new Decimal(c.currentValue)
                .dividedBy(totalValue).times(100)
                .toDecimalPlaces(1).toNumber()
            : 0;
        }

        return {
          totalInvestmentValue: totalValue,
          totalCapitalDeployed: get().getTotalCapital(),
          totalFloatingPnL:     get().getTotalFloatingPnL(),
          totalReturnPercentage: get().getTotalReturnPercentage(),
          byClass,
        };
      },

      // Find single enriched asset by id
      getEnrichedById: (id: string): EnrichedAsset | undefined => {
        return get().enrichedAssets.find((a) => a.id === id);
      },

      // Filter enriched assets by class
      getAssetsByClass: (cls: AssetClass): EnrichedAsset[] => {
        return get().enrichedAssets.filter((a) => a.asset_class === cls);
      },
    }),
    {
      name:    'omniwealth-market-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist raw assets & lastSyncedAt — re-enrich on mount
      partialize: (state) => ({
        assets:       state.assets,
        lastSyncedAt: state.lastSyncedAt,
      }),
    },
  ),
);
