// The Gyral release this site is built with and documents: the installed @gyral/core's version
// and its git tag. Links into the framework repository point at the tag, not at `main`, which
// carries unreleased work. Server-only (reads files).
import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NODE_MODULES = fileURLToPath(new URL('../../node_modules/', import.meta.url));

/** `0.3.8`. */
export const GYRAL_VERSION = (
  JSON.parse(
    readFileSync(join(realpathSync(join(NODE_MODULES, '@gyral', 'core')), 'package.json'), 'utf8'),
  ) as { readonly version: string }
).version;

/** `v0.3.8`, the release's tag in gyraljs/gyral. */
export const GYRAL_TAG = `v${GYRAL_VERSION}`;
