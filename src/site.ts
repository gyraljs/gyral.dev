// Facts about the site that more than one page needs. One source, so the header, the footer,
// the SEO tags and the sitemap can't disagree.

/** The canonical origin. gyraljs.com redirects here (docs/design-docs/0003-hosting.md). */
export const ORIGIN = 'https://gyral.dev';

export const SITE_NAME = 'Gyral';

export const TAGLINE = 'Model-View-Intent web components on the modern web platform.';

export const DESCRIPTION =
  'Gyral is a small framework for web components: intents in, a pure update, a pure view out. Server rendering, forms, routing and testing built in. Inspired by Cycle.js.';

export const LINKS = {
  github: 'https://github.com/gyraljs/gyral',
  shop: 'https://github.com/gyraljs/gyral-shop',
  brand: 'https://github.com/gyraljs/brand',
  npm: 'https://www.npmjs.com/org/gyral',
  cyclejs: 'https://cycle.js.org',
  lit: 'https://lit.dev',
} as const;

/** The primary navigation, in order. `match` is the path prefix that marks the link current. */
export const NAV = [
  { label: 'Docs', href: '/docs/', match: '/docs/' },
  { label: 'Demos', href: '/what-you-can-build/', match: '/what-you-can-build/' },
  { label: 'Examples', href: '/examples/', match: '/examples/' },
  { label: 'Blog', href: '/blog/', match: '/blog/' },
  { label: 'GitHub', href: LINKS.github, match: null },
] as const;

/** An absolute URL on the canonical origin. */
export const absolute = (path: string): string => new URL(path, ORIGIN).href;

export const COPYRIGHT_YEAR = 2026;
