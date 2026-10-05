// The examples gallery: every example in the Gyral repository (most are ports of the Cycle.js
// examples) plus gyral-shop. The code excerpts are copied from the real files by
// `pnpm sync:examples` into content/examples/, and `pnpm invariants` fails when they drift.

export interface Example {
  /** The directory under `examples/` in the Gyral repository; also the anchor on /examples/. */
  readonly slug: string;
  readonly title: string;
  /** The Cycle.js example it ports, if any. */
  readonly cycle?: string;
  readonly summary: string;
  /** Docs pages that explain what it shows: [label, path]. */
  readonly shows: readonly (readonly [string, string])[];
  /** The file shown as the excerpt, relative to the example's directory. */
  readonly file: string;
}

export interface ExampleGroup {
  readonly id: string;
  readonly title: string;
  readonly examples: readonly Example[];
}

export const EXAMPLE_GROUPS: readonly ExampleGroup[] = [
  {
    id: 'basics',
    title: 'Basics',
    examples: [
      {
        slug: 'hello-world',
        title: 'Hello world',
        cycle: 'basic/hello-world',
        summary: 'Type a name and see a greeting: one input intent, one reducer, one view.',
        shows: [['Intent', '/docs/intent/']],
        file: 'src/hello.ts',
      },
      {
        slug: 'counter',
        title: 'Counter',
        cycle: 'basic/counter',
        summary: 'Two buttons and a number. The smallest complete Model-View-Intent loop.',
        shows: [['Getting started', '/docs/getting-started/']],
        file: 'src/counter.ts',
      },
      {
        slug: 'checkbox',
        title: 'Checkbox',
        cycle: 'basic/checkbox',
        summary:
          'A checkbox whose state the model owns, bound with liveBoolean so it is right on the server and in the browser.',
        shows: [['Views', '/docs/views/#helpers-for-form-controls']],
        file: 'src/checkbox.ts',
      },
      {
        slug: 'hello-lastname',
        title: 'Hello, last name',
        cycle: 'intermediate/hello-lastname',
        summary:
          'Two fields and a greeting derived from state, where Cycle.js needed three streams to express valid and invalid input.',
        shows: [['Model and update', '/docs/update/']],
        file: 'src/hello-lastname.ts',
      },
      {
        slug: 'bmi',
        title: 'BMI calculator',
        cycle: 'basic/bmi-naive, intermediate/bmi-typescript',
        summary:
          'Range inputs parsed and bounded by a schema with field(), so the model only sees valid numbers.',
        shows: [['Forms', '/docs/forms/']],
        file: 'src/bmi.ts',
      },
    ],
  },
  {
    id: 'effects',
    title: 'Effects, time and HTTP',
    examples: [
      {
        slug: 'seconds-elapsed',
        title: 'Seconds elapsed',
        cycle: 'basic/jsx-seconds-elapsed, intermediate/tsx-seconds-elapsed',
        summary:
          'A periodic command started from init streams ticks until the component disconnects.',
        shows: [['Effects and drivers', '/docs/effects/#streaming-results-with-emit']],
        file: 'src/seconds-elapsed.ts',
      },
      {
        slug: 'http-random-user',
        title: 'Random user',
        cycle: 'basic/http-random-user',
        summary:
          'Randomness and HTTP as commands: pick a random id with randomInt, fetch the user, decode it with a schema.',
        shows: [['Effects and drivers', '/docs/effects/']],
        file: 'src/random-user.ts',
      },
      {
        slug: 'http-search-github',
        title: 'Search GitHub',
        cycle: 'intermediate/http-search-github',
        summary:
          'Search as you type: debounce() and a switch lane cancel stale requests, and late answers for old queries are ignored.',
        shows: [['Concurrency lanes', '/docs/effects/#concurrency-lanes']],
        file: 'src/search.ts',
      },
      {
        slug: 'autocomplete-search',
        title: 'Autocomplete',
        cycle: 'advanced/autocomplete-search',
        summary:
          'Wikipedia suggestions in a popover, with keyboard navigation through keydown intents and debounced requests.',
        shows: [['Intent', '/docs/intent/#trigger-events']],
        file: 'src/autocomplete.ts',
      },
      {
        slug: 'custom-driver',
        title: 'Custom driver',
        cycle: 'advanced/custom-driver',
        summary:
          'A canvas chart as a driver: one command draws, another streams the bars the user clicks.',
        shows: [['Writing a driver', '/docs/effects/#writing-a-driver']],
        file: 'src/chart-driver.ts',
      },
    ],
  },
  {
    id: 'composition',
    title: 'Components and shared state',
    examples: [
      {
        slug: 'bmi-nested',
        title: 'Nested BMI',
        cycle: 'advanced/bmi-nested',
        summary:
          'Two instances of one slider component. Props go down, outputs come up, and the parent owns the values.',
        shows: [['Child components', '/docs/components/#child-components-and-outputs']],
        file: 'src/bmi-nested.ts',
      },
      {
        slug: 'many',
        title: 'Many items',
        cycle: 'advanced/many',
        summary:
          'A list of child components rendered with repeat(), each removing or recolouring itself through outputs.',
        shows: [['Child components', '/docs/components/#child-components-and-outputs']],
        file: 'src/list.ts',
      },
      {
        slug: 'nested-folders',
        title: 'Nested folders',
        cycle: 'advanced/nested-folders',
        summary:
          'A folder that contains folders: a recursive component through child(() => Folder), each level owning its own children.',
        shows: [['Child components', '/docs/components/#child-components-and-outputs']],
        file: 'src/folder.ts',
      },
      {
        slug: 'shared-cart',
        title: 'Shared cart',
        summary:
          'A header badge, a product list and a cart panel, far apart on the page, sharing one store.',
        shows: [['Shared state', '/docs/stores/']],
        file: 'src/cart.ts',
      },
    ],
  },
  {
    id: 'platform',
    title: 'Routing, forms and the platform',
    examples: [
      {
        slug: 'routing-view',
        title: 'Routing',
        cycle: 'advanced/routing-view',
        summary:
          'A typed route table, listen() streaming every location, setTitle(), and a View Transition between pages.',
        shows: [['Routing', '/docs/routing/']],
        file: 'src/app.ts',
      },
      {
        slug: 'isomorphic',
        title: 'Isomorphic app',
        cycle: 'advanced/isomorphic',
        summary:
          'Rendered on the server with Declarative Shadow DOM, hydrated in place, with one route prerendered and one rendered per request.',
        shows: [['Server rendering', '/docs/server-rendering/']],
        file: 'src/app.ts',
      },
      {
        slug: 'register',
        title: 'Register',
        summary:
          'A sign-up form that validates the same way with and without JavaScript, including a server-only check.',
        shows: [['Forms', '/docs/forms/#the-server-half']],
        file: 'src/register.ts',
      },
      {
        slug: 'invoker-commands',
        title: 'Invoker commands',
        summary:
          'Buttons that send command and commandfor invokers to a list, with a fallback where browsers lack them.',
        shows: [['Intent', '/docs/intent/#invoker-commands']],
        file: 'src/shopping-list.ts',
      },
      {
        slug: 'animation',
        title: 'Animation',
        cycle: 'intermediate/animation',
        summary:
          'The model counts runs and CSS does the motion: no per-frame state, restarted with keyed().',
        shows: [['Views', '/docs/views/#lists']],
        file: 'src/animation.ts',
      },
      {
        slug: 'animated-letters',
        title: 'Animated letters',
        cycle: 'advanced/animated-letters',
        summary:
          'Letters you type grow in and shrink out. The model tracks which are present or leaving; CSS transitions animate.',
        shows: [['Model and update', '/docs/update/']],
        file: 'src/letters.ts',
      },
      {
        slug: 'devtools',
        title: 'Devtools demo',
        summary:
          'A small app that exercises the devtools panel: updates, a store and a command lane.',
        shows: [['Devtools', '/docs/devtools/']],
        file: 'src/demo.ts',
      },
    ],
  },
];

