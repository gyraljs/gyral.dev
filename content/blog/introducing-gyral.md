---
title: Introducing Gyral
description: Gyral 0.1 is out. Model-View-Intent web components on the modern web platform, with server rendering, forms, routing and testing built in.
date: 2026-10-05
author: Mike Zupper
---

# Introducing Gyral

Gyral is a small framework for building web components with Model-View-Intent. Version 0.1 is on
npm today, under the MIT licence.

A Gyral component is three pure functions and a little data:

```ts
import { define, html } from '@gyral/core';

type Msg = { readonly _tag: 'Increment' } | { readonly _tag: 'Decrement' };

define<{ readonly count: number }, Msg>('my-counter', {
  init: () => ({ count: 0 }),
  intent: {
    Increment: () => ({ _tag: 'Increment' }),
    Decrement: () => ({ _tag: 'Decrement' }),
  },
  update: {
    Increment: (s) => ({ count: s.count + 1 }),
    Decrement: (s) => ({ count: s.count - 1 }),
  },
  view: (s, i) => html`
    <button type="button" data-intent=${i.Decrement}>Decrement</button>
    <output>${s.count}</output>
    <button type="button" data-intent=${i.Increment}>Increment</button>
  `,
});
```

**Intent** turns platform events into typed messages. **Update** turns messages into new
state, one reducer per message, checked for completeness by TypeScript. **View** turns state
into HTML and names intents instead of attaching event handlers. The result is a standard custom
element, `<my-counter>`, that works in any page and alongside any framework.

## What's in 0.1

- **Effects as data.** Reducers return commands, such as an HTTP request, a timer or a
  navigation, and drivers run them. Concurrency is a policy per lane (`switch`, `exhaust`,
  `queue`, `merge`), so "cancel the stale search" is one word, not an operator chain.
- **Server rendering that hydrates in place.** `@gyral/ssr` renders components with Declarative
  Shadow DOM. Pages are readable before any JavaScript loads, and in the browser each component
  resumes from the server's state without rendering twice. Pages can be prerendered at build
  time, or hydrate lazily when idle, visible or touched.
- **Forms with and without JavaScript.** One Standard Schema validates a form in the browser and
  on the server. Errors live in the model and are mirrored into native validity, so they look
  the same either way.
- **Routing, time and HTTP drivers**, each a small package: typed route tables, `debounce` and
  `periodic`, schema-decoded responses with typed errors.
- **Shared state** with stores: read like props, written with messages, one instance per request
  on the server.
- **Testing without a browser**, and with one. `step()` and `run()` drive `update` directly; fake
  drivers, virtual time and server-render mounting cover the rest.
- **Devtools**: an in-page timeline of every message, state change and command, stripped from
  production builds.

Under the hood, `@gyral/core` uses [Effect](https://effect.website) 3 to run commands, which
gives it structured cancellation and retries. You won't see it: the public API is plain
TypeScript, and the published types never mention Effect.

## Built on the platform

Gyral leans on what browsers now do well. Components are custom elements with Shadow DOM.
Templates are [Lit](https://lit.dev)'s. Links are `<a href>`, forms are `<form>`, and newer
features such as the Navigation API, View Transitions and invoker commands are used where the
browser has them, with a fallback where it doesn't. Styling is plain CSS: custom properties,
cascade layers and `:state()` driven by the model.

## A real application

To find out where a framework falls short, you have to build something real with it. Alongside
Gyral we built [gyral-shop](https://github.com/gyraljs/gyral-shop), a full department store:
catalog and search, accounts, cart, checkout, orders, reviews and an admin area. It is
server-rendered, works without JavaScript, and switches between four complete themes with CSS
alone. Many of Gyral's features, from light-DOM page components to `fakeHttp`, exist because
the shop needed them.

## Standing on Cycle.js

Gyral is inspired by [Cycle.js](https://cycle.js.org). It keeps Cycle's central idea, an app as
a pure function with effects at the edges, and rebuilds it on today's platform: plain messages
instead of streams, Shadow DOM instead of `isolate()`, Lit templates instead of a virtual DOM.
Its examples are ports of the Cycle.js examples. There's more on that in
[Why I rebuilt Cycle.js on web components](/blog/why-i-rebuilt-cyclejs/).

## Try it

```sh
npm create gyral@latest my-app -- --template ssr
```

Then follow [Getting started](/docs/getting-started/), browse the [examples](/examples/), or read
the source on [GitHub](https://github.com/gyraljs/gyral). Issues and pull requests are welcome.
