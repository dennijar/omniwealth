// ============================================================
// OmniWealth – InsightsDashboard.tsx
// Premium dark-mode Financial Intelligence & Insights UI
// bg-slate-950 base — mobile-first, fully animated
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  Brain, Trophy, Shield, Rocket, Flame, TrendingDown,
  TrendingUp, AlertTriangle, CheckCircle, ChevronDown,
  ChevronUp, RefreshCw, Ghost, Zap, Target, Star,
  ArrowUpRight, ArrowDownRight, Calendar, Sparkles,
  Clock, Info,
} from 'lucide-react';
import { useInsightStore }   from '../store/useInsightStore';
import { formatCompact } from '../utils/format';
import type {
  GhostExpense, EmergencyFundStatus,
} from '../types/insights';

// ── Sub-component helpers ─────────────────────────────────────

interface AnimatedBarProps {
  value: number;   // 0-100
  color: string;   // Tailwind gradient class
  delay?: number;
}

function AnimatedBar({ value, color, delay = 0 }: AnimatedBarProps) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(value, 100)), 150 + delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// Grade ring component
interface GradeRingProps {
  score: number;
  grade: string;
  gradeColor: string;
}

function GradeRing({ score, grade, gradeColor }: GradeRingProps) {
  const [animScore, setAnimScore] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimScore(score), 200);
    return () => clearTimeout(t);
  }, [score]);

  const RADIUS   = 52;
  const CIRC     = 2 * Math.PI * RADIUS;
  const progress = (animScore / 100) * CIRC;

  const ringColor =
    score >= 85 ? '#10B981' :
    score >= 75 ? '#3B82F6' :
    score >= 60 ? '#F59E0B' :
    score >= 45 ? '#F97316' : '#EF4444';

  return (
    <div className="relative flex items-center justify-center w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        {/* Track */}
        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        {/* Progress */}
        <circle
          cx="60" cy="60" r={RADIUS}
          fill="none"
          stroke={ringColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${CIRC}`}
          style={{ transition: 'stroke-dasharray 1s ease-out, stroke 0.5s ease' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-black leading-none ${gradeColor}`}>{grade}</span>
        <span className="text-xs text-white/30 font-mono mt-0.5">{score}/100</span>
      </div>
    </div>
  );
}

// Status badge for emergency fund
function StatusBadge({ status }: { status: EmergencyFundStatus }) {
  const config = {
    EXCELLENT: { label: 'Excellent',  cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    SAFE:      { label: 'Aman',       cls: 'bg-green-500/20 text-green-400 border-green-500/30'       },
    WARNING:   { label: 'Waspada',    cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30'       },
    CRITICAL:  { label: 'Kritis!',    cls: 'bg-rose-500/20 text-rose-400 border-rose-500/30'          },
  };
  const { label, cls } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cls}`}>
      {status === 'CRITICAL' && <AlertTriangle size={10} />}
      {status === 'WARNING'  && <AlertTriangle size={10} />}
      {status === 'SAFE'     && <CheckCircle size={10} />}
      {status === 'EXCELLENT'&& <Star size={10} />}
      {label}
    </span>
  );
}

// Ghost expense tag chip
function TagChip({ tag }: { tag: GhostExpense['tag'] }) {
  const map = {
    SUBSCRIPTION:   { label: 'Langganan', cls: 'bg-purple-500/15 text-purple-400' },
    RECURRING_BILL: { label: 'Tagihan',   cls: 'bg-blue-500/15 text-blue-400'     },
    HABIT:          { label: 'Kebiasaan', cls: 'bg-amber-500/15 text-amber-400'   },
    UNKNOWN:        { label: 'Rutin',     cls: 'bg-slate-500/25 text-slate-400'   },
  };
  const { label, cls } = map[tag];
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${cls}`}>{label}</span>;
}

