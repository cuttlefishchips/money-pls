import type { YearMonth } from '../../calc/dates';
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

export interface PartialMonth {
  year: number | null;
  month: number | null;
}

export interface StartingNumbers {
  payCents: number | null;
  fixedCents: number | null;
  savingsCents: number | null;
}

export type NumberField = keyof StartingNumbers;

export interface SetupState {
  step: SetupStep;
  route: Route | null;
  items: SetupItem[];
  target: PartialMonth;
  numbers: StartingNumbers;
}

export const SETUP_KEY = 'setup';

export const initialSetup: SetupState = {
  step: 'route',
  route: null,
  items: [],
  target: { year: null, month: null },
  numbers: { payCents: null, fixedCents: null, savingsCents: null },
};

export const ITEM_NAME_MAX = 40;
export const TARGET_YEARS_AHEAD = 10;

export function loadSetup(saved: unknown): SetupState {
  if (typeof saved !== 'object' || saved === null) return initialSetup;
  const s = saved as Partial<SetupState>;
  const validRoute = s.route === null || ROUTES.includes(s.route as Route);
  const validStep = STEPS.includes(s.step as SetupStep);
  if (!validRoute || !validStep || !Array.isArray(s.items)) return initialSetup;
  const items = s.items
    .filter((item) => CHOICE_IDS.includes(item.choice))
    .map(({ choice, name, costCents }) => ({ choice, name, costCents }));
  const restored: SetupState = {
    ...initialSetup,
    ...(s as SetupState),
    items,
    target: { ...initialSetup.target, ...s.target },
    numbers: { ...initialSetup.numbers, ...s.numbers },
  };
  if (items.length !== s.items.length && s.step !== 'route' && s.step !== 'items') {
    return { ...restored, step: 'items' };
  }
  return restored;
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

export function setItemName(state: SetupState, index: number, name: string): SetupState {
  return {
    ...state,
    items: state.items.map((item, i) => (i === index ? { ...item, name: name.slice(0, ITEM_NAME_MAX) } : item)),
  };
}

export function setItemCost(state: SetupState, index: number, costCents: number | null): SetupState {
  return { ...state, items: state.items.map((item, i) => (i === index ? { ...item, costCents } : item)) };
}

export function setTarget(state: SetupState, target: PartialMonth, thisMonth: YearMonth): SetupState {
  const { year, month } = target;
  const inPast = year !== null && month !== null && isBefore({ year, month }, thisMonth);
  return { ...state, target: inPast ? { year, month: null } : target };
}

export function setNumber(state: SetupState, field: NumberField, cents: number | null): SetupState {
  return { ...state, numbers: { ...state.numbers, [field]: cents } };
}

export function isBefore(a: YearMonth, b: YearMonth): boolean {
  return a.year * 12 + a.month < b.year * 12 + b.month;
}

export function targetMonth(state: SetupState): YearMonth | null {
  const { year, month } = state.target;
  return year === null || month === null ? null : { year, month };
}

export function needsSavings(state: SetupState): boolean {
  return state.route === 'items';
}

export function nextStep(state: SetupState): SetupStep {
  switch (state.step) {
    case 'route':
      return state.route ? stepAfterRoute(state.route) : 'route';
    case 'items':
      return 'prices';
    case 'prices':
      return 'date';
    case 'date':
      return 'numbers';
    case 'numbers':
    case 'result':
      return 'result';
  }
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

export function canContinue(state: SetupState, thisMonth: YearMonth): boolean {
  switch (state.step) {
    case 'route':
      return state.route !== null;
    case 'items':
      return state.items.length > 0 && state.items.every((item) => item.name.trim() !== '');
    case 'prices':
      return state.items.every((item) => item.name.trim() !== '' && item.costCents !== null && item.costCents > 0);
    case 'date': {
      const target = targetMonth(state);
      return target !== null && !isBefore(target, thisMonth);
    }
    case 'numbers': {
      const { payCents, fixedCents, savingsCents } = state.numbers;
      return payCents !== null && fixedCents !== null && (!needsSavings(state) || savingsCents !== null);
    }
    case 'result':
      return true;
  }
}
