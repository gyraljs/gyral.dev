// `<lastmod>` dates for sitemap.xml, only where they are known: a blog post's front-matter
// `date`, and a Markdown docs page's last commit. Generated pages (API reference, errors) and
// the other pages get none rather than a guess.
import { spawnSync } from 'node:child_process';
import type { Post } from '../../src/content/blog.js';
import type { DocPage } from '../../src/content/docs.js';

/** Runs git; `undefined` when it isn't there or fails. */
export type Git = (args: readonly string[]) => string | undefined;

export const runGit: Git = (args) => {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : undefined;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Each file's last commit date (`YYYY-MM-DD`). Empty without git or in a shallow clone, where
 * every file would get the clone's date; files never committed are left out.
 */
export function lastCommitDates(files: readonly string[], git: Git = runGit): Map<string, string> {
  const dates = new Map<string, string>();
  if (git(['rev-parse', '--is-shallow-repository']) !== 'false') return dates;
  for (const file of files) {
    const day = git(['log', '-1', '--format=%cs', '--', file]);
    if (day !== undefined && DAY.test(day)) dates.set(file, day);
  }
  return dates;
}

/**
 * Page path → `<lastmod>` for the pages whose date is known. A post dated after `today` (one
 * published ahead of its date) gets none: a modification date can't be in the future.
 */
export function sitemapDates(
  docs: readonly DocPage[],
  posts: readonly Post[],
  git: Git = runGit,
  today: string = new Date().toISOString().slice(0, 10),
): Map<string, string> {
  const files = new Map(
    docs.filter((d) => d.source === undefined).map((d) => [`content/docs/${d.slug}.md`, d.path]),
  );
  const dates = new Map<string, string>();
  for (const [file, day] of lastCommitDates([...files.keys()], git)) {
    const path = files.get(file);
    if (path !== undefined) dates.set(path, day);
  }
  for (const post of posts) {
    if (DAY.test(post.date) && post.date <= today) dates.set(post.path, post.date);
  }
  return dates;
}
