/// <reference types="node" />
// `pnpm build`, after `vite build`: renders every page to dist/ as static HTML, plus 404.html
// and sitemap.xml. dist/ is then exactly what Cloudflare Pages serves
// (docs/design-docs/0003-hosting.md).
import { readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientEntryFromManifest, prerender } from '@gyral/ssr/static';
import * as pagefind from 'pagefind';
import { createSite, sitemap } from '../src/render/site.js';
import type { Assets } from '../src/render/layout.js';

export async function buildSite(dist: string): Promise<readonly string[]> {
  const manifest = join(dist, '.vite', 'manifest.json');
  const assets: Assets = {
    clientEntry: await clientEntryFromManifest(manifest, 'src/entry-client.ts'),
    stylesheet: await clientEntryFromManifest(manifest, 'src/styles/site.css'),
    shortcuts: await clientEntryFromManifest(manifest, 'src/shortcuts.ts'),
  };
  const site = await createSite(assets);
  const pages = await prerender({
    app: site,
    paths: site.paths,
    outDir: dist,
    origin: 'https://gyral.dev',
  });
  await writeFile(join(dist, '404.html'), await site.notFound());
  await writeFile(join(dist, 'sitemap.xml'), sitemap(site.sitemapPaths));
  // The manifest is build metadata, not a page asset: don't publish it.
  await rm(join(dist, '.vite'), { recursive: true, force: true });
  await indexForSearch(dist);
  return pages.map((p) => p.path);
}

/**
 * The site search index (docs/design-docs/0003-hosting.md, "Search"): Pagefind reads the
 * prerendered pages' `<main data-pagefind-body>` and writes static index files to
 * dist/pagefind/. The search island loads pagefind.js from there; Pagefind's own UI bundles
 * are not used, so they aren't published.
 */
async function indexForSearch(dist: string): Promise<void> {
  // `<>@` keep tokens like `<gd-x>` and `@gyral/core` searchable as written.
  const { index, errors } = await pagefind.createIndex({ includeCharacters: '<>@' });
  if (index === undefined) throw new Error(`pagefind: ${errors.join('; ')}`);
  const added = await index.addDirectory({ path: dist });
  if (added.errors.length > 0) throw new Error(`pagefind: ${added.errors.join('; ')}`);
  const out = join(dist, 'pagefind');
  const written = await index.writeFiles({ outputPath: out });
  if (written.errors.length > 0) throw new Error(`pagefind: ${written.errors.join('; ')}`);
  await pagefind.close();
  for (const file of await readdir(out)) {
    if (/^pagefind-(?:component-ui|modular-ui|ui|highlight)\./.test(file))
      await rm(join(out, file));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const paths = await buildSite(fileURLToPath(new URL('../dist', import.meta.url)));
  console.log(`built ${String(paths.length)} pages: ${paths.join(', ')}`);
}
