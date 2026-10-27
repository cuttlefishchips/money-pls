import { dailyStatus } from '../../calc/daily';
import type { CalDate } from '../../calc/dates';
import { planFloor } from '../../calc/floor';
import { planTarget, soonestUnfinished, type ItemPlan } from '../../calc/target';
import { FUND_CHOICE, toCalcItem, type AppState } from '../state';

export type GoalView =
  | { id: string; name: string; priced: false }
  | { id: string; name: string; priced: true; plan: ItemPlan; usesFixedCosts: boolean };

export interface TodayModel {
  mode: 'floor' | 'target';
  status: 'ok' | 'needs-more' | 'check-numbers';
  dailyCents: number | null;
  usedUp: boolean;
  tiedTo: string | null;
  setAsideCents: number | null;
  leftCents: number | null;
  pace: 'ahead' | 'within' | 'over' | null;
  freeToEnjoyCents: number | null;
  delayWeeks: number | null;
  neededCents: number | null;
  availableCents: number | null;
  floorCents: number | null;
  safetyCoversGoals: boolean;
  goals: GoalView[];
}

export interface TodayInputs {
  state: AppState;
  spentCents: number;
  today: CalDate;
  stale?: boolean;
}

export function buildToday({ state, spentCents, today, stale = false }: TodayInputs): TodayModel {
  const payCents = state.numbers.payCents ?? 0;
  const fixedCents = state.numbers.fixedCents ?? 0;
  const setupDate = state.setupDate ?? today;

  const priced = state.items.flatMap((item) => {
    const calcItem = toCalcItem(item);
    return calcItem ? [{ item, calcItem }] : [];
  });

  const empty: TodayModel = {
    mode: priced.length ? 'target' : 'floor',
    status: 'ok',
    dailyCents: null,
    usedUp: false,
    tiedTo: null,
    setAsideCents: null,
    leftCents: null,
    pace: null,
    freeToEnjoyCents: null,
    delayWeeks: null,
    neededCents: null,
    availableCents: null,
    floorCents: null,
    safetyCoversGoals: false,
    goals: state.items.map((item) => ({ id: item.id, name: item.name, priced: false })),
  };

  const withDaily = (base: TodayModel, safeToSpendCents: number, delayItemMonthlyCents: number | null): TodayModel => {
    const status = dailyStatus({ safeToSpendCents, delayItemMonthlyCents, spentCents, setupDate, today });
    const hideAhead = stale && status.pace === 'ahead';
    return {
      ...base,
      dailyCents: status.dailyCents,
      usedUp: status.usedUp,
      pace: hideAhead ? null : status.pace,
      freeToEnjoyCents: hideAhead ? null : status.freeToEnjoyCents,
      delayWeeks: status.delayWeeks,
    };
  };

  if (!priced.length) {
    const floor = planFloor({ payCents, fixedCents });
    if (floor.kind === 'check-numbers') return { ...empty, status: 'check-numbers', floorCents: floor.floorCents };
    return withDaily(
      { ...empty, setAsideCents: floor.savingCents, leftCents: floor.spendingCents, floorCents: floor.floorCents },
      floor.spendingCents,
      null,
    );
  }

  const plan = planTarget({ payCents, fixedCents, items: priced.map((p) => p.calcItem), startMonth: setupDate });
  if (plan.kind === 'check-numbers') return { ...empty, status: 'check-numbers' };

  const plans = new Map(priced.map((p, i) => [p.item.id, plan.items[i]!]));
  const goals: GoalView[] = state.items.map((item) => {
    const itemPlan = plans.get(item.id);
    return itemPlan
      ? { id: item.id, name: item.name, priced: true, plan: itemPlan, usesFixedCosts: item.choice === FUND_CHOICE && item.useFixedCostMonths }
      : { id: item.id, name: item.name, priced: false };
  });

  if (plan.kind === 'needs-more') {
    return { ...empty, goals, status: 'needs-more', neededCents: plan.monthlyAmountCents, availableCents: plan.availableCents };
  }

  const soonest = soonestUnfinished(plan.items, today);
  const soonestIndex = soonest ? plan.items.indexOf(soonest) : -1;
  return withDaily(
    {
      ...empty,
      goals,
      tiedTo: soonestIndex >= 0 ? priced[soonestIndex]!.item.name : null,
      setAsideCents: plan.monthlyAmountCents,
      leftCents: plan.safeToSpendCents,
      safetyCoversGoals: plan.safetySavingCents >= plan.goalsMonthlyCents,
    },
    plan.safeToSpendCents,
    soonest?.monthlyAmountCents ?? null,
  );
}

export function spentThisMonth(spends: { date: string; amountCents: number }[], today: CalDate): number {
  const prefix = `${today.year}-${String(today.month).padStart(2, '0')}-`;
  return spends.filter((s) => s.date.startsWith(prefix)).reduce((total, s) => total + s.amountCents, 0);
}
