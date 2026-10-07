import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { siteCsp } from '../src/render/csp.js';
import { createSite, sitemap } from '../src/render/site.js';
import { headersFor, parseHeaders, withCsp } from '../scripts/lib/headers.js';
import { lastCommitDates, sitemapDates, type Git } from '../scripts/lib/lastmod.js';
import type { Post } from '../src/content/blog.js';
import type { DocPage } from '../src/content/docs.js';
import { parseRedirects, redirectFor } from '../scripts/lib/redirects.js';

const assets = {
  stylesheet: '/assets/site.css',
  clientEntry: '/assets/entry.js',
  clientPreload: ['/assets/hydration-client.js'],
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
    expect(html).toContain('<link rel="modulepreload" href="/assets/hydration-client.js">');
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
    expect(html).not.toContain('modulepreload');
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
    expect(videos).toHaveLength(4); // three demos, one of them with two scenes
    for (const v of videos) {
      expect(v).toMatch(/poster="\/demos\/[\w-]+\.[0-9a-f]{8}\.webp"/);
      expect(v).toContain('preload="none"');
      expect(v).toContain('controls');
      expect(v).toContain('muted');
      expect(v).not.toContain('autoplay');
      const described = /aria-describedby="([^"]+)"/.exec(v)?.[1];
      expect(html).toContain(`id="${described ?? 'missing'}"`);
    }
    expect(html.match(/<source src="\/demos\/[^"]+\.(?:webm|mp4)" type="video\//g)).toHaveLength(8);
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

describe('Content-Security-Policy', () => {
  it('allows every inline <style> by hash, without unsafe-inline', async () => {
    const csp = await siteCsp();
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).toMatch(/^default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; /);
    const styleSrc = csp.split('; ').find((d) => d.startsWith('style-src '));
    for (const path of ['/', '/search/']) {
      const { html } = await get(path);
      const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1] ?? '');
      expect(styles.length, path).toBeGreaterThan(0);
      for (const text of styles) {
        const hash = createHash('sha256').update(text).digest('base64');
        expect(styleSrc, `${path}: <style> not in style-src`).toContain(`'sha256-${hash}'`);
      }
    }
  });

  it('has no inline style attributes on any kind of page', async () => {
    for (const path of ['/', '/docs/views/', '/docs/api/core/', '/examples/', '/brand/']) {
      expect((await get(path)).html, path).not.toMatch(/<[a-z][^<>]*\sstyle=/i);
    }
  });
});

describe('_headers', () => {
  it('gets the Content-Security-Policy on the /* rule', () => {
    const text = withCsp('# c /*\n/*\n  A: 1\n/assets/*\n  B: 2\n', "default-src 'self'");
    expect(headersFor(parseHeaders(text), '/')).toEqual([
      ['Content-Security-Policy', "default-src 'self'"],
      ['A', '1'],
    ]);
    expect(() => withCsp('/assets/*\n  B: 2\n', 'x')).toThrow(/no "\/\*" rule/);
  });

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

  it('detaches a header a more general rule set (`! Name`, any case)', () => {
    const rules = parseHeaders('/*\n  A: 1\n  B: 2\n/x.xml\n  ! a\n');
    expect(headersFor(rules, '/x.xml')).toEqual([['B', '2']]);
    expect(headersFor(rules, '/')).toEqual([
      ['A', '1'],
      ['B', '2'],
    ]);
  });

  it('keeps the CSP off files that browsers show in built-in viewers, and on pages', () => {
    // The built file: public/_headers plus the CSP scripts/build.ts adds to /*.
    const rules = parseHeaders(
      withCsp(readFileSync('public/_headers', 'utf8'), "default-src 'self'"),
    );
    const names = (path: string) => headersFor(rules, path).map(([k]) => k.toLowerCase());
    for (const path of [
      '/sitemap.xml',
      '/robots.txt',
      '/llms.txt',
      '/llms-full.txt',
      '/docs/intent/index.md',
    ]) {
      expect(names(path), path).not.toContain('content-security-policy');
      expect(names(path), path).toContain('x-content-type-options');
      expect(names(path), path).toContain('strict-transport-security');
    }
    for (const path of ['/', '/docs/intent/', '/errors/', '/404.html']) {
      expect(names(path), path).toContain('content-security-policy');
    }
  });
});

