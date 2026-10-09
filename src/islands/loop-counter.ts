// The home page's live demo: a counter that also shows the loop it runs on. Every click is
// parsed into a message (intent), the message goes through a pure update (model), and the new
// state is rendered (view). Server-rendered with Declarative Shadow DOM and hydrated in place.
import { css, define, html } from '@gyral/core';

export type Msg = { readonly _tag: 'Increment' } | { readonly _tag: 'Decrement' };

export interface State {
  readonly count: number;
  /** The last message handled, shown in the loop readout; `null` before the first click. */
  readonly last: Msg['_tag'] | null;
}

export const LoopCounter = define<State, Msg>()('gd-loop-counter', {
  init: () => ({ count: 0, last: null }),
  intent: {
    Increment: () => ({ _tag: 'Increment' }),
    Decrement: () => ({ _tag: 'Decrement' }),
  },
  update: {
    Increment: (s) => ({ count: s.count + 1, last: 'Increment' }),
    Decrement: (s) => ({ count: s.count - 1, last: 'Decrement' }),
  },
  view: (s, i) => html`
    <div class="counter">
      <button type="button" data-intent=${i.Decrement} aria-label="Decrement">−</button>
      <output aria-live="polite" aria-label="Count">${s.count}</output>
      <button type="button" data-intent=${i.Increment} aria-label="Increment">+</button>
    </div>
    <dl class="loop">
      <div>
        <dt>Intent</dt>
        <dd>${s.last === null ? 'waiting for a click' : `click → { _tag: '${s.last}' }`}</dd>
      </div>
      <div>
        <dt>Model</dt>
        <dd>{ count: ${s.count} }</dd>
      </div>
      <div>
        <dt>View</dt>
        <dd>&lt;output&gt;${s.count}&lt;/output&gt;</dd>
      </div>
    </dl>
  `,
  styles: css`
    @layer component {
      :host {
        display: grid;
        gap: 1.25rem;
        container-type: inline-size;
      }
      .counter {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
      }
      button {
        font: inherit;
        font-size: 1.5rem;
        line-height: 1;
        inline-size: 3rem;
        block-size: 3rem;
        border: 1px solid var(--border, currentColor);
        border-radius: 999px;
        background: var(--surface-raised, transparent);
        color: inherit;
        cursor: pointer;
        touch-action: manipulation;
        transition:
          transform 120ms ease-out,
          border-color 120ms ease-out;
      }
      button:hover {
        border-color: var(--brand, currentColor);
      }
      button:active {
        transform: scale(0.94);
      }
      button:focus-visible {
        outline: 2px solid var(--brand, currentColor);
        outline-offset: 3px;
      }
      output {
        min-inline-size: 4ch;
        text-align: center;
        font-family: var(--font-display, inherit);
        font-size: 3rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .loop {
        display: grid;
        gap: 0.5rem;
        margin: 0;
        font-family: var(--font-mono, monospace);
        font-size: 0.875rem;
      }
      .loop div {
        display: grid;
        grid-template-columns: 6ch 1fr;
        gap: 0.75rem;
        align-items: baseline;
      }
      dt {
        color: var(--text-muted, inherit);
        font-weight: 600;
      }
      dd {
        margin: 0;
        overflow-wrap: anywhere;
      }
    }
  `,
});

declare global {
  interface HTMLElementTagNameMap {
    'gd-loop-counter': InstanceType<typeof LoopCounter>;
  }
}
