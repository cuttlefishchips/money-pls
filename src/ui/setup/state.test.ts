import { describe, expect, it } from 'vitest';
import {
  canContinue,
  isBefore,
  nextStep,
  setItemCost,
  setItemName,
  setNumber,
  setTarget,
  targetMonth,
  chooseRoute,
  CUSTOM,
  CUSTOM_NAME_MAX,
  initialSetup,
  ITEM_CHOICES,
  loadSetup,
  previousStep,
  setCustomName,
  stepAfterRoute,
  toggleItem,
  type SetupState,
} from './state';

const now = { year: 2026, month: 10 };

const onItems: SetupState = { ...initialSetup, step: 'items', route: 'items' };

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

describe('set-up routes', () => {
  it('goes from the route choice to items, or to starting numbers', () => {
    expect(stepAfterRoute('items')).toBe('items');
    expect(stepAfterRoute('none')).toBe('numbers');
  });

  it('needs a route before continuing', () => {
    expect(canContinue(initialSetup, now)).toBe(false);
    expect(canContinue(chooseRoute(initialSetup, 'none'), now)).toBe(true);
  });

  it('goes back along the route the person took', () => {
    const picked = toggleItem(onItems, 'travel');
    expect(previousStep(onItems)).toBe('route');
    expect(previousStep({ ...picked, step: 'prices' })).toBe('items');
    expect(previousStep({ ...picked, step: 'date' })).toBe('prices');
    expect(previousStep({ ...picked, step: 'numbers' })).toBe('date');
    expect(previousStep({ ...initialSetup, route: 'none', step: 'numbers' })).toBe('route');
    expect(previousStep({ ...picked, step: 'result' })).toBe('numbers');
  });
});

describe('picking items', () => {
  it('needs at least one item before continuing', () => {
    expect(canContinue(onItems, now)).toBe(false);
    expect(canContinue(toggleItem(onItems, 'travel'), now)).toBe(true);
  });

  it('pre-fills the name of a picked item, with no price yet', () => {
    const state = toggleItem(toggleItem(onItems, 'first-home'), 'wedding');
    expect(state.items).toEqual([
      { choice: 'first-home', name: 'First home', costCents: null },
      { choice: 'wedding', name: 'Wedding', costCents: null },
    ]);
  });

  it('allows any number of items', () => {
    let state = onItems;
    for (const choice of ITEM_CHOICES) state = toggleItem(state, choice.id);
    expect(state.items).toHaveLength(ITEM_CHOICES.length);
  });

  it('removes an item when it is tapped again', () => {
    expect(toggleItem(toggleItem(onItems, 'travel'), 'travel').items).toEqual([]);
  });

  it('starts something else unnamed, and needs a name before continuing', () => {
    const state = toggleItem(onItems, CUSTOM);
    expect(state.items).toEqual([{ choice: CUSTOM, name: '', costCents: null }]);
    expect(canContinue(state, now)).toBe(false);
    expect(canContinue(setCustomName(state, '   '), now)).toBe(false);
    expect(canContinue(setCustomName(state, 'Pottery kiln'), now)).toBe(true);
  });

  it('caps the typed name length', () => {
    const state = setCustomName(toggleItem(onItems, CUSTOM), 'x'.repeat(100));
    expect(state.items[0]?.name).toHaveLength(CUSTOM_NAME_MAX);
  });
});

describe('loadSetup', () => {
  it('starts fresh when nothing is saved', () => {
    expect(loadSetup(undefined)).toEqual(initialSetup);
  });

  it('resumes saved progress', () => {
    const saved = toggleItem(onItems, 'travel');
    expect(loadSetup(saved)).toEqual(saved);
  });

  it('starts fresh when saved progress is from the retired three-route set-up', () => {
    expect(loadSetup({ step: 'areas', route: 'areas', areas: ['home'] })).toEqual(initialSetup);
    expect(loadSetup({ step: 'items', route: 'one', items: [] })).toEqual(initialSetup);
  });

  it('drops retired monthly items and their type from saved progress', () => {
    const saved = {
      step: 'items',
      route: 'items',
      items: [
        { choice: 'travel', name: 'Travel', kind: 'one-off', costCents: null },
        { choice: 'family', name: 'Supporting family', kind: 'monthly', costCents: null },
      ],
    };
    expect(loadSetup(saved).items).toEqual([{ choice: 'travel', name: 'Travel', costCents: null }]);
  });

  it('sends the person back to pick items when saved items were dropped after that step', () => {
    const saved = {
      step: 'prices',
      route: 'items',
      items: [{ choice: 'everyday', name: 'A better everyday life', kind: 'monthly', costCents: null }],
    };
    expect(loadSetup(saved)).toEqual({ ...initialSetup, step: 'items', route: 'items' });
  });
});

