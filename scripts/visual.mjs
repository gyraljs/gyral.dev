// `pnpm visual` (part of `pnpm check`, after `pnpm build`): screenshots built pages through the
// preview server and compares them with baselines, so a CSS or template change can't quietly
// break a layout. Matrix: desktop (1280×800) and phone (390×844), light and dark.
//
//   pnpm visual                 the gate set: representative pages, first screen, compared with
//                               the committed baselines in test/visual/
//   pnpm visual:update          rewrite those baselines (after an intended visual change)
//   pnpm visual --all           every page, full length, compared with .visual/ (local, not
//                               committed): run with --update before a change, then without
//
// Screenshots are made deterministic: motion off, the caret hidden, fonts loaded, and every
// font family set to the bundled Sora so a laptop and the CI container render the same glyphs
// (system fonts differ between them). They check layout, colour and spacing, not system-font
// rendering. Report: .smoke/visual.md, with actual and diff images in .smoke/visual/.
// When to update: docs/design-docs/0004-design.md, "Visual review".
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { tsImport } from 'tsx/esm/api';

const args = process.argv.slice(2);
const all = args.includes('--all');
const update = args.includes('--update');

/** The gate set: one page of each template, plus search with results and the 404 page. */
const GATE = [
  '/',
  '/docs/',
  '/docs/getting-started/',
  '/docs/api/core/',
  '/examples/',
  '/what-you-can-build/',
  '/blog/introducing-gyral/',
  '/brand/',
  '/search/?q=hydrate',
  '/no-such-page/',
];
const VIEWPORTS = [
  ['desktop', { width: 1280, height: 800 }],
  ['phone', { width: 390, height: 844 }],
];
const SCHEMES = ['light', 'dark'];
/** pixelmatch per-pixel colour threshold (0–1) and the share of pixels allowed to differ. */
const THRESHOLD = 0.1;
const MAX_DIFF_RATIO = 0.002;
const CONCURRENCY = 4;

const root = new URL('../', import.meta.url).pathname;
const dist = `${root}dist`;
const baselines = all ? `${root}.visual` : `${root}test/visual`;
const out = `${root}.smoke/visual`;

const STABLE_CSS = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
  :root {
    --font-body: 'Sora Variable', sans-serif !important;
    --font-display: 'Sora Variable', sans-serif !important;
    --font-mono: 'Sora Variable', monospace !important;
  }
`;

const pagesToShoot = () => {
  if (!all) return GATE;
  const sitemap = readFileSync(`${dist}/sitemap.xml`, 'utf8');
  const listed = [...sitemap.matchAll(/<loc>https:\/\/gyral\.dev(\/[^<]*)<\/loc>/g)].map(
    (m) => m[1],
  );
  return [...listed, '/search/?q=hydrate', '/no-such-page/'];
};

/** `/docs/api/core/` → `docs-api-core`; `/search/?q=hydrate` → `search-q-hydrate`. */
const slug = (path) => path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';

const { createPreview } = await tsImport('./preview.ts', import.meta.url);
const server = createPreview(dist);
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://localhost:${String(server.address().port)}`;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
mkdirSync(baselines, { recursive: true });

const shots = pagesToShoot().flatMap((path) =>
  VIEWPORTS.flatMap(([device, viewport]) =>
    SCHEMES.map((scheme) => ({ path, device, viewport, scheme })),
  ),
);
const results = [];
const browser = await chromium.launch();
try {
  const queue = [...shots];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let shot = queue.shift(); shot !== undefined; shot = queue.shift()) {
        results.push(await capture(shot));
      }
    }),
  );
} finally {
  await browser.close();
  server.close();
}

async function capture({ path, device, viewport, scheme }) {
  const name = `${slug(path)}.${device}.${scheme}.png`;
  const context = await browser.newContext({
    viewport,
    colorScheme: scheme,
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
    // The stabilising stylesheet below is an inline <style>, which the site's CSP (no
    // 'unsafe-inline') blocks. `pnpm smoke` checks the pages under the real CSP.
    bypassCSP: true,
  });
  try {
    const page = await context.newPage();
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: STABLE_CSS });
    if (path.startsWith('/search/')) {
      await page.locator('gd-site-search ol a').first().waitFor({ timeout: 5000 });
    }
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images]
          .filter((img) => !img.complete && img.loading !== 'lazy')
          .map((img) => new Promise((done) => img.addEventListener('load', done, { once: true }))),
      );
    });
    const png = await page.screenshot({ fullPage: all, animations: 'disabled', caret: 'hide' });
    return compare(name, png);
  } finally {
    await context.close();
  }
}

function compare(name, png) {
  const baselinePath = `${baselines}/${name}`;
  if (update || (all && !existsSync(baselinePath))) {
    writeFileSync(baselinePath, png);
    return { name, status: update ? 'updated' : 'new' };
  }
  if (!existsSync(baselinePath)) {
    writeFileSync(`${out}/${name}`, png);
    return { name, status: 'failed', detail: 'no committed baseline (run `pnpm visual:update`)' };
  }
  const actual = PNG.sync.read(png);
  const expected = PNG.sync.read(readFileSync(baselinePath));
  if (actual.width !== expected.width || actual.height !== expected.height) {
    writeFileSync(`${out}/${name}`, png);
    return {
      name,
      status: 'failed',
      detail: `size ${String(actual.width)}×${String(actual.height)}, baseline ${String(expected.width)}×${String(expected.height)}`,
    };
  }
  const diff = new PNG({ width: actual.width, height: actual.height });
  const pixels = pixelmatch(expected.data, actual.data, diff.data, actual.width, actual.height, {
    threshold: THRESHOLD,
  });
  const ratio = pixels / (actual.width * actual.height);
  if (ratio <= MAX_DIFF_RATIO) return { name, status: 'same', ratio };
  writeFileSync(`${out}/${name}`, png);
  writeFileSync(`${out}/${name.replace(/\.png$/, '.diff.png')}`, PNG.sync.write(diff));
  return { name, status: 'failed', detail: `${(ratio * 100).toFixed(2)}% of pixels differ`, ratio };
}

results.sort((a, b) => a.name.localeCompare(b.name));
const failed = results.filter((r) => r.status === 'failed');
const created = results.filter((r) => r.status === 'new');
const report = [
  `# Visual review (${all ? 'all pages, full length' : 'gate set, first screen'})`,
  '',
  `${String(results.length)} screenshots; baselines in \`${baselines.replace(root, '')}\`.`,
  '',
  ...(update ? ['Baselines updated.'] : []),
  ...created.map((r) => `- new baseline: ${r.name}`),
  ...failed.map((r) => `- **${r.name}**: ${r.detail} (see .smoke/visual/)`),
  ...(failed.length === 0 && !update ? ['No visual differences beyond the tolerance.'] : []),
  '',
].join('\n');
mkdirSync(`${root}.smoke`, { recursive: true });
writeFileSync(`${root}.smoke/visual.md`, report);
if (failed.length > 0) {
  console.error(report);
  console.error(
    'If the change is intended, look at .smoke/visual/ and run `pnpm visual:update` (gate set).',
  );
  process.exit(1);
}
console.log(
  `visual: ${String(results.length)} screenshots, ${
    update ? 'baselines updated' : `${String(created.length)} new, no differences`
  }`,
);
