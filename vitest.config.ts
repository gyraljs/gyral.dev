import { defineConfig } from 'vitest/config';
import { gyralVitePreset } from '@gyral/core/vite';

// Node tests: content, rendering and build helpers. The browser is covered by `pnpm smoke`,
// which runs the built site (scripts/smoke.mjs).
export default defineConfig({
  ...gyralVitePreset(),
  // The first render in a file loads every docs page, highlights it and runs the TypeScript
  // compiler over the packages' types for the API reference: seconds, more on a busy machine.
  test: { include: ['test/**/*.test.ts'], environment: 'node', testTimeout: 30_000 },
});
