// ============================================================
// OmniWealth – useFiatStore (Zustand + persist middleware)
// Acts as the client-side mini-ledger with zero-latency UI
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Decimal from 'decimal.js';
import { format } from 'date-fns';
import {
  BankAccount,
  Transaction,
  MonthlyBudget,
  CreateBankAccountPayload,
  CreateTransactionPayload,
  CreateBudgetPayload,
  BudgetProgress,
  MonthSummary,
  TransactionType,
} from '../types/fiat';

// ── Precision config ──────────────────────────────────────────
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

// ── Helpers ──────────────────────────────────────────────────
function uuid(): string {
  return crypto.randomUUID();
}

const BANK_COLORS: string[] = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#06B6D4', '#EC4899', '#84CC16',
];

const BANK_ICONS: Record<string, string> = {
  BCA: 'B', Mandiri: 'M', BNI: 'N', BRI: 'R',
  CIMB: 'C', Jenius: 'J', GoPay: 'G', OVO: 'O',
  Cash: '💵', Other: '🏦',
};

// No seed data — app starts with a clean slate.
// Initial data is created by the OnboardingWizard.

// ── Store Interface ───────────────────────────────────────────
interface FiatState {
  bankAccounts: BankAccount[];
  transactions: Transaction[];
  budgets: MonthlyBudget[];

  // ── Mutations ──
  addBankAccount: (payload: CreateBankAccountPayload) => BankAccount;
  removeBankAccount: (id: string) => void;
  addTransaction: (payload: CreateTransactionPayload) => { success: boolean; warning?: string; transaction?: Transaction };
  removeTransaction: (id: string) => void;
  upsertBudget: (payload: CreateBudgetPayload) => MonthlyBudget;
  removeBudget: (id: string) => void;

  // ── Selectors ──
  getTotalFiatBalance: () => number;
  getBalanceByBank: (bankId: string) => number;
  getBudgetProgress: (monthYear: string, category?: string) => BudgetProgress[];
  getMonthSummary: (monthYear: string) => MonthSummary;
  getRecentTransactions: (limit?: number) => (Transaction & { bankName: string; bankColor: string })[];
  getTransactionsByMonth: (monthYear: string) => Transaction[];
}

