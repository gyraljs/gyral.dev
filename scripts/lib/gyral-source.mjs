// Where `sync:examples` and `sync:demos` read Gyral's examples from: the released version this
// site is built with, never unreleased work on the framework's `main` branch.
//
// The Gyral checkout is GYRAL_DIR, else ../gyral (relative to the repo root). The files come
// from its git tag `v<installed @gyral/core version>` (GYRAL_REF overrides, e.g. `main` to
// preview), extracted with `git archive` into .smoke/gyral-<ref>/. The checkout itself is only
// read. Recordings (`.demos/`, untracked) still come from the checkout's working tree.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** The Gyral checkout, or undefined when there is none. */
export function gyralCheckout() {
  const dir = resolve(process.env.GYRAL_DIR ?? '../gyral');
  return existsSync(join(dir, '.git')) || existsSync(join(dir, 'examples')) ? dir : undefined;
}

/** The ref the examples are read at: GYRAL_REF, else the tag of the installed @gyral/core. */
export function gyralRef() {
  if (process.env.GYRAL_REF !== undefined) return process.env.GYRAL_REF;
  const pkg = JSON.parse(readFileSync('node_modules/@gyral/core/package.json', 'utf8'));
  return `v${String(pkg.version)}`;
}

/**
 * Extracts `examples/` of the checkout at `ref` and returns the directory that contains it.
 * Throws when the ref doesn't exist in the checkout (fetch its tags first).
 */
export function gyralAt(checkout, ref) {
  const out = resolve('.smoke', `gyral-${ref.replace(/[^\w.-]/g, '_')}`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const archive = spawnSync('git', ['-C', checkout, 'archive', '--format=tar', ref, 'examples'], {
    maxBuffer: 256 * 1024 * 1024,
  });
  if (archive.status !== 0) {
    throw new Error(
      `git archive ${ref} failed in ${checkout} (run \`git -C ${checkout} fetch --tags\`, or set GYRAL_REF): ${archive.stderr.toString()}`,
    );
  }
  const tar = spawnSync('tar', ['-x', '-C', out], { input: archive.stdout });
  if (tar.status !== 0) throw new Error(`tar failed: ${tar.stderr.toString()}`);
  return out;
}

/**
 * The directory whose `examples/` the sync scripts read, with the checkout and ref it came
 * from; undefined without a checkout. A GYRAL_DIR that is not a git checkout is read as is.
 */
export function gyralExamplesRoot() {
  const checkout = gyralCheckout();
  if (checkout === undefined) return undefined;
  if (!existsSync(join(checkout, '.git'))) return { checkout, ref: 'working tree', root: checkout };
  const ref = gyralRef();
  return { checkout, ref, root: gyralAt(checkout, ref) };
}