describe('moving forward', () => {
  it('follows each route through the set-up steps', () => {
    const items = { ...onItems, step: 'route' as const };
    expect(nextStep(items)).toBe('items');
    expect(nextStep({ ...items, step: 'items' })).toBe('prices');
    expect(nextStep({ ...items, step: 'prices' })).toBe('date');
    expect(nextStep({ ...items, step: 'date' })).toBe('numbers');
    expect(nextStep({ ...items, step: 'numbers' })).toBe('result');
    expect(nextStep({ ...initialSetup, route: 'none' })).toBe('numbers');
  });
});

describe('pricing items', () => {
  const onPrices: SetupState = { ...toggleItem(toggleItem(onItems, 'travel'), 'wedding'), step: 'prices' };

  it('needs a price above zero on every item', () => {
    expect(canContinue(onPrices, now)).toBe(false);
    const one = setItemCost(onPrices, 0, 500_000);
    expect(canContinue(one, now)).toBe(false);
    expect(canContinue(setItemCost(one, 1, 0), now)).toBe(false);
    expect(canContinue(setItemCost(one, 1, 2_000_000), now)).toBe(true);
  });

  it('lets the person rename an item, and needs a name', () => {
    const priced = setItemCost(setItemCost(onPrices, 0, 1), 1, 1);
    const renamed = setItemName(priced, 0, 'Japan in spring');
    expect(renamed.items[0]?.name).toBe('Japan in spring');
    expect(renamed.items[1]?.name).toBe('Wedding');
    expect(canContinue(setItemName(priced, 1, ' '), now)).toBe(false);
  });
});

describe('picking a target month', () => {
  const onDate: SetupState = { ...onItems, step: 'date' };

  it('needs both a month and a year', () => {
    expect(canContinue(onDate, now)).toBe(false);
    expect(canContinue(setTarget(onDate, { year: 2027, month: null }, now), now)).toBe(false);
    expect(targetMonth(setTarget(onDate, { year: 2027, month: 6 }, now))).toEqual({ year: 2027, month: 6 });
  });

  it('allows this month or later', () => {
    expect(canContinue(setTarget(onDate, { year: 2026, month: 10 }, now), now)).toBe(true);
    expect(canContinue(setTarget(onDate, { year: 2028, month: 1 }, now), now)).toBe(true);
  });

  it('clears the month when the choice would be in the past, such as after changing the year', () => {
    const later = setTarget(onDate, { year: 2027, month: 9 }, now);
    const earlier = setTarget(later, { year: 2026, month: 9 }, now);
    expect(earlier.target).toEqual({ year: 2026, month: null });
    expect(canContinue(earlier, now)).toBe(false);
  });

  it('does not continue with a saved month that has since passed', () => {
    const saved: SetupState = { ...onDate, target: { year: 2026, month: 9 } };
    expect(canContinue(saved, now)).toBe(false);
  });

  it('compares months across years', () => {
    expect(isBefore({ year: 2026, month: 12 }, { year: 2027, month: 1 })).toBe(true);
    expect(isBefore({ year: 2027, month: 1 }, { year: 2026, month: 12 })).toBe(false);
    expect(isBefore({ year: 2026, month: 10 }, { year: 2026, month: 10 })).toBe(false);
  });
});

describe('starting numbers', () => {
  const onNumbers: SetupState = { ...onItems, step: 'numbers' };

  it('needs pay, fixed costs and savings on the items route, where savings can be zero', () => {
    let state = setNumber(setNumber(onNumbers, 'payCents', 500_000), 'fixedCents', 300_000);
    expect(canContinue(state, now)).toBe(false);
    state = setNumber(state, 'savingsCents', 0);
    expect(canContinue(state, now)).toBe(true);
  });

  it('does not ask for savings on the not sure yet route', () => {
    const state: SetupState = { ...initialSetup, route: 'none', step: 'numbers' };
    expect(canContinue(state, now)).toBe(false);
    expect(canContinue(setNumber(setNumber(state, 'payCents', 1), 'fixedCents', 0), now)).toBe(true);
  });

  it('treats a cleared field as missing', () => {
    const state = setNumber(setNumber(setNumber(onNumbers, 'payCents', 1), 'fixedCents', 1), 'savingsCents', 1);
    expect(canContinue(setNumber(state, 'payCents', null), now)).toBe(false);
  });
});

describe('loadSetup defaults', () => {
  it('fills in the target and numbers for progress saved before they existed', () => {
    const saved = { step: 'items', route: 'items', items: [] };
    expect(loadSetup(saved)).toEqual({ ...initialSetup, step: 'items', route: 'items' });
  });
});
