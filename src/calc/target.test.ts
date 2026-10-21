import { describe, expect, it } from 'vitest';
import { planItem, planTarget, soonestUnfinished, type Item, type TargetInputs } from './target';

const start = { year: 2026, month: 10 };
const item = (costCents: number | null, month: number, year = 2026, savedCents = 0, useFixedCostMonths = false): Item => ({
  costCents,
  savedCents,
  useFixedCostMonths,
  targetMonth: { year, month },
});

const base: TargetInputs = { payCents: 500_000, fixedCents: 300_000, items: [], startMonth: start };

describe('planItem', () => {
  it('spreads what is still needed over the months to its own date, counting the start month', () => {
    expect(planItem(item(300_000, 12, 2026, 30_000), 300_000, start)).toEqual({
      priceCents: 300_000,
      savedCents: 30_000,
      months: 3,
      targetMonth: { year: 2026, month: 12 },
      targetDate: { year: 2026, month: 12, day: 31 },
      monthlyAmountCents: 90_000,
      covered: false,
    });
  });

  it('rounds the monthly amount up to the cent', () => {
    expect(planItem(item(100_000, 12), 0, start).monthlyAmountCents).toBe(33_334);
  });

  it('uses one month when the date is the start month or earlier', () => {
    expect(planItem(item(50_000, 10), 0, start)).toMatchObject({ months: 1, monthlyAmountCents: 50_000 });
    expect(planItem(item(50_000, 9), 0, start)).toMatchObject({ months: 1 });
  });

  it('shows an item as already covered when saved is at least the price, adding nothing', () => {
    expect(planItem(item(150_000, 12, 2026, 150_000), 0, start)).toMatchObject({ covered: true, monthlyAmountCents: 0 });
    expect(planItem(item(150_000, 12, 2026, 200_000), 0, start)).toMatchObject({ covered: true, monthlyAmountCents: 0 });
  });

  it('prices an emergency fund at three months of fixed costs when asked', () => {
    expect(planItem(item(null, 3, 2027, 0, true), 300_000, start)).toMatchObject({
      priceCents: 900_000,
      months: 6,
      monthlyAmountCents: 150_000,
    });
  });

  it('needs a price unless months of fixed costs are used', () => {
    expect(() => planItem(item(null, 12), 0, start)).toThrow();
  });
});

describe('planTarget', () => {
  it('adds up each item and works out B = P − F − A', () => {
    const result = planTarget({
      ...base,
      items: [item(300_000, 12), item(1_200_000, 9, 2027, 0)],
    });
    expect(result).toMatchObject({ kind: 'ok', monthlyAmountCents: 200_000, goalsMonthlyCents: 200_000, safeToSpendCents: 0 });
    if (result.kind === 'ok') expect(result.items.map((i) => i.monthlyAmountCents)).toEqual([100_000, 100_000]);
  });

  it('adds nothing for covered items', () => {
    const result = planTarget({ ...base, payCents: 2_000_000, fixedCents: 1_900_000, items: [item(100_000, 12, 2026, 100_000), item(60_000, 12)] });
    expect(result).toMatchObject({ kind: 'ok', goalsMonthlyCents: 20_000 });
  });

  it('sets aside the safety saving when it is more than the goals need', () => {
    const result = planTarget({ ...base, items: [item(60_000, 12)] });
    expect(result).toMatchObject({
      kind: 'ok',
      goalsMonthlyCents: 20_000,
      safetySavingCents: 100_000,
      monthlyAmountCents: 100_000,
      safeToSpendCents: 100_000,
    });
  });

  it('sets aside the goals total when it is more than the safety saving', () => {
    const result = planTarget({ ...base, items: [item(450_000, 12)] });
    expect(result).toMatchObject({ goalsMonthlyCents: 150_000, safetySavingCents: 100_000, monthlyAmountCents: 150_000, safeToSpendCents: 50_000 });
  });

  it('caps the safety saving at what is left after fixed costs, as on the floor route', () => {
    const result = planTarget({ ...base, fixedCents: 450_000, items: [item(30_000, 12)] });
    expect(result).toMatchObject({ goalsMonthlyCents: 10_000, safetySavingCents: 50_000, monthlyAmountCents: 50_000, safeToSpendCents: 0 });
  });

  it('says how much the goals need against what is left when B would be negative', () => {
    const result = planTarget({ ...base, items: [item(900_000, 12), item(300_000, 10)] });
    expect(result).toMatchObject({ kind: 'needs-more', monthlyAmountCents: 600_000, availableCents: 200_000 });
  });

  it('asks to check the numbers when fixed costs use all of take-home pay', () => {
    expect(planTarget({ ...base, fixedCents: 500_000, items: [item(100_000, 12)] })).toEqual({ kind: 'check-numbers' });
    expect(planTarget({ ...base, fixedCents: 600_000, items: [item(100_000, 12, 2026, 100_000)] })).toEqual({
      kind: 'check-numbers',
    });
  });

  it('allows pay equal to fixed costs when every item is covered', () => {
    const result = planTarget({ ...base, fixedCents: 500_000, items: [item(100_000, 12, 2026, 100_000)] });
    expect(result).toMatchObject({ kind: 'ok', monthlyAmountCents: 0, safetySavingCents: 0, safeToSpendCents: 0 });
  });

  it('rejects negative or fractional cents', () => {
    expect(() => planTarget({ ...base, payCents: -1 })).toThrow(RangeError);
    expect(() => planTarget({ ...base, fixedCents: 1.5 })).toThrow(RangeError);
    expect(() => planTarget({ ...base, items: [item(-5, 12)] })).toThrow(RangeError);
    expect(() => planTarget({ ...base, items: [item(5, 12, 2026, -1)] })).toThrow(RangeError);
  });
});

describe('soonestUnfinished', () => {
  const plans = [
    planItem(item(100_000, 6, 2027), 0, start),
    planItem(item(100_000, 12, 2026, 100_000), 0, start),
    planItem(item(100_000, 3, 2027), 0, start),
    planItem(item(50_000, 3, 2027), 0, start),
  ];

  it('picks the item with the earliest date that still needs money, first listed on a tie', () => {
    expect(soonestUnfinished(plans, start)).toBe(plans[2]);
  });

  it('skips items whose month has passed', () => {
    expect(soonestUnfinished(plans, { year: 2027, month: 4 })).toBe(plans[0]);
  });

  it('is null when nothing still needs money', () => {
    expect(soonestUnfinished([plans[1]!], start)).toBeNull();
  });
});
