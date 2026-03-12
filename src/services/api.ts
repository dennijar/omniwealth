// ============================================================
// OmniWealth – api.ts
// Client-side market data fetch utilities with CORS bypass.
//
// WHY: Direct calls to query1.finance.yahoo.com fail in the
// browser due to CORS policy (Yahoo doesn't set
// Access-Control-Allow-Origin: *).
//
// SOLUTION: Route through a public CORS proxy chain with
// automatic fallback to the next proxy if the current one
// fails or times out.
//
// PROXY CHAIN (tried in order):
//   1. corsproxy.io      – fastest, high availability
//   2. api.allorigins.win – reliable, wraps in JSON
//   3. Direct URL        – only works if Yahoo relaxes CORS
//                          (unlikely, but kept as last resort)
// ============================================================

// ── Decimal precision (share with other modules) ─────────────
const USD_TO_IDR_FALLBACK = 15_850;

// ── Proxy definitions ────────────────────────────────────────
interface ProxyConfig {
  name:    string;
  /** Wrap the target URL into a proxy URL */
  wrap:    (targetUrl: string) => string;
  /** Extract the final JSON from the proxy response body */
  extract: (res: Response) => Promise<unknown>;
}

const PROXIES: ProxyConfig[] = [
  {
    name: 'corsproxy.io',
    wrap: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    extract: (res) => res.json(),
  },
  {
    name: 'allorigins',
    // allorigins wraps payload in { contents: "..." }
    wrap: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    extract: (res) => res.json(),
  },
  {
    name: 'direct (no proxy)',
    wrap: (url) => url,
    extract: (res) => res.json(),
  },
];

// ── Core fetch-with-proxy helper ──────────────────────────────
/**
 * Fetches a JSON URL through the CORS proxy chain.
 * Tries each proxy in sequence; returns the parsed JSON on the
 * first success. Throws if all proxies fail.
 *
 * @param targetUrl  - The actual URL you want to reach
 * @param timeoutMs  - Per-proxy timeout (default: 8000ms)
 */
export async function fetchViaProxy(
  targetUrl: string,
  timeoutMs = 8_000,
): Promise<unknown> {
  let lastError: Error | null = null;

  for (const proxy of PROXIES) {
    try {
      const proxyUrl = proxy.wrap(targetUrl);
      const res = await fetch(proxyUrl, {
        signal:  AbortSignal.timeout(timeoutMs),
        headers: { Accept: 'application/json' },
        cache:   'no-store',
      });

      if (!res.ok) {
        throw new Error(`[${proxy.name}] HTTP ${res.status}`);
      }

      const data = await proxy.extract(res);
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Continue to next proxy
      console.warn(`[OmniWealth/api] Proxy "${proxy.name}" failed:`, lastError.message);
    }
  }

  throw lastError ?? new Error('All CORS proxies failed');
}

// ── Yahoo Finance quote endpoint ──────────────────────────────
/**
 * Fetches the current price for a stock/ETF symbol from Yahoo Finance.
 * Routes through the CORS proxy chain automatically.
 *
 * Returns price in IDR (converts USD → IDR using static fallback rate
 * if the underlying asset is priced in a currency other than IDR).
 *
 * @param symbol     - Yahoo Finance symbol, e.g. "AAPL", "BBCA.JK", "GOTO.JK"
 * @param usdToIdr   - Override the USD→IDR conversion rate (optional)
 */
export async function fetchStockPrice(
  symbol:   string,
  usdToIdr: number = USD_TO_IDR_FALLBACK,
): Promise<{ priceIdr: number; currency: string; source: 'LIVE' | 'FALLBACK' }> {
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

  const json = await fetchViaProxy(yahooUrl);

  // Navigate the Yahoo Finance chart response
  const meta     = (json as { chart?: { result?: { meta?: Record<string, unknown> }[] } })?.chart?.result?.[0]?.meta;
  const rawPrice = (meta?.regularMarketPrice ?? meta?.previousClose) as number | undefined;

  if (rawPrice == null) {
    throw new Error(`No price found in Yahoo response for ${symbol}`);
  }

  const currency = ((meta?.currency as string | undefined) ?? 'IDR').toUpperCase();
  const priceIdr  = currency === 'IDR'
    ? rawPrice
    : rawPrice * usdToIdr;

  return { priceIdr, currency, source: 'LIVE' };
}

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

  const res = await fetch(url.toString(), {
    signal:  AbortSignal.timeout(8_000),
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  return res.json() as Promise<Record<string, { idr?: number; usd?: number }>>;
}
