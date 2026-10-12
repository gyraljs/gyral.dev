---
title: 'Case study: moving sabacc.starwars.run from Lit to Gyral'
description: How a Three.js card game moved from Lit 3 to Gyral 0.3, what worked, the rough edges 0.3.1 fixed, and what it costs in bytes per page on Gyral 0.3.1.
date: 2026-10-12
author: Mike Zupper
---

<!-- Do not merge until github.com/mikezupper/sabacc is public: the post links to it. -->

# Case study: moving sabacc.starwars.run from Lit to Gyral

[sabacc.starwars.run](https://sabacc.starwars.run) is a browser version of Sabacc, the card game
from Star Wars: get your hand closest to ±23, survive the shift, take the pot. It has two views of
one game. The classic table is a static, crawlable page. The 3D table draws the same game with
[Three.js](https://threejs.org). You can play alone against the computer, or with friends at a
table a server runs. The rules live in a pure engine written with [Effect](https://effect.website).

Until 7 October 2026 its interface was built with [Lit](https://lit.dev) 3. Now it is built with
Gyral, on 0.3.1 from npm. This post covers why it moved, what worked, what didn't, what Gyral
changed in 0.3.1 as a result, and what the move cost in bytes.

Sabacc is my project too, so read this as a field report, not an independent review. The work
happened in the game's own repository, by the team building it, from packed Gyral tarballs, because
Gyral 0.3 wasn't on npm yet; since 11 October it installs 0.3.1 from npm. Their feedback came back
as a written report, which I triaged like any other. The numbers below were measured, and I
include the ones where Gyral comes out worse.

## Why they moved

Nothing was wrong with Lit here. The Lit version worked, and it was smaller. The move had two
reasons.

The first was Gyral itself. Gyral 0.3 had just replaced Lit with
[its own view layer](/blog/why-gyral-replaces-lit/), and the only apps on it were this site and a
demo store. Sabacc's migration plan put it plainly: "Sabacc becomes a real app that tests
Gyral 0.3." A game has things a docs site doesn't: a WebGL scene, a store fed by a WebSocket,
timers that pace the opponents' turns, and two pages sharing one set of components.

The second was fit. The game was already built the way Gyral wants an app built. The engine is
pure, every random number goes through a seeded service, and side effects run in one place, the
store. Gyral's pure reducers and effects as data carry that discipline into the interface.

They targeted 0.3 directly and kept the scope to the interface. The engine, the wire protocol, the
server and both stores (solo and multiplayer) didn't change, and an architecture lint keeps
`@gyral/*` imports out of those layers. The whole move landed on 7 October, from vendoring the 0.3.0
tarballs to running on a 0.3.1 prerelease. Across `src/` and the tests it touched 33 files (1,792
lines added, 1,055 removed). At the end, all 153 tests passed. Their scripted browser run played
the classic table, the 3D table, a shift and a multiplayer game, 29 runs in all, without a console
error. Its screenshots matched the Lit version in both themes, on desktop and phone.

## What worked

### The compiler, ESLint and the runtime agree

Gyral checks template rules in three places: the Vite compiler fails the build, the development
runtime throws on first render, and `@gyral/core/eslint` underlines the markup in the editor. All
three run the same rule set. Sabacc added ESLint with only Gyral's recommended config, next to its
own architecture lint, and checked that it caught `.value=` before going further. Their frontend
conventions now say:

> Template rules are checked three times: ESLint in the editor (`npm run lint:templates`), the
> runtime in dev and tests, and the compiler in `vite build` (a break fails the build).

This matters most during a migration. A developer coming from Lit writes `@click=${…}` and
`.value=${…}` out of habit, and each one is reported the same way, with its fix, wherever it first
shows up.

### provideDrivers made it incremental

The plan began with a spike: convert one component and stop for review. They picked
`<sabacc-controls>`, the betting and card buttons that both views share, because it had the most
closures. It became a Gyral component while both views were still Lit.

Gyral components reach the outside world through drivers, and `provideDrivers(element, drivers)`
binds drivers for everything under an element. So the Lit parent bound the game store to the Gyral
controls inside it. From sabacc's `src/components/sabacc-table.ts` at the spike commit (trimmed and
reformatted):

```ts
@customElement('sabacc-table')
export class SabaccTable extends SignalWatcher(LitElement) {
  // …
  override willUpdate(changed: PropertyValues<this>): void {
    if (this.store === undefined) return;
    // Gyral components below (the controls) reach this store through the table driver.
    if (changed.has('store')) {
      this.unprovide?.();
      this.unprovide = provideTable(this, this.store);
    }
    this.playback.sync(this.store.last.get());
  }
}
```

`provideTable` is their one-line wrapper around `provideDrivers`. The controls' outputs, such as
"skip ahead", reached the Lit parent as a DOM event (`@gyral-output=${this.onControls}`). From
there they converted the rest one component at a time. Today each page binds the store once,
before any component loads, and the browser tests bind a real store on a host element the same
way. There are no fake stores anywhere.

The cost: until Lit was removed, both view layers shipped. During the spike the shared chunk grew
by 13.1 KB gzipped. That is fine on a branch, but it's a reason not to linger halfway.

### Models tested without a DOM

A Gyral component's `spec` is plain data and functions, so `@gyral/testing` can step it like a
state machine. Commands are data too, so a test can check the move a button sends without a store,
a DOM or a fake. From sabacc's `test/unit/controls-model.test.ts` (trimmed and reformatted;
`moves` picks the game commands out of a step's command list):

```ts
it("sends each button's move to the table, and nothing else", () => {
  const s = { amount: MIN_BET };
  expect(moves(step(spec, s, { _tag: 'Deal' }, props()).commands)).toEqual([Command.StartHand()]);
  expect(moves(step(spec, s, { _tag: 'Fold' }, props()).commands)).toEqual([Command.Fold()]);
  expect(moves(step(spec, s, { _tag: 'Pass' }, props()).commands)).toEqual([Command.Pass()]);
});
```

In the Lit version, the opponents' turns were paced by a `setTimeout` inside a class that a Lit
reactive controller wrapped. Now the playback is a pure model, and its pauses are `@gyral/time`
delay commands, which tests run under fake timers. Model tests cover only the controls so far; the
tables are still tested in Chromium.

### An accurate migration guide

When the first 0.3.1 prerelease arrived, sabacc followed the upgrade notes and found them accurate.
Swapping the tarballs alone passed every check before any app change. Then they took up the new
options one by one. Later prereleases made 0.3.1's breaking changes, the one-time exception before
Gyral's API is locked. The one every app meets is `define`: `define<State, Msg>(tag, spec)` became
`define<State, Msg>()(tag, spec)`. I tried that build on a copy of their code first. The type
checker listed every call site, and the whole fix was 16 lines in 9 files. Every behavior change in
0.3.1 is listed, with who it affects and its fix, in [Migrating from 0.3.0 to
0.3.1](/docs/migrating-0-3-0-to-0-3-1/).

## The Three.js stage as a custom element

The 3D table is a WebGL scene with a render loop, textures and GPU buffers. It has to be torn down
when it leaves the page. In Lit, the 3D view's element owned it: it built the stage in
`firstUpdated` and disposed of it in `disconnectedCallback`.

The first Gyral version mounted the stage through a Gyral hook, a function the view attaches to an
element. Hooks in 0.3.0 had no cleanup, so the stage checked `isConnected` on every animation frame
to notice it had been removed. They reported this. I asked whether a custom element would work
instead of a hook, and their answer was yes, and cleaner. `<sabacc-stage>` is a plain custom
element with one property in and one DOM event out. From sabacc's `src/scene/sabacc-stage.ts`
(trimmed and reformatted):

```ts
export class SabaccStage extends HTMLElement {
  #view: StageView | undefined;
  #stage: Stage | undefined;

  set view(view: StageView | undefined) {
    this.#view = view;
    this.#draw();
  }

  connectedCallback(): void {
    this.#draw();
  }

  disconnectedCallback(): void {
    this.#stage?.dispose();
    this.#stage = undefined;
  }

  #tell(detail: StageEvent): void {
    this.dispatchEvent(new CustomEvent(STAGE_EVENT, { detail, bubbles: true }));
  }
  // #draw() builds the Three.js stage on first use and hands it the view.
}
```

The 3D view's template, in `src/scene/sabacc-3d.ts`, sets the property and names an intent for
the event (reformatted):

```ts
html`<sabacc-stage
  class="stage"
  role="img"
  aria-label="3D Sabacc table. Your moves and the table's state are in the panels."
  .view=${stage}
  data-intent=${i.Stage}
  data-intent-on="stage-event"
></sabacc-stage>`;
```

Picks, hovers and "this browser has no WebGL" arrive as one `Stage` message. The browser now tells
the stage about every connect and disconnect, so the per-frame check is gone. A new browser test
removes the 3D view and checks that the stage is torn down at once. The hook version noticed only
on the next frame.

That exchange changed Gyral's docs. They now lead with this pattern for
[widgets with a lifecycle](/docs/views/#widgets-with-a-lifecycle). Hooks gained teardown in 0.3.1
too, for small behaviours like a timer on one element: `defineHook({ client, dispose })`.

## Watching a store Gyral doesn't own

The game state stays in sabacc's store, and the store runs the engine. It has to: a move needs
Effect's seeded random service, and Gyral reducers are pure and synchronous. So Gyral handles only
the interface loop, and the store has to be watched from outside.

In 0.3.0 the store kept its values in TC39 signals through `signal-polyfill`, and the table driver
watched them. This is their `watch()` from `src/components/table-driver.ts`, as of the 0.3.0
migration (reformatted):

```ts
/** Emit a snapshot now and after every change to the store's signals, until aborted. */
const watch = (
  store: Store,
  signal: AbortSignal,
  emit: (s: TableSnapshot) => void,
): Promise<TableSnapshot> =>
  new Promise(() => {
    const current = new Signal.Computed(() => snapshotOf(store));
    const watcher = new Signal.subtle.Watcher(() => {
      // Signals can't be read inside the notification: read and re-arm in a microtask.
      queueMicrotask(() => {
        if (signal.aborted) return;
        watcher.watch();
        emit(current.get());
      });
    });
    watcher.watch(current);
    emit(current.get());
    signal.addEventListener('abort', () => watcher.unwatch(current), { once: true });
  });
```

It is a careful piece of code. A watcher's notification may not read signals, so it re-arms and
reads in a microtask. A move that sets several values in one task therefore arrives as one
snapshot. The promise never resolves, which keeps the command open while the component is
connected. The abort listener unwatches when Gyral cancels it.

Every app with state Gyral doesn't own writes some version of this, so 0.3.1 added
`subscription(name, (emit, ctx) => unsubscribe)`: a streaming driver that cleans up when its
component disconnects and ignores emits after that. A component asks for it in its
`subscriptions(state, props)`, also new in 0.3.1, so Gyral starts the watch when the component
connects and stops it when the component leaves. The recipes in
[State Gyral doesn't own](/docs/outside-state/), signals included, are based on this `watch()`.

Sabacc's current version uses it. They also replaced the signals with a small `Cell` of their own
(get, set and subscribe, about 30 lines), because nothing needed signals any more:

```ts
export const tableWatch = (store: Store): Driver<undefined, TableSnapshot> =>
  subscription<TableSnapshot>(WATCH, (emit) => {
    let queued = false;
    const changed = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        emit(snapshotOf(store));
      });
    };
    const unsubscribe = cellsOf(store).map((c) => c.subscribe(changed));
    emit(snapshotOf(store));
    return () => unsubscribe.forEach((off) => off());
  });
```

That excerpt is from `src/components/table-driver.ts` on sabacc's main branch, on Gyral 0.3.1,
reformatted. `subscription()` returns a driver, which `provideDrivers` binds under the page's
`<body>` behind a typed token from `defineDriver`. The
promise that never resolves, the abort listener and the `aborted` check are gone. A move now goes
from an intent to a reducer to a `play(move)` command, then `store.dispatch`, a cell change, a
microtask, one snapshot, and a `TableChanged` message back into every component watching.

## Rough edges, and how 0.3.1 fixed them

Their report listed what got in the way. Every row below was fixed after it, except the
`input.detail` docs fix, which another tester's report prompted.

| What they hit in 0.3.0                                                                                                                                         | What 0.3.1 does                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| A Lit parent could hear a Gyral child's outputs only through the event name `gyral-output`, which core didn't export.                                          | Exports `OUTPUT_EVENT` and its types, and [documents listening from other frameworks](/docs/other-frameworks/#outputs-the-gyral-output-event). |
| `emit()` wasn't checked against a component's outputs; they added `satisfies` by hand.                                                                         | `const emit = outputs<Out>()` types every output, at no run-time cost.                                                                         |
| Hooks had no cleanup, so the WebGL stage polled `isConnected`.                                                                                                 | The docs lead with a custom element for widgets with a lifecycle; `defineHook({ client, dispose })` covers small behaviours.                   |
| Object props needed a Standard Schema, and the docs didn't say whether a prop kept the object it was given. They wrote identity-preserving schemas to be safe. | `prop.value()` takes a plain type guard. The docs say a property set keeps the original object, and production builds drop the check.          |
| SVG fragments couldn't be templates of their own, so each card face drew every variant and hid the unused ones with `display="none"`.                          | The `svg` tag is back (about 85 B gzipped, only for apps that use it), with stricter checks inside `<svg>`.                                    |
| A click's messages passed through their store's microtask, so browser tests looped `await Promise.resolve()` twenty times before `settled()`.                  | `settled()` waits until messages stop arriving, however many microtasks the chain takes, and rejects if they never stop.                       |
| The docs said `input.detail` held only a child component's output, so the stage's intent parser read `event.detail` itself.                                    | The docs now say `detail` is set for every `CustomEvent`, and the stage's parser reads `detail`.                                               |
| A client-only app still carried the hydration loader and Vite's preload helper.                                                                                | `gyralVitePreset({ clientOnly: true })` leaves them out, and `delay` runs on a delay-only driver, so an app that only delays bundles no ticks. |

Two of these deserve a candid footnote. The prop concern never caused a bug: Gyral always kept the
object, and the docs simply didn't say so. And when I investigated the test loops, sabacc's tests
passed on 0.3.0 without them. But nothing promised that, so 0.3.1 made it the definition of
`settled()`.

`svg` is a reversal, too. Gyral 0.3.0 dropped `svg` templates on purpose, with a note that they
could return if a real app needed them. Sabacc's card faces were that app.

Measuring the client-only option turned up a bug of Gyral's own. The build scanned every module's
text to decide which optional features to bundle. A function named `raw` in Effect and the word
"states" in comments in Effect and Three.js kept two features in a bundle that never used them. That
cost 0.9 KB per page. The scan now reads only the app's own modules and packages that depend on
Gyral, with comments excluded. That was fixed before sabacc's first 0.3.1 build.

## What it cost: bytes per page

Every figure below is a page's JavaScript and CSS, compressed with gzip at level 9 (Node's zlib,
one file at a time) and summed over every file the page loads: its module script, its
modulepreload links and stylesheet, and their static imports. KB means 1,000 bytes. Both pages
are client-only. The 0.3.0 builds also contain Gyral's lazily loaded hydration and invoker
fallback chunks, which are left out because these pages never fetch them. For this post I
rebuilt every row from sabacc's history, each commit with its own `vite build`; the older rows
reproduce the numbers measured at the time to the byte.

| Build                                                                 | Classic page |  3D page |
| --------------------------------------------------------------------- | -----------: | -------: |
| Lit 3, Vite 7 (the original baseline)                                 |      84.5 KB | 239.3 KB |
| Lit 3, Vite 8 (the same bundler as every Gyral build)                 |      82.7 KB | 238.1 KB |
| Gyral 0.3.0, first complete migration                                 |      90.4 KB | 246.5 KB |
| Gyral 0.3.0, without `signal-polyfill` and the modulepreload polyfill |      88.0 KB | 244.0 KB |
| Gyral 0.3.1-next.1, client-only                                       |      86.1 KB | 242.2 KB |
| Gyral 0.3.1-next.6, the two-call `define` and the error channel       |      86.9 KB | 243.0 KB |
| Gyral 0.3.1 from npm (sabacc's main branch today)                     |      87.4 KB | 244.6 KB |

Against Lit on the same bundler, Gyral 0.3.1 costs **4.7 KB more on the classic page (+5.7%) and
6.5 KB more on the 3D page (+2.7%)**.

The first report said "+5.9 and +7.2 KB, mostly Effect". Both halves need correcting. That
baseline was a Vite 7 build, and the Gyral builds used Vite 8, which by itself made the Lit pages
1.2–1.7 KB smaller. On the same bundler, 0.3.0 cost 7.7 and 8.4 KB more: worse than first reported.
And Effect explains why the pages are big, not why they grew. Effect is 51.3 KB of the classic page,
about 60%, and it is byte-for-byte the same in every build. Three.js is 146.6 KB, about 60% of the
3D page.

The prereleases took the gap down to 3.4 and 4.1 KB, and the release gave part of that back. On
the classic page, next.6 added 0.8 KB, almost all of it Gyral's error channel, and the release
added another 0.5 KB, as sabacc moved its long-running watches into `subscriptions` and the room's
countdown onto `every`. The 3D page grew 1.2 KB more than that, in the 3D view's own code: a
responsive layout for the HUD and the name plates.

Where the classic page's bytes go, comparing the last Lit build with sabacc's main branch on
Gyral 0.3.1:

| Part                                                                       |  Lit | Gyral | Change |
| -------------------------------------------------------------------------- | ---: | ----: | -----: |
| Effect, the rules engine                                                   | 51.3 |  51.3 |      0 |
| The app's own code                                                         | 17.1 |  19.1 |   +2.0 |
| The app's stylesheet                                                       |  2.2 |   2.2 |      0 |
| Template text                                                              |  2.2 |   1.7 |   −0.5 |
| The framework: Lit and `@lit-labs/signals`, or Gyral's core, http and time |  6.8 |  12.6 |   +5.8 |
| `signal-polyfill`                                                          |  2.2 |     — |   −2.2 |
| Vite's modulepreload polyfill                                              |  0.3 |     — |   −0.3 |

The numbers are KB gzipped. To attribute them, I rebuilt each commit with source maps (the
output is identical once the `sourceMappingURL` comment is removed) and assigned every byte of the
shipped files to the source file it maps to. Template text is the static markup of the app's
templates: the literal strings of Lit's `html` and `svg` templates, and the markup strings of
Gyral's compiled templates. Each figure is what deleting exactly that part's bytes saves after
gzip. Gzip compresses across parts, so the figures overlap a little: the changes add up to 4.8 KB
against the measured 4.7.

Gyral's renderer, element base, props and scheduler come to 5.8 KB, about the same as lit-html,
`ReactiveElement` and `LitElement` together (6.0 KB). Gyral's component host, which holds the
state and runs the update loop, is 0.9 KB, against 0.7 KB for `@lit-labs/signals`. The rest is the
Model-View-Intent machinery sabacc chose to use:

- intents, 1.0 KB;
- commands and the driver runtime, 0.8 KB, and declarative subscriptions, 0.6 KB;
- `@gyral/http`, 0.7 KB for a single `POST`;
- `@gyral/time`, 0.6 KB for `delay` and `every`;
- one keyed list, 1.6 KB.

That keyed list is a single `each()` over at most a hand of card buttons. When they measured it,
rendering those buttons with `.map()` saved 1.3 KB, but rows are then matched by position, so after
a lock or a trade focus can land on a different card. They kept `each()`.

The app's own code grew by 2.0 KB. Effects as data means a driver for each browser effect, so
sabacc now has drivers for the page address, navigation, the clipboard and reduced motion (its
countdown clock was a driver too, until `every` replaced it). On the 3D page, the name plates and
pot labels became two small components.

Two savings in the table aren't Gyral's. Leaving Lit let them drop `signal-polyfill`, which
`@lit-labs/signals` needed, for the 30-line cell: 2.2 KB. A Lit app that never used signals
wouldn't have carried it. Turning off Vite's modulepreload polyfill saves 0.3 KB in any Vite app,
Lit included. Of the 4.3 KB the classic page lost between 0.3.0 and 0.3.1-next.1, those two account
for about 2.4 KB. Gyral 0.3.1 accounts for about 1.8 KB, through short error codes in production,
features bundled only when used, client-only builds and the scan fix.

Sabacc's owner accepted the size: there is no size budget in CI, and the engine stays on Effect.
Any large saving on these pages would come from the engine, not the interface.

### Other costs

- **A young framework.** Gyral went from 0.1 to 0.3 in three days, and sabacc ran on vendored
  prerelease tarballs until 0.3.1 reached npm on 11 October.
- **A one-time API break.** 0.3.1 changed the shape of `define` and removed or renamed a set of
  0.3.0 exports while Gyral is still pre-release. After 0.3.1, breaking changes wait for a minor
  version, with a migration note.
- **State that isn't JSON.** The game state holds Effect `Option` values. That is fine for a
  client-only page, but these components can't be server-rendered with hydration seeds as they
  are.

## What it means for other Lit apps

If your Lit app is client-only and small, don't expect Gyral to make it smaller. The renderer and
element are about Lit's size, and the intents, commands and drivers are extra. What you get for
those bytes is the architecture: views that only name intents, effects you can test as data, and
template mistakes caught before the code runs.

If you do move, sabacc's route is a good one:

- **Start with one leaf component.** Bind its drivers on the Lit parent with `provideDrivers`, and
  listen for its outputs as `OUTPUT_EVENT`. Then work upward, and don't stay halfway for long,
  because both view layers ship until the end.
- **Keep state you already have.** A `subscription()` can stream a store, signals or a socket into
  components. See [State Gyral doesn't own](/docs/outside-state/).
- **Give imperative widgets their own element.** One property in, events out, teardown in
  `disconnectedCallback`.
- **Turn on the linter first.** The rules that catch `@click` and `.value=` are the ones a Lit
  developer needs most.
- **Measure on the same bundler.** Set `clientOnly: true` if nothing is server-rendered.

## Try it

Play at [sabacc.starwars.run](https://sabacc.starwars.run). The source is at
[github.com/mikezupper/sabacc](https://github.com/mikezupper/sabacc).
Gyral's side of this story is in [Migrating from 0.3.0 to 0.3.1](/docs/migrating-0-3-0-to-0-3-1/).

Thanks to the sabacc team for a precise report, for letting me quote their code, and for reviewing
a draft of this post. Several of 0.3.1's changes started as a line in their report.
