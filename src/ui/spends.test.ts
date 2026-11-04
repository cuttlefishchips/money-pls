import { describe, expect, it } from 'vitest';
import type { Spend } from '../storage';
import {
  canSaveSpend,
  caughtUpDate,
  dayLabel,
  daysAgo,
  daysBefore,
  draftFromSpend,
  earliestSpendDate,
  isoDate,
  isStale,
  newSpendDraft,
  NOTE_MAX,
  parseSpendBlock,
  parseSpendLine,
  parseSpendText,
  spendFromDraft,
  spendsThisMonth,
} from './spends';

const today = { year: 2026, month: 10, day: 27 };

describe('parseSpendText', () => {
  it.each([
    ['12.50 white beehoon', 1_250, 'white beehoon'],
    ['12.5 white beehoon', 1_250, 'white beehoon'],
    ['$4 kopi', 400, 'kopi'],
    ['S$1,200 flight', 120_000, 'flight'],
    ['white beehoon 12.50', 1_250, 'white beehoon'],
    ['  7   taxi   home ', 700, 'taxi home'],
    ['12.50', 1_250, ''],
    ['2 kopi 3.20', 200, 'kopi 3.20'],
  ])('reads %j as %i cents with note %j', (text, cents, note) => {
    expect(parseSpendText(text)).toEqual({ amountCents: cents, note });
  });

  it.each(['', 'white beehoon', '12.345 noodles', '-5 refund'])('finds no amount in %j', (text) => {
    expect(parseSpendText(text).amountCents).toBeNull();
  });

  it('caps the note length', () => {
    expect(parseSpendText(`5 ${'x'.repeat(100)}`).note).toHaveLength(NOTE_MAX);
  });
});

describe('parseSpendLine', () => {
  const now = { year: 2026, month: 11, day: 4 };
  const field = '2026-11-01';
  const read = (line: string, fallback = field) => parseSpendLine(line, now, fallback);

  it.each([
    ['2 Nov 5.50 kopi', '2026-11-02'],
    ['2 November 5.50 kopi', '2026-11-02'],
    ['2/11 5.50 kopi', '2026-11-02'],
    ['today 5.50 kopi', '2026-11-04'],
    ['yesterday 5.50 kopi', '2026-11-03'],
    ['2 NOV 5.50 kopi', '2026-11-02'],
    ['Today 5.50 kopi', '2026-11-04'],
    ['28 Sept 5.50 kopi', '2026-09-28'],
  ])('reads the date in %j as %s', (line, date) => {
    const result = read(line);
    if (date < '2026-10-05') expect(result).toMatchObject({ ok: false, issue: 'too-old' });
    else expect(result).toEqual({ line, ok: true, date, dateFromLine: true, amountCents: 550, note: 'kopi' });
  });

  it('reads day first, as in Singapore', () => {
    expect(read('4/10 5')).toMatchObject({ ok: false, issue: 'too-old' });
    expect(read('10/4 5')).toMatchObject({ ok: false, issue: 'too-old' });
    expect(read('31/10 5')).toMatchObject({ ok: true, date: '2026-10-31' });
  });

  it('uses the most recent past occurrence, never a future date', () => {
    expect(read('3 Nov 5')).toMatchObject({ ok: true, date: '2026-11-03' });
    expect(read('5 Nov 5')).toMatchObject({ ok: false, issue: 'too-old' });
    expect(read('30/11 5')).toMatchObject({ ok: false, issue: 'too-old' });
  });

  it('flags dates more than 31 days back instead of saving them', () => {
    expect(read('5 Oct 5')).toMatchObject({ ok: true, date: '2026-10-05' });
    expect(read('4 Oct 5')).toMatchObject({ ok: false, issue: 'too-old' });
  });

  it.each(['31/11 5', '30 Feb 5', '0/11 5', '5/13 5', '0 Nov 5'])('flags the impossible date in %j', (line) => {
    expect(read(line)).toMatchObject({ ok: false, issue: 'no-such-date' });
  });

  it('uses the date field for a line with no date', () => {
    expect(read('5.50 kopi')).toEqual({ line: '5.50 kopi', ok: true, date: field, dateFromLine: false, amountCents: 550, note: 'kopi' });
    expect(read('kopi 5.50')).toMatchObject({ ok: true, date: field, amountCents: 550, note: 'kopi' });
  });

  it("lets a line's own date win over the date field", () => {
    expect(read('2 Nov 5', '2026-11-03')).toMatchObject({ ok: true, date: '2026-11-02', dateFromLine: true });
    expect(read('today 5', '2026-10-20')).toMatchObject({ ok: true, date: '2026-11-04', dateFromLine: true });
  });

  it('reads the amount at the start or the end, with or without a date', () => {
    expect(read('2 Nov kopi 1.80')).toMatchObject({ ok: true, date: '2026-11-02', amountCents: 180, note: 'kopi' });
    expect(read('yesterday $12 taxi')).toMatchObject({ ok: true, date: '2026-11-03', amountCents: 1_200, note: 'taxi' });
  });

  it('keeps a note that starts with a number', () => {
    expect(read('1.80 3 in 1 coffee')).toMatchObject({ ok: true, amountCents: 180, note: '3 in 1 coffee' });
    expect(read('2 Nov 1.80 3 in 1 coffee')).toMatchObject({ ok: true, date: '2026-11-02', amountCents: 180, note: '3 in 1 coffee' });
  });

  it('does not read a month inside a longer word as a date', () => {
    expect(read('2 novena candles')).toMatchObject({ ok: true, date: field, amountCents: 200, note: 'novena candles' });
  });

  it('flags a date followed by words and no amount, rather than guessing', () => {
    expect(read('2 nov groceries')).toMatchObject({ ok: false, issue: 'no-amount' });
  });

  it.each([
    ['white beehoon', 'no-amount'],
    ['yesterday', 'no-amount'],
    ['0 kopi', 'zero-amount'],
    ['12.345 noodles', 'no-amount'],
  ])('flags the unreadable line %j', (line, issue) => {
    expect(read(line)).toMatchObject({ ok: false, issue });
  });

  it('flags a date field in the future or more than 31 days back', () => {
    expect(read('5', '2026-11-05')).toMatchObject({ ok: false, issue: 'future' });
    expect(read('5', '2026-10-04')).toMatchObject({ ok: false, issue: 'too-old' });
  });
});

