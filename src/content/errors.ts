// The error codes page, /errors/. Production builds of @gyral/core print a short line instead of
// a message, `Gyral G0010 my-cart Add https://gyral.dev/errors/#G0010`, so this page must have
// an anchor for every code (test/errors.test.ts). The codes, their groups and their texts come
// from the installed package's own diagnostics table, `@gyral/core/errors.json` (the published
// copy of Gyral's docs/references/errors.json), so they can't drift; the explanations and fixes
// below are the site's. Server-only (reads files).
import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DocPage } from './docs.js';
import { renderMarkdown } from './markdown.js';

export const ERRORS_PATH = '/errors/';

const NODE_MODULES = fileURLToPath(new URL('../../node_modules/', import.meta.url));

/** One diagnostic from the package's table. */
export interface GyralError {
  /** `G0010`, the anchor on this page. */
  readonly id: string;
  readonly code: number;
  /** The table's group: Components, Props, … */
  readonly group: string;
  /** The development text, with `{name}` placeholders. */
  readonly message: string;
  /** Placeholder names in order of first appearance: the order production prints them in. */
  readonly args: readonly string[];
}

/** What a code means for an app and how to fix it, in the site's words (Markdown inline). */
export interface ErrorNote {
  readonly explanation: string;
  readonly fix: string;
}

export const codeName = (code: number): string => `G${String(code).padStart(4, '0')}`;

/** One row of `@gyral/core/errors.json`. */
interface TableRow {
  readonly code: string;
  readonly group: string;
  readonly message: string;
  readonly arguments: readonly string[];
  readonly url: string;
}

/**
 * The installed @gyral/core's diagnostics table (`@gyral/core/errors.json`), or
 * `GYRAL_ERRORS_JSON` (with `GYRAL_DOCS_VERSION`) when a release branch is built before that
 * release is on npm, so the MCP docs snapshot lists the release's codes (gyral releasing.md,
 * step 2): `GYRAL_ERRORS_JSON=../gyral/packages/core/src/errors.json`.
 */
export const errorsFile = (): string =>
  process.env['GYRAL_ERRORS_JSON'] ||
  join(realpathSync(join(NODE_MODULES, '@gyral', 'core')), 'dist', 'errors.json');

/** Every diagnostic in the installed @gyral/core, in table order, with the URL production prints. */
export function readGyralErrors(
  file: string = errorsFile(),
): readonly (GyralError & { url: string })[] {
  const rows = JSON.parse(readFileSync(file, 'utf8')) as readonly TableRow[];
  if (rows.length === 0) throw new Error(`no diagnostics in ${file}`);
  return rows.map((row) => ({
    id: row.code,
    code: Number(row.code.slice(1)),
    group: row.group,
    message: row.message,
    args: row.arguments,
    url: row.url,
  }));
}

/**
 * The site's explanation and fix for each code. A code the package adds needs an entry here
 * before the page builds (test/errors.test.ts says which).
 */
