# AppShot Studio

Generate App Store and Google Play screenshots. Drop in a screenshot, pick a style
pack, write the copy, get PNGs at every required device size.

A visual editor **plus** a CLI you can drive from Claude Code. Both use the same render
engine (`src/core/render.js`), so what you see in the editor is byte-for-byte what gets
exported.

## Install

```bash
npm install
npm link            # makes `appshot` available everywhere
```

Rendering runs through Chromium. If you do not already have a Playwright browser
cached, install one:

```bash
npx playwright install chromium
```

Or point at any Chrome/Chromium you already have with `APPSHOT_CHROME=/path/to/chrome`.

## Usage

```bash
appshot editor                  # visual editor → http://localhost:4321
appshot --help                  # every command
```

```bash
appshot new my-app --app "My App" --bg indigo
appshot add my-app ~/Desktop/shots/*.png
appshot pack my-app panorama-flow
appshot set my-app --frames all --titles "Track it all|Set and forget|See your progress"
appshot render my-app --open
```

Output lands in `out/<project>/<device>/01-headline.png` at the exact pixel size the
store expects (iPhone 6.9" 1290×2796, iPad 13" 2064×2752, Play 1080×1920 …).

## What is in it

- **16 style packs** — one click styles the whole set: background, typography, device
  settings and a template for every frame, so no frame is left half-finished.
- **20 templates** — text-top, hero, tilt, duo, trio, full-bleed, split, corner, peek…
- **Continuous sets** — panorama and storyboard packs treat the whole set as one wide
  composition: the background flows across frames and some devices span two
  screenshots.
- **17 background presets** plus solid / linear / radial / mesh / image /
  blurred-screenshot, with dots, grid, diagonal or noise on top, and a shape layer
  (blocks, blobs, waves, circles) drawn across the entire set.
- **Pure-CSS device frames** — Dynamic Island, notch, iPad, Android punch-hole. No
  external assets, sharp at any scale.
- **Localization** — add a language and it appears as a new row on the board. Only
  text and screenshots vary per language; the layout is shared. Exports go to
  `out/<project>/<locale>/<device>/`.
- **Per-device screenshots** — give iPad its own image instead of cropping a phone shot.
- **14 fonts** (Google Fonts) plus a system-font fallback.
- Resolution-independent units (percentages of canvas width), so one setting looks the
  same on every device.

## Editor

Left: frame strip · Middle: live preview · Right: inspector. The **This frame / All
frames** switch decides whether an edit lands on one frame or the whole project.
Drop PNGs anywhere on the window to add frames.

**Grid** view is a blueprint board — one row per language, one column per frame — so
you can see and edit the entire set, in every language, at once.

## Driving it from Claude Code

`CLAUDE.md` documents the CLI so an agent can do batch edits without hand-editing JSON:

```
cd appshot-studio && claude
> rewrite all the headlines and export just the iPhone sizes
```

The editor also has a **Claude Code** button that shows the equivalent commands for the
open project, ready to copy.

## Licence

MIT
