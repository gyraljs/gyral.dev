# ADR 0004 — Visual design, CSS and accessibility

Status: **accepted** (2026-10-05)

## Decision

- **Brand.** Colours are the brand kit's palettes (gyraljs/brand `BRAND.md`): the _deep_
  palette on light backgrounds, the _bright_ one on dark, as oklch tokens in
  `src/styles/site.css`. The four-colour spectrum appears only as small accents (eyebrow rule,
  demo frame edge). The logo is used as delivered: the horizontal lockup, transparent-light or
  transparent-dark by `prefers-color-scheme`.
- **Type.** Sora (variable, self-hosted via `@fontsource-variable/sora`, the wordmark's
  typeface) for headings; the system UI stack for text; the system monospace stack for code.
- **Light and dark** follow the system (`color-scheme: light dark` + `light-dark()`); there is no
  toggle, so no script. Code is highlighted with both Shiki themes and switches the same way.
- **CSS architecture** follows the modern-css skill: one layered stylesheet
  (`vendor, reset, tokens, base, layout, components, pages, utilities`), logical properties,
  fluid type and space scales, container-agnostic grids (`auto-fit` + `minmax`).
- **Browser support: Baseline newly available** (stylelint `plugin/use-baseline`). This is a
  website, not a library, so the floor is one step above Gyral's packages (_widely_). Features
  beyond it (`text-wrap: pretty`, `::selection`) are inside `@supports`.
- **Accessibility is in the gate**: axe in light and dark on every page, no horizontal overflow
  at 360 px, skip link, one `<h1>`, labelled landmarks, visible focus, reduced motion respected.
  Code themes are the GitHub _default_ pair because the older pair fails contrast.

## Consequences

- The docs page list is a `<details>` menu on phones (content first) and an always-open sticky
  sidebar from 52rem, via `::details-content`. Browsers without it keep the menu collapsed.

## Visual review (site-54d.21, 2026-10-05)

`pnpm visual`, the last step of `pnpm check`, screenshots the built site and compares it with
baselines (pixelmatch, 0.2% of pixels may differ).

- **The gate set** is one page per template (home, docs index, a guide, an API page, examples,
  a blog post, brand, search with results, 404), first screen only, at desktop 1280×800 and phone
  390×844, light and dark: 36 images, about 2.6 MB, committed in `test/visual/`. It takes
  about 10 seconds.
- **`pnpm visual --all`** shoots every page full length against local baselines in `.visual/`
  (not committed): run `pnpm visual --all --update` before a CSS refactor and `pnpm visual
--all` after it to see everything that moved.
- **Determinism**: motion off, caret hidden, fonts loaded, and every font family forced to the
  bundled Sora so the laptop and the CI container render the same glyphs. The screenshots
  check layout, colour and spacing, not system-font rendering.
- **A failure** writes the new screenshot and a diff image to `.smoke/visual/` and lists them
  in `.smoke/visual.md`. Look at both.

**When to update the baselines** (`pnpm visual:update`, and commit the PNGs with the change):
only when the difference is the intended result of the change you're making (new content on
a gate page, a deliberate style change), after looking at the diff images. Never update to
make an unexplained difference go away: find out what moved first. A content edit to a gate
page (for example the home page's hero) is a legitimate reason; say so in the commit message.