export const ERROR_NOTES: Readonly<Record<number, ErrorNote>> = {
  // Components
  1: {
    explanation:
      'Outside the browser, `define()` only records your component for the server renderer, so there is no element class to construct: `new MyElement()` on the server throws this.',
    fix: 'Render the component on the server through `@gyral/ssr` (`renderPage`, `renderToString`), instead of constructing it.',
  },
  10: {
    explanation:
      'A component received a message whose `_tag` has no reducer in its `update`, so the message was dropped. It is usually a typo, or a reducer you forgot.',
    fix: 'Add a reducer for the message to the component’s `update`, or stop sending it.',
  },
  11: {
    explanation:
      'An event reached an element whose `data-intent` names an intent the component has no parser for, so the user’s action was ignored.',
    fix: 'Add a parser with that name to the spec’s `intent`, or correct the name in the view (`data-intent=${i.Name}` catches typos at compile time).',
  },
  12: {
    explanation:
      'An asynchronous intent parser rejected. The error is logged with this message, and the event produced no message.',
    fix: 'Handle failures inside the parser (return a message that describes the failure, or `undefined`), or move the fallible work into a command with `onFailure`.',
  },
  13: {
    explanation:
      'A `focus(selector)` command found no element to focus in the component’s root after the render, so focus stayed where it was. Keyboard and screen reader users notice.',
    fix: 'Make the selector match an element inside the component (its shadow root, or its children for `shadow: false`). Give targets that aren’t focusable, such as headings, `tabindex="-1"`.',
  },
  // Props
  20: {
    explanation:
      'A prop’s Standard Schema returned a promise. Props are validated synchronously, while the element updates and renders, so they can’t wait for it.',
    fix: 'Use a synchronous schema or a type guard for the prop, and do asynchronous checks in a command.',
  },
  14: {
    explanation:
      'Development builds look for custom-element tags on the page that nothing has defined, 3 seconds after load and again after each later `define()`. Such an element renders nothing: usually the entry never imports the module that defines it.',
    fix: 'Import the component’s module from the entry (or from a module the entry imports). For a third-party element, load its package; ignore the warning for an element you define later on purpose.',
  },
  15: {
    explanation:
      'Development only: two copies of `@gyral/core` run in the page. A value one copy makes, such as a stylesheet from `css` or a store, doesn’t work in the other, so components fail far from the cause (`styles.flatMap is not a function`). `gyral()` also warns at startup, in dev and builds, when the package is installed more than once, naming each copy’s version, folder and the packages that use it.',
    fix: 'Give every `@gyral/*` package the same version: they take `@gyral/core` as a peer, so they share the app’s copy. For a library that pins another core, pin `@gyral/core` to one version with your package manager’s overrides (pnpm or npm `overrides`, Yarn `resolutions`) and reinstall. A library lists `@gyral/core` as a peer dependency ([Publishing a component library](/docs/packages/#publishing-a-component-library)).',
  },
  16: {
    explanation:
      'A Gyral package (`@gyral/http`, `router`, `time`, `ssr`, `testing` or `devtools`) loaded with a `@gyral/core` of another release. Each one uses core’s internals, which change between releases, so it checks core’s version when it loads. They take `@gyral/core` as a peer at their exact version, so the package manager normally reports the mismatch when it installs: pnpm lists the unmet peer, npm stops with `ERESOLVE`. Development throws, naming both versions; production logs this warning and carries on.',
    fix: 'Install the same version of every `@gyral/*` package the app uses, and check that the lockfile resolves one version of each ([One version of every package](/docs/packages/#one-version-of-every-package)).',
  },
  17: {
    explanation:
      'Development only: a component renders only when its state, a declared prop or a declared store’s value changes, and this one rendered differently when Gyral rendered a skipped view again to check it. So its view reads something else, such as `Date.now()`, `Math.random()`, a module variable or the DOM, and on the page it shows a stale value until one of its inputs changes. The check compares what the view renders, plain objects and arrays by value, so values a view builds anew each render match when they are equal; a `Date`, a `Set` or a class instance built in the view compares by reference, so it differs every time. `where` says where the view differs: `in its template`, or in the innermost `each(…, Row)` or `keyed(…)` that does, named by its row function. When that list’s `pick` returned a new object for the same item, the message says so. Development checks up to 50 skipped views per render pass (a different 50 each pass when more are skipped, so every component is checked within a few passes) and warns once per component.',
    fix: 'Move what the view reads into state (the time from an `every` subscription, a random value from a command, a `Date` built from a timestamp), a prop or a store, so that a change to it renders the component ([Pure means repeatable](/docs/views/#pure-means-repeatable)). When the message names a list’s `pick`, pick only the fields the row reads, or pass `each(items, key, row, { pick, equals })`.',
  },
  18: {
    explanation:
      'The intent’s parser is `on(event, …)`, written for one event type, but another event reached it: the template binds the intent to a different event, through the element’s own trigger, `data-intent-on` or another `data-intent-<event>` attribute. Development throws; production declines the event, as a parser that returns `undefined` does. The `gyral/intent-event` ESLint rule reports the same binding in the editor.',
    fix: 'Bind the intent to the parser’s event, `data-intent-keydown=${i.Move}` for `on("keydown", …)`, or give the other event an intent and a parser of its own ([Parsers typed by their event](/docs/intent/#parsers-typed-by-their-event)).',
  },
  21: {
    explanation:
      'A prop value failed its type or its schema, so it is treated as missing and its `default` applies. Attributes are checked in every build; property sets and hydration seeds in development only.',
    fix: 'Pass a value that matches the prop’s declaration (a numeric string for `prop.number`, valid JSON for `prop.json`), or loosen the schema.',
  },
  22: {
    explanation:
      'A component rendered for the first time while props declared `required` were still missing. The parent probably forgot an attribute or a property.',
    fix: 'Set the prop on the element (an attribute, or `.prop=${…}`) before it renders, or give it a `default` instead of `required`.',
  },
  23: {
    explanation:
      'A component declares props named like a member every element already has: a built-in property (`hidden`, `title`, `id`), or one of Gyral’s (`state`, `send`, `drivers`, `stores`, `initialMessages`, the custom-element callbacks). The prop would replace the member: a prop named `hidden` hides the element, one named `state` hides the component’s model. TypeScript rejects these names and development throws; production warns about built-in names.',
    fix: 'Rename the property. One of Gyral’s names can stay the public attribute: `badge: prop.string({ attribute: "state" })`.',
  },
  24: {
    explanation:
      'Development only: the element carries an attribute HTML lowercased from a camelCase prop’s name, such as `playerbase` for `playerBase`, written in the page’s HTML or set by a host framework. The prop reads its kebab-case attribute, `player-base`, so the value never reached it.',
    fix: 'Write the prop’s attribute (`player-base="…"`), or set the property in code. In templates, the build and ESLint report the same mistake ([template rules](/docs/views/#checked-before-it-runs)).',
  },
  // Scheduling
  30: {
    explanation:
      'A callback Gyral deferred to a microtask threw: delivering a child component’s output to its parent. The parent may not have received the output.',
    fix: 'Look at the error logged with this message, and make sure the parent’s `child()` mapper and any `gyral-output` listener don’t throw.',
  },
  31: {
    explanation:
      'A component’s `view` threw during a render. Gyral reports a `GyralError` (phase `view`) through its error channel and keeps rendering the other components. The component renders its `error` view if its spec has one; otherwise its DOM shows its previous state.',
    fix: 'Fix the exception in the view, using the `cause` of the reported error. It is often a field read on state that has a different shape than the view expects. Give the spec an `error(failure, state)` view so users see a fallback ([Error handling](/docs/error-handling/)).',
  },
  32: {
    explanation:
      'Work that runs after a render failed: a focus command, custom states from `states`, the `Hydrated` message, or the commands `init` returned for a resumed component.',
    fix: 'Fix the exception logged with this message, typically in the spec’s `states` function or the `Hydrated` reducer.',
  },
  33: {
    explanation:
      'Rendering didn’t settle in one flush: the named components kept re-rendering each other. Components are probably feeding each other props or messages in a cycle. Development throws; production logs it and drops the rest of the work so the page doesn’t freeze.',
    fix: 'Break the cycle with a condition in `update`, for example by sending a message or changing state only when the value actually differs.',
  },
  34: {
    explanation:
      '`settled()` rejected because messages kept arriving: more than the given number of flushes or busy turns went by without a quiet moment. Something is sending messages in a cycle, or a stream emits on every turn.',
    fix: 'Find the cycle and break it with a condition in `update`, or substitute the chatty driver in the test.',
  },
  // Commands
  40: {
    explanation:
      'A command’s `onSuccess` or `onFailure` mapper threw while turning a driver’s result into a message, so the result never reached `update`. It is reported as a `GyralError` (phase `command`), and the component’s `Errored` reducer, if any, receives it.',
    fix: 'Make the mapper total: return a message, or `undefined`, for every input.',
  },
  41: {
    explanation:
      'A driver failed, after any `retry()` policy, and the command has no `onFailure`. This is an error, not a warning: it is reported as a `GyralError` (phase `command`) and reaches the component’s `Errored` reducer, if any. Without one, the component can’t react: a spinner may spin forever.',
    fix: 'Give the command an `onFailure` that turns the error into a message, and handle that message in `update`. Expected failures (the network, a 5xx, a refusal) should always be messages.',
  },
  42: {
    explanation:
      'The function (or `unsubscribe()`) a `subscription()` returned threw when Gyral released the source, so the source may still be sending values or holding listeners.',
    fix: 'Make the stop function that `subscribe` returns safe to call once, and return a function or an object with `unsubscribe()`.',
  },
  43: {
    explanation:
      'The command’s driver is a token: `defineDriver<I, O, E>(name)` without an implementation of its own. Nothing above the component provides that name, so the command can’t run. It is reported through the error channel (phase `command`); `onFailure` isn’t called, because there was no driver to fail.',
    fix: 'Provide the driver where the app starts, `provideDrivers(document.body, [token.provide(run)])`, or on the element with `el.drivers`. A page provides it before its components first render: before importing them, or later in the same task with no `await` in between ([Substituting drivers](/docs/effects/#substituting-drivers)). In tests, pass a fake of the token, `fakeDriver(token)`, which takes its name ([Drivers the app provides](/docs/effects/#drivers-the-app-provides)).',
  },
  44: {
    explanation:
      'Development only: a list of drivers (for `provideDrivers`, `el.drivers`, `<gyral-drivers>`, `mount({ drivers })` or a store) has two drivers with the same name. A command finds its driver by name, so only one of them could ever run. Development throws; production has no check and uses the first.',
    fix: 'Drop one of them, or give each driver a name of its own and build each command from the driver it should use.',
  },
  45: {
    explanation:
      'Development only: a record of drivers has a key that isn’t the name of the driver under it, such as `{ api: makeHttpDriver() }` for a driver named `http`. A command looks its driver up by the driver’s own name, `http` here, so that entry is never used: the lookup goes on to the next provider and, last, to the command’s own driver (for a token, [G0043](/errors/#G0043)). Development warns once per record.',
    fix: 'Supply the drivers as a list, each under its own name, `provideDrivers(root, [makeHttpDriver()])`, or make the key the driver’s name ([Substituting drivers](/docs/effects/#substituting-drivers)).',
  },
  // Stores
  50: {
    explanation:
      'A component read a store with `ctx.read(store)`, or sent to one, without listing it in its spec. A component subscribes only to the stores it declares, so it would miss the store’s changes.',
    fix: 'Declare the store in the spec, for example `stores: [cart]`.',
  },
  51: {
    explanation:
      'The store state the server seeded into the page failed the store’s `schema`, so the browser discarded it and the store starts from `init`. The page may show different data than the server rendered.',
    fix: 'Fix the state the server sends, or align the store’s `schema` with it.',
  },
  52: {
    explanation:
      'The store seed on the page, or on a `<gyral-stores>` provider, isn’t valid JSON, so every store in it starts from `init`.',
    fix: 'Let `@gyral/ssr` write the seed (`renderPage({ stores })`, or the provider’s `.instances`) instead of writing it by hand, and check that nothing rewrites or truncates the HTML on its way.',
  },
  53: {
    explanation:
      'A component read a store during a server render without a store scope. On the server each request needs its own store instances, and without a scope Gyral can’t tell whose state to read.',
    fix: 'Render through `@gyral/ssr` and pass the request’s instances: `renderPage({ stores })` or `renderToString(value, { stores })`.',
  },
  54: {
    explanation:
      'A store’s `update` sent a message to another store, but this store instance isn’t held by a store scope, so the message has nowhere to go and is dropped.',
    fix: 'Let a scope hold the instance: the page’s default, a `<gyral-stores>` provider (`.instances=${[…]}`), or a store registry in tests.',
  },
  55: {
    explanation:
      'A store received a message whose `_tag` has no reducer in its `update`, so the message was dropped and the change you expected didn’t happen.',
    fix: 'Add a reducer for the message to the store’s `update`, or correct the tag being sent.',
  },
  // Hydration
  60: {
    explanation:
      'A server-rendered component’s `data-gyral-seed` isn’t valid JSON, so the browser can’t resume the server’s state: the component starts from `init`, and its first render may not match the server’s HTML.',
    fix: 'Don’t edit or write `data-gyral-seed` yourself. Look for whatever changes the server’s HTML on its way: a proxy, an HTML minifier, string templating.',
  },
  61: {
    explanation:
      'The hydration code, which loads lazily with the first server-rendered component, failed to load, so server-rendered components render fresh instead of hydrating. The page works, but redoes the server’s work. It is usually a stale deploy: a cached page that points at a chunk that no longer exists.',
    fix: 'Keep the previous build’s assets online for a while after a deploy, or don’t cache HTML that points at removed chunks. The network error is logged with this message.',
  },
  62: {
    explanation:
      'The server’s HTML differs from the first client render, so the component can’t be hydrated in place. Every build clears it and renders it fresh from its seeded state (G0063), and the rest of the page stays hydrated. Development logs this sentence as an error, naming the template’s file and line, then G0063’s; production warns with G0063’s code, then this sentence (the component, the DOM path, what was expected and found). Both end the sentence with this code and its link. It isn’t reported through the error channel, but `hydrated()` from `@gyral/testing` fails a test on it.',
    fix: 'Make the view render the same on both sides: no `Date.now()`, random numbers or locale-dependent formatting in `view` (put them in state through a command). Also rule out a browser extension or script that changed the DOM before hydration, and a stale cached page.',
  },
  63: {
    explanation:
      'After a hydration mismatch (G0062), Gyral cleared this component and rendered it fresh from its seeded state. Development logs this sentence after the mismatch’s own, in one error; production warns with this code and the component’s tag, then the mismatch’s sentence, which ends with G0062. The component works and the rest of the page stays hydrated, but it flashes and redoes the server’s work.',
    fix: 'Fix the mismatch the message describes; in development it names the template’s file and line.',
  },
  // Templates
  69: {
    explanation:
      'Production only: a `?modal` or `?popover-open` binding ran in a build that left the dialog and popover code out, so the dialog didn’t open. The build adds that code when a module it reads binds one, in source or in a package’s compiled templates, and it doesn’t read installed packages that don’t depend on Gyral.',
    fix: 'Make the package that ships the template depend on `@gyral/core` (a library lists it as a peer dependency), so the build reads it, or move the template into your own source.',
  },
  70: {
    explanation:
      'A bundle built with the Vite preset leaves out the runtime template preparer, so every `html` template must be precompiled, and this one wasn’t. The build normally fails before this can happen.',
    fix: 'Import `html` (and `svg`) from `@gyral/core`, or from a package listed in the compiler’s `sources`, and use it directly as a tag: the compiler can’t follow an alias, a call or a re-export.',
  },
  71: {
    explanation:
      'A page shell, a template with `<!doctype>`, `<html>`, `<head>` or `<body>`, was rendered in the browser. Only the server renders document-level tags. Development reports it as template rule 11, with the full explanation.',
    fix: 'Render the page shell on the server with `@gyral/ssr`’s `renderPage`, and render only components in the browser.',
  },
  72: {
    explanation:
      "Gyral parses template HTML and `raw()` markup through a Trusted Types policy named `gyral`. The page’s Content-Security-Policy has a `trusted-types` directive that lists allowed policy names without `gyral`, so the browser refused to create it. Gyral falls back to plain strings, which works only while the page doesn’t enforce Trusted Types (`require-trusted-types-for 'script'`). Development warns once.",
    fix: 'Add `gyral` to the policy list: `trusted-types gyral` (with your own policies, if any). If you don’t use Trusted Types, remove the `trusted-types` directive.',
  },
  // Errors (ADR 0024)
  73: {
    explanation:
      'A reducer threw while handling the named message. Nothing changed: the state stays as it was and the commands that reducer would have returned don’t run. It is reported as a `GyralError` (phase `update`), and the component’s `Errored` reducer, if any, receives it.',
    fix: 'Fix the exception in that reducer, using the `cause` of the reported error. Add an `Errored` reducer if the component should show an error state ([Error handling](/docs/error-handling/)).',
  },
  74: {
    explanation:
      'A component’s `init` threw, so it has no state. It renders its `error(failure, undefined)` view if its spec has one, or stays empty. The error is reported as a `GyralError` (phase `init`).',
    fix: 'Fix the exception in `init`, using the `cause` of the reported error; often a prop or seed read with an unexpected shape. Give the spec an `error` view for a visible fallback.',
  },
  75: {
    explanation:
      'An element hook’s `client` function threw. Gyral reported it (phase `hook`) and still ran the other hooks of that render; the element itself is in the DOM.',
    fix: 'Fix the exception in the hook, using the `cause` of the reported error.',
  },
  76: {
    explanation:
      'A store’s reducer threw while handling the named message. The store’s state is unchanged and its commands don’t run. The error is reported as a `GyralError` (phase `store`); the sender isn’t affected.',
    fix: 'Fix the exception in that store reducer, using the `cause` of the reported error.',
  },
  77: {
    explanation:
      'A component that reads the store threw while handling `StoreChanged`. The other subscribers were still notified and the store’s commands still ran.',
    fix: 'Fix the exception in that component’s `StoreChanged` reducer (or the code it calls), using the `cause` of the reported error.',
  },
  78: {
    explanation:
      'A component’s `init` or view threw during server rendering. It rendered its `error` view (or nothing), marked `data-gyral-error` and without a seed, and the rest of the page was sent; the browser starts that component fresh. `renderPage`’s `onError` received the error.',
    fix: "Fix the exception, using the error your `onError` received. Pass `onError: 'throw'` to `renderPage` if a failing component should fail the whole page instead, so the route can answer with its error page.",
  },
  79: {
    explanation:
      'The component’s `subscriptions` returned two commands in the same lane: the same `key`, or no key and the same driver. Gyral keeps one running command per lane, so only the first runs. Development warns.',
    fix: 'Give each subscription its own `key`, such as one per room or per URL.',
  },
  80: {
    explanation:
      'A subscription restarted again and again: its input changed with every message it sent, so each new state asked for a different input, which restarted it. Gyral stops after 100 rounds rather than loop.',
    fix: 'Keep a subscription’s input to what should restart it (an id, a URL), not values that its own messages change, such as a counter or a timestamp.',
  },
  85: {
    explanation:
      'A `call(selector, method, …args)` command failed after the render: no element of the component matched the selector, the element has no such method, or the method threw or rejected. The reported error’s `cause` says which. It is reported through the error channel (phase `command`).',
    fix: 'Check that the element is rendered when the command runs (return the command from the reducer whose new state renders it), that the selector matches inside the component’s own tree, and that the method exists on that element.',
  },
  86: {
    explanation:
      'Development checks that a `call()` command’s arguments are plain data that can be cloned (strings, numbers, arrays and plain objects). A function, an element or a class instance would make the command impossible to compare or record in a test.',
    fix: 'Pass plain data, and let the element look up anything else itself.',
  },
};

