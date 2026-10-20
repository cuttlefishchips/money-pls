import { describe, expect, it } from 'vitest';
import {
  budgetPeriod,
  daysElapsedInMonth,
  daysInMonth,
  daysLeftInMonth,
  endOfMonth,
  monthsToTarget,
  prorateCents,
  toCalDate,
} from './dates';

describe('daysInMonth', () => {
  it('handles 30 and 31 day months', () => {
    expect(daysInMonth(2026, 10)).toBe(31);
    expect(daysInMonth(2026, 11)).toBe(30);
  });

  it('handles February in common and leap years', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
  });
});

describe('endOfMonth', () => {
  it('treats the target month as its last day', () => {
    expect(endOfMonth({ year: 2026, month: 12 })).toEqual({ year: 2026, month: 12, day: 31 });
    expect(endOfMonth({ year: 2028, month: 2 })).toEqual({ year: 2028, month: 2, day: 29 });
  });
});

describe('monthsToTarget', () => {
  it('counts the start month and the target month', () => {
    expect(monthsToTarget({ year: 2026, month: 10 }, { year: 2026, month: 12 })).toBe(3);
  });

  it('is 1 when the target is the start month', () => {
    expect(monthsToTarget({ year: 2026, month: 10 }, { year: 2026, month: 10 })).toBe(1);
  });

  it('crosses year boundaries', () => {
    expect(monthsToTarget({ year: 2026, month: 11 }, { year: 2027, month: 2 })).toBe(4);
    expect(monthsToTarget({ year: 2026, month: 10 }, { year: 2028, month: 9 })).toBe(24);
  });

  it('is at least 1 when the target is before the start month', () => {
    expect(monthsToTarget({ year: 2026, month: 10 }, { year: 2026, month: 8 })).toBe(1);
  });
});

describe('daysLeftInMonth and daysElapsedInMonth', () => {
  it('include today', () => {
    const today = { year: 2026, month: 10, day: 20 };
    expect(daysLeftInMonth(today)).toBe(12);
    expect(daysElapsedInMonth(today)).toBe(20);
  });

  it('give 1 day left on the last day and 1 day elapsed on the first', () => {
    expect(daysLeftInMonth({ year: 2026, month: 10, day: 31 })).toBe(1);
    expect(daysElapsedInMonth({ year: 2026, month: 10, day: 1 })).toBe(1);
  });
});

describe('budgetPeriod', () => {
  it('starts the first month on the set-up day', () => {
    const setup = { year: 2026, month: 10, day: 20 };
    expect(budgetPeriod(setup, setup)).toEqual({
      periodDays: 12,
      daysElapsed: 1,
      daysLeft: 12,
      isFirstMonth: true,
    });
    expect(budgetPeriod({ year: 2026, month: 10, day: 25 }, setup)).toEqual({
      periodDays: 12,
      daysElapsed: 6,
      daysLeft: 7,
      isFirstMonth: true,
    });
  });

  it('uses the whole calendar month after the first month', () => {
    const setup = { year: 2026, month: 10, day: 20 };
    expect(budgetPeriod({ year: 2026, month: 11, day: 10 }, setup)).toEqual({
      periodDays: 30,
      daysElapsed: 10,
      daysLeft: 21,
      isFirstMonth: false,
    });
  });

  it('treats the same month in a later year as a full month', () => {
    const setup = { year: 2026, month: 10, day: 20 };
    expect(budgetPeriod({ year: 2027, month: 10, day: 1 }, setup).isFirstMonth).toBe(false);
  });

  it('makes daysElapsed and daysLeft add up to the period plus today', () => {
    const setup = { year: 2026, month: 10, day: 20 };
    for (let day = 20; day <= 31; day++) {
      const p = budgetPeriod({ year: 2026, month: 10, day }, setup);
      expect(p.daysElapsed + p.daysLeft).toBe(p.periodDays + 1);
    }
  });
});

describe('prorateCents', () => {
  it('prorates by days left at set-up, including the set-up day', () => {
    expect(prorateCents(310_000, { year: 2026, month: 10, day: 20 })).toBe(120_000);
  });

  it('gives the full amount when set up on the first day', () => {
    expect(prorateCents(250_000, { year: 2026, month: 11, day: 1 })).toBe(250_000);
  });

  it('rounds down to the cent', () => {
    expect(prorateCents(100_000, { year: 2026, month: 11, day: 30 })).toBe(3_333);
  });
});

describe('toCalDate', () => {
  it('reads the local calendar date', () => {
    expect(toCalDate(new Date(2026, 9, 20, 23, 59))).toEqual({ year: 2026, month: 10, day: 20 });
  });
});
