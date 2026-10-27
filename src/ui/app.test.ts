import { describe, expect, it } from 'vitest';
import { changeNotice, spendPreview } from './app';

describe('changeNotice', () => {
  it('says how the daily number moves when an item is first priced', () => {
    expect(changeNotice('Travel', 'June 2027', 4_500, 3_207, false)).toBe('Adding Travel by June 2027: S$32 a day, down from S$45.');
    expect(changeNotice('Travel', 'June 2027', 2_500, 3_207, false)).toBe('Adding Travel by June 2027: S$32 a day, up from S$25.');
    expect(changeNotice('Travel', 'June 2027', 3_207, 3_207, false)).toBe('Adding Travel by June 2027: still S$32 a day.');
  });

  it('says the safety saving already covers a goal that leaves the number unchanged', () => {
    expect(changeNotice('Travel', 'June 2027', 6_000, 6_000, true)).toBe(
      'Adding Travel by June 2027: still S$60 a day, your safety saving already covers it.',
    );
  });

  it('leaves out the numbers when either is not set', () => {
    expect(changeNotice('Travel', 'June 2027', null, 3_207, false)).toBe('Adding Travel by June 2027.');
    expect(changeNotice('Travel', 'June 2027', 4_500, null, false)).toBe('Adding Travel by June 2027.');
  });
});

describe('spendPreview', () => {
  it('shows what the text box will save', () => {
    expect(spendPreview('12.50 white beehoon')).toBe('S$12.50, white beehoon');
    expect(spendPreview('4')).toBe('S$4');
  });

  it('asks for an amount when none is found, and says nothing when empty', () => {
    expect(spendPreview('white beehoon')).toBe('Add an amount, like 12.50, at the start.');
    expect(spendPreview('  ')).toBe('');
  });
});
