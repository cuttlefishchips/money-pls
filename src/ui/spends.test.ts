import { describe, expect, it } from 'vitest';
import type { Spend } from '../storage';
import {
  canSaveSpend,
  daysBefore,
  draftFromSpend,
  earliestSpendDate,
  isoDate,
  newSpendDraft,
  spendFromDraft,
  spendsThisMonth,
} from './spends';

const today = { year: 2026, month: 10, day: 26 };

describe('dates', () => {
  it('formats calendar dates as YYYY-MM-DD', () => {
    expect(isoDate({ year: 2026, month: 3, day: 7 })).toBe('2026-03-07');
  });

  it('counts back across month and year boundaries', () => {
    expect(daysBefore({ year: 2026, month: 1, day: 2 }, 3)).toEqual({ year: 2025, month: 12, day: 30 });
  });

  it('allows spends from the last 31 days, including today', () => {
    expect(earliestSpendDate(today)).toBe('2026-09-26');
  });
});

describe('canSaveSpend', () => {
  it('starts as a new spend dated today with no amount', () => {
    expect(newSpendDraft(today)).toEqual({ id: null, amountCents: null, date: '2026-10-26' });
    expect(canSaveSpend(newSpendDraft(today), today)).toBe(false);
  });

  it('needs an amount above zero', () => {
    expect(canSaveSpend({ ...newSpendDraft(today), amountCents: 0 }, today)).toBe(false);
    expect(canSaveSpend({ ...newSpendDraft(today), amountCents: 1 }, today)).toBe(true);
  });

  it('needs a date in the last 31 days and not in the future', () => {
    const draft = { id: null, amountCents: 500 };
    expect(canSaveSpend({ ...draft, date: '2026-09-26' }, today)).toBe(true);
    expect(canSaveSpend({ ...draft, date: '2026-09-25' }, today)).toBe(false);
    expect(canSaveSpend({ ...draft, date: '2026-10-27' }, today)).toBe(false);
    expect(canSaveSpend({ ...draft, date: '' }, today)).toBe(false);
  });
});

describe('spendFromDraft', () => {
  it('creates a new spend owned by me, logged now', () => {
    const spend = spendFromDraft({ id: null, amountCents: 1_250, date: '2026-10-26' }, undefined, () => 'new-id', 1000);
    expect(spend).toEqual({ id: 'new-id', owner: 'me', amountCents: 1_250, date: '2026-10-26', loggedAt: 1000 });
  });

  it('keeps the id, owner and logged time when editing', () => {
    const existing: Spend = { id: 'a', owner: 'me', amountCents: 500, date: '2026-10-20', loggedAt: 5 };
    const edited = spendFromDraft({ ...draftFromSpend(existing), amountCents: 700 }, existing, () => 'unused', 9_999);
    expect(edited).toEqual({ ...existing, amountCents: 700 });
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
