import { describe, expect, it } from 'vitest';
import { planBudget } from './budget';
import { dailyStatus } from './daily';

describe('planBudget', () => {
  it('makes the budget the monthly safe-to-spend, with no saving', () => {
    expect(planBudget(150_000)).toEqual({ safeToSpendCents: 150_000, savingCents: 0, prorateFirstMonth: false });
  });

  it('accepts a zero budget', () => {
    expect(planBudget(0).safeToSpendCents).toBe(0);
  });

  it('rejects amounts that are not whole cents', () => {
    expect(() => planBudget(-1)).toThrow(RangeError);
    expect(() => planBudget(1.5)).toThrow(RangeError);
  });

  it('uses the whole budget in the first month, because the person set it for this month', () => {
    const setupDate = { year: 2026, month: 10, day: 21 };
    const plan = planBudget(110_000);
    const status = dailyStatus({
      safeToSpendCents: plan.safeToSpendCents,
      prorateFirstMonth: plan.prorateFirstMonth,
      delayItemMonthlyCents: null,
      spentCents: 0,
      setupDate,
      today: setupDate,
    });
    expect(status).toMatchObject({ budgetCents: 110_000, daysLeft: 11, dailyCents: 10_000, delayWeeks: null });
  });

  it('paces the first month from the set-up day', () => {
    const setupDate = { year: 2026, month: 10, day: 21 };
    const status = dailyStatus({
      safeToSpendCents: 110_000,
      prorateFirstMonth: false,
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
      prorateFirstMonth: false,
      delayItemMonthlyCents: null,
      spentCents: 0,
      setupDate: { year: 2026, month: 10, day: 21 },
      today: { year: 2026, month: 12, day: 1 },
    });
    expect(status).toMatchObject({ budgetCents: 155_000, dailyCents: 5_000 });
  });
});
