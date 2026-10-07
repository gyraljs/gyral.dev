---
title: Why Gyral 0.3 replaces Lit with its own view layer
description: Gyral 0.3 renders with a view layer built only for Model-View-Intent. Why I moved off Lit, how the new design works, and what the benchmarks measured.
date: 2026-10-10
author: Mike Zupper
---

# Why Gyral 0.3 replaces Lit with its own view layer

Gyral 0.3.0 is out, and its biggest change is one you will barely see in your components: Gyral
no longer renders with [Lit](https://lit.dev). Templates, server rendering and hydration now come
from a view layer written for Gyral alone. `define()`, intents, reducers, commands, stores, forms
and the router work as they did in 0.2.

This post explains why I made that change, what the new view layer does differently, and what it
measured, including the places where Gyral is still behind.

## Why Gyral started on Lit

A Gyral component is a Model-View-Intent spec compiled into a custom element. The view is a pure
function of state that _names_ intents in markup, `data-intent=${i.Increment}`, and core delegates
the events and parses each one into a typed message. Pure reducers turn messages into new state.
Effects are data: a reducer returns commands next to the new state, and drivers run them.

For the view, Lit was the obvious choice. Its templates update only the parts that change, without
a virtual DOM. It had server rendering and hydration. It is built on web standards by people who
know the platform deeply. Building on it let me spend my time on what made Gyral different, and I
would make the same choice again for a first version.

## A thin slice of Lit, and a long list of workarounds

Before deciding anything, I counted. Across every tagged template in Gyral's examples,
[gyral-shop](https://github.com/gyraljs/gyral-shop), this site and the devtools, Gyral used text
and attribute holes, `?bool`, `.prop`, `nothing` to remove attributes (about 280 uses) and
`repeat` (35). It never used `@event` bindings, because events go through `data-intent`. It never
used `classMap`, `ref`, `until`, async directives, controllers, decorators or attribute
converters, and no app subclassed `LitElement`.

Yet much of Gyral's hardest code existed to fit around Lit:

- **Light-DOM server rendering** needed a filter over the SSR stream and hidden markers, because
  page components render without a shadow root.
- **Hydration bugs that appeared only in production.** Hydration support depended on the order in
  which a bundler evaluated modules, and on private fields that minifiers mangled. Development
  builds and every test were clean; production builds rendered components twice.
- **`checked="false"`.** Lit's server rendering writes a property binding as an attribute, so
  `.checked=${false}` became `checked="false"`, and any `checked` attribute ticks the box.
  gyral-shop once shipped every no-JavaScript filter checkbox pre-ticked. Gyral added
  `liveBoolean` and a lint rule banning the plain form.
- **No bindings inside `<textarea>`**, so Gyral had a `textarea()` helper.
- **Empty text parts** couldn't hydrate, so text bindings had to render `nothing` instead of `''`.
- **`defer-hydration`** needed handling both with and without Lit's patch loaded.
- **A comment leak in `repeat()`** in lit-html 3.3.1 and later meant every Gyral app pinned
  lit-html to 3.3.0.
- **Whitespace minification** ran at runtime, in a wrapper around the template tag, at a cost of
  1.1 KiB.
- **`aria-invalid` was written twice**, because element directives don't run on the server.

None of this makes Lit a bad choice in general. It is a general-purpose library, and it does that
job well. Gyral needs a narrow subset of it, plus things a general library has no reason to offer:
one spelling for form state, list rows that can be skipped because state is immutable, hydration
driven by each component's own seed. Every gap between the two became Gyral code to maintain.

Size told the same story. Lit as Gyral 0.2.0 used it, hydration included, was 10.1 KB gzipped:
35% of the JavaScript in the counter example and on gyral.dev. Gyral 0.2.0's smallest app was
11.9 KiB gzipped; the same app in plain Lit was 5.8 KiB. Profiling showed that Gyral's own code cost
about 1 ms per benchmark operation, so the gap to Svelte and Solid was DOM work: four comment
markers per table row, whitespace text nodes, template preparation and update scheduling.

## What I built instead

The [decision record](https://github.com/gyraljs/gyral/blob/main/docs/design-docs/0018-view-layer.md)
sets the priorities in order: correctness, speed, bundle size. The new layer is not a
general-purpose renderer and won't grow general-purpose features. Each part has a
[spec](https://github.com/gyraljs/gyral/tree/main/docs/design-docs/view), written and reviewed
before any code.

### One normalizer, so server and client can't disagree

The normalizer is one pure function from a template's static strings to a template object: the
whitespace minified, the markup parsed into a tree, a table of the template's holes, an id. The
Vite compiler runs it at build time, the browser runs it when there is no build step, and the
server runs it to render. Because all three run the same function, they can't disagree about a
template's structure, and whitespace minification no longer costs anything at runtime in compiled
builds.

### Mistakes caught before the code runs

Templates are static, so they can be checked before anything renders. One rule set runs in three
places: `vite build` fails with a code frame, the development runtime throws on a
template's first render, and `@gyral/core/eslint` underlines the markup in your editor. Every
message says what to write instead:

```text
[gyral template rule 4] .checked=${…} on <input> binds form state as a property, which never
reaches the server and has a second spelling. Write ?checked=${…} instead: Gyral keeps it live
(view/02-bindings.md, "Live form state").
```

The rules also catch event bindings, holes inside `<script>` or comments, self-closing custom
elements, and markup the HTML parser would quietly repair, such as a `<tr>` directly inside a
`<table>`. With Lit, most of these showed up at runtime, and some only during server rendering.
[Views](/docs/views/#checked-before-it-runs) covers the rules and the ESLint setup.

### No event bindings, one spelling for form state

Gyral views never attach listeners, so the view layer has no event bindings at all; `@click` is a
build error that points you to `data-intent`.

Form state has one spelling, the same on the server and in the browser, and a control is written
only when the model's value for it changes. A re-render for any other reason leaves what the user
typed alone, and hydration never overwrites edits made before scripts ran. The same fields in 0.2
and 0.3:

```text
// Gyral 0.2
html`<input name="name" .value=${live(s.name)} />
  <input type="checkbox" name="agree" ?checked=${liveBoolean(s.agree)} />
  ${textarea({ value: s.note, attrs: { name: 'note' } })}
  <a href=${s.link ?? nothing}>Read more</a>`;
```

```ts
// Gyral 0.3
html`<input name="name" value=${s.name} />
  <input type="checkbox" name="agree" ?checked=${s.agree} />
  <textarea name="note">${s.note}</textarea>
  <a href=${s.link}>Read more</a>`;
```

`null` and `undefined` remove an attribute, so `?? nothing` goes too. More in
[Form state](/docs/views/#form-state).

### Lists that skip rows safely

`each(items, key, row, pick?)` replaces `repeat` and `keyed`. A row re-renders only when its item
or the result of `pick` changes. That is safe because Gyral's state is immutable: an unchanged
item is the same object. It does require rows to be pure, reading only their arguments and
module-level values, so two guards enforce it: an ESLint rule, and a development check that
renders rows anyway and warns when the output differs from what is on the page.

```ts
const i = intents<Msg>();

const Row = (t: Todo, selected: boolean) =>
  html`<li class=${selected ? 'selected' : ''}>
    <button type="button" value=${t.id} data-intent=${i.Pick}>${t.text}</button>
  </li>`;

// In the view, the selection reaches the row through pick:
each(
  s.todos,
  (t) => t.id,
  Row,
  (t) => t.id === s.selected,
);
```

If `Row` read `s.selected` directly, the editor would say: "`row` reads `s.selected`; return it
from `pick` and take it as the second argument." Rows with one root element need no markers, so
the benchmark table has no comment nodes per row, where 0.2 had four. See
[Lists](/docs/views/#lists).

### One scheduler, and a gap that wasn't Gyral's

Every component renders through one global scheduler. Reducers run at once, so `el.state` is
always current; rendering waits for a microtask and goes parents first. A test awaits `settled()`
once instead of awaiting `updateComplete` on each element, a change made at about 270 test
sites.

Before settling on the microtask flush, I wanted to know where select row's extra time came from:
13–18 ms of it wasn't script. A short experiment traced every sample, and the answer was frame
alignment. The page is quiet before the click, so Chrome has stopped producing frames, and the next
one starts 14–16.7 ms after the input. Gyral's work was finished about 3 ms after the click handler
started, in every sample, before that frame. No flush timing can shorten that wait; a later flush
only misses the frame. The microtask flush stayed, and an opt-in `renderOnFrame` was added for
bursty sources.

### Props parsed through Standard Schema

Props are declared with `prop.*` builders over [Standard Schema](https://standardschema.dev).
Attribute values are always parsed and validated, and an invalid value is logged and treated as
missing, so a view never sees a malformed prop.

### Server rendering without a fake DOM

`@gyral/core/server` renders straight from component specs: it runs `init` and the view and
writes strings, with no DOM shim, on any JavaScript runtime. Light DOM and Declarative Shadow DOM
are both native outputs, so the stream filter and hidden markers are gone. A 1,000-row benchmark
table renders in 1.3 ms, including UTF-8 encoding, against 24–28 ms with 0.2's Lit-based server
rendering.

### Hydration, one component at a time

Hydration walks the template and the server's DOM side by side, so it always knows what comes
next and creates only what it must. Each component hydrates on its own, from its own seed (the
state the server rendered), whether its parent has hydrated or not, so module order can't break
it. In development, a mismatch throws `HydrationMismatch` with the tag, the template location,
the DOM path, and what was expected and found. In production, only that component re-renders,
with a warning.

The hydration code is a lazily loaded chunk: client-only pages never fetch it, and server-rendered
pages preload it. Islands (`hydrate: 'idle' | 'visible' | 'interaction'`) can sit anywhere,
including inside other components. See
[Hydration and the client entry](/docs/server-rendering/#hydration-and-the-client-entry).

### Strict CSP, and the platform first

In the browser, a component's styles are one shared `CSSStyleSheet`; on the server they are
`<style>` elements inside the declarative shadow root, allowed by hash. So `style-src` needs no
`'unsafe-inline'`, and `renderPage({ csp })` builds the header when the page renders
([Content-Security-Policy](/docs/server-rendering/#content-security-policy)).

The view layer is native-first: each module's spec names the browser primitive it uses, or why
none fits. Where a primitive isn't widely available yet, its fallback is tiered by cost: none if
the feature degrades on its own, a few inline lines if it is trivial, otherwise an internal module
loaded with `import()` only when the browser needs it. Fallbacks never patch globals, and each has
a removal date: the invoker-commands shim is due to go on 2028-06-12, when that feature becomes
Baseline widely available.

### A clean room

I wanted a view layer designed from Gyral's needs and the platform specs, not adapted from Lit. So
the specs came first. The implementation worked only from them, the ADRs, the WHATWG and W3C specs
and MDN; nobody opened Lit's source, or another renderer's, while writing it. Tests were written
from the specs rather than ported, algorithms were chosen by benchmark, and a provenance script
fails the build if Lit's identifiers or markers appear in Gyral's source.

## What it measured

The numbers below come from a full run of the
[Gyral benchmarks](https://github.com/gyraljs/benchmarks) on 2026-10-07
([notes](https://github.com/gyraljs/benchmarks/blob/main/results/2026-10-07-full/NOTES.md)): a
keyed table app in the style of js-framework-benchmark, 15 samples per operation after 5 warm-ups,
CPU throttled 4×, in headless Chromium 153. Gyral 0.3.0's release packages were measured in the
same run as Gyral 0.2.0, Lit, Solid, Svelte, Vue, Preact and React, and frameworks are compared
only within that run.

| Framework   | Geometric mean vs fastest |
| ----------- | ------------------------: |
| Gyral 0.3.0 |                      1.03 |
| Svelte      |                      1.07 |
| Solid       |                      1.08 |
| Vue         |                      1.20 |
| Gyral 0.2.0 |                      1.21 |
| Lit         |                      1.31 |
| Preact      |                      1.38 |
| React       |                      1.55 |

No operation is slower than with 0.2.0. Against 0.2.0, median times:

| Operation             | 0.2.0 (ms) | 0.3.0 (ms) | Change                |
| --------------------- | ---------: | ---------: | --------------------- |
| create 1,000 rows     |      229.6 |      222.0 | −3.3%                 |
| replace 1,000 rows    |      268.2 |      254.9 | −5.0% (within noise)  |
| update every 10th row |       74.2 |       71.4 | −3.8%                 |
| swap rows             |       35.3 |       30.3 | −14.2%                |
| remove row            |       48.5 |       45.7 | −5.9% (within noise)  |
| create 10,000 rows    |     2427.2 |     2311.8 | −4.8%                 |
| append 1,000 rows     |      305.7 |      285.0 | −6.8%                 |
| clear 1,000 rows      |       28.9 |       21.7 | −24.9%                |
| select row            |       17.3 |        8.8 | frame-aligned (below) |

Script time is lower on every operation: creating 10,000 rows spends 343 ms in script, down from
428 ms. Of all eight frameworks, Gyral 0.3.0 is fastest at updating every 10th row, removing a row
and clearing the table.

Don't read select row as a 49% speedup. It is the frame alignment described above: every
framework's samples fall near 7–10 ms or near 15–20 ms, depending on whether a frame was already
due, and which mode a framework lands in moves between runs. The comparable part is script time,
2.8 ms in 0.2.0 and 1.8 ms in 0.3.0. Leave select out, and Svelte (1.02) edges ahead of Gyral
0.3.0 (1.03).

**Size.** The smallest benchmark app's entry chunk is 8.6 KiB gzipped, against 11.9 KiB for the
whole 0.2.0 app. Counting the two lazily loaded chunks as well, the hydration code and the
invoker-commands shim that client-only pages never fetch, it is 11.6 KiB. Entry chunks alone,
every benchmark app is 2.1–3.7 KiB smaller than with 0.2.0. Besides moving hydration into its own
chunk, two changes in the
[decision record](https://github.com/gyraljs/gyral/blob/main/docs/design-docs/0018-view-layer.md)
did most of the work. Each feature (`each`, hooks, commands, stores, prop builders) registers
itself when its API is first called, so an app ships only what it uses. And production builds
leave out template ids, which were about a fifth of the compiled templates' gzipped size.

**Memory and startup.** The JavaScript heap after load is 1.18 MB, down from 1.26 MB. The todo
app, on a cold cache over a throttled network, is interactive at 423 ms instead of 443 ms.

### Two real applications

[gyral-shop](https://github.com/gyraljs/gyral-shop) is a full department store: catalog, cart,
checkout, accounts and an admin area. Its server rendering is 2.6–3.7× faster: a category page went
from 12.1 to 3.3 ms, a product page from 15.9 to 6.1 ms, and the home page from 24.8 to 7.9 ms. Its
entry chunk went from 10.2 to 7.9 KiB gzipped, and every page downloads less JavaScript, 1–2.3 KiB
less per page. All chunks together grew, from 83.1 to 89.8 KiB, because precompiled templates carry
their hole tables and hydration is its own chunk, but no page loads them all. Route preloads, new in
0.3's `@gyral/ssr`, define each page's lazily loaded component 80–310 ms sooner: the product page's
buy box went from 827 to 698 ms on a 10 Mbps connection. The shop now runs a strict CSP with hashed
styles and no `'unsafe-inline'`.

On gyral.dev, the island entry went from 17.6 KB to 14.1 KB gzipped, plus a 2.9 KB hydration chunk
that the two pages with islands preload. Docs pages still ship no framework JavaScript, and they
are about 67 bytes lighter now that their server-rendered shells carry no anchor comments. The
site's CSP allows styles only from its own origin or by hash, without `'unsafe-inline'`.

## What you no longer write

The migration removed code more often than it added any:

- `?? nothing` to drop an attribute: 25 places in gyral-shop.
- `live`, `liveBoolean` and `textarea()`, and the lint rule that enforced them.
- The shop's `lit/static-html` workaround for a textarea in its member form.
- The duplicate `aria-invalid` attributes: `invalid()` is now a hook with a server half.
- The lit-html version pin in every app.
- `import '@gyral/ssr/hydrate'`, and the rule that it had to come first.
- `await el.updateComplete` for each element; one `await settled()` covers them all.

You gain template mistakes caught at build time and in your editor, islands anywhere in the page,
and form edits that are kept by default.

## What didn't get better

**Size is still Gyral's weak point.** The smallest app is 8.6 KiB for its entry chunk, while the
same app ships 5.8 KiB with Lit, 4.7 with Preact and 3.7 with Solid. My target was 8 KiB or less,
and 0.3.0 doesn't meet it. Counting every chunk, the search and table benchmark apps are slightly
larger than with 0.2.0, by 1.0 and 0.2 KiB.

**Speed has rivals.** Svelte is faster than Gyral 0.3.0 on five of the nine operations: create,
replace, swap, create 10,000 and append. And the todo app becomes interactive 16–18 ms later than
with Lit or Solid, and 27 ms later than with Preact.

## What's next

Next is a native-first audit of the rest of Gyral: the rule the view layer follows, applied to
everything else. The other remaining work is internal and shouldn't change your code.

## Try it

Start a new app:

```sh
npm create gyral@latest my-app -- --template ssr
```

Upgrading a 0.2 app? [Migrating from 0.2 to 0.3](/docs/migrating-0-2-to-0-3/) walks through it in
order, and the ESLint plugin lists most of the templates that need a change. The benchmark apps,
method and raw results are in the [benchmarks repository](https://github.com/gyraljs/benchmarks).
If you find a template the compiler rejects and shouldn't, or a page that hydrates wrongly,
please open an [issue](https://github.com/gyraljs/gyral/issues).
