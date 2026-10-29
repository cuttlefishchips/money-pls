import { daysInMonth, type CalDate, type YearMonth } from './dates';
import { assertCents } from './money';

export interface MonthEndInputs {
  payCents: number;
  fixedCents: number;
  spentCents: number;
  month: YearMonth;
  setupDate: CalDate;
  caughtUp: CalDate;
}

export interface MonthEndResult {
  mostOnPaceCents: number;
  daysNotLogged: number;
}

const monthIndex = (ym: YearMonth) => ym.year * 12 + ym.month;

export function monthsBetween(from: YearMonth, to: YearMonth): number {
  return monthIndex(to) - monthIndex(from);
}

export function daysNotLogged(month: YearMonth, setupDate: CalDate, caughtUp: CalDate): number {
  const days = daysInMonth(month.year, month.month);
  const firstLogged = monthIndex(setupDate) === monthIndex(month) ? setupDate.day : monthIndex(setupDate) > monthIndex(month) ? days + 1 : 1;
  const lastLogged = monthIndex(caughtUp) > monthIndex(month) ? days : monthIndex(caughtUp) === monthIndex(month) ? caughtUp.day : 0;
  const logged = Math.max(0, lastLogged - firstLogged + 1);
  return days - logged;
}

export function monthEnd(inputs: MonthEndInputs): MonthEndResult {
  const { payCents: P, fixedCents: F, spentCents: spent } = inputs;
  assertCents('payCents', P);
  assertCents('fixedCents', F);
  assertCents('spentCents', spent);
  return {
    mostOnPaceCents: Math.max(0, P - F - spent),
    daysNotLogged: daysNotLogged(inputs.month, inputs.setupDate, inputs.caughtUp),
  };
}

export interface SavingsEntry {
  month: YearMonth;
  totalCents: number;
}

export function expectedSavings(last: SavingsEntry, monthlySavingCents: number, thisMonth: YearMonth): number {
  assertCents('totalCents', last.totalCents);
  assertCents('monthlySavingCents', monthlySavingCents);
  return last.totalCents + monthlySavingCents * Math.max(1, monthsBetween(last.month, thisMonth));
}
