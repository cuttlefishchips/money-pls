import { describe, expect, it } from 'vitest';
import { EVENT_TYPES, isValidCode, isValidEvent } from './schema';

const base = { v: 1, code: 'P3', ts: 1_760_000_000_000 };

describe('allowed event list', () => {
  it('has exactly the six types in SPEC.md section 6', () => {
    expect([...EVENT_TYPES].sort()).toEqual(
      ['budget_viewed', 'session', 'spend_logged', 'start_route', 'target_decision', 'target_set_later'].sort(),
    );
  });

  it.each([
    { ...base, type: 'session', duration_s: 120 },
    { ...base, type: 'spend_logged' },
    { ...base, type: 'budget_viewed' },
    { ...base, type: 'start_route', route: 'areas' },
    { ...base, type: 'start_route', route: 'one' },
    { ...base, type: 'start_route', route: 'none' },
    { ...base, type: 'target_decision', decision: 'accepted' },
    { ...base, type: 'target_decision', decision: 'adjusted' },
    { ...base, type: 'target_decision', decision: 'rejected' },
    { ...base, type: 'target_set_later' },
  ])('accepts $type $route$decision', (event) => {
    expect(isValidEvent(event)).toBe(true);
  });

  it.each([
    ['an unknown type', { ...base, type: 'screen_viewed' }],
    ['an amount on a spend', { ...base, type: 'spend_logged', amountCents: 500 }],
    ['an amount on any event', { ...base, type: 'budget_viewed', amount: 12 }],
    ['a note', { ...base, type: 'spend_logged', note: 'lunch' }],
    ['a field from another type', { ...base, type: 'session', duration_s: 5, route: 'one' }],
    ['a missing extra field', { ...base, type: 'session' }],
    ['a route not on the list', { ...base, type: 'start_route', route: 'other' }],
    ['a decision not on the list', { ...base, type: 'target_decision', decision: 'maybe' }],
    ['a fractional duration', { ...base, type: 'session', duration_s: 1.5 }],
    ['a negative duration', { ...base, type: 'session', duration_s: -1 }],
    ['a duration as text', { ...base, type: 'session', duration_s: '10' }],
    ['the wrong version', { ...base, v: 2, type: 'spend_logged' }],
    ['no version', { code: 'P3', ts: 1, type: 'spend_logged' }],
    ['a missing timestamp', { v: 1, code: 'P3', type: 'spend_logged' }],
    ['a code with free text', { ...base, code: 'Jane Tan', type: 'spend_logged' }],
    ['an empty code', { ...base, code: '', type: 'spend_logged' }],
  ])('rejects %s', (_label, event) => {
    expect(isValidEvent(event)).toBe(false);
  });

  it('rejects things that are not plain objects', () => {
    expect(isValidEvent(null)).toBe(false);
    expect(isValidEvent([])).toBe(false);
    expect(isValidEvent('spend_logged')).toBe(false);
  });

  it('does not treat built-in object keys as event types', () => {
    expect(isValidEvent({ ...base, type: 'toString' })).toBe(false);
    expect(isValidEvent({ ...base, type: '__proto__' })).toBe(false);
  });
});

describe('isValidCode', () => {
  it('accepts short letter and number codes', () => {
    expect(isValidCode('P3')).toBe(true);
    expect(isValidCode('ORG1')).toBe(true);
  });

  it('rejects anything that could carry free text', () => {
    expect(isValidCode('P 3')).toBe(false);
    expect(isValidCode('P3&amount=5')).toBe(false);
    expect(isValidCode('A'.repeat(13))).toBe(false);
    expect(isValidCode(3)).toBe(false);
  });
});
