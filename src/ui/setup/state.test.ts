import { describe, expect, it } from 'vitest';
import {
  AREAS,
  canContinue,
  chooseRoute,
  initialSetup,
  MAX_AREAS,
  previousStep,
  stepAfterRoute,
  toggleArea,
  type SetupState,
} from './state';

describe('set-up areas', () => {
  it('has the eight areas in SPEC.md section 4, each with a one-line description', () => {
    expect(AREAS.map((a) => a.name)).toEqual([
      'Work',
      'Home',
      'Health',
      'Family care',
      'Education',
      'Experiences',
      'Everyday living',
      'Giving and legacy',
    ]);
    for (const area of AREAS) expect(area.description).toMatch(/^[A-Z].+\.$/);
  });
});

describe('set-up routes', () => {
  it('goes from the route choice to areas, one item, or starting numbers', () => {
    expect(stepAfterRoute('areas')).toBe('areas');
    expect(stepAfterRoute('one')).toBe('items');
    expect(stepAfterRoute('none')).toBe('numbers');
  });

  it('goes back along the route the person took', () => {
    const at = (step: SetupState['step'], route: SetupState['route']) => ({ ...initialSetup, step, route });
    expect(previousStep(at('areas', 'areas'))).toBe('route');
    expect(previousStep(at('items', 'areas'))).toBe('areas');
    expect(previousStep(at('items', 'one'))).toBe('route');
    expect(previousStep(at('date', 'one'))).toBe('items');
    expect(previousStep(at('numbers', 'areas'))).toBe('date');
    expect(previousStep(at('numbers', 'none'))).toBe('route');
    expect(previousStep(at('result', 'none'))).toBe('numbers');
  });

  it('needs a route before continuing', () => {
    expect(canContinue(initialSetup)).toBe(false);
    expect(canContinue(chooseRoute(initialSetup, 'none'))).toBe(true);
  });
});

describe('picking areas', () => {
  const onAreas: SetupState = { ...initialSetup, step: 'areas', route: 'areas' };

  it('needs at least one area before continuing', () => {
    expect(canContinue(onAreas)).toBe(false);
    expect(canContinue(toggleArea(onAreas, 'home'))).toBe(true);
  });

  it('adds and removes an area', () => {
    const picked = toggleArea(onAreas, 'home');
    expect(picked.areas).toEqual(['home']);
    expect(toggleArea(picked, 'home').areas).toEqual([]);
  });

  it('allows at most three areas', () => {
    let state = onAreas;
    for (const id of ['work', 'home', 'health', 'education'] as const) state = toggleArea(state, id);
    expect(state.areas).toEqual(['work', 'home', 'health']);
    expect(MAX_AREAS).toBe(3);
  });

  it('allows a different area once one is removed', () => {
    let state = onAreas;
    for (const id of ['work', 'home', 'health'] as const) state = toggleArea(state, id);
    state = toggleArea(toggleArea(state, 'home'), 'education');
    expect(state.areas).toEqual(['work', 'health', 'education']);
  });
});
