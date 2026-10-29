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
  Shadow DOM. `gyralVitePreset({ components: true })` builds one module per island and
  `renderPage({ components })` loads only the ones a page rendered (Gyral 0.3.1), so there is
  no client entry and no per-page flag.
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
`vendor/` and the branch merged to `main`. `lit`, `@lit-labs/ssr`, `@lit-labs/ssr-client` and the `lit-html` pin are
gone; templates are compiled by the Vite preset and linted with `@gyral/core/eslint`.

## Addendum: Gyral 0.3.1 prerelease (2026-10-07)

The docs describe Gyral 0.3.1 (`svg` templates, `subscription()`, typed outputs, client-only
builds, `@gyral/time/delay`, production error codes linking to `/errors/`), which is still on
Gyral's `next` branch. `vendor/` now holds `0.3.1-next.7`, packed from `next` at `0b96681`
(`0.3.1-next.2` at `751f76a`, `0.3.1-next.1` at `bd2acc9` and `0.3.1-next.0` at `207e864` before it), in place of the 0.3.0 release tarballs, and
`pnpm sync:examples` / `sync:demos` read the `../gyral-next` worktree by default during prerelease testing.

## Addendum: Gyral 0.3.1 release (2026-10-11, site-wuk)

All nine Gyral packages are published on npm as 0.3.1. Registry-only installs of both
`create-gyral` templates typecheck, build and pass their tests. The site uses `^0.3.1`
registry dependencies, with no vendored packages or overrides. The sync default is
`../gyral`, matching the framework's `main` branch and the published API.

## Addendum: examples pinned to the release tag (2026-10-12)

Gyral's `main` moves past a release with unreleased work, and the site documents only what is on
npm. `sync:examples` and `sync:demos` therefore read `examples/` from the checkout's tag for the
installed `@gyral/core` (`v0.3.1`), extracted with `git archive` (`scripts/lib/gyral-source.mjs`;
`GYRAL_REF` overrides it). Recordings still come from the checkout's untracked `.demos/`, so
`--record` warns when the checkout is not on that tag.

## Addendum: Gyral 0.3.2 release (2026-10-12)

The site pins every `@gyral/*` dependency to exactly `0.3.2` from the registry, with no
overrides. 0.3.2 only adds to 0.3.1's API, so no site code changed; the client chunks built
byte for byte the same. The examples sync reads `v0.3.2`, which adds the workload-lab example
to the gallery. The docs cover `viewOf`, the build-time style manifest, `chunkModules`, the
helper types, the coverage fix and the MCP server (/docs/coding-agents/, hosted at
`https://mcp.gyral.dev/mcp`), and /docs/upgrading-0-3-1-to-0-3-2/ announces the release.

## Addendum: Gyral 0.3.3 release (2026-10-12)

