// Drivers for the search island. Pagefind's index is built from dist/ at build time
// (scripts/build.ts) and served as static files under /pagefind/; nothing here runs on the
// server (commands never do) and nothing loads until the search page hydrates.
import { command, defineDriver, type Command } from '@gyral/core';

/** One search result, ready for the view. */
export interface Hit {
  readonly url: string;
  readonly title: string;
  /** Which part of the site: Docs, API, Examples or Blog. */
  readonly area: string;
  /** The excerpt split into plain text and matched (`mark`) runs: no HTML reaches the view. */
  readonly excerpt: readonly { readonly text: string; readonly mark: boolean }[];
}

interface PagefindSubResult {
  readonly title: string;
  readonly url: string;
  readonly excerpt: string;
  readonly locations?: readonly number[];
}

interface PagefindResult {
  readonly url: string;
  readonly excerpt: string;
  readonly meta: { readonly title?: string };
  readonly sub_results?: readonly PagefindSubResult[];
}

interface Pagefind {
  readonly options: (options: { readonly baseUrl: string }) => Promise<void>;
  readonly search: (query: string) => Promise<{
    readonly results: readonly { readonly data: () => Promise<PagefindResult> }[];
  } | null>;
}

/** The index lives next to the pages; a variable keeps Vite from bundling it. */
const PAGEFIND_URL = '/pagefind/pagefind.js';
const MAX_HITS = 12;
let loaded: Promise<Pagefind> | undefined;
const loadPagefind = (): Promise<Pagefind> => {
  loaded ??= (import(/* @vite-ignore */ PAGEFIND_URL) as Promise<Pagefind>).then(async (pf) => {
    await pf.options({ baseUrl: '/' });
    return pf;
  });
  return loaded;
};

const ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
};
const decode = (text: string): string =>
  text.replace(/&(?:amp|lt|gt|quot|#39|#x27);/g, (entity) => ENTITIES[entity] ?? entity);

/** Pagefind marks matches with `<mark>`; everything else in an excerpt is escaped text. */
export const splitExcerpt = (excerpt: string): Hit['excerpt'] =>
  excerpt
    .split(/(<mark>.*?<\/mark>)/)
    .filter((part) => part !== '')
    .map((part) =>
      part.startsWith('<mark>')
        ? { text: decode(part.slice(6, -7)), mark: true }
        : { text: decode(part), mark: false },
    );

export const areaOf = (url: string): string =>
  url.startsWith('/docs/api/')
    ? 'API'
    : url.startsWith('/docs/')
      ? 'Docs'
      : url.startsWith('/examples/')
        ? 'Examples'
        : url.startsWith('/what-you-can-build/')
          ? 'Demos'
          : url.startsWith('/blog/')
            ? 'Blog'
            : 'Site';

/** Link to the section with the most matches (a heading anchor) when there is one. */
export const toHit = (d: PagefindResult): Hit => {
  const page = d.meta.title ?? d.url;
  const best = [...(d.sub_results ?? [])].sort(
    (a, b) => (b.locations?.length ?? 0) - (a.locations?.length ?? 0),
  )[0];
  const deep = best !== undefined && best.url !== d.url && best.title !== page;
  return {
    url: deep ? best.url : d.url,
    title: deep ? `${page} › ${best.title}` : page,
    area: areaOf(d.url),
    excerpt: splitExcerpt(deep ? best.excerpt : d.excerpt),
  };
};

const pagefind = defineDriver<string, readonly Hit[], string>({
  name: 'pagefind',
  concurrency: 'switch',
  run: async (query) => {
    const pf = await loadPagefind();
    const found = await pf.search(query);
    const data = await Promise.all(
      (found?.results ?? []).slice(0, MAX_HITS).map((result) => result.data()),
    );
    return data.map(toHit);
  },
  toError: () => 'The search index could not be loaded.',
});

/** Searches the site index; a newer query cancels the one in flight. */
export const search = <M>(
  query: string,
  found: (hits: readonly Hit[]) => M,
  failed: (reason: string) => M,
): Command<M> => command(pagefind, query, { onSuccess: found, onFailure: failed });

const searchLocation = defineDriver<undefined, string>({
  name: 'search-location',
  run: () => new URLSearchParams(window.location.search).get('q') ?? '',
});

/** Reads `?q=` once, so links and the header form land on results. */
export const readQuery = <M>(toMsg: (query: string) => M): Command<M> =>
  command(searchLocation, undefined, { onSuccess: toMsg });

const searchHistory = defineDriver<string, undefined>({
  name: 'search-history',
  concurrency: 'switch',
  run: (query) => {
    const url = new URL(window.location.href);
    if (query === '') url.searchParams.delete('q');
    else url.searchParams.set('q', query);
    window.history.replaceState(null, '', url);
    return undefined;
  },
});

/** Keeps `?q=` in the address bar in step with the box, so a results page can be shared. */
export const writeQuery = <M>(query: string): Command<M> =>
  command<string, undefined, unknown, M>(searchHistory, query, { onSuccess: () => undefined });
