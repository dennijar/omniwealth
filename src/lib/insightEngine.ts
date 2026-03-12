// ============================================================
// OmniWealth – Financial Intelligence Engine
// Pure TypeScript utility — zero side effects, zero async
//
// Every function uses Decimal.js for financial-grade precision.
// Input: raw store data (transactions, budgets, fiat balances)
// Output: rich, derived financial metrics
// ============================================================

import Decimal from 'decimal.js';
import { format, subDays, parseISO } from 'date-fns';
import type { Transaction, MonthlyBudget } from '../types/fiat';
import type {
  BurnRate,
  EmergencyFundResult,
  EmergencyFundStatus,
  FinancialScore,
  FinancialGrade,
  FinancialScoreBreakdown,
  GhostExpenseResult,
  GhostExpense,
  WealthProjection,
  LifestyleInflation,
  FinancialInsights,
} from '../types/insights';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

// ── Internal helpers ──────────────────────────────────────────

function safeDiv(numerator: Decimal, denominator: Decimal): Decimal {
  if (denominator.isZero()) return new Decimal(0);
  return numerator.dividedBy(denominator);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toMonthYear(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'yyyy-MM');
  } catch {
    return format(new Date(dateStr), 'yyyy-MM');
  }
}

function parseDate(dateStr: string): Date {
  try {
    return parseISO(dateStr);
  } catch {
    return new Date(dateStr);
  }
}

