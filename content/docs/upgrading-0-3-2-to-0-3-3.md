---
title: Upgrading from 0.3.2 to 0.3.3
description: Gyral 0.3.3 needs no code changes. It fixes npx -y @gyral/mcp, and the MCP HTTP server is now gyral-mcp http.
useWhen: upgrading an app from Gyral 0.3.2 to 0.3.3, running the MCP server with npx, or self-hosting it with gyral-mcp-http
section: Reference
order: 2.8
---

# Upgrading from 0.3.2 to 0.3.3

Gyral 0.3.3 changes only `@gyral/mcp`. The other packages are released at 0.3.3 with no
changes, so the code that runs in the browser and on your server is the same as in 0.3.2, and
an app on 0.3.2 upgrades without code changes. Move every `@gyral/*` package to 0.3.3 together
(they share one version), install, and run your tests and build:

```sh
npm install @gyral/core@0.3.3 @gyral/testing@0.3.3
```

Add every other `@gyral/*` package your app uses to that command, at the same version. Apps
made with `create-gyral` 0.3.3 start on `^0.3.3`. From 0.3.1, the same command works; see
[Upgrading from 0.3.1 to 0.3.2](/docs/upgrading-0-3-1-to-0-3-2/) for what 0.3.2 added.

## `npx -y @gyral/mcp` works again

0.3.2 gave `@gyral/mcp` a second executable, `gyral-mcp-http`. With two to choose from, npx
couldn't pick one, so the documented way to start the server, `npx -y @gyral/mcp`, failed with
"could not determine executable to run". 0.3.3 has one executable again, `gyral-mcp`:

| Command            | Runs                                                            |
| ------------------ | --------------------------------------------------------------- |
| `gyral-mcp`        | The stdio server, what `npx -y @gyral/mcp` starts               |
| `gyral-mcp http`   | The read-only Streamable HTTP server, configured by environment |
| `gyral-mcp --help` | Usage for both modes (`gyral-mcp http --help` for HTTP)         |

If your agent's MCP config runs `npx -y @gyral/mcp`, it needs no change: npx fetches the latest
release. If your project has `@gyral/mcp` 0.3.2 installed, npx runs that copy, so update it with
the other packages. A config that must stay on 0.3.2 can run
`npx -y -p @gyral/mcp@0.3.2 gyral-mcp`. Unknown commands and options are now errors, where 0.3.2
ignored them and started the stdio server.

## Self-hosting: `gyral-mcp-http` is now `gyral-mcp http`

If you host your own HTTP server, replace `gyral-mcp-http` with `gyral-mcp http`, or
`npx -y @gyral/mcp http`. It reads the same environment variables
(`GYRAL_MCP_PUBLIC_ORIGIN`, `GYRAL_MCP_BIND`, `PORT` and the limits) and serves the same tools.
In a container, the command becomes `[gyral-mcp, http]`. See
[Use Gyral with coding agents](/docs/coding-agents/#host-your-own).

The full list is in the
[`@gyral/mcp` changelog](https://github.com/gyraljs/gyral/blob/v0.3.3/packages/mcp/CHANGELOG.md).
