import type { YearMonth } from '../../calc/dates';
import type { Item, TargetInputs } from '../../calc/target';
import { ROUTES, type Decision, type Route } from '../../events';

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
export const ITEM_NAME_MAX = 40;
export const TARGET_YEARS_AHEAD = 10;
export const FUND_CHOICE = 'emergency-fund';

export type ChoiceId = (typeof ITEM_CHOICES)[number]['id'] | typeof CUSTOM;

const CHOICE_IDS: readonly string[] = [...ITEM_CHOICES.map((c) => c.id), CUSTOM];

export interface PartialMonth {
  year: number | null;
  month: number | null;
}

export interface SetupItem {
  choice: ChoiceId;
  name: string;
  costCents: number | null;
  useFixedCostMonths: boolean;
  savedCents: number | null;
  target: PartialMonth;
}

export interface StartingNumbers {
  payCents: number | null;
  fixedCents: number | null;
}

export type NumberField = keyof StartingNumbers;

export type SetupStep = 'route' | 'items' | 'prices' | 'numbers' | 'result' | 'done';

const STEPS: readonly SetupStep[] = ['route', 'items', 'prices', 'numbers', 'result', 'done'];

export interface SetupState {
  step: SetupStep;
  route: Route | null;
  items: SetupItem[];
  numbers: StartingNumbers;
  changedAfterResult: boolean;
}

export const SETUP_KEY = 'setup';

const emptyMonth: PartialMonth = { year: null, month: null };

export const initialSetup: SetupState = {
  step: 'route',
  route: null,
  items: [],
  numbers: { payCents: null, fixedCents: null },
  changedAfterResult: false,
};

function newItem(choice: ChoiceId, name: string): SetupItem {
  return { choice, name, costCents: null, useFixedCostMonths: false, savedCents: null, target: emptyMonth };
}

export function loadSetup(saved: unknown): SetupState {
  if (typeof saved !== 'object' || saved === null) return initialSetup;
  const s = saved as Omit<Partial<SetupState>, 'step'> & { step?: string };
  const step = s.step === 'date' ? 'prices' : s.step;
  const validRoute = s.route === null || ROUTES.includes(s.route as Route);
  if (!validRoute || !STEPS.includes(step as SetupStep) || !Array.isArray(s.items)) return initialSetup;

  const items = s.items
    .filter((item) => CHOICE_IDS.includes(item.choice))
    .map((item) => ({ ...newItem(item.choice, item.name), ...item, target: { ...emptyMonth, ...item.target } }));
  const restored: SetupState = {
    ...initialSetup,
    route: s.route ?? null,
    step: step as SetupStep,
    items,
    numbers: { payCents: s.numbers?.payCents ?? null, fixedCents: s.numbers?.fixedCents ?? null },
    changedAfterResult: s.changedAfterResult ?? false,
  };
  const pastItems = restored.step !== 'route' && restored.step !== 'items';
  if (restored.route === 'items' && pastItems && items.length !== s.items.length) return { ...restored, step: 'items' };
  return restored;
}

export function chooseRoute(state: SetupState, route: Route): SetupState {
  return { ...state, route };
}

export function isPicked(state: SetupState, choice: ChoiceId): boolean {
  return state.items.some((item) => item.choice === choice);
}

export function toggleItem(state: SetupState, choice: ChoiceId): SetupState {
  if (isPicked(state, choice)) return { ...state, items: state.items.filter((item) => item.choice !== choice) };
  const preset = ITEM_CHOICES.find((c) => c.id === choice);
  return { ...state, items: [...state.items, newItem(choice, preset?.name ?? '')] };
}

export function setCustomName(state: SetupState, name: string): SetupState {
  const trimmed = name.slice(0, CUSTOM_NAME_MAX);
  return { ...state, items: state.items.map((item) => (item.choice === CUSTOM ? { ...item, name: trimmed } : item)) };
}

function updateItem(state: SetupState, index: number, change: Partial<SetupItem>): SetupState {
  return { ...state, items: state.items.map((item, i) => (i === index ? { ...item, ...change } : item)) };
}

