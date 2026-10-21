import { describe, expect, it } from 'vitest';
import {
  canContinue,
  chooseRoute,
  CUSTOM,
  CUSTOM_NAME_MAX,
  decisionOnAccept,
  goTo,
  initialSetup,
  isBefore,
  ITEM_CHOICES,
  loadSetup,
  nextStep,
  previousStep,
  removeItem,
  setCustomName,
  setItemCost,
  setItemName,
  setItemSaved,
  setItemTarget,
  setNumber,
  setUseFixedCostMonths,
  toggleItem,
  toTargetInputs,
  type SetupState,
} from './state';

const now = { year: 2026, month: 10 };
const onItems: SetupState = { ...initialSetup, step: 'items', route: 'items' };

function priced(state: SetupState, index: number, cents: number, year = 2027, month = 6): SetupState {
  return setItemTarget(setItemCost(state, index, cents), index, { year, month }, now);
}

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

describe('set-up steps', () => {
  it('follows each route forward, with no separate date step', () => {
    expect(nextStep({ ...onItems, step: 'route' })).toBe('items');
    expect(nextStep(onItems)).toBe('prices');
    expect(nextStep({ ...onItems, step: 'prices' })).toBe('numbers');
    expect(nextStep({ ...onItems, step: 'numbers' })).toBe('result');
    expect(nextStep({ ...onItems, step: 'result' })).toBe('done');
    expect(nextStep({ ...initialSetup, route: 'none' })).toBe('numbers');
  });

  it('goes back along the route the person took', () => {
    expect(previousStep(onItems)).toBe('route');
    expect(previousStep({ ...onItems, step: 'prices' })).toBe('items');
    expect(previousStep({ ...onItems, step: 'numbers' })).toBe('prices');
    expect(previousStep({ ...initialSetup, route: 'none', step: 'numbers' })).toBe('route');
    expect(previousStep({ ...onItems, step: 'result' })).toBe('numbers');
  });

  it('needs a route before continuing', () => {
    expect(canContinue(initialSetup, now)).toBe(false);
    expect(canContinue(chooseRoute(initialSetup, 'none'), now)).toBe(true);
  });
});

describe('picking items', () => {
  it('needs at least one item', () => {
    expect(canContinue(onItems, now)).toBe(false);
    expect(canContinue(toggleItem(onItems, 'travel'), now)).toBe(true);
  });

  it('pre-fills the name, with no price, savings or date yet', () => {
    expect(toggleItem(onItems, 'first-home').items).toEqual([
      {
        choice: 'first-home',
        name: 'First home',
        costCents: null,
        useFixedCostMonths: false,
        savedCents: null,
        target: { year: null, month: null },
      },
    ]);
  });

  it('removes an item when it is tapped again', () => {
    expect(toggleItem(toggleItem(onItems, 'travel'), 'travel').items).toEqual([]);
  });

  it('needs a typed name for something else, capped in length', () => {
    const state = toggleItem(onItems, CUSTOM);
    expect(canContinue(state, now)).toBe(false);
    expect(canContinue(setCustomName(state, '  '), now)).toBe(false);
    expect(canContinue(setCustomName(state, 'Pottery kiln'), now)).toBe(true);
    expect(setCustomName(state, 'x'.repeat(100)).items[0]?.name).toHaveLength(CUSTOM_NAME_MAX);
  });
});

describe('pricing each item', () => {
  const onPrices: SetupState = { ...toggleItem(toggleItem(onItems, 'travel'), 'wedding'), step: 'prices' };

  it('needs a name, a price above zero and a date on every item, with savings optional', () => {
    expect(canContinue(onPrices, now)).toBe(false);
    const one = priced(onPrices, 0, 500_000);
    expect(canContinue(one, now)).toBe(false);
    expect(canContinue(priced(one, 1, 0), now)).toBe(false);
    expect(canContinue(setItemCost(one, 1, 2_000_000), now)).toBe(false);
    const both = priced(one, 1, 2_000_000);
    expect(canContinue(both, now)).toBe(true);
    expect(canContinue(setItemName(both, 1, ' '), now)).toBe(false);
  });

  it('keeps each item date separate', () => {
    const state = priced(priced(onPrices, 0, 1, 2026, 12), 1, 1, 2028, 3);
    expect(state.items.map((i) => i.target)).toEqual([
      { year: 2026, month: 12 },
      { year: 2028, month: 3 },
    ]);
  });

  it('clears the month when a change of year would put it in the past', () => {
    const later = setItemTarget(onPrices, 0, { year: 2027, month: 9 }, now);
    expect(setItemTarget(later, 0, { year: 2026, month: 9 }, now).items[0]?.target).toEqual({ year: 2026, month: null });
  });

  it('does not continue with a saved date that has since passed', () => {
    const state = setItemTarget(setItemCost(onPrices, 0, 1), 0, { year: 2026, month: 10 }, now);
    const both = priced(state, 1, 1);
    expect(canContinue(both, now)).toBe(true);
    expect(canContinue(both, { year: 2026, month: 11 })).toBe(false);
  });

  it('lets the emergency fund use months of fixed costs in place of a price', () => {
    const fund: SetupState = { ...toggleItem(onItems, 'emergency-fund'), step: 'prices' };
    const dated = setItemTarget(fund, 0, { year: 2027, month: 3 }, now);
    expect(canContinue(dated, now)).toBe(false);
    expect(canContinue(setUseFixedCostMonths(dated, 0, true), now)).toBe(true);
  });

  it('removes an item from the list', () => {
    expect(removeItem(onPrices, 0).items.map((i) => i.name)).toEqual(['Wedding']);
  });

  it('compares months across years', () => {
    expect(isBefore({ year: 2026, month: 12 }, { year: 2027, month: 1 })).toBe(true);
    expect(isBefore({ year: 2026, month: 10 }, { year: 2026, month: 10 })).toBe(false);
  });
});

