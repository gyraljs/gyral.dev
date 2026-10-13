/// <reference types="node" />
// `pnpm build`, after `vite build`: renders every page to dist/ as static HTML, plus 404.html,
// sitemap.xml, the search index and the files for agents (llms.txt, llms-small.txt, llms-full.txt, a Markdown
// twin per page). dist/ is then exactly what Cloudflare Pages serves
// (docs/design-docs/0003-hosting.md).
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientAssetsFromManifest, componentsFromManifest, prerender } from '@gyral/ssr/static';
import * as pagefind from 'pagefind';
import { loadApiPages } from '../src/content/api.js';
import { loadErrorsPage } from '../src/content/errors.js';
import { loadPosts, type Post } from '../src/content/blog.js';
import { byReadingOrder, loadDocs, type DocPage } from '../src/content/docs.js';
import { buildLlmsFiles } from '../src/content/llms.js';
import { llmsProblems } from '../src/content/llms-check.js';
import { siteCsp } from '../src/render/csp.js';
import { createSite, sitemap } from '../src/render/site.js';
import { withCsp } from './lib/headers.js';
import { sitemapDates } from './lib/lastmod.js';
import type { Assets } from '../src/render/layout.js';

export async function buildSite(dist: string): Promise<readonly string[]> {
  const manifest = join(dist, '.vite', 'manifest.json');
  const entry = async (src: string) => (await clientAssetsFromManifest(manifest, src)).entry;
  const components = await componentsFromManifest(dist);
  if (components === undefined) throw new Error('vite build wrote no components manifest');
  const assets: Assets = {
    stylesheet: await entry('src/styles/site.css'),
    shortcuts: await entry('src/shortcuts.ts'),
    demoVideos: await entry('src/demo-videos.ts'),
    components,
  };
  const docs = [...(await loadDocs()), ...(await loadApiPages()), ...(await loadErrorsPage())].sort(
    byReadingOrder,
  );
  const posts = await loadPosts();
  const site = await createSite(assets, docs, posts);
  const pages = await prerender({
    app: site,
    paths: site.paths,
    outDir: dist,
    origin: 'https://gyral.dev',
  });
  await writeFile(join(dist, '404.html'), await site.notFound());
  await writeFile(join(dist, 'sitemap.xml'), sitemap(site.sitemapPaths, sitemapDates(docs, posts)));
  // public/_headers (copied by Vite) plus the Content-Security-Policy with this build's hashes.
  const headers = join(dist, '_headers');
  await writeFile(headers, withCsp(await readFile(headers, 'utf8'), await siteCsp()));
  // The manifest is build metadata, not a page asset: don't publish it.
  await rm(join(dist, '.vite'), { recursive: true, force: true });
  await indexForSearch(dist);
  await writeForAgents(dist, docs, posts);
  return pages.map((p) => p.path);
}

/**
 * The Gyral version for llms.txt: the installed @gyral/core's, or `GYRAL_DOCS_VERSION` when a
 * release branch is built before that release is on npm, so the MCP docs snapshot taken from
 * this build names the release it ships in (gyral releasing.md, step 2). Repository links still
 * use the installed release's tag (src/content/release.ts), since the new tag doesn't exist yet.
 */
const gyralVersion = (): string => {
  const installed = (
    JSON.parse(
      readFileSync(new URL('../node_modules/@gyral/core/package.json', import.meta.url), 'utf8'),
    ) as { version: string }
  ).version;
  const upcoming = process.env['GYRAL_DOCS_VERSION'];
  if (upcoming === undefined || upcoming === '') return installed;
  if (!/^\d+\.\d+\.\d+$/.test(upcoming)) {
    throw new Error(`GYRAL_DOCS_VERSION must be a version such as 0.3.4, not "${upcoming}"`);
  }
  console.log(`llms files describe Gyral ${upcoming} (installed: ${installed})`);
  return upcoming;
};

/**
 * llms.txt, llms-full.txt and a Markdown twin per page (src/content/llms.ts). Fails the build
 * when a docs page is missing from them or a file contains HTML or template leftovers.
 */
async function writeForAgents(
  dist: string,
  docs: readonly DocPage[],
  posts: readonly Post[],
): Promise<void> {
  const files = await buildLlmsFiles(gyralVersion(), docs, posts);
  const write = async (path: string, text: string) => {
    const file = join(dist, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, text);
  };
  for (const twin of files.twins) await write(twin.path, twin.markdown);
  await write('/llms.txt', files.llmsTxt);
  await write('/llms-full.txt', files.llmsFull);
  await write('/llms-small.txt', files.llmsSmall);
  const problems = llmsProblems(
    files,
    docs.map((d) => d.path),
    (path) => existsSync(join(dist, path)),
  );
  if (problems.length > 0) throw new Error(`files for agents:\n${problems.join('\n')}`);
  const kb = (text: string) => `${(Buffer.byteLength(text) / 1024).toFixed(1)} KiB`;
  console.log(
    `agents: llms.txt ${kb(files.llmsTxt)}, llms-small.txt ${kb(files.llmsSmall)}, llms-full.txt ${kb(files.llmsFull)}, ${String(files.twins.length)} Markdown twins`,
  );
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
