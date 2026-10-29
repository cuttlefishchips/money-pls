import { describe, expect, it } from 'vitest';
import { daysNotLogged, expectedSavings, monthEnd, monthsBetween } from './review';

const october = { year: 2026, month: 10 };

describe('monthEnd', () => {
  const base = {
    payCents: 500_000,
    fixedCents: 250_000,
    spentCents: 180_000,
    month: october,
    setupDate: { year: 2026, month: 9, day: 15 },
    caughtUp: { year: 2026, month: 11, day: 1 },
  };

  it('is pay minus fixed costs minus logged spends', () => {
    expect(monthEnd(base)).toEqual({ mostOnPaceCents: 70_000, daysNotLogged: 0 });
  });

  it('never goes below zero', () => {
    expect(monthEnd({ ...base, spentCents: 300_000 }).mostOnPaceCents).toBe(0);
  });

  it('rejects amounts that are not whole cents', () => {
    expect(() => monthEnd({ ...base, spentCents: -1 })).toThrow(RangeError);
  });
});

describe('daysNotLogged', () => {
  it('is zero when set-up was before the month and logging caught up after it', () => {
    expect(daysNotLogged(october, { year: 2026, month: 9, day: 1 }, { year: 2026, month: 11, day: 2 })).toBe(0);
  });

  it('counts the days before set-up in the set-up month', () => {
    expect(daysNotLogged(october, { year: 2026, month: 10, day: 21 }, { year: 2026, month: 11, day: 1 })).toBe(20);
  });

  it('counts the days after the last catch-up', () => {
    expect(daysNotLogged(october, { year: 2026, month: 9, day: 1 }, { year: 2026, month: 10, day: 25 })).toBe(6);
  });

  it('counts both ends together', () => {
    expect(daysNotLogged(october, { year: 2026, month: 10, day: 21 }, { year: 2026, month: 10, day: 28 })).toBe(23);
  });

  it('counts the whole month when the last catch-up was before it', () => {
    expect(daysNotLogged(october, { year: 2026, month: 9, day: 1 }, { year: 2026, month: 9, day: 30 })).toBe(31);
  });

  it('treats a day with no spends inside the caught-up span as logged', () => {
    expect(daysNotLogged({ year: 2026, month: 2 }, { year: 2026, month: 1, day: 5 }, { year: 2026, month: 2, day: 28 })).toBe(0);
  });
});

describe('expectedSavings', () => {
  it('is the last entered total plus the monthly saving', () => {
    expect(expectedSavings({ month: october, totalCents: 1_000_000 }, 100_000, { year: 2026, month: 11 })).toBe(1_100_000);
  });

  it('adds one monthly saving for each month since the last entry', () => {
    expect(expectedSavings({ month: october, totalCents: 1_000_000 }, 100_000, { year: 2027, month: 1 })).toBe(1_300_000);
  });

  it('adds at least one month', () => {
    expect(expectedSavings({ month: october, totalCents: 500 }, 100, october)).toBe(600);
  });

  it('rejects amounts that are not whole cents', () => {
    expect(() => expectedSavings({ month: october, totalCents: 1 }, -1, october)).toThrow(RangeError);
  });
});

describe('monthsBetween', () => {
  it('counts across a year end', () => {
    expect(monthsBetween({ year: 2026, month: 11 }, { year: 2027, month: 2 })).toBe(3);
  });
});
