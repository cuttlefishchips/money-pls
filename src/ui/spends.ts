import type { CalDate } from '../calc/dates';
import { formatDollarsInput, parseDollars } from '../calc/money';
import { DEFAULT_OWNER, type Spend } from '../storage';

export const SPENDS_CHANGED_KEY = 'spendsChangedAt';
export const SPEND_DAYS_BACK = 31;
export const NOTE_MAX = 60;
export const STALE_AFTER_DAYS = 2;

export interface SpendDraft {
  id: string | null;
  text: string;
  date: string;
  picking: boolean;
}

export interface ParsedSpend {
  amountCents: number | null;
  note: string;
}

const AMOUNT = String.raw`(?:S?\$)?\d[\d,]*(?:\.\d{1,2})?`;
const LEADING = new RegExp(String.raw`^(${AMOUNT})(?:\s+(.*))?$`, 'i');
const TRAILING = new RegExp(String.raw`^(.*?)\s+(${AMOUNT})$`, 'i');

export function parseSpendText(text: string): ParsedSpend {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  const leading = LEADING.exec(cleaned);
  if (leading) return { amountCents: parseDollars(leading[1]!), note: (leading[2] ?? '').slice(0, NOTE_MAX) };
  const trailing = TRAILING.exec(cleaned);
  if (trailing) return { amountCents: parseDollars(trailing[2]!), note: trailing[1]!.slice(0, NOTE_MAX) };
  return { amountCents: null, note: cleaned.slice(0, NOTE_MAX) };
}

export function isoDate(date: CalDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

export function daysBefore(date: CalDate, days: number): CalDate {
  const d = new Date(date.year, date.month - 1, date.day - days);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function daysAgo(date: CalDate, today: CalDate): number {
  const utc = (d: CalDate) => Date.UTC(d.year, d.month - 1, d.day);
  return Math.round((utc(today) - utc(date)) / 86_400_000);
}

export function earliestSpendDate(today: CalDate): string {
  return isoDate(daysBefore(today, SPEND_DAYS_BACK - 1));
}

export function newSpendDraft(today: CalDate, date = isoDate(today)): SpendDraft {
  return { id: null, text: '', date, picking: date !== isoDate(today) && date !== isoDate(daysBefore(today, 1)) };
}

export function spendText(spend: Spend): string {
  return [formatDollarsInput(spend.amountCents), spend.note].filter(Boolean).join(' ');
}

export function draftFromSpend(spend: Spend, today: CalDate): SpendDraft {
  return { ...newSpendDraft(today, spend.date), id: spend.id, text: spendText(spend) };
}

export function canSaveSpend(draft: SpendDraft, today: CalDate): boolean {
  const { amountCents } = parseSpendText(draft.text);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(draft.date);
  return (
    amountCents !== null &&
    amountCents > 0 &&
    validDate &&
    draft.date >= earliestSpendDate(today) &&
    draft.date <= isoDate(today)
  );
}

export function spendFromDraft(draft: SpendDraft, existing: Spend | undefined, newId: () => string, now: number): Spend {
  const { amountCents, note } = parseSpendText(draft.text);
  if (amountCents === null) throw new Error('A spend needs an amount');
  const spend: Spend = {
    id: draft.id ?? newId(),
    owner: existing?.owner ?? DEFAULT_OWNER,
    amountCents,
    date: draft.date,
    loggedAt: existing?.loggedAt ?? now,
  };
  return note ? { ...spend, note } : spend;
}

export function spendsThisMonth(spends: Spend[], today: CalDate): Spend[] {
  const prefix = isoDate(today).slice(0, 8);
  return spends
    .filter((s) => s.date.startsWith(prefix))
    .sort((a, b) => b.date.localeCompare(a.date) || b.loggedAt - a.loggedAt);
}

export function caughtUpDate(changedAt: number | null, setupDate: CalDate | null, today: CalDate): CalDate {
  if (changedAt !== null) {
    const d = new Date(changedAt);
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }
  return setupDate ?? today;
}

export function isStale(caughtUp: CalDate, today: CalDate): boolean {
  return daysAgo(caughtUp, today) >= STALE_AFTER_DAYS;
}

export function dayLabel(date: CalDate, today: CalDate): string {
  const ago = daysAgo(date, today);
  if (ago === 0) return 'today';
  if (ago === 1) return 'yesterday';
  return new Date(date.year, date.month - 1, date.day).toLocaleDateString('en-SG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
