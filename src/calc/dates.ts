export interface CalDate {
  year: number;
  month: number;
  day: number;
}

export interface YearMonth {
  year: number;
  month: number;
}

export interface BudgetPeriod {
  periodDays: number;
  daysElapsed: number;
  daysLeft: number;
  isFirstMonth: boolean;
}

export function toCalDate(date: Date): CalDate {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function endOfMonth(ym: YearMonth): CalDate {
  return { year: ym.year, month: ym.month, day: daysInMonth(ym.year, ym.month) };
}

export function monthsToTarget(start: YearMonth, target: YearMonth): number {
  const months = (target.year - start.year) * 12 + (target.month - start.month) + 1;
  return Math.max(1, months);
}

export function daysLeftInMonth(today: CalDate): number {
  return daysInMonth(today.year, today.month) - today.day + 1;
}

export function daysElapsedInMonth(today: CalDate): number {
  return today.day;
}

export function sameMonth(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

export function budgetPeriod(today: CalDate, setupDate: CalDate): BudgetPeriod {
  const daysLeft = daysLeftInMonth(today);
  if (sameMonth(today, setupDate)) {
    const periodDays = daysLeftInMonth(setupDate);
    return { periodDays, daysElapsed: today.day - setupDate.day + 1, daysLeft, isFirstMonth: true };
  }
  return {
    periodDays: daysInMonth(today.year, today.month),
    daysElapsed: daysElapsedInMonth(today),
    daysLeft,
    isFirstMonth: false,
  };
}

export function prorateCents(monthlyCents: number, setupDate: CalDate): number {
  const dim = daysInMonth(setupDate.year, setupDate.month);
  return Math.floor((monthlyCents * daysLeftInMonth(setupDate)) / dim);
}
