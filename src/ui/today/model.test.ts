import { describe, expect, it } from 'vitest';
import { addItem, editItem, initialState, setNumber, type AppState } from '../state';
import { buildToday, spentThisMonth } from './model';

const today = { year: 2026, month: 10, day: 21 };
const setupDate = today;

function withNumbers(state: AppState, pay = 620_000, fixed = 310_000): AppState {
  return { ...setNumber(setNumber(state, 'payCents', pay), 'fixedCents', fixed), step: 'today', setupDate };
}

function priced(state: AppState, id: string, cents: number, year: number, month: number, saved = 0): AppState {
  return {
    ...state,
    items: state.items.map((item) =>
      item.id === id ? editItem(item, { costCents: cents, savedCents: saved, target: { year, month } }) : item,
    ),
  };
}

describe('buildToday', () => {
  it('uses the floor route until an item is priced, while you build your safety floor', () => {
    const state = withNumbers(addItem(addItem(initialState, 'travel'), 'wedding'));
    const model = buildToday({ state, spentCents: 0, today });
    expect(model).toMatchObject({
      mode: 'floor',
      status: 'ok',
      tiedTo: null,
      setAsideCents: 124_000,
      leftCents: 186_000,
      floorCents: 930_000,
      pace: 'within',
    });
    expect(model.goals).toEqual([
      { id: 'travel', name: 'Travel', priced: false },
      { id: 'wedding', name: 'Wedding', priced: false },
    ]);
  });

  it('switches to the target route over priced items only once one is priced', () => {
    let state = withNumbers(addItem(addItem(initialState, 'travel'), 'wedding'));
    state = priced(state, 'travel', 600_000, 2027, 6, 100_000);
    const model = buildToday({ state, spentCents: 0, today });
    expect(model).toMatchObject({
      mode: 'target',
      status: 'ok',
      tiedTo: 'Travel',
      setAsideCents: 124_000,
      leftCents: 186_000,
      safetyCoversGoals: true,
    });
    expect(model.goals[0]).toMatchObject({ priced: true, plan: { monthlyAmountCents: 55_556 } });
    expect(model.goals[1]).toEqual({ id: 'wedding', name: 'Wedding', priced: false });
  });

  it('keeps the floor saving when it is more than the priced goals need, so the daily number does not rise', () => {
    const floorOnly = withNumbers(addItem(initialState, 'travel'));
    const pricedState = priced(floorOnly, 'travel', 600_000, 2027, 6, 100_000);
    expect(buildToday({ state: pricedState, spentCents: 0, today }).dailyCents).toBe(
      buildToday({ state: floorOnly, spentCents: 0, today }).dailyCents,
    );
  });

  it('sets aside the goals total once it is more than the floor saving', () => {
    const state = priced(withNumbers(addItem(initialState, 'travel')), 'travel', 1_200_000, 2027, 1);
    expect(buildToday({ state, spentCents: 0, today })).toMatchObject({
      setAsideCents: 300_000,
      leftCents: 10_000,
      safetyCoversGoals: false,
    });
  });

  it('prorates the daily number from the set-up day', () => {
    const state = priced(withNumbers(addItem(initialState, 'travel')), 'travel', 600_000, 2027, 6, 100_000);
    expect(buildToday({ state, spentCents: 0, today }).dailyCents).toBe(Math.floor(Math.floor((186_000 * 11) / 31) / 11));
  });

  it('ties the number to the soonest unfinished goal and uses it for the delay', () => {
    let state = withNumbers(addItem(addItem(initialState, 'travel'), 'wedding'), 1_000_000, 310_000);
    state = priced(state, 'travel', 600_000, 2027, 6);
    state = priced(state, 'wedding', 300_000, 2027, 1);
    const model = buildToday({ state, spentCents: 1_000_000, today });
    expect(model.tiedTo).toBe('Wedding');
    expect(model.pace).toBe('over');
    expect(model.delayWeeks).toBeGreaterThan(0);
  });

  it('shows the goals need more than is available, with no daily number', () => {
    let state = withNumbers(addItem(addItem(initialState, 'travel'), 'emergency-fund'), 520_000, 310_000);
    state = priced(state, 'travel', 600_000, 2027, 6, 100_000);
    state = {
      ...state,
      items: state.items.map((i) => (i.id === 'emergency-fund' ? editItem(i, { useFixedCostMonths: true, target: { year: 2027, month: 3 } }) : i)),
    };
    const model = buildToday({ state, spentCents: 0, today });
    expect(model).toMatchObject({ status: 'needs-more', neededCents: 210_556, availableCents: 210_000, dailyCents: null });
    expect(model.goals[1]).toMatchObject({ priced: true, usesFixedCosts: true, plan: { priceCents: 930_000 } });
  });

  it('asks to check the numbers when fixed costs leave nothing, on either route', () => {
    const floor = withNumbers(addItem(initialState, 'travel'), 300_000, 310_000);
    expect(buildToday({ state: floor, spentCents: 0, today }).status).toBe('check-numbers');
    const target = priced(floor, 'travel', 100_000, 2027, 1);
    expect(buildToday({ state: target, spentCents: 0, today }).status).toBe('check-numbers');
  });

  it('has no goal to tie to when every priced goal is covered', () => {
    const state = priced(withNumbers(addItem(initialState, 'travel')), 'travel', 100_000, 2027, 1, 100_000);
    expect(buildToday({ state, spentCents: 0, today })).toMatchObject({ mode: 'target', tiedTo: null, setAsideCents: 124_000 });
  });
});

describe('spentThisMonth', () => {
  it('adds up only spends dated in the current month', () => {
    const spends = [
      { date: '2026-10-01', amountCents: 500 },
      { date: '2026-10-21', amountCents: 250 },
      { date: '2026-09-30', amountCents: 9_999 },
      { date: '2025-10-05', amountCents: 9_999 },
    ];
    expect(spentThisMonth(spends, today)).toBe(750);
  });
});
