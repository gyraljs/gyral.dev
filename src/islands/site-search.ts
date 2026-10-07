// The /search/ page's island: search-as-you-type over the Pagefind index built from dist/.
// Server-rendered as the no-JavaScript message (search needs the browser), then enhanced on
// `Hydrated`: it reads `?q=` (the header form lands here), searches as you type, and keeps the
// address bar in step. Keys: arrows move between the box and the results, Escape clears.
import { css, define, each, focus, html, nothing, type Command } from '@gyral/core';
import { readQuery, search, writeQuery, type Hit } from './pagefind.js';

export type Msg =
  | { readonly _tag: 'Started'; readonly query: string }
  | { readonly _tag: 'Typed'; readonly query: string }
  | { readonly _tag: 'Submitted' }
  /** Arrow keys move between the box and the results; Escape clears. */
  | {
      readonly _tag: 'Key';
      readonly key: 'ArrowDown' | 'ArrowUp' | 'Escape';
      readonly from: number;
    }
  | { readonly _tag: 'Found'; readonly query: string; readonly hits: readonly Hit[] }
  | { readonly _tag: 'Failed'; readonly reason: string };

export type State =
  /** Server render and first client render: the no-JS message. */
  | { readonly _tag: 'Static' }
  | { readonly _tag: 'Live'; readonly query: string; readonly result: Result };

type Result =
  | { readonly _tag: 'Empty' }
  | { readonly _tag: 'Searching' }
  | { readonly _tag: 'Found'; readonly query: string; readonly hits: readonly Hit[] }
  | { readonly _tag: 'Failed'; readonly reason: string };

/** The commands for a new query: keep `?q=` in step and, unless it's blank, search. */
const run = (query: string): readonly Command<Msg>[] =>
  query.trim() === ''
    ? [writeQuery<Msg>('')]
    : [
        writeQuery<Msg>(query),
        search(
          query.trim(),
          (hits): Msg => ({ _tag: 'Found', query: query.trim(), hits }),
          (reason): Msg => ({ _tag: 'Failed', reason }),
        ),
      ];

const live = (query: string): readonly [State, readonly Command<Msg>[]] => [
  { _tag: 'Live', query, result: query.trim() === '' ? { _tag: 'Empty' } : { _tag: 'Searching' } },
  run(query),
];

/** Index of the focused result (`hit-3` → 3), or -1 for the search box. */
const indexOf = (target: EventTarget | null): number => {
  const id = target instanceof Element ? target.id : '';
  return id.startsWith('hit-') ? Number(id.slice(4)) : -1;
};

const hitsOf = (s: State): readonly Hit[] =>
  s._tag === 'Live' && s.result._tag === 'Found' ? s.result.hits : [];

