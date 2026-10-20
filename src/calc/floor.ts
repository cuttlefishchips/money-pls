import { assertCents, ceilDiv } from './money';

export const DEFAULT_FLOOR_MONTHS = 3;

export interface FloorInputs {
  payCents: number;
  fixedCents: number;
  floorCents?: number;
}

export interface FloorSplit {
  floorCents: number;
  needsCents: number;
  spendingCents: number;
  savingCents: number;
}

export type FloorResult = ({ kind: 'ok' } & FloorSplit) | { kind: 'check-numbers'; floorCents: number };

export function planFloor(inputs: FloorInputs): FloorResult {
  const { payCents: P, fixedCents: F } = inputs;
  assertCents('payCents', P);
  assertCents('fixedCents', F);
  const floorCents = inputs.floorCents ?? DEFAULT_FLOOR_MONTHS * F;
  assertCents('floorCents', floorCents);

  if (P < F) return { kind: 'check-numbers', floorCents };

  const A = Math.min(ceilDiv(P, 5), P - F);
  return { kind: 'ok', floorCents, needsCents: F, spendingCents: P - F - A, savingCents: A };
}
