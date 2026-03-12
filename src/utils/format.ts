// ============================================================
// OmniWealth – Formatting Utilities
// All monetary values use Decimal.js under the hood
// ============================================================

import Decimal from 'decimal.js';

/**
 * Format a number/string as IDR currency
 * Uses Intl.NumberFormat for locale-aware grouping
 */
export function formatIDR(value: number | string): string {
  const num = new Decimal(value).toNumber();
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Compact format for large numbers: 12.5 Jt, 1.2 M
 */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(1)} M`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1)} Jt`;
  }
  if (Math.abs(value) >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(0)} Rb`;
  }
  return formatIDR(value);
}

/**
 * Format a date string to a readable format
 */
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

/**
 * Format month-year string 'YYYY-MM' to 'January 2025'
 */
export function formatMonthYear(monthYear: string): string {
  const [year, month] = monthYear.split('-');
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(Number(year), Number(month) - 1, 1)
  );
}

/**
 * Get current month-year in 'YYYY-MM' format
 */
export function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Clamp a percentage between 0-100
 */
export function clampPct(value: number): number {
  return Math.min(Math.max(value, 0), 100);
}
