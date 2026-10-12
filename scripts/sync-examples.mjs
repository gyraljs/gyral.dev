// `pnpm sync:examples` copies each example's excerpt from a Gyral checkout into
// content/examples/, where the build reads it. `--check` (in `pnpm invariants`) fails when a
// committed excerpt differs from the source, so the gallery can't drift from the examples.
// The excerpts come from the Gyral release the site is built with (scripts/lib/gyral-source.mjs:
// the checkout GYRAL_DIR, else ../gyral, at tag v<installed @gyral/core version>).
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tsImport } from 'tsx/esm/api';
import { gyralExamplesRoot } from './lib/gyral-source.mjs';

const { ALL_EXAMPLES, excerpt, excerptPath } = await tsImport(
  '../src/content/examples.ts',
  import.meta.url,
);
const check = process.argv.includes('--check');
const source = gyralExamplesRoot();
const gyral = source?.root;

if (gyral === undefined || !existsSync(join(gyral, 'examples'))) {
  const message = `sync-examples: no Gyral checkout at ${process.env.GYRAL_DIR ?? '../gyral'} (set GYRAL_DIR).`;
  if (check) {
    console.log(`${message} Skipping the drift check.`);
    process.exit(0);
  }
  console.error(message);
  process.exit(1);
}

const problems = [];
const wanted = new Set();
mkdirSync('content/examples', { recursive: true });
for (const example of ALL_EXAMPLES) {
  const source = join(gyral, 'examples', example.slug, example.file);
  if (!existsSync(source)) {
    problems.push(`${example.slug}: ${example.file} does not exist at ${source.ref}`);
    continue;
  }
  const target = excerptPath(example);
  wanted.add(target);
  const text = excerpt(readFileSync(source, 'utf8'));
  const current = existsSync(target) ? readFileSync(target, 'utf8') : undefined;
  if (current === text) continue;
  if (check)
    problems.push(`${target} is out of date with examples/${example.slug}/${example.file}`);
  else writeFileSync(target, text);
}
for (const file of readdirSync('content/examples')) {
  const path = `content/examples/${file}`;
  if (wanted.has(path)) continue;
  if (check) problems.push(`${path} belongs to no example`);
  else rmSync(path);
}

if (problems.length > 0) {
  console.error(`${problems.join('\n')}\nRun \`pnpm sync:examples\` and commit the result.`);
  process.exit(1);
}
console.log(
  `examples: ${String(ALL_EXAMPLES.length)} excerpts ${check ? 'up to date' : 'synced'} (Gyral ${source.ref})`,
);
