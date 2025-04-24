/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions & import("@trivago/prettier-plugin-sort-imports").PluginConfig} */
const config = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  jsxSingleQuote: true,
  importOrder: [
    '^[./]',
    '^@/components/(.*)$',
    '^@/hooks/(.*)$',
    '^@/lib/(.*)$',
    '^@/stores/(.*)$',
    '^@/routes/(.*)$',
    '^@/styles/(.*)$',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  tailwindFunctions: ['cx', 'cva'],
  plugins: [
    '@trivago/prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss',
  ],
};

export default config;
