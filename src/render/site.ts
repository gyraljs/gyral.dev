// The route table and the request handler: one function renders every page, and it serves
// both the dev server (per request) and the build (prerendered to files).
import { html, type ChildValue } from '@gyral/core';
import { renderToStream, renderToString } from '@gyral/ssr';
import { loadApiPages } from '../content/api.js';
import { loadErrorsPage } from '../content/errors.js';
import { byReadingOrder, loadDocs, type DocPage } from '../content/docs.js';
import { absolute } from '../site.js';
import { docBody, docMeta } from './docs.js';
import { loadPosts, type Post } from '../content/blog.js';
import { blogBody, blogMeta, postBody, postMeta } from './blog.js';
import { brandBody, brandMeta } from './brand.js';
import { demosBody, demosMeta, DEMOS_PATH } from './demos.js';
import { examplesBody, examplesMeta } from './examples.js';
import { homeBody, homeMeta } from './home.js';
import { layout, type Assets, type PageMeta } from './layout.js';
import { searchBody, searchMeta } from './search.js';

interface Route {
  readonly meta: PageMeta;
  readonly body: () => ChildValue | Promise<ChildValue>;
}

export interface Site {
  /** Every page, for the prerender step. */
  readonly paths: readonly string[];
  /** The indexable pages (no `noindex`), for the sitemap. */
  readonly sitemapPaths: readonly string[];
  /** A full page Response for a GET; unknown paths get the 404 page. */
  readonly fetch: (request: Request) => Promise<Response>;
  /** The 404 document (written to 404.html, which Cloudflare Pages serves for unknown URLs). */
  readonly notFound: () => Promise<string>;
}

const notFoundMeta: PageMeta = {
  path: '/404.html',
  title: 'Page not found',
  description: 'There is no page at this address.',
  noindex: true,
};

const notFoundBody = () => html`
  <section class="not-found prose" aria-labelledby="nf-title">
    <h1 id="nf-title">Page not found</h1>
    <p>There's no page at this address. It may have moved while the docs grow.</p>
    <p><a href="/">Go to the home page</a> or <a href="/docs/">browse the docs</a>.</p>
  </section>
`;

const HTML = { 'content-type': 'text/html; charset=utf-8' };

/** Paths always end with a slash; `/docs` and `/docs/` are the same page. */
const normalise = (pathname: string): string =>
  pathname.endsWith('/') ? pathname : `${pathname}/`;

export async function createSite(
  assets: Assets,
  docs?: readonly DocPage[],
  blog?: readonly Post[],
): Promise<Site> {
  const pages =
    docs ??
    [...(await loadDocs()), ...(await loadApiPages()), ...(await loadErrorsPage())].sort(
      byReadingOrder,
    );
  const posts = blog ?? (await loadPosts());
  const table = new Map<string, Route>([
    ['/', { meta: homeMeta, body: homeBody }],
    [DEMOS_PATH, { meta: demosMeta, body: demosBody }],
    ['/examples/', { meta: examplesMeta, body: examplesBody }],
    ['/blog/', { meta: blogMeta, body: () => blogBody(posts) }],
    ['/brand/', { meta: brandMeta, body: brandBody }],
    ['/search/', { meta: searchMeta, body: searchBody }],
  ]);
  for (const post of posts) {
    table.set(post.path, { meta: postMeta(post), body: () => postBody(post) });
  }
  for (const doc of pages) {
    table.set(doc.path, { meta: docMeta(doc), body: () => docBody(pages, doc) });
  }

  const notFound = async () => renderToString(layout(notFoundMeta, notFoundBody(), assets));

  return {
    paths: [...table.keys()],
    sitemapPaths: [...table].filter(([, r]) => r.meta.noindex !== true).map(([path]) => path),
    notFound,
    async fetch(request) {
      const { pathname } = new URL(request.url);
      const route = table.get(normalise(pathname));
      if (route === undefined) {
        return new Response(await notFound(), { status: 404, headers: HTML });
      }
      const document = layout(route.meta, await route.body(), assets);
      return new Response(renderToStream(document), { headers: HTML });
    },
  };
}

/** sitemap.xml for every indexable path. */
export const sitemap = (paths: readonly string[]): string =>
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${absolute(p)}</loc></url>`).join('\n')}
</urlset>
`;
