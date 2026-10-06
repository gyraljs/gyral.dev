# ADR 0003 — Hosting, domains and deploys

Status: **accepted** (2026-10-05)

## Decision

- **gyral.dev is canonical.** Every page's `<link rel="canonical">`, Open Graph URL and the
  sitemap use `https://gyral.dev`. **gyraljs.com redirects** (301, path and query preserved) to
  gyral.dev. `www.` on both domains redirects too.
- **Cloudflare Pages** serves `dist/`: static HTML, `404.html` for unknown paths, trailing-slash
  URLs, and `_headers` (from `public/`) for security and cache headers.
- **Deploys are Cloudflare Git-connected builds** of `main` (decided 2026-10-05, when the
  owner connected the repo). `@gyral/*` comes from npm (0.1.0+), so Cloudflare's defaults
  work: build command `pnpm run build`, output `dist`, env `NODE_VERSION=24`. Cloudflare
  installs with the committed lockfile. The gate still runs before pushing (`pnpm check`);
  `pnpm run deploy` (wrangler direct upload) remains for manual deploys.
- **While on Gyral 0.3 prereleases** (branch `gyral-0.3`), `@gyral/*` resolve to tarballs in
  `../gyral-tarballs`, which a Cloudflare Git build can't see: preview by building locally and
  uploading `dist/` with wrangler (`pages deploy dist --branch gyral-0-3`), or vendor the
  tarballs, until 0.3.0 is on npm.
- **CI** is `.github/workflows/ci.yml`, `workflow_dispatch` only, run with `pnpm ci:local`.

- **No analytics** (owner decision 2026-10-05, site-54d.32). Cloudflare Web Analytics stays
  disabled on the Pages project: its injected beacon would need a third-party CSP exception.

## Headers (`public/_headers`)

- CSP: `default-src 'self'`; `script-src 'self' 'wasm-unsafe-eval'` (JSON-LD and hydration
  seeds are data blocks, which CSP doesn't block; `'wasm-unsafe-eval'` lets the search index's
  WebAssembly compile and allows neither `eval()` nor inline script); `style-src 'self'` plus
  the SHA-256 hash of each island's Declarative Shadow DOM `<style>`, **no `'unsafe-inline'`**
  (Gyral 0.3, 2026-10-06); no third-party origins at all. The policy is built by
  `src/render/csp.ts` with `@gyral/ssr`'s `contentSecurityPolicy()` and added to the `/*` rule
  of `dist/_headers` by `scripts/build.ts`, so the hashes always match the build; `public/_headers`
  must not set one. Pages carry no `style` attributes: Shiki's colours are classes
  (`src/styles/code.css`, `pnpm sync:code-css`) and the brand swatches are SVG fills.
  `pnpm smoke` runs every page under this CSP, so a violation fails the gate.
- HSTS (two years, subdomains), `nosniff`, strict referrer policy, a restrictive
  Permissions-Policy, COOP same-origin.
- `/assets/*` is content-hashed: cached for a year, immutable.
- `/llms.txt` and `/llms-full.txt` are `text/plain; charset=utf-8`, Markdown twins (`/*.md`)
  `text/markdown; charset=utf-8` (ADR 0002, "content for agents"). They keep Cloudflare's
  default caching, like the HTML pages.
- `/demos/*` (demo recordings and posters) has content-hashed names: cached for a year, immutable
  (gyral-7se.7).

## Search (site-54d.23, 2026-10-05)

- **Pagefind**, run by `scripts/build.ts` after prerendering: it indexes the `<main
data-pagefind-body>` of docs, API reference, examples and blog posts (`PageMeta.searchable`)
  and writes static files to `dist/pagefind/`. No service, no third-party origin; navigation,
  outlines and footers are `data-pagefind-ignore`. Pagefind's own UI isn't used or published.
- **The header form** is a plain `GET /search/?q=` form, so it works without JavaScript. Below
  48rem it becomes a magnifier link to `/search/`. `src/shortcuts.ts` (≈0.3 kB, every page)
  focuses it on `/` or Ctrl/⌘+K.
- **`/search/`** is a page with the `<gd-site-search>` island (`noindex`, not in the sitemap).
  Server-rendered it says search needs JavaScript and links the docs index; once hydrated it
  reads `?q=`, searches as you type (debounced, newer queries cancel older ones), keeps `?q=` in
  the address bar, and supports arrows/Escape. Excerpts reach the view as text runs, never HTML.
- `pnpm smoke` searches for `intent`, `hydrate` and `formAction` through the header form and
  checks the expected pages are in the top five.

## One-time setup (owner)

1. Cloudflare: add both zones (`gyral.dev`, `gyraljs.com`) and point the registrar's
   nameservers at Cloudflare.
2. Workers & Pages → Create → Pages → Connect to Git → `gyraljs/gyral.dev`, production
   branch `main`, with the build settings above.
3. After the first successful build, Pages → Custom domains: add `gyral.dev` and
   `www.gyral.dev`.
4. Redirects: a Bulk Redirect list with `gyraljs.com` → `https://gyral.dev`,
   `www.gyraljs.com` → `https://gyral.dev` and `www.gyral.dev` → `https://gyral.dev`
   (301, preserve path and query, include subdomains). The redirected hostnames need proxied DNS records
   (an `AAAA 100::` placeholder is the documented pattern).
5. SSL/TLS: Full (strict); "Always use HTTPS" on. Consider HSTS preload once stable.
6. Make `gyraljs/gyral`, `gyraljs/gyral-shop` and `gyraljs/gyral.dev` public before launch: the
   site links to them.
