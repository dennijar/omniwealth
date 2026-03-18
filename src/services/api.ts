// ============================================================
// OmniWealth – api.ts
// Cleaned API service. High-risk public CORS proxies removed.
// ============================================================

export const USD_TO_IDR_FALLBACK = 15850;

// ── CoinGecko (no CORS issues — public CDN CORS headers) ──────
/**
 * Fetches live IDR + USD prices from CoinGecko for a batch of coin IDs.
 * CoinGecko sets CORS headers correctly, so no proxy is needed.
 *
 * @param coinIds - e.g. ["bitcoin", "ethereum", "solana"]
 */
export async function fetchCryptoPricesFromGecko(
  coinIds: string[],
): Promise<Record<string, { idr?: number; usd?: number }>> {
  if (coinIds.length === 0) return {};

  const url = new URL('https://api.coingecko.com/api/v3/simple/price');
  url.searchParams.set('ids', coinIds.join(','));
  url.searchParams.set('vs_currencies', 'idr,usd');

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.error('Crypto price fetch failed:', err);
    return {};
  }
}

// Yahoo Finance and Proxy logic removed for security and stability.
