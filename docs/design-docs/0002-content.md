# ADR 0002 — Docs content

Status: **accepted** (2026-10-05)

## Decision

- Every docs page is a Markdown file in `content/docs/`. The file name is the URL:
  `forms.md` → `/docs/forms/`; `index.md` → `/docs/`.
- Front matter (`key: value` lines only) is required and validated at build time:

  | Key           | Meaning                                                            |
  | ------------- | ------------------------------------------------------------------ |
  | `title`       | The page's `<h1>` text and `<title>`                               |
  | `description` | Meta description and the summary on `/docs/`; 50–160 characters    |
  | `section`     | One of `Start here`, `Guides`, `Reference`, `Background` (sidebar) |
  | `order`       | Position within its section                                        |
  | `draft`       | `true` keeps the page out of the build, the nav and the sitemap    |

- **Drafts** hold the planned outline of an unwritten page and name the sources in the gyral
  repo (ADRs, examples) to write it from. Each draft has a bead. Publishing a page is removing
  `draft: true`.
- **Code must compile.** A ` ```ts ` block whose first line is a file comment
  (`// src/counter.ts`) is extracted with the page's other named blocks and typechecked against
  the real packages (`scripts/check-snippets.mjs`, in `pnpm typecheck`). Blocks without a file
  comment are fragments and aren't checked; prefer complete files.
- Headings get ids and self-links; `h2`/`h3` form the "On this page" outline.

## Writing style

- Second person, present tense, short sentences. Explain why before how.
- Lead with a working example, then explain it.
- Use the semantic-html skill's vocabulary in examples (labels, `<output>`, `<form>`): the docs
  teach accessible markup by example.
- Credit Cycle.js where an idea comes from it.

## Addendum: generated reference, examples and blog (2026-10-05)

- **API reference** (`/docs/api/<package>/`) is generated at build time by
  `src/content/api.ts`: the TypeScript compiler lists every export of every entry point of the
  `@gyral/*` packages the site depends on, and each is shown with its declaration as written
  (bodies removed) and its doc comment. It works on source (linked packages) and on published
  `.d.ts` files alike. Nothing is written by hand, so it can't drift.
- **Examples** (`/examples/`) are listed in `src/content/examples.ts`. Their excerpts are copies
  in `content/examples/`, made by `pnpm sync:examples` from a Gyral checkout (styles blocks and
  the global tag map left out). `pnpm invariants` fails when a copy differs from its source.
- **Blog posts** are `content/blog/*.md` with `title`, `description` (50–160 characters),
  `date` (`YYYY-MM-DD`) and `author`; they render with `BlogPosting` structured data.
- Docs code blocks may use Vite's client types (`?raw` imports) in `check-snippets`.
