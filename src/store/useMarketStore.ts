// ============================================================
// OmniWealth – useMarketStore (Zustand + persist middleware)
// Market Data Aggregation State — Slice 2 of the store layer
//
// Responsibilities:
//   • Hold raw Asset definitions (the "DB" layer in SPA)
//   • Hold enrichedAssets[] after aggregation
//   • Expose syncMarketData() (BATCH SYNC ENGINE with STL Cooldown)
//   • Uses STRICT MATH VWAP logic & Lot Multipliers.
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Decimal from 'decimal.js';
import { fetchViaProxy, fetchCryptoPricesFromGecko } from '../services/api';
import type {
  Asset,
  EnrichedAsset,
  AssetClass,
  ClassSummary,
  MarketState,
  PortfolioSummary,
  CreateAssetPayload,
} from '../types/market';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

function uuid(): string {
  return crypto.randomUUID();
}

export const ASSET_CLASS_CONFIG: Record<AssetClass, { label: string; color: string; bg: string; border: string }> = {
  STOCK:       { label: 'Stocks',      color: '#3B82F6', bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  CRYPTO:      { label: 'Crypto',      color: '#F59E0B', bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
  REAL_ESTATE: { label: 'Real Estate', color: '#10B981', bg: 'bg-emerald-500/10',border: 'border-emerald-500/20'},
  COMMODITY:   { label: 'Commodity',   color: '#EF4444', bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
  MUTUAL_FUND: { label: 'Mutual Fund', color: '#8B5CF6', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
};

const COINGECKO_MAP: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', SOL: 'solana',
  ADA: 'cardano', DOGE: 'dogecoin', MATIC: 'matic-network', AVAX: 'avalanche-2',
  DOT: 'polkadot', LINK: 'chainlink', UNI: 'uniswap', XRP: 'ripple',
  LTC: 'litecoin', ATOM: 'cosmos'
};

export const useMarketStore = create<MarketState>()(
  persist(
    (set, get) => ({
      assets:         [],
      enrichedAssets: [],
      isSyncing:      false,
      lastSyncedAt:   null,
      syncErrors:     [],

      // ── syncMarketData ────────────────────────────────────
      syncMarketData: async () => {
        const { assets, isSyncing, lastSyncedAt } = get();
        if (isSyncing || assets.length === 0) return;

        // TTL Cooldown Anti-Spam (60 seconds)
        if (lastSyncedAt) {
          const secondsSince = (Date.now() - new Date(lastSyncedAt).getTime()) / 1000;
          if (secondsSince < 60) return;
        }

        set({ isSyncing: true, syncErrors: [] });
        const errors: string[] = [];
        const livePrices = new Map<string, Decimal>();
        const nowIso = new Date().toISOString();

        try {
          // 1. Batch fetch Stocks
          const stockAssets = assets.filter(a => a.asset_class === 'STOCK' && a.priceSource !== 'manual');
          if (stockAssets.length > 0) {
            const rawSymbols = [...new Set(stockAssets.map(a => a.symbol?.toUpperCase()).filter(Boolean))] as string[];

            if (rawSymbols.length > 0) {
              const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(rawSymbols.join(','))}`;
              try {
                const res = await fetchViaProxy(url, 8000);
                const results = (res as any)?.quoteResponse?.result || [];
                for (const item of results) {
                  if (item.symbol && item.regularMarketPrice) {
                    const price = item.currency === 'IDR' || String(item.currency).toUpperCase() === 'IDR'
                      ? new Decimal(item.regularMarketPrice) 
                      : new Decimal(item.regularMarketPrice).times(15850);
                    // store under exact symbol queried
                    livePrices.set(item.symbol.toUpperCase(), price);
                  }
                }
              } catch (err) {
                errors.push('Stock batch sync failed. Serving cached prices.');
              }
            }
          }

          // 2. Batch fetch Crypto
          const cryptoAssets = assets.filter(a => a.asset_class === 'CRYPTO' && a.priceSource !== 'manual');
          if (cryptoAssets.length > 0) {
            const symbols = [...new Set(cryptoAssets.map(a => a.symbol?.toUpperCase()).filter(Boolean))] as string[];
            const coinIds = symbols.map(s => COINGECKO_MAP[s]).filter(Boolean);
            if (coinIds.length > 0) {
              try {
                const data = await fetchCryptoPricesFromGecko(coinIds);
                for (const sym of symbols) {
                  const id = COINGECKO_MAP[sym];
                  if (data[id]) {
                    const price = data[id].idr ? new Decimal(data[id].idr!) : new Decimal(data[id].usd!).times(15850);
                    livePrices.set(sym, price);
                  }
                }
              } catch (err) {
                errors.push('Crypto batch sync failed. Serving cached prices.');
              }
            }
          }

          // 3. Map & Enrich
          const updatedAssets: Asset[] = [];
          const newEnriched: EnrichedAsset[] = [];

          for (const asset of assets) {
            let valuation = new Decimal(asset.livePrice || asset.average_buy_price || 0);
            let pSource = asset.priceSource;
            let lastUpdate = asset.lastSyncedAt;

            if (asset.priceSource !== 'manual') {
              const live = asset.symbol ? livePrices.get(asset.symbol.toUpperCase()) : undefined;
              if (live) {
                valuation = live;
                pSource = 'live';
                lastUpdate = nowIso;
              } else {
                pSource = 'cached';
              }
            }

            const updatedAsset: Asset = {
              ...asset,
              livePrice: valuation.toNumber(),
              priceSource: pSource,
              lastSyncedAt: lastUpdate,
            };
            updatedAssets.push(updatedAsset);

            // TASK 2: Strict Math (Lot multiplier for Indonesian Stocks)
            const multiplier = new Decimal(asset.asset_class === 'STOCK' ? 100 : 1);
            const qty = new Decimal(asset.quantity);
            const avgBuy = new Decimal(asset.average_buy_price);

            const capital = avgBuy.times(qty).times(multiplier);
            const currentVal = valuation.times(qty).times(multiplier);
            const pnl = currentVal.minus(capital);
            const returnPct = capital.isZero() ? new Decimal(0) : pnl.dividedBy(capital).times(100);

            newEnriched.push({
              ...updatedAsset,
              live_price: valuation.toFixed(2),
              current_value: currentVal.toFixed(2),
              total_capital: capital.toFixed(2),
              floating_pnl_nominal: pnl.toFixed(2),
              return_percentage: returnPct.toDecimalPlaces(4).toFixed(4),
              price_source: pSource,
              last_updated: lastUpdate ?? nowIso,
              live_price_num: valuation.toNumber(),
              current_value_num: currentVal.toNumber(),
              total_capital_num: capital.toNumber(),
              floating_pnl_num: pnl.toNumber(),
              return_pct_num: returnPct.toDecimalPlaces(2).toNumber(),
            });
          }

          set({
            assets: updatedAssets,
            enrichedAssets: newEnriched,
            lastSyncedAt: nowIso,
            syncErrors: errors,
            isSyncing: false,
          });

        } catch (err) {
          // Graceful fallback on complete failure
          errors.push(err instanceof Error ? err.message : 'Unknown sync crash');
          set({
             isSyncing: false,
             syncErrors: errors,
          });
        }
      },

      // ── fetchUserData (Cloud-First Sync) ────────────────────
      fetchUserData: async () => {
        const user = useAuthStore.getState().user;
        if (!user) return;
        
        try {
          const { data } = await supabase.from('assets').select('*').eq('user_id', user.id);
          if (data) {
            const mappedAssets: Asset[] = data.map(dbA => ({
              id: dbA.id,
              name: dbA.name,
              symbol: dbA.symbol,
              asset_class: dbA.asset_class as AssetClass,
              quantity: dbA.quantity.toString(),
              average_buy_price: dbA.average_buy_price.toString(),
              manual_valuation: dbA.manual_valuation ? dbA.manual_valuation.toString() : null,
              currency: dbA.currency,
              sector: dbA.sector,
              logo_url: dbA.logo_url,
              livePrice: dbA.live_price ? Number(dbA.live_price) : Number(dbA.average_buy_price),
              priceSource: dbA.price_source as any,
              lastSyncedAt: dbA.last_synced_at,
              created_at: dbA.created_at,
            }));
            set({ assets: mappedAssets });
            // re-run enrichment
            get().syncMarketData();
          }
        } catch (err) {
          console.error('Failed to fetch market data from Supabase:', err);
        }
      },

      // ── addAsset ──────────────────────────────────────────
      addAsset: async (payload: CreateAssetPayload): Promise<Asset | null> => {
        const user = useAuthStore.getState().user;
        if (!user) return null;

        const { assets } = get();

        // TASK 1: VWAP Accumulation
        const existing = payload.symbol
          ? assets.find(a => a.symbol?.toUpperCase() === payload.symbol?.toUpperCase() && a.asset_class === payload.asset_class)
          : undefined;

        if (existing) {
          const oldQty = new Decimal(existing.quantity);
          const oldAvgPrice = new Decimal(existing.average_buy_price);
          const addedQty = new Decimal(payload.quantity);
          const addedBuyPrice = new Decimal(payload.average_buy_price);

          const newQty = oldQty.plus(addedQty);
          // newAvgPrice = ((oldQty * oldAvgPrice) + (addedQty * addedBuyPrice)) / (oldQty + addedQty)
          const newAvgPrice = oldQty.times(oldAvgPrice).plus(addedQty.times(addedBuyPrice)).dividedBy(newQty);

          const updatedAsset: Asset = {
            ...existing,
            quantity: newQty.toFixed(8),
            average_buy_price: newAvgPrice.toFixed(2),
          };

            // Update in Supabase
            const { error: patchErr } = await supabase.from('assets').update({
              quantity: newQty.toFixed(8),
              average_buy_price: newAvgPrice.toFixed(2),
            }).eq('id', existing.id);

            if (patchErr) {
              console.error('Supabase patch error (VWAP Accumulation):', patchErr);
              return null;
            }

            set((state) => ({
              assets: state.assets.map(a => a.id === existing.id ? updatedAsset : a)
            }));
            
            // Re-enrich immediately to reflect VWAP locally
            get().syncMarketData();
            return updatedAsset;
          }

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
          livePrice:         payload.manual_valuation ? Number(payload.manual_valuation) : Number(payload.average_buy_price),
          priceSource:       payload.manual_valuation ? 'manual' : 'cached',
          lastSyncedAt:      null,
        };

        const { error } = await supabase.from('assets').insert({
          id: newAsset.id,
          user_id: user.id,
          name: newAsset.name,
          symbol: newAsset.symbol,
          asset_class: newAsset.asset_class,
          quantity: newAsset.quantity,
          average_buy_price: newAsset.average_buy_price,
          manual_valuation: newAsset.manual_valuation,
          currency: newAsset.currency,
          sector: newAsset.sector,
          logo_url: newAsset.logo_url,
          live_price: newAsset.livePrice,
          price_source: newAsset.priceSource,
          last_synced_at: newAsset.lastSyncedAt,
        });

        if (error) {
          console.error('Supabase insert error (assets):', error);
          return null;
        }

        set((state) => ({ assets: [...state.assets, newAsset] }));
        
        // Re-enrich immediately
        get().syncMarketData();
        return newAsset;
      },

      // ── removeAsset ───────────────────────────────────────
      removeAsset: async (id: string) => {
        const { error } = await supabase.from('assets').delete().eq('id', id);
        if (!error) {
          set((state) => ({
            assets:         state.assets.filter((a) => a.id !== id),
            enrichedAssets: state.enrichedAssets.filter((a) => a.id !== id),
          }));
        }
      },

      // ── updateManualValuation ─────────────────────────────
      updateManualValuation: async (id: string, value: number) => {
        const { error } = await supabase.from('assets').update({
          manual_valuation: new Decimal(value).toFixed(2),
          live_price: value,
          price_source: 'manual'
        }).eq('id', id);

        if (!error) {
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
          get().syncMarketData();
        }
      },

      // ══ SELECTORS ══════════════════════════════════════════

      getTotalInvestmentValue: (): number => {
        return get().enrichedAssets.reduce(
          (sum, a) => new Decimal(sum).plus(new Decimal(a.current_value)).toNumber(),
          0,
        );
      },

      getTotalFloatingPnL: (): number => {
        return get().enrichedAssets.reduce(
          (sum, a) => new Decimal(sum).plus(new Decimal(a.floating_pnl_nominal)).toNumber(),
          0,
        );
      },

      getTotalCapital: (): number => {
        return get().enrichedAssets.reduce(
          (sum, a) => new Decimal(sum).plus(new Decimal(a.total_capital)).toNumber(),
          0,
        );
      },

      getTotalReturnPercentage: (): number => {
        const total   = get().getTotalInvestmentValue();
        const capital = get().getTotalCapital();
        if (capital === 0) return 0;
        return new Decimal(total).minus(capital).dividedBy(capital).times(100).toDecimalPlaces(2).toNumber();
      },

      getPortfolioSummary: (): PortfolioSummary => {
        const { enrichedAssets } = get();
        const totalValue = get().getTotalInvestmentValue();
        const byClass = {} as Record<AssetClass, ClassSummary>;

        for (const asset of enrichedAssets) {
          const cls = asset.asset_class;
          if (!byClass[cls]) {
            byClass[cls] = { count: 0, currentValue: 0, capital: 0, pnl: 0, returnPct: 0, allocation: 0 };
          }
          const c = byClass[cls];
          c.count       += 1;
          c.currentValue = new Decimal(c.currentValue).plus(asset.current_value).toNumber();
          c.capital      = new Decimal(c.capital).plus(asset.total_capital).toNumber();
          c.pnl          = new Decimal(c.pnl).plus(asset.floating_pnl_nominal).toNumber();
        }

        for (const cls of Object.keys(byClass) as AssetClass[]) {
          const c = byClass[cls];
          c.returnPct  = c.capital > 0 ? new Decimal(c.currentValue).minus(c.capital).dividedBy(c.capital).times(100).toDecimalPlaces(2).toNumber() : 0;
          c.allocation = totalValue > 0 ? new Decimal(c.currentValue).dividedBy(totalValue).times(100).toDecimalPlaces(1).toNumber() : 0;
        }

        return {
          totalInvestmentValue: totalValue,
          totalCapitalDeployed: get().getTotalCapital(),
          totalFloatingPnL:     get().getTotalFloatingPnL(),
          totalReturnPercentage: get().getTotalReturnPercentage(),
          byClass,
        };
      },

      getEnrichedById: (id: string): EnrichedAsset | undefined => {
        return get().enrichedAssets.find((a) => a.id === id);
      },

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