describe('sitemap <lastmod>', () => {
  const doc = (slug: string, source?: string) =>
    ({ slug, path: `/docs/${slug}/`, source }) as unknown as DocPage;
  const post = { path: '/blog/hello/', date: '2026-10-05' } as Post;
  /** A fake git: a full clone where every file was last committed on 2026-10-01. */
  const git =
    (shallow: boolean): Git =>
    (args) =>
      args[0] === 'rev-parse' ? String(shallow) : args[0] === 'log' ? '2026-10-01' : undefined;

  it('writes <lastmod> only for the pages it is given a date for', () => {
    const xml = sitemap(['/', '/blog/hello/'], new Map([['/blog/hello/', '2026-10-05']]));
    expect(xml).toContain('<url><loc>https://gyral.dev/</loc></url>');
    expect(xml).toContain(
      '<url><loc>https://gyral.dev/blog/hello/</loc><lastmod>2026-10-05</lastmod></url>',
    );
  });

  it('dates posts by front matter and Markdown docs by their last commit', () => {
    const dates = sitemapDates(
      [doc('intent'), doc('api/core', 'https://…')],
      [post],
      git(false),
      '2026-10-07',
    );
    expect([...dates]).toEqual([
      ['/docs/intent/', '2026-10-01'],
      ['/blog/hello/', '2026-10-05'],
    ]);
  });

  it('gives a post dated in the future no date', () => {
    expect([...sitemapDates([], [post], git(false), '2026-10-04')]).toEqual([]);
  });

  it('gives docs no date in a shallow clone, where every file has the clone’s date', () => {
    expect([...sitemapDates([doc('intent')], [post], git(true), '2026-10-07')]).toEqual([
      ['/blog/hello/', '2026-10-05'],
    ]);
  });

  it('reads real commit dates, and none for a file git doesn’t know', () => {
    const dates = lastCommitDates(['content/docs/intent.md', 'content/docs/no-such-page.md']);
    if (dates.size === 0) return; // no git history here (a shallow or exported checkout)
    expect(dates.get('content/docs/intent.md')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dates.has('content/docs/no-such-page.md')).toBe(false);
  });
});

describe('_redirects', () => {
  // public/ is copied into dist/ by Vite, so this is the file Cloudflare Pages gets; `pnpm smoke`
  // checks the built copy answers through the preview server.
  const rules = parseRedirects(
    readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8'),
  );

  it('sends the renamed post to its new URL with a permanent redirect', async () => {
    for (const from of ['/blog/why-i-rebuilt-cyclejs/', '/blog/why-i-rebuilt-cyclejs']) {
      expect(redirectFor(rules, from), from).toEqual({
        from,
        to: '/blog/why-i-built-gyral/',
        status: 301,
      });
    }
    expect(redirectFor(rules, '/blog/why-i-rebuilt-cyclejs/index.md')).toEqual({
      from: '/blog/why-i-rebuilt-cyclejs/index.md',
      to: '/blog/why-i-built-gyral/index.md',
      status: 301,
    });
    expect((await get('/blog/why-i-built-gyral/')).status).toBe(200);
    expect((await get('/blog/why-i-rebuilt-cyclejs/')).status).toBe(404);
  });

  it('only redirects to pages that exist', async () => {
    const site = await createSite(assets);
    for (const { to } of rules) {
      const page = to.endsWith('/index.md') ? to.slice(0, -'index.md'.length) : to;
      expect(site.paths, to).toContain(page);
    }
  });

  it('parses comments, a default status, and rejects what it cannot serve', () => {
    expect(parseRedirects('# c\n\n/a /b\n/c /d 308\n')).toEqual([
      { from: '/a', to: '/b', status: 302 },
      { from: '/c', to: '/d', status: 308 },
    ]);
    expect(() => parseRedirects('/a /b 200\n')).toThrow(/unexpected line/);
    expect(() => parseRedirects('/a/* /b 301\n')).toThrow(/splats/);
  });
});
