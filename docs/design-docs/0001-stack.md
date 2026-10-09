# ADR 0001 — Stack: the site is built with Gyral

Status: **accepted** (2026-10-05)

## Context

Gyral needs a home page and documentation at gyral.dev (owner decision 2026-10-05: full site
at launch, no coming-soon page). Options: a docs framework (Astro Starlight, VitePress,
Docusaurus), or Gyral itself.

## Decision

Build the site with Gyral and its own SSR package, with no site framework:

- One renderer (`src/render/site.ts`) turns a path into a `Response`. The dev server calls it
  per request; the build calls `prerender()` from `@gyral/ssr/static` for every path and
  writes static HTML. Nothing runs on a server in production.
- The page shell, header, footer and docs are server-only `html` templates (from `@gyral/core`,
  rendered by `@gyral/ssr`). **Docs pages
  ship no JavaScript.**
- Interactive parts are **islands**: `define()` components server-rendered with Declarative
  Shadow DOM and hydrated by `src/entry-client.ts`. Pages opt in with `islands: true`.
- Markdown and highlighting (marked, Shiki) run at build time only.
- TypeScript, Vite, Vitest, Playwright: the same toolchain as gyral and gyral-shop. No Effect.

## Consequences

- The site is a working, public example of Gyral's SSR, hydration and production build, and
  `pnpm smoke` checks it the way gyral-shop's smoke test does. A framework regression shows up
  here too.
- Things a docs framework gives for free are ours to build when needed: search, versioned
  docs, an API reference. Each gets a bead when it's wanted.
- `@gyral/*` comes from npm (`^0.1.0`, switched 2026-10-05; until then it was linked from
  `../gyral`). The API reference is generated from the published `.d.ts`.

## Addendum: Gyral 0.3 (2026-10-06, gyral-g1r.13)

Gyral 0.3 replaces Lit with its own view layer (Gyral ADR 0018). The site moved on branch
`gyral-0.3`, before 0.3.0 is published: `@gyral/*` come from tarballs packed from Gyral's `next`
branch into `../gyral-tarballs` (`file:` dependencies plus pnpm `overrides`, because the
tarballs depend on each other at the prerelease version). On 2026-10-07, with Gyral 0.3.0
released on GitHub (tag `v0.3.0`) but not yet on npm, the release tarballs were vendored into
`vendor/` and the branch merged to `main`; switch to `^0.3.0` from npm when it is published
(vendor/README.md). `lit`, `@lit-labs/ssr`, `@lit-labs/ssr-client` and the `lit-html` pin are
gone; templates are compiled by the Vite preset and linted with `@gyral/core/eslint`.

## Addendum: Gyral 0.3.1 prerelease (2026-10-07)

The docs describe Gyral 0.3.1 (`svg` templates, `subscription()`, typed outputs, client-only
builds, `@gyral/time/delay`, production error codes linking to `/errors/`), which is still on
Gyral's `next` branch. `vendor/` now holds `0.3.1-next.5`, packed from `next` at `cc05cb6`
(`0.3.1-next.2` at `751f76a`, `0.3.1-next.1` at `bd2acc9` and `0.3.1-next.0` at `207e864` before it), in place of the 0.3.0 release tarballs, and
`pnpm sync:examples` / `sync:demos` read the `../gyral-next` worktree by default. When 0.3.1 is published: `^0.3.1` from npm, no `vendor/`,
and the sync default back to `../gyral` (vendor/README.md).
