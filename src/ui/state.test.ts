import { describe, expect, it } from 'vitest';
import {
  addItem,
  canSaveItem,
  canStart,
  chooseNotSure,
  CUSTOM,
  editItem,
  initialState,
  isBefore,
  isPriced,
  ITEM_CHOICES,
  ITEM_NAME_MAX,
  loadState,
  nextCustomId,
  numbersDone,
  removeItem,
  replaceItem,
  sameItem,
  setItemTarget,
  setNumber,
  setStartCustomName,
  toCalcItem,
  toggleStartItem,
} from './state';

const now = { year: 2026, month: 10 };
const today = { ...now, day: 21 };

describe('item choices', () => {
  it('lists the items in SPEC.md section 4, in order', () => {
    expect(ITEM_CHOICES.map((c) => c.name)).toEqual([
      'Travel',
      'First home',
      'Emergency fund',
      'Wedding',
      'Further studies',
      'Career break',
      'Big purchase',
    ]);
  });
});

describe('set-up screen 1', () => {
  it('needs items or not sure yet before continuing', () => {
    expect(canStart(initialState)).toBe(false);
    expect(canStart(toggleStartItem(initialState, 'travel'))).toBe(true);
    expect(canStart(chooseNotSure(initialState))).toBe(true);
  });

  it('makes items and not sure yet exclusive', () => {
    const notSure = chooseNotSure(toggleStartItem(initialState, 'travel'));
    expect(notSure).toMatchObject({ route: 'none', items: [] });
    expect(toggleStartItem(notSure, 'wedding')).toMatchObject({ route: 'items', items: [{ id: 'wedding' }] });
  });

  it('removes an item when it is tapped again', () => {
    expect(toggleStartItem(toggleStartItem(initialState, 'travel'), 'travel').items).toEqual([]);
  });

  it('needs a typed name for something else, capped in length', () => {
    const state = toggleStartItem(initialState, CUSTOM);
    expect(canStart(state)).toBe(false);
    expect(canStart(setStartCustomName(state, '  '))).toBe(false);
    expect(canStart(setStartCustomName(state, 'Pottery kiln'))).toBe(true);
    expect(setStartCustomName(state, 'x'.repeat(100)).items[0]?.name).toHaveLength(ITEM_NAME_MAX);
  });
});

