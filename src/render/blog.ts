// The blog index (/blog/) and post pages (/blog/<slug>/). No JavaScript.
import { serverHtml } from '@gyral/ssr';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { longDate, type Post } from '../content/blog.js';
import { absolute, SITE_NAME } from '../site.js';
import type { PageMeta } from './layout.js';

export const blogMeta: PageMeta = {
  path: '/blog/',
  title: 'Blog',
  description:
    'News and writing about Gyral: releases, design decisions, and what we learn building it.',
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: `${SITE_NAME} blog`,
      url: absolute('/blog/'),
    },
  ],
};

export const blogBody = (posts: readonly Post[]) => serverHtml`
  <section class="page-intro" aria-labelledby="blog-title">
    <h1 id="blog-title">Blog</h1>
    <p>News and writing about Gyral.</p>
  </section>
  <section class="post-list" aria-label="Posts">
    <ol role="list">
      ${posts.map(
        (p) => serverHtml`<li>
          <article aria-labelledby=${`post-${p.slug}`}>
            <h2 id=${`post-${p.slug}`}><a href=${p.path}>${p.title}</a></h2>
            <p class="byline"><time datetime=${p.date}>${longDate(p.date)}</time> · ${p.author}</p>
            <p>${p.description}</p>
          </article>
        </li>`,
      )}
    </ol>
  </section>
`;

export const postMeta = (post: Post): PageMeta => ({
  path: post.path,
  title: post.title,
  description: post.description,
  type: 'article',
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      url: absolute(post.path),
      author: { '@type': 'Person', name: post.author },
      publisher: { '@type': 'Person', name: 'Mike Zupper' },
      isPartOf: { '@type': 'Blog', name: `${SITE_NAME} blog`, url: absolute('/blog/') },
    },
  ],
});

export const postBody = (post: Post) => serverHtml`
  <article class="post prose" aria-labelledby="post-title">
    <header>
      <p class="eyebrow"><a href="/blog/">Blog</a></p>
      <h1 id="post-title">${post.title}</h1>
      <p class="byline"><time datetime=${post.date}>${longDate(post.date)}</time> · ${post.author}</p>
    </header>
    ${unsafeHTML(post.html.replace(/^<h1>.*?<\/h1>\n?/, ''))}
    <footer>
      <p><a href="/blog/">More posts</a></p>
    </footer>
  </article>
`;
