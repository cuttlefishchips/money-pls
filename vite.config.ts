/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { APP_DESCRIPTION, APP_NAME } from './config/app';
import { basePath } from './config/base-path';

export default defineConfig({
  base: basePath(process.env.GITHUB_REPOSITORY),
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        id: './',
        name: APP_NAME,
        short_name: APP_NAME,
        description: APP_DESCRIPTION,
        lang: 'en-SG',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f6f7f4',
        theme_color: '#f6f7f4',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,png,svg,webmanifest,woff,woff2}'],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'config/**/*.test.ts'],
  },
});
