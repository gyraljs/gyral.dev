// ORDER IS LOAD-BEARING: hydrate support must load before anything that imports `lit`
// (gyral consumer setup, "Server rendering checklist").
import '@gyral/ssr/hydrate';
import './islands/loop-counter.js';
