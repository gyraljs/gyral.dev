// The blog: every `content/blog/*.md` file is one post, newest first. Server-only (reads files).
// Front matter: title, description (50–160 characters), date (YYYY-MM-DD), author.
import { readdir, readFile } from 'node:fs/promises';
import { parseFrontmatter } from './frontmatter.js';
import { renderMarkdown } from './markdown.js';

export interface Post {
  readonly slug: string;
  /** `/blog/introducing-gyral/`. */
  readonly path: string;
  readonly title: string;
  readonly description: string;
  /** `YYYY-MM-DD`. */
  readonly date: string;
  readonly author: string;
  readonly html: string;
}

export const BLOG_DIR = new URL('../../content/blog/', import.meta.url);

/** Parses and validates one post. Errors name the file. */
export async function loadPost(file: string, source: string): Promise<Post> {
  const { data, body } = parseFrontmatter(source);
  const fail = (why: string): never => {
    throw new Error(`content/blog/${file}: ${why}`);
  };
  const { title, description, date, author } = data;
  if (typeof title !== 'string' || title === '') fail('front matter needs a title');
  if (typeof description !== 'string' || description.length < 50 || description.length > 160)
    fail('description must be 50–160 characters');
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    fail('date must be YYYY-MM-DD');
  if (typeof author !== 'string' || author === '') fail('front matter needs an author');
  const slug = file.replace(/\.md$/, '');
  const { html } = await renderMarkdown(body);
  return {
    slug,
    path: `/blog/${slug}/`,
    title: title as string,
    description: description as string,
    date: date as string,
    author: author as string,
    html,
  };
}

/** Every post, newest first. */
export async function loadPosts(dir: URL = BLOG_DIR): Promise<readonly Post[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
  const posts = await Promise.all(
    files.map(async (f) => loadPost(f, await readFile(new URL(f, dir), 'utf8'))),
  );
  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

/** `2026-10-05` → `5 October 2026`, the same on every machine. */
export const longDate = (date: string): string =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
