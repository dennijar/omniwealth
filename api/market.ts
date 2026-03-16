import { VercelRequest, VercelResponse } from '@vercel/node';

interface MarketData {
  symbol: string;
  price: number;
  currency: string;
  timestamp: number;
}

interface ErrorResponse {
  error: string;
  message: string;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Enable CORS for frontend requests
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request (CORS preflight)
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Only allow GET requests
  if (request.method !== 'GET') {
    return response.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only GET requests are supported',
    });
  }

  try {
    const { symbol, source } = request.query;

    // Validate symbol parameter
    if (!symbol || typeof symbol !== 'string') {
      return response.status(400).json({
        error: 'INVALID_PARAMETER',
        message: 'symbol query parameter is required and must be a string',
      });
    }

    // Validate source parameter (optional, defaults to 'finnhub')
    const marketSource = (source as string) || 'finnhub';

    // Retrieve API keys from environment variables (never expose in frontend)
    const finnhubKey = process.env.FINNHUB_API_KEY;
    const binanceKey = process.env.BINANCE_API_KEY;

    if (!finnhubKey && marketSource === 'finnhub') {
      console.error('FINNHUB_API_KEY not configured');
      return response.status(500).json({
        error: 'CONFIGURATION_ERROR',
        message: 'Market data service is not properly configured',
      });
    }

    if (!binanceKey && marketSource === 'binance') {
      console.error('BINANCE_API_KEY not configured');
      return response.status(500).json({
        error: 'CONFIGURATION_ERROR',
        message: 'Market data service is not properly configured',
      });
    }

    let marketData: MarketData;

    // Route to appropriate market API based on source
    if (marketSource === 'binance') {
      // Fetch from Binance API
      const binanceUrl = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}USDT`;
      const binanceResponse = await fetch(binanceUrl);

      if (!binanceResponse.ok) {
        return response.status(404).json({
          error: 'SYMBOL_NOT_FOUND',
          message: `Symbol ${symbol} not found on Binance`,
        });
      }

      const binanceData = await binanceResponse.json();
      marketData = {
        symbol: symbol.toUpperCase(),
        price: parseFloat(binanceData.price),
        currency: 'USDT',
        timestamp: Date.now(),
      };
    } else {
      // Default to Finnhub API
      const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${finnhubKey}`;
      const finnhubResponse = await fetch(finnhubUrl);

      if (!finnhubResponse.ok) {
        return response.status(404).json({
          error: 'SYMBOL_NOT_FOUND',
          message: `Symbol ${symbol} not found on Finnhub`,
        });
      }

      const finnhubData = await finnhubResponse.json();

      if (!finnhubData.c) {
        return response.status(404).json({
          error: 'SYMBOL_NOT_FOUND',
          message: `Symbol ${symbol} not found on Finnhub`,
        });
      }

      marketData = {
        symbol: symbol.toUpperCase(),
        price: finnhubData.c,
        currency: 'USD',
        timestamp: finnhubData.t ? finnhubData.t * 1000 : Date.now(),
      };
    }

    // Set cache headers to reduce API calls
    response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    return response.status(200).json(marketData);
  } catch (error) {
    console.error('Market API Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return response.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: `Failed to fetch market data: ${errorMessage}`,
    });
  }
}
