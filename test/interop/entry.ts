// Browser fixtures for `pnpm interop` (scripts/check-interop.mjs): the claims made by the
// "Using Gyral in other frameworks" and "Using third-party web components" docs pages, run in
// Chromium against the published @gyral/core.
import { define, emit, html } from '@gyral/core';

/** A Gyral component used from outside Gyral: props in, outputs out. */
export type PickerOut = { readonly _tag: 'Picked'; readonly id: string };

type PickerMsg = { readonly _tag: 'Pick'; readonly id: string };

interface PickerProps {
  readonly label: string;
  readonly max: number;
  readonly items: readonly string[];
}

export const Picker = define<{ readonly picks: number }, PickerMsg, PickerProps, PickerOut>(
  'interop-picker',
  {
    props: {
      label: { type: String, default: 'Pick one' },
      max: { type: Number, default: 0 },
      items: { attribute: false, default: [] },
    },
    init: () => ({ picks: 0 }),
    intent: { Pick: ({ value }) => (value ? { _tag: 'Pick', id: value } : undefined) },
    update: {
      Pick: (s, m) => [{ picks: s.picks + 1 }, [emit({ _tag: 'Picked', id: m.id })]],
    },
    view: (_s, i, { props }) => html`
      <p>${props.label} (max ${props.max})</p>
      <ul>
        ${props.items.map(
          (id) => html`<li><button value=${id} data-intent=${i.Pick}>${id}</button></li>`,
        )}
      </ul>
    `,
  },
);

/** A third-party custom element: not Gyral, dispatches its own `fake-change` event. */
class FakeSelect extends HTMLElement {
  connectedCallback(): void {
    this.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('fake-change', {
          detail: { value: 'b' },
          bubbles: true,
          composed: true,
        }),
      );
    });
  }

  get value(): string {
    return 'b';
  }
}
customElements.define('fake-select', FakeSelect);

type HostMsg = { readonly _tag: 'Changed'; readonly value: string };

/** A Gyral component hosting the third-party element. */
export const Host = define<{ readonly value: string }, HostMsg>('interop-host', {
  events: ['fake-change'],
  init: () => ({ value: '' }),
  intent: {
    Changed: ({ detail, target }) => {
      const fromDetail =
        typeof detail === 'object' && detail !== null && 'value' in detail
          ? String(detail.value)
          : undefined;
      const fromElement = target instanceof FakeSelect ? target.value : undefined;
      return fromDetail === fromElement && fromDetail !== undefined
        ? { _tag: 'Changed', value: fromDetail }
        : undefined;
    },
  },
  update: { Changed: (_s, m) => ({ value: m.value }) },
  view: (s, i) => html`
    <fake-select data-intent=${i.Changed} data-intent-on="fake-change">pick</fake-select>
    <output>${s.value}</output>
  `,
});

declare global {
  interface HTMLElementTagNameMap {
    'interop-picker': InstanceType<typeof Picker>;
    'interop-host': InstanceType<typeof Host>;
    'fake-select': FakeSelect;
  }
}
