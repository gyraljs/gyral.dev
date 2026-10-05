import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from '../src/content/frontmatter.js';
import { renderMarkdown, slugify } from '../src/content/markdown.js';
import { loadAllDocs, loadDoc, loadDocs } from '../src/content/docs.js';
import { API_PACKAGES, loadApiPages } from '../src/content/api.js';
import { longDate, loadPost, loadPosts } from '../src/content/blog.js';
import { ALL_EXAMPLES, excerpt } from '../src/content/examples.js';

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

  it('keeps outline text plain: "Parse, don\'t validate" isn\'t escaped twice', async () => {
    const { headings } = await renderMarkdown("## Parse, don't validate\n\n### A <b>&</b> B\n");
    expect(headings.map((h) => h.text)).toEqual(["Parse, don't validate", 'A & B']);
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
    const dir = await mkdtemp(join(tmpdir(), 'gyral-docs-'));
    const page = (draft: boolean) =>
      `---\ntitle: T\ndescription: ${'d'.repeat(60)}\nsection: Guides\norder: 1\ndraft: ${String(draft)}\n---\n# T\n`;
    await writeFile(join(dir, 'ready.md'), page(false));
    await writeFile(join(dir, 'later.md'), page(true));
    const url = pathToFileURL(`${dir}/`);
    expect((await loadAllDocs(url)).map((p) => p.slug).sort()).toEqual(['later', 'ready']);
    expect((await loadDocs(url)).map((p) => p.slug)).toEqual(['ready']);
    expect((await loadDocs()).map((p) => p.path)).toContain('/docs/getting-started/');
  });

  it('gives every page a unique path and a description', async () => {
    const all = await loadAllDocs();
    expect(new Set(all.map((p) => p.path)).size).toBe(all.length);
    expect(all.filter((p) => p.description.length < 50 || p.description.length > 160)).toEqual([]);
  });
});

describe('blog', () => {
  it('validates front matter, naming the file', async () => {
    await expect(loadPost('p.md', '---\ntitle: P\n---\n')).rejects.toThrow('content/blog/p.md');
    await expect(
      loadPost(
        'p.md',
        `---\ntitle: P\ndescription: ${'d'.repeat(60)}\ndate: 5 Oct\nauthor: A\n---\n`,
      ),
    ).rejects.toThrow('date must be YYYY-MM-DD');
  });

  it('lists posts newest first with a fixed date format', async () => {
    const posts = await loadPosts();
    expect(posts.length).toBeGreaterThan(0);
    expect([...posts].sort((a, b) => b.date.localeCompare(a.date))).toEqual(posts);
    expect(longDate('2026-10-05')).toBe('5 October 2026');
  });
});

describe('examples', () => {
  it('leaves out styles blocks and the global tag map', () => {
    const source = [
      "import { css, define } from '@gyral/core';",
      "export const X = define('x', {",
      '  view: () => null,',
      '  styles: [',
      '    shared,',
      '    css`',
      '      p { color: red; }',
      '    `,',
      '  ],',
      '});',
      '',
      'declare global {',
      '  interface HTMLElementTagNameMap {',
      "    'x-x': unknown;",
      '  }',
      '}',
      '',
    ].join('\n');
    expect(excerpt(source)).toBe(
      [
        "import { css, define } from '@gyral/core';",
        "export const X = define('x', {",
        '  view: () => null,',
        '  styles: css`…`,',
        '});',
        '',
      ].join('\n'),
    );
  });

  it('has a unique slug per example', () => {
    expect(new Set(ALL_EXAMPLES.map((e) => e.slug)).size).toBe(ALL_EXAMPLES.length);
  });
});

describe('API reference', () => {
  it('generates a page per package, with every entry point', async () => {
    const pages = await loadApiPages();
    expect(pages.map((p) => p.path)).toEqual(API_PACKAGES.map((p) => `/docs/api/${p.name}/`));
    const core = pages[0];
    expect(core?.html).toContain('<code>define</code>');
    expect(core?.html).toContain('@gyral/core/vite');
    expect(core?.headings.map((h) => h.text)).toContain('Functions');
  });
});
