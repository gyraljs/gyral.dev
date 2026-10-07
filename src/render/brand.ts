// /brand/: the logo, colours and usage rules, from the brand guide in gyraljs/brand (BRAND.md).
// The download files are copies made by scripts/sync-brand.mjs; the full kit lives in that repo.
import { html, type ChildValue } from '@gyral/core';
import { absolute, LINKS } from '../site.js';
import type { PageMeta } from './layout.js';

export const brandMeta: PageMeta = {
  path: '/brand/',
  title: 'Brand and press',
  description:
    'The Gyral logo, colours and usage rules: download the mark and lockups, and see how to use them when you write about Gyral.',
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Gyral brand and press',
      url: absolute('/brand/'),
    },
  ],
};

interface Download {
  readonly file: string;
  readonly label: string;
  readonly background: 'light' | 'dark';
}

const DOWNLOADS: readonly Download[] = [
  {
    file: 'gyral-lockup-horizontal-gyral-on-white',
    label: 'Horizontal logo, on white',
    background: 'light',
  },
  {
    file: 'gyral-lockup-horizontal-gyral-on-black',
    label: 'Horizontal logo, on black',
    background: 'dark',
  },
  {
    file: 'gyral-lockup-stacked-gyral-on-white',
    label: 'Stacked logo, on white',
    background: 'light',
  },
  {
    file: 'gyral-lockup-stacked-gyral-on-black',
    label: 'Stacked logo, on black',
    background: 'dark',
  },
  { file: 'gyral-mark-on-white', label: 'Mark, on white', background: 'light' },
  { file: 'gyral-mark-on-black', label: 'Mark, on black', background: 'dark' },
];

interface Colour {
  readonly name: string;
  readonly hex: string;
  readonly oklch: string;
}

const BRIGHT: readonly Colour[] = [
  { name: 'Blue', hex: '#2F6FED', oklch: 'oklch(57.4% 0.202 262.0)' },
  { name: 'Red', hex: '#E5483B', oklch: 'oklch(62.3% 0.196 28.7)' },
  { name: 'Yellow', hex: '#F5B400', oklch: 'oklch(80.9% 0.167 82.3)' },
  { name: 'Green', hex: '#2E9E5B', oklch: 'oklch(62.1% 0.141 152.7)' },
];

const DEEP: readonly Colour[] = [
  { name: 'Deep blue', hex: '#2A63D6', oklch: 'oklch(53.1% 0.187 262.2)' },
  { name: 'Deep red', hex: '#D93A2E', oklch: 'oklch(58.8% 0.198 28.9)' },
  { name: 'Deep yellow', hex: '#C98F00', oklch: 'oklch(68.9% 0.143 79.7)' },
  { name: 'Deep green', hex: '#1F8A4C', oklch: 'oklch(56.0% 0.134 152.5)' },
];

const NEUTRAL: readonly Colour[] = [
  { name: 'Black', hex: '#121317', oklch: 'oklch(18.7% 0.008 274.5)' },
  { name: 'White', hex: '#FFFFFF', oklch: 'oklch(100% 0 0)' },
];

const swatches = (title: string, note: string, colours: readonly Colour[]) => html`
  <section aria-labelledby=${`palette-${title.toLowerCase()}`}>
    <h3 id=${`palette-${title.toLowerCase()}`}>${title}</h3>
    <p>${note}</p>
    <ul role="list" class="swatches">
      ${colours.map(
        (c) =>
          html`<li>
            <svg class="swatch" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
              <rect width="1" height="1" fill=${c.hex}></rect>
            </svg>
            <strong>${c.name}</strong>
            <code>${c.hex}</code>
            <code>${c.oklch}</code>
          </li>`,
      )}
    </ul>
  </section>
`;

