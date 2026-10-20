/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { basePath } from './config/base-path';

export default defineConfig({
  base: basePath(process.env.GITHUB_REPOSITORY),
  test: {
    include: ['src/**/*.test.ts', 'config/**/*.test.ts'],
  },
});
