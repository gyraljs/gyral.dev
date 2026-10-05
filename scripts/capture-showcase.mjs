// `pnpm showcase`: screenshots gyral-shop's home page in each of its themes for the home
// page's showcase section (public/showcase/). Start the shop first, in its own checkout:
//   cd ../gyral-shop && pnpm dev            (or SHOP_URL=https://… for a deployed copy)
// The screenshots are committed; re-run when the shop's look changes.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const SHOP_URL = process.env.SHOP_URL ?? 'http://localhost:5200';
/** Theme cookie values, in the shop's switcher order (gyral-shop src/ui/themes/registry.ts). */
export const THEMES = ['default', 'marketplace', 'supercenter', 'boutique'];
const VIEWPORT = { width: 1280, height: 800 };

mkdirSync('public/showcase', { recursive: true });
const browser = await chromium.launch();
try {
  for (const theme of THEMES) {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      colorScheme: 'light',
      reducedMotion: 'reduce',
    });
    // A recorded cookie choice (gyral-shop src/domain/consent.ts) keeps the banner out of shot.
    await context.addCookies([
      { name: 'theme', value: theme, url: SHOP_URL },
      { name: 'consent', value: 'v1.a0', url: SHOP_URL },
    ]);
    const page = await context.newPage();
    await page.goto(SHOP_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const path = `public/showcase/shop-${theme}.jpg`;
    await page.screenshot({ path, type: 'jpeg', quality: 78 });
    console.log(`showcase: ${path}`);
    await context.close();
  }
} finally {
  await browser.close();
}
