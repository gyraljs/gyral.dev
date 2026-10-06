/// <reference types="node" />
// `pnpm sync:code-css`: writes src/styles/code.css, the classes that colour highlighted code
// (src/content/markdown.ts, codeCss). Run it after upgrading Shiki or changing a theme;
// test/content.test.ts fails while the file is out of date.
import { writeFile } from 'node:fs/promises';
import { codeCss } from '../src/content/markdown.js';

await writeFile(new URL('../src/styles/code.css', import.meta.url), await codeCss());
console.log('src/styles/code.css written');
