// Machine-readable copies of the site for AI agents and other tools, written at build time
// (scripts/build.ts; docs/design-docs/0002-content.md, "For agents"):
// - `/llms.txt`: an index in the llmstxt.org format, linking each page's Markdown twin.
// - `/llms-full.txt`: every docs page, the API reference and the examples in one file.
// - `<page>/index.md`: a Markdown twin of every docs, API, examples and blog page. Each HTML
//   page links its twin with `<link rel="alternate" type="text/markdown">`.
// Server-only (reads files).
import { readFile } from 'node:fs/promises';
import { SECTIONS, type DocPage } from './docs.js';
import type { Post } from './blog.js';
import { loadDemos, usualWay } from './demos.js';
import { EXAMPLE_GROUPS, excerptPath } from './examples.js';
import { absolute, DESCRIPTION, LINKS, ORIGIN } from '../site.js';

/** One Markdown file written next to an HTML page. */
export interface Twin {
  /** The HTML page's path, `/docs/intent/`. */
  readonly page: string;
  /** Where the twin is written, `/docs/intent/index.md`. */
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly markdown: string;
}

export interface LlmsFiles {
  readonly twins: readonly Twin[];
  readonly llmsTxt: string;
  readonly llmsFull: string;
}

/** The Markdown twin of an HTML page path. */
export const twinPath = (page: string): string => `${page}index.md`;

const EXAMPLES_SOURCE = `${LINKS.github}/tree/main/examples`;
const FENCE = /^(`{3,}|~{3,})/;

/**
 * Site-relative links (`](/docs/x/)`) become absolute, so a twin read on its own, or pasted
 * into an agent's context, still points somewhere real. Code blocks are left alone.
 */
export function absoluteLinks(markdown: string): string {
  let fence: string | undefined;
  return markdown
    .split('\n')
    .map((line) => {
      const open = FENCE.exec(line.trimStart())?.[1];
      if (open !== undefined) {
        if (fence === undefined) fence = open;
        else if (open.startsWith(fence)) fence = undefined;
        return line;
      }
      return fence === undefined ? line.replace(/\]\(\/(?!\/)/g, `](${ORIGIN}/`) : line;
    })
    .join('\n');
}

/** A page as a standalone Markdown document: H1, summary, source URL, then the body. */
function document(title: string, description: string, page: string, body: string): string {
  const withoutH1 = body.replace(/^\s*# [^\n]*\n+/, '');
  return `# ${title}\n\n> ${description}\n\nSource: ${absolute(page)}\n\n${absoluteLinks(withoutH1).trim()}\n`;
}

const docTwin = (doc: DocPage): Twin => {
  const title = doc.slug === 'index' ? 'Gyral documentation' : doc.title;
  return {
    page: doc.path,
    path: twinPath(doc.path),
    title,
    description: doc.description,
    markdown: document(title, doc.description, doc.path, doc.markdown),
  };
};

const postTwin = (post: Post): Twin => ({
  page: post.path,
  path: twinPath(post.path),
  title: post.title,
  description: post.description,
  markdown: document(
    post.title,
    post.description,
    post.path,
    `By ${post.author}, ${post.date}.\n\n${post.markdown.replace(/^\s*# [^\n]*\n+/, '')}`,
  ),
});

const blogIndexTwin = (posts: readonly Post[]): Twin => {
  const description = 'News and writing about Gyral.';
  const body = posts
    .map((p) => `- [${p.title}](${twinPath(p.path)}) (${p.date}): ${p.description}`)
    .join('\n');
  return {
    page: '/blog/',
    path: twinPath('/blog/'),
    title: 'Gyral blog',
    description,
    markdown: document('Gyral blog', description, '/blog/', body),
  };
};

/** The examples gallery as Markdown, with each example's code excerpt. */
async function examplesTwin(root: URL): Promise<Twin> {
  const description =
    'Gyral examples, from a counter to a server-rendered app: ports of the Cycle.js examples with their source, plus gyral-shop.';
  const parts: string[] = [];
  for (const group of EXAMPLE_GROUPS) {
    parts.push(`## ${group.title}\n`);
    for (const example of group.examples) {
      const code = await readFile(new URL(excerptPath(example), root), 'utf8');
      const shows = example.shows.map(([label, href]) => `[${label}](${href})`).join(', ');
      parts.push(
        `### ${example.title}\n`,
        `${example.summary}\n`,
        [
          `- Source: ${EXAMPLES_SOURCE}/${example.slug}`,
          ...(example.cycle === undefined ? [] : [`- Ports Cycle.js \`${example.cycle}\``]),
          ...(shows === '' ? [] : [`- Explained in: ${shows}`]),
        ].join('\n') + '\n',
        `\`${example.file}\`:\n`,
        '```ts',
        code.trimEnd(),
        '```\n',
      );
    }
  }
  parts.push(
    '## A whole application\n',
    `[gyral-shop](${LINKS.shop}) is a department store built with Gyral: catalog, search, cart, checkout, accounts and an admin area, server-rendered with forms that work without JavaScript, and four switchable themes.\n`,
  );
  return {
    page: '/examples/',
    path: twinPath('/examples/'),
    title: 'Gyral examples',
    description,
    markdown: document('Gyral examples', description, '/examples/', parts.join('\n')),
  };
}

