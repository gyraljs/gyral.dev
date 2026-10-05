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

/** Logo files offered for download on /brand/, as SVG and 1024 px PNG (keep in sync with src/render/brand.ts). */
const DOWNLOADS = [
  'gyral-lockup-horizontal-gyral-on-white',
  'gyral-lockup-horizontal-gyral-on-black',
  'gyral-lockup-stacked-gyral-on-white',
  'gyral-lockup-stacked-gyral-on-black',
  'gyral-mark-on-white',
  'gyral-mark-on-black',
];

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
  // Downloads on /brand/ (the full kit, with print masters, is in gyraljs/brand).
  ...DOWNLOADS.flatMap((name) => {
    const [layout] = /^gyral-(mark|lockup-horizontal|lockup-stacked)/.exec(name) ?? [];
    const dir = layout?.replace(/^gyral-/, '') ?? '';
    return [
      [`${dir}/${name}.svg`, `brand/download/${name}.svg`],
      [`${dir}/${name}-1024.png`, `brand/download/${name}-1024.png`],
    ];
  }),
];

mkdirSync('public/brand/download', { recursive: true });
for (const [from, to] of FILES) copyFileSync(join(brand, from), join('public', to));
console.log(`brand: copied ${String(FILES.length)} files from ${brand}`);
