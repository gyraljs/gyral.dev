---
title: Packages
description: Every @gyral package, what it's for, how to install it, and the optional build tools Gyral works with.
useWhen: choosing which @gyral package to install, checking sizes, or reading known issues
section: Reference
order: 1
---

# Packages

Gyral is a set of small packages under the `@gyral` scope on npm, plus `create-gyral`, which
sets up a new app. Every app needs `@gyral/core`; add the others when you need them. All nine
packages are released together with the same version number (0.3.5), are ES modules with
TypeScript types, and are published from GitHub Actions with
[npm provenance](https://docs.npmjs.com/generating-provenance-statements).

## Core

| Package       | What it gives you                                                                                                                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@gyral/core` | `define()`, intents, update and commands, subscriptions, stores, forms, `subscription()`, and the view layer: `html`, `svg`, `css`, `each`, `keyed`, `raw`, hooks. `/vite` has the preset (template compiler, component loading, element typings), `/eslint` the template rules. |

```sh
npm install @gyral/core
```

`@gyral/core/storage` and `@gyral/core/indexeddb` are optional entry points in the same
package. They provide separate native [localStorage and IndexedDB drivers](/docs/browser-storage/).
Apps that do not import them carry no storage driver code.

## Optional packages

| Package           | What it gives you                                                                                                                                                                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@gyral/http`     | The `http` driver: `get`, `request`, `submitForm`, typed errors, schema decoding. `@gyral/http/testing` has `fakeHttp`.                                                                                                                                                                |
| `@gyral/router`   | Typed route tables, `listen`, `navigate`, `setHead`, browser and memory history.                                                                                                                                                                                                       |
| `@gyral/time`     | `delay`, `debounce` and `every` as commands; an app that only delays doesn't bundle `every`.                                                                                                                                                                                           |
| `@gyral/ssr`      | Server rendering: `renderPage`, `renderToString`, `contentSecurityPolicy`, `styleHashes`, `formAction`. `@gyral/ssr/static` prerenders and serves builds and writes component style hashes, `@gyral/ssr/node` mounts a fetch handler on Node's `http` and runs the development server. |
| `@gyral/testing`  | `step`, `run`, `viewOf`, `subscriptionsFor`, `outputsIn`, `mount`, `parse`, fake drivers, virtual time, `mountSsr` and `hydrated`. `@gyral/testing/vitest` renders server markup for browser tests.                                                                                    |
| `@gyral/devtools` | The in-page devtools panel, for development builds.                                                                                                                                                                                                                                    |
| `@gyral/mcp`      | An MCP server for coding agents: it searches these docs, looks up exact API signatures, reads the examples, scaffolds components and typechecks snippets against your project. Hosted at `https://mcp.gyral.dev/mcp`.                                                                  |

```sh
npm install @gyral/http @gyral/router @gyral/time
npm install @gyral/ssr
npm install -D @gyral/testing @gyral/devtools
```

The same `@gyral/http` installation includes optional `@gyral/http/sse` and
`@gyral/http/websocket` entries for [native network streams](/docs/network-streams/).
The fetch entry does not include those transports.

`@gyral/mcp` is a stdio server your agent starts with `npx -y @gyral/mcp`, from your project
directory. It answers from the docs, API and examples of its own version, bundled at build time,
so it works offline. `gyral-mcp http` runs a read-only Streamable HTTP server instead; Gyral hosts one at
`https://mcp.gyral.dev/mcp`, with no token. Setup for Claude Code,
VS Code, Cursor, Codex and other clients is in
[Use Gyral with coding agents](/docs/coding-agents/).

## create-gyral

`npm create gyral@latest` asks for a directory and a template, `basic` (client-rendered) or
`ssr` (server-rendered and hydrated), and writes an app that depends on the matching `@gyral/*`
release. [Getting started](/docs/getting-started/#create-a-project) walks through it.

## Optional peer dependencies

No Gyral package asks you to install another library at runtime. The build tools Gyral plugs
into are optional peer dependencies: install the ones you use.

| Package          | Optional peers                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `@gyral/core`    | `vite` ^8 (preset and compiler), `eslint` 9 or 10 (the plugin), `parse5` (compiler check) |
| `@gyral/ssr`     | `vite` ^8 (the development server in `@gyral/ssr/node`)                                   |
| `@gyral/testing` | `vitest` ^4.1 or ^5 (only for `@gyral/testing/vitest`)                                    |
| `@gyral/mcp`     | `typescript` 5 or later (for `check_snippet`; it uses your project's compiler)            |

Validation in `@gyral/core`, `@gyral/http` and `@gyral/ssr` accepts any
[Standard Schema](https://standardschema.dev) library; Gyral depends only on its types.

Any custom element works next to Gyral components, including ones built with Lit; install that
library yourself if you use it. Upgrading an existing app? See
[Versioning and stability](/docs/versioning/).

## The Vite preset

`gyralVitePreset()` from `@gyral/core/vite` holds the settings every Gyral app needs:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { gyralVitePreset } from '@gyral/core/vite';

export default defineConfig({
  ...gyralVitePreset(),
});
```

- **`plugins`**: the template compiler, a template-locations plugin, a dev-server plugin and the
  element-typings plugin. In `vite build` the compiler checks every `html` and `svg` template,
  dependencies included, fails the build with a code frame on a rule violation, and replaces each
  template with a precompiled object, so the bundle doesn't carry the runtime template preparer. The
  dev server and Vitest keep the runtime path, which checks the same rules on first render; there
  the template-locations plugin tells the runtime where each template is written, so its errors and
  hydration mismatches name your file, line and column. With `parse5` installed, the build also
  compares each template with a full HTML parser's result. The dev-server plugin makes Vite, not
  Node, load `@gyral/*` (and your dependencies that use them) in server code under `vite dev`, so
  server rendering there gets development output and shares one copy of `@gyral/core`. If your
  config has plugins of its own, list them all: `plugins: [...gyralVitePreset().plugins, mine()]`.
- **`optimizeDeps.include`**: empty by default. If Vite discovers a dependency during the first
  browser test run and reloads the page, list it: `gyralVitePreset({ optimize: ['some-dep'] })`.
- **`clientOnly: true`**, for apps no server renders, leaves the hydration code out of the
  browser bundle. See [Client-only builds](/docs/rendering-modes/#client-only-builds).
- **`components: true`** loads each component's module once its tag is on the page, so pages
  need no client entry. See
  [Code splitting](/docs/code-splitting/#load-components-by-whats-on-the-page).
- **`types`**: the preset writes [element typings](/docs/components/#anatomy-of-define) to
  `.gyral/elements.d.ts` by scanning `src`; `types: false` turns that off.

Import `html` from `@gyral/core` wherever you write templates. The compiler follows that import,
and refuses an alias (`const h = html`) it can't follow. For Vitest browser tests, spread the
preset into each browser project's config too.

## The ESLint plugin

`@gyral/core/eslint` shows the compiler's template errors in your editor, with the same
messages, checks that `each` rows read only their arguments, and finds intent parsers no
template names:

```js
// eslint.config.js
import gyral from '@gyral/core/eslint';

export default [{ files: ['src/**/*.ts'], ...gyral.configs.recommended }];
```

`recommended` turns on `gyral/template` and `gyral/each-row-purity` as errors and
`gyral/unused-intent` as a warning. It works without Vite. See [Views](/docs/views/#checked-before-it-runs) for what the rules catch.

## What's inside

`@gyral/core` has no runtime dependencies. Its view layer was written for Gyral alone, from the
platform's own primitives: `<template>` cloning, constructable stylesheets, Declarative Shadow
DOM. Commands run on a small built-in runtime (one `AbortController` per task) that handles
cancellation, concurrency lanes and retries.

Apps ship only the features they use. `each`, `raw`, hooks, commands, stores and the prop builders
register themselves when your code first calls them, so an app that never calls one doesn't
bundle it, and the hydration code is a separate chunk that only server-rendered pages fetch.
Measured on Gyral's examples at 0.3.5 (KiB gzip, production builds with the preset):

| App                      | First load | All chunks |
| ------------------------ | ---------- | ---------- |
| hello-world              | 9.6        | 12.0       |
| hello-world, client-only | 8.5        | 8.5        |
| isomorphic (SSR)         | 15.3       | 18.3       |
| no-js-first (SSR, forms) | 19.8       | 20.0       |

"First load" is the entry chunk and what it imports statically: what a page downloads before any
lazy `import()`. The no-js-first example loads its components
[by what's on the page](/docs/code-splitting/#load-components-by-whats-on-the-page), so its first
load counts what a page with every component preloads, the hydration chunk included. Builds leave
out view transitions, the frame lane and custom states unless a module names their spec field (the
build reads your code and the packages that depend on Gyral; see [what the build
reads](/docs/rendering-modes/#what-the-build-reads)), and production builds print short
[error codes](/errors/) instead of messages. [Error handling](/docs/error-handling/), which every
app carries, costs about 0.75 KiB. The client-only row is the same app built with
[`clientOnly: true`](/docs/rendering-modes/#client-only-builds). The isomorphic example
routes, and the router's [scroll and focus handling](/docs/routing/#scroll-and-focus) costs it
about 0.5 KiB of first load; the History API code (about 0.75 KiB) loads only in browsers without
the Navigation API.

Browser code targets [Baseline](https://web.dev/baseline) "widely available" features. Newer
APIs, such as the Navigation API, URLPattern, invoker commands and View Transitions, are
feature-detected and used as enhancements.

## Known issues

- **Some markup isn't handled yet by the template checks**: `<select>` content under the new
  customizable-select parsing, CDATA in SVG, and `<noscript>` as raw text. Keep these out of
  templates, or put them in `raw()` on the server.
- **Deno and Cloudflare Workers have only had a spot check** for server rendering: a
  `renderPage` bundle ran on Deno and in a local Workers runtime, but adapters, deployed edge
  behavior, bindings and assets aren't tested (see
  [Deploying](/docs/deploying/#bun-deno-and-cloudflare-workers)).
- **Without a preload hint, the hydration chunk loads one round trip after the entry** on
  server-rendered pages. Pass `clientAssetsFromManifest()`'s `modulepreload` to `renderPage` (see
  [Static sites](/docs/static-sites/#a-static-build)); `productionServer` hands it to your app,
  with an `assets(modules)` that adds a page's lazily imported route chunks.