export const ALL_EXAMPLES: readonly Example[] = EXAMPLE_GROUPS.flatMap((g) => g.examples);

/** Where an excerpt is stored in this repo. */
export const excerptPath = (example: Example): string => `content/examples/${example.slug}.ts.txt`;

/**
 * The part of a source file worth reading on the page: the `styles` block and the global
 * `HTMLElementTagNameMap` declaration are left out (they're the same in every example).
 */
export function excerpt(source: string): string {
  const out: string[] = [];
  // While skipping: the indentation of the line that opened the block; it closes at the same
  // indentation (`styles: css\`` … \``, or `styles: [` … `],`, or `declare global {` … `}`).
  let closeAt: string | undefined;
  for (const line of source.split('\n')) {
    const indent = /^\s*/.exec(line)?.[0] ?? '';
    if (closeAt !== undefined) {
      if (indent === closeAt && /^\s*[`\]}]/.test(line)) closeAt = undefined;
      continue;
    }
    if (/^\s*styles: (css`|\[)\s*$/.test(line)) {
      out.push(`${indent}styles: css\`…\`,`);
      closeAt = indent;
    } else if (/^declare global \{/.test(line)) {
      closeAt = '';
    } else {
      out.push(line);
    }
  }
  return `${out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`;
}

/** Highlighted excerpts by slug, read from content/examples/ (server-only). */
export async function loadExcerpts(): Promise<ReadonlyMap<string, string>> {
  const { readFile } = await import('node:fs/promises');
  const { highlight } = await import('./markdown.js');
  const root = new URL('../../', import.meta.url);
  const entries = await Promise.all(
    ALL_EXAMPLES.map(async (example) => {
      const code = await readFile(new URL(excerptPath(example), root), 'utf8');
      return [example.slug, await highlight(code, 'ts')] as const;
    }),
  );
  return new Map(entries);
}
