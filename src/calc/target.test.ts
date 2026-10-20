import { describe, expect, it } from 'vitest';
import { addMonths, planTarget, type TargetInputs } from './target';

const base: TargetInputs = {
  payCents: 500_000,
  fixedCents: 300_000,
  savingsCents: 0,
  items: [],
  startMonth: { year: 2026, month: 10 },
  targetMonth: { year: 2026, month: 12 },
};

describe('planTarget', () => {
  it('sums the items into the target and spreads what is still needed over n months', () => {
    const result = planTarget({
      ...base,
      savingsCents: 30_000,
      items: [{ costCents: 200_000 }, { costCents: 100_000 }],
    });
    expect(result).toEqual({
      kind: 'ok',
      targetCents: 300_000,
      months: 3,
      targetDate: { year: 2026, month: 12, day: 31 },
      monthlyAmountCents: 90_000,
      safeToSpendCents: 110_000,
    });
  });

  it('works out safe-to-spend as pay less fixed costs less the monthly amount', () => {
    const result = planTarget({ ...base, items: [{ costCents: 120_000 }] });
    expect(result).toMatchObject({ kind: 'ok', monthlyAmountCents: 40_000, safeToSpendCents: 160_000 });
  });

  it('uses n = 1 when the target month is the start month or earlier', () => {
    const items = [{ costCents: 50_000 }];
    expect(planTarget({ ...base, items, targetMonth: { year: 2026, month: 10 } })).toMatchObject({
      months: 1,
      monthlyAmountCents: 50_000,
    });
    expect(planTarget({ ...base, items, targetMonth: { year: 2026, month: 9 } })).toMatchObject({ months: 1 });
  });

  it('rounds the monthly amount up to the cent so the target is reached', () => {
    const result = planTarget({ ...base, items: [{ costCents: 100_000 }] });
    expect(result).toMatchObject({ monthlyAmountCents: 33_334, safeToSpendCents: 166_666 });
  });

  it('allows safe-to-spend of exactly zero', () => {
    const result = planTarget({ ...base, items: [{ costCents: 600_000 }] });
    expect(result).toMatchObject({ kind: 'ok', monthlyAmountCents: 200_000, safeToSpendCents: 0 });
  });

  describe('when savings already cover the target', () => {
    it('says so, with nothing more to set aside', () => {
      const result = planTarget({ ...base, savingsCents: 200_000, items: [{ costCents: 150_000 }] });
      expect(result).toEqual({
        kind: 'covered-by-savings',
        targetCents: 150_000,
        months: 3,
        targetDate: { year: 2026, month: 12, day: 31 },
        monthlyAmountCents: 0,
        safeToSpendCents: 200_000,
      });
    });

    it('treats savings exactly equal to the target as covered', () => {
      const result = planTarget({ ...base, savingsCents: 150_000, items: [{ costCents: 150_000 }] });
      expect(result.kind).toBe('covered-by-savings');
    });

    it('treats a target of zero as covered', () => {
      expect(planTarget({ ...base, items: [{ costCents: 0 }] }).kind).toBe('covered-by-savings');
    });
  });

  describe('when safe-to-spend would be negative', () => {
    it('offers the earliest workable month when there is money left after fixed costs', () => {
      const result = planTarget({ ...base, savingsCents: 50_000, items: [{ costCents: 1_050_000 }] });
      expect(result).toEqual({
        kind: 'too-soon',
        earliestMonths: 5,
        earliestTargetMonth: { year: 2027, month: 2 },
      });
    });

    it('gives an earliest month whose plan is workable', () => {
      const inputs = { ...base, items: [{ costCents: 1_000_001 }] };
      const tooSoon = planTarget(inputs);
      expect(tooSoon).toMatchObject({ kind: 'too-soon', earliestMonths: 6 });
      if (tooSoon.kind !== 'too-soon') throw new Error('expected too-soon');
      const retry = planTarget({ ...inputs, targetMonth: tooSoon.earliestTargetMonth });
      expect(retry.kind).toBe('ok');
      if (retry.kind === 'ok') expect(retry.safeToSpendCents).toBeGreaterThanOrEqual(0);
    });

    it('asks to check the numbers when fixed costs use all of take-home pay', () => {
      expect(planTarget({ ...base, fixedCents: 500_000, items: [{ costCents: 100_000 }] })).toEqual({
        kind: 'check-numbers',
      });
      expect(planTarget({ ...base, fixedCents: 600_000, items: [{ costCents: 100_000 }] })).toEqual({
        kind: 'check-numbers',
      });
    });

    it('asks to check the numbers when fixed costs exceed pay even if savings cover the target', () => {
      expect(
        planTarget({ ...base, fixedCents: 600_000, savingsCents: 500_000, items: [{ costCents: 100_000 }] }),
      ).toEqual({ kind: 'check-numbers' });
    });
  });

  it('rejects negative or fractional cents', () => {
    expect(() => planTarget({ ...base, payCents: -1 })).toThrow(RangeError);
    expect(() => planTarget({ ...base, fixedCents: 1.5 })).toThrow(RangeError);
    expect(() => planTarget({ ...base, items: [{ costCents: -5 }] })).toThrow(RangeError);
  });
});

describe('addMonths', () => {
  it('moves across year boundaries', () => {
    expect(addMonths({ year: 2026, month: 10 }, 0)).toEqual({ year: 2026, month: 10 });
    expect(addMonths({ year: 2026, month: 10 }, 3)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 12 }, 12)).toEqual({ year: 2027, month: 12 });
  });
});
