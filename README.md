# Nicholas Dunzelman

Source for [dicnunz.github.io](https://dicnunz.github.io/). Plain HTML and CSS with six selected projects and merged upstream contributions.

## Preview and check

```sh
npm ci
npm run check
npm run test:browser
```

For a local preview, run `python3 -m http.server 8000` and open http://localhost:8000. Browser tests require Playwright Chromium (`npx playwright install chromium`). They check desktop and mobile layouts, image loading, navigation, and demo interactions.

## Content

Project descriptions follow the linked repositories. Preview images show actual results or running software. Mars imagery is NASA/JPL-Caltech; Golden Record source terms are documented in its [data notice](https://github.com/dicnunz/golden-record/blob/main/DATA-NOTICE.md).

Develop demos in their own repositories, copy reviewed builds into `demos/`, and record their origin in [sources.json](demos/sources.json). Preserve saved-run and synthetic-data labels. Public display names may differ from compatibility paths.

The layout follows the compact entries in [Matt Keeter's project index](https://www.mattkeeter.com/projects/) and the output, method, and source links in [Michael Fogleman's projects](https://www.michaelfogleman.com/). The homepage summarizes results; project repositories retain detailed methods and limitations.

GitHub Pages publishes this repository.
