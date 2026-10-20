import { ROUTES, type Route } from '../../events';

export const ITEM_CHOICES = [
  { id: 'travel', name: 'Travel' },
  { id: 'first-home', name: 'First home', hint: 'BTO, renovation, moving out' },
  { id: 'emergency-fund', name: 'Emergency fund' },
  { id: 'wedding', name: 'Wedding' },
  { id: 'studies', name: 'Further studies' },
  { id: 'career-break', name: 'Career break' },
  { id: 'big-purchase', name: 'Big purchase', hint: 'car, gadgets' },
] as const satisfies readonly { id: string; name: string; hint?: string }[];

export const CUSTOM = 'custom';
export const CUSTOM_NAME_MAX = 40;

export type ChoiceId = (typeof ITEM_CHOICES)[number]['id'] | typeof CUSTOM;

const CHOICE_IDS: readonly string[] = [...ITEM_CHOICES.map((c) => c.id), CUSTOM];

export interface SetupItem {
  choice: ChoiceId;
  name: string;
  costCents: number | null;
}

export type SetupStep = 'route' | 'items' | 'prices' | 'date' | 'numbers' | 'result';

const STEPS: readonly SetupStep[] = ['route', 'items', 'prices', 'date', 'numbers', 'result'];

export interface SetupState {
  step: SetupStep;
  route: Route | null;
  items: SetupItem[];
}

export const SETUP_KEY = 'setup';

export const initialSetup: SetupState = { step: 'route', route: null, items: [] };

export function loadSetup(saved: unknown): SetupState {
  if (typeof saved !== 'object' || saved === null) return initialSetup;
  const s = saved as Partial<SetupState>;
  const validRoute = s.route === null || ROUTES.includes(s.route as Route);
  const validStep = STEPS.includes(s.step as SetupStep);
  if (!validRoute || !validStep || !Array.isArray(s.items)) return initialSetup;
  const items = s.items
    .filter((item) => CHOICE_IDS.includes(item.choice))
    .map(({ choice, name, costCents }) => ({ choice, name, costCents }));
  if (items.length !== s.items.length && s.step !== 'route' && s.step !== 'items') {
    return { ...(s as SetupState), step: 'items', items };
  }
  return { ...(s as SetupState), items };
}

export function chooseRoute(state: SetupState, route: Route): SetupState {
  return { ...state, route };
}

export function stepAfterRoute(route: Route): SetupStep {
  return route === 'items' ? 'items' : 'numbers';
}

export function isPicked(state: SetupState, choice: ChoiceId): boolean {
  return state.items.some((item) => item.choice === choice);
}

export function toggleItem(state: SetupState, choice: ChoiceId): SetupState {
  if (isPicked(state, choice)) return { ...state, items: state.items.filter((item) => item.choice !== choice) };
  const preset = ITEM_CHOICES.find((c) => c.id === choice);
  const item: SetupItem = { choice, name: preset?.name ?? '', costCents: null };
  return { ...state, items: [...state.items, item] };
}

export function setCustomName(state: SetupState, name: string): SetupState {
  const trimmed = name.slice(0, CUSTOM_NAME_MAX);
  return { ...state, items: state.items.map((item) => (item.choice === CUSTOM ? { ...item, name: trimmed } : item)) };
}

export function previousStep(state: SetupState): SetupStep {
  switch (state.step) {
    case 'items':
      return 'route';
    case 'prices':
      return 'items';
    case 'date':
      return 'prices';
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
  if (state.step === 'items') return state.items.length > 0 && state.items.every((item) => item.name.trim() !== '');
  return true;
}
