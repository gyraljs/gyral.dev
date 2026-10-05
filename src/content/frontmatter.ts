// A tiny front-matter reader for the docs: `key: value` lines between `---` fences. Values are
// strings, numbers or booleans. Anything richer belongs in code, not in a page's header.

export type FrontValue = string | number | boolean;

export interface Parsed {
  readonly data: Readonly<Record<string, FrontValue>>;
  readonly body: string;
}

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const scalar = (raw: string): FrontValue => {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  const quoted = /^(['"])(.*)\1$/.exec(value);
  return quoted?.[2] ?? value;
};

export function parseFrontmatter(source: string): Parsed {
  const match = FENCE.exec(source);
  if (match === null) return { data: {}, body: source };
  const data: Record<string, FrontValue> = {};
  for (const line of (match[1] ?? '').split(/\r?\n/)) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon === -1) throw new Error(`front matter: expected "key: value", got "${line}"`);
    data[line.slice(0, colon).trim()] = scalar(line.slice(colon + 1));
  }
  return { data, body: source.slice(match[0].length) };
}
