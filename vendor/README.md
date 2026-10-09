# Vendored Gyral 0.3.1-next.4

These are the `@gyral/*` packages the site uses (core, ssr, devtools, http, router, testing,
time) at **0.3.1-next.4**, a prerelease of Gyral 0.3.1, packed with `pnpm pack` from Gyral's
`next` branch at commit `f95ede8` (`../gyral-tarballs/SOURCE-0.3.1-next.4.json`). `@gyral/mcp`
and `create-gyral` are not used, so they are not here.

**Why:** neither 0.3.0 nor 0.3.1 is on npm yet. 0.3.0 is released on GitHub and staged on npm
(the owner approves it on 2026-10-10); 0.3.1 is still on Gyral's `next` branch. The site documents
0.3.1, so it builds against the prerelease. Vendoring lets `main`, CI and a Cloudflare Git build
install without a sibling `../gyral-tarballs` folder. `package.json` points every `@gyral/*`
dependency and pnpm override at `file:./vendor/…`; the overrides are needed because the
packages depend on each other at exactly `0.3.1-next.4`.

**Updating** to a newer prerelease: copy the new `gyral-{core,ssr,devtools,http,router,testing,time}-<version>.tgz`
from `../gyral-tarballs` here, delete the old ones, replace the version in every `file:` path in
`package.json`, then `pnpm install` and `pnpm check`. Update this file's commit.

**Removing them** once 0.3.1 is on npm:

1. In `package.json`, set every `@gyral/*` dependency to `^0.3.1` and drop the
   `pnpm.overrides` block (the published packages depend on each other by version).
2. Delete `vendor/`.
3. `pnpm install` (the lockfile must then reference only the npm registry), then `pnpm check`.
4. Update the mentions of `vendor/` in `AGENTS.md`, `README.md`, `.github/workflows/ci.yml` and
   `docs/design-docs/0001-stack.md` / `0003-hosting.md`, and sync examples from Gyral's `main`
   again (`GYRAL_DIR` unset).

If 0.3.0 reaches npm before 0.3.1 does, stay on the vendored prerelease: the docs describe 0.3.1
APIs (`svg`, `subscription()`, `@gyral/time/delay`, …) that 0.3.0 doesn't have.
