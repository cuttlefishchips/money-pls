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
  it('lists the items in SPEC.md section 4 with their pre-set type', () => {
    expect(ITEM_CHOICES.map((c) => [c.name, c.kind])).toEqual([
      ['Travel', 'one-off'],
      ['Wedding', 'one-off'],
      ['Home', 'one-off'],
      ['Further studies', 'one-off'],
      ['Career break', 'one-off'],
      ['Big purchase', 'one-off'],
      ['Emergency fund', 'one-off'],
      ['Supporting family', 'monthly'],
      ['A better everyday life', 'monthly'],
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
    const withOneOff = toggleItem(onItems, 'travel');
    const monthlyOnly = toggleItem(onItems, 'family');
    expect(previousStep(onItems)).toBe('route');
    expect(previousStep({ ...withOneOff, step: 'prices' })).toBe('items');
    expect(previousStep({ ...withOneOff, step: 'date' })).toBe('prices');
    expect(previousStep({ ...withOneOff, step: 'numbers' })).toBe('date');
    expect(previousStep({ ...monthlyOnly, step: 'numbers' })).toBe('prices');
    expect(previousStep({ ...initialSetup, route: 'none', step: 'numbers' })).toBe('route');
    expect(previousStep({ ...withOneOff, step: 'result' })).toBe('numbers');
  });
});

describe('picking items', () => {
  it('needs at least one item before continuing', () => {
    expect(canContinue(onItems)).toBe(false);
    expect(canContinue(toggleItem(onItems, 'travel'))).toBe(true);
  });

  it('pre-fills the name and type of a picked item, with no price yet', () => {
    const state = toggleItem(toggleItem(onItems, 'home'), 'everyday');
    expect(state.items).toEqual([
      { choice: 'home', name: 'Home', kind: 'one-off', costCents: null },
      { choice: 'everyday', name: 'A better everyday life', kind: 'monthly', costCents: null },
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

  it('starts something else as an unnamed one-off that needs a name before continuing', () => {
    const state = toggleItem(onItems, CUSTOM);
    expect(state.items).toEqual([{ choice: CUSTOM, name: '', kind: 'one-off', costCents: null }]);
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
});
