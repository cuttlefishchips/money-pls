import { describe, expect, it } from 'vitest';
import {
  canContinue,
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
    expect(canContinue(initialSetup)).toBe(false);
    expect(canContinue(chooseRoute(initialSetup, 'none'))).toBe(true);
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
    expect(canContinue(onItems)).toBe(false);
    expect(canContinue(toggleItem(onItems, 'travel'))).toBe(true);
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
    expect(canContinue(state)).toBe(false);
    expect(canContinue(setCustomName(state, '   '))).toBe(false);
    expect(canContinue(setCustomName(state, 'Pottery kiln'))).toBe(true);
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
    expect(loadSetup(saved)).toEqual({ step: 'items', route: 'items', items: [] });
  });
});
