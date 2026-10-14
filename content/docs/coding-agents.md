---
title: Use Gyral with coding agents
description: Connect Claude Code, VS Code or any MCP client to the Gyral MCP server, hosted or local, install the agent skill, and give agents llms-small.txt.
useWhen: setting up a coding agent to write Gyral code, connecting the Gyral MCP server, or installing the Gyral skill
section: Start here
order: 3
---

# Use Gyral with coding agents

A coding agent writes better Gyral code when it can look things up instead of guessing. Gyral
gives agents four things, and they work together:

- **The MCP server**, `@gyral/mcp`: searches these docs, returns exact API signatures and
  working examples, scaffolds components, and typechecks code against your project. It runs
  locally or at `https://mcp.gyral.dev/mcp`.
- **The agent skill**: the rules and the API in a form agents load on demand.
- **[llms-small.txt](/llms-small.txt)**: the rules, one complete component and tested recipes
  in one small file.
- **An `AGENTS.md`** in every app `create-gyral` makes.

## The hosted MCP server

`https://mcp.gyral.dev/mcp` is a public MCP server over Streamable HTTP. It needs no token and
no install, and it only reads: it answers from Gyral's docs, API and examples.

In Claude Code:

```sh
claude mcp add --transport http gyral https://mcp.gyral.dev/mcp
```

In VS Code, add it to `.vscode/mcp.json`:

```json
{ "servers": { "gyral": { "type": "http", "url": "https://mcp.gyral.dev/mcp" } } }
```

Any other client that speaks Streamable HTTP: add a server with the URL
`https://mcp.gyral.dev/mcp` and no authentication.

The hosted server has every tool except `check_snippet`, which needs your project's
TypeScript and packages. It can run an older `@gyral/mcp` than the latest release; its
`initialize` response and `https://mcp.gyral.dev/healthz` report the version it serves. The
tools marked 0.3.2 below need that version to be 0.3.2 or later, and the `get_api` guidance
below needs 0.3.4.

## The local MCP server

Run the server on your machine when the agent writes code. It adds `check_snippet`, which
typechecks against the TypeScript and `@gyral/*` versions installed in your project, and
`scaffold_component` reads your `package.json`. Start it from the project directory:

```sh
claude mcp add gyral -- npx -y @gyral/mcp
```

That's Claude Code. Other clients:

- **Codex**: `codex mcp add gyral -- npx -y @gyral/mcp`
- **Cursor**, in `.cursor/mcp.json`:

  ```json
  { "mcpServers": { "gyral": { "command": "npx", "args": ["-y", "@gyral/mcp"] } } }
  ```

- **VS Code**, in `.vscode/mcp.json`:

  ```json
  { "servers": { "gyral": { "type": "stdio", "command": "npx", "args": ["-y", "@gyral/mcp"] } } }
  ```

- **Any other client**: run `npx -y @gyral/mcp` as a stdio server.

`npx -y @gyral/mcp` needs `@gyral/mcp` 0.3.3 or later; npx fetches the latest release unless
your project has an older copy installed. On 0.3.2 it fails with "could not determine
executable to run"; run `npx -y -p @gyral/mcp@0.3.2 gyral-mcp` there instead.

The local server answers from the docs bundled with its own version, so it works offline and
matches the Gyral you install. Set `GYRAL_DOCS_URL=https://gyral.dev/llms-full.txt` to load
the latest docs at startup instead; it falls back to the bundled copy after 3 seconds.
`GYRAL_PROJECT_DIR` points `check_snippet` at another directory than the working one.

## The tools

| Tool                 | What it returns                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `start_here`         | The mental model, the rules, the workflow, and which example or guide covers which task (0.3.2)                                            |
| `search_docs`        | Ranked doc sections for a query: title, URL and snippet                                                                                    |
| `get_doc`            | One docs page, or one section with `#anchor`, such as `forms#the-server-half`                                                              |
| `get_api`            | The declaration, doc comment and import line of an export, with usage code and the next call (0.3.4); on a miss, the nearest names (0.3.2) |
| `list_examples`      | Every example and what it shows                                                                                                            |
| `get_example`        | One example's component source                                                                                                             |
| `scaffold_component` | Starting code: `basic`, `form`, `form-native` (0.3.2) or `ssr-page`, importing only what you have                                          |
| `check_snippet`      | Type errors for a module against your project, with a suggested fix for each (local only)                                                  |

