// `pnpm sync:demos` copies the demo recordings and their text from a Gyral checkout
// (../gyral, or GYRAL_DIR) into the site:
// - the pitch and "usual way" lines from examples/<slug>/demo.mjs into content/demos.json;
// - each scene's recording (.demos/<stem>.webm and .png, made by `pnpm demos:record` there)
//   encoded for the web into public/demos/<stem>.<hash>.{webm,mp4,webp}: AV1 in WebM, H.264 in
//   MP4 as the fallback, a WebP poster. The hash is of the source recording, so unchanged
//   recordings are not re-encoded and the files can be cached forever.
//
//   pnpm sync:demos            encode what changed and rewrite content/demos.json
//   pnpm sync:demos --record   run `pnpm demos:record` in the Gyral checkout first
//   pnpm sync:demos --check    (in `pnpm invariants`) fail when the text drifted from demo.mjs
//                              or a listed file is missing; skips without a Gyral checkout
//
// Encoding needs ffmpeg with libsvtav1, libx264 and libwebp.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tsImport } from 'tsx/esm/api';

const { DEMOS } = await tsImport('../src/content/demos.ts', import.meta.url);
// The Gyral checkout (gyraljs/gyral on `main`): GYRAL_DIR, else the sibling folder
// ../gyral, relative to the repo root.
const gyral = resolve(process.env.GYRAL_DIR ?? '../gyral');
const check = process.argv.includes('--check');
const record = process.argv.includes('--record');
const JSON_PATH = 'content/demos.json';
const OUT = 'public/demos';

/** The recording's file stem, as `pnpm demos:record` names it. */
const stem = (demo, scene) => (demo.scenes.length === 1 ? demo.slug : `${demo.slug}-${scene.id}`);

const problems = [];
const synced = existsSync(JSON_PATH) ? JSON.parse(readFileSync(JSON_PATH, 'utf8')) : {};

if (!existsSync(join(gyral, 'examples'))) {
  const message = `sync-demos: no Gyral checkout at ${gyral} (set GYRAL_DIR).`;
  if (check) {
    console.log(`${message} Skipping the drift check.`);
    process.exit(0);
  }
  console.error(message);
  process.exit(1);
}

/** The text from each example's demo.mjs, checked against the scenes the site lists. */
async function readDemoText(demo) {
  const file = join(gyral, 'examples', demo.slug, 'demo.mjs');
  if (!existsSync(file)) {
    problems.push(`${demo.slug}: examples/${demo.slug}/demo.mjs does not exist in ${gyral}`);
    return undefined;
  }
  const { default: source } = await import(pathToFileURL(file).href);
  const ids = source.scenes.map((s) => s.id);
  const listed = demo.scenes.map((s) => s.id);
  if (ids.join() !== listed.join())
    problems.push(
      `${demo.slug}: demo.mjs scenes [${ids.join(', ')}], src/content/demos.ts lists [${listed.join(', ')}]`,
    );
  return { pitch: source.pitch, usual: source.usual };
}

