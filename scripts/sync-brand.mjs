// Copies the brand files the site uses from a gyraljs/brand checkout into public/.
// The brand repo is the source of truth: never edit these copies (BRAND.md, "Never edit a
// file in dist/ by hand"). Run after the brand kit changes: `node scripts/sync-brand.mjs`.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const brand = process.env.BRAND_DIR ?? '../gyral-brand/dist';
if (!existsSync(brand)) {
  console.error(
    `No brand kit at ${brand}. Clone gyraljs/brand next to this repo or set BRAND_DIR.`,
  );
  process.exit(1);
}

/** [source in the brand kit, destination in public/] */
const FILES = [
  ['web/favicon.ico', 'favicon.ico'],
  ['web/favicon.svg', 'favicon.svg'],
  ['web/apple-touch-icon.png', 'apple-touch-icon.png'],
  ['web/icon-192.png', 'icon-192.png'],
  ['web/icon-512.png', 'icon-512.png'],
  ['web/icon-maskable-192.png', 'icon-maskable-192.png'],
  ['web/icon-maskable-512.png', 'icon-maskable-512.png'],
  ['web/site.webmanifest', 'site.webmanifest'],
  ['social/og-1200x630.png', 'og.png'],
  [
    'lockup-horizontal/gyral-lockup-horizontal-gyral-transparent-light.svg',
    'brand/lockup-light.svg',
  ],
  ['lockup-horizontal/gyral-lockup-horizontal-gyral-transparent-dark.svg', 'brand/lockup-dark.svg'],
  ['mark/gyral-mark-transparent-light.svg', 'brand/mark-light.svg'],
  ['mark/gyral-mark-transparent-dark.svg', 'brand/mark-dark.svg'],
];

mkdirSync('public/brand', { recursive: true });
for (const [from, to] of FILES) copyFileSync(join(brand, from), join('public', to));
console.log(`brand: copied ${String(FILES.length)} files from ${brand}`);
