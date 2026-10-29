# Gyral: the small pack for coding agents

> Everything you need to write a correct Gyral component: the mental model, the rules, one
> complete component, task-sized recipes with tests, and where each export comes from. Read
> this first; open the full docs only for what it doesn't cover.

## The mental model

A Gyral component is a standard custom element defined from four pure parts. **`init`** returns
the first state. **`intent`** turns DOM events into typed messages: the view names an intent on
an element with `data-intent=${i.Save}`, and when that element's natural event fires (click for
a button, submit for a form, input for a text field, change for a checkbox or select), the
parser with that name reads the event and returns a message, or `undefined` to ignore it.
**`update`** has one reducer per message tag: it takes the state and the message and returns
the next state, or `[nextState, [commands]]`. **`view`** renders the state with an `html`
template. Nothing else changes state.

Side effects never run in your code. A reducer returns **commands**, plain data that says what
to do (`focus('#email')`, `delay(500, msg)`, `get(url, handlers)`, `command(driver, input,
handlers)`), and a **driver** does it and sends the answer back as another message. Work that
should keep running while some condition holds (a timer, a socket, a store watch) is returned
from **`subscriptions(state, props)`**, and Gyral starts and stops it as the state changes.

Because the parts are pure functions of data, a test feeds messages to `update` and checks the
state and the commands, with no browser (`step`, `run` from `@gyral/testing`). The same view
renders on a server and hydrates in the browser, so server-rendered state must be plain JSON.

A new app starts from `npm create gyral@latest my-app -- --template basic` (browser only) or
`--template ssr` (prerendered and hydrated). The `basic` app has `@gyral/core`,
`@gyral/testing`, Vitest in browser mode, and nothing else: the recipes below need nothing more.

With Gyral's MCP server connected (hosted at `https://mcp.gyral.dev/mcp`, or locally with
`npx -y @gyral/mcp`), call `start_here` once, start from `get_example` or `scaffold_component`,
and run `check_snippet` (local server only) on each module, applying its suggested fixes until
it passes. Setup for each client: [Use Gyral with coding agents](/docs/coding-agents/).

## MUST

- **MUST define components in two calls**: `define<State, Msg>()('my-tag', { … })`. The first
  call takes the types, the second the tag (with a hyphen) and the spec. One call fails with
  "Expected 0 arguments, but got 2".
- **MUST import every component module from the entry module.** `define()` registers the tag
  when its module runs, so a component in its own file (`src/signup-form.ts`) needs a
  side-effect import in `src/main.ts`, or in a module `main.ts` imports:
  `import './signup-form.js';`. Without it the tag is never defined: `<signup-form>` stays an
  empty unknown element (development builds warn G0014 after 3 seconds).
- **MUST render a component by its tag**: `<signup-form></signup-form>`, with the name given to
  `define()`. Never a JSX-style `<SignupForm />`: templates are HTML, which reads it as an
  unknown `<signupform>` element that renders nothing. Attributes on it are kebab-case, as its
  props read them: `max-value=${n}` (or the property, `.maxValue=${n}`), never `maxValue=`.
- **MUST write messages as a tagged union** with `readonly` fields:
  `{ readonly _tag: 'Toggle'; readonly id: number }`. `update` needs a reducer for every tag.
- **MUST keep reducers, `init` and `view` pure.** Return a new object
  (`{ ...s, items: [...s.items, x] }`); never mutate state. A component renders only when its
  state, a declared prop or a declared store's value changes, so a reducer with nothing to
  change returns `s` itself, and a view that reads anything else shows stale values (G0017).
- **MUST return side effects as commands**: `Save: (s) => [{ ...s, saving: true }, [cmd]]`.
  Focus is a command too: `focus('#name')` runs after the update renders.
- **MUST start long-lived work from `subscriptions(state, props)`**, not from `init` or a
  reducer: timers (`every`), sockets, store or media-query watches. Return `[]` to stop it.
- **MUST name intents in markup**: `data-intent=${i.Add}`, where `i` is the view's second
  argument. Override the event with `data-intent-on="keydown"`.
