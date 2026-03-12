// ============================================================
// OmniWealth – Net Worth Module Types
// The unified aggregation layer that joins Fiat + Investments
// into a single source of truth for the user's total wealth.
// ============================================================

// ── Wealth Snapshot ──────────────────────────────────────────
// A point-in-time record of the user's complete financial picture
export interface WealthSnapshot {
  /** ISO datetime of when this snapshot was computed */
  computed_at: string;

  // ── Fiat Layer ───────────────────────────────────────────
  /** Sum of all bank account balances (initial + txs) */
  total_fiat: number;
  /** Number of bank accounts active */
  fiat_accounts_count: number;
  /** Monthly net cash flow (income - expenses) */
  monthly_net_flow: number;
  /** Monthly income */
  monthly_income: number;
  /** Monthly expenses */
  monthly_expense: number;
  /** Monthly savings rate as percentage */
  savings_rate: number;

  // ── Investment Layer ──────────────────────────────────────
  /** Sum of all enriched asset current_value */
  total_investments: number;
  /** Sum of all total_capital (what was paid) */
  total_capital_deployed: number;
  /** Sum of all floating_pnl_nominal */
  total_floating_pnl: number;
  /** Weighted portfolio return % */
  total_return_pct: number;
  /** Number of assets tracked */
  asset_count: number;

  // ── Unified Layer ──────────────────────────────────────────
  /** Grand total: fiat + investments */
  net_worth: number;
  /** PnL impact on net worth as % */
  net_worth_pnl_contribution: number;
}

// ── Wealth Allocation Slice ───────────────────────────────────
export interface AllocationSlice {
  label: string;
  value: number;
  percentage: number;
  color: string;
  change_24h?: number;
}

// ── Wealth Trend Point (historical) ──────────────────────────
export interface WealthTrendPoint {
  date: string;          // 'YYYY-MM-DD'
  net_worth: number;
  fiat: number;
  investments: number;
}

// ── Net Worth Store State ─────────────────────────────────────
export interface NetWorthState {
  snapshot: WealthSnapshot | null;
  allocationSlices: AllocationSlice[];
  trendHistory: WealthTrendPoint[];
  isComputing: boolean;

  // ── Actions ──
  computeSnapshot: () => void;
  generateTrendHistory: () => void;

  // ── Selectors ──
  getNetWorth: () => number;
  getFiatAllocationPct: () => number;
  getInvestmentAllocationPct: () => number;
  getWealthHealthScore: () => number; // 0-100 composite score
}

// ── Asset Class Breakdown (for Net Worth view) ────────────────
export interface AssetBreakdown {
  class: string;
  label: string;
  value: number;
  percentage: number;
  pnl: number;
  color: string;
  icon: string;
}

// ── Financial Health Metrics ──────────────────────────────────
export interface HealthMetric {
  id: string;
  label: string;
  description: string;
  score: number;       // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor';
  value: string;       // Formatted display value
  benchmark: string;   // What a good score looks like
}
