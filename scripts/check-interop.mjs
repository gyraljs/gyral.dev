// `pnpm interop` (part of `pnpm check`): proves the recipes on the "Using Gyral in other
// frameworks" and "Using third-party web components" docs pages in Chromium, with the
// published @gyral/core. test/interop/entry.ts is bundled into one script and run in a blank
// page, used the way a non-Gyral host would use it: plain DOM, no Gyral parent.
import { build } from 'vite';
import { chromium } from 'playwright';
import { gyralVitePreset } from '@gyral/core/vite';

const result = await build({
  configFile: false,
  logLevel: 'warn',
  ...gyralVitePreset(),
  build: {
    write: false,
    minify: false,
    lib: { entry: 'test/interop/entry.ts', formats: ['iife'], name: 'Interop' },
  },
});
const outputs = Array.isArray(result) ? result.flatMap((r) => r.output) : result.output;
const chunk = outputs.find((o) => o.type === 'chunk');
if (chunk === undefined) throw new Error('interop: no bundle');

const failures = [];
const check = (name, ok, detail = '') => {
  if (!ok) failures.push(`${name}${detail === '' ? '' : `: ${detail}`}`);
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: chunk.code });

  // 1. Props as attributes (converted by type) and as properties; outputs as a DOM event.
  const picker = await page.evaluate(async () => {
    const el = document.createElement('interop-picker');
    el.setAttribute('label', 'Choose');
    el.setAttribute('max', '2'); // attribute string → Number prop
    el.items = ['a', 'b']; // arrays and objects: properties only
    const onHost = [];
    const onDocument = [];
    el.addEventListener('gyral-output', (e) => onHost.push(e.detail));
    document.addEventListener('gyral-output', (e) => onDocument.push(e.detail));
    document.body.append(el);
    await window.Interop.settled();
    const text = el.shadowRoot.querySelector('p').textContent;
    el.shadowRoot.querySelector('button[value="b"]').click();
    await new Promise((r) => setTimeout(r, 0));
    return { text, onHost, onDocument, composed: false };
  });
  check('attribute props render', picker.text === 'Choose (max 2)', picker.text);
  check(
    'output reaches a listener on the element',
    JSON.stringify(picker.onHost) === JSON.stringify([{ _tag: 'Picked', id: 'b' }]),
    JSON.stringify(picker.onHost),
  );
  check(
    'output bubbles to the document when the element is in the document',
    picker.onDocument.length === 1,
    JSON.stringify(picker.onDocument),
  );

  // 2. Inside another shadow root, the output stays there (composed: false).
  const contained = await page.evaluate(async () => {
    const wrapper = document.createElement('div');
    const root = wrapper.attachShadow({ mode: 'open' });
    const el = document.createElement('interop-picker');
    el.items = ['x'];
    root.append(el);
    const seen = { root: 0, outside: 0 };
    root.addEventListener('gyral-output', () => (seen.root += 1));
    wrapper.addEventListener('gyral-output', () => (seen.outside += 1));
    document.body.append(wrapper);
    await window.Interop.settled();
    el.shadowRoot.querySelector('button').click();
    await new Promise((r) => setTimeout(r, 0));
    return seen;
  });
  check('output is heard inside the containing shadow root', contained.root === 1);
  check('output does not cross the shadow boundary', contained.outside === 0);

  // 3. A third-party element's event as an intent: data-intent-on alone (no `events`), detail.
  const host = await page.evaluate(async () => {
    const el = document.createElement('interop-host');
    document.body.append(el);
    await window.Interop.settled();
    el.shadowRoot.querySelector('fake-select').click();
    await window.Interop.settled();
    return el.shadowRoot.querySelector('output').textContent;
  });
  check('third-party event reaches the parser with detail and target', host === 'b', host);

  // 4. OUTPUT_EVENT names the event; a plain custom element talks to a Gyral parent with it.
  const plain = await page.evaluate(async () => {
    const el = document.createElement('interop-parent');
    document.body.append(el);
    await window.Interop.settled();
    el.shadowRoot.querySelector('plain-child').click();
    await window.Interop.settled();
    return {
      name: window.Interop.OUTPUT_EVENT,
      heard: el.shadowRoot.querySelector('output').textContent,
    };
  });
  check('OUTPUT_EVENT is gyral-output', plain.name === 'gyral-output', plain.name);
  check(
    'a non-Gyral child reaches a Gyral parent with OUTPUT_EVENT',
    plain.heard === 'plain',
    plain.heard,
  );
  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(`interop: ${String(failures.length)} failed\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('interop: outputs, props and third-party events behave as the docs say');
