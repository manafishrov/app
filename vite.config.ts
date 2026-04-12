import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import path from 'node:path';
import autoImport from 'unplugin-auto-import/vite';
import icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

declare const process: {
  env: {
    TAURI_DEV_HOST?: string;
  };
};

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [
    tailwindcss(),
    paraglideVitePlugin({
      project: './i18n.inlang',
      outdir: './src/paraglide',
      strategy: ['url', 'cookie', 'baseLocale'],
      emitTsDeclarations: true,
    }),
    tanstackRouter({
      target: 'solid',
      autoCodeSplitting: true,
    }),
    icons({
      compiler: 'solid',
    }),
    autoImport({
      imports: ['solid-js'],
      dts: './src/autoImports.d.ts',
    }),
    solid(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    dedupe: ['solid-js', '@tanstack/solid-router', '@tanstack/solid-form', 'tailwindcss'],
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host ?? false,
    ...(typeof host === 'string'
      ? {
          hmr: {
            protocol: 'ws',
            host,
            port: 1421,
          },
        }
      : {}),
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
});
