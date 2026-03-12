// ============================================================
// OmniWealth – Market Data Aggregation Engine
// Simulates the backend /api/market-data/sync route logic
// running entirely client-side (Vite SPA architecture).
//
// Architecture mirrors the Next.js API route:
//   1. Separate assets by class
//   2. Fetch live prices (STOCK → Yahoo Finance proxy / mock,
//      CRYPTO → CoinGecko public API)
//   3. REAL_ESTATE → strict manual_valuation
//   4. Build enriched asset with Decimal.js precision
//   5. Graceful fallback to avg_buy_price on API failure
// ============================================================

import Decimal from 'decimal.js';
import type {
  Asset,
  AssetClass,
  EnrichedAsset,
  AssetStatus,
  CoinGeckoPriceResponse,
  MarketSyncResponse,
} from '../types/market';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

// ── CoinGecko Symbol → Coin ID Map ───────────────────────────
const COINGECKO_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  LINK: 'chainlink',
  UNI: 'uniswap',
  XRP: 'ripple',
  LTC: 'litecoin',
  ATOM: 'cosmos',
};

// ── IDR Exchange Rate (fallback static) ──────────────────────
const USD_TO_IDR_FALLBACK = 15_850;

// ── USD → IDR Decimal-precise converter ──────────────────────
function usdToIdr(usdPrice: number, rate: number = USD_TO_IDR_FALLBACK): Decimal {
  return new Decimal(usdPrice).times(new Decimal(rate));
}

// ── Build EnrichedAsset from a resolved live price ───────────
function buildEnrichedAsset(
  asset: Asset,
  livePriceIdr: Decimal,
  source: AssetStatus,
): EnrichedAsset {
  const qty       = new Decimal(asset.quantity);
  const avgBuy    = new Decimal(asset.average_buy_price);
  const curVal    = livePriceIdr.times(qty);
  const capital   = avgBuy.times(qty);
  const pnl       = curVal.minus(capital);
  const returnPct = capital.isZero()
    ? new Decimal(0)
    : pnl.dividedBy(capital).times(100);

  return {
    ...asset,
    live_price:             livePriceIdr.toFixed(2),
    current_value:          curVal.toFixed(2),
    total_capital:          capital.toFixed(2),
    floating_pnl_nominal:   pnl.toFixed(2),
    return_percentage:      returnPct.toDecimalPlaces(4).toFixed(4),
    price_source:           source,
    last_updated:           asset.lastSyncedAt ?? new Date().toISOString(),
    // Convenience numerics
    live_price_num:         livePriceIdr.toNumber(),
    current_value_num:      curVal.toNumber(),
    total_capital_num:      capital.toNumber(),
    floating_pnl_num:       pnl.toNumber(),
    return_pct_num:         returnPct.toDecimalPlaces(2).toNumber(),
  };
}

// ── CRYPTO: Fetch from CoinGecko public API ───────────────────
async function fetchCryptoPrices(
  assets: Asset[],
): Promise<Map<string, { priceIdr: Decimal; source: AssetStatus }>> {
  const result = new Map<string, { priceIdr: Decimal; source: AssetStatus }>();

  const symbols = assets
    .map((a) => a.symbol?.toUpperCase() ?? '')
    .filter(Boolean);

  const coinIds = symbols
    .map((s) => COINGECKO_ID_MAP[s])
    .filter(Boolean);

  if (coinIds.length === 0) return result;

  try {
    const url = new URL('https://api.coingecko.com/api/v3/simple/price');
    url.searchParams.set('ids', coinIds.join(','));
    url.searchParams.set('vs_currencies', 'idr,usd');
    url.searchParams.set('include_24hr_change', 'true');

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

    const data: CoinGeckoPriceResponse = await res.json();

    for (const asset of assets) {
      const sym    = asset.symbol?.toUpperCase() ?? '';
      const coinId = COINGECKO_ID_MAP[sym];
      if (!coinId || !data[coinId]) continue;

      const priceIdr = data[coinId].idr
        ? new Decimal(data[coinId].idr!)
        : data[coinId].usd
        ? usdToIdr(data[coinId].usd!)
        : null;

      if (priceIdr) {
        result.set(asset.id, { priceIdr, source: 'live' });
      }
    }
  } catch {
    // Graceful fallback — will be handled in main loop
  }

  return result;
}