export const SiteSearch = define<State, Msg>('gd-site-search', {
  init: () => ({ _tag: 'Static' }),
  intent: {
    Typed: ({ value }) => ({ _tag: 'Typed', query: value ?? '' }),
    Submitted: () => ({ _tag: 'Submitted' }),
    Key: ({ key, event }) => {
      if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Escape') return undefined;
      // The one side effect a parser may have: stop the arrows moving the caret or scrolling.
      if (key !== 'Escape') event.preventDefault();
      return { _tag: 'Key', key, from: indexOf(event.target) };
    },
  },
  update: {
    Hydrated: () => [
      { _tag: 'Live', query: '', result: { _tag: 'Empty' } },
      [readQuery((query): Msg => ({ _tag: 'Started', query }))],
    ],
    Started: (_s, m) => live(m.query),
    Typed: (_s, m) => live(m.query),
    Submitted: (s) => (hitsOf(s).length > 0 ? [s, [focus('#hit-0')]] : s),
    Key: (s, m) => {
      if (m.key === 'Escape') {
        const [state, commands] = live('');
        return [state, [...commands, focus('#q')]];
      }
      const last = hitsOf(s).length - 1;
      const to = Math.min(Math.max(m.from + (m.key === 'ArrowDown' ? 1 : -1), -1), last);
      return [s, [focus(to < 0 ? '#q' : `#hit-${String(to)}`)]];
    },
    Found: (s, m) =>
      s._tag === 'Live' && s.query.trim() === m.query
        ? { ...s, result: { _tag: 'Found', query: m.query, hits: m.hits } }
        : s,
    Failed: (s, m) =>
      s._tag === 'Live' ? { ...s, result: { _tag: 'Failed', reason: m.reason } } : s,
  },
  view: (s, i) =>
    s._tag === 'Static'
      ? html`<p class="note">
          Search runs in your browser and needs JavaScript. Without it, browse the
          <a href="/docs/">documentation index</a> or the <a href="/docs/api/">API reference</a>.
        </p>`
      : html`
          <search data-intent=${i.Key} data-intent-on="keydown">
            <form data-intent=${i.Submitted}>
              <label for="q">Search the docs, API, examples and blog</label>
              <input
                id="q"
                name="q"
                type="search"
                autocomplete="off"
                spellcheck="false"
                aria-describedby="search-status"
                value=${s.query}
                data-intent=${i.Typed}
              />
            </form>
            <p id="search-status" class="status" role="status">${statusText(s)}</p>
            ${results(hitsOf(s))}
          </search>
        `,
  styles: css`
    @layer component {
      :host {
        display: grid;
        gap: 1rem;
      }
      label {
        display: block;
        font-weight: 600;
        margin-block-end: 0.5rem;
      }
      input {
        inline-size: 100%;
        font: inherit;
        font-size: 1.125rem;
        padding: 0.75rem 1rem;
        border: 1px solid var(--border, currentColor);
        border-radius: var(--radius, 0.75rem);
        background: var(--surface-raised, transparent);
        color: inherit;
      }
      input:focus-visible,
      a:focus-visible {
        outline: 3px solid var(--brand, Highlight);
        outline-offset: 2px;
      }
      .status,
      .note {
        color: var(--text-muted, inherit);
        margin-block: 0.75rem 0;
      }
      .note a,
      a {
        color: var(--brand, LinkText);
      }
      ol {
        list-style: none;
        padding: 0;
        margin: 1rem 0 0;
        display: grid;
        gap: 0.75rem;
      }
      li a {
        display: grid;
        gap: 0.25rem;
        padding: 0.875rem 1rem;
        border: 1px solid var(--border, currentColor);
        border-radius: var(--radius, 0.75rem);
        background: var(--surface-raised, transparent);
        color: inherit;
        text-decoration: none;
      }
      li a:hover {
        border-color: var(--brand, currentColor);
      }
      .area {
        font-size: 0.8125rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--text-muted, inherit);
      }
      .title {
        font-weight: 600;
        color: var(--brand, LinkText);
      }
      .excerpt {
        color: var(--text-muted, inherit);
        overflow-wrap: anywhere;
      }
      mark {
        background: color-mix(in oklch, var(--yellow, yellow) 35%, transparent);
        color: var(--text, inherit);
        border-radius: 0.2em;
        padding-inline: 0.1em;
      }
    }
  `,
});

const statusText = (s: Extract<State, { _tag: 'Live' }>): string => {
  const r = s.result;
  switch (r._tag) {
    case 'Empty':
      return 'Type to search. Use the arrow keys to move through the results, Escape to clear.';
    case 'Searching':
      return 'Searching…';
    case 'Failed':
      return r.reason;
    case 'Found':
      return r.hits.length === 0
        ? `No results for “${r.query}”.`
        : `${String(r.hits.length)} ${r.hits.length === 1 ? 'result' : 'results'} for “${r.query}”.`;
  }
};

/**
 * One result. A pure row (it reads only its arguments), so `each` skips rows whose hit and
 * position are unchanged. The position comes through `pick`: it names the link (`hit-3`) the
 * arrow keys move to.
 */
const Result = (hit: Hit, n: number) =>
  html`<li>
    <a id=${`hit-${String(n)}`} href=${hit.url}>
      <span class="area">${hit.area}</span>
      <span class="title">${hit.title}</span>
      <span class="excerpt"
        >${hit.excerpt.map((run) => (run.mark ? html`<mark>${run.text}</mark>` : run.text))}</span
      >
    </a>
  </li>`;

/** Results are keyed by URL: Pagefind lists a page once, and a deep link is within its page. */
const results = (hits: readonly Hit[]) =>
  hits.length === 0
    ? nothing
    : html`<ol aria-label="Search results">
        ${each(
          hits,
          (hit) => hit.url,
          Result,
          (hit) => hits.indexOf(hit),
        )}
      </ol>`;
