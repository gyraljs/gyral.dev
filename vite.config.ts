import { defineConfig } from 'vite';
import { gyralVitePreset } from '@gyral/core/vite';

// The client build: the islands' entry and the site stylesheet, content-hashed, with a
// manifest that scripts/build.ts reads to link them from the prerendered pages.
// gyralVitePreset(): one Lit copy (Gyral comes from a link: path until 0.1 is published).
export default defineConfig({
  ...gyralVitePreset(),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: { input: ['src/entry-client.ts', 'src/styles/site.css'] },
  },
});
