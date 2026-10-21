import { describe, expect, it } from 'vitest';
import { dailyStatus, type DailyInputs } from './daily';

const fullMonth: DailyInputs = {
  safeToSpendCents: 300_000,
  delayItemMonthlyCents: 100_000,
  spentCents: 0,
  setupDate: { year: 2026, month: 10, day: 1 },
  today: { year: 2026, month: 11, day: 1 },
};

describe('dailyStatus', () => {
  describe('daily number', () => {
    it('spreads what is left over the days left, including today', () => {
      const status = dailyStatus({ ...fullMonth, spentCents: 60_000, today: { year: 2026, month: 11, day: 11 } });
      expect(status).toMatchObject({ budgetCents: 300_000, daysLeft: 20, dailyCents: 12_000, usedUp: false });
    });

    it('rounds down to the cent', () => {
      const status = dailyStatus({ ...fullMonth, safeToSpendCents: 100_000 });
      expect(status.dailyCents).toBe(3_333);
    });

    it('uses the whole remaining budget on the last day', () => {
      const status = dailyStatus({ ...fullMonth, spentCents: 250_000, today: { year: 2026, month: 11, day: 30 } });
      expect(status).toMatchObject({ daysLeft: 1, dailyCents: 50_000 });
    });

    it('shows the month as used up when spending reaches the budget', () => {
      expect(dailyStatus({ ...fullMonth, spentCents: 300_000 })).toMatchObject({ dailyCents: 0, usedUp: true });
      expect(dailyStatus({ ...fullMonth, spentCents: 350_000 })).toMatchObject({ dailyCents: 0, usedUp: true });
    });

    it('shows a zero budget as used up', () => {
      expect(dailyStatus({ ...fullMonth, safeToSpendCents: 0 })).toMatchObject({ dailyCents: 0, usedUp: true });
    });
  });

  describe('first month', () => {
    const firstMonth: DailyInputs = {
      ...fullMonth,
      safeToSpendCents: 310_000,
      setupDate: { year: 2026, month: 10, day: 20 },
      today: { year: 2026, month: 10, day: 20 },
    };

    it('prorates the budget from the set-up day', () => {
      expect(dailyStatus(firstMonth)).toMatchObject({ budgetCents: 120_000, daysLeft: 12, dailyCents: 10_000 });
    });

    it('measures pace against the prorated budget from the set-up day', () => {
      const onDayThree = { ...firstMonth, today: { year: 2026, month: 10, day: 22 } };
      expect(dailyStatus({ ...onDayThree, spentCents: 30_000 }).pace).toBe('within');
      expect(dailyStatus({ ...onDayThree, spentCents: 19_999 })).toMatchObject({
        pace: 'ahead',
        freeToEnjoyCents: 10_001,
      });
    });

    it('is within pace on the last day when spending is within the prorated budget', () => {
      const status = dailyStatus({ ...firstMonth, spentCents: 115_000, today: { year: 2026, month: 10, day: 31 } });
      expect(status.pace).toBe('within');
    });

    it('is over, with a delay, only when spending passes the prorated budget', () => {
      const status = dailyStatus({ ...firstMonth, spentCents: 130_000, today: { year: 2026, month: 10, day: 31 } });
      expect(status).toMatchObject({ pace: 'over', delayWeeks: 1 });
    });

    it('goes back to the full budget the next month', () => {
      expect(dailyStatus({ ...firstMonth, today: { year: 2026, month: 11, day: 1 } }).budgetCents).toBe(310_000);
    });
  });

  describe('pace', () => {
    const dayTen = { ...fullMonth, today: { year: 2026, month: 11, day: 10 } };

    it('is ahead when spending is more than a day below the even share', () => {
      const status = dailyStatus({ ...dayTen, spentCents: 50_000 });
      expect(status).toMatchObject({ pace: 'ahead', freeToEnjoyCents: 50_000 });
    });

    it('is within pace at exactly one day below the even share', () => {
      expect(dailyStatus({ ...dayTen, spentCents: 90_000 })).toMatchObject({ pace: 'within', freeToEnjoyCents: null });
      expect(dailyStatus({ ...dayTen, spentCents: 89_999 }).pace).toBe('ahead');
    });

    it('is within pace above the even share but not over the budget', () => {
      expect(dailyStatus({ ...dayTen, spentCents: 300_000 })).toMatchObject({ pace: 'within', delayWeeks: null });
    });

    it('rounds free to enjoy down to the cent', () => {
      const status = dailyStatus({ ...dayTen, safeToSpendCents: 100_000, spentCents: 0 });
      expect(status.freeToEnjoyCents).toBe(33_333);
    });

    it('is never ahead on the first day with nothing spent', () => {
      expect(dailyStatus(fullMonth).pace).toBe('within');
    });
  });

  describe('over budget', () => {
    it("gives the delay to the soonest unfinished item's date in weeks, rounded up, using that item's amount", () => {
      expect(dailyStatus({ ...fullMonth, spentCents: 400_000 })).toMatchObject({ pace: 'over', delayWeeks: 5 });
      expect(dailyStatus({ ...fullMonth, spentCents: 300_001 }).delayWeeks).toBe(1);
      expect(dailyStatus({ ...fullMonth, spentCents: 500_000 }).delayWeeks).toBe(9);
    });

    it('gives no delay on the floor route or when no item still needs money', () => {
      expect(dailyStatus({ ...fullMonth, delayItemMonthlyCents: null, spentCents: 400_000 })).toMatchObject({
        pace: 'over',
        delayWeeks: null,
      });
    });

    it('gives no delay when the item monthly amount is zero', () => {
      expect(dailyStatus({ ...fullMonth, delayItemMonthlyCents: 0, spentCents: 400_000 })).toMatchObject({
        pace: 'over',
        delayWeeks: null,
      });
    });
  });

  it('rejects negative or fractional cents', () => {
    expect(() => dailyStatus({ ...fullMonth, spentCents: -1 })).toThrow(RangeError);
    expect(() => dailyStatus({ ...fullMonth, safeToSpendCents: 0.5 })).toThrow(RangeError);
  });
});
