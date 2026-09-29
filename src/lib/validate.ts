// ============================================================
// OmniWealth – runtime input validation (defence in depth)
//
// TypeScript types vanish at runtime; database CHECK constraints
// (schema.sql) are the final gate. This layer gives users an
// immediate, friendly error BEFORE anything is sent to PostgREST.
//
// Every function is pure & unit-tested (src/lib/validate.test.ts).
// ============================================================

export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'] as const;
export type TransactionTypeValue = (typeof TRANSACTION_TYPES)[number];

export const ASSET_CLASSES = [
  'STOCK',
  'CRYPTO',
  'REAL_ESTATE',
  'COMMODITY',
  'MUTUAL_FUND',
] as const;
export type AssetClassValue = (typeof ASSET_CLASSES)[number];

/** Upper bound keeps NUMERIC columns sane (≈ 1 quadrillion). */
export const MAX_ABS_AMOUNT = 1e15;

/** Accepts number | numeric string (Decimal `.toFixed()` output). */
export function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Amounts must be finite and strictly positive (blocks the negative-balance exploit). */
export function isValidPositiveAmount(value: unknown): boolean {
  const n = parseFiniteNumber(value);
  return n !== null && n > 0 && Math.abs(n) <= MAX_ABS_AMOUNT;
}

/** Balances may be 0 but never negative/NaN/Infinity at entry time. */
export function isValidBalance(value: unknown): boolean {
  const n = parseFiniteNumber(value);
  return n !== null && n >= 0 && n <= MAX_ABS_AMOUNT;
}

/** "YYYY-MM" */
export function isValidMonthYear(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** ISO-8601 timestamp the server will accept as TIMESTAMPTZ. */
export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const t = Date.parse(value);
  return Number.isFinite(t);
}

export function isNonEmptyString(value: unknown, maxLen = 500): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLen;
}

export function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

// ── Aggregate validators: return a user-facing error message or null ──

export interface TransactionInput {
  type: unknown;
  category: unknown;
  amount: unknown;
  date: unknown;
  bank_account_id: unknown;
  description?: unknown;
}

export function validateTransactionInput(p: TransactionInput): string | null {
  if (!oneOf(p.type, TRANSACTION_TYPES)) {
    return 'Jenis transaksi tidak valid.';
  }
  if (!isNonEmptyString(p.category, 100)) {
    return 'Kategori transaksi wajib diisi (maks. 100 karakter).';
  }
  if (!isValidPositiveAmount(p.amount)) {
    return 'Nominal harus berupa angka positif yang valid.';
  }
  if (!isValidIsoDate(p.date)) {
    return 'Tanggal transaksi tidak valid.';
  }
  if (!isValidUuid(p.bank_account_id)) {
    return 'Rekening sumber tidak valid.';
  }
  if (p.description !== undefined && p.description !== null && !isNonEmptyString(p.description, 1000)) {
    return 'Deskripsi terlalu panjang (maks. 1000 karakter).';
  }
  return null;
}

export interface BankAccountInput {
  bank_name: unknown;
  initial_balance: unknown;
  currency: unknown;
}

export function validateBankAccountInput(p: BankAccountInput): string | null {
  if (!isNonEmptyString(p.bank_name, 100)) {
    return 'Nama bank wajib diisi.';
  }
  if (!isValidBalance(p.initial_balance)) {
    return 'Saldo awal harus berupa angka nol atau lebih.';
  }
  if (!isNonEmptyString(p.currency, 10)) {
    return 'Mata uang wajib dipilih.';
  }
  return null;
}

export interface BudgetInput {
  month_year: unknown;
  category: unknown;
  limit_amount: unknown;
}

export function validateBudgetInput(p: BudgetInput): string | null {
  if (!isValidMonthYear(p.month_year)) {
    return 'Format bulan tidak valid (YYYY-MM).';
  }
  if (!isNonEmptyString(p.category, 100)) {
    return 'Kategori budget wajib diisi.';
  }
  if (!isValidPositiveAmount(p.limit_amount)) {
    return 'Limit budget harus berupa angka positif yang valid.';
  }
  return null;
}

export interface AssetInput {
  name: unknown;
  asset_class: unknown;
  quantity: unknown;
  average_buy_price: unknown;
  manual_valuation?: unknown;
  symbol?: unknown;
}

export function validateAssetInput(p: AssetInput): string | null {
  if (!isNonEmptyString(p.name, 200)) {
    return 'Nama aset wajib diisi.';
  }
  if (!oneOf(p.asset_class, ASSET_CLASSES)) {
    return 'Kelas aset tidak valid.';
  }
  if (!isValidPositiveAmount(p.quantity)) {
    return 'Jumlah aset harus berupa angka positif yang valid.';
  }
  // Free/zero-cost assets are legal (e.g. inherited), negative prices are not.
  if (!isValidBalance(p.average_buy_price)) {
    return 'Harga beli rata-rata tidak valid.';
  }
  if (
    p.manual_valuation !== undefined &&
    p.manual_valuation !== null &&
    p.manual_valuation !== '' &&
    !isValidBalance(p.manual_valuation)
  ) {
    return 'Valuasi manual tidak valid.';
  }
  if (p.symbol !== undefined && p.symbol !== null && p.symbol !== '' &&
      (typeof p.symbol !== 'string' || p.symbol.length > 20)) {
    return 'Simbol aset tidak valid.';
  }
  return null;
}
