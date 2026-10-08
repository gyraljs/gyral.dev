// Browser fixtures for `pnpm interop` (scripts/check-interop.mjs): the claims made by the
// "Using Gyral in other frameworks" and "Using third-party web components" docs pages, run in
// Chromium against the published @gyral/core.
import * as v from 'valibot';
import { define, each, html, intents, OUTPUT_EVENT, outputs, prop } from '@gyral/core';

/** The page awaits `settled` instead of polling: every component has rendered. */
export { OUTPUT_EVENT, settled } from '@gyral/core';

/** A Gyral component used from outside Gyral: props in, outputs out. */
export type PickerOut = { readonly _tag: 'Picked'; readonly id: string };

const emit = outputs<PickerOut>();

type PickerMsg = { readonly _tag: 'Pick'; readonly id: string };

const pickerIntents = intents<PickerMsg>();
const PickerItem = (id: string) =>
  html`<li><button value=${id} data-intent=${pickerIntents.Pick}>${id}</button></li>`;

interface PickerProps {
  readonly label: string;
  readonly max: number;
  readonly items: readonly string[];
}

export const Picker = define<{ readonly picks: number }, PickerMsg, PickerProps, PickerOut>(
  'interop-picker',
  {
    props: {
      label: prop.string({ default: 'Pick one' }),
      max: prop.number({ default: 0 }),
      items: prop.value(v.array(v.string()), { default: [] }),
    },
    init: () => ({ picks: 0 }),
    intent: { Pick: ({ value }) => (value ? { _tag: 'Pick', id: value } : undefined) },
    update: {
      Pick: (s, m) => [{ picks: s.picks + 1 }, [emit({ _tag: 'Picked', id: m.id })]],
    },
    view: (_s, _i, { props }) => html`
      <p>${props.label} (max ${props.max})</p>
      <ul>
        ${each(props.items, (id) => id, PickerItem)}
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

/** A plain custom element that talks to a Gyral parent by dispatching OUTPUT_EVENT. */
class PlainChild extends HTMLElement {
  connectedCallback(): void {
    this.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent(OUTPUT_EVENT, { detail: { _tag: 'Picked', id: 'plain' }, bubbles: true }),
      );
    });
  }
}
customElements.define('plain-child', PlainChild);

type ParentMsg = { readonly _tag: 'Heard'; readonly id: string };

/** A Gyral parent of a non-Gyral child: the child's output arrives as `detail`. */
export const Parent = define<{ readonly heard: string }, ParentMsg>('interop-parent', {
  init: () => ({ heard: '' }),
  intent: {
    Heard: ({ detail }) =>
      typeof detail === 'object' && detail !== null && 'id' in detail
        ? { _tag: 'Heard', id: String(detail.id) }
        : undefined,
  },
  update: { Heard: (_s, m) => ({ heard: m.id }) },
  view: (s, i) => html`
    <plain-child data-intent=${i.Heard}>tell</plain-child>
    <output>${s.heard}</output>
  `,
});

type HostMsg = { readonly _tag: 'Changed'; readonly value: string };

/** A Gyral component hosting the third-party element. */
/** No `events` field: a static data-intent-on value is enough (the docs say so). */
export const Host = define<{ readonly value: string }, HostMsg>('interop-host', {
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

/** The same element and event through a per-event attribute: no data-intent, no data-intent-on. */
export const HostPerEvent = define<{ readonly value: string }, HostMsg>('interop-host-per-event', {
  init: () => ({ value: '' }),
  intent: {
    Changed: ({ detail }) =>
      typeof detail === 'object' && detail !== null && 'value' in detail
        ? { _tag: 'Changed', value: String(detail.value) }
        : undefined,
  },
  update: { Changed: (_s, m) => ({ value: m.value }) },
  view: (s, i) => html`
    <fake-select data-intent-fake-change=${i.Changed}>pick</fake-select>
    <output>${s.value}</output>
  `,
});

declare global {
  interface HTMLElementTagNameMap {
    'interop-picker': InstanceType<typeof Picker>;
    'interop-host': InstanceType<typeof Host>;
    'interop-host-per-event': InstanceType<typeof HostPerEvent>;
    'interop-parent': InstanceType<typeof Parent>;
    'plain-child': PlainChild;
    'fake-select': FakeSelect;
  }
}
