# Vendored Gyral 0.3.0

These are the `@gyral/*` 0.3.0 packages the site uses (core, ssr, devtools, http, router,
testing, time), packed with `pnpm pack` from Gyral's release tag `v0.3.0` (commit `e79abd6`):
the same source as the npm release. `@gyral/mcp` and `create-gyral` are not used, so they are
not here.

**Why:** Gyral 0.3.0 is released on GitHub but not yet on npm (the owner approves the staged
packages on 2026-10-10). Vendoring lets `main`, CI and a Cloudflare Git build install without a
sibling `../gyral-tarballs` folder. `package.json` points every `@gyral/*` dependency and pnpm
override at `file:./vendor/…`; the overrides are needed because the packages depend on each other
at exactly `0.3.0`.

**Removing them** once 0.3.0 is on npm:

1. In `package.json`, set every `@gyral/*` dependency and every `pnpm.overrides` entry to
   `^0.3.0` (or drop the overrides block).
2. Delete `vendor/`.
3. `pnpm install`, then `pnpm check`.
4. Update the mentions of `vendor/` in `AGENTS.md`, `README.md`, `.github/workflows/ci.yml` and
   `docs/design-docs/0001-stack.md` / `0003-hosting.md`.
