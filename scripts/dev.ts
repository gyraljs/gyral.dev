/// <reference types="node" />
// `pnpm dev`: Gyral's development server. Vite serves the client modules, the stylesheet and
// public/; every other request is rendered by the same code the build prerenders, reloaded per
// request so edits show up, and streamed. `components` is the islands' loader in development.
import { gyralDevServer } from '@gyral/ssr/node';
import type * as SiteModule from '../src/render/site.js';

const dev = await gyralDevServer<typeof SiteModule>({
  entry: '/src/render/site.ts',
  port: Number(process.env['PORT'] ?? 5400),
  hmrPort: Number(process.env['HMR_PORT'] ?? 24700),
  app: (site, { components }) => ({
    fetch: async (request) =>
      (
        await site.createSite({
          stylesheet: '/src/styles/site.css',
          shortcuts: '/src/shortcuts.ts',
          demoVideos: '/src/demo-videos.ts',
          ...(components === undefined ? {} : { components }),
        })
      ).fetch(request),
  }),
});
console.log(`gyral.dev: ${dev.url}`);
