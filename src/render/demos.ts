// /what-you-can-build/: the visual pitch. Each demo is a short recording of a Gyral example
// (src/content/demos.ts) with what it shows, how it is usually done, and links to the source
// and the docs. Server-rendered; without JavaScript every video has its poster and controls.
// src/demo-videos.ts plays a video while it is on screen, unless the visitor prefers reduced
// motion.
import { html, nothing, type ChildValue } from '@gyral/core';
import { loadDemos, usualWay, type LoadedDemo, type LoadedScene } from '../content/demos.js';
import { absolute, LINKS } from '../site.js';
import type { PageMeta } from './layout.js';

export const DEMOS_PATH = '/what-you-can-build/';
const EXAMPLES_SOURCE = `${LINKS.github}/tree/main/examples`;

export const DEMOS_INTRO =
  'Gyral treats every interaction as data. That makes these easy. Each one is a short recording of an example in the Gyral repository: no code here, just what the interface does.';

export const demosMeta: PageMeta = {
  path: DEMOS_PATH,
  title: 'What you can build',
  description:
    'See what Gyral makes easy: undo and replay, type-ahead without stale results, and pages that work before JavaScript. Short recordings, with source.',
  searchable: true,
  markdown: true,
  demoVideos: true,
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'What you can build with Gyral',
      url: absolute(DEMOS_PATH),
    },
  ],
};

/** Smallest file first: browsers play the first source they can decode. */
const sources = (scene: LoadedScene) =>
  (
    [
      ['webm', 'video/webm; codecs="av01.0.05M.08"', scene.files.bytes.webm],
      ['mp4', 'video/mp4; codecs="avc1.64001F"', scene.files.bytes.mp4],
    ] as const
  )
    .toSorted((a, b) => a[2] - b[2])
    .map(([kind, type]) => html`<source src=${scene.files[kind]} type=${type} />`);

const video = (demo: LoadedDemo, scene: LoadedScene) => {
  const id = `${demo.slug}-${scene.id}`;
  return html`
    <figure class="demo-clip">
      <video
        class="demo-video"
        width=${scene.files.width}
        height=${scene.files.height}
        poster=${scene.files.poster}
        controls
        muted
        loop
        playsinline
        preload="none"
        aria-describedby=${`${id}-desc`}
      >
        ${sources(scene)}
      </video>
      <figcaption>
        ${scene.label === undefined ? nothing : html`<strong>${scene.label}.</strong> `}
        <span id=${`${id}-desc`}>${scene.description}</span>
      </figcaption>
    </figure>
  `;
};

const section = (demo: LoadedDemo) => html`
  <section class="demo-item" id=${demo.slug} aria-labelledby=${`${demo.slug}-title`}>
    <div class="demo-text">
      <h2 id=${`${demo.slug}-title`}>${demo.title}</h2>
      <p class="demo-pitch">${demo.pitch}</p>
      <p class="demo-usual"><strong>The usual way:</strong> ${usualWay(demo.usual)}</p>
      <ul role="list" class="demo-links">
        <li><a href=${`${EXAMPLES_SOURCE}/${demo.slug}`} rel="external">Live example source</a></li>
        <li><a href=${demo.docs[1]}>${demo.docs[0]}</a></li>
      </ul>
    </div>
    <div class=${`demo-clips${demo.scenes.length > 1 ? ' two' : ''}`}>
      ${demo.scenes.map((scene) => video(demo, scene))}
    </div>
  </section>
`;

export async function demosBody(): Promise<ChildValue> {
  const demos = await loadDemos();
  return html`
    <section class="page-intro" aria-labelledby="demos-title">
      <h1 id="demos-title">What you can build</h1>
      <p>${DEMOS_INTRO}</p>
      <nav aria-label="Demos" data-pagefind-ignore>
        <ul role="list" class="chips">
          ${demos.map((d) => html`<li><a href=${`#${d.slug}`}>${d.title}</a></li>`)}
        </ul>
      </nav>
    </section>
    ${demos.map(section)}
    <section class="cta" aria-labelledby="demos-cta-title">
      <h2 id="demos-cta-title">Run them yourself</h2>
      <p>
        Every demo is an example with tests. Clone the repository, then
        <code>pnpm install</code> and <code>pnpm examples</code>.
      </p>
      <a class="button primary" href="/docs/getting-started/">Build your first component</a>
    </section>
  `;
}
