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
- The page shell, header, footer and docs are server-only `serverHtml` templates. **Docs pages
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
  `../cyclejs-web-framework`). The API reference is generated from the published `.d.ts`.