/** The page's Markdown. `html` builds headings with exact ids (`G0010`); the twin uses `###`. */
function errorsMarkdown(errors: readonly GyralError[], version: string): string {
  const missing = errors.filter((e) => ERROR_NOTES[e.code] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `src/content/errors.ts: no explanation for ${missing.map((e) => e.id).join(', ')}`,
    );
  }
  const groups = [...new Set(errors.map((e) => e.group))];
  const parts = [
    '# Error codes\n',
    'Development builds of `@gyral/core` print each diagnostic in full, ending with its code and a link to this page: `… (G0010: https://gyral.dev/errors/#G0010)`. Production builds print a short line instead, so the message texts stay out of your bundle: `Gyral`, the code, the message’s arguments in order, and the link.\n',
    '```text\nGyral G0010 my-cart Add https://gyral.dev/errors/#G0010\n```\n',
    'Read that one as: `<my-cart>` has no update for the message `Add`. Find the code below; its message shows where each argument goes. For the full sentence, reproduce the problem in development (the dev server, tests, a Vite build with `--mode development`, or another bundler with the `development` condition). A hydration mismatch keeps its own sentence in production and ends with its code and link.\n',
    `The codes and messages are read from \`@gyral/core\` ${version}, the version this site is built with; codes are never reused.\n`,
  ];
  for (const group of groups) {
    parts.push(`## ${group}\n`);
    for (const e of errors.filter((x) => x.group === group)) {
      const note = ERROR_NOTES[e.code] as ErrorNote;
      parts.push(
        `<h3 id="${e.id}"><a class="anchor" href="#${e.id}">${e.id}</a></h3>\n`,
        '```text',
        e.message,
        '```\n',
        e.args.length === 0
          ? 'Arguments: none.\n'
          : `Arguments: ${e.args.map((a) => `\`${a}\``).join(', ')}.\n`,
        `${note.explanation}\n`,
        `**Fix:** ${note.fix}\n`,
      );
    }
  }
  return parts.join('\n');
}

let page: Promise<DocPage> | undefined;

/** The errors page, as a generated docs page in the Reference section. */
export function loadErrorsPage(): Promise<readonly DocPage[]> {
  page ??= (async () => {
    const upcoming = process.env['GYRAL_ERRORS_JSON'] ? process.env['GYRAL_DOCS_VERSION'] : '';
    const version =
      upcoming ||
      (
        JSON.parse(
          readFileSync(
            join(realpathSync(join(NODE_MODULES, '@gyral', 'core')), 'package.json'),
            'utf8',
          ),
        ) as { version: string }
      ).version;
    const markdown = errorsMarkdown(readGyralErrors(), version);
    const { html, headings } = await renderMarkdown(markdown);
    return {
      slug: 'errors',
      path: ERRORS_PATH,
      title: 'Error codes',
      description:
        'Every code a production build of Gyral prints, such as G0010: what the message says, what it means and how to fix it.',
      useWhen:
        'a production build logs a code such as "Gyral G0010 …" and you need what it means and how to fix it',
      section: 'Reference',
      order: 5,
      draft: false,
      html,
      markdown: markdown.replace(
        /<h3 id="(G\d{4})"><a class="anchor" href="#G\d{4}">G\d{4}<\/a><\/h3>/g,
        '### $1',
      ),
      headings,
      source: 'https://github.com/gyraljs/gyral.dev/blob/main/src/content/errors.ts',
    };
  })();
  return page.then((p) => [p]);
}
