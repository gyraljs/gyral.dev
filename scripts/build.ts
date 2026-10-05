/// <reference types="node" />
// `pnpm build`, after `vite build`: renders every page to dist/ as static HTML, plus 404.html
// and sitemap.xml. dist/ is then exactly what Cloudflare Pages serves
// (docs/design-docs/0003-hosting.md).
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientEntryFromManifest, prerender } from '@gyral/ssr/static';
import { createSite, sitemap } from '../src/render/site.js';
import type { Assets } from '../src/render/layout.js';

export async function buildSite(dist: string): Promise<readonly string[]> {
  const manifest = join(dist, '.vite', 'manifest.json');
  const assets: Assets = {
    clientEntry: await clientEntryFromManifest(manifest, 'src/entry-client.ts'),
    stylesheet: await clientEntryFromManifest(manifest, 'src/styles/site.css'),
  };
  const site = await createSite(assets);
  const pages = await prerender({
    app: site,
    paths: site.paths,
    outDir: dist,
    origin: 'https://gyral.dev',
  });
  await writeFile(join(dist, '404.html'), await site.notFound());
  await writeFile(join(dist, 'sitemap.xml'), sitemap(site.paths));
  // The manifest is build metadata, not a page asset: don't publish it.
  await rm(join(dist, '.vite'), { recursive: true, force: true });
  return pages.map((p) => p.path);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const paths = await buildSite(fileURLToPath(new URL('../dist', import.meta.url)));
  console.log(`built ${String(paths.length)} pages: ${paths.join(', ')}`);
}
