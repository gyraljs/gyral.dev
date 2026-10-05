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

- A screenshot-based visual review (like gyral's `ui:check`) isn't in the gate yet; a bead
  tracks adding one when the site has more pages.
