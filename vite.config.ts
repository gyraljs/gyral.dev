import { defineConfig } from 'vite';
import { gyralVitePreset } from '@gyral/core/vite';

// The client build: the islands' entry, the search shortcut, the demo video player and the site
// stylesheet, content-hashed, with a manifest that scripts/build.ts reads to link them from the
// prerendered pages. gyralVitePreset() adds Gyral's template compiler: `vite build` precompiles
// every `html` template, fails on a template rule violation (parse5 checks rule 7), and leaves
// the runtime template preparer out of the bundle.
export default defineConfig({
  ...gyralVitePreset(),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: [
        'src/entry-client.ts',
        'src/shortcuts.ts',
        'src/demo-videos.ts',
        'src/styles/site.css',
      ],
    },
  },
});
