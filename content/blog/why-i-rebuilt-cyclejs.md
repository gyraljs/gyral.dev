---
title: Why I rebuilt Cycle.js on web components
description: What Cycle.js got right, what made it hard, and the decisions behind Gyral, its successor in spirit built on custom elements, Lit and plain messages.
date: 2026-10-05
author: Mike Zupper
---

# Why I rebuilt Cycle.js on web components

[Cycle.js](https://cycle.js.org) had one of the clearest ideas in front-end development: your
application is a pure function. It receives what happened in the world, returns what should
happen next, and drivers at the edges do the actual work. Everything in between is testable
without a browser.

Gyral is my attempt to keep that idea and drop what made Cycle.js hard to adopt. This post is
about the decisions behind it. Each one is written up in full in the
[decision records](https://github.com/gyraljs/gyral/tree/main/docs/design-docs) in Gyral's
repository.

## What Cycle.js got right

Before writing any code, I studied the Cycle.js monorepo: `run`, `dom`, `isolate`, `state`,
`http`, `history`, `time`, `html` and the rest. Five ideas were worth keeping:

- **`main(sources) → sinks`**: a pure app, with effects in drivers.
- **Model-View-Intent**, three separate concerns.
- **Effects as data**: a request is a description, not a call.
- **Fractal components**: every component is a small app.
- **Deterministic async tests**, with virtual time.

## What made it hard

Most of the friction came from one choice: **streams for everything**. Events were streams,
state was a stream, and the view was a stream of virtual DOM. Streams are powerful, but they
make a steep learning curve, and they blur the line between "something happened" and "this is
the state now". Supporting xstream, RxJS and most.js through adapters tripled the API surface.

Other costs followed from it:

- **Intent selected DOM nodes by CSS class**: `DOM.select('.increment').events('click')`. It
  was stringly typed. A renamed class broke the app silently.
- **`isolate()`**, needed to keep a component's selectors from matching its neighbours, was the
  most complex part of the codebase.
- **The virtual DOM** diffed on every render.
- **Server rendering** had little support, and **components only worked inside Cycle.js**.

## What changed in the browser

Meanwhile, the platform caught up with much of what frameworks used to provide. Custom elements
and Shadow DOM give every component its own element and its own isolated tree. Declarative
Shadow DOM lets a server send that tree as HTML. [Lit](https://lit.dev) templates update only the
parts that change, without a virtual DOM. CSS gained custom properties, cascade layers,
container queries and `:user-invalid`. And [Standard Schema](https://standardschema.dev) gave
validation libraries one interface.

Rebuilding Cycle's idea on top of that meant much less framework.

## The decisions

**Messages, not streams.** A Gyral component's state changes through reducers: one pure
function per message, `(state, message) → next state`. That is the Elm architecture's shape,
and it's far easier to explain than `fold` over a merged stream. Effects are still data: a
reducer returns commands next to the new state.

**Parsed intent, not selectors.** I considered three alternatives: classic MVI with selector
strings, Elm-style `send()` closures in the view, and signals. The first keeps the strings,
the second lets intent leak into the view, and the third gives up a pure, testable core. Gyral's
view _names_ an intent in markup, `data-intent=${i.Increment}`, and a separate parser turns the
event into a typed message. The names are checked by TypeScript, and the view stays a pure
function with no closures in it.

**Shadow DOM instead of `isolate()`.** A component only sees intents in its own shadow root, so
isolation comes free from the platform.

**Commands carry their own answers.** In Cycle.js, a response came back on a driver source that
you selected by category. In Gyral, the command that asks for work also says which message the
answer becomes, through `onSuccess` and `onFailure` mappers. The request and its handling sit
side by side, typed end to end. Concurrency, which in a stream library means choosing between
`switchMap`, `mergeMap` and friends, became a named policy per lane.

**Effect inside, plain TypeScript outside.** Running commands well needs structured
concurrency: cancellation when a component disappears, retries, interruption when a newer
search starts. [Effect](https://effect.website) does that very well, but I didn't want Gyral's
users to have to learn it. So Effect lives in a private part of `@gyral/core`, a lint rule keeps
it there, and a build check fails if the published types ever mention it.

**The server is part of the design.** Server rendering was designed in rather than added on.
Commands never run on the server; route handlers do the async work and pass data as props.
Each server-rendered element carries its state, and the browser resumes from it and starts the
component's subscriptions only after hydration, so the first client render always matches the
server's. Forms validate with the same schema on both sides and render the same errors.

## Proving it

Two things kept these decisions honest.

The first is the **Cycle.js examples**. Gyral's acceptance suite is a port of them: hello world,
the counter, the BMI calculators, HTTP search, autocomplete, nested folders, routing, the
isomorphic app. Each one has tests, and comparing the two versions side by side is the quickest
way to see what changed. They're all on the [examples page](/examples/).

The second is **[gyral-shop](https://github.com/gyraljs/gyral-shop)**, a complete department
store built only with Gyral's public API. It found real problems. One example: its production
build rendered every server-rendered component twice, while development builds and every test
were clean. The cause was the order in which a bundler evaluated modules, which left Lit's
hydration support unpatched. The fix made Gyral hydrate its own components without depending on
that order, and a new test now builds the examples for production and checks every page hydrates
in place. Without a real application, that bug would have shipped.

## Thanks

Gyral exists because Cycle.js showed the way. Thank you to André Staltz and the Cycle.js
contributors for an idea that was worth carrying forward. Gyral is a new implementation, and
its `NOTICE` file credits Cycle.js under its MIT licence.

If you used Cycle.js, I'd like to hear how Gyral compares for you.
[Coming from Cycle.js](/docs/coming-from-cyclejs/) maps the concepts one to one, and the
[issue tracker](https://github.com/gyraljs/gyral/issues) is open.
