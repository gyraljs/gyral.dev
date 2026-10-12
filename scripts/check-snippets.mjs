// The docs' code must compile. Every ```ts block in a published docs page whose first line
// names a file (`// src/counter.ts`) is written to .smoke/snippets/<page>/<file> and
// typechecked together with the other files from the same page, against the real Gyral
// packages. Blocks without a file comment are fragments and are skipped. The home page's
// samples (content/home/*.ts.txt) are checked the same way, as one more page, and so are the
// recipes (content/recipes/*.ts.txt, included into pages by src/content/includes.ts) and the
// code blocks of content/llms-small.md, the agent pack.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DOCS = 'content/docs';
const OUT = '.smoke/snippets';
rmSync(OUT, { recursive: true, force: true });

let count = 0;
/** Writes a page's named ```ts blocks to .smoke/snippets/<page>/. */
const extract = (page, source) => {
  for (const [, code] of source.matchAll(/```ts\n([\s\S]*?)```/g)) {
    const named = /^\/\/ ([\w./-]+\.ts)\n/.exec(code);
    if (named === null) continue;
    const target = join(OUT, page, named[1]);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, code);
    count += 1;
  }
};
for (const file of readdirSync(DOCS).filter((f) => f.endsWith('.md'))) {
  const source = readFileSync(join(DOCS, file), 'utf8');
  if (/^draft:\s*true$/m.test(source)) continue;
  extract(file.replace(/\.md$/, ''), source);
}
extract('llms-small', readFileSync('content/llms-small.md', 'utf8'));

// Recipes: each file starts with its own file comment, `// src/todo-app.ts`.
for (const file of readdirSync('content/recipes').filter((f) => f.endsWith('.ts.txt'))) {
  const code = readFileSync(join('content/recipes', file), 'utf8');
  const named = /^\/\/ ([\w./-]+\.ts)\n/.exec(code);
  if (named === null) {
    console.error(`content/recipes/${file} must start with its file comment, // src/x.ts`);
    process.exit(1);
  }
  const target = join(OUT, 'recipes', named[1]);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, code);
  count += 1;
}

for (const [file, source] of [
  ['src/counter.ts', 'content/home/counter.ts.txt'],
  ['src/counter.test.ts', 'content/home/counter.test.ts.txt'],
]) {
  const target = join(OUT, 'home', file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(source, 'utf8'));
  count += 1;
}

writeFileSync(
  join(OUT, 'tsconfig.json'),
  JSON.stringify({
    extends: '../../tsconfig.json',
    compilerOptions: { types: ['node', 'vite/client'], noUnusedLocals: true },
    include: ['./**/*.ts'],
  }),
);
const result = spawnSync('npx', ['tsc', '-p', join(OUT, 'tsconfig.json')], { encoding: 'utf8' });
if (result.status !== 0) {
  console.error(`Docs code doesn't compile (files in ${OUT}):\n${result.stdout}${result.stderr}`);
  process.exit(1);
}
console.log(`snippets: ${String(count)} docs code blocks typecheck`);
