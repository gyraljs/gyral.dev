import { describe, expect, it } from 'vitest';
import { loadApiPages } from '../src/content/api.js';
import { loadErrorsPage } from '../src/content/errors.js';
import { loadPosts } from '../src/content/blog.js';
import { byReadingOrder, loadDocs } from '../src/content/docs.js';
import {
  absoluteLinks,
  buildLlmsFiles,
  LLMS_SMALL_MAX,
  twinPath,
  type LlmsFiles,
} from '../src/content/llms.js';
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
      llmsTxt: [
        '# Gyral\n\n## Docs\n',
        '- [Gyral for coding agents](https://gyral.dev/llms-small.txt): Use when coding.',
        '- [A](https://gyral.dev/docs/a/index.md): Use when a.',
        '- [B](https://gyral.dev/b/): Use when b.\n',
      ].join('\n'),
      llmsFull: '# Gyral\n\nSource: https://gyral.dev/docs/a/\n',
      llmsSmall: '# Small\n',
    };
    const written = new Set(['/docs/a/index.md', '/llms-small.txt']);
    expect(llmsProblems(files, ['/docs/a/', '/docs/b/'], (p) => written.has(p))).toEqual([
      '/docs/b/ has no Markdown twin',
      '/docs/b/ is missing from llms-full.txt',
      "/llms.txt links https://gyral.dev/b/, which the build didn't write",
    ]);
  });

  it('covers every real docs and API page, with clean Markdown', async () => {
    const docs = [
      ...(await loadDocs()),
      ...(await loadApiPages()),
      ...(await loadErrorsPage()),
    ].sort(byReadingOrder);
    const files = await buildLlmsFiles('0.1.0', docs, await loadPosts());
    const written = new Set([
      ...files.twins.map((t) => t.path),
      '/brand/index.html',
      '/llms-full.txt',
      '/llms-small.txt',
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
    // The agent pack: first in llms.txt, small, and the recipes expanded from their files.
    expect(files.llmsTxt).toMatch(
      /## Docs\n\n- \[Gyral for coding agents\]\(https:\/\/gyral\.dev\/llms-small\.txt\)/,
    );
    expect(Buffer.byteLength(files.llmsSmall)).toBeLessThanOrEqual(LLMS_SMALL_MAX);
    expect(files.llmsSmall).toContain('// src/todo-app.ts');
    expect(files.llmsSmall).toContain('// src/account-form.ts');
    expect(files.llmsSmall).toContain(
      '### Toggling an item in a filtered list changes the wrong item',
    );
    expect(files.llmsSmall).not.toContain('<!-- include:');
  });

  it('flags an oversized pack and a pack that is not first', () => {
    const files: LlmsFiles = {
      twins: [],
      llmsTxt: '# Gyral\n\n## Docs\n\n- [A](https://gyral.dev/a.md): no use case\n',
      llmsFull: '# Gyral\n',
      llmsSmall: `# Small\n\n${'x'.repeat(LLMS_SMALL_MAX)}\n`,
    };
    expect(llmsProblems(files, [], () => true)).toEqual([
      `/llms-small.txt is ${String(LLMS_SMALL_MAX + 10)} bytes, over the ${String(LLMS_SMALL_MAX)}-byte limit: shorten content/llms-small.md or what it includes`,
      '/llms.txt: llms-small.txt must be the first entry',
    ]);
  });
});
