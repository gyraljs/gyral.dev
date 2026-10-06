// Checks on the files written for agents (src/content/llms.ts). The build fails on any problem
// (scripts/build.ts), so a page can't silently drop out of llms-full.txt or lose its twin.
import { ORIGIN } from '../site.js';
import { twinPath, type LlmsFiles } from './llms.js';

/** Prose only: fenced code blocks and inline code spans removed. */
export function prose(markdown: string): string {
  let fence: string | undefined;
  const lines: string[] = [];
  for (const line of markdown.split('\n')) {
    const open = /^(`{3,}|~{3,})/.exec(line.trimStart())?.[1];
    if (open !== undefined) {
      if (fence === undefined) fence = open;
      else if (open.startsWith(fence)) fence = undefined;
      continue;
    }
    if (fence === undefined) lines.push(line.replace(/(`+).+?\1(?!`)/g, ''));
  }
  return lines.join('\n');
}

const HTML_TAG = /<\/?[a-z][\w-]*(?:\s[^<>]*)?\/?>/i;
const LEFTOVERS = [/\$\{/, /\[object Object\]/, /\]\(undefined\)/, /\bNaN\b/, /<\?/];

/** Problems in one Markdown file: HTML tags or template leftovers in its prose. */
export function markdownProblems(name: string, markdown: string): string[] {
  const text = prose(markdown);
  const problems: string[] = [];
  const tag = HTML_TAG.exec(text);
  if (tag !== null) problems.push(`${name}: HTML tag in prose: ${tag[0]}`);
  for (const pattern of LEFTOVERS) {
    const hit = pattern.exec(text);
    if (hit !== null) problems.push(`${name}: template leftover "${hit[0]}"`);
  }
  if (!markdown.startsWith('# ')) problems.push(`${name}: must start with an H1`);
  return problems;
}

/** Absolute links on the site's origin, from Markdown link targets. */
export const siteLinks = (markdown: string): string[] =>
  [...prose(markdown).matchAll(/\]\((https:\/\/gyral\.dev\/[^)\s#]*)/g)].map((m) => m[1] ?? '');

/**
 * Every problem with the generated files.
 * - `docPaths`: every docs page that ships; each needs a twin and a section in llms-full.txt.
 * - `exists(path)`: whether the build wrote a file at a site path (`/docs/x/index.md`).
 */
export function llmsProblems(
  files: LlmsFiles,
  docPaths: readonly string[],
  exists: (path: string) => boolean,
): string[] {
  const problems: string[] = [];
  const twins = new Map(files.twins.map((t) => [t.page, t]));
  for (const path of docPaths) {
    if (!twins.has(path)) problems.push(`${path} has no Markdown twin`);
    if (!files.llmsFull.includes(`Source: ${ORIGIN}${path}\n`))
      problems.push(`${path} is missing from llms-full.txt`);
  }
  for (const twin of files.twins) {
    if (twin.path !== twinPath(twin.page)) problems.push(`${twin.page}: twin at ${twin.path}`);
    problems.push(...markdownProblems(twin.path, twin.markdown));
  }
  problems.push(...markdownProblems('/llms.txt', files.llmsTxt));
  problems.push(...markdownProblems('/llms-full.txt', files.llmsFull));
  for (const url of siteLinks(files.llmsTxt)) {
    const path = url.slice(ORIGIN.length);
    const file = path.endsWith('/') ? `${path}index.html` : path;
    if (!exists(file)) problems.push(`/llms.txt links ${url}, which the build didn't write`);
  }
  return problems;
}