// ── Store Implementation ──────────────────────────────────────
export const useFiatStore = create<FiatState>()(
  persist(
    (set, get) => ({
      bankAccounts: [],
      transactions: [],
      budgets: [],

      // ── addBankAccount ──────────────────────────────────────
      addBankAccount: (payload) => {
        const colorIndex = get().bankAccounts.length % BANK_COLORS.length;
        const newAccount: BankAccount = {
          id: uuid(),
          bank_name: payload.bank_name,
          account_number: payload.account_number ?? null,
          initial_balance: new Decimal(payload.initial_balance).toFixed(2),
          currency: payload.currency,
          color: payload.color || BANK_COLORS[colorIndex],
          icon: payload.icon || BANK_ICONS[payload.bank_name] || '🏦',
          created_at: new Date().toISOString(),
        };
        set((state) => ({ bankAccounts: [...state.bankAccounts, newAccount] }));
        return newAccount;
      },

      // ── removeBankAccount ───────────────────────────────────
      removeBankAccount: (id) => {
        set((state) => ({
          bankAccounts: state.bankAccounts.filter((a) => a.id !== id),
          transactions: state.transactions.filter((t) => t.bank_account_id !== id),
        }));
      },

      // ── addTransaction (ACID-like client ledger) ────────────
      addTransaction: (payload) => {
        const { bankAccounts, getBalanceByBank } = get();
        const account = bankAccounts.find((a) => a.id === payload.bank_account_id);
        if (!account) return { success: false, warning: 'Bank account not found.' };

        const amountDecimal = new Decimal(payload.amount);

        // Insufficient funds guard (EXPENSE / TRANSFER)
        if (payload.type === 'EXPENSE' || payload.type === 'TRANSFER') {
          const currentBalance = new Decimal(getBalanceByBank(payload.bank_account_id));
          if (amountDecimal.greaterThan(currentBalance)) {
            return {
              success: false,
              warning: `Insufficient funds. Current balance: Rp ${currentBalance.toNumber().toLocaleString('id-ID')}`,
            };
          }
        }

        const newTx: Transaction = {
          id: uuid(),
          bank_account_id: payload.bank_account_id,
          type: payload.type,
          category: payload.category,
          amount: amountDecimal.toFixed(2),
          date: payload.date || new Date().toISOString(),
          description: payload.description ?? null,
          transfer_to_account_id: payload.transfer_to_account_id ?? null,
        };

        // For TRANSFER: create mirror credit on destination account
        const updates: Transaction[] = [newTx];
        if (payload.type === 'TRANSFER' && payload.transfer_to_account_id) {
          const creditTx: Transaction = {
            id: uuid(),
            bank_account_id: payload.transfer_to_account_id,
            type: 'INCOME',
            category: 'Transfer In',
            amount: amountDecimal.toFixed(2),
            date: payload.date || new Date().toISOString(),
            description: `Transfer from ${account.bank_name}`,
          };
          updates.push(creditTx);
        }

        set((state) => ({ transactions: [...state.transactions, ...updates] }));
        return { success: true, transaction: newTx };
      },

      // ── removeTransaction ───────────────────────────────────
      removeTransaction: (id) => {
        set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
      },

      // ── upsertBudget ────────────────────────────────────────
      upsertBudget: (payload) => {
        const existing = get().budgets.find(
          (b) => b.month_year === payload.month_year && b.category === payload.category
        );
        if (existing) {
          const updated: MonthlyBudget = {
            ...existing,
            limit_amount: new Decimal(payload.limit_amount).toFixed(2),
          };
          set((state) => ({
            budgets: state.budgets.map((b) => (b.id === existing.id ? updated : b)),
          }));
          return updated;
        }
        const newBudget: MonthlyBudget = {
          id: uuid(),
          month_year: payload.month_year,
          category: payload.category,
          limit_amount: new Decimal(payload.limit_amount).toFixed(2),
        };
        set((state) => ({ budgets: [...state.budgets, newBudget] }));
        return newBudget;
      },

      // ── removeBudget ────────────────────────────────────────
      removeBudget: (id) => {
        set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }));
      },

      // ══ SELECTORS ══════════════════════════════════════════

      // Sum of all accounts' computed balances
      getTotalFiatBalance: () => {
        const { bankAccounts, getBalanceByBank } = get();
        return bankAccounts.reduce((sum, acc) => {
          return new Decimal(sum).plus(getBalanceByBank(acc.id)).toNumber();
        }, 0);
      },

      // initial_balance + SUM(INCOME) - SUM(EXPENSE) for one account
      getBalanceByBank: (bankId: string) => {
        const { bankAccounts, transactions } = get();
        const account = bankAccounts.find((a) => a.id === bankId);
        if (!account) return 0;

        const initial = new Decimal(account.initial_balance);
        const accountTxs = transactions.filter((t) => t.bank_account_id === bankId);

        const balance = accountTxs.reduce((acc, tx) => {
          const amt = new Decimal(tx.amount);
          if (tx.type === 'INCOME') return acc.plus(amt);
          if (tx.type === 'EXPENSE' || tx.type === 'TRANSFER') return acc.minus(amt);
          return acc;
        }, initial);

        return balance.toNumber();
      },

      // Budget progress for a given month (optionally filter by category)
      getBudgetProgress: (monthYear: string, category?: string) => {
        const { budgets, transactions } = get();
        const filtered = budgets.filter(
          (b) => b.month_year === monthYear && (!category || b.category === category)
        );

        return filtered.map((budget): BudgetProgress => {
          const spent = transactions
            .filter(
              (t) =>
                t.type === 'EXPENSE' &&
                t.category === budget.category &&
                format(new Date(t.date), 'yyyy-MM') === monthYear
            )
            .reduce((sum, t) => sum.plus(new Decimal(t.amount)), new Decimal(0));

          const limit = new Decimal(budget.limit_amount);
          const remaining = limit.minus(spent);
          const percentage = limit.isZero()
            ? 0
            : spent.dividedBy(limit).times(100).toDecimalPlaces(1).toNumber();

          return {
            category: budget.category,
            limit: limit.toNumber(),
            spent: spent.toNumber(),
            remaining: remaining.toNumber(),
            percentage: Math.min(percentage, 100),
            isOverBudget: spent.greaterThan(limit),
          };
        });
      },

      // Month Income / Expense summary
      getMonthSummary: (monthYear: string): MonthSummary => {
        const { transactions } = get();
        const monthTxs = transactions.filter(
          (t) => format(new Date(t.date), 'yyyy-MM') === monthYear
        );

        const totalIncome = monthTxs
          .filter((t) => t.type === 'INCOME')
          .reduce((sum, t) => sum.plus(new Decimal(t.amount)), new Decimal(0));

        const totalExpense = monthTxs
          .filter((t) => t.type === 'EXPENSE')
          .reduce((sum, t) => sum.plus(new Decimal(t.amount)), new Decimal(0));

        return {
          totalIncome: totalIncome.toNumber(),
          totalExpense: totalExpense.toNumber(),
          netFlow: totalIncome.minus(totalExpense).toNumber(),
          month_year: monthYear,
        };
      },

      // Last N transactions enriched with bank metadata
      getRecentTransactions: (limit = 8) => {
        const { transactions, bankAccounts } = get();
        return [...transactions]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, limit)
          .map((tx) => {
            const bank = bankAccounts.find((a) => a.id === tx.bank_account_id);
            return { ...tx, bankName: bank?.bank_name ?? 'Unknown', bankColor: bank?.color ?? '#6B7280' };
          });
      },

      // All transactions in a given month
      getTransactionsByMonth: (monthYear: string) => {
        const { transactions } = get();
        return transactions.filter(
          (t) => format(new Date(t.date), 'yyyy-MM') === monthYear
        );
      },
    }),
    {
      name: 'omniwealth-fiat-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ── Export helper ─────────────────────────────────────────────
export const TRANSACTION_CATEGORIES: Record<TransactionType, string[]> = {
  INCOME: ['Salary', 'Freelance', 'Investment Return', 'Business', 'Gift', 'Bonus', 'Other Income'],
  EXPENSE: ['Rent', 'Groceries', 'Dining', 'Transport', 'Subscriptions', 'Utilities', 'Healthcare', 'Entertainment', 'Shopping', 'Education', 'Insurance', 'Other Expense'],
  TRANSFER: ['Transfer'],
};

export const BANK_OPTIONS = [
  { name: 'BCA', icon: 'B', color: '#0066AE' },
  { name: 'Mandiri', icon: 'M', color: '#003D7A' },
  { name: 'BNI', icon: 'N', color: '#FF6600' },
  { name: 'BRI', icon: 'R', color: '#004B87' },
  { name: 'CIMB', icon: 'C', color: '#D01929' },
  { name: 'Jenius', icon: 'J', color: '#00B9C9' },
  { name: 'GoPay', icon: 'G', color: '#00AAD4' },
  { name: 'OVO', icon: 'O', color: '#4B3F9E' },
  { name: 'Cash', icon: '💵', color: '#10B981' },
  { name: 'Other', icon: '🏦', color: '#6B7280' },
];