- **MUST validate input in the parser.** `value` is a string or `undefined`; parse it once
  (`Number`, a type guard, `trim()`) and return `undefined` for input you don't accept. For one
  event type, `on('keydown', { keys: ['Enter'] }, (input) => …)` types `input.event` and adds
  `modifiers`, `files`, `valueAsNumber` (a number input's value) and `origin`; bind its intent to
  that event (G0018 otherwise).
- **MUST carry ids, not positions**, in list controls: `value=${todo.id}` on the button or
  checkbox, and match by id in the reducer (`t.id === m.id`). With a filter or sort, a position
  points at the wrong item.
- **MUST render changing lists with `each(items, (t) => t.id, Row)`**, and keep rows pure: a
  row reads only its item, what `pick` returns, and module constants. Name intents in rows with
  a module constant `const i = intentsOf<typeof MyComponent>()`, and give the row a return type
  (`(t: Todo): TemplateResult => html…`).
- **MUST write form state as attributes**: `value=${s.text}`, `?checked=${s.done}`,
  `<textarea>${s.note}</textarea>`. To empty an input after a submit, keep its text in state
  and set it to `''`.
- **MUST use `?attr=${bool}` for boolean attributes**: `?disabled=${s.busy}`,
  `?hidden=${!s.open}`. `aria-*` attributes take strings or booleans: `aria-pressed=${s.on}`.
- **MUST put `novalidate` on a form that shows its own error messages**, and read each field's
  `validity` (`valueMissing`, `typeMismatch`, `tooShort`) in the submit parser. Without
  `novalidate`, a failing `required` or `type="email"` stops the `submit` event, so the parser
  and your messages never run. The signup form recipe below is a complete validated form to
  start from (also on [Forms](/docs/forms/#complete-example-a-validated-form)).
- **MUST keep server-rendered state, props and store state JSON-safe**: strings, numbers,
  booleans, `null`, arrays, plain objects.
- **MUST `await settled()`** (or use `mount()` from `@gyral/testing`) before reading the DOM in
  a browser test.
- **MUST import the view layer from `@gyral/core`**: `html`, `css`, `each`, `keyed`,
  `nothing`, `defineHook`.

## DO NOT

- **DO NOT attach event handlers.** There is no `@click=${…}`, `onclick=${…}` or
  `.onclick=${…}`; the template compiler rejects them. Use `data-intent`.
- **DO NOT call `fetch`, `setTimeout`, `Date.now()`, `Math.random()`, `localStorage` or the DOM
  in `update`, `init` or `view`.** Return a command (`delay`, `get`, a small driver of your
  own) and handle its answer as a message.
- **DO NOT start timers or listeners from `init` or a reducer.** Nothing stops them when the
  state changes, and nothing restarts them when the element is removed and attached again.
  `subscriptions` does both.
- **DO NOT do side effects in an intent parser.** It may read the event, the target element and
  the form's fields; the one write it may do is `event.preventDefault()`.
- **DO NOT check `instanceof KeyboardEvent`, modifier keys or `composedPath()[0]` by hand** in a
  parser for one event: write it with `on()` and a key filter (`modifiers: 'none'` keeps Ctrl+R
  for the browser).
- **DO NOT annotate a parser with the whole union** (`(): Msg => …`). Leave the return type
  off: each `intent` key returns its own variant. A key that isn't a message tag may return any
  message.
- **DO NOT bind form state as a property** (`.value=${…}`, `.checked=${…}`): the server can't
  write a property. **DO NOT write `disabled=${bool}`**: it renders `disabled="false"`, which is
  still disabled.
- **DO NOT read the view's variables (`s`, `i`, props) inside an `each` row.** Pass what the
  row needs through `pick`: `each(items, key, Row, (t) => t.id === s.selected)`.
- **DO NOT use an array as the whole state.** An array return means `[state, commands]`; wrap
  it: `{ items: [] }`.
- **DO NOT use the index from `.map((t, n) => …)` as an id**, and don't index the full list
  with a position from a filtered one.
- **DO NOT keep passwords or tokens in state** or in messages you keep. Leave them in the
  submitted `FormData`.
- **DO NOT expect a child's output to reach its grandparent.** Outputs (`outputs<Out>()` in
  the child, `child(Child, mapper)` in the parent) go to the direct parent only; pass them on
  with an output of the parent's own.
- **DO NOT import `lit`** or another library's `html`: Gyral renders with its own view layer.
- **DO NOT test with jsdom or happy-dom.** Test the model with `step`/`run` and the element in
  a real browser.
- **DO NOT guess at exports.** If a name isn't in the import map below, look it up in the
  [API reference](/docs/api/) before you use it.

## A complete component

A component with a command, a driver of its own and state as a union. The driver is the only
code that touches the network; the reducers stay pure and testable:

```ts
// src/quote.ts
import { command, define, defineDriver, html, type Command } from '@gyral/core';

export interface Quote {
  readonly text: string;
  readonly author: string;
}

const isQuote = (body: unknown): body is Quote =>
  typeof body === 'object' &&
  body !== null &&
  typeof (body as Partial<Quote>).text === 'string' &&
  typeof (body as Partial<Quote>).author === 'string';

/** Fetches a quote on a topic. A new request cancels the one in flight (`switch`). */
export const quotes = defineDriver<string, Quote>({
  name: 'quotes',
  concurrency: 'switch',
  run: async (topic, { signal }) => {
    const response = await fetch(`/api/quote?topic=${encodeURIComponent(topic)}`, { signal });
    if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
    const body: unknown = await response.json();
    if (!isQuote(body)) throw new Error('not a quote');
    return body;
  },
});

export type State =
  | { readonly _tag: 'Idle' }
  | { readonly _tag: 'Loading'; readonly topic: string }
  | { readonly _tag: 'Shown'; readonly quote: Quote }
  | { readonly _tag: 'Failed'; readonly topic: string };

export type Msg =
  | { readonly _tag: 'Load'; readonly topic: string }
  | { readonly _tag: 'Loaded'; readonly quote: Quote }
  | { readonly _tag: 'Failed' };

const load = (topic: string): Command<Msg> =>
  command(quotes, topic, {
    onSuccess: (quote): Msg => ({ _tag: 'Loaded', quote }),
    onFailure: (): Msg => ({ _tag: 'Failed' }),
  });

const TOPICS: readonly string[] = ['science', 'art'];

export const QuoteCard = define<State, Msg>()('my-quote-card', {
  init: () => ({ _tag: 'Idle' }),
  intent: {
    Load: ({ value }) =>
      value !== undefined && TOPICS.includes(value) ? { _tag: 'Load', topic: value } : undefined,
  },
  update: {
    Load: (_s, m) => [{ _tag: 'Loading', topic: m.topic }, [load(m.topic)]],
    Loaded: (_s, m) => ({ _tag: 'Shown', quote: m.quote }),
    Failed: (s) => (s._tag === 'Loading' ? { _tag: 'Failed', topic: s.topic } : s),
  },
  view: (s, i) => html`
    ${TOPICS.map(
      (t) =>
        html`<button type="button" value=${t} data-intent=${i.Load}>A quote about ${t}</button>`,
    )}
    <p aria-live="polite">
      ${
        s._tag === 'Idle'
          ? 'Pick a topic.'
          : s._tag === 'Loading'
            ? 'Loading…'
            : s._tag === 'Failed'
              ? `No quote about ${s.topic} right now.`
              : `“${s.quote.text}” (${s.quote.author})`
      }
    </p>
  `,
});
```

```ts
// src/quote.test.ts
import { expect, it } from 'vitest';
import { inputsFor, resolve, step } from '@gyral/testing';
import { QuoteCard, quotes } from './quote.js';

it('asks the driver for a quote and shows the answer', () => {
  const loading = step(QuoteCard.spec, { _tag: 'Idle' }, { _tag: 'Load', topic: 'art' });
  expect(loading.state).toEqual({ _tag: 'Loading', topic: 'art' });
  expect(inputsFor(loading.commands, quotes)).toEqual(['art']);

  // Answer the command through its own mapper, then feed the message back.
  const [request] = loading.commands;
  if (request === undefined) throw new Error('expected a command');
  const answer = resolve(request, { text: 'Art is long.', author: 'Hippocrates' });
  if (answer === undefined) throw new Error('expected a message');
  expect(step(QuoteCard.spec, loading.state, answer).state._tag).toBe('Shown');
});
```

In a browser test, substitute the driver by name: `mount(QuoteCard, { drivers: [fake] })`, with
`const fake = fakeDriver(quotes)`, which takes the driver's name.

<!-- include: docs/recipes.md#a-todo-list-with-filters -->

<!-- include: docs/recipes.md#a-signup-form-with-native-validation -->

<!-- include: docs/recipes.md#troubleshooting -->

## Where each export comes from

The most used exports, by package. This block is typechecked against the released packages, so
every name in it exists:

```ts
// src/imports.ts
// @gyral/core: components, templates, commands, stores, forms
export {
  define, // define<State, Msg, Props?, Outputs?>()('my-tag', spec)
  html, // view templates; also css (styles), svg, nothing, raw
  css,
  nothing,
  each, // each(items, key, row, pick?) or (…, { pick, equals }): keyed lists with pure rows
  keyed, // keyed(key, template): fresh elements when the key changes
  intentsOf, // const i = intentsOf<typeof C>(): intent names for list rows
  on, // on('keydown', { keys?, modifiers? }, parser): a parser typed by its event
  defineHook, // behaviour on one element: defineHook({ client, server?, dispose? })
  focus, // focus(selector, { wait?, select?, preventScroll? }): a command
  call, // call(selector, method, ...args): a command
  command, // command(driver, input, { onSuccess, onFailure })
  defineDriver, // defineDriver<I, O, E?>({ name, run }), or a token: defineDriver<I, O, E?>('name')
  subscription, // subscription(nameOrToken, subscribe, { select?, equals?, coalesce? })
  outputs, // const emit = outputs<Out>(): a child's outputs to its parent
  child, // child(Child, (out) => msg): a parent's intent for a child's outputs
  prop, // prop.string({ default }), prop.number(…), prop.value(guard): props
  defineStore, // shared state: defineStore<S, M>('name', { init, update })
  send, // send(store, msg): a command
  changed, // changed(store, storeChangedMsg) in a StoreChanged reducer
  settled, // await settled(): every component rendered
  provideDrivers, // provideDrivers(element, [driver, token.provide(run)]): substitute drivers
  defineForm, // schema forms: defineForm(standardSchema, { secret? })
  form, // form(definition, toMsg): a schema-checked submit intent
  field, // field(schema, toMsg): one schema-checked control
  fieldErrors, // fieldErrors(issues): errors by field name
  invalid, // invalid(errors): mirrors errors into native validity
  OUTPUT_EVENT, // 'gyral-output', for non-Gyral parents
} from '@gyral/core';
export type {
  TemplateResult, // the return type of a list row
  Command, // Command<Msg>
  Next, // State | [State, Command<Msg>[]]
  IntentInput, // what a parser receives: value, checked, formData, key, target, event…
  IntentRejected, // the framework message for failed schema checks
  Stateless, // the State of a component with no state
  Reducer, // Reducer<State, Msg, Variant<Msg, 'Add'>>: a reducer written outside the spec
  Variant, // Variant<Msg, 'Add'>: one member of the message union
  ParseResult, // what a parser returns: a message, IntentRejected or undefined
} from '@gyral/core';
export { gyral } from '@gyral/core/vite'; // vite.config.ts: { plugins: [gyral()] }

// @gyral/testing: model tests (no DOM) and browser tests
export {
  step, // step(C.spec, state, msg): { state, commands }
  run, // run(C.spec, msgs, { state?, props? }): from init or from state
  parse, // parse(C, 'Intent', { value: '3' }): one parser, no DOM
  focusTargetsIn, // where reducers asked focus to go
  outputsIn, // what a child sent its parent
  inputsFor, // inputsFor(commands, driver): the inputs of one driver's commands
  resolve, // resolve(command, output): the message a command would send back
  subscriptionsFor, // subscriptionsFor(C.spec, state): what should be running
  viewOf, // viewOf(C, state): the view, no DOM; renderToString from @gyral/ssr makes HTML
  mount, // await mount(C, { drivers: [fake] }): $, type, click, settled, dispose
  fakeDriver, // fakeDriver(driverOrToken, run?): records calls, under the driver's name
  virtualTime, // fake timers for delay, debounce and every
} from '@gyral/testing';

// @gyral/time: timers as commands
export { delay, debounce, every } from '@gyral/time'; // every sends the time, not a count

// @gyral/http: requests as commands (optional package)
export { get, request, submitForm, redirectedTo } from '@gyral/http';

// @gyral/router: URLs (optional package)
export { navigate, listen } from '@gyral/router';

// @gyral/ssr: server rendering and the no-JavaScript form path (server only)
export { renderPage, formAction, rejectWith, seeOther } from '@gyral/ssr';
```

Next: the [full docs index](/llms.txt), the [API reference](/docs/api/) and
[all docs in one file](/llms-full.txt).
