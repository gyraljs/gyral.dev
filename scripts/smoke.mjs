// `pnpm smoke` (part of `pnpm check`, after `pnpm build`): opens the built site in Chromium
// through the preview server (Cloudflare Pages rules and the real `_headers` CSP) and checks
// every page in the sitemap, plus the 404 page:
// - status 200 (404 for the 404 page), no console errors or page errors (CSP violations
//   are console errors), and no Gyral warnings (a production hydration mismatch is a warning);
// - axe finds no violations, in light and dark;
// - no horizontal overflow at phone width;
// - every internal link and fragment resolves;
// - every rule in the built `_redirects` answers with its status and lands on a 200 page;
// - sitemap.xml, robots.txt and the llms files come without the CSP (Chrome's XML and text
//   viewers use inline styles) and open in Chromium without console errors; the sitemap has
//   `<lastmod>` for blog posts;
// - the home page's counter hydrates in place (it keeps the server's nodes) and counts;
// - /search/ (not in the sitemap) finds the expected pages through the header form, and its
//   keys work: arrows move through results, Escape clears.
// Report: .smoke/report.md. Exit 1 on any failure.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { AxeBuilder } from '@axe-core/playwright';
import { chromium } from 'playwright';
import { tsImport } from 'tsx/esm/api';

const { createPreview } = await tsImport('./preview.ts', import.meta.url);
const { parseRedirects } = await tsImport('./lib/redirects.ts', import.meta.url);
const dist = new URL('../dist/', import.meta.url).pathname;
const server = createPreview(dist.replace(/\/$/, ''));
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://localhost:${String(server.address().port)}`;

const paths = [
  ...readFileSync(`${dist}sitemap.xml`, 'utf8').matchAll(
    /<loc>https:\/\/gyral\.dev(\/[^<]*)<\/loc>/g,
  ),
].map((m) => m[1]);
// Pages that are deliberately not in the sitemap (noindex) but still ship.
const unlisted = ['/search/'];
/** Each query must list the page in its first five results. */
const SEARCHES = [
  ['intent', '/docs/intent/'],
  ['hydrate', '/docs/server-rendering/'],
  ['formAction', '/docs/api/ssr/'],
];

const CONCURRENCY = 4;
const failures = [];
const fail = (where, what) => failures.push(`${where}: ${what}`);

const browser = await chromium.launch();
try {
  const links = new Set();
  const tasks = ['light', 'dark'].flatMap((scheme) =>
    [...[...paths, ...unlisted].map((p) => [p, 200]), ['/no-such-page/', 404]].map(
      ([path, status]) => ({ scheme, path, status }),
    ),
  );
  // Pages are independent: check a few at once (each in its own context).
  await pool(tasks, CONCURRENCY, (task) => checkPage(task, links));
  await checkLinks(links);
  await checkRedirects();
  await checkNonHtml();
} finally {
  await browser.close();
  server.close();
}

async function pool(items, size, work) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: size }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await work(item);
    }),
  );
}

async function checkPage({ scheme, path, status }, links) {
  const where = `${path} (${scheme})`;
  const context = await browser.newContext({
    colorScheme: scheme,
    viewport: { width: 1280, height: 900 },
  });
  try {
    const page = await context.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error' && !(status === 404 && /404/.test(m.text())))
        fail(where, `console: ${m.text()}`);
      if (m.type() === 'warning' && /gyral|hydrat/i.test(m.text()))
        fail(where, `console warning: ${m.text()}`);
    });
    // The server's <output> in the counter, taken before any module script runs, so the
    // counter check can tell hydration (nodes kept) from a fresh render (nodes replaced).
    await page.addInitScript(() => {
      document.addEventListener('readystatechange', () => {
        if (document.readyState === 'interactive')
          window.__serverOutput = document
            .querySelector('gd-loop-counter')
            ?.shadowRoot?.querySelector('output');
      });
    });
    page.on('pageerror', (e) => fail(where, `page error: ${e.message}`));
    const response = await page.goto(base + path, { waitUntil: 'networkidle' });
    if (response?.status() !== status)
      fail(where, `status ${String(response?.status())}, expected ${String(status)}`);

    const axe = await new AxeBuilder({ page }).analyze();
    for (const v of axe.violations) {
      fail(
        where,
        `axe ${v.id}: ${v.help} (${v.nodes
          .map((n) => n.target.join(' '))
          .slice(0, 3)
          .join(', ')})`,
      );
    }

    if (scheme === 'light' && status === 200) {
      for (const href of await page.$$eval('a[href]', (as) => as.map((a) => a.href)))
        links.add(href);
      await page.setViewportSize({ width: 360, height: 800 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      if (overflow > 0) fail(where, `${String(overflow)}px horizontal overflow at 360px wide`);
    }

    if (path === '/' && scheme === 'light') await checkCounter(page, where);
    if (path === '/search/' && scheme === 'light') await checkSearch(page, where);
  } finally {
    await context.close();
  }
}