/** /what-you-can-build/ as text: what each recording shows, for readers who can't watch it. */
async function demosTwin(): Promise<Twin> {
  const page = '/what-you-can-build/';
  const description =
    'What Gyral makes easy, shown as short recordings of examples: undo and replay, type-ahead without stale results, and pages that work before JavaScript.';
  const intro =
    'Gyral treats every interaction as data. That makes these easy. Each demo is a recording of an example in the Gyral repository; the text below describes what each recording shows.';
  const parts = [`${intro}\n`];
  for (const demo of await loadDemos()) {
    parts.push(
      `## ${demo.title}\n`,
      `${demo.pitch}\n`,
      `The usual way: ${usualWay(demo.usual)}\n`,
      ...demo.scenes.map(
        (scene) =>
          `${scene.label === undefined ? 'The recording' : `Recording (${scene.label})`}: ${scene.description}\n`,
      ),
      `- Source: ${EXAMPLES_SOURCE}/${demo.slug}\n- Explained in: [${demo.docs[0]}](${demo.docs[1]})\n`,
    );
  }
  return {
    page,
    path: twinPath(page),
    title: 'What you can build with Gyral',
    description,
    markdown: document('What you can build with Gyral', description, page, parts.join('\n')),
  };
}

const link = (twin: Twin): string =>
  `- [${twin.title}](${absolute(twin.path)}): ${twin.description}`;

/** `/llms.txt`, in the llmstxt.org format. */
export function llmsTxt(
  version: string,
  docs: readonly Twin[],
  api: readonly Twin[],
  examples: readonly Twin[],
  optional: readonly Twin[],
): string {
  return `# Gyral

> ${DESCRIPTION} Components are standard custom elements rendered by Gyral's own view layer: messages come in from DOM events (intent), a pure \`update\` makes the next state and describes side effects as data (commands run by drivers), and a pure \`view\` renders it. Pages render on the server or prerender to static HTML and hydrate in place. The public API is plain TypeScript. Current version: ${version}.

Start a project with \`npm create gyral@latest my-app -- --template ssr\` (or \`--template basic\`). In Claude Code, install the Gyral skill with \`/plugin marketplace add gyraljs/gyral\`, then \`/plugin install gyral@gyral\`. Every link below is a Markdown page; ${absolute('/llms-full.txt')} has the docs, API reference and examples in one file.

## Docs

${docs.map(link).join('\n')}

## API reference

${api.map(link).join('\n')}

## Examples

${examples.map(link).join('\n')}

## Optional

${optional.map(link).join('\n')}
- [Brand and press](${absolute('/brand/')}): logos, colours and trademark guidelines (HTML).
- [Source code](${LINKS.github}): the Gyral repository on GitHub.
`;
}

/** `/llms-full.txt`: the docs in reading order, then the API reference, then the examples. */
export function llmsFull(version: string, twins: readonly Twin[]): string {
  const header = `# Gyral ${version}: complete documentation\n\n> ${DESCRIPTION}\n\nGenerated from ${ORIGIN}. Each section below is one page; its source URL follows its title.\n`;
  return [header, ...twins.map((t) => t.markdown)].join('\n---\n\n');
}

/** Everything written for agents, from the same content the HTML pages use. */
export async function buildLlmsFiles(
  version: string,
  pages: readonly DocPage[],
  posts: readonly Post[],
  root: URL = new URL('../../', import.meta.url),
): Promise<LlmsFiles> {
  const ordered = [...pages].sort(
    (a, b) => SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section) || a.order - b.order,
  );
  const docTwins = ordered.map(docTwin);
  const isApi = (t: Twin) => t.page.startsWith('/docs/api/') && t.page !== '/docs/api/';
  const isBackground = (t: Twin) =>
    ordered.find((p) => p.path === t.page)?.section === 'Background';
  const guides = docTwins.filter((t) => !isApi(t) && !isBackground(t));
  const api = docTwins.filter(isApi);
  const background = docTwins.filter(isBackground);
  const examples = await examplesTwin(root);
  const demos = await demosTwin();
  const postTwins = posts.map(postTwin);
  const blog = blogIndexTwin(posts);
  return {
    twins: [...docTwins, examples, demos, blog, ...postTwins],
    llmsTxt: llmsTxt(version, guides, api, [examples, demos], [...background, blog, ...postTwins]),
    llmsFull: llmsFull(version, [...guides, ...api, ...background, examples, demos]),
  };
}
