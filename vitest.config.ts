import path from 'node:path';
import autoImport from 'unplugin-auto-import/vite';
import icons from 'unplugin-icons/vite';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    autoImport({ imports: ['solid-js'], dts: false }),
    solid(),
    icons({ compiler: 'solid' }),
  ],
  resolve: {
    dedupe: ['solid-js', '@ark-ui/solid'],
    // Mounted component tests need Solid's client lifecycle, not its SSR exports.
    conditions: ['browser'],
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    // Keep solid-js/web and hooks on the same runtime/owner graph.
    server: { deps: { inline: ['solid-js', '@manafishrov/ui', '@ark-ui/solid'] } },
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
});
