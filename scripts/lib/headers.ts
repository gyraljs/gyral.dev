// A reader for Cloudflare Pages' `_headers` file, enough for the preview server: path
// patterns with a trailing `*` and headers indented beneath them. Later matches add headers.

export interface HeaderRule {
  readonly pattern: string;
  readonly headers: readonly (readonly [string, string])[];
}

export function parseHeaders(text: string): readonly HeaderRule[] {
  const rules: { pattern: string; headers: [string, string][] }[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      rules.push({ pattern: line.trim(), headers: [] });
      continue;
    }
    const rule = rules.at(-1);
    const colon = line.indexOf(':');
    if (rule === undefined || colon === -1) throw new Error(`_headers: unexpected line "${line}"`);
    rule.headers.push([line.slice(0, colon).trim(), line.slice(colon + 1).trim()]);
  }
  return rules;
}

const matches = (pattern: string, path: string): boolean =>
  pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : pattern === path;

/** The headers for a path, in file order. */
export const headersFor = (rules: readonly HeaderRule[], path: string): [string, string][] =>
  rules
    .filter((r) => matches(r.pattern, path))
    .flatMap((r) => r.headers.map(([k, v]): [string, string] => [k, v]));
