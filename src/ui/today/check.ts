import type { CalDate, YearMonth } from '../../calc/dates';
import { expectedSavings, monthEnd } from '../../calc/review';
import type { AppState } from '../state';
import { spentThisMonth } from './model';

export interface MonthlyCheck {
  month: YearMonth;
  lastMonth: YearMonth;
  mostOnPaceCents: number | null;
  daysNotLogged: number;
  enteredCents: number | null;
  expectedCents: number | null;
  lastTotalCents: number | null;
  answered: boolean;
}

export interface CheckInputs {
  state: AppState;
  spends: { date: string; amountCents: number }[];
  monthlySavingCents: number | null;
  caughtUp: CalDate;
  today: CalDate;
}

const index = (ym: YearMonth) => ym.year * 12 + ym.month;

function previousMonth(ym: YearMonth): YearMonth {
  return ym.month === 1 ? { year: ym.year - 1, month: 12 } : { year: ym.year, month: ym.month - 1 };
}

export function buildMonthlyCheck({ state, spends, monthlySavingCents, caughtUp, today }: CheckInputs): MonthlyCheck | null {
  const { setupDate } = state;
  if (state.entry !== 'pay' || state.step !== 'today' || !setupDate || index(today) <= index(setupDate)) return null;
  const { payCents, fixedCents } = state.numbers;
  if (payCents === null || fixedCents === null) return null;

  const month = { year: today.year, month: today.month };
  const lastMonth = previousMonth(month);
  const thisCheck = state.savingsChecks.find((c) => c.year === month.year && c.month === month.month);
  const last = state.savingsChecks
    .filter((c) => c.totalCents !== null && index(c) < index(month))
    .sort((a, b) => index(b) - index(a))[0];

  const end = monthEnd({ payCents, fixedCents, spentCents: spentThisMonth(spends, lastMonth), month: lastMonth, setupDate, caughtUp });
  const expected =
    last && last.totalCents !== null && monthlySavingCents !== null
      ? expectedSavings({ month: last, totalCents: last.totalCents }, monthlySavingCents, month)
      : null;

  return {
    month,
    lastMonth,
    mostOnPaceCents: end.mostOnPaceCents,
    daysNotLogged: end.daysNotLogged,
    enteredCents: thisCheck?.totalCents ?? null,
    expectedCents: expected,
    lastTotalCents: last?.totalCents ?? null,
    answered: thisCheck !== undefined,
  };
}
