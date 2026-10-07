// The error codes page, /errors/. Production builds of @gyral/core print a short line instead of
// a message, `Gyral G0010 my-cart Add https://gyral.dev/errors/#G0010`, so this page must have
// an anchor for every code (test/errors.test.ts). The codes, their groups and their texts come
// from the installed package's own table (dist/view/messages.js, which Gyral's
// docs/references/errors.json is generated from), so they can't drift; the explanations and
// fixes below are the site's. Server-only (reads files).
import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import type { DocPage } from './docs.js';
import { renderMarkdown } from './markdown.js';

export const ERRORS_PATH = '/errors/';

const NODE_MODULES = fileURLToPath(new URL('../../node_modules/', import.meta.url));

/** One diagnostic from the package's table. */
export interface GyralError {
  /** `G0010`, the anchor on this page. */
  readonly id: string;
  readonly code: number;
  /** The `// Group` comment it follows in the table: Components, Props, … */
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

const placeholders = (text: string): string[] => [
  ...new Set(Array.from(text.matchAll(/\{(\w+)\}/g), (m) => m[1] ?? '')),
];

/** A string literal, or literals joined with `+`. */
function evalString(node: ts.Expression, source: ts.SourceFile): string {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return evalString(node.left, source) + evalString(node.right, source);
  }
  if (ts.isParenthesizedExpression(node)) return evalString(node.expression, source);
  throw new Error(`messages.js: not a plain string: ${node.getText(source)}`);
}

/** Where the installed @gyral/core keeps its diagnostic table (not an exported entry point). */
export const messagesFile = (): string =>
  join(realpathSync(join(NODE_MODULES, '@gyral', 'core')), 'dist', 'view', 'messages.js');

/** Every diagnostic in the installed @gyral/core, in table order. */
export function readGyralErrors(file: string = messagesFile()): readonly GyralError[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const errors: GyralError[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(source) === 'MESSAGES' &&
      node.initializer !== undefined
    ) {
      let table = node.initializer;
      while (ts.isAsExpression(table) || ts.isParenthesizedExpression(table)) {
        table = table.expression;
      }
      if (!ts.isObjectLiteralExpression(table)) throw new Error('messages.js: MESSAGES moved');
      let group = '';
      for (const property of table.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        for (const c of ts.getLeadingCommentRanges(source.text, property.pos) ?? []) {
          group = source.text.slice(c.pos + 2, c.end).trim();
        }
        const code = Number(property.name.getText(source));
        const message = evalString(property.initializer, source);
        errors.push({ id: codeName(code), code, group, message, args: placeholders(message) });
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (errors.length === 0) throw new Error(`no MESSAGES table in ${file}`);
  return errors;
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
    fix: 'Render the component on the server through `@gyral/ssr` (`page()`, `renderToString`) or `@gyral/core/server`, instead of constructing it.',
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
      'A component declares props named after built-in element properties (`hidden`, `title`, `id`). The prop would replace the platform’s property, so setting it would change how the element behaves. Development throws; production warns.',
    fix: 'Rename the props.',
  },
  // Scheduling
  30: {
    explanation:
      'A callback Gyral deferred to a microtask threw: delivering a child component’s output to its parent. The parent may not have received the output.',
    fix: 'Look at the error logged with this message, and make sure the parent’s `child()` mapper and any `gyral-output` listener don’t throw.',
  },
  31: {
    explanation:
      'A component’s `view` threw during a render. Gyral logs it and keeps rendering the other components, so this one’s DOM shows its previous state.',
    fix: 'Fix the exception in the view, using the error logged with this message. It is often a field read on state that has a different shape than the view expects.',
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
      'A command’s `onSuccess` or `onFailure` mapper threw while turning a driver’s result into a message, so the result never reached `update`.',
    fix: 'Make the mapper total: return a message, or `undefined`, for every input.',
  },
  41: {
    explanation:
      'A driver failed, after its `retry` policy, and the command has no `onFailure`. The failure is dropped, so the component can’t react: a spinner may spin forever.',
    fix: 'Give the command an `onFailure` that turns the error into a message, and handle that message in `update`.',
  },
  42: {
    explanation:
      'The function (or `unsubscribe()`) a `subscription()` returned threw when Gyral released the source, so the source may still be sending values or holding listeners.',
    fix: 'Make the stop function that `subscribe` returns safe to call once, and return a function or an object with `unsubscribe()`.',
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
    fix: 'Let `@gyral/ssr` write the seed (`page({ stores })`, or the provider’s `.instances`) instead of writing it by hand, and check that nothing rewrites or truncates the HTML on its way.',
  },
  53: {
    explanation:
      'A component read a store during a server render without a store scope. On the server each request needs its own store instances, and without a scope Gyral can’t tell whose state to read.',
    fix: 'Render through `@gyral/ssr` and pass the request’s instances: `page({ stores })` or `renderToString(value, { stores })`.',
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
      'The server’s HTML differs from the first client render, so the component can’t be hydrated in place. Development throws `HydrationMismatch`, naming the template’s file and line; production keeps the sentence (the component, the DOM path, what was expected and found), ends it with this code, and renders the component fresh (G0063).',
    fix: 'Make the view render the same on both sides: no `Date.now()`, random numbers or locale-dependent formatting in `view` (put them in state through a command). Also rule out a browser extension or script that changed the DOM before hydration, and a stale cached page.',
  },
  63: {
    explanation:
      'Production only: after a hydration mismatch (G0062, which follows in the same warning), Gyral cleared this component and rendered it fresh. The rest of the page stays hydrated, but this component flashes and redoes the server’s work.',
    fix: 'Fix the mismatch the warning describes; reproducing it in development gives the full message and the template’s location.',
  },
  // Templates
  70: {
    explanation:
      'A bundle built with the Vite preset leaves out the runtime template preparer, so every `html` template must be precompiled, and this one wasn’t. The build normally fails before this can happen.',
    fix: 'Import `html` (and `svg`) from `@gyral/core`, or from a package listed in the compiler’s `sources`, and use it directly as a tag: the compiler can’t follow an alias, a call or a re-export.',
  },
  71: {
    explanation:
      'A page shell, a template with `<!doctype>`, `<html>`, `<head>` or `<body>`, was rendered in the browser. Only the server renders document-level tags. Development reports it as template rule 11, with the full explanation.',
    fix: 'Render the page shell on the server (`@gyral/ssr`’s `page()`, or `@gyral/core/server`), and render only components in the browser.',
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
    'Development builds of `@gyral/core` print each diagnostic in full. Production builds print a short line instead, so the message texts stay out of your bundle: `Gyral`, the code, the message’s arguments in order, and a link to this page.\n',
    '```text\nGyral G0010 my-cart Add https://gyral.dev/errors/#G0010\n```\n',
    'Read that one as: `<my-cart>` has no update for the message `Add`. Find the code below; its message shows where each argument goes. For the full sentence, reproduce the problem in development (the dev server, tests, or a build with `--mode development`). A hydration mismatch keeps its own sentence in production and ends with its code and link.\n',
    `The codes and messages are read from \`@gyral/core\` ${version}, the version this site is built with; codes are never reused. Production builds print them since 0.3.1 (see [Migrating from 0.3.0 to 0.3.1](/docs/migrating-0-3-0-to-0-3-1/#short-error-messages-in-production)).\n`,
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
    const version = (
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
