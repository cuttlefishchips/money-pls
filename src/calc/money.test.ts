import { describe, expect, it } from 'vitest';
import { formatDollarsInput, MAX_INPUT_CENTS, parseDollars } from './money';

describe('parseDollars', () => {
  it.each([
    ['1200', 120_000],
    ['1,200', 120_000],
    ['1200.5', 120_050],
    ['1200.50', 120_050],
    ['0.99', 99],
    ['0', 0],
    ['$45', 4_500],
    ['S$45', 4_500],
    ['  3,500  ', 350_000],
  ])('reads %s as %i cents', (text, cents) => {
    expect(parseDollars(text)).toBe(cents);
  });

  it.each(['', ' ', '-5', 'abc', '12.345', '1.2.3', '.5', '5.', '1e3', '12 000'])('treats %j as missing', (text) => {
    expect(parseDollars(text)).toBeNull();
  });

  it('treats amounts above the cap as missing', () => {
    expect(parseDollars(String(MAX_INPUT_CENTS / 100))).toBe(MAX_INPUT_CENTS);
    expect(parseDollars(String(MAX_INPUT_CENTS / 100 + 1))).toBeNull();
  });
});

describe('formatDollarsInput', () => {
  it('shows whole dollars without cents, and cents with two digits', () => {
    expect(formatDollarsInput(120_000)).toBe('1200');
    expect(formatDollarsInput(120_050)).toBe('1200.50');
    expect(formatDollarsInput(5)).toBe('0.05');
  });

  it('shows missing as empty', () => {
    expect(formatDollarsInput(null)).toBe('');
  });

  it('round-trips with parseDollars', () => {
    for (const cents of [0, 1, 99, 100, 123_456, 1_000_000_00]) {
      expect(parseDollars(formatDollarsInput(cents))).toBe(cents);
    }
  });
});
