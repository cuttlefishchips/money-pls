import { ROUTES, type Route } from '../../events';
import type { Item } from '../../calc/target';

export type ItemKind = Item['kind'];

export const ITEM_CHOICES = [
  { id: 'travel', name: 'Travel', kind: 'one-off' },
  { id: 'wedding', name: 'Wedding', kind: 'one-off' },
  { id: 'home', name: 'Home', hint: 'BTO, renovation, moving out', kind: 'one-off' },
  { id: 'studies', name: 'Further studies', kind: 'one-off' },
  { id: 'career-break', name: 'Career break', kind: 'one-off' },
  { id: 'big-purchase', name: 'Big purchase', hint: 'car, gadgets', kind: 'one-off' },
  { id: 'emergency-fund', name: 'Emergency fund', kind: 'one-off' },
  { id: 'family', name: 'Supporting family', kind: 'monthly' },
  { id: 'everyday', name: 'A better everyday life', hint: 'eating out, hobbies', kind: 'monthly' },
] as const satisfies readonly { id: string; name: string; hint?: string; kind: ItemKind }[];

export const CUSTOM = 'custom';
export const CUSTOM_NAME_MAX = 40;

export type ChoiceId = (typeof ITEM_CHOICES)[number]['id'] | typeof CUSTOM;

export interface SetupItem {
  choice: ChoiceId;
  name: string;
  kind: ItemKind;
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
  return s as SetupState;
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
  const item: SetupItem = preset
    ? { choice, name: preset.name, kind: preset.kind, costCents: null }
    : { choice: CUSTOM, name: '', kind: 'one-off', costCents: null };
  return { ...state, items: [...state.items, item] };
}

export function setCustomName(state: SetupState, name: string): SetupState {
  const trimmed = name.slice(0, CUSTOM_NAME_MAX);
  return { ...state, items: state.items.map((item) => (item.choice === CUSTOM ? { ...item, name: trimmed } : item)) };
}

export function hasOneOff(state: SetupState): boolean {
  return state.items.some((item) => item.kind === 'one-off');
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
      if (state.route === 'none') return 'route';
      return hasOneOff(state) ? 'date' : 'prices';
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
