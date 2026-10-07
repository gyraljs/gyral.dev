// A reader for Cloudflare Pages' `_redirects` file, enough for the preview server and tests:
// one `from to [status]` rule per line with exact paths (no splats or placeholders), comments
// starting with `#`. The first matching rule wins, as on Cloudflare.

export interface RedirectRule {
  readonly from: string;
  readonly to: string;
  readonly status: number;
}

const STATUSES = new Set([301, 302, 303, 307, 308]);

export function parseRedirects(text: string): readonly RedirectRule[] {
  const rules: RedirectRule[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const [from, to, code, ...rest] = trimmed.split(/\s+/);
    const status = code === undefined ? 302 : Number(code);
    if (from === undefined || to === undefined || rest.length > 0 || !STATUSES.has(status))
      throw new Error(`_redirects: unexpected line "${line}"`);
    if (from.includes('*') || from.includes(':'))
      throw new Error(`_redirects: splats and placeholders aren't supported: "${line}"`);
    rules.push({ from, to, status });
  }
  return rules;
}

/** The rule for a path, if any. */
export const redirectFor = (
  rules: readonly RedirectRule[],
  path: string,
): RedirectRule | undefined => rules.find((r) => r.from === path);
