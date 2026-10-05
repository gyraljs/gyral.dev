import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from '../src/content/frontmatter.js';
import { renderMarkdown, slugify } from '../src/content/markdown.js';
import { loadAllDocs, loadDoc, loadDocs } from '../src/content/docs.js';

describe('front matter', () => {
  it('reads strings, numbers and booleans', () => {
    const { data, body } = parseFrontmatter(
      '---\ntitle: "Hi: there"\norder: 2\ndraft: true\n---\n# Body\n',
    );
    expect(data).toEqual({ title: 'Hi: there', order: 2, draft: true });
    expect(body).toBe('# Body\n');
  });

  it('passes through a file without front matter', () => {
    expect(parseFrontmatter('# Only body').data).toEqual({});
  });
});

describe('markdown', () => {
  it('gives headings unique ids and self-links, and collects the outline', async () => {
    const { html, headings } = await renderMarkdown(
      '# T\n\n## Set up\n\n### Set up\n\n## `code` here\n',
    );
    expect(html).toContain('<h1>T</h1>');
    expect(html).toContain('<h2 id="set-up"><a class="anchor" href="#set-up">Set up</a></h2>');
    expect(html).toContain('id="set-up-1"');
    expect(headings.map((h) => h.id)).toEqual(['set-up', 'set-up-1', 'code-here']);
  });

  it('highlights known languages with both themes and escapes unknown ones', async () => {
    const { html } = await renderMarkdown('```ts\nconst a = 1;\n```\n\n```text\n<b>\n```\n');
    expect(html).toContain('data-lang="ts"');
    expect(html).toContain('--shiki-dark');
    expect(html).toContain('&lt;b&gt;');
  });

  it('marks external links', async () => {
    const { html } = await renderMarkdown('[a](https://x.dev) [b](/docs/)');
    expect(html).toContain('<a href="https://x.dev" rel="external">a</a>');
    expect(html).toContain('<a href="/docs/">b</a>');
  });

  it('slugifies', () => {
    expect(slugify('Getting started!')).toBe('getting-started');
  });
});

describe('docs collection', () => {
  it('rejects a page with a bad header, naming the file', async () => {
    await expect(loadDoc('x.md', '---\ntitle: X\n---\n')).rejects.toThrow('content/docs/x.md');
    await expect(
      loadDoc('x.md', '---\ntitle: X\ndescription: d\nsection: Nope\norder: 1\n---\n'),
    ).rejects.toThrow('section must be one of');
  });

  it('keeps drafts out of the shipped pages', async () => {
    const all = await loadAllDocs();
    const shipped = await loadDocs();
    expect(shipped.every((p) => !p.draft)).toBe(true);
    expect(shipped.length).toBeLessThan(all.length);
    expect(shipped.map((p) => p.path)).toContain('/docs/getting-started/');
  });

  it('gives every page a unique path and a description', async () => {
    const all = await loadAllDocs();
    expect(new Set(all.map((p) => p.path)).size).toBe(all.length);
    expect(all.every((p) => p.description.length >= 50)).toBe(true);
  });
});