async function checkCounter(page, where) {
  const counter = page.locator('gd-loop-counter');
  const copies = await counter.evaluate(
    (el) => el.shadowRoot?.querySelectorAll('output').length ?? 0,
  );
  if (copies !== 1)
    fail(where, `counter renders ${String(copies)} outputs after hydration, expected 1`);
  const adopted = await counter.evaluate(
    (el) =>
      window.__serverOutput instanceof Element &&
      window.__serverOutput === el.shadowRoot?.querySelector('output') &&
      el.shadowRoot.querySelector('style') === null, // swapped for the shared sheet
  );
  if (!adopted) fail(where, "counter didn't hydrate in place: the server's <output> was replaced");
  await counter.getByRole('button', { name: 'Increment' }).click();
  await counter.getByRole('button', { name: 'Increment' }).click();
  await counter.getByRole('button', { name: 'Decrement' }).click();
  const value = await counter.locator('output').textContent();
  if (value?.trim() !== '1')
    fail(where, `counter shows "${String(value)}" after +, +, -; expected 1`);
}

async function checkSearch(page, where) {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const [query, expected] of SEARCHES) {
    // The header form is a plain GET form: start from a docs page as a reader would.
    await page.goto(`${base}/docs/`, { waitUntil: 'networkidle' });
    await page.keyboard.press('/');
    await page.keyboard.type(query);
    await page.keyboard.press('Enter');
    await page.waitForURL(`**/search/?q=${query}`);
    const results = page.locator('gd-site-search ol a');
    try {
      await results.first().waitFor({ timeout: 5000 });
    } catch {
      fail(where, `search "${query}": no results`);
      continue;
    }
    const urls = (await results.evaluateAll((as) => as.map((a) => a.getAttribute('href'))))
      .slice(0, 5)
      .map((u) => u.split('#')[0]);
    if (!urls.includes(expected))
      fail(where, `search "${query}": ${expected} not in the top 5 (${urls.join(', ')})`);
  }
  const box = page.locator('gd-site-search #q');
  await box.focus();
  await page.keyboard.press('ArrowDown');
  const focused = await page
    .locator('gd-site-search')
    .evaluate((el) => el.shadowRoot?.activeElement?.id ?? '');
  if (focused !== 'hit-0') fail(where, `ArrowDown from the box focused "${focused}", not hit-0`);
  await page.keyboard.press('Escape');
  try {
    await page.waitForFunction(
      () => document.querySelector('gd-site-search')?.shadowRoot?.querySelector('#q')?.value === '',
      undefined,
      { timeout: 2000 },
    );
  } catch {
    fail(where, 'Escape did not clear the search box');
  }
  const axe = await new AxeBuilder({ page }).analyze();
  for (const v of axe.violations) fail(`${where} with results`, `axe ${v.id}: ${v.help}`);
}

async function checkLinks(links) {
  const pages = new Map();
  for (const href of links) {
    const url = new URL(href);
    if (url.origin !== base) continue;
    const key = url.pathname;
    if (!pages.has(key)) {
      const res = await fetch(base + key, { redirect: 'follow' });
      pages.set(key, { status: res.status, html: await res.text() });
    }
    const target = pages.get(key);
    if (target.status !== 200) fail('links', `${key} → ${String(target.status)}`);
    else if (
      url.hash !== '' &&
      !target.html.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`)
    ) {
      fail('links', `${key}${url.hash}: no element with that id`);
    }
  }
}

async function checkNonHtml() {
  for (const path of ['/sitemap.xml', '/robots.txt', '/llms.txt', '/llms-full.txt']) {
    const res = await fetch(base + path);
    if (res.status !== 200) fail('non-HTML', `${path} → ${String(res.status)}`);
    if (res.headers.has('content-security-policy')) fail('non-HTML', `${path} has a CSP`);
    if (!res.headers.has('x-content-type-options')) fail('non-HTML', `${path} lost the /* headers`);
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(base + path);
    if (errors.length > 0) fail('non-HTML', `${path}: ${errors.join(' | ')}`);
    await context.close();
  }
  const html = await fetch(`${base}/docs/`);
  if (!html.headers.has('content-security-policy')) fail('non-HTML', 'pages lost their CSP');
  const xml = readFileSync(`${dist}sitemap.xml`, 'utf8');
  if (
    !/<loc>https:\/\/gyral\.dev\/blog\/[^<]+<\/loc><lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(xml)
  )
    fail('non-HTML', 'sitemap.xml has no <lastmod> for blog posts');
}

async function checkRedirects() {
  const rules = parseRedirects(readFileSync(`${dist}_redirects`, 'utf8'));
  if (rules.length === 0) fail('redirects', 'dist/_redirects has no rules');
  for (const { from, to, status } of rules) {
    const res = await fetch(base + from, { redirect: 'manual' });
    if (res.status !== status || res.headers.get('location') !== to)
      fail('redirects', `${from} → ${String(res.status)} ${String(res.headers.get('location'))}`);
    const target = await fetch(base + to);
    if (target.status !== 200)
      fail('redirects', `${from} lands on ${to}: ${String(target.status)}`);
  }
}

mkdirSync('.smoke', { recursive: true });
const report = [
  `# Smoke report`,
  '',
  `Pages: ${[...paths, ...unlisted].join(', ')} and the 404 page, light and dark.`,
  '',
  failures.length === 0 ? 'All checks passed.' : failures.map((f) => `- ${f}`).join('\n'),
  '',
].join('\n');
writeFileSync('.smoke/report.md', report);
if (failures.length > 0) {
  console.error(report);
  process.exit(1);
}
console.log(
  `smoke: ${String(paths.length + unlisted.length)} pages + 404, light and dark: all checks passed`,
);
