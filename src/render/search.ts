// /search/: the results page the header form submits to. The island does the searching in the
// browser (src/islands/site-search.ts); without JavaScript the page says so and links the docs.
// Not in the sitemap and not indexed: a results page has no content of its own.
import { html } from '@gyral/core';
import type { PageMeta } from './layout.js';
import '../islands/site-search.js'; // registers <gd-site-search> for server rendering

export const searchMeta: PageMeta = {
  path: '/search/',
  title: 'Search',
  description: 'Search the Gyral documentation, API reference, examples and blog.',
  islands: true,
  noindex: true,
};

export const searchBody = () => html`
  <section class="page-intro search-page" aria-labelledby="search-title">
    <h1 id="search-title">Search</h1>
    <gd-site-search></gd-site-search>
  </section>
`;
