// The docs' code must compile. Every ```ts block in a published docs page whose first line
// names a file (`// src/counter.ts`) is written to .smoke/snippets/<page>/<file> and
// typechecked together with the other files from the same page, against the real Gyral
// packages. Blocks without a file comment are fragments and are skipped.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DOCS = 'content/docs';
const OUT = '.smoke/snippets';
rmSync(OUT, { recursive: true, force: true });

let count = 0;
for (const file of readdirSync(DOCS).filter((f) => f.endsWith('.md'))) {
  const source = readFileSync(join(DOCS, file), 'utf8');
  if (/^draft:\s*true$/m.test(source)) continue;
  for (const [, code] of source.matchAll(/```ts\n([\s\S]*?)```/g)) {
    const named = /^\/\/ ([\w./-]+\.ts)\n/.exec(code);
    if (named === null) continue;
    const target = join(OUT, file.replace(/\.md$/, ''), named[1]);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, code);
    count += 1;
  }
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
