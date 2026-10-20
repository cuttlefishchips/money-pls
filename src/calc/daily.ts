import { budgetPeriod, prorateCents, type CalDate } from './dates';
import { assertCents, ceilDiv, floorDiv } from './money';

const WEEKS_PER_MONTH_X100 = 435;

export interface DailyInputs {
  route: 'target' | 'floor';
  safeToSpendCents: number;
  monthlyAmountCents: number;
  spentCents: number;
  setupDate: CalDate;
  today: CalDate;
}

export interface DailyStatus {
  budgetCents: number;
  dailyCents: number;
  usedUp: boolean;
  pace: 'ahead' | 'within' | 'over';
  freeToEnjoyCents: number | null;
  delayWeeks: number | null;
  daysLeft: number;
}

export function dailyStatus(inputs: DailyInputs): DailyStatus {
  const { safeToSpendCents, monthlyAmountCents: A, spentCents: spent } = inputs;
  assertCents('safeToSpendCents', safeToSpendCents);
  assertCents('monthlyAmountCents', A);
  assertCents('spentCents', spent);

  const period = budgetPeriod(inputs.today, inputs.setupDate);
  const B = period.isFirstMonth ? prorateCents(safeToSpendCents, inputs.setupDate) : safeToSpendCents;

  const remaining = B - spent;
  const usedUp = remaining <= 0;
  const dailyCents = usedUp ? 0 : floorDiv(remaining, period.daysLeft);

  const evenShareX = B * period.daysElapsed;
  const spentX = spent * period.periodDays;
  const ahead = spentX < evenShareX - B;
  const over = spent > B;

  const showDelay = over && inputs.route === 'target' && A > 0;

  return {
    budgetCents: B,
    dailyCents,
    usedUp,
    pace: over ? 'over' : ahead ? 'ahead' : 'within',
    freeToEnjoyCents: ahead ? floorDiv(evenShareX - spentX, period.periodDays) : null,
    delayWeeks: showDelay ? ceilDiv((spent - B) * WEEKS_PER_MONTH_X100, A * 100) : null,
    daysLeft: period.daysLeft,
  };
}