export function setItemName(state: SetupState, index: number, name: string): SetupState {
  return updateItem(state, index, { name: name.slice(0, ITEM_NAME_MAX) });
}

export function setItemCost(state: SetupState, index: number, costCents: number | null): SetupState {
  return updateItem(state, index, { costCents });
}

export function setItemSaved(state: SetupState, index: number, savedCents: number | null): SetupState {
  return updateItem(state, index, { savedCents });
}

export function setUseFixedCostMonths(state: SetupState, index: number, useFixedCostMonths: boolean): SetupState {
  return updateItem(state, index, { useFixedCostMonths });
}

export function setItemTarget(state: SetupState, index: number, target: PartialMonth, thisMonth: YearMonth): SetupState {
  const { year, month } = target;
  const inPast = year !== null && month !== null && isBefore({ year, month }, thisMonth);
  return updateItem(state, index, { target: inPast ? { year, month: null } : target });
}

export function removeItem(state: SetupState, index: number): SetupState {
  return { ...state, items: state.items.filter((_, i) => i !== index) };
}

export function setNumber(state: SetupState, field: NumberField, cents: number | null): SetupState {
  return { ...state, numbers: { ...state.numbers, [field]: cents } };
}

export function isBefore(a: YearMonth, b: YearMonth): boolean {
  return a.year * 12 + a.month < b.year * 12 + b.month;
}

export function itemMonth(item: SetupItem): YearMonth | null {
  const { year, month } = item.target;
  return year === null || month === null ? null : { year, month };
}

function itemReady(item: SetupItem, thisMonth: YearMonth): boolean {
  const month = itemMonth(item);
  const priced = item.useFixedCostMonths || (item.costCents !== null && item.costCents > 0);
  return item.name.trim() !== '' && priced && month !== null && !isBefore(month, thisMonth);
}

export function nextStep(state: SetupState): SetupStep {
  switch (state.step) {
    case 'route':
      return state.route === 'items' ? 'items' : state.route === 'none' ? 'numbers' : 'route';
    case 'items':
      return 'prices';
    case 'prices':
      return 'numbers';
    case 'numbers':
      return 'result';
    case 'result':
    case 'done':
      return 'done';
  }
}

export function previousStep(state: SetupState): SetupStep {
  switch (state.step) {
    case 'items':
      return 'route';
    case 'prices':
      return 'items';
    case 'numbers':
      return state.route === 'none' ? 'route' : 'prices';
    case 'result':
      return 'numbers';
    case 'route':
    case 'done':
      return state.step;
  }
}

export function canContinue(state: SetupState, thisMonth: YearMonth): boolean {
  switch (state.step) {
    case 'route':
      return state.route !== null;
    case 'items':
      return state.items.length > 0 && state.items.every((item) => item.name.trim() !== '');
    case 'prices':
      return state.items.length > 0 && state.items.every((item) => itemReady(item, thisMonth));
    case 'numbers':
      return state.numbers.payCents !== null && state.numbers.fixedCents !== null;
    case 'result':
    case 'done':
      return true;
  }
}

export function goTo(state: SetupState, step: SetupStep): SetupState {
  return { ...state, step, changedAfterResult: state.changedAfterResult || state.step === 'result' };
}

export function decisionOnAccept(state: SetupState): Decision {
  return state.changedAfterResult ? 'adjusted' : 'accepted';
}

export function toTargetInputs(state: SetupState, startMonth: YearMonth): TargetInputs | null {
  const { payCents, fixedCents } = state.numbers;
  if (payCents === null || fixedCents === null) return null;
  if (!state.items.length || !state.items.every((item) => itemReady(item, startMonth))) return null;
  const items: Item[] = state.items.flatMap((item) => {
    const targetMonth = itemMonth(item);
    if (!targetMonth) return [];
    return [
      {
        costCents: item.useFixedCostMonths ? null : item.costCents,
        useFixedCostMonths: item.useFixedCostMonths,
        savedCents: item.savedCents ?? 0,
        targetMonth,
      },
    ];
  });
  return { payCents, fixedCents, items, startMonth };
}
