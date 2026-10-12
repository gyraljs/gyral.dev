// `pnpm recipes` (part of `pnpm check`): the recipes on /docs/recipes/ (content/recipes/) work,
// with the published packages.
// 1. Their own tests run, all of them in Chromium, the way a `basic` create-gyral app runs them.
// 2. The components are built with the Gyral Vite preset (production template compiler) and
//    driven in Chromium with a real keyboard and mouse: the cases a reader would try first.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build } from 'vite';
import { startVitest } from 'vitest/node';
import { playwright } from '@vitest/browser-playwright';
import { chromium } from 'playwright';
import { gyralVitePreset } from '@gyral/core/vite';

const OUT = resolve('.smoke/recipes');
rmSync(OUT, { recursive: true, force: true });
for (const file of readdirSync('content/recipes').filter((f) => f.endsWith('.ts.txt'))) {
  const code = readFileSync(join('content/recipes', file), 'utf8');
  const named = /^\/\/ (src\/[\w./-]+\.ts)\n/.exec(code);
  if (named === null) throw new Error(`content/recipes/${file}: no // src/x.ts file comment`);
  mkdirSync(join(OUT, 'src'), { recursive: true });
  writeFileSync(join(OUT, named[1]), code);
}
writeFileSync(
  join(OUT, 'src/entry.ts'),
  "import './todo-app.js';\nimport './account-form.js';\nexport { settled } from '@gyral/core';\n",
);

// 1. The recipes' tests.
const vitest = await startVitest(
  'test',
  [],
  { root: OUT, config: false, watch: false },
  {
    ...gyralVitePreset({ clientOnly: true }),
    logLevel: 'warn',
    test: {
      include: ['src/**/*.test.ts'],
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: 'chromium' }],
        screenshotFailures: false,
      },
    },
  },
);
const testsFailed =
  vitest.state.getCountOfFailedTests() > 0 || vitest.state.getFiles().length === 0;
await vitest.close();
if (testsFailed) {
  console.error('recipes: the recipes’ own tests failed (files in .smoke/recipes/src)');
  process.exit(1);
}

// 2. The built components, driven like a reader would.
const result = await build({
  configFile: false,
  logLevel: 'warn',
  root: OUT,
  ...gyralVitePreset({ clientOnly: true }),
  build: {
    write: false,
    minify: false,
    lib: { entry: join(OUT, 'src/entry.ts'), formats: ['iife'], name: 'Recipes' },
  },
});
const outputs = Array.isArray(result) ? result.flatMap((r) => r.output) : result.output;
const chunk = outputs.find((o) => o.type === 'chunk');
if (chunk === undefined) throw new Error('recipes: no bundle');

