export function assertCents(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a whole, non-negative number of cents`);
  }
}

export function ceilDiv(numerator: number, denominator: number): number {
  return Math.ceil(numerator / denominator);
}

export function floorDiv(numerator: number, denominator: number): number {
  return Math.floor(numerator / denominator);
}

export const MAX_INPUT_CENTS = 100_000_000_000;

export function parseDollars(text: string): number | null {
  const cleaned = text.trim().replace(/^S?\$/i, '').replace(/,/g, '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole = '0', fraction = ''] = cleaned.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents <= MAX_INPUT_CENTS ? cents : null;
}

export function formatDollarsInput(cents: number | null): string {
  if (cents === null) return '';
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  return remainder === 0 ? String(dollars) : `${dollars}.${String(remainder).padStart(2, '0')}`;
}

export type Rounding = 'exact' | 'up' | 'down';

export function formatSGD(cents: number, rounding: Rounding = 'exact'): string {
  const sign = cents < 0 ? '−' : '';
  const abs = Math.abs(cents);
  if (rounding === 'exact' && abs % 100 !== 0) {
    const dollars = Math.floor(abs / 100).toLocaleString('en-SG');
    return `${sign}S$${dollars}.${String(abs % 100).padStart(2, '0')}`;
  }
  const roundUp = (rounding === 'up') !== (cents < 0);
  const dollars = roundUp ? Math.ceil(abs / 100) : Math.floor(abs / 100);
  return `${sign}S$${dollars.toLocaleString('en-SG')}`;
}
