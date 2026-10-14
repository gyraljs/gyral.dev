---
title: 'The Gyral demo shop: a fast store without a client-side app'
description: gyral-shop is a full department store built with Gyral, now live as a demo. How it keeps pages fast, what it measures, and where it still costs.
useWhen: you want to see how a whole Gyral app is put together, or why its server-rendered pages stay small and fast
date: 2026-10-13
author: Mike Zupper
---

# The Gyral demo shop: a fast store without a client-side app

[gyral-shop](https://github.com/gyraljs/gyral-shop) is a department store built with Gyral: a
catalog of about 700 products in eight departments, search, accounts, a cart, checkout with
shipping, tax and promo codes, order history, wish lists, reviews and an admin area. It is now
running at [demo-shop.gyral.dev](https://demo-shop.gyral.dev), so you can click through a whole
Gyral app instead of reading about one.

It exists to test Gyral on something realistic, not a toy. A store has the problems that make
web apps slow: long listings, personalised headers, a cart on every page, forms everywhere and
an admin screen full of tables. This post describes how the shop is built, why its pages stay
small, and what Gyral does to make that possible. The shop is my project, so read this as a
field report. Every number below was measured, and the method is under each table.

## Try it

Open [demo-shop.gyral.dev](https://demo-shop.gyral.dev). The store is real software with fake
money:

- **Payments are mocked.** The provider behaves like a real one (create an intent, confirm,
  capture, refund), and the card number decides the outcome: `4242 4242 4242 4242` succeeds,
  `4000 0000 0000 0002` is declined. Only the brand, last four digits and expiry are stored.
- **Mail is never sent.** Order confirmations and reset links are written to an outbox table.
- **Everything resets at night.** Once a night the server restores the seeded store in one
  SQLite transaction, so your orders, reviews and account are gone by morning.

Register an account, add something to the cart and check out with the test card. Then turn off
JavaScript in your browser and do it again: the catalog, search, cart, checkout and account
forms all still work.

The footer has a theme switcher. The shop has four themes, and they change only CSS: the
markup is the same in all of them, the way the CSS Zen Garden worked. The demo opens in
Marketplace, the densest one.

## One rendering mode per route

The shop doesn't pick one way to render. Each route uses the mode that fits its data:

| Mode                      | Routes                                                                              | Why                                                |
| ------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------- |
| Server-rendered per visit | Home, departments, listings, search, product pages, cart, checkout, account, orders | Live stock and prices, a personal header, SEO      |
| Prerendered at build      | About, FAQ, terms, privacy                                                          | The same for everyone, so they are files on disk   |
| Rendered in the browser   | The admin area, behind sign-in                                                      | A tool for staff; no crawler or first visit to win |

The server is [Hono](https://hono.dev) on Node, with Drizzle ORM over SQLite and
[valibot](https://valibot.dev) at every boundary. Gyral renders the pages with `renderPage`
from `@gyral/ssr` and serves the build with its `productionServer`. The three modes are one
codebase: the same components render on the server, prerender at build time and run in the
browser. See [Rendering modes](/docs/rendering-modes/) for how Gyral mixes them.

## Why the pages are fast

### The HTML is the page

Every storefront page arrives complete. The product grid, the prices, the filters and the buy
box are in the HTML the server sends, so the browser can paint them without running any
JavaScript. Page structure (header, listing, product sections, account pages) renders into
[light DOM](/docs/server-rendering/#light-dom-for-page-content), so it is plain HTML that
crawlers, reader modes and the themes' CSS all see. The small widgets, like the mini-cart, the
gallery and the buy box, use shadow DOM, written as declarative shadow roots so they paint
before their code loads too.

JavaScript makes the page interactive; it doesn't build it. I measured the largest contentful
paint (LCP) with JavaScript on and off, under the same throttling as the shop's own performance
check (below):

| Page     | LCP, JavaScript on | LCP, JavaScript off |
| -------- | -----------------: | ------------------: |
| Home     |           1,044 ms |              924 ms |
| Category |             988 ms |              792 ms |
| Product  |           1,012 ms |              816 ms |

_Median of three cold loads per page in Chromium, 1280×800, 4× CPU slowdown, 1.6 Mbps and
150 ms round trip, LCP read from the browser's performance timeline. Production build of the
shop on Gyral 0.3.4, served locally. Intel Core i5-10400 desktop with other work running (load
average 6 to 7), so treat the absolute times as rough; the comparison ran back to back._

With JavaScript off, LCP comes 120 to 200 ms sooner. The scripts don't block the first paint,
but they compete with the page for a slow connection and a slow CPU, so they aren't free.
That is why the next part matters.

### Each page loads only the components it rendered

A Gyral component is a custom element, so a page's HTML already says which components it needs.
The shop uses Gyral's
[automatic components](/docs/server-rendering/#loading-components-in-the-browser): the Vite
preset finds every `define()`d tag and builds a module for it, and when the server renders a
page, `renderPage({ components })` preloads exactly the modules of the components that page
rendered, plus a small loader. The client entry imports only what every page has: the header,
the mini-cart, the search box, the consent banner and the theme switcher.

So a page without a product gallery never downloads it, and nobody keeps a list of which page
needs what. The loader is 1.1 KiB gzip and only pages that need more than the entry fetch it.

| Page                | Scripts | JS (gzip) | HTML (gzip) |
| ------------------- | ------: | --------: | ----------: |
| About (prerendered) |      11 |  30.8 KiB |    12.8 KiB |
| Home                |      13 |  33.6 KiB |    16.5 KiB |
| Department          |      13 |  33.6 KiB |    14.5 KiB |
| Cart (empty)        |      15 |  35.8 KiB |    13.0 KiB |
| Category            |      18 |  42.6 KiB |    15.1 KiB |
| Product             |      20 |  42.5 KiB |    18.4 KiB |

_Production build on Gyral 0.3.4, seeded catalog, each page loaded cold in Chromium without
throttling. JS is every script the page fetched, each compressed on its own with gzip -9; HTML
is the document compressed the same way. The theme stylesheet adds 2.9 KiB gzip on every page.
The build emits 40 JavaScript files, 89.2 KiB gzip in all, so the heaviest storefront page loads
under half of the app._

Gyral's own runtime is 14.4 KiB of that, and the code that hydrates server-rendered components
another 2.9 KiB. The rest is the shop's components and the libraries they use.

The HTML is larger than you might expect, 68 to 113 KiB before compression, because the
document stylesheet is inline in every page. That trades bytes for one request fewer, and the
pages compress to 13 to 19 KiB.

### Each component hydrates on its own

There is no root app to boot. The document shell (skip links, main, footer) is server-only
and never hydrates; only the custom elements inside it do, and each one does so
when its module defines it, with the state the server rendered. Module order doesn't matter,
and a slow component doesn't hold up a fast one.

Components can also wait. The reviews section on a product page sets `hydrate: 'visible'`, so
its code runs when you scroll to it (see
[Lazy hydration](/docs/code-splitting/#lazy-hydration)).

### Content pages are files, personalised afterwards

About, FAQ, terms and privacy are prerendered at build time with `@gyral/ssr/static` and served
from disk with revalidation; their server time was about 1 ms. A prerendered page is the same
for everyone, so it can't contain your name or your cart. The header renders as if you were
signed out and, after it hydrates, asks `/api/me` who you are; the mini-cart loads your cart the same way.
In the shop's document shell that is one flag:

```ts
html`<shop-header
  .departments=${options.departments}
  .account=${options.account}
  ?personalize=${options.static === true}
></shop-header>`;
```

`/api/me` is never cached and never starts a session, so prerendered pages stay cacheable. See
[Static sites](/docs/static-sites/) for the prerendering side.

### Forms work first, then get better

Every form in the storefront is a real `<form>` that submits to the server. Filters and sorting
on a listing are a GET form, so every listing state is a URL that works without JavaScript and
renders on the server. With JavaScript, changing a filter fetches the new results and updates
the listing, the URL and the page's head in place, without a reload, and announces the result
count to screen readers.

Account and checkout forms validate in the browser with the same valibot schema the server uses:
the schema drives Gyral's `form()` intent in the component and `formAction()` on the server. A
form that passes in the browser is sent with `submitForm`; the server answers with a redirect,
or with a 422 whose field errors the component shows. Without JavaScript, the same route answers
the plain post. See [Forms](/docs/forms/#the-server-half).

This is a big part of why the storefront isn't a single-page app. Moving between pages is links
and forms, the server renders the next page, and components handle only what happens inside
one page. The listing uses Gyral's router only to keep its filters in the URL.

### The admin area is the exception, and pays for itself

The admin is a client-rendered app: a dashboard, product and order tables, promo codes, users
and reviews. It loads as one chunk of 19.2 KiB gzip, and storefront pages never request it. The
ten admin sections are mapped to that one module in the shop's `vite.components.ts`; left to
the automatic scan, each would be its own chunk, and the build measured about 12 KiB gzip
larger in total.

## Security without slowing the page

A strict security setup often fights performance, for example when inline scripts need nonces
and so every page must be rendered per request. The shop doesn't have that conflict:

- **A strict Content Security Policy.** `script-src 'self'` with no inline scripts at all:
  Gyral writes each component's hydration state as data that the browser never executes. Styles
  are allowed by their SHA-256 hashes, which `renderPage` computes when it renders the page, so
  `style-src` has no `'unsafe-inline'` either. Prerendered files get the same headers. See
  [A strict Content Security Policy](/docs/security/#a-strict-content-security-policy).
- **CSRF tokens** on every state-changing form and request, as a hidden field or an
  `x-csrf-token` header, plus a same-origin check, with `SameSite=Lax` session cookies as a second
  layer. See [Form requests and CSRF](/docs/security/#form-requests-and-csrf).
- **Rate limits** on sign-in, registration, password reset, the contact form and the order lookup,
  keyed by the client's address and by account.
- **Sessions only when needed.** Browsing doesn't start a session; adding to the cart or posting a
  form does, so bots don't fill the sessions table.

Each rule in the shop's security model has a test that proves it, and the shop's test suite runs
the whole shopping journey, from browsing to checkout and an order lookup, with JavaScript
disabled.

## Why Gyral makes this possible

None of these techniques is new. What Gyral changes is how much work each one takes:

- **Components are standard custom elements**, so the HTML itself names what a page needs. That is
  what lets the server preload exactly the right modules and lets each component hydrate alone.
- **Views are pure functions of state**, so the same component renders on the server, at build
  time and in the browser, and the browser picks up the server's markup in place instead of
  redrawing it.
- **Effects are data.** A component's update returns commands that drivers run, such as an HTTP
  request or a navigation. The shop provides one HTTP driver for the whole page that adds the
  CSRF token, so the checkout steps and review votes send requests without handling it.
- **Templates are compiled at build time and checked** against Gyral's template rules, by the
  compiler, by ESLint in the editor and by the development runtime.
- **The server side is part of the framework**: `renderPage` with streaming, CSP hashes and
  preloads; `prerender` for static pages; `formAction` for posts; a production server and a Node
  adapter.

## What Gyral 0.3.4 fixed for it

Until 0.3.4, `renderPage` could link the same module twice. The components loader imports the
client entry, so the preload list for automatic components repeated the entry's modules, and the
links written after the body duplicated the ones in the head. Built on 0.3.3 without a
workaround, the product page carried 30 `modulepreload` links for 19 modules. The browser fetched
each module once either way, but the markup was wrong, and the shop carried a small function to
filter the list.

0.3.4 writes each module once on every render path, so the shop dropped its workaround: the
product page has 19 links for 19 modules, and the scripts it loads didn't change by a byte. See
the [SSR changelog](https://github.com/gyraljs/gyral/blob/main/packages/ssr/CHANGELOG.md).

## The shop's own performance check

The shop has a performance budget in its repository: `pnpm perf` builds the app, seeds a
throwaway database, starts the production server and loads the home page, a category listing and
a product page cold in Chromium, three times each, with 4× CPU slowdown and 1.6 Mbps, 150 ms
network throttling. It fails above 2.5 s LCP, 0.1 CLS, or 10% more JavaScript than the recorded
baseline.

| Page     | LCP (median) |   CLS | JavaScript (gzip) |
| -------- | -----------: | ----: | ----------------: |
| Home     |     1,172 ms | 0.000 |          33.6 KiB |
| Category |     1,036 ms | 0.000 |          42.6 KiB |
| Product  |     1,092 ms | 0.000 |          42.5 KiB |

_One run of `pnpm perf --no-build` on the build above, on the same loaded desktop. A second run
gave 1,020 to 1,144 ms. The shop's recorded baseline, taken on a quieter machine, has LCP of 788
to 816 ms; the JavaScript sizes match it exactly._

No layout shifts on any of the three pages: the server sends the final layout, and hydration
doesn't change it.

## What it costs

A showcase that hides its costs isn't much of a showcase, so here they are:

- **One process, one SQLite file.** Rate limits live in memory and writes go through one lock, so
  the demo runs exactly one container. More replicas would need shared rate limits and a different
  database setup.
- **The server runs TypeScript through tsx**, even in production. It avoids a second build of the
  server, at the cost of a few seconds of compilation on the first start and about 12 MB in the
  image.
- **Some components are invisible to the automatic scan.** The shop's member forms are made by a
  helper, so `vite.components.ts` lists their tags by hand.
- **The scripts still cost something.** As the first table shows, a throttled page reaches LCP
  sooner without them. Server rendering keeps them off the critical path, but every byte still
  has to travel.

## Read the source

The code is at [github.com/gyraljs/gyral-shop](https://github.com/gyraljs/gyral-shop), MIT
licensed. Start with `ARCHITECTURE.md` for the layers and the rendering mode of each route, and
the design docs for the decisions: the stack, the security model with its test checklist, the
theme contract, and the deployment. Or open [the demo](https://demo-shop.gyral.dev) and view
the source of any page.

To build the same way, start with [Server rendering](/docs/server-rendering/),
[Code-splitting and lazy loading](/docs/code-splitting/), [Forms](/docs/forms/) and
[Security](/docs/security/).
