import { describe, expect, it } from 'vitest';
import {
  ASSET_CLASSES,
  isValidBalance,
  isValidMonthYear,
  isValidPositiveAmount,
  isValidUuid,
  parseFiniteNumber,
  validateAssetInput,
  validateBankAccountInput,
  validateBudgetInput,
  validateTransactionInput,
} from './validate';

describe('parseFiniteNumber', () => {
  it('accepts numbers and numeric strings', () => {
    expect(parseFiniteNumber(12.5)).toBe(12.5);
    expect(parseFiniteNumber('9850000')).toBe(9850000);
    expect(parseFiniteNumber('-3')).toBe(-3);
    expect(parseFiniteNumber('0.00')).toBe(0);
  });

  it('rejects garbage', () => {
    expect(parseFiniteNumber('abc')).toBeNull();
    expect(parseFiniteNumber('')).toBeNull();
    expect(parseFiniteNumber(NaN)).toBeNull();
    expect(parseFiniteNumber(Infinity)).toBeNull();
    expect(parseFiniteNumber(null)).toBeNull();
    expect(parseFiniteNumber(undefined)).toBeNull();
    expect(parseFiniteNumber({})).toBeNull();
  });
});

describe('isValidPositiveAmount — negative-balance exploit guard', () => {
  it('accepts legitimate positive amounts', () => {
    expect(isValidPositiveAmount(1)).toBe(true);
    expect(isValidPositiveAmount('150000.55')).toBe(true);
  });

  it('rejects zero, negative, NaN and absurd values', () => {
    expect(isValidPositiveAmount(0)).toBe(false);
    expect(isValidPositiveAmount(-999999999)).toBe(false);
    expect(isValidPositiveAmount('-1')).toBe(false);
    expect(isValidPositiveAmount('NaN')).toBe(false);
    expect(isValidPositiveAmount(1e16)).toBe(false);
    expect(isValidPositiveAmount('')).toBe(false);
  });
});

describe('isValidBalance / isValidMonthYear / isValidUuid', () => {
  it('balances allow 0 but not negative', () => {
    expect(isValidBalance(0)).toBe(true);
    expect(isValidBalance('15850')).toBe(true);
    expect(isValidBalance(-1)).toBe(false);
  });

  it('month_year is YYYY-MM only', () => {
    expect(isValidMonthYear('2026-09')).toBe(true);
    expect(isValidMonthYear('2026-13')).toBe(false);
    expect(isValidMonthYear('2026-9')).toBe(false);
    expect(isValidMonthYear("2026-09'; DROP TABLE budgets;--")).toBe(false);
    expect(isValidMonthYear(202609)).toBe(false);
  });

  it('uuid validation', () => {
    expect(isValidUuid('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
    expect(isValidUuid('not-a-uuid')).toBe(false);
  });
});

describe('validateTransactionInput', () => {
  const valid = {
    type: 'EXPENSE',
    category: 'Groceries',
    amount: 150000,
    date: '2026-09-29T10:00:00.000Z',
    bank_account_id: '123e4567-e89b-42d3-a456-426614174000',
  };

  it('passes valid payloads (including numeric-string amounts from Decimal)', () => {
    expect(validateTransactionInput(valid)).toBeNull();
    expect(validateTransactionInput({ ...valid, amount: '150000.00' })).toBeNull();
  });

  it('BLOCKS negative amounts (the balance-inflation attack)', () => {
    expect(validateTransactionInput({ ...valid, amount: -999999999 })).toMatch(/positif/);
    expect(validateTransactionInput({ ...valid, amount: '-1' })).toMatch(/positif/);
  });

  it('blocks unknown types, bad dates, injection-ish categories', () => {
    expect(validateTransactionInput({ ...valid, type: 'MAGIC' })).toMatch(/Jenis/);
    expect(validateTransactionInput({ ...valid, type: "EXPENSE'; DROP TABLE--" })).toMatch(/Jenis/);
    expect(validateTransactionInput({ ...valid, date: 'not-a-date' })).toMatch(/Tanggal/);
    expect(validateTransactionInput({ ...valid, category: '' })).toMatch(/Kategori/);
    expect(validateTransactionInput({ ...valid, bank_account_id: 'x' })).toMatch(/Rekening/);
  });
});

describe('validateBudgetInput', () => {
  const valid = { month_year: '2026-09', category: 'Groceries', limit_amount: 2000000 };

  it('passes valid budget', () => {
    expect(validateBudgetInput(valid)).toBeNull();
  });

  it('rejects bad month formats and non-positive limits', () => {
    expect(validateBudgetInput({ ...valid, month_year: '09-2026' })).toMatch(/bulan/i);
    expect(validateBudgetInput({ ...valid, limit_amount: -5 })).toMatch(/positif/);
  });
});

describe('validateAssetInput', () => {
  const valid = {
    name: 'Bank Central Asia',
    asset_class: 'STOCK',
    quantity: 100,
    average_buy_price: 9850,
  };

  it('passes valid asset + all known asset classes', () => {
    expect(validateAssetInput(valid)).toBeNull();
    for (const cls of ASSET_CLASSES) {
      expect(validateAssetInput({ ...valid, asset_class: cls })).toBeNull();
    }
  });

  it('rejects invalid class, zero/negative quantity and price', () => {
    expect(validateAssetInput({ ...valid, asset_class: 'NFT' })).toMatch(/Kelas/);
    expect(validateAssetInput({ ...valid, quantity: 0 })).toMatch(/positif/);
    expect(validateAssetInput({ ...valid, average_buy_price: -1 })).toMatch(/Harga/);
    expect(validateAssetInput({ ...valid, name: '' })).toMatch(/Nama/);
  });
});

describe('validateBankAccountInput', () => {
  it('passes and rejects appropriately', () => {
    expect(
      validateBankAccountInput({ bank_name: 'BCA', initial_balance: 1000000, currency: 'IDR' }),
    ).toBeNull();
    expect(
      validateBankAccountInput({ bank_name: '', initial_balance: 1000000, currency: 'IDR' }),
    ).toMatch(/Nama/);
    expect(
      validateBankAccountInput({ bank_name: 'BCA', initial_balance: -1, currency: 'IDR' }),
    ).toMatch(/Saldo/);
  });
});
