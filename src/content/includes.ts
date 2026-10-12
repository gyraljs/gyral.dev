// Shared content, written once. A docs page (or content/llms-small.md) pulls in another file
// with a line of its own, instead of a copy that could drift:
// - `<!-- include: recipes/todo-app.ts.txt -->` becomes a fenced code block with the file's text
//   (the language is the extension before `.txt`). The recipes are typechecked and tested
//   from these files (scripts/check-snippets.mjs, scripts/check-recipes.mjs).
// - `<!-- include: docs/recipes.md#a-todo-list-with-filters -->` becomes that section of a page:
//   its heading and everything up to the next heading of the same or a higher level, with the
//   section's own includes expanded. The id is the heading's anchor on the rendered page.
// Paths are relative to content/. Server-only (reads files).
import { readFile } from 'node:fs/promises';
import { slugify } from './markdown.js';

export const CONTENT_DIR = new URL('../../content/', import.meta.url);

const INCLUDE = /^<!-- include: ([\w./-]+)(?:#([\w-]+))? -->$/;
const FENCE = /^(`{3,}|~{3,})/;
const MAX_DEPTH = 3;

/** One section of a Markdown document, by its heading's anchor id. */
export function section(markdown: string, id: string): string | undefined {
  const lines = markdown.split('\n');
  let fence: string | undefined;
  let start = -1;
  let depth = 0;
  for (const [n, line] of lines.entries()) {
    const open = FENCE.exec(line.trimStart())?.[1];
    if (open !== undefined) {
      if (fence === undefined) fence = open;
      else if (open.startsWith(fence)) fence = undefined;
      continue;
    }
    if (fence !== undefined) continue;
    const heading = /^(#{1,6}) (.*)$/.exec(line);
    if (heading === null) continue;
    const level = heading[1]?.length ?? 0;
    if (start === -1) {
      if (slugify(heading[2] ?? '') === id) {
        start = n;
        depth = level;
      }
    } else if (level <= depth) {
      return lines.slice(start, n).join('\n').trimEnd();
    }
  }
  return start === -1 ? undefined : lines.slice(start).join('\n').trimEnd();
}

/** Replaces every include line in `markdown` with what it names. Throws on a missing target. */
export async function expandIncludes(
  markdown: string,
  from = 'content',
  root: URL = CONTENT_DIR,
  depth = 0,
): Promise<string> {
  if (!markdown.includes('<!-- include:')) return markdown;
  if (depth > MAX_DEPTH)
    throw new Error(`${from}: includes nested more than ${String(MAX_DEPTH)} deep`);
  const out: string[] = [];
  for (const line of markdown.split('\n')) {
    const match = INCLUDE.exec(line.trim());
    if (match === null) {
      out.push(line);
      continue;
    }
    const [, path = '', id] = match;
    const text = await readFile(new URL(path, root), 'utf8').catch(() => {
      throw new Error(`${from}: include names ${path}, which doesn't exist in content/`);
    });
    if (id === undefined) {
      const lang = /\.(\w+)\.txt$/.exec(path)?.[1] ?? /\.(\w+)$/.exec(path)?.[1] ?? '';
      out.push(`\`\`\`${lang}`, text.trimEnd(), '```');
      continue;
    }
    const part = section(text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, ''), id);
    if (part === undefined) throw new Error(`${from}: ${path} has no section #${id}`);
    out.push(await expandIncludes(part, path, root, depth + 1));
  }
  return out.join('\n');
}
