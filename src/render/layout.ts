// The document shell every page shares: head (SEO, icons, styles), header, footer.
// Server-only: written with serverHtml, so none of it is hydrated. Interactive parts are
// islands (src/islands) placed inside a page body as plain custom elements.
import { nothing } from 'lit';
import { page, serverHtml } from '@gyral/ssr';
import { jsonLdScript, type JsonLd } from './json-ld.js';
import { absolute, COPYRIGHT_YEAR, LINKS, NAV, SITE_NAME, TAGLINE } from '../site.js';

/** Where the built CSS and JS live; dev and production differ (scripts/dev.ts, scripts/build.ts). */
export interface Assets {
  readonly stylesheet: string;
  /** The client entry; only pages with islands load it. */
  readonly clientEntry: string;
  /** The keyboard shortcut for search (`/`, Ctrl/⌘+K): tiny, on every page. */
  readonly shortcuts: string;
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
}

export const fullTitle = (meta: Pick<PageMeta, 'path' | 'title'>): string =>
  meta.path === '/' ? meta.title : `${meta.title} · ${SITE_NAME}`;

const head = (meta: PageMeta, assets: Assets) => {
  const url = absolute(meta.path);
  const title = fullTitle(meta);
  return serverHtml`
    ${meta.noindex === true ? serverHtml`<meta name="robots" content="noindex">` : serverHtml`<link rel="canonical" href=${url}>`}
    <meta name="color-scheme" content="light dark">
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121317">
    <link rel="icon" href="/favicon.ico" sizes="32x32">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <link rel="stylesheet" href=${assets.stylesheet}>
    <meta property="og:type" content=${meta.type ?? 'website'}>
    <meta property="og:site_name" content=${SITE_NAME}>
    <meta property="og:title" content=${title}>
    <meta property="og:description" content=${meta.description}>
    <meta property="og:url" content=${url}>
    <meta property="og:image" content=${absolute('/og.png')}>
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content=${`${SITE_NAME}: ${TAGLINE}`}>
    <meta name="twitter:card" content="summary_large_image">
    ${jsonLdScript(meta.jsonLd ?? [])}
  `;
};

const isCurrent = (path: string, match: string | null): boolean =>
  match !== null && path.startsWith(match);

const siteHeader = (path: string) => serverHtml`
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="brand" href="/" aria-current=${path === '/' ? 'page' : nothing}>
      <picture>
        <source srcset="/brand/lockup-dark.svg" media="(prefers-color-scheme: dark)">
        <img src="/brand/lockup-light.svg" alt="Gyral home" width="107" height="36">
      </picture>
    </a>
    <nav aria-label="Primary">
      <ul role="list">
        ${NAV.map(
          (item) => serverHtml`<li>
            <a href=${item.href} aria-current=${isCurrent(path, item.match) ? 'page' : nothing}
              >${item.label}</a>
          </li>`,
        )}
        <li class="nav-search">
          <a href="/search/" aria-current=${path === '/search/' ? 'page' : nothing}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2" />
              <path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
            <span class="visually-hidden">Search</span>
          </a>
        </li>
      </ul>
    </nav>
    ${
      path === '/search/'
        ? nothing
        : serverHtml`<search class="site-search">
          <form action="/search/" method="get">
            <label for="site-search-q" class="visually-hidden">Search the site</label>
            <input id="site-search-q" name="q" type="search" placeholder="Search" autocomplete="off"
              aria-keyshortcuts="/ Control+K Meta+K">
            <kbd aria-hidden="true">/</kbd>
          </form>
        </search>`
    }
  </header>
`;

const siteFooter = () => serverHtml`
  <footer class="site-footer">
    <nav aria-label="Footer">
      <section aria-labelledby="footer-learn">
        <h2 id="footer-learn">Learn</h2>
        <ul role="list">
          <li><a href="/docs/">Documentation</a></li>
          <li><a href="/docs/getting-started/">Getting started</a></li>
          <li><a href="/docs/api/">API reference</a></li>
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
    <p class="credit">
      Inspired by <a href=${LINKS.cyclejs} rel="external">Cycle.js</a>. Rendered with
      <a href=${LINKS.lit} rel="external">Lit</a>. This site is built with Gyral.
    </p>
    <p class="legal">
      <small>
        Code under the MIT licence. © ${COPYRIGHT_YEAR} Mike Zupper. Gyral, gyraljs and
        the Gyral logo are trademarks of Mike Zupper.
      </small>
    </p>
  </footer>
`;

/** A complete HTML document for one page. */
export function layout(meta: PageMeta, body: unknown, assets: Assets): unknown {
  return page({
    title: fullTitle(meta),
    description: meta.description,
    head: head(meta, assets),
    scripts: meta.islands === true ? [assets.shortcuts, assets.clientEntry] : [assets.shortcuts],
    body: serverHtml`${siteHeader(meta.path)}
      <main id="main" data-pagefind-body=${meta.searchable === true ? '' : nothing}>${body}</main>
      ${siteFooter()}`,
  });
}