The site pins every `@gyral/*` dependency to exactly `0.3.3`. 0.3.3 changes only `@gyral/mcp`
(one bin again, so `npx -y @gyral/mcp` works; the HTTP server is `gyral-mcp http` instead of
0.3.2's `gyral-mcp-http`), so no site code changed. The examples and demos sync read `v0.3.3`
with no drift. /docs/upgrading-0-3-2-to-0-3-3/ announces the release, and the coding-agents and
packages pages describe `gyral-mcp http`.

## Addendum: Gyral 0.3.4 release (2026-10-13)

The site pins every `@gyral/*` dependency to exactly `0.3.4`. 0.3.4 fixes repeated
`modulepreload` links after the body (`@gyral/ssr`), stops the component scan from reading
comments and strings (`@gyral/core`'s Vite preset) and changes what `@gyral/mcp`'s `get_api`
answers; the site needed no code changes. The examples and demos sync read `v0.3.4`.
/docs/upgrading-0-3-3-to-0-3-4/ announces the release. `GYRAL_DOCS_VERSION` (scripts/build.ts)
lets a release branch build its llms files under the upcoming version before that version is on
npm, for the MCP docs snapshot; the deployed build leaves it unset and reads the installed
`@gyral/core`.

## Addendum: Gyral 0.3.5 release (2026-10-14)

The site pins every `@gyral/*` dependency to exactly `0.3.5`. 0.3.5 adds template rule 15
(`@gyral/core`: a JSX-style component tag such as `<SignupForm>` is a template error) and ships
the refreshed docs snapshot in `@gyral/mcp`; the site needed no code changes, and none of its
templates trips the rule. The examples and demos sync read `v0.3.5`.
/docs/upgrading-0-3-4-to-0-3-5/ announces the release.

## Addendum: Gyral 0.3.6 release (2026-10-14)

The site pins every `@gyral/*` dependency to exactly `0.3.6`. 0.3.6 adds the G0014
development warning for undefined custom-element tags, runs template rule 15 in the browser
only in development and removes the empty `@gyral/ssr/hydrate` entry; the site needed no code
changes. The docs describe only the current release (upgrade pages for earlier releases were
removed and redirect to /docs/versioning/). `GYRAL_ERRORS_JSON` (src/content/errors.ts) lets a
release branch read the upcoming error table from the gyral checkout, so the MCP snapshot's
errors page lists the new code before npm has it. Hand-written repository links in the docs
pages pin the release tag too; a content test fails when one names another tag.

## Addendum: two-week release age (2026-10-29)

A dependency version is adopted only once it has been published for two weeks, as in every
gyraljs repository (Gyral's ADR 0032, bead gyral-337.7). `minimumReleaseAge: 20160` in
`pnpm-workspace.yaml` makes pnpm refuse younger versions, and `.github/dependabot.yml` waits
as long. A Gyral release the owner verified comes in early through an exact-version
`minimumReleaseAgeExclude` entry, removed once it is two weeks old. Vite moved to 8.3.4 for
GHSA-587h-7wmj-h5pm and five other advisories fixed in 8.3.3 (gyral-337.8).

## Addendum: dependency update for Gyral 0.3.8 (2026-10-29)

Every dependency moved to its newest version that is two weeks old (Gyral epic gyral-337), except
TypeScript, which stays on 6.0 because typescript-eslint supports only `<6.1`, and `@gyral/*`,
which stays on 0.3.7 until 0.3.8 is published. The majors are `@types/node` 26 (Gyral supports
Node 24 and 26; the types follow 26) and pixelmatch 8, whose OKLab colour metric keeps the API
and the `threshold` scale: the visual baselines still match. Playwright is 1.64.1.

pnpm moved from 10.33.2 to 12.14.0. pnpm 12 checks the lockfile against the age gate on every
install, so the verified Gyral 0.3.7 comes in through exact `minimumReleaseAgeExclude` entries
(until 2026-11-11 or 0.3.8). It also fails on build scripts nobody decided on, so `allowBuilds`
lists esbuild as not run (pnpm 10 skipped its postinstall too). The lockfile gains a first
document that pins pnpm itself. Cloudflare's preinstalled pnpm 10 switches to the
`packageManager` version (checked with a standalone 10.11.1); `PNPM_VERSION` on the Pages project
would pin it otherwise. The CI workflow pins its actions by commit (checkout v7.0.1 without
persisted credentials, pnpm/action-setup v6.1.0, setup-node v7.1.0) and Node to 24.22.0.

Held back as too young: eslint 10.13.0 (until 2026-10-30), stylelint-plugin-use-baseline 1.4.8
(11-01), typescript-eslint 8.72 (11-02), vite 8.3.5 and pnpm 12.15 (11-04), hono 4.13.14 (11-08),
marked 18.1.2 (11-09) and `@types/node` 26.6.6 (11-11). fast-uri 3.1.9 (11-02) fixes four
advisories in URI parsing, reached here only through ajv validating the config of stylelint's
`table` output, so it waits too.
