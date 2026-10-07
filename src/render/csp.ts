// The site's Content-Security-Policy (docs/design-docs/0003-hosting.md, "Headers"). Built at
// build time and written into dist/_headers (scripts/build.ts), which Cloudflare Pages applies
// to every page and `pnpm preview`/`pnpm smoke` apply too.
//
// style-src has no 'unsafe-inline': @gyral/ssr's contentSecurityPolicy() adds the SHA-256 hash
// of each island's Declarative Shadow DOM <style>, code blocks are coloured by classes
// (src/content/markdown.ts) and the brand swatches are SVG fills. JSON-LD and hydration seeds
// are data, not script, so script-src stays 'self'; 'wasm-unsafe-eval' lets the search index
// (Pagefind, WebAssembly) compile, and allows neither eval() nor inline script.
import { contentSecurityPolicy, type CspDirectives } from '@gyral/ssr';
// Registers the islands, so their <style> hashes are in the policy.
import '../islands/loop-counter.js';
import '../islands/site-search.js';

export const CSP_DIRECTIVES: CspDirectives = {
  'default-src': "'self'",
  'script-src': "'self' 'wasm-unsafe-eval'",
  'img-src': "'self' data:",
  'font-src': "'self'",
  'connect-src': "'self'",
  'base-uri': "'none'",
  'form-action': "'self'",
  'frame-ancestors': "'none'",
  'object-src': "'none'",
  'upgrade-insecure-requests': '',
};

/** The header value: the directives above plus `style-src 'self' 'sha256-…'…`. */
export const siteCsp = (): Promise<string> => contentSecurityPolicy({ directives: CSP_DIRECTIVES });