describe('parseSpendBlock', () => {
  const now = { year: 2026, month: 11, day: 4 };

  it('reads each non-empty line of a pasted block, keeping flagged lines in place', () => {
    const block = '2 Nov 5.50 kopi\n\n  3/11 taxi 12\nwhite beehoon\r\n4.20 bread\n';
    const lines = parseSpendBlock(block, now, '2026-11-04');
    expect(lines.map((l) => (l.ok ? `${l.date} ${l.amountCents} ${l.note}` : `flag ${l.issue}`))).toEqual([
      '2026-11-02 550 kopi',
      '2026-11-03 1200 taxi',
      'flag no-amount',
      '2026-11-04 420 bread',
    ]);
  });
});

describe('dates', () => {
  it('formats and counts calendar dates across boundaries', () => {
    expect(isoDate({ year: 2026, month: 3, day: 7 })).toBe('2026-03-07');
    expect(daysBefore({ year: 2026, month: 1, day: 2 }, 3)).toEqual({ year: 2025, month: 12, day: 30 });
    expect(daysAgo({ year: 2026, month: 9, day: 30 }, today)).toBe(27);
  });

  it('allows spends from the last 31 days, including today', () => {
    expect(earliestSpendDate(today)).toBe('2026-09-27');
  });

  it('labels today and yesterday in words', () => {
    expect(dayLabel(today, today)).toBe('today');
    expect(dayLabel({ ...today, day: 26 }, today)).toBe('yesterday');
    expect(dayLabel({ ...today, day: 24 }, today)).toBe('Sat, 24 Oct');
  });
});

