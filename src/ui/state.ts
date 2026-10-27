import type { CalDate, YearMonth } from '../calc/dates';
import type { Item } from '../calc/target';
import type { Route } from '../events';

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
export const ITEM_NAME_MAX = 40;
export const TARGET_YEARS_AHEAD = 10;
export const FUND_CHOICE = 'emergency-fund';

export type ChoiceId = (typeof ITEM_CHOICES)[number]['id'] | typeof CUSTOM;

const CHOICE_IDS: readonly string[] = [...ITEM_CHOICES.map((c) => c.id), CUSTOM];

export interface PartialMonth {
  year: number | null;
  month: number | null;
}

export interface GoalItem {
  id: string;
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

export type AppStep = 'start' | 'numbers' | 'today';

export interface AppState {
  step: AppStep;
  route: Route | null;
  items: GoalItem[];
  numbers: StartingNumbers;
  setupDate: CalDate | null;
  welcomeSeen: boolean;
}

export const APP_KEY = 'setup';

const emptyMonth: PartialMonth = { year: null, month: null };

export const initialState: AppState = {
  step: 'numbers',
  route: null,
  items: [],
  numbers: { payCents: null, fixedCents: null },
  setupDate: null,
  welcomeSeen: false,
};

export function newItem(id: string, choice: ChoiceId, name: string): GoalItem {
  return { id, choice, name, costCents: null, useFixedCostMonths: false, savedCents: null, target: emptyMonth };
}

const OLD_STEPS: Record<string, AppStep> = {
  route: 'start',
  items: 'start',
  start: 'start',
  prices: 'numbers',
  date: 'numbers',
  numbers: 'numbers',
  result: 'today',
  done: 'today',
  today: 'today',
};

export function loadState(saved: unknown, today: CalDate): AppState {
  if (typeof saved !== 'object' || saved === null) return initialState;
  const s = saved as Record<string, unknown> & Partial<AppState>;
  const step = OLD_STEPS[String(s.step)];
  const route = s.route === 'items' || s.route === 'none' ? s.route : null;
  if (!step || !Array.isArray(s.items)) return initialState;

  const items = (s.items as Partial<GoalItem>[])
    .filter((item) => CHOICE_IDS.includes(String(item.choice)))
    .map((item, i) => ({
      ...newItem(item.id ?? (item.choice === CUSTOM ? `custom-${i + 1}` : String(item.choice)), item.choice as ChoiceId, ''),
      ...item,
      target: { ...emptyMonth, ...item.target },
    })) as GoalItem[];
  const numbers = { payCents: s.numbers?.payCents ?? null, fixedCents: s.numbers?.fixedCents ?? null };
  const numbersDone = numbers.payCents !== null && numbers.fixedCents !== null;
  const resolvedStep: AppStep = numbersDone ? step : 'numbers';

  return {
    step: resolvedStep,
    route,
    items,
    numbers,
    setupDate: s.setupDate ?? (resolvedStep === 'today' ? today : null),
    welcomeSeen: s.welcomeSeen ?? false,
  };
}

export function isPicked(state: AppState, choice: ChoiceId): boolean {
  return state.items.some((item) => item.choice === choice);
}

export function nextCustomId(items: GoalItem[]): string {
  const used = items.filter((i) => i.choice === CUSTOM).map((i) => Number(i.id.replace('custom-', '')) || 0);
  return `custom-${Math.max(0, ...used) + 1}`;
}

export function addItem(state: AppState, choice: ChoiceId): AppState {
  const preset = ITEM_CHOICES.find((c) => c.id === choice);
  const id = preset ? preset.id : nextCustomId(state.items);
  return { ...state, items: [...state.items, newItem(id, choice, preset?.name ?? '')] };
}

export function toggleStartItem(state: AppState, choice: ChoiceId): AppState {
  if (isPicked(state, choice)) return { ...state, items: state.items.filter((item) => item.choice !== choice) };
  return { ...addItem(state, choice), route: 'items' };
}

export function chooseNotSure(state: AppState): AppState {
  return { ...state, route: 'none', items: [] };
}

export function setStartCustomName(state: AppState, name: string): AppState {
  return { ...state, items: state.items.map((item) => (item.choice === CUSTOM ? { ...item, name: name.slice(0, ITEM_NAME_MAX) } : item)) };
}

export function replaceItem(state: AppState, item: GoalItem): AppState {
  return { ...state, items: state.items.map((existing) => (existing.id === item.id ? item : existing)) };
}

export function removeItem(state: AppState, id: string): AppState {
  return { ...state, items: state.items.filter((item) => item.id !== id) };
}

export function setNumber(state: AppState, field: NumberField, cents: number | null): AppState {
  return { ...state, numbers: { ...state.numbers, [field]: cents } };
}

export function editItem(item: GoalItem, change: Partial<Omit<GoalItem, 'id' | 'choice'>>): GoalItem {
  const next = { ...item, ...change };
  return { ...next, name: next.name.slice(0, ITEM_NAME_MAX) };
}

export function setItemTarget(item: GoalItem, target: PartialMonth, thisMonth: YearMonth): GoalItem {
  const { year, month } = target;
  const inPast = year !== null && month !== null && isBefore({ year, month }, thisMonth);
  return { ...item, target: inPast ? { year, month: null } : target };
}

export function isBefore(a: YearMonth, b: YearMonth): boolean {
  return a.year * 12 + a.month < b.year * 12 + b.month;
}

export function itemMonth(item: GoalItem): YearMonth | null {
  const { year, month } = item.target;
  return year === null || month === null ? null : { year, month };
}

export function isPriced(item: GoalItem): boolean {
  const hasPrice = item.useFixedCostMonths || (item.costCents !== null && item.costCents > 0);
  return item.name.trim() !== '' && hasPrice && itemMonth(item) !== null;
}

export function canSaveItem(item: GoalItem, thisMonth: YearMonth): boolean {
  const month = itemMonth(item);
  return isPriced(item) && month !== null && !isBefore(month, thisMonth);
}

export function sameItem(a: GoalItem, b: GoalItem): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function canStart(state: AppState): boolean {
  if (state.route === 'none') return true;
  return state.items.length > 0 && state.items.every((item) => item.name.trim() !== '');
}

export function numbersDone(state: AppState): boolean {
  return state.numbers.payCents !== null && state.numbers.fixedCents !== null;
}

export function toCalcItem(item: GoalItem): Item | null {
  const targetMonth = itemMonth(item);
  if (!isPriced(item) || !targetMonth) return null;
  return {
    costCents: item.useFixedCostMonths ? null : item.costCents,
    useFixedCostMonths: item.useFixedCostMonths,
    savedCents: item.savedCents ?? 0,
    targetMonth,
  };
}