// ── STOCK: Fetch via Yahoo Finance + CORS proxy chain ─────────
// Uses the 3-proxy fallback chain from api.ts.
// On any failure the asset is gracefully omitted from the result
// map, and the main loop will fall back to avg_buy_price.
async function fetchStockPrices(
  assets: Asset[],
): Promise<Map<string, { priceIdr: Decimal; source: AssetStatus }>> {
  const result = new Map<string, { priceIdr: Decimal; source: AssetStatus }>();

  const symbols = assets.map((a) => a.symbol).filter(Boolean) as string[];
  if (symbols.length === 0) return result;

  await Promise.allSettled(
    symbols.map(async (symbol) => {
      const asset = assets.find((a) => a.symbol === symbol)!;
      try {
        const { fetchViaProxy } = await import('./api');
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
        const json = await fetchViaProxy(yahooUrl, 8_000);

        const meta = (json as { chart?: { result?: { meta?: Record<string, unknown> }[] } })
          ?.chart?.result?.[0]?.meta;
        const rawPrice = (meta?.regularMarketPrice ?? meta?.previousClose) as number | undefined;

        if (rawPrice == null) throw new Error('No price in response');

        const currency = ((meta?.currency as string | undefined) ?? 'IDR').toUpperCase();
        const priceIdr  = currency === 'IDR'
          ? new Decimal(rawPrice)
          : usdToIdr(rawPrice);

        if (priceIdr) {
          result.set(asset.id, { priceIdr, source: 'live' });
        }
      } catch {
        // Leave entry absent → main loop falls back to cache
      }
    }),
  );

  return result;
}


// ── MAIN AGGREGATION ENGINE ───────────────────────────────────
export async function aggregateMarketData(
  assets: Asset[],
): Promise<MarketSyncResponse> {
  const errors: string[]       = [];
  const enrichedAssets: EnrichedAsset[] = [];
  const updatedAssets: Asset[] = [];

  // Partition by class
  const byClass = assets.reduce<Record<AssetClass, Asset[]>>(
    (acc, a) => {
      (acc[a.asset_class] = acc[a.asset_class] ?? []).push(a);
      return acc;
    },
    {} as Record<AssetClass, Asset[]>,
  );

  // Filter out manual overrides before fetching
  const isManual = (a: Asset) => a.priceSource === 'manual';
  
  const cryptoAssets    = (byClass['CRYPTO']      ?? []).filter(a => !isManual(a));
  const stockAssets     = (byClass['STOCK']       ?? []).filter(a => !isManual(a));
  
  const manualAssets    = assets.filter(isManual).concat(
    (byClass['REAL_ESTATE']  ?? []).filter(a => !isManual(a)),
    (byClass['COMMODITY']    ?? []).filter(a => !isManual(a)),
    (byClass['MUTUAL_FUND']  ?? []).filter(a => !isManual(a)),
  );

  // ── Fire external fetches in parallel ──────────────────────
  const [cryptoPrices, stockPrices] = await Promise.all([
    fetchCryptoPrices(cryptoAssets),
    fetchStockPrices(stockAssets),
  ]);

  const nowIso = new Date().toISOString();

  // ── Process CRYPTO ─────────────────────────────────────────
  for (const asset of cryptoAssets) {
    const fetched = cryptoPrices.get(asset.id);
    if (fetched) {
      const liveNum = fetched.priceIdr.toNumber();
      const updated: Asset = { ...asset, livePrice: liveNum, priceSource: 'live', lastSyncedAt: nowIso };
      updatedAssets.push(updated);
      enrichedAssets.push(buildEnrichedAsset(updated, fetched.priceIdr, 'live'));
    } else {
      errors.push(`CRYPTO fallback for ${asset.symbol ?? asset.name}`);
      const updated: Asset = { ...asset, priceSource: 'cached' }; // Keep existing livePrice, keep old lastSyncedAt
      updatedAssets.push(updated);
      enrichedAssets.push(buildEnrichedAsset(updated, new Decimal(updated.livePrice || 0), 'cached'));
    }
  }

  // ── Process STOCK ──────────────────────────────────────────
  for (const asset of stockAssets) {
    const fetched = stockPrices.get(asset.id);
    if (fetched) {
      const liveNum = fetched.priceIdr.toNumber();
      const updated: Asset = { ...asset, livePrice: liveNum, priceSource: 'live', lastSyncedAt: nowIso };
      updatedAssets.push(updated);
      enrichedAssets.push(buildEnrichedAsset(updated, fetched.priceIdr, 'live'));
    } else {
      errors.push(`STOCK fallback for ${asset.symbol ?? asset.name}`);
      const updated: Asset = { ...asset, priceSource: 'cached' }; // Keep existing livePrice, keep old lastSyncedAt
      updatedAssets.push(updated);
      enrichedAssets.push(buildEnrichedAsset(updated, new Decimal(updated.livePrice || 0), 'cached'));
    }
  }

  // ── Process MANUAL / STATIC assets ─────────────────────────
  for (const asset of manualAssets) {
    // If it explicitly is marked manual or has manual_valuation, use it. Otherwise livePrice.
    const valuation = asset.manual_valuation
      ? new Decimal(asset.manual_valuation)
      : new Decimal(asset.livePrice || asset.average_buy_price);
      
    const updated: Asset = { ...asset, livePrice: valuation.toNumber(), priceSource: 'manual' };
    
    // De-duplicate in case manualAssets overlap (they shouldn't if filtered correctly, but just in case)
    if (!updatedAssets.find(a => a.id === updated.id)) {
      updatedAssets.push(updated);
      enrichedAssets.push(buildEnrichedAsset(updated, valuation, 'manual'));
    }
  }

  return {
    assets: updatedAssets,
    enrichedAssets,
    syncedAt: nowIso,
    errors,
    totalAssets: enrichedAssets.length,
  };
}
