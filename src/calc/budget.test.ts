import { describe, expect, it } from 'vitest';
import { planBudget } from './budget';
import { dailyStatus } from './daily';
import { prorateCents } from './dates';

const setupDate = { year: 2026, month: 10, day: 21 };

describe('planBudget', () => {
  it('makes the budget the monthly safe-to-spend, with no saving', () => {
    expect(planBudget(150_000)).toEqual({ safeToSpendCents: 150_000, savingCents: 0 });
  });

  it('accepts a zero budget', () => {
    expect(planBudget(0).safeToSpendCents).toBe(0);
  });

  it('rejects amounts that are not whole cents', () => {
    expect(() => planBudget(-1)).toThrow(RangeError);
    expect(() => planBudget(1.5)).toThrow(RangeError);
  });

  it('prorates the first month exactly as the pay route does', () => {
    const status = dailyStatus({
      safeToSpendCents: planBudget(310_000).safeToSpendCents,
      delayItemMonthlyCents: null,
      spentCents: 0,
      setupDate,
      today: setupDate,
    });
    expect(status.budgetCents).toBe(prorateCents(310_000, setupDate));
    expect(status).toMatchObject({ budgetCents: 110_000, daysLeft: 11, dailyCents: 10_000, delayWeeks: null });
  });

  it('paces the first month against the prorated budget, with no target date effect', () => {
    const status = dailyStatus({
      safeToSpendCents: 310_000,
      delayItemMonthlyCents: null,
      spentCents: 120_000,
      setupDate,
      today: { year: 2026, month: 10, day: 25 },
    });
    expect(status).toMatchObject({ pace: 'over', delayWeeks: null, usedUp: true });
  });

  it('uses the full budget in later months', () => {
    const status = dailyStatus({
      safeToSpendCents: 155_000,
      delayItemMonthlyCents: null,
      spentCents: 0,
      setupDate,
      today: { year: 2026, month: 12, day: 1 },
    });
    expect(status).toMatchObject({ budgetCents: 155_000, dailyCents: 5_000 });
  });
});
