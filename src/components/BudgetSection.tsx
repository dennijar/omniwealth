// ============================================================
// OmniWealth – BudgetSection Component
// Monthly budget progress bars per category
// ============================================================

import React, { useState } from 'react';
import { Plus, Target, Flame, CheckCircle } from 'lucide-react';
import { useFiatStore } from '../store/useFiatStore';
import { formatCompact, formatMonthYear } from '../utils/format';
import { TRANSACTION_CATEGORIES } from '../store/useFiatStore';

interface BudgetSectionProps {
  monthYear: string;
}

export const BudgetSection: React.FC<BudgetSectionProps> = ({ monthYear }) => {
  const getBudgetProgress = useFiatStore((s) => s.getBudgetProgress);
  const upsertBudget = useFiatStore((s) => s.upsertBudget);
  const removeBudget = useFiatStore((s) => s.removeBudget);
  const budgets = useFiatStore((s) => s.budgets);

  const [showAdd, setShowAdd] = useState(false);
  const [newCategory, setNewCategory] = useState(TRANSACTION_CATEGORIES.EXPENSE[0]);
  const [newLimit, setNewLimit] = useState('');

  const progress = getBudgetProgress(monthYear);
  const currentBudgets = budgets.filter((b) => b.month_year === monthYear);

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory || !newLimit) return;
    upsertBudget({ month_year: monthYear, category: newCategory, limit_amount: parseFloat(newLimit) });
    setNewLimit('');
    setShowAdd(false);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <Target size={16} className="text-indigo-400" />
            Monthly Budget
          </h3>
          <p className="text-white/40 text-xs mt-0.5">{formatMonthYear(monthYear)}</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-400 text-xs font-medium transition-all"
        >
          <Plus size={13} /> Add Budget
        </button>
      </div>

      {/* Add Budget Form */}
      {showAdd && (
        <form onSubmit={handleAddBudget} className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/40 text-xs mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 appearance-none"
              >
                {TRANSACTION_CATEGORIES.EXPENSE.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#0F1729]">{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/40 text-xs mb-1">Budget Limit (IDR)</label>
              <input
                type="number"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                placeholder="1000000"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/30"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-all">
              Set Budget
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg text-sm transition-all">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Budget Progress List */}
      <div className="space-y-3">
        {progress.length === 0 && (
          <div className="text-center py-8">
            <p className="text-white/30 text-sm">No budgets set for this month.</p>
            <p className="text-white/20 text-xs mt-1">Click "Add Budget" to get started.</p>
          </div>
        )}
        {progress.map((item) => {
          const budgetRecord = currentBudgets.find((b) => b.category === item.category);
          return (
            <div key={item.category} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {item.isOverBudget ? (
                    <Flame size={13} className="text-red-400" />
                  ) : item.percentage >= 80 ? (
                    <Flame size={13} className="text-amber-400" />
                  ) : (
                    <CheckCircle size={13} className="text-emerald-400" />
                  )}
                  <span className="text-white/80 text-sm font-medium">{item.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={`text-sm font-semibold ${item.isOverBudget ? 'text-red-400' : 'text-white/80'}`}>
                      {formatCompact(item.spent)}
                    </span>
                    <span className="text-white/30 text-xs"> / {formatCompact(item.limit)}</span>
                  </div>
                  {budgetRecord && (
                    <button
                      onClick={() => removeBudget(budgetRecord.id)}
                      className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 text-xs transition-all"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${item.isOverBudget
                    ? 'bg-red-500'
                    : item.percentage >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                    }`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>

              <div className="flex justify-between mt-1">
                <span className={`text-xs ${item.isOverBudget ? 'text-red-400' : 'text-white/30'}`}>
                  {item.isOverBudget ? `Over by ${formatCompact(Math.abs(item.remaining))}` : `${formatCompact(item.remaining)} left`}
                </span>
                <span className={`text-xs font-medium ${item.isOverBudget ? 'text-red-400' : item.percentage >= 80 ? 'text-amber-400' : 'text-white/40'}`}>
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
