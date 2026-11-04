import { daysInMonth, type CalDate } from '../calc/dates';
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

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_FULL = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_WORD = [...MONTH_FULL, 'sept', ...MONTHS].join('|');
const RELATIVE_DATE = /^(today|yesterday)(?:\s+|$)(.*)$/i;
const NAMED_DATE = new RegExp(String.raw`^(\d{1,2})\s+(${MONTH_WORD})(?![a-z])\s*(.*)$`, 'i');
const SLASH_DATE = /^(\d{1,2})\/(\d{1,2})(?:\s+|$)(.*)$/;

export type LineIssue = 'no-amount' | 'zero-amount' | 'no-such-date' | 'too-old' | 'future';

export const LINE_ISSUE_TEXT: Record<LineIssue, string> = {
  'no-amount': 'No amount found. Add one, like 5.50.',
  'zero-amount': 'The amount needs to be more than S$0.',
  'no-such-date': "That date doesn't exist.",
  'too-old': 'More than 31 days ago, so it can\'t be logged.',
  future: "That date hasn't happened yet.",
};

export type SpendLine =
  | { line: string; ok: true; date: string; dateFromLine: boolean; amountCents: number; note: string }
  | { line: string; ok: false; issue: LineIssue };

interface LineDate {
  date: CalDate | null;
  rest: string;
}

function monthNumber(word: string): number {
  const w = word.toLowerCase();
  if (w === 'sept') return 9;
  const full = MONTH_FULL.indexOf(w);
  return full >= 0 ? full + 1 : MONTHS.indexOf(w) + 1;
}

function mostRecentPast(day: number, month: number, today: CalDate): CalDate | 'no-such-date' {
  if (month < 1 || month > 12 || day < 1) return 'no-such-date';
  const notYet = month > today.month || (month === today.month && day > today.day);
  const year = notYet ? today.year - 1 : today.year;
  return day > daysInMonth(year, month) ? 'no-such-date' : { year, month, day };
}

export function readLineDate(text: string, today: CalDate): LineDate | 'no-such-date' {
  const relative = RELATIVE_DATE.exec(text);
  if (relative) {
    const date = relative[1]!.toLowerCase() === 'today' ? today : daysBefore(today, 1);
    return { date, rest: relative[2]! };
  }
  const named = NAMED_DATE.exec(text);
  const slash = named ? null : SLASH_DATE.exec(text);
  const match = named ?? slash;
  if (!match) return { date: null, rest: text };
  const month = named ? monthNumber(named[2]!) : Number(slash![2]);
  const date = mostRecentPast(Number(match[1]), month, today);
  return date === 'no-such-date' ? date : { date, rest: match[3]! };
}

function parseIso(iso: string): CalDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) } : null;
}

export function parseSpendLine(line: string, today: CalDate, fallbackDate: string): SpendLine {
  const cleaned = line.trim().replace(/\s+/g, ' ');
  const dated = readLineDate(cleaned, today);
  if (dated === 'no-such-date') return { line: cleaned, ok: false, issue: 'no-such-date' };
  const date = dated.date ?? parseIso(fallbackDate);
  if (!date) return { line: cleaned, ok: false, issue: 'no-such-date' };
  const iso = isoDate(date);
  if (iso > isoDate(today)) return { line: cleaned, ok: false, issue: 'future' };
  if (iso < earliestSpendDate(today)) return { line: cleaned, ok: false, issue: 'too-old' };
  const { amountCents, note } = parseSpendText(dated.rest);
  if (amountCents === null) return { line: cleaned, ok: false, issue: 'no-amount' };
  if (amountCents === 0) return { line: cleaned, ok: false, issue: 'zero-amount' };
  return { line: cleaned, ok: true, date: iso, dateFromLine: dated.date !== null, amountCents, note };
}

export function parseSpendBlock(text: string, today: CalDate, fallbackDate: string): SpendLine[] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => parseSpendLine(line, today, fallbackDate));
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
  const lines = parseSpendBlock(draft.text, today, draft.date);
  return lines.length === 1 ? lines[0]!.ok : lines.some((line) => line.ok);
}

export function spendFromLine(
  line: Extract<SpendLine, { ok: true }>,
  id: string | null,
  existing: Spend | undefined,
  newId: () => string,
  now: number,
): Spend {
  const spend: Spend = {
    id: id ?? newId(),
    owner: existing?.owner ?? DEFAULT_OWNER,
    amountCents: line.amountCents,
    date: line.date,
    loggedAt: existing?.loggedAt ?? now,
  };
  return line.note ? { ...spend, note: line.note } : spend;
}

export function spendFromDraft(draft: SpendDraft, existing: Spend | undefined, newId: () => string, now: number, today: CalDate): Spend {
  const line = parseSpendLine(draft.text, today, draft.date);
  if (!line.ok) throw new Error('A spend needs an amount and a date in the last 31 days');
  return spendFromLine(line, draft.id, existing, newId, now);
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
