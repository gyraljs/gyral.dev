// The API reference, generated at build time from the Gyral packages the site depends on, so it
// can't drift from the code. For each package entry point (`@gyral/core`, `@gyral/ssr/static`,
// …) the TypeScript compiler lists the exports; each one is shown with its declaration as
// written (bodies removed) and its doc comment. Server-only (reads files, runs the compiler).
import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import type { DocPage } from './docs.js';
import { renderMarkdown, slugify } from './markdown.js';

/** Every published package and its public entry points, in reading order. */
export const API_PACKAGES = [
  { name: 'core', entries: ['.', './vite'] },
  { name: 'http', entries: ['.', './testing'] },
  { name: 'router', entries: ['.'] },
  { name: 'time', entries: ['.'] },
  { name: 'ssr', entries: ['.', './hydrate', './static'] },
  { name: 'testing', entries: ['.', './arbitraries'] },
  { name: 'devtools', entries: ['.'] },
] as const;

const SOURCE = 'https://github.com/gyraljs/gyral/tree/main/packages';
const NODE_MODULES = fileURLToPath(new URL('../../node_modules/', import.meta.url));

interface PackageJson {
  readonly name: string;
  readonly description: string;
  readonly exports: Readonly<Record<string, string | { readonly types: string }>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
}

interface Entry {
  /** `@gyral/core` or `@gyral/ssr/static`. */
  readonly specifier: string;
  readonly file: string;
}

interface Package {
  readonly name: string;
  readonly dir: string;
  readonly json: PackageJson;
  readonly entries: readonly Entry[];
}

/** Finds a package through node_modules and resolves each entry to its source or `.d.ts`. */
function loadPackage(name: string, entries: readonly string[]): Package {
  const dir = realpathSync(join(NODE_MODULES, '@gyral', name));
  const json = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as PackageJson;
  return {
    name,
    dir,
    json,
    entries: entries.map((subpath) => {
      const target = json.exports[subpath];
      if (target === undefined) throw new Error(`${json.name} has no export "${subpath}"`);
      const file = join(dir, typeof target === 'string' ? target : target.types);
      return { specifier: subpath === '.' ? json.name : `${json.name}${subpath.slice(1)}`, file };
    }),
  };
}

type Kind = 'function' | 'class' | 'constant' | 'type' | 'lit';

interface ApiSymbol {
  readonly name: string;
  readonly kind: Kind;
  readonly declaration: string;
  readonly doc: string;
}

const GROUPS: readonly { readonly kind: Kind; readonly title: string }[] = [
  { kind: 'function', title: 'Functions' },
  { kind: 'class', title: 'Classes' },
  { kind: 'constant', title: 'Constants' },
  { kind: 'type', title: 'Types and interfaces' },
  { kind: 'lit', title: 'Re-exported from Lit' },
];

const tidy = (text: string): string =>
  text
    .replace(/^export\s+(default\s+)?/, '')
    .replace(/^declare\s+/, '')
    .trimEnd();

