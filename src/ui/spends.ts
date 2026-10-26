import type { CalDate } from '../calc/dates';
import { DEFAULT_OWNER, type Spend } from '../storage';

export const SPENDS_CHANGED_KEY = 'spendsChangedAt';
export const SPEND_DAYS_BACK = 31;

export interface SpendDraft {
  id: string | null;
  amountCents: number | null;
  date: string;
}

export function isoDate(date: CalDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

export function daysBefore(date: CalDate, days: number): CalDate {
  const d = new Date(date.year, date.month - 1, date.day - days);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function earliestSpendDate(today: CalDate): string {
  return isoDate(daysBefore(today, SPEND_DAYS_BACK - 1));
}

export function newSpendDraft(today: CalDate): SpendDraft {
  return { id: null, amountCents: null, date: isoDate(today) };
}

export function draftFromSpend(spend: Spend): SpendDraft {
  return { id: spend.id, amountCents: spend.amountCents, date: spend.date };
}

export function canSaveSpend(draft: SpendDraft, today: CalDate): boolean {
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(draft.date);
  return (
    draft.amountCents !== null &&
    draft.amountCents > 0 &&
    validDate &&
    draft.date >= earliestSpendDate(today) &&
    draft.date <= isoDate(today)
  );
}

export function spendFromDraft(draft: SpendDraft, existing: Spend | undefined, newId: () => string, now: number): Spend {
  if (draft.amountCents === null) throw new Error('A spend needs an amount');
  return {
    id: draft.id ?? newId(),
    owner: existing?.owner ?? DEFAULT_OWNER,
    amountCents: draft.amountCents,
    date: draft.date,
    loggedAt: existing?.loggedAt ?? now,
  };
}

export function spendsThisMonth(spends: Spend[], today: CalDate): Spend[] {
  const prefix = isoDate(today).slice(0, 8);
  return spends
    .filter((s) => s.date.startsWith(prefix))
    .sort((a, b) => b.date.localeCompare(a.date) || b.loggedAt - a.loggedAt);
}
