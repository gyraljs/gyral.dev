# ADR 0003 — Hosting, domains and deploys

Status: **accepted** (2026-10-05)

## Decision

- **gyral.dev is canonical.** Every page's `<link rel="canonical">`, Open Graph URL and the
  sitemap use `https://gyral.dev`. **gyraljs.com redirects** (301, path and query preserved) to
  gyral.dev. `www.` on both domains redirects too.
- **Cloudflare Pages** serves `dist/`: static HTML, `404.html` for unknown paths, trailing-slash
  URLs, and `_headers` (from `public/`) for security and cache headers.
- **Deploys are direct uploads from the owner's machine**, after the gate:
  `pnpm run deploy` = `pnpm check && wrangler pages deploy dist --project-name gyral-dev`.
  Cloudflare's Git-connected builds can't resolve the `link:` dependency on Gyral, and CI runs
  locally only (as in gyral and gyral-shop). After Gyral 0.1 is on npm, Git-connected builds
  become possible; that is a separate decision.
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
2. `pnpm dlx wrangler login`, then
   `pnpm dlx wrangler pages project create gyral-dev --production-branch main`.
3. First deploy: `pnpm run deploy`. Then in Pages → Custom domains add `gyral.dev` and
   `www.gyral.dev`.
4. Redirects: a Bulk Redirect list with `gyraljs.com` → `https://gyral.dev`,
   `www.gyraljs.com` → `https://gyral.dev` and `www.gyral.dev` → `https://gyral.dev`
   (301, preserve path and query, include subdomains). The redirected hostnames need proxied DNS records
   (an `AAAA 100::` placeholder is the documented pattern).
5. SSL/TLS: Full (strict); "Always use HTTPS" on. Consider HSTS preload once stable.
6. Make `gyraljs/gyral`, `gyraljs/gyral-shop` and `gyraljs/gyral.dev` public before launch: the
   site links to them.
