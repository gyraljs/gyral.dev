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
- Mention Cycle.js only where it explains Gyral's origin: the home page's "Inspired by Cycle.js"
  section, the Coming from Cycle.js page and dated blog posts. Elsewhere, describe Gyral's ideas
  on their own terms. The license credit lives in the Gyral repository's `NOTICE` file.

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

## Addendum: content for agents (gyral-7se.3, 2026-10-05)

Coding agents read docs as Markdown, so `scripts/build.ts` writes, from the same content the HTML
pages use (`src/content/llms.ts`):

- **`/llms.txt`** in the [llmstxt.org](https://llmstxt.org) format: a summary with the current
  Gyral version, how to start (`npm create gyral`, the Claude Code skill), then links to every
  docs, API reference and examples page's Markdown twin; background pages and the blog under
  "Optional".
- **`/llms-full.txt`**: every docs page in reading order, the API reference and the examples
  with their code excerpts, one section per page with its source URL.
- **A Markdown twin** at `<page>/index.md` for every docs, API, examples and blog page, linked
  from the page's head with `<link rel="alternate" type="text/markdown">`. Site links in twins
  are absolute, so a twin read on its own still points somewhere real.

The build fails (`src/content/llms-check.ts`) when a docs page has no twin or is missing from
`llms-full.txt`, when an `llms.txt` link points at a file the build didn't write, or when a file
has HTML tags or template leftovers (`${`, `[object Object]`) outside code. These files are not
in the sitemap; `robots.txt` allows them.

## Addendum: demo recordings (gyral-7se.7, 2026-10-05)

`/what-you-can-build/` shows what Gyral makes easy as short recordings, for readers who learn
from pictures rather than code. Each demo is an example in the Gyral repository with a
`demo.mjs` (a scripted Playwright path, a one-line pitch and the "usual way" contrast), recorded
there with `pnpm demos:record`.

- **What the site owns** (`src/content/demos.ts`): the title, the docs link, a text description
  of every recording (also its `aria-describedby` and its Markdown twin) and a **crop box**: the
  recordings are 1280×720 with the example in the middle, so the site keeps only the content
  plus 24 px, which makes the interface readable at page size. Re-measure the box when a
  recording's layout changes (bounding box of non-background pixels over frames sampled every
  half second).
- **What is copied** by `pnpm sync:demos` (`--record` re-records first): the pitch and contrast
  into `content/demos.json`, and each recording encoded into `public/demos/` as AV1 WebM, H.264
  MP4 (High, level 3.1) and a WebP poster, trimmed by 0.7 s (the recordings open on the page
  before its CSS loads) and cropped. File names carry a hash of the source, the trim, the crop
  and the encoder settings, so they are cached forever and only changed recordings re-encode.
  `pnpm invariants` fails when the text drifts from `demo.mjs` or a listed file is missing; it
  skips without a Gyral checkout (Cloudflare builds).
- **Playback**: each `<video>` is muted, looping, `preload="none"`, with a poster and controls, so
  the page works without JavaScript. `src/demo-videos.ts` (that page only) plays a video while
  most of it is on screen and pauses it off screen, so only watched videos download; nothing
  plays for `prefers-reduced-motion: reduce`, and a video the visitor paused stays paused.
  Sources are listed smallest first; browsers that can't decode AV1 take the MP4.

## Addendum: interop claims are tested (gyral-1zd.3, 2026-10-05)

The "Using Gyral in other frameworks" and "Using third-party web components" pages make claims
about runtime behaviour that the snippet typecheck can't prove (attribute conversion,
`gyral-output` bubbling and its shadow-boundary stop, third-party events reaching a parser).
`pnpm interop` (`scripts/check-interop.mjs`, in `pnpm check`) bundles `test/interop/entry.ts`
with the published `@gyral/core` and checks each claim in Chromium. React, Vue and Svelte
recipes on those pages are marked "not yet tested by Gyral" until a test covers them.
