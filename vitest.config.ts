import { defineConfig } from 'vitest/config';
import { gyralVitePreset } from '@gyral/core/vite';

// Node tests: content, rendering and build helpers. The browser is covered by `pnpm smoke`,
// which runs the built site (scripts/smoke.mjs).
export default defineConfig({
  ...gyralVitePreset(),
  test: { include: ['test/**/*.test.ts'], environment: 'node' },
});
