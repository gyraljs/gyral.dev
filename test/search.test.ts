import { describe, expect, it } from 'vitest';
import { areaOf, splitExcerpt, toHit } from '../src/islands/pagefind.js';

describe('search results', () => {
  it('splits Pagefind excerpts into text and marks, decoding entities', () => {
    expect(splitExcerpt('a <mark>formAction</mark> &amp; &lt;form&gt;')).toEqual([
      { text: 'a ', mark: false },
      { text: 'formAction', mark: true },
      { text: ' & <form>', mark: false },
    ]);
  });

  it('labels the part of the site', () => {
    expect(areaOf('/docs/api/core/')).toBe('API');
    expect(areaOf('/docs/intent/')).toBe('Docs');
    expect(areaOf('/examples/')).toBe('Examples');
    expect(areaOf('/what-you-can-build/')).toBe('Demos');
    expect(areaOf('/blog/introducing-gyral/')).toBe('Blog');
  });

  it('links to the section with the most matches', () => {
    const hit = toHit({
      url: '/docs/forms/',
      excerpt: 'page',
      meta: { title: 'Forms' },
      sub_results: [
        { title: 'Forms', url: '/docs/forms/', excerpt: 'top', locations: [1] },
        {
          title: 'The server half',
          url: '/docs/forms/#the-server-half',
          excerpt: '<mark>formAction</mark>',
          locations: [5, 9, 12],
        },
      ],
    });
    expect(hit).toEqual({
      url: '/docs/forms/#the-server-half',
      title: 'Forms › The server half',
      area: 'Docs',
      excerpt: [{ text: 'formAction', mark: true }],
    });
  });
});