// Expandable accordion section
interface AccordionProps {
  title: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Accordion({ title, icon, badge, badgeColor = 'text-white/40', children, defaultOpen = false }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-white/50">{icon}</span>
          <span className="text-sm font-semibold text-white/80">{title}</span>
          {badge && (
            <span className={`text-[11px] font-bold ${badgeColor}`}>{badge}</span>
          )}
        </div>
        <span className="text-white/30 flex-shrink-0">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      <div className={`transition-all duration-300 ${open ? 'block' : 'hidden'}`}>
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}

// ── Empty State placeholder ───────────────────────────────────
function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-white/20">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-white/40">{title}</p>
        <p className="text-xs text-white/20 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════
export function InsightsDashboard() {
  const computeInsights  = useInsightStore((s) => s.computeInsights);
  const isComputing      = useInsightStore((s) => s.isComputing);
  const insights         = useInsightStore((s) => s.insights);
  const getFinancialInsights = useInsightStore((s) => s.getFinancialInsights);

  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // ── Initial load & auto-refresh every 90s ────────────────────
  useEffect(() => {
    getFinancialInsights();
  }, []);

  const handleRefresh = useCallback(() => {
    computeInsights();
    setLastRefresh(new Date());
  }, [computeInsights]);

  // Render loading skeleton
  if (isComputing && !insights) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-6 flex flex-col gap-4">
        <div className="animate-pulse flex flex-col gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 rounded-3xl bg-white/[0.04]" />
          ))}
        </div>
      </div>
    );
  }

  // If no insights yet, trigger compute
  if (!insights) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Brain size={28} className="text-indigo-400" />
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-lg">Menganalisis Data...</p>
          <p className="text-white/40 text-sm mt-1">AI finansial sedang bekerja</p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white font-semibold text-sm transition-colors"
        >
          Mulai Analisis
        </button>
      </div>
    );
  }

  const { burnRate, emergencyFund, financialScore, ghostExpenses, wealthProjection, lifestyleInflation } = insights;
  const isEmergencyCritical = emergencyFund.status === 'CRITICAL';
  const isEmergencyWarning  = emergencyFund.status === 'WARNING';

  return (
    <div className="min-h-screen bg-slate-950 pb-24">

      {/* ══════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════ */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Brain size={13} className="text-white" />
              </div>
              <span className="text-[10px] font-bold text-violet-400 tracking-widest uppercase">Financial Intelligence</span>
            </div>
            <h1 className="text-xl font-black text-white leading-tight">
              Insight Keuangan
            </h1>
            <p className="text-xs text-white/30 mt-0.5">
              Kecerdasan finansial dari datamu
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isComputing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all text-[11px] font-medium"
          >
            <RefreshCw size={11} className={isComputing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Last update micro-info */}
        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-white/20">
          <Clock size={9} />
          <span>Dianalisis: {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="mx-1">·</span>
          <span>{insights.burnRate.sampleCount} transaksi dianalisis</span>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4">

        {/* ══════════════════════════════════════════════════════
            SECTION 1: FINANCIAL SCORE CARD (Hero)
        ══════════════════════════════════════════════════════ */}
        <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-br from-slate-900 to-slate-950 overflow-hidden p-5">
          {/* Ambient glow */}
          <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
            financialScore.grade === 'A+' || financialScore.grade === 'A' ? 'bg-emerald-500' :
            financialScore.grade === 'B'  ? 'bg-blue-500' :
            financialScore.grade === 'C'  ? 'bg-amber-500' : 'bg-rose-500'
          }`} />

          <div className="flex items-center gap-2 mb-4">
            <Trophy size={14} className="text-amber-400" />
            <span className="text-xs font-bold text-white/60 tracking-wide uppercase">Skor Finansial</span>
          </div>

          {/* Grade ring + score breakdown side by side */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Ring */}
            <div className="flex-shrink-0">
              <GradeRing
                score={financialScore.totalScore}
                grade={financialScore.grade}
                gradeColor={financialScore.gradeColor}
              />
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/25 mt-2">
                {financialScore.grade === 'A+' ? <><Trophy className="w-3 h-3 text-amber-400" /> Masterclass!</> :
                 financialScore.grade === 'A'  ? <><Star className="w-3 h-3 text-amber-400" /> Excellent!</> :
                 financialScore.grade === 'B'  ? <><CheckCircle className="w-3 h-3 text-blue-400" /> Bagus!</> :
                 financialScore.grade === 'C'  ? <><Zap className="w-3 h-3 text-amber-500" /> Cukup</> :
                 financialScore.grade === 'D'  ? <><AlertTriangle className="w-3 h-3 text-amber-500" /> Perlu Perbaikan</> : <><AlertTriangle className="w-3 h-3 text-rose-500" /> Butuh Perhatian</>}
              </div>
            </div>

            {/* Breakdown bars */}
            <div className="flex-1 w-full flex flex-col gap-3">
              {/* Savings Ratio */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-white/50 font-medium">Rasio Tabungan</span>
                  <span className="text-[11px] font-bold text-white/70">
                    {financialScore.breakdown.savingsRatio.toFixed(0)}/100
                  </span>
                </div>
                <AnimatedBar
                  value={financialScore.breakdown.savingsRatio}
                  color="bg-gradient-to-r from-emerald-600 to-emerald-400"
                  delay={0}
                />
              </div>
              {/* Budget Discipline */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-white/50 font-medium">Disiplin Budget</span>
                  <span className="text-[11px] font-bold text-white/70">
                    {financialScore.breakdown.budgetDiscipline.toFixed(0)}/100
                  </span>
                </div>
                <AnimatedBar
                  value={financialScore.breakdown.budgetDiscipline}
                  color="bg-gradient-to-r from-blue-600 to-blue-400"
                  delay={100}
                />
              </div>
              {/* Consistency */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-white/50 font-medium">Konsistensi Catat</span>
                  <span className="text-[11px] font-bold text-white/70">
                    {financialScore.breakdown.transactionConsistency.toFixed(0)}/100
                  </span>
                </div>
                <AnimatedBar
                  value={financialScore.breakdown.transactionConsistency}
                  color="bg-gradient-to-r from-violet-600 to-violet-400"
                  delay={200}
                />
              </div>
              {/* Expense Control */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-white/50 font-medium">Kontrol Pengeluaran</span>
                  <span className="text-[11px] font-bold text-white/70">
                    {financialScore.breakdown.expenseControl.toFixed(0)}/100
                  </span>
                </div>
                <AnimatedBar
                  value={financialScore.breakdown.expenseControl}
                  color="bg-gradient-to-r from-amber-600 to-amber-400"
                  delay={300}
                />
              </div>
            </div>
          </div>

          {/* Actionable Tip */}
          <div className="mt-5 flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
            <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              {financialScore.tipIcon === 'celebrate' && <Sparkles size={12} className="text-indigo-400" />}
              {financialScore.tipIcon === 'savings'   && <Target size={12} className="text-indigo-400" />}
              {financialScore.tipIcon === 'budget'    && <Shield size={12} className="text-indigo-400" />}
              {financialScore.tipIcon === 'consistency' && <Calendar size={12} className="text-indigo-400" />}
              {financialScore.tipIcon === 'control'   && <Zap size={12} className="text-indigo-400" />}
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-400 mb-0.5 uppercase tracking-wide">Saran AI</p>
              <p className="text-xs text-white/60 leading-relaxed">{financialScore.actionableTip}</p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            SECTION 2: COST OF LIVING — BIAYA HIDUP
        ══════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Flame size={13} className="text-orange-400" />
            <h2 className="text-xs font-bold text-white/50 uppercase tracking-widest">Biaya Hidup Rata-rata</h2>
            <span className="text-[10px] text-white/20 font-mono">(90 hari)</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Per Hari */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 flex flex-col gap-1.5">
              <span className="text-[10px] text-white/30 font-medium uppercase tracking-wide">Per Hari</span>
              <span className="text-base font-black text-white leading-tight">
                {formatCompact(burnRate.dailyAvg)}
              </span>
              <div className={`flex items-center gap-1 text-[10px] font-semibold ${
                burnRate.trend === 'INCREASING' ? 'text-rose-400' :
                burnRate.trend === 'DECREASING' ? 'text-emerald-400' : 'text-white/30'
              }`}>
                {burnRate.trend === 'INCREASING' && <ArrowUpRight size={10} />}
                {burnRate.trend === 'DECREASING' && <ArrowDownRight size={10} />}
                {burnRate.trendPercent > 0 ? '+' : ''}{burnRate.trendPercent.toFixed(1)}%
              </div>
            </div>

            {/* Per Minggu */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 flex flex-col gap-1.5">
              <span className="text-[10px] text-white/30 font-medium uppercase tracking-wide">Per Minggu</span>
              <span className="text-base font-black text-white leading-tight">
                {formatCompact(burnRate.weeklyAvg)}
              </span>
              <span className="text-[10px] text-white/20">~7 hari</span>
            </div>

            {/* Per Bulan */}
            <div className="rounded-2xl bg-orange-500/[0.07] border border-orange-500/20 p-4 flex flex-col gap-1.5">
              <span className="text-[10px] text-orange-400/70 font-medium uppercase tracking-wide">Per Bulan</span>
              <span className="text-base font-black text-orange-300 leading-tight">
                {formatCompact(burnRate.monthlyAvg)}
              </span>
              <span className="text-[10px] text-orange-400/30">rata-rata</span>
            </div>
          </div>

          {/* Trend indicator */}
          {burnRate.trend !== 'STABLE' && (
            <div className={`mt-2.5 flex items-center gap-2 p-3 rounded-xl text-xs ${
              burnRate.trend === 'INCREASING'
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>
              {burnRate.trend === 'INCREASING'
                ? <><TrendingUp size={12} /> Pengeluaran naik {Math.abs(burnRate.trendPercent).toFixed(1)}% vs bulan lalu</>
                : <><TrendingDown size={12} /> Pengeluaran turun {Math.abs(burnRate.trendPercent).toFixed(1)}% vs bulan lalu — bagus!</>
              }
            </div>
          )}

          {/* Category breakdown */}
          {Object.keys(burnRate.byCategory).length > 0 && (
            <div className="mt-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] p-3.5">
              <p className="text-[10px] text-white/25 font-bold uppercase tracking-widest mb-3">Breakdown Kategori</p>
              <div className="flex flex-col gap-2">
                {Object.entries(burnRate.byCategory)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([cat, avg]) => {
                    const maxVal = Math.max(...Object.values(burnRate.byCategory));
                    const pct = maxVal > 0 ? (avg / maxVal) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-white/50">{cat}</span>
                          <span className="text-[11px] font-bold text-white/60">{formatCompact(avg)}/bln</span>
                        </div>
                        <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500/50 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            SECTION 3: EMERGENCY FUND — DANA DARURAT
        ══════════════════════════════════════════════════════ */}
        <div className={`relative rounded-3xl border overflow-hidden p-5 ${
          isEmergencyCritical ? 'bg-rose-950/40 border-rose-500/25' :
          isEmergencyWarning  ? 'bg-amber-950/40 border-amber-500/25' :
          emergencyFund.status === 'SAFE' ? 'bg-emerald-950/30 border-emerald-500/20' :
          'bg-emerald-950/40 border-emerald-500/30'
        }`}>
          {/* Background pulse for critical */}
          {isEmergencyCritical && (
            <div className="absolute inset-0 bg-rose-500/5 animate-pulse rounded-3xl pointer-events-none" />
          )}

          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-2xl flex items-center justify-center ${
                isEmergencyCritical ? 'bg-rose-500/20' :
                isEmergencyWarning  ? 'bg-amber-500/20' : 'bg-emerald-500/20'
              }`}>
                <Shield size={14} className={
                  isEmergencyCritical ? 'text-rose-400' :
                  isEmergencyWarning  ? 'text-amber-400' : 'text-emerald-400'
                } />
              </div>
              <div>
                <p className="text-xs font-bold text-white/70">Dana Darurat</p>
                <p className="text-[10px] text-white/30">Emergency Fund</p>
              </div>
            </div>
            <StatusBadge status={emergencyFund.status} />
          </div>

          {/* Main runway display */}
          <div className="mb-4">
            <p className="text-[11px] text-white/30 mb-1">Dana daruratmu cukup untuk:</p>
            <p className={`text-2xl font-black leading-tight ${
              isEmergencyCritical ? 'text-rose-300' :
              isEmergencyWarning  ? 'text-amber-300' : 'text-emerald-300'
            }`}>
              {emergencyFund.displayRunway}
            </p>
          </div>

          {/* Progress toward 6-month target */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/30">Progres menuju 6 bulan</span>
              <span className={`text-[11px] font-bold ${
                isEmergencyCritical ? 'text-rose-400' :
                isEmergencyWarning  ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {emergencyFund.coveragePercent.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isEmergencyCritical ? 'bg-rose-500' :
                  isEmergencyWarning  ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${emergencyFund.coveragePercent}%` }}
              />
            </div>
            {/* Month markers */}
            <div className="flex justify-between mt-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((m) => (
                <span key={m} className={`text-[8px] font-mono ${
                  m <= emergencyFund.runwayMonths ? 'text-white/40' : 'text-white/15'
                }`}>{m}bl</span>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
              <p className="text-[10px] text-white/25 mb-1">Saldo Fiat Total</p>
              <p className="text-sm font-black text-white">{formatCompact(emergencyFund.totalFiatBalance)}</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
              <p className="text-[10px] text-white/25 mb-1">Pengeluaran/Bulan</p>
              <p className="text-sm font-black text-white">{formatCompact(emergencyFund.monthlyAvgExpense)}</p>
            </div>
          </div>

          {/* Shortfall warning */}
          {emergencyFund.shortfallAmount > 0 && (
            <div className={`mt-3 flex items-center gap-2 p-3 rounded-xl text-xs ${
              isEmergencyCritical
                ? 'bg-rose-500/15 text-rose-300'
                : 'bg-amber-500/15 text-amber-300'
            }`}>
              <AlertTriangle size={12} className="flex-shrink-0" />
              <span>Tambahkan <strong>{formatCompact(emergencyFund.shortfallAmount)}</strong> lagi untuk mencapai target 6 bulan</span>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            SECTION 4: GHOST EXPENSES — PENGELUARAN SILUMAN
        ══════════════════════════════════════════════════════ */}
        <Accordion
          title="Pengeluaran Siluman"
          icon={<Ghost size={14} />}
          badge={ghostExpenses.detected.length > 0
            ? `${ghostExpenses.detected.length} terdeteksi`
            : undefined}
          badgeColor="text-rose-400"
          defaultOpen={ghostExpenses.detected.length > 0}
        >
          {!ghostExpenses.hasEnoughData ? (
            <EmptyState
              icon={<Ghost size={20} />}
              title="Butuh lebih banyak data"
              desc="Catat minimal 3 transaksi untuk mendeteksi pengeluaran berulang"
            />
          ) : ghostExpenses.detected.length === 0 ? (
            <EmptyState
              icon={<CheckCircle size={20} />}
              title="Tidak ada pengeluaran siluman"
              desc="Bagus! Tidak terdeteksi biaya berulang yang tidak terduga"
            />
          ) : (
            <div className="flex flex-col gap-2">
              {/* Monthly drain summary */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 mb-1">
                <span className="text-xs text-rose-300 font-semibold">Total drain per bulan</span>
                <span className="text-sm font-black text-rose-400">{formatCompact(ghostExpenses.totalMonthlyDrain)}</span>
              </div>

              {ghostExpenses.detected.map((ghost) => (
                <div key={ghost.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold text-white/80 truncate">{ghost.description || ghost.category}</span>
                      <TagChip tag={ghost.tag} />
                      {ghost.confidence === 'HIGH' && (
                        <span className="text-[9px] font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded">HIGH</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-white/30">
                      <span>{ghost.category}</span>
                      <span>·</span>
                      <span>Muncul {ghost.frequency}× bulan</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-white">{formatCompact(ghost.amount)}</p>
                    <p className="text-[10px] text-rose-400/70">Rp {(ghost.amount * 12 / 1_000_000).toFixed(1)}Jt/thn</p>
                  </div>
                </div>
              ))}

              {/* Annual cost awareness */}
              <div className="mt-1 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
                <p className="text-[10px] text-white/25">Total biaya siluman tahunan</p>
                <p className="text-base font-black text-rose-400">{formatCompact(ghostExpenses.totalAnnualDrain)}</p>
              </div>
            </div>
          )}
        </Accordion>

        {/* ══════════════════════════════════════════════════════
            SECTION 5: WEALTH PROJECTION — PROYEKSI KEKAYAAN
        ══════════════════════════════════════════════════════ */}
        <Accordion
          title="Proyeksi Kekayaan 12 Bulan"
          icon={<Rocket size={14} />}
          badge={wealthProjection.hasEnoughData ? '+12 bln' : undefined}
          badgeColor="text-indigo-400"
          defaultOpen={false}
        >
          {!wealthProjection.hasEnoughData ? (
            <EmptyState
              icon={<Rocket size={20} />}
              title="Butuh minimal 1 bulan data"
              desc="Catat pemasukan & pengeluaran untuk melihat proyeksi kekayaanmu"
            />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3">
                  <p className="text-[10px] text-indigo-300/50 mb-1">Proyeksi Net Worth</p>
                  <p className="text-base font-black text-indigo-300">{formatCompact(wealthProjection.projectedNetWorth)}</p>
                </div>
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <p className="text-[10px] text-emerald-300/50 mb-1">Total Tabungan Baru</p>
                  <p className="text-base font-black text-emerald-300">{formatCompact(wealthProjection.projectedSavings)}</p>
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 flex flex-col gap-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Asumsi rasio tabungan</span>
                  <span className="font-bold text-white/70">{wealthProjection.assumedSavingsRate.toFixed(1)}% / bulan</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Asumsi pemasukan</span>
                  <span className="font-bold text-white/70">{formatCompact(wealthProjection.assumedMonthlyIncome)}/bln</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Horizon</span>
                  <span className="font-bold text-white/70">12 bulan ke depan</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <Info size={11} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-indigo-300/60 leading-relaxed">
                  Proyeksi konservatif berdasarkan rata-rata tabungan saat ini. Tidak termasuk return investasi.
                </p>
              </div>
            </div>
          )}
        </Accordion>

        {/* ══════════════════════════════════════════════════════
            SECTION 6: LIFESTYLE INFLATION — INFLASI GAYA HIDUP
        ══════════════════════════════════════════════════════ */}
        <Accordion
          title="Inflasi Gaya Hidup"
          icon={<TrendingUp size={14} />}
          badge={lifestyleInflation.detected ? 'Terdeteksi' : undefined}
          badgeColor="text-amber-400"
          defaultOpen={false}
        >
          {!lifestyleInflation.hasEnoughData ? (
            <EmptyState
              icon={<TrendingUp size={20} />}
              title="Butuh minimal 2 bulan data"
              desc="Terus catat transaksi untuk analisis tren pengeluaranmu"
            />
          ) : !lifestyleInflation.detected ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-emerald-300">Gaya hidup stabil — tidak ada inflasi signifikan terdeteksi</span>
              </div>
              {lifestyleInflation.byCategory.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {lifestyleInflation.byCategory.slice(0, 4).map((item) => (
                    <div key={item.category} className="flex items-center justify-between text-xs">
                      <span className="text-white/40">{item.category}</span>
                      <span className={`font-bold ${item.changePercent > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {item.changePercent > 0 ? '+' : ''}{item.changePercent.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Inflation alert */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={13} className="text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">Inflasi Gaya Hidup Terdeteksi</span>
                </div>
                <p className="text-[11px] text-amber-300/60 leading-relaxed">
                  Pengeluaran rata-rata naik <strong className="text-amber-300">{lifestyleInflation.averageMonthlyExpenseGrowth.toFixed(1)}%</strong> per bulan.
                  Kategori tertinggi: <strong className="text-amber-300">{lifestyleInflation.highestInflationCategory}</strong>
                  {' '}(<span className="text-amber-300">+{lifestyleInflation.highestInflationPercent.toFixed(1)}%</span>)
                </p>
              </div>

              {/* Category breakdown */}
              <div className="flex flex-col gap-1.5">
                {lifestyleInflation.byCategory.slice(0, 5).map((item) => (
                  <div key={item.category} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-white/50 font-medium">{item.category}</span>
                        <span className={`text-[11px] font-bold ${item.changePercent > 10 ? 'text-rose-400' : item.changePercent > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {item.changePercent > 0 ? '+' : ''}{item.changePercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-white/20">
                        <span>{formatCompact(item.previousAvg)}</span>
                        <span>→</span>
                        <span className="text-white/40">{formatCompact(item.recentAvg)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Accordion>

        {/* ══════════════════════════════════════════════════════
            FOOTER DISCLAIMER
        ══════════════════════════════════════════════════════ */}
        <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] mt-1">
          <Info size={11} className="text-white/20 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-white/20 leading-relaxed">
            Insight dihasilkan dari data transaksi lokalmu. Semua analisis bersifat informatif dan bukan saran investasi profesional.
          </p>
        </div>

      </div>
    </div>
  );
}
