// ============================================================
// OmniWealth – Financial Intelligence Types
// Complete type contract for the Insight Engine module
// ============================================================

// ── Burn Rate ─────────────────────────────────────────────────
export interface BurnRate {
  dailyAvg: number;
  weeklyAvg: number;
  monthlyAvg: number;
  /** Number of EXPENSE transactions analyzed */
  sampleCount: number;
  /** Date range: 90 days back */
  analyzedFrom: string;
  analyzedTo: string;
  /** Month-over-month trend */
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  /** % change vs previous period */
  trendPercent: number;
  /** Per-category breakdown of avg monthly spend */
  byCategory: Record<string, number>;
}

// ── Emergency Fund Runway ─────────────────────────────────────
export type EmergencyFundStatus = 'CRITICAL' | 'WARNING' | 'SAFE' | 'EXCELLENT';

export interface EmergencyFundResult {
  totalFiatBalance: number;
  monthlyAvgExpense: number;
  runwayMonths: number;
  runwayDays: number;         // remaining days after full months
  exactRunwayDays: number;   // total runway in days
  status: EmergencyFundStatus;
  targetMonths: number;      // recommended: 6
  coveragePercent: number;   // progress toward 6-month target
  shortfallAmount: number;   // how much more is needed to reach safe
  /** Human readable: e.g. "3 bulan 12 hari" */
  displayRunway: string;
}

// ── Financial Score ───────────────────────────────────────────
export type FinancialGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface FinancialScoreBreakdown {
  savingsRatio: number;        // 0-100
  budgetDiscipline: number;   // 0-100
  transactionConsistency: number; // 0-100 (how many months have data)
  expenseControl: number;     // 0-100 (are expenses trending down)
}

export interface FinancialScore {
  totalScore: number;          // 0-100
  grade: FinancialGrade;
  breakdown: FinancialScoreBreakdown;
  /** Dynamically generated actionable tip */
  actionableTip: string;
  /** Icon key for the tip */
  tipIcon: 'savings' | 'budget' | 'consistency' | 'control' | 'celebrate';
  /** Color class for grade display */
  gradeColor: string;
}

// ── Ghost Expenses ────────────────────────────────────────────
export interface GhostExpense {
  id: string;
  category: string;
  description: string;       // normalized description
  amount: number;
  frequency: number;         // how many months it appeared
  totalDrained: number;      // amount * frequency
  lastSeen: string;          // ISO date
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  tag: 'SUBSCRIPTION' | 'RECURRING_BILL' | 'HABIT' | 'UNKNOWN';
}

export interface GhostExpenseResult {
  detected: GhostExpense[];
  totalMonthlyDrain: number;
  totalAnnualDrain: number;
  hasEnoughData: boolean;    // needs >= 1 month data
}

// ── Wealth Projection ─────────────────────────────────────────
export interface WealthProjection {
  months: number;            // projection horizon
  projectedNetWorth: number;
  projectedSavings: number;
  assumedSavingsRate: number;
  assumedMonthlyIncome: number;
  hasEnoughData: boolean;
}

// ── Lifestyle Inflation ───────────────────────────────────────
export interface LifestyleInflation {
  detected: boolean;
  hasEnoughData: boolean;
  averageMonthlyExpenseGrowth: number; // % per month
  highestInflationCategory: string;
  highestInflationPercent: number;
  byCategory: Array<{
    category: string;
    previousAvg: number;
    recentAvg: number;
    changePercent: number;
  }>;
}

// ── Aggregated Insight Result ─────────────────────────────────
export interface FinancialInsights {
  burnRate: BurnRate;
  emergencyFund: EmergencyFundResult;
  financialScore: FinancialScore;
  ghostExpenses: GhostExpenseResult;
  wealthProjection: WealthProjection;
  lifestyleInflation: LifestyleInflation;
  generatedAt: string;
}
