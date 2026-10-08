// /errors/ must answer every link a production build of @gyral/core prints
// (`https://gyral.dev/errors/#G0010`), so it is checked against the installed package's own
// diagnostic table, not against a copy.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ERROR_NOTES,
  ERRORS_PATH,
  loadErrorsPage,
  messagesFile,
  readGyralErrors,
} from '../src/content/errors.js';
import { createSite } from '../src/render/site.js';
import { absolute } from '../src/site.js';

const assets = {
  stylesheet: '/assets/site.css',
  clientEntry: '/assets/entry.js',
  clientPreload: [],
  shortcuts: '/assets/shortcuts.js',
  demoVideos: '/assets/demo-videos.js',
};

describe('error codes', () => {
  const errors = readGyralErrors();

  it('reads the installed package’s table', () => {
    expect(errors.length).toBeGreaterThan(20);
    expect(errors.find((e) => e.id === 'G0010')).toMatchObject({
      group: 'Components',
      args: ['tag', 'message'],
    });
    expect(new Set(errors.map((e) => e.id)).size).toBe(errors.length);
  });

  it('links from production messages land on this page', () => {
    // message.js builds every production link from this constant.
    const message = readFileSync(join(dirname(messagesFile()), 'message.js'), 'utf8');
    const url = /ERRORS_URL = '([^']+)'/.exec(message)?.[1];
    expect(url).toBe(`${absolute(ERRORS_PATH)}#`);
  });

  it('explains every code, and only codes that exist', () => {
    const codes = errors.map((e) => e.code);
    expect(codes.filter((c) => ERROR_NOTES[c] === undefined)).toEqual([]);
    expect(
      Object.keys(ERROR_NOTES)
        .map(Number)
        .filter((c) => !codes.includes(c)),
    ).toEqual([]);
  });

  it('renders an anchor for every code in the package', async () => {
    const site = await createSite(assets);
    const res = await site.fetch(new Request(`http://localhost${ERRORS_PATH}`));
    expect(res.status).toBe(200);
    const html = await res.text();
    for (const e of errors) {
      expect(html.match(new RegExp(`id="${e.id}"`, 'g')), e.id).toHaveLength(1);
      expect(html).toContain(`href="#${e.id}"`);
    }
    expect(html).toContain('<a href="/errors/" aria-current="page">Error codes</a>');
    expect(html, 'the top nav marks Docs current').toContain(
      '<a href="/docs/" aria-current="page">Docs</a>',
    );
  });

  it('gives the Markdown twin a heading per code and no HTML', async () => {
    const [page] = await loadErrorsPage();
    for (const e of errors) expect(page?.markdown).toContain(`\n### ${e.id}\n`);
    expect(page?.markdown).not.toMatch(/<h3/);
  });
});
