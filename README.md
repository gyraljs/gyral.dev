# gyral.dev

The website for [Gyral](https://github.com/gyraljs/gyral), Model-View-Intent web components on
the modern web platform: the home page and the documentation at https://gyral.dev.

The site is built with Gyral. Pages are server-rendered with `@gyral/ssr` and written to static
files; the live demo on the home page is a Gyral component hydrated in the browser. Docs pages
are Markdown in [`content/docs`](content/docs) and ship no JavaScript.

## Development

```sh
pnpm install
pnpm exec playwright install chromium
pnpm dev      # http://localhost:5400
pnpm check    # the full gate, including a production build and a browser smoke test
```

`@gyral/*` 0.3.0 comes from the release tarballs in `vendor/` (`file:` dependencies and pnpm
overrides) until 0.3.0 is on npm; [vendor/README.md](vendor/README.md) says how to remove them.
A checkout of `gyraljs/gyral` (its `main` branch) is only needed for `pnpm sync:examples` and
`pnpm sync:demos`: `GYRAL_DIR` if set, else the sibling folder `../cyclejs-web-framework`.

## Contributing to the docs

Edit or add a file in `content/docs/`. Each page has a short front-matter header (see
[docs/design-docs/0002-content.md](docs/design-docs/0002-content.md)). Code blocks that start
with a file comment, such as `// src/counter.ts`, are typechecked by `pnpm check`.

## License

Code and docs text: MIT, see [LICENSE](LICENSE). Gyral, gyraljs and the Gyral logo are
trademarks of Mike Zupper; the logo files in `public/` come from
[gyraljs/brand](https://github.com/gyraljs/brand) and follow its usage guidelines.