function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {
    stdio: 'inherit',
    env: { ...process.env, SVT_LOG: '1' },
  });
  if (result.error !== undefined)
    throw new Error(`ffmpeg: ${result.error.message} (is it installed?)`);
  if (result.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed`);
}

/**
 * Gyral's `demos:record` trims the blank and unstyled first frames itself (since 0.2.0,
 * gyral-xpd), so recordings are encoded from their first frame. The hash covers the crop and the
 * encoder settings, so changing any of them re-encodes.
 */
const AV1 = [
  '-c:v',
  'libsvtav1',
  '-preset',
  '6',
  '-crf',
  '42',
  '-g',
  '250',
  '-svtav1-params',
  'tune=0',
];
const H264 = [
  '-c:v',
  'libx264',
  '-preset',
  'slow',
  '-crf',
  '30',
  '-tune',
  'animation',
  '-profile:v',
  'high',
  '-level:v',
  '3.1',
  '-movflags',
  '+faststart',
];

/** Encode one scene's recording (skipped when files for this recording already exist). */
function encode(name, crop) {
  const video = join(gyral, '.demos', `${name}.webm`);
  const png = join(gyral, '.demos', `${name}.png`);
  if (!existsSync(video) || !existsSync(png)) {
    throw new Error(`${video} or its .png is missing: run \`pnpm sync:demos --record\``);
  }
  const vf = `crop=${String(crop.width)}:${String(crop.height)}:${String(crop.x)}:${String(crop.y)}`;
  const hash = createHash('sha256')
    .update(readFileSync(video))
    .update(JSON.stringify([vf, AV1, H264]))
    .digest('hex')
    .slice(0, 8);
  const base = `${name}.${hash}`;
  const target = (ext) => join(OUT, `${base}.${ext}`);
  const input = ['-i', video, '-an', '-vf', vf, '-pix_fmt', 'yuv420p'];
  if (!existsSync(target('webm'))) ffmpeg([...input, ...AV1, target('webm')]);
  if (!existsSync(target('mp4'))) ffmpeg([...input, ...H264, target('mp4')]);
  if (!existsSync(target('webp'))) {
    ffmpeg(['-i', png, '-vf', vf, '-c:v', 'libwebp', '-quality', '80', target('webp')]);
  }
  const files = { webm: target('webm'), mp4: target('mp4'), poster: target('webp') };
  return {
    width: crop.width,
    height: crop.height,
    webm: `/demos/${base}.webm`,
    mp4: `/demos/${base}.mp4`,
    poster: `/demos/${base}.webp`,
    bytes: Object.fromEntries(Object.entries(files).map(([k, f]) => [k, statSync(f).size])),
  };
}

if (record && !check) {
  const slugs = DEMOS.map((d) => d.slug);
  const result = spawnSync('pnpm', ['demos:record', ...slugs], { cwd: gyral, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const next = {};
mkdirSync(OUT, { recursive: true });
for (const demo of DEMOS) {
  const text = await readDemoText(demo);
  if (text === undefined) continue;
  if (check) {
    const current = synced[demo.slug];
    if (current?.pitch !== text.pitch || current?.usual !== text.usual)
      problems.push(`${JSON_PATH}: ${demo.slug} text is out of date with demo.mjs`);
    for (const scene of demo.scenes) {
      const files = current?.scenes?.[scene.id];
      if (files === undefined) problems.push(`${JSON_PATH}: ${demo.slug} has no scene ${scene.id}`);
      else
        for (const url of [files.webm, files.mp4, files.poster])
          if (!existsSync(join('public', url))) problems.push(`${url} is listed but missing`);
    }
    continue;
  }
  const scenes = {};
  for (const scene of demo.scenes) scenes[scene.id] = encode(stem(demo, scene), demo.crop);
  next[demo.slug] = { ...text, scenes };
}

if (!check && problems.length === 0) {
  const wanted = new Set(
    Object.values(next).flatMap((d) =>
      Object.values(d.scenes).flatMap((f) =>
        [f.webm, f.mp4, f.poster].map((u) => u.slice('/demos/'.length)),
      ),
    ),
  );
  for (const file of readdirSync(OUT)) if (!wanted.has(file)) rmSync(join(OUT, file));
  writeFileSync(JSON_PATH, `${JSON.stringify(next, null, 2)}\n`);
}

if (problems.length > 0) {
  console.error(`${problems.join('\n')}\nRun \`pnpm sync:demos\` and commit the result.`);
  process.exit(1);
}
if (check) console.log(`demos: ${String(DEMOS.length)} demos up to date`);
else {
  const kib = (n) => `${(n / 1024).toFixed(0)} KiB`;
  for (const [slug, d] of Object.entries(next))
    for (const [id, f] of Object.entries(d.scenes))
      console.log(
        `demos: ${slug}/${id}: webm ${kib(f.bytes.webm)}, mp4 ${kib(f.bytes.mp4)}, poster ${kib(f.bytes.poster)}`,
      );
}
