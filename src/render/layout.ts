// The document shell every page shares: head (SEO, icons, styles), header, footer.
// Server-only: written with core's html and rendered by @gyral/ssr, never hydrated. Interactive
// parts are islands (src/islands) placed inside a page body as plain custom elements.
import { html, nothing, type ChildValue, type Head } from '@gyral/core';
import { page } from '@gyral/ssr';
import { jsonLdValue, type JsonLd } from './json-ld.js';
import { absolute, COPYRIGHT_YEAR, LINKS, NAV, SITE_NAME, TAGLINE } from '../site.js';

/** Where the built CSS and JS live; dev and production differ (scripts/dev.ts, scripts/build.ts). */
export interface Assets {
  readonly stylesheet: string;
  /** The client entry; only pages with islands load it. */
  readonly clientEntry: string;
  /**
   * Chunks the client entry needs, preloaded with it on pages with islands: its static imports
   * and Gyral's lazily loaded hydration chunk, which the browser would otherwise find one round
   * trip later (@gyral/ssr's clientAssetsFromManifest). Empty in dev.
   */
  readonly clientPreload: readonly string[];
  /** The keyboard shortcut for search (`/`, Ctrl/⌘+K): tiny, on every page. */
  readonly shortcuts: string;
  /** Plays the demo recordings while they are on screen (src/demo-videos.ts). */
  readonly demoVideos: string;
}

export interface PageMeta {
  /** URL path with a trailing slash, e.g. `/docs/getting-started/`. */
  readonly path: string;
  /** The `<title>`; the site name is appended unless this is the home page. */
  readonly title: string;
  readonly description: string;
  readonly type?: 'website' | 'article';
  readonly jsonLd?: readonly JsonLd[];
  /** True when the body contains islands that need the client entry. */
  readonly islands?: boolean;
  /** Indexed by the site search (Pagefind reads `<main data-pagefind-body>`). */
  readonly searchable?: boolean;
  /** Not indexed by search engines and left out of the sitemap (404, search results). */
  readonly noindex?: boolean;
  /** The page has a Markdown twin at `<path>index.md` (src/content/llms.ts). */
  readonly markdown?: boolean;
  /** The page has demo videos (`video.demo-video`) and loads their playback script. */
  readonly demoVideos?: boolean;
}

export const fullTitle = (meta: Pick<PageMeta, 'path' | 'title'>): string =>
  meta.path === '/' ? meta.title : `${meta.title} · ${SITE_NAME}`;

// The managed head (ADR 0019): canonical or robots, Open Graph, icons, the Markdown twin and
// JSON-LD, written by page() with data-gyral-head. The site is static, so nothing updates it
// on the client.
const pageHead = (meta: PageMeta): Head => {
  const url = absolute(meta.path);
  const title = fullTitle(meta);
  return {
    title,
    description: meta.description,
    ...(meta.noindex === true ? { robots: 'noindex' } : { canonical: url }),
    meta: [
      { name: 'color-scheme', content: 'light dark' },
      { property: 'og:type', content: meta.type ?? 'website' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:title', content: title },
      { property: 'og:description', content: meta.description },
      { property: 'og:url', content: url },
      { property: 'og:image', content: absolute('/og.png') },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: `${SITE_NAME}: ${TAGLINE}` },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
      ...(meta.markdown === true
        ? [{ rel: 'alternate', type: 'text/markdown', href: `${meta.path}index.md` }]
        : []),
    ],
    jsonLd: jsonLdValue(meta.jsonLd ?? []),
  };
};

// What the head model doesn't manage: the theme colours carry a media query.
const extraHead = html`
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121317" />
`;

const isCurrent = (path: string, match: readonly string[]): boolean =>
  match.some((prefix) => path.startsWith(prefix));

const siteHeader = (path: string) => html`
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="brand" href="/" aria-current=${path === '/' ? 'page' : nothing}>
      <picture>
        <source srcset="/brand/lockup-dark.svg" media="(prefers-color-scheme: dark)" />
        <img src="/brand/lockup-light.svg" alt="Gyral home" width="107" height="36" />
      </picture>
    </a>
    <nav aria-label="Primary">
      <ul role="list">
        ${NAV.map(
          (item) =>
            html`<li>
              <a href=${item.href} aria-current=${isCurrent(path, item.match) ? 'page' : nothing}
                >${item.label}</a
              >
            </li>`,
        )}
        <li class="nav-search">
          <a href="/search/" aria-current=${path === '/search/' ? 'page' : nothing}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle
                cx="10.5"
                cy="10.5"
                r="6.5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              />
              <path
                d="m15.5 15.5 5 5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
            <span class="visually-hidden">Search</span>
          </a>
        </li>
      </ul>
    </nav>
    ${
      path === '/search/'
        ? nothing
        : html`<search class="site-search">
            <form action="/search/" method="get">
              <label for="site-search-q" class="visually-hidden">Search the site</label>
              <input
                id="site-search-q"
                name="q"
                type="search"
                placeholder="Search"
                autocomplete="off"
                aria-keyshortcuts="/ Control+K Meta+K"
              />
              <kbd aria-hidden="true">/</kbd>
            </form>
          </search>`
    }
  </header>
`;

const siteFooter = () => html`
  <footer class="site-footer">
    <nav aria-label="Footer">
      <section aria-labelledby="footer-learn">
        <h2 id="footer-learn">Learn</h2>
        <ul role="list">
          <li><a href="/docs/">Documentation</a></li>
          <li><a href="/docs/getting-started/">Getting started</a></li>
          <li><a href="/docs/api/">API reference</a></li>
          <li><a href="/errors/">Error codes</a></li>
          <li><a href="/what-you-can-build/">What you can build</a></li>
          <li><a href="/examples/">Examples</a></li>
          <li><a href="/blog/">Blog</a></li>
        </ul>
      </section>
      <section aria-labelledby="footer-project">
        <h2 id="footer-project">Project</h2>
        <ul role="list">
          <li><a href=${LINKS.github} rel="external">GitHub</a></li>
          <li><a href=${LINKS.npm} rel="external">npm</a></li>
          <li><a href=${LINKS.shop} rel="external">gyral-shop</a></li>
          <li><a href="/brand/">Brand and press</a></li>
        </ul>
      </section>
    </nav>
    <p class="credit">This site is built with Gyral.</p>
    <p class="legal">
      <small>
        Code under the MIT license. © ${COPYRIGHT_YEAR} Mike Zupper. Gyral, gyraljs and the Gyral
        logo are trademarks of Mike Zupper.
      </small>
    </p>
  </footer>
`;

/** A complete HTML document for one page. */
export function layout(meta: PageMeta, body: ChildValue, assets: Assets): ChildValue {
  return page({
    ...pageHead(meta),
    stylesheets: [assets.stylesheet],
    extraHead,
    modulepreload: meta.islands === true ? assets.clientPreload : [],
    scripts: [
      assets.shortcuts,
      ...(meta.islands === true ? [assets.clientEntry] : []),
      ...(meta.demoVideos === true ? [assets.demoVideos] : []),
    ],
    body: html`${siteHeader(meta.path)}
      <main id="main" data-pagefind-body=${meta.searchable === true ? '' : nothing}>${body}</main>
      ${siteFooter()}`,
  });
}
