#!/usr/bin/env bash
# Cloudflare Pages build (docs/design-docs/0003-hosting.md). Until Gyral 0.1 is on npm the site
# links @gyral/* from a sibling checkout (../cyclejs-web-framework), so this clones the public
# gyraljs/gyral repo there first. Cloudflare settings:
#   Build command: bash scripts/cloudflare-build.sh     Output directory: dist
#   Env: NODE_VERSION=24, SKIP_DEPENDENCY_INSTALL=1 (the automatic install would fail before
#   the clone), optional GYRAL_REF=<branch|tag|sha> (default main).
set -euo pipefail

site_dir="$(cd "$(dirname "$0")/.." && pwd)"
gyral_dir="$(dirname "$site_dir")/cyclejs-web-framework"
ref="${GYRAL_REF:-main}"

corepack enable
if [ ! -d "$gyral_dir/.git" ]; then
  git clone --quiet https://github.com/gyraljs/gyral.git "$gyral_dir"
fi
git -C "$gyral_dir" fetch --quiet --depth 1 origin "$ref"
git -C "$gyral_dir" checkout --quiet --detach FETCH_HEAD
echo "Gyral $(git -C "$gyral_dir" rev-parse --short HEAD) ($ref)"

(cd "$gyral_dir" && pnpm install --frozen-lockfile)
cd "$site_dir"
pnpm install --frozen-lockfile
pnpm build
