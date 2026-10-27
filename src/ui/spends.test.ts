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
    const withNote = spendFromDraft({ ...newSpendDraft(today), text: '12.50 white beehoon' }, undefined, () => 'id', 1000);
    expect(withNote).toEqual({ id: 'id', owner: 'me', amountCents: 1_250, date: '2026-10-27', loggedAt: 1000, note: 'white beehoon' });
    const noNote = spendFromDraft({ ...newSpendDraft(today), text: '3' }, undefined, () => 'id2', 1000);
    expect(noNote).not.toHaveProperty('note');
  });

  it('edits a spend through the same text box, keeping its id and logged time', () => {
    const existing: Spend = { id: 'a', owner: 'me', amountCents: 1_250, date: '2026-10-20', loggedAt: 5, note: 'white beehoon' };
    const draft = draftFromSpend(existing, today);
    expect(draft).toEqual({ id: 'a', text: '12.50 white beehoon', date: '2026-10-20', picking: true });
    expect(spendFromDraft({ ...draft, text: '9 white beehoon' }, existing, () => 'x', 999)).toEqual({ ...existing, amountCents: 900 });
    expect(spendFromDraft({ ...draft, text: '9' }, existing, () => 'x', 999)).not.toHaveProperty('note');
  });

  it('refuses a draft with no amount', () => {
    expect(() => spendFromDraft(newSpendDraft(today), undefined, () => 'x', 0)).toThrow();
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
