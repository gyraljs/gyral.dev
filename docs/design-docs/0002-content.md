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
