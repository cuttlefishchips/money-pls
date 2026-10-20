import { describe, expect, it } from 'vitest';
import { basePath } from './base-path';

describe('basePath', () => {
  it('uses the repository name from GITHUB_REPOSITORY', () => {
    expect(basePath('someone/money-pls')).toBe('/money-pls/');
    expect(basePath('someone/renamed-repo')).toBe('/renamed-repo/');
  });

  it('falls back to the root outside GitHub Actions', () => {
    expect(basePath(undefined)).toBe('/');
    expect(basePath('')).toBe('/');
  });
});
