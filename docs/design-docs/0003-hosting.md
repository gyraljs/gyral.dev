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
- **CI** is `.github/workflows/ci.yml`, `workflow_dispatch` only, run with `pnpm ci:local`.

## Headers (`public/_headers`)

- CSP: `default-src 'self'`; `script-src 'self'` (JSON-LD and hydration seeds are data blocks,
  which CSP doesn't block); `style-src 'self' 'unsafe-inline'` because Declarative Shadow DOM
  styles are inline `<style>` elements; no third-party origins at all. `pnpm smoke` runs every
  page under this CSP, so a violation fails the gate.
- HSTS (two years, subdomains), `nosniff`, strict referrer policy, a restrictive
  Permissions-Policy, COOP same-origin.
- `/assets/*` is content-hashed: cached for a year, immutable.

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
