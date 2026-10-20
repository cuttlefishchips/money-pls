import { describe, expect, it } from 'vitest';
import { planFloor } from './floor';

describe('planFloor', () => {
  it('sets the floor at three months of fixed costs and saves 20% of pay', () => {
    expect(planFloor({ payCents: 500_000, fixedCents: 300_000 })).toEqual({
      kind: 'ok',
      floorCents: 900_000,
      needsCents: 300_000,
      spendingCents: 100_000,
      savingCents: 100_000,
    });
  });

  it('lets the person adjust the floor', () => {
    expect(planFloor({ payCents: 500_000, fixedCents: 300_000, floorCents: 1_200_000 })).toMatchObject({
      floorCents: 1_200_000,
    });
  });

  it('saves only what is left after fixed costs when that is less than 20%', () => {
    expect(planFloor({ payCents: 500_000, fixedCents: 450_000 })).toMatchObject({
      kind: 'ok',
      savingCents: 50_000,
      spendingCents: 0,
    });
  });

  it('has nothing to save or spend when pay equals fixed costs', () => {
    expect(planFloor({ payCents: 300_000, fixedCents: 300_000 })).toMatchObject({
      kind: 'ok',
      savingCents: 0,
      spendingCents: 0,
    });
  });

  it('asks to check the numbers, with nothing to save, when pay is below fixed costs', () => {
    expect(planFloor({ payCents: 200_000, fixedCents: 300_000 })).toEqual({
      kind: 'check-numbers',
      floorCents: 900_000,
    });
  });

  it('makes needs, spending and saving add up to pay', () => {
    const result = planFloor({ payCents: 412_345, fixedCents: 287_654 });
    if (result.kind !== 'ok') throw new Error('expected ok');
    expect(result.needsCents + result.spendingCents + result.savingCents).toBe(412_345);
  });

  it('rounds the saving up to the cent so spending is never overstated', () => {
    expect(planFloor({ payCents: 100_001, fixedCents: 0 })).toMatchObject({
      savingCents: 20_001,
      spendingCents: 80_000,
    });
  });

  it('rejects negative or fractional cents', () => {
    expect(() => planFloor({ payCents: -1, fixedCents: 0 })).toThrow(RangeError);
    expect(() => planFloor({ payCents: 1, fixedCents: 0, floorCents: 0.5 })).toThrow(RangeError);
  });
});
