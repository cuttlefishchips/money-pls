import { endOfMonth, monthsToTarget, type CalDate, type YearMonth } from './dates';
import { assertCents, ceilDiv } from './money';

export interface Item {
  costCents: number;
}

export interface TargetInputs {
  payCents: number;
  fixedCents: number;
  savingsCents: number;
  items: Item[];
  startMonth: YearMonth;
  targetMonth: YearMonth;
}

export interface TargetPlan {
  targetCents: number;
  months: number;
  targetDate: CalDate;
  monthlyAmountCents: number;
  safeToSpendCents: number;
}

export type TargetResult =
  | ({ kind: 'ok' } & TargetPlan)
  | ({ kind: 'covered-by-savings' } & TargetPlan)
  | { kind: 'too-soon'; earliestMonths: number; earliestTargetMonth: YearMonth }
  | { kind: 'check-numbers' };

export function addMonths(ym: YearMonth, months: number): YearMonth {
  const index = ym.year * 12 + (ym.month - 1) + months;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function planTarget(inputs: TargetInputs): TargetResult {
  const { payCents: P, fixedCents: F, savingsCents: S } = inputs;
  assertCents('payCents', P);
  assertCents('fixedCents', F);
  assertCents('savingsCents', S);
  inputs.items.forEach((item, i) => assertCents(`items[${i}].costCents`, item.costCents));

  const target = inputs.items.reduce((total, item) => total + item.costCents, 0);
  const spare = P - F;
  const n = monthsToTarget(inputs.startMonth, inputs.targetMonth);
  const stillNeeded = Math.max(0, target - S);
  const A = ceilDiv(stillNeeded, n);
  const B = spare - A;

  if (B < 0) {
    if (spare <= 0) return { kind: 'check-numbers' };
    const earliestMonths = ceilDiv(stillNeeded, spare);
    return {
      kind: 'too-soon',
      earliestMonths,
      earliestTargetMonth: addMonths(inputs.startMonth, earliestMonths - 1),
    };
  }

  return {
    kind: stillNeeded === 0 ? 'covered-by-savings' : 'ok',
    targetCents: target,
    months: n,
    targetDate: endOfMonth(inputs.targetMonth),
    monthlyAmountCents: A,
    safeToSpendCents: B,
  };
}
