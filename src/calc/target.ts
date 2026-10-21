import { endOfMonth, monthsToTarget, type CalDate, type YearMonth } from './dates';
import { assertCents, ceilDiv } from './money';

export const FIXED_COST_MONTHS_FOR_FUND = 3;

export interface Item {
  costCents: number | null;
  useFixedCostMonths: boolean;
  savedCents: number;
  targetMonth: YearMonth;
}

export interface TargetInputs {
  payCents: number;
  fixedCents: number;
  items: Item[];
  startMonth: YearMonth;
}

export interface ItemPlan {
  priceCents: number;
  savedCents: number;
  months: number;
  targetMonth: YearMonth;
  targetDate: CalDate;
  monthlyAmountCents: number;
  covered: boolean;
}

export type TargetResult =
  | { kind: 'ok'; items: ItemPlan[]; monthlyAmountCents: number; safeToSpendCents: number }
  | { kind: 'needs-more'; items: ItemPlan[]; monthlyAmountCents: number; availableCents: number }
  | { kind: 'check-numbers' };

export function itemPrice(item: Item, fixedCents: number): number {
  if (item.useFixedCostMonths) return FIXED_COST_MONTHS_FOR_FUND * fixedCents;
  if (item.costCents === null) throw new Error('An item needs a price, or to use months of fixed costs');
  return item.costCents;
}

export function planItem(item: Item, fixedCents: number, startMonth: YearMonth): ItemPlan {
  const priceCents = itemPrice(item, fixedCents);
  assertCents('priceCents', priceCents);
  assertCents('savedCents', item.savedCents);
  const months = monthsToTarget(startMonth, item.targetMonth);
  const stillNeeded = Math.max(0, priceCents - item.savedCents);
  return {
    priceCents,
    savedCents: item.savedCents,
    months,
    targetMonth: item.targetMonth,
    targetDate: endOfMonth(item.targetMonth),
    monthlyAmountCents: ceilDiv(stillNeeded, months),
    covered: stillNeeded === 0,
  };
}

export function planTarget(inputs: TargetInputs): TargetResult {
  const { payCents: P, fixedCents: F } = inputs;
  assertCents('payCents', P);
  assertCents('fixedCents', F);

  const items = inputs.items.map((item) => planItem(item, F, inputs.startMonth));
  const A = items.reduce((total, item) => total + item.monthlyAmountCents, 0);
  const available = P - F;
  const B = available - A;

  if (B < 0) {
    if (available <= 0) return { kind: 'check-numbers' };
    return { kind: 'needs-more', items, monthlyAmountCents: A, availableCents: available };
  }
  return { kind: 'ok', items, monthlyAmountCents: A, safeToSpendCents: B };
}

export function soonestUnfinished(items: ItemPlan[], thisMonth: YearMonth): ItemPlan | null {
  const index = (ym: YearMonth) => ym.year * 12 + ym.month;
  let soonest: ItemPlan | null = null;
  for (const item of items) {
    if (item.monthlyAmountCents === 0 || index(item.targetMonth) < index(thisMonth)) continue;
    if (!soonest || index(item.targetMonth) < index(soonest.targetMonth)) soonest = item;
  }
  return soonest;
}
