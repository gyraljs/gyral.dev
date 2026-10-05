// CSS guardrail: the site's Baseline policy (docs/design-docs/0004-design.md). A website, not
// a library, so the floor is Baseline *newly* available (Gyral's packages use *widely*).
// Anything newer goes inside @supports, with a working page without it.
/** @type {import('stylelint').Config} */
export default {
  plugins: ['stylelint-plugin-use-baseline'],
  rules: {
    'plugin/use-baseline': [true, { available: 'newly' }],
  },
  ignoreFiles: ['**/node_modules/**', 'dist/**'],
};