describe('starting numbers', () => {
  it('needs only pay and fixed costs, on both routes', () => {
    for (const route of ['items', 'none'] as const) {
      const state: SetupState = { ...initialSetup, route, step: 'numbers' };
      expect(canContinue(setNumber(state, 'payCents', 1), now)).toBe(false);
      expect(canContinue(setNumber(setNumber(state, 'payCents', 1), 'fixedCents', 0), now)).toBe(true);
    }
  });
});

describe('toTargetInputs', () => {
  it('passes each item with its own date and savings, treating blank savings as zero', () => {
    let state: SetupState = { ...toggleItem(toggleItem(onItems, 'travel'), 'emergency-fund'), step: 'numbers' };
    state = setItemSaved(priced(state, 0, 600_000, 2027, 6), 0, 100_000);
    state = setUseFixedCostMonths(setItemTarget(state, 1, { year: 2027, month: 3 }, now), 1, true);
    state = setNumber(setNumber(state, 'payCents', 500_000), 'fixedCents', 300_000);
    expect(toTargetInputs(state, now)).toEqual({
      payCents: 500_000,
      fixedCents: 300_000,
      startMonth: now,
      items: [
        { costCents: 600_000, useFixedCostMonths: false, savedCents: 100_000, targetMonth: { year: 2027, month: 6 } },
        { costCents: null, useFixedCostMonths: true, savedCents: 0, targetMonth: { year: 2027, month: 3 } },
      ],
    });
  });

  it('is null while anything is missing', () => {
    expect(toTargetInputs({ ...toggleItem(onItems, 'travel'), step: 'numbers' }, now)).toBeNull();
  });
});

describe('target decision', () => {
  it('is accepted when the plan is accepted as first shown, and adjusted after changes', () => {
    const atResult: SetupState = { ...onItems, step: 'result' };
    expect(decisionOnAccept(atResult)).toBe('accepted');
    const changed = goTo(atResult, 'prices');
    expect(changed.changedAfterResult).toBe(true);
    expect(decisionOnAccept({ ...changed, step: 'result' })).toBe('adjusted');
  });

  it('does not count moving between earlier steps as a change', () => {
    expect(goTo({ ...onItems, step: 'prices' }, 'items').changedAfterResult).toBe(false);
  });
});

describe('loadSetup', () => {
  it('starts fresh when nothing is saved, or saved progress is from a retired set-up', () => {
    expect(loadSetup(undefined)).toEqual(initialSetup);
    expect(loadSetup({ step: 'areas', route: 'areas', areas: ['home'] })).toEqual(initialSetup);
  });

  it('resumes saved progress', () => {
    const saved = priced({ ...toggleItem(onItems, 'travel'), step: 'prices' }, 0, 100);
    expect(loadSetup(saved)).toEqual(saved);
  });

  it('moves progress saved on the removed date step back to pricing, with empty per-item fields', () => {
    const saved = {
      step: 'date',
      route: 'items',
      items: [{ choice: 'travel', name: 'Travel', costCents: 100 }],
      target: { year: 2027, month: 1 },
      numbers: { payCents: 1, fixedCents: 2, savingsCents: 3 },
    };
    expect(loadSetup(saved)).toEqual({
      ...initialSetup,
      step: 'prices',
      route: 'items',
      items: [
        { choice: 'travel', name: 'Travel', costCents: 100, useFixedCostMonths: false, savedCents: null, target: { year: null, month: null } },
      ],
      numbers: { payCents: 1, fixedCents: 2 },
    });
  });

  it('sends the person back to pick items when saved items were dropped', () => {
    const saved = { step: 'prices', route: 'items', items: [{ choice: 'family', name: 'Supporting family' }] };
    expect(loadSetup(saved)).toEqual({ ...initialSetup, step: 'items', route: 'items' });
  });
});
