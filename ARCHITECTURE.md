# Architecture

One route table, one renderer, two ways to run it.

```
content/docs, content/blog ──► src/content (front matter, Markdown, Shiki) ─┐
@gyral/* type declarations ──► src/content/api.ts (TypeScript compiler) ────┤
content/examples (excerpts) ──► src/content/examples.ts ────────────────────┤
                                                                             ├─► src/render/site.ts ─► Response
src/site.ts (origin, nav) ──► src/render (layout, home, docs, examples, blog, brand) ┘   │
                                                                              ├─ scripts/dev.ts: per request (Vite middleware)
src/islands/*.ts ──► src/entry-client.ts ──► vite build ──► dist/assets/      └─ scripts/build.ts: prerender every path → dist/
src/styles/site.css ───────────────────────► vite build ──► dist/assets/
public/ ───────────────────────────────────► copied to dist/
```

## Layers

| Layer         | Runs                 | May import                                                         |
| ------------- | -------------------- | ------------------------------------------------------------------ |
| `src/site.ts` | server and browser   | nothing                                                            |
| `src/content` | build (Node)         | `marked`, `shiki`, `typescript`, Node built-ins                    |
| `src/render`  | build (Node)         | `src/content`, `src/islands` (to server-render them), `@gyral/ssr` |
| `src/islands` | browser (and server) | `@gyral/core`, `src/site.ts` only                                  |
| `scripts/`    | Node                 | anything                                                           |

`src/render` is server-only: the shell, header, footer and docs pages are written with
`serverHtml` and never hydrated, so docs pages ship **no JavaScript**. Interactive parts are
islands: Gyral components rendered with Declarative Shadow DOM inside a page and hydrated by
`src/entry-client.ts`. A page that contains islands sets `islands: true` in its `PageMeta`,
which adds the client entry script. Today the only island is the home page's
`<gd-loop-counter>`.

## Output

`dist/` is a static site: `index.html` per path (`/docs/getting-started/` →
`docs/getting-started/index.html`), `404.html`, `sitemap.xml`, hashed `assets/`, and `public/`
copied verbatim (including `_headers`, which Cloudflare Pages applies). See
[0003-hosting.md](docs/design-docs/0003-hosting.md).
