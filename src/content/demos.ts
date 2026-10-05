// The demos on /what-you-can-build/: short recordings of Gyral examples that show what a UI can
// do, not how the code looks. Titles, docs links and the video descriptions live here; the
// pitch, the "usual way" contrast and the encoded videos come from the Gyral repository's
// `examples/<slug>/demo.mjs` and `pnpm demos:record`, copied by `pnpm sync:demos` into
// content/demos.json and public/demos/ (`pnpm invariants` fails when the text drifts).

export interface DemoScene {
  /** The scene id in demo.mjs (`main` when the demo has one scene). */
  readonly id: string;
  /** A short label when a demo has more than one scene. */
  readonly label?: string;
  /** What happens in the video, for people who can't see or play it. */
  readonly description: string;
}

export interface Demo {
  /** The example's directory under `examples/` in the Gyral repository. */
  readonly slug: string;
  readonly title: string;
  /** The docs page that explains the idea: [label, path]. */
  readonly docs: readonly [string, string];
  /**
   * The part of the 1280×720 recording to keep: the example's content plus 24 px, so the
   * interface fills the video instead of sitting in a wide margin. Measured as the bounding
   * box of non-background pixels over frames sampled every half second; re-measure when a
   * recording's layout changes (docs/design-docs/0002-content.md, "Demo recordings").
   */
  readonly crop: Crop;
  readonly scenes: readonly DemoScene[];
}

/** A crop box in recording pixels; width and height are even (video encoders need that). */
export interface Crop {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const DEMOS: readonly Demo[] = [
  {
    slug: 'undo-replay',
    title: 'Undo, redo and replay',
    docs: ['Model and update', '/docs/update/'],
    crop: { x: 310, y: 0, width: 664, height: 720 },
    scenes: [
      {
        id: 'main',
        description:
          'A heart is painted pixel by pixel. Six presses of Undo leave the removed pixels as dashed ghosts, Redo brings one back, the timeline slider scrubs back to an empty grid, and Replay repaints the whole session.',
      },
    ],
  },
  {
    slug: 'typeahead-race',
    title: 'Type-ahead without stale results',
    docs: ['Effects and drivers', '/docs/effects/#concurrency-lanes'],
    crop: { x: 136, y: 32, width: 1008, height: 688 },
    scenes: [
      {
        id: 'main',
        description:
          'One search box feeds two result panels backed by the same slow server. Typed slowly, both panels agree. Typed quickly, the panel without cancellation ends up showing results for "w" because that slow answer arrived last, while the panel using switch cancels the older requests and shows results for "work".',
      },
    ],
  },
  {
    slug: 'no-js-first',
    title: 'Works before JavaScript loads',
    docs: ['Forms', '/docs/forms/'],
    crop: { x: 368, y: 32, width: 552, height: 680 },
    scenes: [
      {
        id: 'js-off',
        label: 'JavaScript off',
        description:
          'With JavaScript disabled, an RSVP form is filled in and sent. The server answers with the error "Grace already replied with that email" and keeps the typed values; a second reply goes through and the page says "You\'re on the list".',
      },
      {
        id: 'js-on',
        label: 'JavaScript on',
        description:
          'The same page with JavaScript: "Enter a valid email address" appears while the email is still being typed, disappears once it is valid, and the reply is sent without reloading the page.',
      },
    ],
  },
  {
    slug: 'themes',
    title: 'One app, four looks',
    docs: ['Styling and themes', '/docs/styling/#a-whole-site-as-a-theme'],
    crop: { x: 296, y: 26, width: 688, height: 694 },
    scenes: [
      {
        id: 'main',
        description:
          'A task list switches live between four themes, Calm, Midnight, Paper and Brutalist, with completely different colours, type and shapes. Tasks ticked off along the way stay ticked through every switch.',
      },
    ],
  },
  {
    slug: 'view-transitions',
    title: 'Animated transitions between states',
    docs: ['Model and update', '/docs/update/#state-in-css-and-in-transitions'],
    crop: { x: 180, y: 32, width: 920, height: 688 },
    scenes: [
      {
        id: 'main',
        description:
          'A grid of colour cards is sorted by hue, by lightness, reversed and sorted by name, and each time the cards glide to their new places. Opening a card grows its swatch into a detail view, and going back shrinks it into the grid again.',
      },
    ],
  },
];

/** demo.mjs says "Usually undo is…"; after the "The usual way:" label that reads "Undo is…". */
export const usualWay = (usual: string): string => {
  const rest = usual.replace(/^Usually /, '');
  return rest.charAt(0).toUpperCase() + rest.slice(1);
};

/** One encoded file of a scene, under public/demos/ (content-hashed name). */
export interface DemoFiles {
  /** The cropped video's size in pixels. */
  readonly width: number;
  readonly height: number;
  /** AV1 in WebM. */
  readonly webm: string;
  /** H.264 in MP4, for browsers without AV1 decoding. */
  readonly mp4: string;
  /** WebP poster: the moment demo.mjs marks, also shown when motion is reduced. */
  readonly poster: string;
  readonly bytes: { readonly webm: number; readonly mp4: number; readonly poster: number };
}

/** content/demos.json, written by `pnpm sync:demos`. */
export interface DemoSync {
  readonly [slug: string]: {
    readonly pitch: string;
    readonly usual: string;
    readonly scenes: { readonly [id: string]: DemoFiles };
  };
}

export interface LoadedScene extends DemoScene {
  readonly files: DemoFiles;
}

export interface LoadedDemo extends Omit<Demo, 'scenes'> {
  readonly pitch: string;
  readonly usual: string;
  readonly scenes: readonly LoadedScene[];
}

/** Server-only: the demos with their synced text and files. Throws when a sync is missing. */
export async function loadDemos(): Promise<readonly LoadedDemo[]> {
  const { readFile } = await import('node:fs/promises');
  const synced = JSON.parse(
    await readFile(new URL('../../content/demos.json', import.meta.url), 'utf8'),
  ) as DemoSync;
  return DEMOS.map((demo) => {
    const entry = synced[demo.slug];
    if (entry === undefined) throw new Error(`content/demos.json has no ${demo.slug}`);
    return {
      ...demo,
      pitch: entry.pitch,
      usual: entry.usual,
      scenes: demo.scenes.map((scene) => {
        const files = entry.scenes[scene.id];
        if (files === undefined)
          throw new Error(`content/demos.json has no ${demo.slug} scene ${scene.id}`);
        return { ...scene, files };
      }),
    };
  });
}