describe('drafts', () => {
  it('starts on today with the date picker closed', () => {
    expect(newSpendDraft(today)).toEqual({ id: null, text: '', date: '2026-10-27', picking: false });
    expect(newSpendDraft(today, '2026-10-26').picking).toBe(false);
    expect(newSpendDraft(today, '2026-10-20').picking).toBe(true);
  });

  it('needs one readable line, or at least one readable line in a block', () => {
    const draft = newSpendDraft(today);
    expect(canSaveSpend({ ...draft, text: '1 kopi\nwhite beehoon' }, today)).toBe(true);
    expect(canSaveSpend({ ...draft, text: 'kopi\nwhite beehoon' }, today)).toBe(false);
  });

  it('saves a single line with its own date', () => {
    const spend = spendFromDraft({ ...newSpendDraft(today), text: 'yesterday 4 kopi' }, undefined, () => 'id', 1000, today);
    expect(spend).toMatchObject({ date: '2026-10-26', amountCents: 400, note: 'kopi' });
  });

  it('needs an amount above zero and a date in the last 31 days, not the future', () => {
    const draft = newSpendDraft(today);
    expect(canSaveSpend(draft, today)).toBe(false);
    expect(canSaveSpend({ ...draft, text: '0 nothing' }, today)).toBe(false);
    expect(canSaveSpend({ ...draft, text: 'kopi' }, today)).toBe(false);
    expect(canSaveSpend({ ...draft, text: '1.20 kopi' }, today)).toBe(true);
    expect(canSaveSpend({ ...draft, text: '1', date: '2026-09-27' }, today)).toBe(true);
    expect(canSaveSpend({ ...draft, text: '1', date: '2026-09-26' }, today)).toBe(false);
    expect(canSaveSpend({ ...draft, text: '1', date: '2026-10-28' }, today)).toBe(false);
  });

  it('builds a new spend with its note, and leaves the note out when empty', () => {
    const withNote = spendFromDraft({ ...newSpendDraft(today), text: '12.50 white beehoon' }, undefined, () => 'id', 1000, today);
    expect(withNote).toEqual({ id: 'id', owner: 'me', amountCents: 1_250, date: '2026-10-27', loggedAt: 1000, note: 'white beehoon' });
    const noNote = spendFromDraft({ ...newSpendDraft(today), text: '3' }, undefined, () => 'id2', 1000, today);
    expect(noNote).not.toHaveProperty('note');
  });

  it('edits a spend through the same text box, keeping its id and logged time', () => {
    const existing: Spend = { id: 'a', owner: 'me', amountCents: 1_250, date: '2026-10-20', loggedAt: 5, note: 'white beehoon' };
    const draft = draftFromSpend(existing, today);
    expect(draft).toEqual({ id: 'a', text: '12.50 white beehoon', date: '2026-10-20', picking: true });
    expect(spendFromDraft({ ...draft, text: '9 white beehoon' }, existing, () => 'x', 999, today)).toEqual({ ...existing, amountCents: 900 });
    expect(spendFromDraft({ ...draft, text: '9' }, existing, () => 'x', 999, today)).not.toHaveProperty('note');
  });

  it('refuses a draft with no amount', () => {
    expect(() => spendFromDraft(newSpendDraft(today), undefined, () => 'x', 0, today)).toThrow();
  });
});

describe('spendsThisMonth', () => {
  it('lists only this month, newest first', () => {
    const spend = (id: string, date: string, loggedAt: number): Spend => ({ id, owner: 'me', amountCents: 100, date, loggedAt });
    const list = spendsThisMonth(
      [spend('old', '2026-09-30', 1), spend('a', '2026-10-01', 2), spend('b', '2026-10-20', 3), spend('c', '2026-10-20', 4)],
      today,
    );
    expect(list.map((s) => s.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('last caught up', () => {
  it('is the day of the last spend change, whatever date the spend is for', () => {
    expect(caughtUpDate(new Date(2026, 9, 25, 21, 0).getTime(), { year: 2026, month: 10, day: 1 }, today)).toEqual({
      year: 2026,
      month: 10,
      day: 25,
    });
  });

  it('falls back to the set-up day before any spend', () => {
    expect(caughtUpDate(null, { year: 2026, month: 10, day: 26 }, today)).toEqual({ year: 2026, month: 10, day: 26 });
  });

  it('is stale from two days ago', () => {
    expect(isStale(today, today)).toBe(false);
    expect(isStale({ ...today, day: 26 }, today)).toBe(false);
    expect(isStale({ ...today, day: 25 }, today)).toBe(true);
  });
});
