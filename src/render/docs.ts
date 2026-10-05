// Docs pages: sidebar, the rendered Markdown, an outline of the page, previous/next links.
// Docs pages ship no JavaScript.
import { nothing } from 'lit';
import { serverHtml } from '@gyral/ssr';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { SECTIONS, type DocPage } from '../content/docs.js';
import { absolute, LINKS, SITE_NAME } from '../site.js';
import type { PageMeta } from './layout.js';

/** Where a page's source lives, for the "Edit this page" link. */
export const SOURCE_REPO = 'https://github.com/gyraljs/gyral.dev';

export function docMeta(doc: DocPage): PageMeta {
  const crumbs = [
    { name: 'Docs', path: '/docs/' },
    ...(doc.slug === 'index' ? [] : [{ name: doc.title, path: doc.path }]),
  ];
  return {
    path: doc.path,
    title: doc.slug === 'index' ? 'Documentation' : doc.title,
    description: doc.description,
    type: 'article',
    searchable: true,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: doc.title,
        description: doc.description,
        url: absolute(doc.path),
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absolute('/') },
        author: { '@type': 'Person', name: 'Mike Zupper' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, n) => ({
          '@type': 'ListItem',
          position: n + 1,
          name: c.name,
          item: absolute(c.path),
        })),
      },
    ],
  };
}

const sidebar = (docs: readonly DocPage[], current: DocPage) => serverHtml`
  <nav class="docs-nav" aria-label="Documentation" data-pagefind-ignore>
    ${SECTIONS.map((section) => {
      const pages = docs.filter((d) => d.section === section);
      if (pages.length === 0) return nothing;
      const id = `nav-${section.toLowerCase().replace(/\s+/g, '-')}`;
      return serverHtml`<section aria-labelledby=${id}>
        <h2 id=${id}>${section}</h2>
        <ul role="list">
          ${pages.map(
            (p) => serverHtml`<li>
              <a href=${p.path} aria-current=${p.path === current.path ? 'page' : nothing}
                >${p.slug === 'index' ? 'Overview' : p.title}</a>
            </li>`,
          )}
        </ul>
      </section>`;
    })}
  </nav>
`;

const outline = (doc: DocPage) =>
  doc.headings.length < 2
    ? nothing
    : serverHtml`<nav class="outline" aria-labelledby="outline-title" data-pagefind-ignore>
        <h2 id="outline-title">On this page</h2>
        <ol role="list">
          ${doc.headings.map(
            (h) => serverHtml`<li data-depth=${h.depth}><a href=${`#${h.id}`}>${h.text}</a></li>`,
          )}
        </ol>
      </nav>`;

const pager = (docs: readonly DocPage[], doc: DocPage) => {
  const at = docs.findIndex((d) => d.path === doc.path);
  const prev = at > 0 ? docs[at - 1] : undefined;
  const next = at >= 0 && at < docs.length - 1 ? docs[at + 1] : undefined;
  if (prev === undefined && next === undefined) return nothing;
  return serverHtml`<nav class="pager" aria-label="Previous and next page">
    ${prev === undefined ? nothing : serverHtml`<a rel="prev" href=${prev.path}><span>Previous</span> ${prev.title}</a>`}
    ${next === undefined ? nothing : serverHtml`<a rel="next" href=${next.path}><span>Next</span> ${next.title}</a>`}
  </nav>`;
};

/** The docs home lists every page under its section, with its description. */
const docsIndex = (docs: readonly DocPage[]) => serverHtml`
  ${SECTIONS.map((section) => {
    const pages = docs.filter((d) => d.section === section && d.slug !== 'index');
    if (pages.length === 0) return nothing;
    return serverHtml`<section class="doc-section">
      <h2>${section}</h2>
      <ul role="list" class="doc-cards">
        ${pages.map(
          (p) => serverHtml`<li>
            <a href=${p.path}><strong>${p.title}</strong></a>
            <p>${p.description}</p>
          </li>`,
        )}
      </ul>
    </section>`;
  })}
`;

export function docBody(docs: readonly DocPage[], doc: DocPage): unknown {
  return serverHtml`
    <div class="docs">
      ${sidebar(docs, doc)}
      <article class="doc prose">
        ${unsafeHTML(doc.html)}
        ${doc.slug === 'index' ? docsIndex(docs) : nothing}
        <footer class="doc-footer" data-pagefind-ignore>
          <p>
            ${
              doc.source === undefined
                ? serverHtml`<a href=${`${SOURCE_REPO}/edit/main/content/docs/${doc.slug}.md`} rel="external"
                  >Edit this page on GitHub</a
                >`
                : serverHtml`<a href=${doc.source} rel="external">View the source on GitHub</a>`
            }
            · <a href=${`${LINKS.github}/issues`} rel="external">Report a problem</a>
          </p>
          ${pager(docs, doc)}
        </footer>
      </article>
      ${outline(doc)}
    </div>
  `;
}
