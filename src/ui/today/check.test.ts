import { describe, expect, it } from 'vitest';
import { initialState, recordSavings, type AppState } from '../state';
import { buildMonthlyCheck } from './check';

const setupDate = { year: 2026, month: 10, day: 21 };
const payState: AppState = {
  ...initialState,
  step: 'today',
  numbers: { payCents: 500_000, fixedCents: 250_000 },
  setupDate,
  goalsAnswered: true,
  route: 'none',
};
const november = { year: 2026, month: 11, day: 3 };
const spends = [
  { date: '2026-10-22', amountCents: 30_000 },
  { date: '2026-10-30', amountCents: 20_000 },
  { date: '2026-11-01', amountCents: 5_000 },
];

describe('buildMonthlyCheck', () => {
  it('does not show in the set-up month', () => {
    expect(buildMonthlyCheck({ state: payState, spends, monthlySavingCents: 100_000, caughtUp: setupDate, today: setupDate })).toBeNull();
  });

  it('does not show on the budget route', () => {
    const state: AppState = { ...payState, entry: 'budget', budgetCents: 100_000 };
    expect(buildMonthlyCheck({ state, spends, monthlySavingCents: null, caughtUp: november, today: november })).toBeNull();
  });

  it("shows last month's most on pace to set aside, with days not logged", () => {
    const check = buildMonthlyCheck({ state: payState, spends, monthlySavingCents: 100_000, caughtUp: { year: 2026, month: 10, day: 30 }, today: november });
    expect(check).toMatchObject({
      month: { year: 2026, month: 11 },
      lastMonth: { year: 2026, month: 10 },
      mostOnPaceCents: 200_000,
      daysNotLogged: 21,
      answered: false,
      expectedCents: null,
    });
  });

  it('compares the entered total with the last total plus the monthly saving, and changes nothing', () => {
    const state = recordSavings(recordSavings(payState, { year: 2026, month: 10 }, 1_000_000), { year: 2026, month: 11 }, 1_050_000);
    const check = buildMonthlyCheck({ state, spends, monthlySavingCents: 100_000, caughtUp: november, today: november });
    expect(check).toMatchObject({ answered: true, enteredCents: 1_050_000, lastTotalCents: 1_000_000, expectedCents: 1_100_000 });
    expect(state.items).toEqual(payState.items);
    expect(state.numbers).toEqual(payState.numbers);
  });

  it('skips months with no total when finding the last total', () => {
    const state = recordSavings(recordSavings(payState, { year: 2026, month: 10 }, 1_000_000), { year: 2026, month: 11 }, null);
    const january = { year: 2027, month: 1, day: 2 };
    expect(buildMonthlyCheck({ state, spends, monthlySavingCents: 100_000, caughtUp: january, today: january })).toMatchObject({
      answered: false,
      expectedCents: 1_300_000,
    });
  });

  it('shows the expected total as missing when the plan has no monthly saving', () => {
    const state = recordSavings(payState, { year: 2026, month: 10 }, 1_000_000);
    expect(buildMonthlyCheck({ state, spends, monthlySavingCents: null, caughtUp: november, today: november })?.expectedCents).toBeNull();
  });
});
