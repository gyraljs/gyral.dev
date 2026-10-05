import { describe, expect, it } from 'vitest';
import { loadApiPages } from '../src/content/api.js';
import { loadPosts } from '../src/content/blog.js';
import { byReadingOrder, loadDocs } from '../src/content/docs.js';
import { absoluteLinks, buildLlmsFiles, twinPath, type LlmsFiles } from '../src/content/llms.js';
import { llmsProblems, markdownProblems, prose } from '../src/content/llms-check.js';

describe('Markdown for agents', () => {
  it('makes site links absolute outside code blocks only', () => {
    const md = 'See [Intent](/docs/intent/) and [x](//cdn).\n\n```md\n[keep](/docs/)\n```\n';
    expect(absoluteLinks(md)).toBe(
      'See [Intent](https://gyral.dev/docs/intent/) and [x](//cdn).\n\n```md\n[keep](/docs/)\n```\n',
    );
  });

  it('ignores HTML inside code but reports it in prose', () => {
    expect(prose('a `<b>` c\n```html\n<p>x</p>\n```\nd')).toBe('a  c\nd');
    expect(markdownProblems('x.md', '# T\n\n```html\n<p>ok</p>\n```\n')).toEqual([]);
    expect(markdownProblems('x.md', '# T\n\nraw <div class="x">here</div>\n')).toEqual([
      'x.md: HTML tag in prose: <div class="x">',
    ]);
    expect(markdownProblems('x.md', '# T\n\nvalue ${s.count} [object Object]\n')).toHaveLength(2);
    expect(markdownProblems('x.md', 'no heading\n')).toEqual(['x.md: must start with an H1']);
  });

  it('reports pages missing from llms-full.txt or their twin, and dead llms.txt links', () => {
    const files: LlmsFiles = {
      twins: [
        {
          page: '/docs/a/',
          path: twinPath('/docs/a/'),
          title: 'A',
          description: 'a',
          markdown: '# A\n',
        },
      ],
      llmsTxt: '# Gyral\n\n- [A](https://gyral.dev/docs/a/index.md)\n- [B](https://gyral.dev/b/)\n',
      llmsFull: '# Gyral\n\nSource: https://gyral.dev/docs/a/\n',
    };
    const written = new Set(['/docs/a/index.md']);
    expect(llmsProblems(files, ['/docs/a/', '/docs/b/'], (p) => written.has(p))).toEqual([
      '/docs/b/ has no Markdown twin',
      '/docs/b/ is missing from llms-full.txt',
      "/llms.txt links https://gyral.dev/b/, which the build didn't write",
    ]);
  });

  it('covers every real docs and API page, with clean Markdown', async () => {
    const docs = [...(await loadDocs()), ...(await loadApiPages())].sort(byReadingOrder);
    const files = await buildLlmsFiles('0.1.0', docs, await loadPosts());
    const written = new Set([
      ...files.twins.map((t) => t.path),
      '/brand/index.html',
      '/llms-full.txt',
    ]);
    expect(
      llmsProblems(
        files,
        docs.map((d) => d.path),
        (p) => written.has(p),
      ),
    ).toEqual([]);
    expect(files.llmsTxt).toMatch(/^# Gyral\n\n> /);
    expect(files.llmsTxt).toContain('## API reference');
    expect(files.llmsTxt).toContain('/plugin install gyral@gyral');
    expect(files.llmsFull).toContain('Source: https://gyral.dev/docs/api/core/');
    expect(files.llmsFull).toContain('#### `define`');
  });
});