export function brandBody(): ChildValue {
  return html`
    <section class="page-intro prose" aria-labelledby="brand-title">
      <h1 id="brand-title">Brand and press</h1>
      <p>
        Writing about Gyral, giving a talk, or showing that your project is built with it? Use the
        files on this page. The complete kit, with every variant, print-ready PDFs and the
        construction notes, is in the <a href=${LINKS.brand} rel="external">gyraljs/brand</a>
        repository.
      </p>
    </section>

    <section class="brand-section prose" aria-labelledby="mark-title">
      <h2 id="mark-title">The mark</h2>
      <div class="split">
        <p>
          A gyre: a spiral that turns outward from a point in eight quarter-turns, each wider than
          the last. It stands for the loop at the heart of Model-View-Intent (intent feeds the
          model, the model drives the view, the view produces new intent) and for that loop growing
          with an application. The name means the same thing: <i>gyral</i>, of a gyre, turning. Four
          colours travel round the spiral in a fixed order, blue, red, yellow, green, twice.
        </p>
        <picture class="brand-mark">
          <source srcset="/brand/mark-dark.svg" media="(prefers-color-scheme: dark)" />
          <img
            src="/brand/mark-light.svg"
            alt="The Gyral mark: a four-colour spiral"
            width="160"
            height="160"
          />
        </picture>
      </div>
    </section>

    <section class="brand-section" aria-labelledby="downloads-title">
      <h2 id="downloads-title">Downloads</h2>
      <p>
        Use the horizontal logo by default, the stacked logo in square or tall spaces, and the mark
        alone where the name is already nearby (avatars, icons).
      </p>
      <ul role="list" class="downloads">
        ${DOWNLOADS.map(
          (d) =>
            html`<li>
              <figure>
                <div class="download-preview" data-background=${d.background}>
                  <img
                    src=${`/brand/download/${d.file}.svg`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <figcaption>
                  <strong>${d.label}</strong>
                  <a href=${`/brand/download/${d.file}.svg`} download>SVG</a>
                  <a href=${`/brand/download/${d.file}-1024.png`} download>PNG, 1024 px</a>
                </figcaption>
              </figure>
            </li>`,
        )}
      </ul>
    </section>

    <section class="brand-section" aria-labelledby="colour-title">
      <h2 id="colour-title">Colour</h2>
      ${swatches('Bright', 'For dark backgrounds.', BRIGHT)}
      ${swatches('Deep', 'For light backgrounds, where the bright yellow would lose contrast.', DEEP)}
      ${swatches('Neutral', 'The brand black is the dark background; never pure #000.', NEUTRAL)}
    </section>

    <section class="brand-section prose" aria-labelledby="usage-title">
      <h2 id="usage-title">Using the logo</h2>
      <div class="split">
        <section aria-labelledby="do-title">
          <h3 id="do-title">Do</h3>
          <ul>
            <li>Use the files as they are.</li>
            <li>Use the on-white versions on light backgrounds and the on-black ones on dark.</li>
            <li>Keep clear space of a quarter of the mark's height on every side.</li>
            <li>
              Keep the horizontal logo at least 96 px wide on screen, the mark at least 16 px.
            </li>
            <li>Use the one-colour versions from the full kit on photos and busy backgrounds.</li>
          </ul>
        </section>
        <section aria-labelledby="dont-title">
          <h3 id="dont-title">Don't</h3>
          <ul>
            <li>Recolour the mark, change its colour order, or swap the palettes.</li>
            <li>Rotate, mirror, stretch, outline it, or add shadows or glows.</li>
            <li>
              Retype the word in another typeface or with a capital: the logo is always "gyral".
            </li>
            <li>Use the mark as a pattern, a bullet, or decoration in other artwork.</li>
          </ul>
        </section>
      </div>
      <p>
        In running text, write <strong>Gyral</strong>. Use <strong>gyraljs</strong> where the plain
        word is ambiguous or taken: the GitHub organisation, social handles, search.
      </p>
    </section>

    <section class="brand-section prose" aria-labelledby="trademark-title">
      <h2 id="trademark-title">Trademarks</h2>
      <p>
        Gyral, gyraljs and the Gyral logo are trademarks of Mike Zupper. The code is open source
        under the MIT license; the artwork is not, so that the logo only ever means "this is Gyral".
      </p>
      <p>You may use the logos, without asking, to:</p>
      <ul>
        <li>refer to Gyral in articles, talks, tutorials, books and videos;</li>
        <li>
          say your project works with, is built with, or supports Gyral, without suggesting
          endorsement;
        </li>
        <li>
          make community material, such as meetup slides and non-commercial stickers, that follows
          these rules.
        </li>
      </ul>
      <p>
        Ask first, by opening an issue in <a href=${LINKS.brand} rel="external">gyraljs/brand</a>,
        to use them in a product, company or project name or logo, a domain or a social handle, to
        sell anything that carries them, or to change them.
      </p>
    </section>
  `;
}
