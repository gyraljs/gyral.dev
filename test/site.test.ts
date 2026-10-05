import { describe, expect, it } from 'vitest';
import { createSite, sitemap } from '../src/render/site.js';
import { headersFor, parseHeaders } from '../scripts/lib/headers.js';

const assets = {
  stylesheet: '/assets/site.css',
  clientEntry: '/assets/entry.js',
  shortcuts: '/assets/shortcuts.js',
  demoVideos: '/assets/demo-videos.js',
};
/** Pages without islands load only the search shortcut, never the islands' entry. */
const NO_ISLANDS = /<script type="module" src="(?!\/assets\/shortcuts\.js")/;
const get = async (path: string) => {
  const site = await createSite(assets);
  const res = await site.fetch(new Request(`http://localhost${path}`));
  return { status: res.status, html: await res.text() };
};

describe('pages', () => {
  it('renders the home page with SEO tags, structured data and the counter island', async () => {
    const { status, html } = await get('/');
    expect(status).toBe(200);
    expect(html).toContain('<link rel="canonical" href="https://gyral.dev/">');
    expect(html).toContain('<meta property="og:image" content="https://gyral.dev/og.png">');
    expect(html).toContain('"@type":"WebSite"');
    expect(html).toContain('<gd-loop-counter');
    expect(html).toContain('<template shadowroot'); // Declarative Shadow DOM
    expect(html).toContain('<script type="module" src="/assets/entry.js">');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it('renders docs pages without island JavaScript, with a canonical trailing slash', async () => {
    const { status, html } = await get('/docs/getting-started');
    expect(status).toBe(200);
    expect(html).toContain('href="https://gyral.dev/docs/getting-started/"');
    expect(html).toContain('<title>Getting started · Gyral</title>');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('<script type="module" src="/assets/shortcuts.js">');
    expect(html).not.toMatch(NO_ISLANDS);
    expect(html).toContain('<main id="main" data-pagefind-body');
    expect(html).toContain('<form action="/search/" method="get">');
    expect(html).toContain('<details class="docs-menu" data-pagefind-ignore>');
    expect(html).toContain(
      '<link rel="alternate" type="text/markdown" href="/docs/getting-started/index.md">',
    );
  });

  it('links a Markdown twin only from pages that have one', async () => {
    for (const path of ['/examples/', '/blog/', '/blog/introducing-gyral/', '/docs/api/core/']) {
      expect((await get(path)).html, path).toContain(`href="${path}index.md"`);
    }
    for (const path of ['/', '/brand/', '/search/']) {
      expect((await get(path)).html, path).not.toContain('type="text/markdown"');
    }
  });

  it('answers unknown paths with the 404 page', async () => {
    for (const path of ['/nope/', '/docs/no-such-page/', '/blog/no-such-post/']) {
      const { status, html } = await get(path);
      expect(status).toBe(404);
      expect(html).toContain('<meta name="robots" content="noindex">');
    }
  });

  it('lists every page in the sitemap', async () => {
    const site = await createSite(assets);
    const xml = sitemap(site.paths);
    for (const path of [
      '/',
      '/docs/getting-started/',
      '/docs/api/core/',
      '/examples/',
      '/blog/',
      '/blog/introducing-gyral/',
      '/brand/',
    ]) {
      expect(xml).toContain(`<loc>https://gyral.dev${path}</loc>`);
    }
  });

  it('renders the examples, blog and brand pages without island JavaScript', async () => {
    for (const path of [
      '/examples/',
      '/blog/',
      '/blog/introducing-gyral/',
      '/brand/',
      '/docs/api/core/',
    ]) {
      const { status, html } = await get(path);
      expect(status, path).toBe(200);
      expect(html, path).not.toMatch(NO_ISLANDS);
      expect(html.match(/<h1[\s>]/g), path).toHaveLength(1);
    }
    const post = await get('/blog/introducing-gyral/');
    expect(post.html).toContain('"@type":"BlogPosting"');
  });
});

describe('what you can build', () => {
  it('renders every demo with a poster, controls, no preload and a text description', async () => {
    const { status, html } = await get('/what-you-can-build/');
    expect(status).toBe(200);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    const videos = html.match(/<video[^>]*>/g) ?? [];
    expect(videos).toHaveLength(6); // five demos, one of them with two scenes
    for (const v of videos) {
      expect(v).toMatch(/poster="\/demos\/[\w-]+\.[0-9a-f]{8}\.webp"/);
      expect(v).toContain('preload="none"');
      expect(v).toContain('controls');
      expect(v).toContain('muted');
      expect(v).not.toContain('autoplay');
      const described = /aria-describedby="([^"]+)"/.exec(v)?.[1];
      expect(html).toContain(`id="${described ?? 'missing'}"`);
    }
    expect(html.match(/<source src="\/demos\/[^"]+\.(?:webm|mp4)" type="video\//g)).toHaveLength(
      12,
    );
    expect(html).toContain('The usual way:');
    expect(html).toContain('https://github.com/gyraljs/gyral/tree/main/examples/typeahead-race');
    expect(html).toContain('<script type="module" src="/assets/demo-videos.js">');
    expect(html).toContain('href="/what-you-can-build/index.md"');
  });

  it('loads the video script only on the demos page', async () => {
    for (const path of ['/', '/docs/', '/examples/']) {
      expect((await get(path)).html, path).not.toContain('demo-videos.js');
    }
  });

  it('teases the demos on the home page and lists the page in the nav', async () => {
    const { html } = await get('/');
    expect(html).toContain('href="/what-you-can-build/#undo-replay"');
    expect(html).toContain('<a href="/what-you-can-build/"');
  });
});

describe('search', () => {
  it('renders /search/ with the island, unindexed and out of the sitemap', async () => {
    const { status, html } = await get('/search/');
    expect(status).toBe(200);
    expect(html).toContain('<gd-site-search');
    expect(html).toContain('needs JavaScript');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).not.toContain('data-pagefind-body');
    expect(html).not.toContain('id="site-search-q"'); // no second box in the header
    const site = await createSite(assets);
    expect(site.paths).toContain('/search/');
    expect(sitemap(site.sitemapPaths)).not.toContain('/search/');
  });

  it('keeps the home and brand pages out of the search index', async () => {
    for (const path of ['/', '/brand/']) {
      expect((await get(path)).html, path).not.toContain('data-pagefind-body');
    }
  });
});

describe('_headers', () => {
  it('applies every matching rule in order', () => {
    const rules = parseHeaders('# c\n/*\n  A: 1\n/assets/*\n  B: 2\n');
    expect(headersFor(rules, '/assets/x.js')).toEqual([
      ['A', '1'],
      ['B', '2'],
    ]);
    expect(headersFor(rules, '/')).toEqual([['A', '1']]);
  });

  it('matches a splat in the middle of a pattern', () => {
    const rules = parseHeaders('/*.md\n  C: 3\n');
    expect(headersFor(rules, '/docs/x/index.md')).toEqual([['C', '3']]);
    expect(headersFor(rules, '/docs/x/')).toEqual([]);
  });
});
