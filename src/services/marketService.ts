interface MarketServiceResponse {
  symbol: string;
  price: number;
  currency: string;
  timestamp: number;
}

interface MarketServiceError {
  error: string;
  message: string;
}

class MarketService {
  private baseUrl: string;

  constructor() {
    // Use relative URL for Vercel serverless function
    this.baseUrl = '/api/market';
  }

  /**
   * Fetch market price for a symbol through secure serverless proxy.
   * API key stays server-side, never exposed to browser.
   *
   * @param symbol - Stock symbol (AAPL, GOOGL) or crypto symbol (BTC, ETH)
   * @param source - Optional market source: 'finnhub' (stocks) or 'binance' (crypto)
   * @returns Market data with current price
   */
  async fetchMarketPrice(
    symbol: string,
    source: 'finnhub' | 'binance' = 'finnhub',
  ): Promise<MarketServiceResponse> {
    try {
      const params = new URLSearchParams({
        symbol: symbol.toUpperCase(),
        source,
      });

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = (await response.json()) as MarketServiceError;
        throw new Error(`${error.error}: ${error.message}`);
      }

      const data = (await response.json()) as MarketServiceResponse;

      return {
        symbol: data.symbol,
        price: data.price,
        currency: data.currency,
        timestamp: data.timestamp,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to fetch market price for ${symbol}:`, errorMessage);
      throw new Error(`Market data fetch failed: ${errorMessage}`);
    }
  }

  /**
   * Fetch prices for multiple symbols in parallel.
   * Useful for syncing portfolio asset prices.
   *
   * @param symbols - Array of stock/crypto symbols
   * @returns Map of symbol -> market data
   */
  async fetchMultiplePrices(
    symbols: string[],
    source: 'finnhub' | 'binance' = 'finnhub',
  ): Promise<Map<string, MarketServiceResponse>> {
    const results = new Map<string, MarketServiceResponse>();

    try {
      const promises = symbols.map((symbol) =>
        this.fetchMarketPrice(symbol, source)
          .then((data) => {
            results.set(symbol, data);
          })
          .catch((error) => {
            console.warn(`Failed to fetch ${symbol}:`, error);
            // Continue with other symbols on individual failures
          }),
      );

      await Promise.allSettled(promises);

      return results;
    } catch (error) {
      console.error('Batch market data fetch failed:', error);
      throw error;
    }
  }

  /**
   * Fetch cryptocurrency price from Binance (no API key required for public endpoint).
   * Useful for quick crypto price lookups.
   *
   * @param symbol - Crypto symbol (BTC, ETH, etc.)
   * @returns Market data with USDT price
   */
  async fetchCryptoPrice(symbol: string): Promise<MarketServiceResponse> {
    return this.fetchMarketPrice(symbol, 'binance');
  }

  /**
   * Fetch stock price from Finnhub through secure proxy.
   * API key is kept server-side.
   *
   * @param symbol - Stock symbol (AAPL, GOOGL, etc.)
   * @returns Market data with USD price
   */
  async fetchStockPrice(symbol: string): Promise<MarketServiceResponse> {
    return this.fetchMarketPrice(symbol, 'finnhub');
  }
}

// Export singleton instance
export const marketService = new MarketService();

// Export type for convenience
export type { MarketServiceResponse, MarketServiceError };
