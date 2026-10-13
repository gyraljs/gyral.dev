---
title: Upgrading from 0.3.3 to 0.3.4
description: Gyral 0.3.4 needs no code changes. It stops repeated preload links, fixes the component scan and steers MCP agents to working code.
useWhen: upgrading an app from Gyral 0.3.3 to 0.3.4, removing a workaround for duplicate modulepreload links, or checking what changed in the MCP server's get_api
section: Reference
order: 2.7
---

# Upgrading from 0.3.3 to 0.3.4

Gyral 0.3.4 is a patch release with three fixes: in `@gyral/ssr`, `@gyral/core`'s Vite preset
and `@gyral/mcp`. It removes and renames nothing, so an app on 0.3.3 upgrades without code
changes. Move every `@gyral/*` package to 0.3.4 together (they share one version), install,
and run your tests and build:

```sh
npm install @gyral/core@0.3.4 @gyral/testing@0.3.4
```

Add every other `@gyral/*` package your app uses to that command, at the same version. Apps
made with `create-gyral` 0.3.4 start on `^0.3.4`. From 0.3.1 or 0.3.2, the same command works;
see [Upgrading from 0.3.2 to 0.3.3](/docs/upgrading-0-3-2-to-0-3-3/) for what 0.3.3 changed.

## Server-rendered pages link each module once

With [automatic components](/docs/server-rendering/#loading-components-in-the-browser)
(`renderPage({ components })`), the links written after the body could repeat links the head
already had. The components loader can import the client entry, so a component bundled into the
entry chunk preloaded the entry's whole graph again, one `<link rel="modulepreload">` for each
module the head had preloaded from `modulepreload`. The browser fetched each module once either
way, but the markup carried every link twice.

In 0.3.4 the tail after the body leaves out every module, stylesheet and script the head links
(`modulepreload`, `stylesheets` and `scripts`), never links one of its own URLs twice, and
otherwise keeps its order. This holds on every render path: `renderPage`, streamed or rendered to
a string first, `renderToString` of a `page()`, and so `prerender`, `productionServer` and
`gyralDevServer` apps. In development, the Vite client script is no longer repeated when the head
already loads it.

Nothing breaks if you keep a workaround, but you can drop it. If your app took the head's
`modulepreload` URLs out of the `components` preload lists to avoid the duplicates, pass
`modulepreload` and `components` to `renderPage` as they come.

## The component scan reads code, not comments or strings

`gyralVitePreset({ components })` and the element typings it writes to `.gyral/elements.d.ts`
find components by scanning your source for `define()` calls. Before 0.3.4, a `define()` inside
a doc comment, a string, template text or a test fixture counted too, so it could register a tag
that doesn't exist or map a tag to the wrong module. 0.3.4 skips comments and the contents of
string, template and regular expression literals.

Real calls are found as before, including the two-call `define<State, Msg>()('my-tag', …)`
and calls inside a template's `${…}`. A component made by a helper of your own still needs
[`components.modules`](/docs/server-rendering/#loading-components-in-the-browser). If you renamed
files or reworded comments to keep a code sample from being picked up, you can undo that.

## The MCP server steers agents to working code

`@gyral/mcp` keeps the same tools and input schemas. What changes is what `get_api` answers,
so agents spend their requests writing code instead of reading types one at a time:

- On a function with a matching example, such as `define`, `each`, `fieldErrors`, `invalid` or
  `every`, it adds a short usage module and the call that gives working code for the task,
  such as `scaffold_component({ tag: "signup-form", kind: "form-native" })`.
- On a type, it adds a note that TypeScript infers it, and that `check_snippet` names the real
  type errors.
- In a stdio session, from the fourth `get_api` call since the last `get_example`,
  `scaffold_component` or `check_snippet`, the answer ends with a nudge naming the next call for
  the task. The HTTP server, including the hosted one, keeps no state between requests and
  never nudges.
- `get_api("*")` groups the functions by task, each with the example or scaffold to start
  from, and collapses the types into one line.

The server instructions and every tool description now lead with the workflow. The bundled
skill's `SKILL.md` opens with where to start from working code and the rule that the entry must
import each component module, and its forms reference starts with native validation, as the
[Forms guide](/docs/forms/) does. See [Use Gyral with coding agents](/docs/coding-agents/#the-tools).

The full lists are in the changelogs of
[`@gyral/ssr`](https://github.com/gyraljs/gyral/blob/v0.3.4/packages/ssr/CHANGELOG.md),
[`@gyral/core`](https://github.com/gyraljs/gyral/blob/v0.3.4/packages/core/CHANGELOG.md) and
[`@gyral/mcp`](https://github.com/gyraljs/gyral/blob/v0.3.4/packages/mcp/CHANGELOG.md).
