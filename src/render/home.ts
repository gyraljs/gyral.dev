// The home page. Static except for one island, the live counter, which is server-rendered
// with Declarative Shadow DOM and hydrated by the client entry.
import { html, raw, type ChildValue } from '@gyral/core';
import { loadDemos } from '../content/demos.js';
import { highlight } from '../content/markdown.js';
import { DEMOS_PATH } from './demos.js';
import { DESCRIPTION, LINKS, ORIGIN, SITE_NAME, TAGLINE } from '../site.js';
import type { PageMeta } from './layout.js';
import '../islands/loop-counter.js'; // registers <gd-loop-counter> for server rendering

const COUNTER_SOURCE = `
import { define, html } from '@gyral/core';

type Msg = { _tag: 'Increment' } | { _tag: 'Decrement' };

define<{ count: number }, Msg>('my-counter', {
  init: () => ({ count: 0 }),
  // Intent: parse platform events into typed messages.
  intent: {
    Increment: () => ({ _tag: 'Increment' }),
    Decrement: () => ({ _tag: 'Decrement' }),
  },
  // Model: one pure reducer per message, exhaustive by type.
  update: {
    Increment: (s) => ({ count: s.count + 1 }),
    Decrement: (s) => ({ count: s.count - 1 }),
  },
  // View: a pure template that names intents. No closures.
  view: (s, i) => html\`
    <button type="button" data-intent=\${i.Decrement}>−</button>
    <output>\${s.count}</output>
    <button type="button" data-intent=\${i.Increment}>+</button>
  \`,
});`;

const TEST_SOURCE = `
import { run, step } from '@gyral/testing';
import { Counter } from './counter.js';

// No DOM, no mocks: the model is a function.
const inc = { _tag: 'Increment' } as const;

step(Counter.spec, { count: 1 }, inc).state;
// → { count: 2 }

run(Counter.spec, [inc, inc, inc]).state;
// → { count: 3 }`;

const INSTALL = 'pnpm add @gyral/core lit';

interface Feature {
  readonly title: string;
  readonly body: string;
}

const FEATURES: readonly Feature[] = [
  {
    title: 'Standard web components',
    body: 'Every Gyral component is a custom element. Use it in any page, any framework, or none. Raw Lit elements live alongside.',
  },
  {
    title: 'Typed, exhaustive updates',
    body: 'Messages are tagged unions. Forget a case and TypeScript tells you, before a user does.',
  },
  {
    title: 'Server rendering that hydrates in place',
    body: 'Pages render on the server with Declarative Shadow DOM and wake up in the browser without re-rendering.',
  },
  {
    title: 'Forms on the platform',
    body: 'Real <form> elements, native validation, Standard Schema parsing, and forms that work before JavaScript loads.',
  },
  {
    title: 'Effects are data',
    body: 'Update returns commands; drivers run them. HTTP, routing, time and storage stay at the edges, and tests need no mocks.',
  },
  {
    title: 'No streams to learn',
    body: 'The Cycle.js loop, without the stream library. Plain functions, plain TypeScript, Promises where you need async.',
  },
];

const THEMES = [
  { id: 'default', label: 'Gyral Goods', note: 'the house style' },
  { id: 'marketplace', label: 'Marketplace', note: 'dense and fast' },
  { id: 'supercenter', label: 'Supercenter', note: 'bold and friendly' },
  { id: 'boutique', label: 'Boutique', note: 'quiet and editorial' },
] as const;

export const homeMeta: PageMeta = {
  path: '/',
  title: `${SITE_NAME}: Model-View-Intent web components`,
  description: DESCRIPTION,
  islands: true,
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: `${ORIGIN}/`,
      description: DESCRIPTION,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareSourceCode',
      name: SITE_NAME,
      description: TAGLINE,
      codeRepository: LINKS.github,
      programmingLanguage: 'TypeScript',
      license: 'https://opensource.org/license/mit',
      author: { '@type': 'Person', name: 'Mike Zupper' },
    },
  ],
};

