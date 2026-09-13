import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Mounted component tests need Solid's client lifecycle, not its SSR exports.
    conditions: ['browser'],
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    // Keep solid-js/web and hooks on the same runtime/owner graph.
    server: { deps: { inline: ['solid-js'] } },
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
