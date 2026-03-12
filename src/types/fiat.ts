// ============================================================
// OmniWealth – Fiat Module Types
// Mirrors the Prisma schema for client-side usage
// ============================================================

export type Currency = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'MYR';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string | null;
  initial_balance: string; // stored as string for Decimal precision
  currency: Currency;
  color: string;          // UI accent color
  icon: string;           // Bank icon key
  created_at: string;
}

export interface Transaction {
  id: string;
  bank_account_id: string;
  type: TransactionType;
  category: string;
  amount: string;         // Decimal string
  date: string;           // ISO datetime string
  description: string | null;
  transfer_to_account_id?: string | null;
}

export interface MonthlyBudget {
  id: string;
  month_year: string;     // format: 'YYYY-MM'
  category: string;
  limit_amount: string;   // Decimal string
}

// ---- API Payloads ----
export interface CreateBankAccountPayload {
  bank_name: string;
  account_number?: string;
  initial_balance: number;
  currency: Currency;
  color: string;
  icon: string;
}

export interface CreateTransactionPayload {
  bank_account_id: string;
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  description?: string;
  transfer_to_account_id?: string;
}

export interface CreateBudgetPayload {
  month_year: string;
  category: string;
  limit_amount: number;
}

// ---- Derived / Selector Return Types ----
export interface BudgetProgress {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

export interface MonthSummary {
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  month_year: string;
}
