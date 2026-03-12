// ============================================================
// OmniWealth – FiatDashboard (Main Component)
// Full-featured Bank, Transaction, and Budget Dashboard
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Plus, TrendingUp, TrendingDown, Wallet, ArrowUpRight,
  ArrowDownLeft, ArrowLeftRight, ChevronLeft, ChevronRight,
  BarChart3, Activity, RefreshCw
} from 'lucide-react';
import { useFiatStore } from '../store/useFiatStore';
import { BankCard } from './BankCard';
import { TransactionModal } from './TransactionModal';
import { AddBankModal } from './AddBankModal';
import { BudgetSection } from './BudgetSection';
import { formatIDR, formatCompact, formatDate, formatMonthYear, getCurrentMonthYear } from '../utils/format';
import { format, subMonths, addMonths } from 'date-fns';

export const FiatDashboard: React.FC = () => {
  const bankAccounts = useFiatStore((s) => s.bankAccounts);
  const getTotalFiatBalance = useFiatStore((s) => s.getTotalFiatBalance);
  const getRecentTransactions = useFiatStore((s) => s.getRecentTransactions);
  const getMonthSummary = useFiatStore((s) => s.getMonthSummary);
  const removeTransaction = useFiatStore((s) => s.removeTransaction);

  const [showTxModal, setShowTxModal] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  // Wire global FAB → open transaction modal
  useEffect(() => {
    const openTx   = () => setShowTxModal(true);
    const openBank = () => setShowAddBank(true);
    window.addEventListener('ow:open-tx-modal',   openTx);
    window.addEventListener('ow:open-bank-modal', openBank);
    return () => {
      window.removeEventListener('ow:open-tx-modal',   openTx);
      window.removeEventListener('ow:open-bank-modal', openBank);
    };
  }, []);


  const totalBalance = getTotalFiatBalance();
  const recentTx = getRecentTransactions(8);
  const summary = getMonthSummary(selectedMonth);

  const prevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = subMonths(new Date(y, m - 1, 1), 1);
    setSelectedMonth(format(d, 'yyyy-MM'));
  };
  const nextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = addMonths(new Date(y, m - 1, 1), 1);
    const curr = getCurrentMonthYear();
    if (format(d, 'yyyy-MM') <= curr) setSelectedMonth(format(d, 'yyyy-MM'));
  };

  const incomePercent = summary.totalIncome > 0
    ? Math.min((summary.totalIncome / (summary.totalIncome + summary.totalExpense)) * 100, 100)
    : 0;
  const expensePercent = summary.totalIncome > 0
    ? Math.min((summary.totalExpense / summary.totalIncome) * 100, 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#060D1F] text-white">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Hero: Total Balance ─────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/60 via-purple-900/40 to-[#0F1729] border border-white/10 p-6 sm:p-8">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

          <div className="relative">
            <p className="text-white/50 text-sm font-medium flex items-center gap-2">
              <Activity size={14} className="text-indigo-400" /> Total Fiat Balance
            </p>
            <div className="flex items-end gap-4 mt-2 mb-6">
              <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {formatCompact(totalBalance)}
              </h2>
              <span className="text-white/30 text-sm mb-1 font-mono">{formatIDR(totalBalance)}</span>
            </div>

            {/* Month Nav + Summary Pills */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                <button onClick={prevMonth} className="text-white/50 hover:text-white transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-white/80 text-sm font-medium min-w-[120px] text-center">
                  {formatMonthYear(selectedMonth)}
                </span>
                <button onClick={nextMonth} className="text-white/50 hover:text-white transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                <TrendingUp size={14} className="text-emerald-400" />
                <span className="text-emerald-400 text-sm font-semibold">{formatCompact(summary.totalIncome)}</span>
              </div>
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                <TrendingDown size={14} className="text-red-400" />
                <span className="text-red-400 text-sm font-semibold">{formatCompact(summary.totalExpense)}</span>
              </div>
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${
                summary.netFlow >= 0
                  ? 'bg-indigo-500/10 border-indigo-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <BarChart3 size={14} className={summary.netFlow >= 0 ? 'text-indigo-400' : 'text-red-400'} />
                <span className={`text-sm font-semibold ${summary.netFlow >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>
                  Net {summary.netFlow >= 0 ? '+' : ''}{formatCompact(summary.netFlow)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Monthly Flow Visual ─────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <BarChart3 size={15} className="text-indigo-400" />
            Cash Flow — {formatMonthYear(selectedMonth)}
          </h3>
          <div className="space-y-3">
            {/* Income bar */}
            <div>
              <div className="flex justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <ArrowUpRight size={14} className="text-emerald-400" />
                  <span className="text-white/70 text-sm">Total Income</span>
                </div>
                <span className="text-emerald-400 font-bold text-sm">{formatIDR(summary.totalIncome)}</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${incomePercent}%` }}
                />
              </div>
            </div>
            {/* Expense bar */}
            <div>
              <div className="flex justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft size={14} className="text-red-400" />
                  <span className="text-white/70 text-sm">Total Expenses</span>
                </div>
                <span className="text-red-400 font-bold text-sm">{formatIDR(summary.totalExpense)}</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-700 to-red-400 rounded-full transition-all duration-700"
                  style={{ width: `${expensePercent}%` }}
                />
              </div>
            </div>
            {/* Savings rate */}
            {summary.totalIncome > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                <span className="text-white/40 text-xs">Savings Rate</span>
                <span className={`text-sm font-bold ${summary.netFlow >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>
                  {((summary.netFlow / summary.totalIncome) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Bank Accounts Row ───────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-base">Bank Accounts</h3>
            <span className="text-white/40 text-xs">{bankAccounts.length} account{bankAccounts.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {bankAccounts.map((acc) => (
              <div key={acc.id} className="snap-start">
                <BankCard
                  account={acc}
                  isSelected={selectedBankId === acc.id}
                  onClick={() => setSelectedBankId(selectedBankId === acc.id ? null : acc.id)}
                />
              </div>
            ))}
            {/* Add Bank CTA */}
            <button
              onClick={() => setShowAddBank(true)}
              className="flex-shrink-0 w-64 h-full min-h-[148px] rounded-2xl border-2 border-dashed border-white/15 hover:border-indigo-500/50 hover:bg-indigo-500/5 flex flex-col items-center justify-center gap-2 transition-all group snap-start"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 group-hover:bg-indigo-500/20 flex items-center justify-center transition-all">
                <Plus size={20} className="text-white/30 group-hover:text-indigo-400 transition-colors" />
              </div>
              <span className="text-white/30 group-hover:text-white/60 text-sm font-medium transition-colors">Add Bank Account</span>
            </button>
          </div>
        </div>

        {/* ── Main Content Grid ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Transactions Table */}
          <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h3 className="text-white font-bold text-base">Recent Transactions</h3>
              <button
                onClick={() => setShowTxModal(true)}
                className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors"
              >
                <Plus size={13} /> New
              </button>
            </div>

            <div className="divide-y divide-white/5">
              {recentTx.length === 0 && (
                <div className="text-center py-12">
                  <RefreshCw size={24} className="text-white/20 mx-auto mb-2" />
                  <p className="text-white/30 text-sm">No transactions yet.</p>
                </div>
              )}
              {recentTx.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/3 transition-colors group">
                  {/* Type Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    tx.type === 'INCOME' ? 'bg-emerald-500/15' : tx.type === 'EXPENSE' ? 'bg-red-500/15' : 'bg-blue-500/15'
                  }`}>
                    {tx.type === 'INCOME'
                      ? <ArrowUpRight size={16} className="text-emerald-400" />
                      : tx.type === 'EXPENSE'
                      ? <ArrowDownLeft size={16} className="text-red-400" />
                      : <ArrowLeftRight size={16} className="text-blue-400" />
                    }
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white/90 text-sm font-medium truncate">{tx.category}</p>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-md font-medium flex-shrink-0"
                        style={{ backgroundColor: tx.bankColor + '33', color: tx.bankColor }}
                      >
                        {tx.bankName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-white/30 text-xs">{formatDate(tx.date)}</p>
                      {tx.description && (
                        <p className="text-white/20 text-xs truncate">· {tx.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Amount + Delete */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`font-bold text-sm ${
                      tx.type === 'INCOME' ? 'text-emerald-400' : tx.type === 'EXPENSE' ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : '⇄'}
                      {formatCompact(parseFloat(tx.amount))}
                    </span>
                    <button
                      onClick={() => removeTransaction(tx.id)}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-all"
                    >
                      <span className="text-red-400 text-xs">✕</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Budget */}
          <div className="lg:col-span-2">
            <BudgetSection monthYear={selectedMonth} />
          </div>
        </div>

        {/* ── Quick Stats Row ─────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Accounts',
              value: bankAccounts.length.toString(),
              sub: 'Active',
              icon: <Wallet size={16} className="text-indigo-400" />,
              color: 'text-indigo-400',
              bg: 'bg-indigo-500/10 border-indigo-500/20',
            },
            {
              label: 'Transactions',
              value: recentTx.length.toString() + '+',
              sub: 'Recorded',
              icon: <Activity size={16} className="text-purple-400" />,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10 border-purple-500/20',
            },
            {
              label: 'Savings',
              value: formatCompact(summary.netFlow),
              sub: formatMonthYear(selectedMonth),
              icon: <TrendingUp size={16} className="text-emerald-400" />,
              color: summary.netFlow >= 0 ? 'text-emerald-400' : 'text-red-400',
              bg: summary.netFlow >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20',
            },
            {
              label: 'Avg. Daily Expense',
              value: formatCompact(summary.totalExpense / new Date().getDate()),
              sub: 'This Month',
              icon: <BarChart3 size={16} className="text-amber-400" />,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 border-amber-500/20',
            },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl border p-4 ${stat.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/40 text-xs">{stat.label}</p>
                {stat.icon}
              </div>
              <p className={`font-black text-lg leading-none ${stat.color}`}>{stat.value}</p>
              <p className="text-white/30 text-xs mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Floating Action Button ──────────────────────────── */}
      <button
        onClick={() => setShowTxModal(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 transition-all hover:scale-110 active:scale-95 z-30"
      >
        <Plus size={24} className="text-white" />
      </button>

      {/* ── Modals ─────────────────────────────────────────── */}
      {showTxModal && <TransactionModal onClose={() => setShowTxModal(false)} />}
      {showAddBank && <AddBankModal onClose={() => setShowAddBank(false)} />}
    </div>
  );
};
