# Nicholas Dunzelman

Source for [dicnunz.github.io](https://dicnunz.github.io/), my personal website.

The homepage links a small selection of projects, working browser demos, recorded experiments, and merged upstream contributions. It uses plain HTML and CSS. Screenshots in `previews/` show the published tools; they are not design mockups.

## Preview and check

```sh
python3 -m http.server 8000
node tools/qa-check.mjs
```

Open http://localhost:8000. The checker validates local links, assets, duplicate IDs, image alternatives, and page metadata. The Google verification token is intentionally not an HTML page.

## Updating a demo

Each project is developed and tested in its own repository. Copy its reviewed build or generated report into `demos/`, preserve relative asset paths, and update the source revision in [`demos/sources.json`](demos/sources.json). Public snapshots add descriptive page metadata; application behavior comes from the linked source. PixelMelt is built with `--base=/demos/pixelmelt/`; Boundary Atlas uses relative assets. Keep the distinction between runnable apps, saved runs, and the synthetic Mission Control example visible.

GitHub Pages publishes this repository. Folio is a separate course repository and Pages site.