/** The declaration as written, without function bodies or private class members. */
function declarationText(node: ts.Declaration, name: string, checker: ts.TypeChecker): string {
  const source = node.getSourceFile().text;
  const upTo = (n: ts.Node, end: number) => tidy(source.slice(n.getStart(), end));
  if (ts.isFunctionDeclaration(node)) return upTo(node, node.body?.getStart() ?? node.end);
  if (ts.isClassDeclaration(node)) {
    const header = upTo(node, node.members.pos)
      .replace(/\{\s*$/, '')
      .trimEnd();
    const hidden = ts.ModifierFlags.Private | ts.ModifierFlags.Protected;
    const members = node.members
      .filter((m) => !(m.name !== undefined && ts.isPrivateIdentifier(m.name)))
      .filter((m) => (ts.getCombinedModifierFlags(m) & hidden) === 0)
      .map((m) => {
        const body = 'body' in m && m.body !== undefined ? (m.body as ts.Node).getStart() : m.end;
        return `  ${source.slice(m.getStart(), body).trim().replace(/;?$/, ';')}`;
      });
    return `${header} {\n${members.join('\n')}\n}`;
  }
  if (ts.isVariableDeclaration(node)) {
    const type = checker.typeToString(
      checker.getTypeAtLocation(node),
      undefined,
      ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
    );
    return `const ${name}: ${type}`;
  }
  return upTo(node, node.end);
}

function kindOf(node: ts.Declaration, checker: ts.TypeChecker): Kind {
  const file = node.getSourceFile().fileName;
  if (/\/node_modules\/(lit|lit-html|lit-element|@lit)\//.test(file)) return 'lit';
  if (ts.isFunctionDeclaration(node)) return 'function';
  if (ts.isClassDeclaration(node)) return 'class';
  if (ts.isVariableDeclaration(node)) {
    // Arrow functions and directives (`directive(X)` returns a function) are called.
    return checker.getTypeAtLocation(node).getCallSignatures().length > 0 ? 'function' : 'constant';
  }
  return 'type';
}

function describeExports(program: ts.Program, file: string): ApiSymbol[] {
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  const module = source === undefined ? undefined : checker.getSymbolAtLocation(source);
  if (module === undefined) throw new Error(`API reference: cannot read ${file}`);
  return checker.getExportsOfModule(module).map((exported) => {
    const symbol =
      exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    const node = symbol.declarations?.[0];
    if (node === undefined) throw new Error(`API reference: ${exported.name} has no declaration`);
    const kind = kindOf(node, checker);
    return {
      name: exported.name,
      kind,
      declaration: kind === 'lit' ? '' : declarationText(node, exported.name, checker),
      doc: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
    };
  });
}

const DESIGN_DOCS = 'https://github.com/gyraljs/gyral/blob/main/docs/design-docs';

/**
 * A doc comment as Markdown. Gyral's comments indent code examples by two spaces after a line
 * ending in a colon; those become code blocks. References to the repo's design docs become
 * links.
 */
export function docMarkdown(doc: string): string {
  const out: string[] = [];
  const lines = doc.split('\n');
  for (let n = 0; n < lines.length; n += 1) {
    const line = lines[n] ?? '';
    const previous = out.findLast((l) => l.trim() !== '') ?? '';
    if (/^ {2,}\S/.test(line) && previous.trimEnd().endsWith(':') && !/^\s*-\s/.test(line)) {
      const block: string[] = [];
      while (
        n < lines.length &&
        (/^ {2,}\S/.test(lines[n] ?? '') || (lines[n] ?? '').trim() === '')
      ) {
        block.push((lines[n] ?? '').replace(/^ {2}/, ''));
        n += 1;
      }
      n -= 1;
      while (block.at(-1)?.trim() === '') block.pop();
      out.push('', '```ts', ...block, '```', '');
      continue;
    }
    out.push(line);
  }
  return out
    .join('\n')
    .replace(/(?<![\w/])docs\/design-docs\/([\w.-]+\.md)/g, `[$1](${DESIGN_DOCS}/$1)`);
}

/** The first sentence of a doc comment, for the summary tables. */
const summary = (doc: string): string => {
  const first =
    doc
      .split(/\n\s*\n/)[0]
      ?.replace(/\s+/g, ' ')
      .trim() ?? '';
  const sentence = /^(.+?[.!?])(\s|$)/.exec(first)?.[1] ?? first;
  return sentence.replace(/\|/g, '\\|');
};

const anchor = (specifier: string, name: string): string =>
  `${specifier.replace(/^@gyral\//, '').replace(/[^\w]+/g, '-')}-${name}`.toLowerCase();

function entryMarkdown(entry: Entry, symbols: readonly ApiSymbol[]): string {
  const parts = [`## \`${entry.specifier}\`\n`];
  for (const group of GROUPS) {
    const members = symbols
      .filter((s) => s.kind === group.kind)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (members.length === 0) continue;
    parts.push(`### ${group.title}\n`);
    if (group.kind === 'lit') {
      parts.push(
        `${members.map((s) => `\`${s.name}\``).join(', ')}. Re-exported so components need one import; see the [Lit documentation](https://lit.dev/docs/api/).\n`,
      );
      continue;
    }
    parts.push('| Name | Summary |\n| --- | --- |');
    for (const s of members) {
      parts.push(`| [\`${s.name}\`](#${anchor(entry.specifier, s.name)}) | ${summary(s.doc)} |`);
    }
    parts.push('');
    for (const s of members) {
      parts.push(
        `<h4 id="${anchor(entry.specifier, s.name)}"><code>${s.name}</code></h4>\n`,
        '```ts',
        s.declaration,
        '```\n',
        s.doc === '' ? '' : `${docMarkdown(s.doc)}\n`,
      );
    }
  }
  return parts.join('\n');
}

function packageMarkdown(pkg: Package, symbols: ReadonlyMap<string, readonly ApiSymbol[]>): string {
  const peers = Object.keys(pkg.json.peerDependencies ?? {});
  const install = [pkg.json.name, ...peers.filter((p) => p !== 'fast-check')].join(' ');
  return [
    `# ${pkg.json.name}\n`,
    `${pkg.json.description}\n`,
    '```sh',
    `npm install ${install}`,
    '```\n',
    `Generated from the package's type declarations. Entry points: ${pkg.entries
      .map((e) => `[\`${e.specifier}\`](#${slugify(e.specifier)})`)
      .join(', ')}.\n`,
    ...pkg.entries.map((e) => entryMarkdown(e, symbols.get(e.file) ?? [])),
  ].join('\n');
}

/** Source links for generated pages: the package's directory on GitHub. */
export const apiSourceUrl = (name: string): string => `${SOURCE}/${name}`;

let pages: Promise<readonly DocPage[]> | undefined;

/** One docs page per package, in the Reference section after the hand-written pages. */
export function loadApiPages(): Promise<readonly DocPage[]> {
  pages ??= (async () => {
    const packages = API_PACKAGES.map((p) => loadPackage(p.name, p.entries));
    const files = packages.flatMap((p) => p.entries.map((e) => e.file));
    const program = ts.createProgram(files, {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ['lib.es2023.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
      types: ['node'],
      typeRoots: [join(NODE_MODULES, '@types')],
      strict: true,
      skipLibCheck: true,
      noEmit: true,
    });
    const symbols = new Map(files.map((f) => [f, describeExports(program, f)]));
    return Promise.all(
      packages.map(async (pkg, index): Promise<DocPage> => {
        const { html, headings } = await renderMarkdown(packageMarkdown(pkg, symbols));
        return {
          slug: `api/${pkg.name}`,
          path: `/docs/api/${pkg.name}/`,
          title: pkg.json.name,
          description: pkg.json.description,
          section: 'Reference',
          order: 10 + index,
          draft: false,
          html,
          // The outline lists entry points and groups; symbols are in each group's table.
          headings,
          source: apiSourceUrl(pkg.name),
        };
      }),
    );
  })();
  return pages;
}
