// Lint rules are agent guardrails: every restriction message says how to fix it.
// Layers and allowed edges: ARCHITECTURE.md.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import compat from 'eslint-plugin-compat';
import globals from 'globals';

const RAW_LIT =
  "Build islands with @gyral/core define() and import html/css through it. Raw LitElement components don't hydrate in production builds (gyral consumer setup).";

export default tseslint.config(
  { ignores: ['dist/', '.smoke/', '.claude/', '.beads/', 'node_modules/'] },
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
    files: ['scripts/smoke.mjs', 'scripts/capture-showcase.mjs'],
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
            { name: 'lit', message: RAW_LIT },
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
  {
    // Server-only modules may use lit's nothing/directives but never define raw elements.
    files: ['src/render/**/*.ts', 'src/content/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['lit/decorators*', 'lit-element', '@lit/reactive-element'],
              message: RAW_LIT,
            },
          ],
        },
      ],
    },
  },
);
