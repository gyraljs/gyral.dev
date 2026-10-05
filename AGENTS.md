# AGENTS.md — gyral.dev

The Gyral website: marketing pages and documentation, served at https://gyral.dev. Built
with Gyral itself (server-rendered with `@gyral/ssr`, prerendered to static files) and hosted
on Cloudflare Pages. This file is a **map**; the linked docs are the system of record.

## Start every session

1. `bd prime`, then `bd ready`. Beads is the only task tracker (no TODO files or plans in chat).
2. Claim before coding: `bd update <id> --claim`. File discovered work with
   `--deps discovered-from:<id>`. Close with `--reason`.
3. Read the design doc for the area you touch (table below).

## Commands

| Command              | What it does                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm install`       | Install. `@gyral/*` comes from npm                                                            |
| `pnpm check`         | **The gate.** typecheck (+ docs code) · lint · format · invariants · tests · build · smoke    |
| `pnpm dev`           | Dev server on http://localhost:5400 (renders per request, Vite for assets)                    |
| `pnpm build`         | `vite build`, then prerender every page to `dist/` (what Cloudflare Pages serves)             |
| `pnpm preview`       | Serve `dist/` like Cloudflare Pages, with `_headers`, on http://localhost:5401                |
| `pnpm smoke`         | Built site in Chromium: status, console/CSP, axe light+dark, overflow, links, islands, search |
| `pnpm showcase`      | Re-capture the gyral-shop theme screenshots (start the shop first)                            |
| `pnpm ci:local`      | Run `.github/workflows/ci.yml` locally via `gh act`                                           |
| `pnpm run deploy`    | Gate, then upload `dist/` to Cloudflare Pages (owner; needs `wrangler login`)                 |
| `pnpm sync:brand`    | Copy logos and icons from a `../gyral-brand` checkout into `public/`                          |
| `pnpm sync:examples` | Copy example excerpts from a `../cyclejs-web-framework` checkout into `content/examples/`     |

First run needs `pnpm exec playwright install chromium`.

## Where things are

| Path                                           | Contents                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)             | Modules, layers, what runs where                                     |
| `content/docs/*.md`                            | Docs pages (front matter: title, description, section, order, draft) |
| `content/blog/*.md`                            | Blog posts (front matter: title, description, date, author)          |
| `content/examples/`                            | Example excerpts, synced from Gyral (never edit by hand)             |
| `src/content/api.ts`                           | The API reference, generated from the packages' types at build time  |
| `src/render/`                                  | Server-only page templates: layout, home, docs, route table          |
| `src/content/`                                 | Build-time Markdown, front matter, Shiki highlighting                |
| `src/islands/`                                 | Browser code: Gyral components hydrated on a page (counter, search)  |
| `src/shortcuts.ts`                             | The `/` and Ctrl/⌘+K search shortcut, on every page                  |
| `src/styles/site.css`                          | The one site stylesheet (layers, brand tokens, light/dark)           |
| `public/`                                      | Copied as-is: icons, logos, showcase images, `_headers`, robots      |
| `scripts/`                                     | Dev, build, preview, smoke, invariants                               |
| [docs/design-docs/](docs/design-docs/index.md) | Decisions (ADRs)                                                     |

## Design docs to read before changing…

| Area                                       | Read                                                |
| ------------------------------------------ | --------------------------------------------------- |
| Anything                                   | [0001-stack.md](docs/design-docs/0001-stack.md)     |
| Docs content, drafts, writing style        | [0002-content.md](docs/design-docs/0002-content.md) |
| Domains, deploys, headers, CSP, CI         | [0003-hosting.md](docs/design-docs/0003-hosting.md) |
| CSS, brand, accessibility, browser support | [0004-design.md](docs/design-docs/0004-design.md)   |

## Skills to load

- `modern-css` for `src/styles` and island styles; `semantic-html` for every template;
  `lit-web-apps` for islands and rendering; `beads` for work tracking.

## Hard rules (enforced by `pnpm check`)

- Islands (`src/islands`) never import `src/render`, `src/content`, Node built-ins, Markdown
  or Shiki; they use `define()` from `@gyral/core`, never raw Lit (eslint).
- Docs code blocks that start with a file comment (`// src/x.ts`) must typecheck against the
  real Gyral packages (`scripts/check-snippets.mjs`).
- Pages pass axe in light and dark, have no console errors under the production CSP, and don't
  overflow at 360 px (`pnpm smoke`).
- CSS is Baseline newly available; newer features go inside `@supports` (stylelint).
- Workflows trigger on `workflow_dispatch` only (`scripts/check-workflows.mjs`).
- Brand files in `public/` are copies; change them in gyraljs/brand and re-sync.
- Example excerpts match the Gyral examples (`sync-examples.mjs --check`).
