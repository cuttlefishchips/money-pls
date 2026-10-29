import { describe, expect, it } from 'vitest';
import {
  addItem,
  canSaveItem,
  canStart,
  answerGoals,
  finishSetUp,
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
  recordSavings,
  reopenGoals,
  setBudget,
  setEntry,
  switchToPay,
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

describe('goal card on Today', () => {
  it('needs at least one named item to continue', () => {
    expect(canStart(initialState)).toBe(false);
    expect(canStart(toggleStartItem(initialState, 'travel'))).toBe(true);
  });

  it('records the answer only when the card is answered', () => {
    const picked = toggleStartItem(initialState, 'travel');
    expect(picked).toMatchObject({ route: null, goalsAnswered: false });
    expect(answerGoals(picked, 'items')).toMatchObject({ route: 'items', goalsAnswered: true, items: [{ id: 'travel' }] });
  });

  it('clears unconfirmed picks on not now and keeps the floor route', () => {
    expect(answerGoals(toggleStartItem(initialState, 'travel'), 'none')).toMatchObject({ route: 'none', goalsAnswered: true, items: [] });
  });

  it('can be reopened, keeping the first answer as the route', () => {
    const notNow = answerGoals(initialState, 'none');
    const reopened = toggleStartItem(reopenGoals(notNow), 'wedding');
    expect(reopened.goalsAnswered).toBe(false);
    expect(answerGoals(reopened, 'items')).toMatchObject({ route: 'none', items: [{ id: 'wedding' }] });
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

  it('needs only the budget on the budget route', () => {
    const budget = setEntry(initialState, 'budget');
    expect(numbersDone(budget)).toBe(false);
    expect(numbersDone(setBudget(budget, 0))).toBe(true);
  });

  it('goes straight to Today and remembers how the person started', () => {
    const done = finishSetUp(setBudget(setEntry(initialState, 'budget'), 100_000), today);
    expect(done).toMatchObject({ step: 'today', entry: 'budget', startEntry: 'budget', setupDate: today, goalsAnswered: false });
  });

  it('switches a budget person to pay, keeping how they started', () => {
    const budget = finishSetUp(setBudget(setEntry(initialState, 'budget'), 100_000), today);
    expect(switchToPay(budget)).toMatchObject({ entry: 'pay', startEntry: 'budget', budgetCents: null });
  });
});

describe('savings checks', () => {
  it('keeps one entry per month, owned by me', () => {
    const once = recordSavings(initialState, now, 500_000);
    const again = recordSavings(once, now, 600_000);
    expect(again.savingsChecks).toEqual([{ owner: 'me', year: 2026, month: 10, totalCents: 600_000 }]);
  });

  it('records a skipped month as no total', () => {
    expect(recordSavings(initialState, now, null).savingsChecks[0]?.totalCents).toBeNull();
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
    const saved = recordSavings(answerGoals(finishSetUp(setBudget(setEntry(initialState, 'budget'), 1), today), 'items'), now, 1);
    expect(loadState(JSON.parse(JSON.stringify(saved)), today)).toEqual(saved);
  });

  it('moves progress from older set-ups to Today, keeping items and numbers', () => {
    const items = [{ choice: 'travel', name: 'Travel', costCents: 100 }];
    const numbers = { payCents: 1, fixedCents: 1 };
    const done = loadState({ step: 'done', route: 'items', items, numbers }, today);
    expect(done).toMatchObject({ step: 'today', entry: 'pay', startEntry: 'pay', route: 'items', goalsAnswered: true, setupDate: today, savingsChecks: [] });
    expect(done.items[0]).toMatchObject({ id: 'travel', costCents: 100, useFixedCostMonths: false });
    expect(loadState({ step: 'prices', route: 'items', items }, today).step).toBe('numbers');
  });

  it('turns an unanswered goals screen from the old set-up into the goal card, keeping the picks', () => {
    const saved = { step: 'start', route: 'items', items: [{ choice: 'travel', name: 'Travel' }], numbers: { payCents: 1, fixedCents: 1 }, setupDate: today };
    expect(loadState(saved, today)).toMatchObject({ step: 'today', route: null, goalsAnswered: false, items: [{ id: 'travel' }] });
  });

  it('keeps an answered Today from the previous build as answered', () => {
    const saved = { step: 'today', route: 'none', items: [], numbers: { payCents: 1, fixedCents: 1 }, setupDate: today, welcomeSeen: true };
    expect(loadState(saved, today)).toMatchObject({ route: 'none', goalsAnswered: true, welcomeSeen: true });
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
