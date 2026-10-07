# ADR 0003 — Hosting, domains and deploys

Status: **accepted** (2026-10-05)

## Decision

- **gyral.dev is canonical.** Every page's `<link rel="canonical">`, Open Graph URL and the
  sitemap use `https://gyral.dev`. **gyraljs.com redirects** (301, path and query preserved) to
  gyral.dev. `www.` on both domains redirects too.
- **Cloudflare Pages** serves `dist/`: static HTML, `404.html` for unknown paths, trailing-slash
  URLs, `_headers` (from `public/`) for security and cache headers, and `_redirects` (from
  `public/`) for renamed pages.
- **Deploys are Cloudflare Git-connected builds** of `main` (decided 2026-10-05, when the
  owner connected the repo). `@gyral/*` comes from npm (0.1.0+), so Cloudflare's defaults
  work: build command `pnpm run build`, output `dist`, env `NODE_VERSION=24`. Cloudflare
  installs with the committed lockfile. The gate still runs before pushing (`pnpm check`);
  `pnpm run deploy` (wrangler direct upload) remains for manual deploys.
- **Until Gyral 0.3.1 is on npm** (2026-10-07), `@gyral/*` resolve to tarballs committed in
  `vendor/` (0.3.1-next.0, a prerelease packed from Gyral's `next` branch; 0.3.0's release
  tarballs before that), so a Cloudflare Git build installs them from the repo like any other
  dependency. Switch to `^0.3.1` from npm once it is published (vendor/README.md).
- **CI** is `.github/workflows/ci.yml`, `workflow_dispatch` only, run with `pnpm ci:local`.

- **No analytics** (owner decision 2026-10-05, site-54d.32). Cloudflare Web Analytics stays
  disabled on the Pages project: its injected beacon would need a third-party CSP exception.

## Redirects (`public/_redirects`)

- A renamed page keeps its old URL working with a **301** to the new one: both the trailing-slash
  and bare forms, plus the Markdown twin (`index.md`). The first rename was the post
  `/blog/why-i-rebuilt-cyclejs/` → `/blog/why-i-built-gyral/` (2026-10-07).
- Rules are exact paths only (no splats or placeholders), read by `scripts/lib/redirects.ts`.
  `scripts/preview.ts` applies them before anything else, as Cloudflare does; `pnpm smoke` checks
  every built rule answers with its status and lands on a 200 page, and `test/site.test.ts`
  checks each target is a real page.

## Headers (`public/_headers`)

- CSP: `default-src 'self'`; `script-src 'self' 'wasm-unsafe-eval'` (JSON-LD is a data block,
  which CSP doesn't block, and hydration seeds are `data-gyral-seed` attributes;
  `'wasm-unsafe-eval'` lets the search index's WebAssembly compile and allows neither `eval()`
  nor inline script); `style-src 'self'` plus the SHA-256 hash of each island's Declarative
  Shadow DOM `<style>`, **no `'unsafe-inline'`** (Gyral 0.3, 2026-10-06); no third-party origins
  at all. The policy is built by
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
  reads `?q=`, searches as you type (`debounce` from `@gyral/time/delay`; newer queries cancel
  older ones), keeps `?q=` in the address bar, and supports arrows/Escape. Excerpts reach the
  view as text runs, never HTML.
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
