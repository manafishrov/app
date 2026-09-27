import path from 'node:path';
import autoImport from 'unplugin-auto-import/vite';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [autoImport({ imports: ['solid-js'], dts: false }), solid()],
  resolve: {
    // Mounted component tests need Solid's client lifecycle, not its SSR exports.
    conditions: ['browser'],
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    // Keep solid-js/web and hooks on the same runtime/owner graph.
    server: { deps: { inline: ['solid-js'] } },
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
});
