---
title: Upgrading from 0.3.1 to 0.3.2
description: Gyral 0.3.2 needs no code changes. New: viewOf for view tests, build-time CSP style hashes, chunkModules, helper types and a hosted MCP server.
useWhen: upgrading an app from Gyral 0.3.1 to 0.3.2, or checking what 0.3.2 added
section: Reference
order: 2.9
---

# Upgrading from 0.3.1 to 0.3.2

Gyral 0.3.2 adds to 0.3.1 and changes or removes nothing 0.3.1 exports, so an app on 0.3.1
upgrades without code changes. Move every `@gyral/*` package to 0.3.2 together (they share one
version), install, and run your tests and build:

```sh
npm install @gyral/core@0.3.2 @gyral/testing@0.3.2
```

Add every other `@gyral/*` package your app uses to that command, at the same version. Apps
made with `create-gyral` 0.3.2 start on `^0.3.2`.

0.3.3 followed with one fix: `npx -y @gyral/mcp` fails on 0.3.2 and needs 0.3.3, which also
replaced the second binary, `gyral-mcp-http`, with `gyral-mcp http`. Install 0.3.3 instead;
see [Upgrading from 0.3.2 to 0.3.3](/docs/upgrading-0-3-2-to-0-3-3/).

## What's new in 0.3.2

- **`viewOf` in `@gyral/testing`**: call a component's view in Node, without mounting it or a
  DOM shim, and render it with `renderToString(…, { dev: false })` to check its HTML. See
  [Views in Node](/docs/testing/#views-in-node).
- **Style hashes from the build**: `writeComponentStyleManifest` in `@gyral/ssr/static` writes
  the real `<style>` hashes of your components to a JSON file after the client build, and
  `componentStyleHashes` in the CSP options takes them, so a server that only builds the
  `Content-Security-Policy` header keeps a strict policy without importing every component.
  See [Security](/docs/security/#style-hashes-from-the-build).
- **`chunkModules`** in the components build metadata (`.vite/gyral-components.json`) maps each
  emitted chunk to the source modules in it, including modules Vite merged into a shared chunk,
  for offline caches and service workers. See
  [Code-splitting](/docs/code-splitting/#which-chunk-holds-a-module).
- **Helper types** in `@gyral/core`, type-only: `Reducer`, `Variant`, `ParseResult` and
  `StandardSchemaV1`, for reducers and parsers written outside a component spec. See
  [Model and update](/docs/update/#one-reducer-per-message) and the
  [API reference](/docs/api/core/).
- **Coverage**: the development template locator no longer adds branches to coverage reports,
  so the counts are your own code's. See [Testing](/docs/testing/#coverage).
- **The MCP server**: `@gyral/mcp` gains `gyral-mcp-http` (`gyral-mcp http` since 0.3.3), a
  read-only Streamable HTTP server,
  and Gyral hosts one at `https://mcp.gyral.dev/mcp`, with no token. A new `start_here` tool
  gives an agent the rules and the workflow; `scaffold_component` imports only installed
  packages and has a dependency-free `form-native` kind; `check_snippet` suggests fixes;
  `get_doc` takes `path`; and `get_api` suggests the nearest names. See
  [Use Gyral with coding agents](/docs/coding-agents/).
- **A new example**, [Workload lab](/examples/#workload-lab): a module worker behind a driver,
  timed sequences, a booking form with retries and a canvas grid with pointer capture, built
  with APIs 0.3.1 already has.

0.3.2 doesn't change the code that runs in the browser, so bundle sizes stay as
[Packages](/docs/packages/#whats-inside) lists them for 0.3.1. This site's client chunks built
byte for byte the same on both versions.

The full lists are in each package's changelog, such as
[`@gyral/core`](https://github.com/gyraljs/gyral/blob/v0.3.2/packages/core/CHANGELOG.md), and
in the [export inventory](https://github.com/gyraljs/gyral/blob/v0.3.2/docs/references/public-api-0.3.1.md#added-in-032).