export async function homeBody(): Promise<ChildValue> {
  const [counterCode, testCode, installCode, demos] = await Promise.all([
    highlight(COUNTER_SOURCE, 'ts'),
    highlight(TEST_SOURCE, 'ts'),
    highlight(INSTALL, 'sh'),
    loadDemos(),
  ]);

  return html`
    <section class="hero" aria-labelledby="hero-title">
      <p class="eyebrow">Version 0.2 is on npm</p>
      <h1 id="hero-title">Model-View-Intent web components on the modern web platform.</h1>
      <p class="lead">
        Gyral keeps the best idea of Cycle.js: your app is a pure function, and side effects happen
        at the edges, as data. It rebuilds that loop on custom elements, Lit templates, semantic
        HTML and modern CSS.
      </p>
      <div class="actions">
        <a class="button primary" href="/docs/getting-started/">Get started</a>
        <a class="button" href=${LINKS.github} rel="external">View on GitHub</a>
      </div>
      <div class="install">${raw(installCode)}</div>
    </section>

    <section class="loop" aria-labelledby="loop-title">
      <hgroup>
        <h2 id="loop-title">One loop, three pure parts</h2>
        <p>
          Events become messages, messages become state, state becomes HTML. That's the whole app.
        </p>
      </hgroup>
      <div class="loop-grid">
        <figure class="loop-code">
          ${raw(counterCode)}
          <figcaption>
            A complete component. The view names intents; it never holds a handler.
          </figcaption>
        </figure>
        <figure class="demo">
          <div class="demo-frame">${html`<gd-loop-counter></gd-loop-counter>`}</div>
          <figcaption>
            Live: server-rendered, then hydrated in place. Click and watch the loop.
          </figcaption>
        </figure>
      </div>
    </section>

    <section class="demo-teaser" aria-labelledby="demo-teaser-title">
      <hgroup>
        <h2 id="demo-teaser-title">See what it makes easy</h2>
        <p>
          Every interaction is data, so undo, race-free search, pages that work before JavaScript,
          live themes and animated transitions take a few lines.
          <a href=${DEMOS_PATH}>Watch the demos</a>.
        </p>
      </hgroup>
      <ul role="list" class="demo-cards">
        ${demos.map(
          (d) =>
            html`<li>
              <a href=${`${DEMOS_PATH}#${d.slug}`}>
                <img
                  src=${d.scenes.at(-1)?.files.poster}
                  alt=""
                  width=${d.scenes.at(-1)?.files.width}
                  height=${d.scenes.at(-1)?.files.height}
                  loading="lazy"
                  decoding="async"
                />
                <span>${d.title}</span>
              </a>
            </li>`,
        )}
      </ul>
    </section>

    <section class="features" aria-labelledby="features-title">
      <h2 id="features-title">Built on the platform, not around it</h2>
      <ul role="list" class="feature-grid">
        ${FEATURES.map(
          (f) =>
            html`<li>
              <h3>${f.title}</h3>
              <p>${f.body}</p>
            </li>`,
        )}
      </ul>
    </section>

    <section class="testing" aria-labelledby="testing-title">
      <div class="split">
        <div>
          <h2 id="testing-title">Pure means testable</h2>
          <p>
            Update and view are plain functions, so you test behaviour by calling them. When you
            need the browser, <code>@gyral/testing</code> mounts real components in Chromium,
            renders them on the server and checks they hydrate, and runs timers on a virtual clock.
          </p>
        </div>
        ${raw(testCode)}
      </div>
    </section>

    <section class="showcase" id="showcase" aria-labelledby="showcase-title">
      <hgroup>
        <h2 id="showcase-title">One store, four looks</h2>
        <p>
          <a href=${LINKS.shop} rel="external">gyral-shop</a> is a full department store built with
          Gyral: catalog, search, accounts, cart, checkout, orders and admin. Its themes change only
          CSS. The markup stays the same, the way the CSS Zen Garden proved it could.
        </p>
      </hgroup>
      <ul role="list" class="shots">
        ${THEMES.map(
          (t) =>
            html`<li>
              <figure>
                <img
                  src=${`/showcase/shop-${t.id}.jpg`}
                  alt=${`gyral-shop home page in the ${t.label} theme`}
                  width="1280"
                  height="800"
                  loading="lazy"
                  decoding="async"
                />
                <figcaption><strong>${t.label}</strong>, ${t.note}</figcaption>
              </figure>
            </li>`,
        )}
      </ul>
    </section>

    <section class="lineage" aria-labelledby="lineage-title">
      <h2 id="lineage-title">Standing on Cycle.js</h2>
      <p>
        <a href=${LINKS.cyclejs} rel="external">Cycle.js</a> showed that a web app can be one
        visible loop with every effect at the edge. Gyral is a new framework that carries that idea
        forward. It replaces streams with plain functions and the virtual DOM with the platform's
        own components, and credits the original in its licence notice.
      </p>
    </section>

    <section class="cta" aria-labelledby="cta-title">
      <h2 id="cta-title">Build your first component</h2>
      <p>Install two packages and write one function. The guide takes about ten minutes.</p>
      <a class="button primary" href="/docs/getting-started/">Read the guide</a>
    </section>
  `;
}
