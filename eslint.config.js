// Lint rules are agent guardrails: every restriction message says how to fix it.
// Layers and allowed edges: ARCHITECTURE.md.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import compat from 'eslint-plugin-compat';
import globals from 'globals';
import gyral from '@gyral/core/eslint';

const SERVER_ONLY =
  'Islands run in the browser: server rendering (@gyral/core/server, @gyral/ssr) stays in src/render. Hydration is built into @gyral/core.';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      '.smoke/',
      '.visual/',
      '.claude/',
      '.beads/',
      '.pnpm-store/',
      'node_modules/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  // Gyral's template rules (the same messages as `vite build`) and pure `each` rows.
  { files: ['src/**/*.ts', 'test/**/*.ts'], ...gyral.configs.recommended },
  {
    files: ['**/*.{js,mjs}'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: globals.node,
    },
  },
  {
    // Playwright scripts: page.evaluate() callbacks run in the browser.
    files: [
      'scripts/smoke.mjs',
      'scripts/visual.mjs',
      'scripts/capture-showcase.mjs',
      'scripts/check-interop.mjs',
    ],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // Browser code: the islands and the client entry. Baseline policy via .browserslistrc.
    files: ['src/islands/**/*.ts', 'src/entry-client.ts', 'src/shortcuts.ts'],
    plugins: { compat },
    languageOptions: { globals: globals.browser },
    rules: {
      'compat/compat': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@gyral/core/server', message: SERVER_ONLY },
            { name: '@gyral/ssr', message: SERVER_ONLY },
            {
              name: 'marked',
              message: 'Markdown renders at build time (src/content), never in the browser.',
            },
            {
              name: 'shiki',
              message: 'Highlighting runs at build time (src/content), never in the browser.',
            },
          ],
          patterns: [
            { group: ['node:*'], message: 'Islands run in the browser: no Node built-ins.' },
            { group: ['@gyral/ssr/*'], message: SERVER_ONLY },
            {
              group: ['../render/*', '../content/*'],
              message:
                'Islands must not import server-only modules (src/render, src/content). See ARCHITECTURE.md.',
            },
          ],
        },
      ],
    },
  },
);