// ── Normalize description for ghost expense matching ──────────
function normalizeDesc(desc: string | null | undefined): string {
  return (desc ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

// ═══════════════════════════════════════════════════════════════
// TASK 1-A: calculateBurnRate
// Analyzes last 90 days of EXPENSE transactions
// Returns daily/weekly/monthly averages + category breakdown
// ═══════════════════════════════════════════════════════════════
export function calculateBurnRate(transactions: Transaction[]): BurnRate {
  const now = new Date();
  const ninetyDaysAgo = subDays(now, 90);
  const thirtyDaysAgo = subDays(now, 30);
  const sixtyDaysAgo  = subDays(now, 60);

  // Filter: only EXPENSE transactions in the last 90 days
  const expenses90 = transactions.filter((tx) => {
    if (tx.type !== 'EXPENSE') return false;
    const d = parseDate(tx.date);
    return d >= ninetyDaysAgo && d <= now;
  });

  // Current 30 days vs previous 30 days for trend calculation
  const expensesRecent   = expenses90.filter((tx) => parseDate(tx.date) >= thirtyDaysAgo);
  const expensesPrevious = expenses90.filter((tx) => {
    const d = parseDate(tx.date);
    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  });

  // Total expense sum (Decimal)
  const totalExpense90 = expenses90.reduce(
    (sum, tx) => sum.plus(new Decimal(tx.amount)),
    new Decimal(0)
  );

  const recentTotal   = expensesRecent.reduce((s, tx) => s.plus(new Decimal(tx.amount)), new Decimal(0));
  const previousTotal = expensesPrevious.reduce((s, tx) => s.plus(new Decimal(tx.amount)), new Decimal(0));

  // Averages
  const dailyAvg   = safeDiv(totalExpense90, new Decimal(90));
  const weeklyAvg  = dailyAvg.times(7);
  const monthlyAvg = dailyAvg.times(30);

  // Trend
  let trend: BurnRate['trend'] = 'STABLE';
  let trendPercent = 0;
  if (!previousTotal.isZero()) {
    const delta = safeDiv(recentTotal.minus(previousTotal), previousTotal).times(100);
    trendPercent = delta.toDecimalPlaces(1).toNumber();
    if (delta.greaterThan(5))  trend = 'INCREASING';
    else if (delta.lessThan(-5)) trend = 'DECREASING';
    else trend = 'STABLE';
  }

  // Per-category breakdown
  const categoryMap: Record<string, Decimal> = {};
  for (const tx of expenses90) {
    const cat = tx.category || 'Uncategorized';
    categoryMap[cat] = (categoryMap[cat] ?? new Decimal(0)).plus(new Decimal(tx.amount));
  }

  const byCategory: Record<string, number> = {};
  for (const [cat, total] of Object.entries(categoryMap)) {
    // Monthly average per category
    byCategory[cat] = safeDiv(total, new Decimal(3)).toDecimalPlaces(0).toNumber();
  }

  return {
    dailyAvg:    dailyAvg.toDecimalPlaces(0).toNumber(),
    weeklyAvg:   weeklyAvg.toDecimalPlaces(0).toNumber(),
    monthlyAvg:  monthlyAvg.toDecimalPlaces(0).toNumber(),
    sampleCount: expenses90.length,
    analyzedFrom: format(ninetyDaysAgo, 'yyyy-MM-dd'),
    analyzedTo:   format(now, 'yyyy-MM-dd'),
    trend,
    trendPercent,
    byCategory,
  };
}

// ═══════════════════════════════════════════════════════════════
// TASK 1-B: calculateEmergencyFund
// Formula: totalFiatBalance / monthlyAvgExpense
// Returns runway in months + days, plus a status flag
// ═══════════════════════════════════════════════════════════════
export function calculateEmergencyFund(
  totalFiatBalance: number,
  monthlyAvgExpense: number
): EmergencyFundResult {
  const TARGET_MONTHS = 6;

  const balance = new Decimal(totalFiatBalance);
  const monthly = new Decimal(monthlyAvgExpense);

  // Runway in fractional months
  const runwayFractional = safeDiv(balance, monthly);

  // Convert to whole months + remaining days
  const runwayMonths = Math.floor(runwayFractional.toNumber());
  const fractionalMonth = runwayFractional.minus(new Decimal(runwayMonths));
  const runwayDays = fractionalMonth.times(30).toDecimalPlaces(0).toNumber();
  const exactRunwayDays = runwayFractional.times(30).toDecimalPlaces(0).toNumber();

  // Status logic
  let status: EmergencyFundStatus;
  if (runwayFractional.greaterThanOrEqualTo(9))      status = 'EXCELLENT';
  else if (runwayFractional.greaterThanOrEqualTo(6)) status = 'SAFE';
  else if (runwayFractional.greaterThanOrEqualTo(3)) status = 'WARNING';
  else                                                status = 'CRITICAL';

  // Coverage toward 6-month target
  const coveragePercent = clamp(
    safeDiv(runwayFractional, new Decimal(TARGET_MONTHS)).times(100).toNumber(),
    0, 100
  );

  // Shortfall to reach SAFE (6 months)
  const safeTarget = monthly.times(TARGET_MONTHS);
  const shortfall = safeTarget.greaterThan(balance)
    ? safeTarget.minus(balance).toDecimalPlaces(0).toNumber()
    : 0;

  // Human-readable display
  let displayRunway: string;
  if (monthly.isZero()) {
    displayRunway = '∞ (tidak ada pengeluaran tercatat)';
  } else if (runwayFractional.isZero()) {
    displayRunway = 'Kurang dari 1 hari';
  } else if (runwayMonths === 0) {
    displayRunway = `${runwayDays} hari`;
  } else if (runwayDays === 0) {
    displayRunway = `${runwayMonths} bulan`;
  } else {
    displayRunway = `${runwayMonths} bulan ${runwayDays} hari`;
  }

  return {
    totalFiatBalance:  balance.toNumber(),
    monthlyAvgExpense: monthly.toDecimalPlaces(0).toNumber(),
    runwayMonths,
    runwayDays,
    exactRunwayDays,
    status,
    targetMonths:    TARGET_MONTHS,
    coveragePercent,
    shortfallAmount: shortfall,
    displayRunway,
  };
}

// ═══════════════════════════════════════════════════════════════
// TASK 1-C: calculateFinancialScore
// Aggregates savings ratio + budget discipline + consistency
// Returns a composite score (0-100) and letter grade
// ═══════════════════════════════════════════════════════════════
export function calculateFinancialScore(
  transactions: Transaction[],
  budgets: MonthlyBudget[]
): FinancialScore {
  // ── Savings Ratio ────────────────────────────────────────────
  const totalIncome  = transactions
    .filter((tx) => tx.type === 'INCOME')
    .reduce((sum, tx) => sum.plus(new Decimal(tx.amount)), new Decimal(0));

  const totalExpense = transactions
    .filter((tx) => tx.type === 'EXPENSE')
    .reduce((sum, tx) => sum.plus(new Decimal(tx.amount)), new Decimal(0));

  const savingsRatioRaw = safeDiv(totalIncome.minus(totalExpense), totalIncome).times(100);
  const savingsRatioNum = savingsRatioRaw.toNumber();

  // Score: 0-100 mapped from ratio. Target >20% = 100pts
  const savingsScore = clamp(
    savingsRatioNum <= 0   ? 0
    : savingsRatioNum >= 30 ? 100
    : (savingsRatioNum / 30) * 100,
    0, 100
  );

  // ── Budget Discipline ─────────────────────────────────────────
  // % of budget categories that stayed under limit in all months
  let disciplineScore = 75; // default if no budgets set
  if (budgets.length > 0) {
    const monthGroups: Record<string, Map<string, Decimal>> = {};

    // Group transactions by monthYear → category → totalSpent
    for (const tx of transactions) {
      if (tx.type !== 'EXPENSE') continue;
      const my = toMonthYear(tx.date);
      if (!monthGroups[my]) monthGroups[my] = new Map();
      const current = monthGroups[my].get(tx.category) ?? new Decimal(0);
      monthGroups[my].set(tx.category, current.plus(new Decimal(tx.amount)));
    }

    let underLimitCount = 0;
    let totalBudgetChecks = 0;

    for (const budget of budgets) {
      const spentMap = monthGroups[budget.month_year];
      if (!spentMap) {
        // No transactions this month = perfect discipline
        underLimitCount++;
        totalBudgetChecks++;
        continue;
      }
      const spent = spentMap.get(budget.category) ?? new Decimal(0);
      const limit = new Decimal(budget.limit_amount);
      totalBudgetChecks++;
      if (!spent.greaterThan(limit)) underLimitCount++;
    }

    disciplineScore = totalBudgetChecks > 0
      ? clamp((underLimitCount / totalBudgetChecks) * 100, 0, 100)
      : 75;
  }

  // ── Transaction Consistency ───────────────────────────────────
  // How many of the last 3 months have at least 2 transactions?
  const now = new Date();
  let consistentMonths = 0;
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const my = format(d, 'yyyy-MM');
    const count = transactions.filter((tx) => toMonthYear(tx.date) === my).length;
    if (count >= 2) consistentMonths++;
  }
  const consistencyScore = clamp((consistentMonths / 3) * 100, 0, 100);

  // ── Expense Control ───────────────────────────────────────────
  // Is total expense < 80% of total income? (healthy spending)
  const spendRatio = safeDiv(totalExpense, totalIncome).toNumber();
  const expenseControlScore = clamp(
    spendRatio <= 0.5  ? 100
    : spendRatio <= 0.7  ? 85
    : spendRatio <= 0.8  ? 70
    : spendRatio <= 0.9  ? 45
    : spendRatio <= 1.0  ? 20
    : 0,
    0, 100
  );

  // ── Composite Score (Weighted) ────────────────────────────────
  const breakdown: FinancialScoreBreakdown = {
    savingsRatio:             new Decimal(savingsScore).toDecimalPlaces(1).toNumber(),
    budgetDiscipline:         new Decimal(disciplineScore).toDecimalPlaces(1).toNumber(),
    transactionConsistency:   new Decimal(consistencyScore).toDecimalPlaces(1).toNumber(),
    expenseControl:           new Decimal(expenseControlScore).toDecimalPlaces(1).toNumber(),
  };

  const totalScore = new Decimal(savingsScore).times(0.35)
    .plus(new Decimal(disciplineScore).times(0.30))
    .plus(new Decimal(consistencyScore).times(0.20))
    .plus(new Decimal(expenseControlScore).times(0.15))
    .toDecimalPlaces(0)
    .toNumber();

  // ── Grade Mapping ─────────────────────────────────────────────
  const grade: FinancialGrade =
    totalScore >= 95 ? 'A+' :
    totalScore >= 85 ? 'A'  :
    totalScore >= 75 ? 'B'  :
    totalScore >= 60 ? 'C'  :
    totalScore >= 45 ? 'D'  : 'F';

  const gradeColor =
    grade === 'A+' ? 'text-emerald-400' :
    grade === 'A'  ? 'text-emerald-500' :
    grade === 'B'  ? 'text-blue-400'    :
    grade === 'C'  ? 'text-amber-400'   :
    grade === 'D'  ? 'text-orange-500'  : 'text-rose-500';

  // ── Actionable Tip ────────────────────────────────────────────
  // Find the lowest-scoring dimension and give targeted advice
  const minKey = (['savingsRatio', 'budgetDiscipline', 'transactionConsistency', 'expenseControl'] as const)
    .reduce((a, b) => breakdown[a] < breakdown[b] ? a : b);

  const tipMap: Record<typeof minKey, { tip: string; icon: FinancialScore['tipIcon'] }> = {
    savingsRatio:           { tip: 'Tingkatkan rasio tabungan dengan memotong pengeluaran tidak prioritas. Target >20% dari penghasilan.', icon: 'savings' },
    budgetDiscipline:       { tip: 'Beberapa kategori melebihi batas budget. Coba metode 50/30/20 untuk kontrol lebih ketat.', icon: 'budget' },
    transactionConsistency: { tip: 'Catat transaksi setiap hari! Konsistensi pencatatan adalah kunci kesehatan finansial.', icon: 'consistency' },
    expenseControl:         { tip: 'Pengeluaranmu mendekati atau melebihi pemasukan. Identifikasi pengeluaran siluman segera!', icon: 'control' },
  };

  const { tip: actionableTip, icon: tipIcon } = totalScore >= 90
    ? { tip: 'Luar biasa! Pertahankan disiplin ini dan pertimbangkan untuk meningkatkan investasi.', icon: 'celebrate' as const }
    : tipMap[minKey];

  return {
    totalScore: clamp(totalScore, 0, 100),
    grade,
    breakdown,
    actionableTip,
    tipIcon,
    gradeColor,
  };
}

// ═══════════════════════════════════════════════════════════════
// TASK 1-D: detectGhostExpenses
// Groups EXPENSE transactions by amount + similar name
// across consecutive months to detect hidden recurring costs
// ═══════════════════════════════════════════════════════════════
export function detectGhostExpenses(transactions: Transaction[]): GhostExpenseResult {
  const expenses = transactions.filter((tx) => tx.type === 'EXPENSE');

  // Check if we have at least 1 month of data
  const uniqueMonths = new Set(expenses.map((tx) => toMonthYear(tx.date)));
  const hasEnoughData = uniqueMonths.size >= 1 && expenses.length >= 3;

  if (!hasEnoughData) {
    return {
      detected: [],
      totalMonthlyDrain: 0,
      totalAnnualDrain: 0,
      hasEnoughData: false,
    };
  }

  // Build fingerprint: key = normalized category + amount bucket (±5% tolerance)
  // Group by [category, normalizedDesc, amountBucket]
  type Fingerprint = {
    category: string;
    description: string;
    amount: Decimal;
    months: Set<string>;
    lastDate: string;
    transactionIds: string[];
  };

  const fingerprints = new Map<string, Fingerprint>();

  for (const tx of expenses) {
    const amount   = new Decimal(tx.amount);
    const category = tx.category || 'Uncategorized';
    const desc     = normalizeDesc(tx.description);
    const monthYear = toMonthYear(tx.date);

    // Amount bucket: round to nearest 5% tier so Rp 99.000 ≈ Rp 100.000 match
    // We use 1000-unit buckets for IDR amounts
    const bucket = amount.dividedBy(5000).floor().times(5000).toNumber();
    const key    = `${category}||${desc.slice(0, 20)}||${bucket}`;

    if (!fingerprints.has(key)) {
      fingerprints.set(key, {
        category,
        description: desc || category,
        amount,
        months: new Set(),
        lastDate: tx.date,
        transactionIds: [],
      });
    }

    const fp = fingerprints.get(key)!;
    fp.months.add(monthYear);
    fp.transactionIds.push(tx.id);
    // Keep latest date
    if (parseDate(tx.date) > parseDate(fp.lastDate)) {
      fp.lastDate = tx.date;
    }
  }

  // A ghost expense = appears in >= 2 months
  const detected: GhostExpense[] = [];

  for (const [, fp] of fingerprints) {
    if (fp.months.size < 2) continue;

    const frequency = fp.months.size;
    const totalDrained = fp.amount.times(frequency).toNumber();

    // Confidence: based on frequency and description specificity
    const confidence: GhostExpense['confidence'] =
      frequency >= 4 ? 'HIGH' :
      frequency >= 2 ? 'MEDIUM' : 'LOW';

    // Tag classification
    const descLower = fp.description.toLowerCase();
    const tag: GhostExpense['tag'] =
      ['netflix', 'spotify', 'subscription', 'prime', 'icloud', 'youtube', 'disney'].some(k => descLower.includes(k))
        ? 'SUBSCRIPTION'
      : ['pln', 'pdam', 'telkom', 'internet', 'listrik', 'air', 'gas'].some(k => descLower.includes(k))
        ? 'RECURRING_BILL'
      : fp.category === 'Dining' || fp.category === 'Groceries'
        ? 'HABIT'
      : 'UNKNOWN';

    detected.push({
      id:           `ghost-${fp.transactionIds[0]}`,
      category:     fp.category,
      description:  fp.description || fp.category,
      amount:       fp.amount.toDecimalPlaces(0).toNumber(),
      frequency,
      totalDrained,
      lastSeen:     fp.lastDate,
      confidence,
      tag,
    });
  }

  // Sort by total drained descending
  detected.sort((a, b) => b.totalDrained - a.totalDrained);

  const totalMonthlyDrain = detected.reduce(
    (sum, g) => new Decimal(sum).plus(g.amount).toNumber(), 0
  );

  return {
    detected,
    totalMonthlyDrain,
    totalAnnualDrain: new Decimal(totalMonthlyDrain).times(12).toNumber(),
    hasEnoughData: true,
  };
}

// ═══════════════════════════════════════════════════════════════
// BONUS: calculateWealthProjection
// Projects net worth growth over 6/12/24 months
// ═══════════════════════════════════════════════════════════════
export function calculateWealthProjection(
  currentNetWorth: number,
  monthlyIncome: number,
  monthlyExpense: number
): WealthProjection {
  const hasEnoughData = monthlyIncome > 0;

  if (!hasEnoughData) {
    return {
      months: 12,
      projectedNetWorth: currentNetWorth,
      projectedSavings: 0,
      assumedSavingsRate: 0,
      assumedMonthlyIncome: 0,
      hasEnoughData: false,
    };
  }

  const income  = new Decimal(monthlyIncome);
  const expense = new Decimal(monthlyExpense);
  const savings = income.minus(expense);
  const savingsRate = safeDiv(savings, income).times(100).toDecimalPlaces(1).toNumber();

  // Project 12 months with compound savings (no investment growth for conservative)
  const projectedSavings12 = savings.times(12);
  const projectedNetWorth  = new Decimal(currentNetWorth).plus(projectedSavings12);

  return {
    months:                12,
    projectedNetWorth:     projectedNetWorth.toDecimalPlaces(0).toNumber(),
    projectedSavings:      projectedSavings12.toDecimalPlaces(0).toNumber(),
    assumedSavingsRate:    savingsRate,
    assumedMonthlyIncome:  income.toNumber(),
    hasEnoughData:         true,
  };
}

// ═══════════════════════════════════════════════════════════════
// BONUS: detectLifestyleInflation
// Compares first half vs second half expense growth per category
// ═══════════════════════════════════════════════════════════════
export function detectLifestyleInflation(transactions: Transaction[]): LifestyleInflation {
  const expenses = transactions.filter((tx) => tx.type === 'EXPENSE');
  const uniqueMonths = [...new Set(expenses.map((tx) => toMonthYear(tx.date)))].sort();

  const hasEnoughData = uniqueMonths.length >= 2;
  if (!hasEnoughData) {
    return {
      detected: false, hasEnoughData: false,
      averageMonthlyExpenseGrowth: 0,
      highestInflationCategory: '',
      highestInflationPercent: 0,
      byCategory: [],
    };
  }

  // Split months into two halves
  const midpoint = Math.floor(uniqueMonths.length / 2);
  const firstHalf  = new Set(uniqueMonths.slice(0, midpoint));
  const secondHalf = new Set(uniqueMonths.slice(midpoint));

  // Group spending by category per half
  const firstHalfSpend:  Record<string, Decimal> = {};
  const secondHalfSpend: Record<string, Decimal> = {};

  for (const tx of expenses) {
    const my  = toMonthYear(tx.date);
    const cat = tx.category || 'Uncategorized';
    const amt = new Decimal(tx.amount);

    if (firstHalf.has(my)) {
      firstHalfSpend[cat]  = (firstHalfSpend[cat]  ?? new Decimal(0)).plus(amt);
    } else if (secondHalf.has(my)) {
      secondHalfSpend[cat] = (secondHalfSpend[cat] ?? new Decimal(0)).plus(amt);
    }
  }

  // Normalize to per-month averages
  const firstMonths  = firstHalf.size  || 1;
  const secondMonths = secondHalf.size || 1;

  const allCategories = new Set([
    ...Object.keys(firstHalfSpend),
    ...Object.keys(secondHalfSpend),
  ]);

  const byCategory: LifestyleInflation['byCategory'] = [];
  let totalInflation = new Decimal(0);
  let inflationCount = 0;

  for (const cat of allCategories) {
    const prevAvg   = safeDiv(firstHalfSpend[cat]  ?? new Decimal(0), new Decimal(firstMonths));
    const recentAvg = safeDiv(secondHalfSpend[cat] ?? new Decimal(0), new Decimal(secondMonths));

    if (prevAvg.isZero()) continue;

    const changePct = safeDiv(recentAvg.minus(prevAvg), prevAvg).times(100);

    byCategory.push({
      category:     cat,
      previousAvg:  prevAvg.toDecimalPlaces(0).toNumber(),
      recentAvg:    recentAvg.toDecimalPlaces(0).toNumber(),
      changePercent: changePct.toDecimalPlaces(1).toNumber(),
    });

    totalInflation = totalInflation.plus(changePct);
    inflationCount++;
  }

  byCategory.sort((a, b) => b.changePercent - a.changePercent);

  const avgGrowth = inflationCount > 0
    ? safeDiv(totalInflation, new Decimal(inflationCount)).toDecimalPlaces(1).toNumber()
    : 0;

  const topCategory = byCategory[0];

  return {
    detected:                      avgGrowth > 5,
    hasEnoughData:                 true,
    averageMonthlyExpenseGrowth:   avgGrowth,
    highestInflationCategory:      topCategory?.category ?? '',
    highestInflationPercent:       topCategory?.changePercent ?? 0,
    byCategory,
  };
}

// ═══════════════════════════════════════════════════════════════
// MASTER AGGREGATOR: runInsightEngine
// Single call that returns ALL insights in one object
// ═══════════════════════════════════════════════════════════════
export function runInsightEngine(params: {
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  totalFiatBalance: number;
  currentNetWorth: number;
  monthlyIncome: number;
  monthlyExpense: number;
}): FinancialInsights {
  const {
    transactions, budgets, totalFiatBalance,
    currentNetWorth, monthlyIncome, monthlyExpense,
  } = params;

  const burnRate         = calculateBurnRate(transactions);
  const emergencyFund    = calculateEmergencyFund(totalFiatBalance, burnRate.monthlyAvg);
  const financialScore   = calculateFinancialScore(transactions, budgets);
  const ghostExpenses    = detectGhostExpenses(transactions);
  const wealthProjection = calculateWealthProjection(currentNetWorth, monthlyIncome, monthlyExpense);
  const lifestyleInflation = detectLifestyleInflation(transactions);

  return {
    burnRate,
    emergencyFund,
    financialScore,
    ghostExpenses,
    wealthProjection,
    lifestyleInflation,
    generatedAt: new Date().toISOString(),
  };
}
