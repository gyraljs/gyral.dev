// The examples gallery (/examples/): every example in the Gyral repository with a summary, the
// guides it illustrates and its main file, plus gyral-shop. No JavaScript: the source excerpts
// are server-rendered inside <details>.
import { html, nothing, raw, type ChildValue } from '@gyral/core';
import { EXAMPLE_GROUPS, loadExcerpts, type Example } from '../content/examples.js';
import { absolute, LINKS } from '../site.js';
import type { PageMeta } from './layout.js';

const EXAMPLES_SOURCE = `${LINKS.github}/tree/main/examples`;

export const examplesMeta: PageMeta = {
  path: '/examples/',
  title: 'Examples',
  searchable: true,
  markdown: true,
  description:
    'Gyral examples, from a counter to a server-rendered app: ports of the Cycle.js examples with their source, plus gyral-shop, a full store.',
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Gyral examples',
      url: absolute('/examples/'),
    },
  ],
};

const card = (example: Example, code: string | undefined) => html`
  <li>
    <article id=${example.slug} class="example" aria-labelledby=${`${example.slug}-title`}>
      <h3 id=${`${example.slug}-title`}>${example.title}</h3>
      <p>${example.summary}</p>
      <dl class="example-facts">
        ${
          example.cycle === undefined
            ? nothing
            : html`<div>
                <dt>Ports</dt>
                <dd>Cycle.js <code>${example.cycle}</code></dd>
              </div>`
        }
        <div>
          <dt>Read</dt>
          <dd>
            ${example.shows.map(([label, href], n) => html`${n > 0 ? ', ' : ''}<a href=${href}>${label}</a>`)}
          </dd>
        </div>
      </dl>
      ${
        code === undefined
          ? nothing
          : html`<details>
              <summary>Source: <code>${example.file}</code></summary>
              ${raw(code)}
            </details>`
      }
      <p>
        <a href=${`${EXAMPLES_SOURCE}/${example.slug}`} rel="external"
          >${example.title} on GitHub</a
        >
      </p>
    </article>
  </li>
`;

export async function examplesBody(): Promise<ChildValue> {
  const excerpts = await loadExcerpts();
  return html`
    <section class="page-intro" aria-labelledby="examples-title">
      <h1 id="examples-title">Examples</h1>
      <p>
        Most of these are ports of the <a href=${LINKS.cyclejs} rel="external">Cycle.js</a>
        examples, kept in the Gyral repository as its acceptance suite: each one has tests, and the
        excerpts below are copied from the real files. To run them all, clone
        <a href=${LINKS.github} rel="external">the repository</a>, then
        <code>pnpm install</code> and <code>pnpm examples</code>.
      </p>
      <nav aria-label="Example groups" data-pagefind-ignore>
        <ul role="list" class="chips">
          ${EXAMPLE_GROUPS.map((g) => html`<li><a href=${`#${g.id}`}>${g.title}</a></li>`)}
          <li><a href="#gyral-shop">A whole application</a></li>
        </ul>
      </nav>
    </section>
    ${EXAMPLE_GROUPS.map(
      (group) => html`
        <section class="example-group" aria-labelledby=${group.id}>
          <h2 id=${group.id}>${group.title}</h2>
          <ul role="list" class="example-list">
            ${group.examples.map((e) => card(e, excerpts.get(e.slug)))}
          </ul>
        </section>
      `,
    )}
    <section class="example-group" aria-labelledby="gyral-shop">
      <h2 id="gyral-shop">A whole application</h2>
      <div class="split">
        <div>
          <p>
            <a href=${LINKS.shop} rel="external">gyral-shop</a> is a department store built with
            Gyral, Hono and SQLite: catalog and search, accounts, cart, checkout with mock payments,
            order history, reviews, wish lists and an admin area. Pages are rendered on the server
            and work without JavaScript; page structure is light DOM and widgets are islands.
          </p>
          <p>
            Its four themes change only CSS, from a dense marketplace to an airy boutique. See them
            side by side on the <a href="/#showcase">home page</a>.
          </p>
        </div>
        <figure>
          <img
            src="/showcase/shop-default.jpg"
            alt="gyral-shop home page in its default theme"
            width="1280"
            height="800"
            loading="lazy"
            decoding="async"
          />
          <figcaption>gyral-shop, default theme</figcaption>
        </figure>
      </div>
    </section>
  `;
}
