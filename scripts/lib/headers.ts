// A reader for Cloudflare Pages' `_headers` file, enough for the preview server: path
// patterns with one `*` splat (`/assets/*`, `/*.md`) and headers indented beneath them. Later
// matches add headers; `! Name` under a rule detaches a header that a more general rule set
// (Cloudflare's documented syntax: https://developers.cloudflare.com/pages/configuration/headers/).

export interface HeaderRule {
  readonly pattern: string;
  readonly headers: readonly (readonly [string, string])[];
  /** Header names this rule removes (`! Content-Security-Policy`), lower case. */
  readonly detach: readonly string[];
}

export function parseHeaders(text: string): readonly HeaderRule[] {
  const rules: { pattern: string; headers: [string, string][]; detach: string[] }[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      rules.push({ pattern: line.trim(), headers: [], detach: [] });
      continue;
    }
    const rule = rules.at(-1);
    const detach = /^\s+!\s*([\w-]+)\s*$/.exec(line);
    if (rule !== undefined && detach?.[1] !== undefined) {
      rule.detach.push(detach[1].toLowerCase());
      continue;
    }
    const colon = line.indexOf(':');
    if (rule === undefined || colon === -1) throw new Error(`_headers: unexpected line "${line}"`);
    rule.headers.push([line.slice(0, colon).trim(), line.slice(colon + 1).trim()]);
  }
  return rules;
}

const matches = (pattern: string, path: string): boolean => {
  const splat = pattern.indexOf('*');
  if (splat === -1) return pattern === path;
  const [before, after] = [pattern.slice(0, splat), pattern.slice(splat + 1)];
  return (
    path.length >= before.length + after.length && path.startsWith(before) && path.endsWith(after)
  );
};

/** The headers for a path, in file order, without those a matching rule detaches. */
export function headersFor(rules: readonly HeaderRule[], path: string): [string, string][] {
  const matching = rules.filter((r) => matches(r.pattern, path));
  const detached = new Set(matching.flatMap((r) => r.detach));
  return matching
    .flatMap((r) => r.headers.map(([k, v]): [string, string] => [k, v]))
    .filter(([k]) => !detached.has(k.toLowerCase()));
}

/**
 * `_headers` with a Content-Security-Policy added to the `/*` rule (scripts/build.ts: the
 * policy carries style hashes, so it is computed at build time, not written in public/).
 */
export function withCsp(text: string, csp: string): string {
  const lines = text.split('\n');
  const at = lines.findIndex((line) => line.trimEnd() === '/*');
  if (at === -1) throw new Error('_headers: no "/*" rule to add the Content-Security-Policy to');
  if (/^\s+content-security-policy:/im.test(text))
    throw new Error('_headers: public/_headers must not set a Content-Security-Policy itself');
  lines.splice(at + 1, 0, `  Content-Security-Policy: ${csp}`);
  return lines.join('\n');
}
