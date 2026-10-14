---
title: Upgrading from 0.3.4 to 0.3.5
description: Gyral 0.3.5 needs no code changes. The template compiler now reports a JSX-style component tag such as `<SignupForm>`, which never rendered.
useWhen: upgrading an app from Gyral 0.3.4 to 0.3.5, or a build that fails with template rule 15 after upgrading
section: Reference
order: 2.8
---

# Upgrading from 0.3.4 to 0.3.5

Gyral 0.3.5 is a patch release with one new template check in `@gyral/core` and an updated docs
snapshot in `@gyral/mcp`. It removes and renames nothing, so an app on 0.3.4 upgrades without
code changes. Move every `@gyral/*` package to 0.3.5 together (they share one version), install,
and run your tests and build:

```sh
npm install @gyral/core@0.3.5 @gyral/testing@0.3.5
```

Add every other `@gyral/*` package your app uses to that command, at the same version. Apps
made with `create-gyral` 0.3.5 start on `^0.3.5`. From 0.3.1, 0.3.2 or 0.3.3, the same command
works; see [Upgrading from 0.3.3 to 0.3.4](/docs/upgrading-0-3-3-to-0-3-4/) for what 0.3.4
changed.

## A JSX-style component tag is a template error

Templates are HTML, so a component is rendered by the tag it was defined with:

```ts
// Before: HTML reads this as an unknown <signupform> element, and nothing renders.
view: () => html`<h1>Sign up</h1><SignupForm></SignupForm>`,
// After: the tag given to define()('signup-form', …).
view: () => html`<h1>Sign up</h1><signup-form></signup-form>`,
```

Before 0.3.5 the first form typechecked and built, and the page silently lacked the component.
Now a start tag that begins with a capital letter, has no hyphen and is not an HTML element is
template rule 15. Like the other [template rules](/docs/views/#checked-before-it-runs), it fails
`vite build` with a code frame, throws in the development runtime naming where the template is
written, and is reported by the `gyral/template` ESLint rule. The message names the tag to write
and reminds you to import the module that defines it.

Markup that worked before is not affected: HTML elements in any case (`<DIV>`, `<IFrame>`),
hyphenated names (`<Signup-Form>` is `<signup-form>`), SVG names such as `<linearGradient>`,
and lower-case unknown elements still build. So if the upgrade fails with rule 15, that tag
never rendered anything; write the component's tag name.

## The MCP server ships the current docs

`@gyral/mcp` keeps the same tools. Its docs snapshot and bundled skill now include what gyral.dev
gained since 0.3.4: the [API reference](/docs/api/) pages open by pointing to Recipes and Forms
(most of the types are inferred), the [Forms](/docs/forms/) example names its focus command
before returning it, and the agent pack says to render a component by its tag. See
[Use Gyral with coding agents](/docs/coding-agents/).

The full lists are in the changelogs of
[`@gyral/core`](https://github.com/gyraljs/gyral/blob/v0.3.5/packages/core/CHANGELOG.md) and
[`@gyral/mcp`](https://github.com/gyraljs/gyral/blob/v0.3.5/packages/mcp/CHANGELOG.md).
