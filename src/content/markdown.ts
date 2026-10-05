// Markdown → HTML for the docs, at build time only (never shipped to the browser).
// - Code blocks are highlighted by Shiki with both themes as CSS variables; the stylesheet
//   picks one with light-dark(), so code follows the colour scheme without JavaScript.
// - Headings get stable ids and a self-link, and h2/h3 are collected for the page outline.
import { Marked, type Tokens } from 'marked';
import { createHighlighter, type Highlighter } from 'shiki';

export interface Heading {
  readonly depth: 2 | 3;
  readonly id: string;
  readonly text: string;
}

export interface Rendered {
  readonly html: string;
  readonly headings: readonly Heading[];
}

const LANGS = ['ts', 'js', 'html', 'css', 'sh', 'json'] as const;
const THEMES = { light: 'github-light-default', dark: 'github-dark-default' } as const;

let highlighter: Promise<Highlighter> | undefined;
const getHighlighter = (): Promise<Highlighter> =>
  (highlighter ??= createHighlighter({ themes: Object.values(THEMES), langs: [...LANGS] }));

/** `Getting started!` → `getting-started`. */
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const isLang = (lang: string): lang is (typeof LANGS)[number] =>
  (LANGS as readonly string[]).includes(lang);

/** One highlighted code block, as the docs render it (a `<figure class="code">`). */
export async function highlight(code: string, lang: (typeof LANGS)[number]): Promise<string> {
  const shiki = await getHighlighter();
  const html = shiki.codeToHtml(code.trim(), { lang, themes: THEMES, defaultColor: false });
  return `<figure class="code" data-lang="${lang}">${html}</figure>`;
}

export async function renderMarkdown(source: string): Promise<Rendered> {
  const shiki = await getHighlighter();
  const headings: Heading[] = [];
  const used = new Map<string, number>();

  const marked = new Marked({
    gfm: true,
    renderer: {
      heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token) {
        const inner = this.parser.parseInline(token.tokens);
        if (token.depth === 1) return `<h1>${inner}</h1>\n`;
        const base = slugify(inner) || 'section';
        const seen = used.get(base) ?? 0;
        used.set(base, seen + 1);
        const id = seen === 0 ? base : `${base}-${String(seen)}`;
        if (token.depth === 2 || token.depth === 3) {
          headings.push({ depth: token.depth, id, text: inner.replace(/<[^>]+>/g, '') });
        }
        return `<h${String(token.depth)} id="${id}"><a class="anchor" href="#${id}">${inner}</a></h${String(token.depth)}>\n`;
      },
      code(token) {
        const lang = (token.lang ?? '').split(/\s/)[0] ?? '';
        const label = lang === '' ? 'text' : lang;
        const highlighted = isLang(lang)
          ? shiki.codeToHtml(token.text, { lang, themes: THEMES, defaultColor: false })
          : `<pre class="shiki"><code>${escapeHtml(token.text)}</code></pre>`;
        return `<figure class="code" data-lang="${escapeHtml(label)}">${highlighted}</figure>\n`;
      },
      link(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token) {
        const inner = this.parser.parseInline(token.tokens);
        const external = /^https?:\/\//.test(token.href);
        const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
        const rel = external ? ' rel="external"' : '';
        return `<a href="${escapeHtml(token.href)}"${title}${rel}>${inner}</a>`;
      },
    },
  });

  const html = await marked.parse(source);
  return { html, headings };
}