The workflow the server teaches, first in its instructions and in every tool description: call
`start_here` once, start from `get_example` or `scaffold_component`, write the module right
away, then run `check_snippet` and apply its suggested fixes until it passes. Use `get_api` only
for a name you already saw in an example or an error, not to read the API type by type.

Since 0.3.4, `get_api` steers back to that loop. On a function with a matching example, such as
`define`, `each`, `fieldErrors` or `every`, it adds a short usage module and the call that gives
working code for the task, such as `scaffold_component({ tag: "signup-form", kind: "form-native" })`.
On a type, it adds a note that TypeScript infers it and that the real type errors come from
`check_snippet` (on the local server) or your typecheck. `get_api("*")` groups the functions by task, with the example or scaffold to start from,
and collapses the types into one line. The local stdio server also counts lookups: from the
fourth `get_api` call since the last `get_example`, `scaffold_component` or `check_snippet`, its
answers end with a nudge naming the next call. The HTTP server, hosted or your own, keeps no
state between requests, so it never nudges.

Since 0.3.2, `scaffold_component` imports only packages your project has installed, and
writes a model test only when `@gyral/testing` and `vitest` are there. `form-native` needs no
dependencies: it turns the browser's own constraint checks into your messages. `check_snippet`
also flags Gyral mistakes TypeScript can't see, such as a one-call `define` or side effects in
`update`.

The server also offers the resources `gyral://llms.txt`, `gyral://skill` and
`gyral://skill/references/{name}`, and a `build-gyral-component` prompt.

### Host your own

`gyral-mcp http` runs the server behind the hosted one: read-only, anonymous Streamable HTTP
at `/mcp`, without `check_snippet`. It listens on `127.0.0.1:3000` by default, and needs
`GYRAL_MCP_PUBLIC_ORIGIN` set to the origin it's served from:

```sh
GYRAL_MCP_PUBLIC_ORIGIN=http://127.0.0.1:3000 npx -y @gyral/mcp http
```

It is configured by environment variables only; `gyral-mcp http --help` lists them. Put it
behind TLS, and pin the package version you deploy. 0.3.2 shipped this server as a second
binary, `gyral-mcp-http`; since 0.3.3 it is `gyral-mcp http`. The
[package README](https://github.com/gyraljs/gyral/blob/v0.3.5/packages/mcp/README.md#public-hosting)
has the details.

## The agent skill

The skill teaches an agent the rules and the API, with a reference per topic that it loads
when the task needs it. Every code block in it typechecks against the packages. Since 0.3.4,
`SKILL.md` opens with where to start from working code (the recipes, llms-small.txt and the MCP
loop) and the rule that the entry must import every component module, and its forms reference
starts with native validation, as the [Forms guide](/docs/forms/) does.

In Claude Code, add Gyral's repository as a plugin marketplace and install the plugin:

```text
/plugin marketplace add gyraljs/gyral
/plugin install gyral@gyral
```

From a shell: `claude plugin marketplace add gyraljs/gyral && claude plugin install gyral@gyral`.

Other agents: copy
[`skills/gyral/`](https://github.com/gyraljs/gyral/tree/v0.3.5/skills/gyral) into the agent's
skills or rules folder, or point it at `SKILL.md`.

## Docs for agents

- **[llms-small.txt](/llms-small.txt)**: read first. The mental model, MUST and DO NOT rules, a
  complete component with tests, the recipes, and where each export comes from, in under
  40 KB. Every code block in it compiles against the released packages.
- **[llms.txt](/llms.txt)**: the index of every page, each with a line on when to read it.
- **[llms-full.txt](/llms-full.txt)**: all the docs, the API reference and the examples in one
  file.
- Every docs page has a Markdown copy: add `index.md` to its URL, as in
  `/docs/testing/index.md`.

## New apps

`npm create gyral@latest` writes an `AGENTS.md` into every project, and a `CLAUDE.md` that
imports it, so an agent that opens the project learns the rules and the commands before it
writes anything. See [Getting started](/docs/getting-started/#create-a-project).
