import { describe, expect, it } from 'vitest';
import { createSite, sitemap } from '../src/render/site.js';
import { headersFor, parseHeaders } from '../scripts/lib/headers.js';

const assets = { stylesheet: '/assets/site.css', clientEntry: '/assets/entry.js' };
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

  it('renders docs pages without JavaScript, with a canonical trailing slash', async () => {
    const { status, html } = await get('/docs/getting-started');
    expect(status).toBe(200);
    expect(html).toContain('href="https://gyral.dev/docs/getting-started/"');
    expect(html).toContain('<title>Getting started · Gyral</title>');
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain('<script type="module"');
  });

  it('answers unknown paths and drafts with the 404 page', async () => {
    for (const path of ['/nope/', '/docs/forms/']) {
      const { status, html } = await get(path);
      expect(status).toBe(404);
      expect(html).toContain('<meta name="robots" content="noindex">');
    }
  });

  it('lists every shipped page in the sitemap, and no drafts', async () => {
    const site = await createSite(assets);
    const xml = sitemap(site.paths);
    expect(xml).toContain('<loc>https://gyral.dev/</loc>');
    expect(xml).toContain('<loc>https://gyral.dev/docs/getting-started/</loc>');
    expect(xml).not.toContain('/docs/forms/');
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
});