describe('items', () => {
  it('starts unpriced, with the preset name', () => {
    expect(addItem(initialState, 'first-home').items).toEqual([
      {
        id: 'first-home',
        choice: 'first-home',
        name: 'First home',
        costCents: null,
        useFixedCostMonths: false,
        savedCents: null,
        target: { year: null, month: null },
      },
    ]);
  });

  it('gives each something else its own id', () => {
    const two = addItem(addItem(initialState, CUSTOM), CUSTOM);
    expect(two.items.map((i) => i.id)).toEqual(['custom-1', 'custom-2']);
    expect(nextCustomId(removeItem(two, 'custom-1').items)).toBe('custom-3');
  });

  it('is priced once it has a name, a price above zero and a date', () => {
    const item = addItem(initialState, 'travel').items[0]!;
    expect(isPriced(item)).toBe(false);
    expect(isPriced(editItem(item, { costCents: 100 }))).toBe(false);
    expect(isPriced(editItem(item, { costCents: 0, target: { year: 2027, month: 1 } }))).toBe(false);
    expect(isPriced(editItem(item, { costCents: 100, target: { year: 2027, month: 1 } }))).toBe(true);
    expect(isPriced(editItem(item, { name: ' ', costCents: 100, target: { year: 2027, month: 1 } }))).toBe(false);
  });

  it('lets the emergency fund use months of fixed costs in place of a price', () => {
    const fund = editItem(addItem(initialState, 'emergency-fund').items[0]!, { target: { year: 2027, month: 3 } });
    expect(isPriced(fund)).toBe(false);
    expect(isPriced(editItem(fund, { useFixedCostMonths: true }))).toBe(true);
  });

  it('only saves a date from this month on', () => {
    const item = editItem(addItem(initialState, 'travel').items[0]!, { costCents: 1, target: { year: 2026, month: 10 } });
    expect(canSaveItem(item, now)).toBe(true);
    expect(canSaveItem(item, { year: 2026, month: 11 })).toBe(false);
  });

  it('clears the month when a change of year would put it in the past', () => {
    const item = addItem(initialState, 'travel').items[0]!;
    const later = setItemTarget(item, { year: 2027, month: 9 }, now);
    expect(setItemTarget(later, { year: 2026, month: 9 }, now).target).toEqual({ year: 2026, month: null });
  });

  it('replaces, compares and removes items by id', () => {
    const state = addItem(addItem(initialState, 'travel'), 'wedding');
    const edited = editItem(state.items[1]!, { name: 'Our wedding' });
    const replaced = replaceItem(state, edited);
    expect(replaced.items.map((i) => i.name)).toEqual(['Travel', 'Our wedding']);
    expect(sameItem(edited, replaced.items[1]!)).toBe(true);
    expect(sameItem(edited, state.items[1]!)).toBe(false);
    expect(removeItem(replaced, 'travel').items.map((i) => i.id)).toEqual(['wedding']);
  });

  it('passes only priced items to the calculation, with blank savings as zero', () => {
    const item = addItem(initialState, 'travel').items[0]!;
    expect(toCalcItem(item)).toBeNull();
    expect(toCalcItem(editItem(item, { costCents: 600_000, target: { year: 2027, month: 6 } }))).toEqual({
      costCents: 600_000,
      useFixedCostMonths: false,
      savedCents: 0,
      targetMonth: { year: 2027, month: 6 },
    });
  });

  it('compares months across years', () => {
    expect(isBefore({ year: 2026, month: 12 }, { year: 2027, month: 1 })).toBe(true);
    expect(isBefore({ year: 2026, month: 10 }, { year: 2026, month: 10 })).toBe(false);
  });
});

describe('starting numbers', () => {
  it('needs pay and fixed costs', () => {
    expect(numbersDone(setNumber(initialState, 'payCents', 1))).toBe(false);
    expect(numbersDone(setNumber(setNumber(initialState, 'payCents', 1), 'fixedCents', 0))).toBe(true);
  });
});

describe('loadState', () => {
  it('starts fresh when nothing is saved, or saved progress is from a retired set-up', () => {
    expect(loadState(undefined, today)).toEqual(initialState);
    expect(loadState({ step: 'areas', route: 'areas', areas: ['home'] }, today)).toEqual(initialState);
  });

  it('starts set-up on the starting numbers', () => {
    expect(initialState.step).toBe('numbers');
  });

  it('resumes saved state', () => {
    const saved = { ...setNumber(setNumber(toggleStartItem(initialState, 'travel'), 'payCents', 1), 'fixedCents', 0), step: 'start' as const };
    expect(loadState(saved, today)).toEqual(saved);
  });

  it('moves progress from the old gated set-up to the matching new step, keeping items', () => {
    const items = [{ choice: 'travel', name: 'Travel', costCents: 100 }];
    expect(loadState({ step: 'items', route: 'items', items, numbers: { payCents: 1, fixedCents: 1 } }, today).step).toBe('start');
    expect(loadState({ step: 'prices', route: 'items', items }, today).step).toBe('numbers');
    const done = loadState({ step: 'done', route: 'items', items, numbers: { payCents: 1, fixedCents: 1 } }, today);
    expect(done).toMatchObject({ step: 'today', setupDate: today });
    expect(done.items[0]).toMatchObject({ id: 'travel', costCents: 100, useFixedCostMonths: false });
  });

  it('sends people back to their numbers if a later step was reached without them', () => {
    expect(loadState({ step: 'done', route: 'none', items: [] }, today).step).toBe('numbers');
    expect(loadState({ step: 'start', route: 'items', items: [] }, today).step).toBe('numbers');
  });

  it('drops retired items', () => {
    const saved = { step: 'start', route: 'items', items: [{ choice: 'family', name: 'Supporting family' }] };
    expect(loadState(saved, today).items).toEqual([]);
  });
});
