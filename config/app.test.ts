import { describe, expect, it } from 'vitest';
import { ratingFormUrl } from './app';

describe('ratingFormUrl', () => {
  it('fills the participant code into the pre-filled link', () => {
    const template = 'https://docs.google.com/forms/d/e/FORM/viewform?usp=pp_url&entry.123={code}';
    expect(ratingFormUrl('P3', template)).toBe('https://docs.google.com/forms/d/e/FORM/viewform?usp=pp_url&entry.123=P3');
  });

  it('is empty until a link with a {code} slot is set', () => {
    expect(ratingFormUrl('P3', '')).toBeNull();
    expect(ratingFormUrl('P3', 'https://forms.gle/abc')).toBeNull();
  });
});
