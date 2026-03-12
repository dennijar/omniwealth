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
    last_updated:           new Date().toISOString(),
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
        result.set(asset.id, { priceIdr, source: 'LIVE' });
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

        result.set(asset.id, { priceIdr, source: 'LIVE' });
      } catch {
        // Leave entry absent → main loop falls back to avg_buy_price
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

  // Partition by class
  const byClass = assets.reduce<Record<AssetClass, Asset[]>>(
    (acc, a) => {
      (acc[a.asset_class] = acc[a.asset_class] ?? []).push(a);
      return acc;
    },
    {} as Record<AssetClass, Asset[]>,
  );

  const cryptoAssets    = byClass['CRYPTO']      ?? [];
  const stockAssets     = byClass['STOCK']        ?? [];
  const manualAssets    = [
    ...(byClass['REAL_ESTATE']  ?? []),
    ...(byClass['COMMODITY']    ?? []),
    ...(byClass['MUTUAL_FUND']  ?? []),
  ];

  // ── Fire external fetches in parallel ──────────────────────
  const [cryptoPrices, stockPrices] = await Promise.all([
    fetchCryptoPrices(cryptoAssets),
    fetchStockPrices(stockAssets),
  ]);

  // ── Process CRYPTO ─────────────────────────────────────────
  for (const asset of cryptoAssets) {
    const fetched = cryptoPrices.get(asset.id);
    if (fetched) {
      enrichedAssets.push(buildEnrichedAsset(asset, fetched.priceIdr, fetched.source));
    } else {
      // Fallback: use average_buy_price
      errors.push(`CRYPTO fallback for ${asset.symbol ?? asset.name}`);
      const fallback = new Decimal(asset.average_buy_price);
      enrichedAssets.push(buildEnrichedAsset(asset, fallback, 'FALLBACK'));
    }
  }

  // ── Process STOCK ──────────────────────────────────────────
  for (const asset of stockAssets) {
    const fetched = stockPrices.get(asset.id);
    if (fetched) {
      enrichedAssets.push(buildEnrichedAsset(asset, fetched.priceIdr, fetched.source));
    } else {
      errors.push(`STOCK fallback for ${asset.symbol ?? asset.name}`);
      const fallback = new Decimal(asset.average_buy_price);
      enrichedAssets.push(buildEnrichedAsset(asset, fallback, 'FALLBACK'));
    }
  }

  // ── Process MANUAL assets (REAL_ESTATE, etc.) ─────────────
  for (const asset of manualAssets) {
    const valuation = asset.manual_valuation
      ? new Decimal(asset.manual_valuation)
      : new Decimal(asset.average_buy_price);
    enrichedAssets.push(buildEnrichedAsset(asset, valuation, 'MANUAL'));
  }

  return {
    enrichedAssets,
    syncedAt:    new Date().toISOString(),
    errors,
    totalAssets: enrichedAssets.length,
  };
}
