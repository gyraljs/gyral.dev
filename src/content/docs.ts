// The docs collection: every `content/docs/*.md` file is one page. Server-only (reads files).
// A page marked `draft: true` is kept out of the build, the navigation and the sitemap until
// it is written; each draft has a bead (docs/design-docs/0002-content.md).
import { readdir, readFile } from 'node:fs/promises';
import { parseFrontmatter } from './frontmatter.js';
import { renderMarkdown, type Heading } from './markdown.js';

/** Sidebar sections, in display order. A page's `section` must be one of these. */
export const SECTIONS = ['Start here', 'Guides', 'Reference', 'Background'] as const;
export type Section = (typeof SECTIONS)[number];

export interface DocPage {
  /** `getting-started`; the docs home is `index`. */
  readonly slug: string;
  /** `/docs/getting-started/` (always a trailing slash). */
  readonly path: string;
  readonly title: string;
  /** The meta description and the summary on the docs home. */
  readonly description: string;
  readonly section: Section;
  readonly order: number;
  readonly draft: boolean;
  readonly html: string;
  readonly headings: readonly Heading[];
  /** Where the page's content comes from, when it isn't a Markdown file (generated pages). */
  readonly source?: string;
}

export const DOCS_DIR = new URL('../../content/docs/', import.meta.url);

const isSection = (value: unknown): value is Section =>
  typeof value === 'string' && (SECTIONS as readonly string[]).includes(value);

/** Parses and validates one page. Errors name the file, so a bad header fails the build clearly. */
export async function loadDoc(file: string, source: string): Promise<DocPage> {
  const { data, body } = parseFrontmatter(source);
  const slug = file.replace(/\.md$/, '');
  const fail = (why: string): never => {
    throw new Error(`content/docs/${file}: ${why}`);
  };
  const { title, description, section, order, draft = false } = data;
  if (typeof title !== 'string' || title === '') fail('front matter needs a title');
  if (typeof description !== 'string' || description === '') fail('needs a description');
  if (!isSection(section)) fail(`section must be one of: ${SECTIONS.join(', ')}`);
  if (typeof order !== 'number') fail('order must be a number');
  if (typeof draft !== 'boolean') fail('draft must be true or false');
  const { html, headings } = await renderMarkdown(body);
  return {
    slug,
    path: slug === 'index' ? '/docs/' : `/docs/${slug}/`,
    title: title as string,
    description: description as string,
    section: section as Section,
    order: order as number,
    draft: draft as boolean,
    html,
    headings,
  };
}

/** Sidebar order: by section, then `order`, then title. */
export const byReadingOrder = (a: DocPage, b: DocPage): number =>
  SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section) ||
  a.order - b.order ||
  a.title.localeCompare(b.title);

/** Every page, drafts included, in reading order. */
export async function loadAllDocs(dir: URL = DOCS_DIR): Promise<readonly DocPage[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
  const pages = await Promise.all(
    files.map(async (f) => loadDoc(f, await readFile(new URL(f, dir), 'utf8'))),
  );
  return pages.sort(byReadingOrder);
}

/** The pages that ship: drafts removed. */
export async function loadDocs(dir: URL = DOCS_DIR): Promise<readonly DocPage[]> {
  return (await loadAllDocs(dir)).filter((p) => !p.draft);
}
