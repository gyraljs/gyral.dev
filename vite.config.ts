import { defineConfig } from 'vite';
import { gyralVitePreset } from '@gyral/core/vite';

// The client build: the islands (found by `components: true`, one module each plus a small
// loader), the search shortcut, the demo video player and the site stylesheet, content-hashed,
// with manifests that scripts/build.ts reads to link them from the prerendered pages; each page
// loads only the islands it rendered. gyralVitePreset() adds Gyral's template compiler: `vite build` precompiles
// every `html` template, fails on a template rule violation (parse5 checks rule 7), and leaves
// the runtime template preparer out of the bundle. No `clientOnly: true`: the islands are
// server-rendered and hydrate in place, so the bundle needs the hydration code that option
// leaves out (a client-only build would render them fresh, replacing the server's markup).
export default defineConfig({
  ...gyralVitePreset({ components: true }),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: ['src/shortcuts.ts', 'src/demo-videos.ts', 'src/styles/site.css'],
    },
  },
});
