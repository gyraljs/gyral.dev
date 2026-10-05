// `pnpm smoke` (part of `pnpm check`, after `pnpm build`): opens the built site in Chromium
// through the preview server (Cloudflare Pages rules and the real `_headers` CSP) and checks
// every page in the sitemap, plus the 404 page:
// - status 200 (404 for the 404 page), no console errors or page errors (CSP violations
//   are console errors);
// - axe finds no violations, in light and dark;
// - no horizontal overflow at phone width;
// - every internal link and fragment resolves;
// - the home page's counter hydrates in place (one copy of its DOM) and counts.
// Report: .smoke/report.md. Exit 1 on any failure.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { AxeBuilder } from '@axe-core/playwright';
import { chromium } from 'playwright';
import { tsImport } from 'tsx/esm/api';

const { createPreview } = await tsImport('./preview.ts', import.meta.url);
const dist = new URL('../dist/', import.meta.url).pathname;
const server = createPreview(dist.replace(/\/$/, ''));
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://localhost:${String(server.address().port)}`;

const paths = [
  ...readFileSync(`${dist}sitemap.xml`, 'utf8').matchAll(
    /<loc>https:\/\/gyral\.dev(\/[^<]*)<\/loc>/g,
  ),
].map((m) => m[1]);
const failures = [];
const fail = (where, what) => failures.push(`${where}: ${what}`);

const browser = await chromium.launch();
try {
  const links = new Set();
  for (const scheme of ['light', 'dark']) {
    for (const [path, status] of [...paths.map((p) => [p, 200]), ['/no-such-page/', 404]]) {
      const where = `${path} (${scheme})`;
      const context = await browser.newContext({
        colorScheme: scheme,
        viewport: { width: 1280, height: 900 },
      });
      const page = await context.newPage();
      page.on('console', (m) => {
        if (m.type() === 'error' && !(status === 404 && /404/.test(m.text())))
          fail(where, `console: ${m.text()}`);
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
      await context.close();
    }
  }
  await checkLinks(links);
} finally {
  await browser.close();
  server.close();
}

async function checkCounter(page, where) {
  const counter = page.locator('gd-loop-counter');
  const copies = await counter.evaluate(
    (el) => el.shadowRoot?.querySelectorAll('output').length ?? 0,
  );
  if (copies !== 1)
    fail(where, `counter renders ${String(copies)} outputs after hydration, expected 1`);
  await counter.getByRole('button', { name: 'Increment' }).click();
  await counter.getByRole('button', { name: 'Increment' }).click();
  await counter.getByRole('button', { name: 'Decrement' }).click();
  const value = await counter.locator('output').textContent();
  if (value?.trim() !== '1')
    fail(where, `counter shows "${String(value)}" after +, +, -; expected 1`);
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

mkdirSync('.smoke', { recursive: true });
const report = [
  `# Smoke report`,
  '',
  `Pages: ${paths.join(', ')} and the 404 page, light and dark.`,
  '',
  failures.length === 0 ? 'All checks passed.' : failures.map((f) => `- ${f}`).join('\n'),
  '',
].join('\n');
writeFileSync('.smoke/report.md', report);
if (failures.length > 0) {
  console.error(report);
  process.exit(1);
}
console.log(`smoke: ${String(paths.length)} pages + 404, light and dark: all checks passed`);
