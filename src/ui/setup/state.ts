import type { Route } from '../../events';

export const MAX_AREAS = 3;

export const AREAS = [
  { id: 'work', name: 'Work', description: 'Changing jobs, starting something, or time off between roles.' },
  { id: 'home', name: 'Home', description: 'Moving, renovating, or setting up a place of your own.' },
  { id: 'health', name: 'Health', description: 'Care, treatment, fitness, or peace of mind about your health.' },
  { id: 'family-care', name: 'Family care', description: 'Supporting parents, children, or others who rely on you.' },
  { id: 'education', name: 'Education', description: 'Courses, a qualification, or learning a new skill.' },
  { id: 'experiences', name: 'Experiences', description: 'Travel, events, or things you want to do while you can.' },
  { id: 'everyday-living', name: 'Everyday living', description: 'Making ordinary days a bit easier or nicer.' },
  { id: 'giving', name: 'Giving and legacy', description: 'Giving to people or causes, or leaving something behind.' },
] as const;

export type AreaId = (typeof AREAS)[number]['id'];

export type SetupStep = 'route' | 'areas' | 'items' | 'date' | 'numbers' | 'result';

export interface SetupState {
  step: SetupStep;
  route: Route | null;
  areas: AreaId[];
}

export const SETUP_KEY = 'setup';

export const initialSetup: SetupState = { step: 'route', route: null, areas: [] };

export function chooseRoute(state: SetupState, route: Route): SetupState {
  return { ...state, route };
}

export function stepAfterRoute(route: Route): SetupStep {
  return route === 'areas' ? 'areas' : route === 'one' ? 'items' : 'numbers';
}

export function toggleArea(state: SetupState, id: AreaId): SetupState {
  if (state.areas.includes(id)) return { ...state, areas: state.areas.filter((a) => a !== id) };
  if (state.areas.length >= MAX_AREAS) return state;
  return { ...state, areas: [...state.areas, id] };
}

export function previousStep(state: SetupState): SetupStep {
  switch (state.step) {
    case 'areas':
      return 'route';
    case 'items':
      return state.route === 'areas' ? 'areas' : 'route';
    case 'date':
      return 'items';
    case 'numbers':
      return state.route === 'none' ? 'route' : 'date';
    case 'result':
      return 'numbers';
    case 'route':
      return 'route';
  }
}

export function canContinue(state: SetupState): boolean {
  if (state.step === 'route') return state.route !== null;
  if (state.step === 'areas') return state.areas.length > 0;
  return true;
}
