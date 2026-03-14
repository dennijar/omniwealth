// ============================================================
// OmniWealth – Market Data Module Types
// Production-grade type definitions for the Aggregation Engine
// ============================================================

export type AssetClass = 'STOCK' | 'CRYPTO' | 'REAL_ESTATE' | 'COMMODITY' | 'MUTUAL_FUND';

export type AssetStatus = 'live' | 'cached' | 'manual' | 'error';

// ── Raw Asset (mirrors Prisma DB record) ─────────────────────
export interface Asset {
  id: string;
  name: string;
  symbol: string | null;           // e.g. 'BBCA.JK', 'bitcoin', null for RE
  asset_class: AssetClass;
  quantity: string;                // Decimal string
  average_buy_price: string;       // Decimal string (IDR)
  manual_valuation: string | null; // For REAL_ESTATE / fallback
  currency: string;                // 'IDR' | 'USD'
  sector: string | null;
  logo_url: string | null;
  created_at: string;
  
  // ── 3-Tier Pricing Fallback State ──
  livePrice: number;               // The actual price value (cached or live)
  priceSource: AssetStatus;        // How we got this price
  lastSyncedAt: string | null;     // ISO Date string of last successful API fetch
}

// ── Enriched Asset (post-aggregation with live PnL data) ─────
export interface EnrichedAsset extends Asset {
  live_price: string;              // Decimal string
  current_value: string;           // live_price * quantity
  total_capital: string;           // avg_buy_price * quantity
  floating_pnl_nominal: string;    // current_value - total_capital
  return_percentage: string;       // (pnl / capital) * 100
  price_source: AssetStatus;       // transparency flag
  last_updated: string;            // ISO datetime
  // Convenience numerics for UI rendering
  live_price_num: number;
  current_value_num: number;
  total_capital_num: number;
  floating_pnl_num: number;
  return_pct_num: number;
}

// ── CoinGecko API Response Shape ─────────────────────────────
export interface CoinGeckoPriceResponse {
  [coinId: string]: {
    idr?: number;
    usd?: number;
    idr_24h_change?: number;
    usd_24h_change?: number;
  };
}

// ── Yahoo Finance Quote (simplified) ─────────────────────────
export interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  currency: string;
}

// ── Aggregation Engine Payload ────────────────────────────────
export interface MarketSyncResponse {
  assets: Asset[];                 // Updated raw assets with latest cache
  enrichedAssets: EnrichedAsset[]; // Computed PnL ready for UI
  syncedAt: string;
  errors: string[];
  totalAssets: number;
}

// ── Portfolio Summary ─────────────────────────────────────────
export interface PortfolioSummary {
  totalInvestmentValue: number;    // Sum of current_value
  totalCapitalDeployed: number;    // Sum of total_capital
  totalFloatingPnL: number;        // Sum of floating_pnl_nominal
  totalReturnPercentage: number;   // Weighted average return
  byClass: Record<AssetClass, ClassSummary>;
}

export interface ClassSummary {
  count: number;
  currentValue: number;
  capital: number;
  pnl: number;
  returnPct: number;
  allocation: number;              // % of total portfolio
}

// ── Market Store State ────────────────────────────────────────
export interface MarketState {
  assets: Asset[];
  enrichedAssets: EnrichedAsset[];
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncErrors: string[];

  // ── Actions ──
  syncMarketData: () => Promise<void>;
  addAsset: (payload: CreateAssetPayload) => Promise<Asset | null>;
  removeAsset: (id: string) => Promise<void>;
  updateManualValuation: (id: string, value: number) => Promise<void>;
  fetchUserData: () => Promise<void>;

  // ── Selectors ──
  getTotalInvestmentValue: () => number;
  getTotalFloatingPnL: () => number;
  getTotalCapital: () => number;
  getTotalReturnPercentage: () => number;
  getPortfolioSummary: () => PortfolioSummary;
  getEnrichedById: (id: string) => EnrichedAsset | undefined;
  getAssetsByClass: (cls: AssetClass) => EnrichedAsset[];
}

// ── Create Payload ────────────────────────────────────────────
export interface CreateAssetPayload {
  name: string;
  symbol?: string;
  asset_class: AssetClass;
  quantity: number;
  average_buy_price: number;
  manual_valuation?: number;
  currency?: string;
  sector?: string;
}