const failures = [];
const check = (name, actual, expected) => {
  const [a, e] = [JSON.stringify(actual), JSON.stringify(expected)];
  if (a !== e) failures.push(`${name}: got ${a}, expected ${e}`);
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.setContent(
    '<!doctype html><html lang="en"><body><my-todo-app></my-todo-app><my-account-form></my-account-form></body></html>',
  );
  await page.addScriptTag({ content: chunk.code });
  const settle = () => page.evaluate(() => window.Recipes.settled());
  const focused = (host) =>
    page.evaluate((h) => document.querySelector(h)?.shadowRoot?.activeElement?.id ?? '', host);
  await settle();

  // The todo list.
  const todo = page.locator('my-todo-app');
  const rows = () => todo.locator('li label').allTextContents();
  const texts = async () => (await rows()).map((t) => t.trim());
  const input = todo.locator('#new-todo');
  await input.fill('Write docs');
  await input.press('Enter');
  await settle();
  check('Enter adds a todo', await texts(), ['Write docs']);
  check('the input is emptied', await input.inputValue(), '');
  for (const text of ['Ship it', 'Celebrate']) {
    await input.fill(text);
    await todo.getByRole('button', { name: 'Add' }).click();
    await settle();
  }
  check('the Add button adds', await texts(), ['Write docs', 'Ship it', 'Celebrate']);
  check('focus returns to the input', await focused('my-todo-app'), 'new-todo');
  await input.fill('   ');
  await input.press('Enter');
  await settle();
  check('a blank todo is ignored', (await texts()).length, 3);

  await todo.getByRole('checkbox', { name: 'Write docs' }).check();
  await settle();
  check('toggling counts', (await todo.locator('output').textContent())?.trim(), '2 left');
  await todo.getByRole('button', { name: 'Active', exact: true }).click();
  await settle();
  check('Active filters', await texts(), ['Ship it', 'Celebrate']);
  check(
    'the filter button is pressed',
    await todo.getByRole('button', { name: 'Active', exact: true }).getAttribute('aria-pressed'),
    'true',
  );
  // The second row on screen is the third todo: toggling it must change "Celebrate".
  // click(), not check(): the row leaves the Active list, so there is nothing to see checked.
  await todo.locator('li').nth(1).getByRole('checkbox').click();
  await settle();
  check('toggling in a filtered list changes the right todo', await texts(), ['Ship it']);
  await todo.getByRole('button', { name: 'Done', exact: true }).click();
  await settle();
  check('Done filters', await texts(), ['Write docs', 'Celebrate']);
  await todo.getByRole('button', { name: 'Delete Write docs' }).click();
  await settle();
  check('Delete removes by id', await texts(), ['Celebrate']);
  check('focus goes to the input after a delete', await focused('my-todo-app'), 'new-todo');
  await todo.getByRole('button', { name: 'All', exact: true }).click();
  await settle();
  check('All shows the rest', await texts(), ['Ship it', 'Celebrate']);
  check('one left', (await todo.locator('output').textContent())?.trim(), '1 left');

  // The signup form.
  const form = page.locator('my-account-form');
  const error = async (field) => (await form.locator(`#${field}-error`).textContent())?.trim();
  const errorsShown = async () => ({
    name: await error('name'),
    email: await error('email'),
    password: await error('password'),
  });
  await form.locator('#name').focus();
  await page.keyboard.press('Enter');
  await settle();
  check('Enter on an empty form shows every error', await errorsShown(), {
    name: 'Enter your name.',
    email: 'Enter your email address.',
    password: 'Enter a password.',
  });
  check('focus goes to the first invalid field', await focused('my-account-form'), 'name');
  check(
    'invalid fields are marked',
    await form.locator('#email').getAttribute('aria-invalid'),
    'true',
  );

  await form.locator('#name').pressSequentially('  Ada  ');
  await settle();
  check('fixing a field clears its error', await error('name'), '');
  check(
    'aria-invalid clears too',
    await form.locator('#name').getAttribute('aria-invalid'),
    'false',
  );
  await form.locator('#email').pressSequentially('ada');
  await settle();
  check(
    'a field with an error is checked again while typing',
    await error('email'),
    'Enter an email address like ada@example.com.',
  );
  await form.locator('#password').pressSequentially('short');
  await page.keyboard.press('Enter');
  await settle();
  check('an invalid email and a short password', await errorsShown(), {
    name: '',
    email: 'Enter an email address like ada@example.com.',
    password: 'Use at least 8 characters.',
  });
  check('focus goes to the first invalid field again', await focused('my-account-form'), 'email');
  check(
    'nobody is welcomed yet',
    (await form.locator('[role="status"]').textContent())?.trim(),
    '',
  );

  await form.locator('#email').fill('ada@example.com');
  await settle();
  check('a fixed email clears', await error('email'), '');
  await form.locator('#password').fill('correct horse');
  await settle();
  check('a fixed password clears', await error('password'), '');
  await form.locator('#password').press('Enter');
  await settle();
  check(
    'Enter submits a valid form, with the name trimmed',
    (await form.locator('[role="status"]').textContent())?.trim(),
    'Welcome, Ada!',
  );

  // A whitespace-only name is missing, even though `required` accepts it.
  await form.locator('#name').fill('   ');
  await form.getByRole('button', { name: 'Create account' }).click();
  await settle();
  check('a blank name is missing', await error('name'), 'Enter your name.');

  check('no page errors', errors, []);
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(`recipes: ${String(failures.length)} failed\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('recipes: tests pass, and the todo list and the signup form behave as the docs say');
