# AppShot Studio

App Store / Google Play screenshot generator. Two front ends, **one render engine** —
what you see in the editor is exactly what gets exported (`src/core/render.js`).

## For coding agents: how to do batch edits

This project is a plain Node CLI with no AI dependency, so any agent that can run
shell commands (Claude Code, Codex, Cursor, Gemini CLI, Aider…) can drive it.

When the user asks for something like "change the headlines in that project", "make
them all use this background", or "export it again", **use the CLI** — do not hand-edit
the JSON.

```bash
cd ~/appshot-studio

appshot ls                      # projects
appshot info <project>          # frame list: template and headline per frame
appshot templates               # layouts
appshot backgrounds             # background presets
appshot devices                 # devices and their exact pixel sizes
appshot fonts
```

A typical run:

```bash
# 1) create a project, add the simulator screenshots
appshot new my-app --app "My App" --bg indigo
appshot add my-app ~/Desktop/shots/*.png

#    or lay the set out first and fill the images in later, in the editor
appshot blank my-app 5
appshot blank my-app --pair          # two linked frames sharing one screenshot

# 1.5) pick a pack FIRST — one consistent look for the whole set,
#      instead of assigning templates frame by frame
appshot packs
appshot pack my-app panorama-flow

# 2) write all the copy at once ( split with | , handed out in frame order )
appshot set my-app --frames all \
  --titles "Track it all in one place|Set it and forget it|See your progress" \
  --subtitles "Every account, one screen|Rules run in the background|Weekly and monthly views"

# 3) override individual layouts
appshot set my-app --frames 2 --template tilt-right
appshot set my-app --frames 3 --template duo

# 4) restyle the whole project (NO --frames means it writes to defaults = everything)
appshot style my-app --font Poppins --title-size 6.4 --bg "linear:160:#6366f1,#ec4899" --pattern dots

# 5) export
appshot render my-app                       # every device in project.devices
appshot render my-app --devices iphone-6.9  # just one
appshot render my-app --frames 1-3 --open
```

Output: `out/<project>/<device>/01-headline.png` — at the exact pixel size the App
Store expects.

### Style packs (start here)

A pack defines the background, the typography, the device settings **and the template
for every frame**, all together (`src/core/sets.js`). `appshot pack <project> <id>`
applies it to the whole set; if there are more frames than entries in the sequence it
wraps around, so **no frame is ever left half-styled**. Applying a pack clears
per-frame look overrides (`background`/`text`/`device`) but never touches the copy.
Individual frames can still be changed afterwards.

`panorama-flow` and `panorama-tilt` are **continuous** sets: the background and the
devices carry on from one frame to the next, so the set reads as one wide image.

**`story-*` packs (storyboard):** the set is ONE composition sliced into ~10 frames.
- Background shapes (`src/core/shapes.js`) are drawn across the whole strip; panel
  edges deliberately miss the frame boundaries (`offset: 0.5`).
- Device size and height shift frame to frame through the `variants[]` rhythm; in
  `strip-cross` every third device spills over into the next frame (`z: 0` keeps it
  behind its neighbours).
- Copy alternates top/bottom via `textVariants[]`. Do not place copy where the device
  sits — white text over a white screenshot disappears.
- The first frame gets `role: 'cover'` (icon + large headline), the last gets
  `role: 'cta'` (no device, centred headline + button). `applySet` assigns the roles.

Shape kinds: `blocks` (mode `full`/`alt`), `blobs`, `waves`, `circles`. Add
`shapes: {...}` to a background object to attach one to any pack.

Continuous templates (`pano-flow`, `pano-tilt`, `pano-hero`) are marked with the
`continuous` field. At render time a strip `count` frames wide is drawn and shifted
left by `index`, which is why **you must pass `index` to `renderFrame`** — without it
the index falls back to `project.frames.indexOf(frame)`.

### Localization

```bash
appshot lang <project>                # list languages (the first one is the base)
appshot lang <project> add tr
appshot set <project> --lang tr --frames all --titles "Bir|İki|Üç"
appshot render <project> --locales en,tr
```

- Only **text and screenshots** vary by language (`L10N_FIELDS`, `src/core/l10n.js`).
  Template, background and device settings are shared — you build the layout once.
- Translations live under `frame.l10n[locale]`; a field left empty falls back to the base.
- Without `--lang`, `set` writes to the base language.
- Export: `out/<project>/<device>/` for a single language,
  `out/<project>/<locale>/<device>/` for several. File names come from that
  language's headline.

### Panoramic backgrounds

`background.span: true` stretches ONE background across the whole set: the background
element becomes as wide as every frame put together and slides left by one frame per
index, so each frame shows its own slice. It works on any template, not just the
continuous ones, and applies to any background type — an uploaded image, a gradient
or a mesh, along with its shape layer.

```bash
appshot style <project> --bg image:~/Desktop/wide.jpg --panorama
```

A panorama is shared by definition, so both the CLI and the editor write it to the
project defaults and clear per-frame background overrides. `--bg image:<path>` copies
the file into the project's assets first, so a path anywhere on disk works.

### Linked frames

Frames carrying the same `group` id are consecutive slices of ONE screenshot, and
their device is split down the seam so half lands on each frame. This works on every
template: a continuous one draws the device once on the strip, while an ordinary one
has each frame draw it shifted half a canvas across, with the overflow clipped.

They behave as a unit — setting `--shot` on one fills every member, deleting one
deletes them all, and in the editor any layout, background or device change on one
half is written to the other, because the two halves must match or the seam stops
lining up. Only the copy stays per frame. See `groupRange`/`groupMembers` in
`src/core/project.js`.

```bash
appshot blank <project> --pair
appshot set <project> --frames 3 --shot ~/wide.png   # fills frame 4 too
```

### Rules that matter

- With **no** `--frames`, `style` changes the project defaults → every frame is affected.
  With `--frames 2,4` or `--frames 1-3` it writes overrides only on those frames.
- Frame numbers start at **1**.
- Copy supports `**bold**` and line breaks (`\n`).
- To use a different screenshot on iPad:
  `appshot set <project> --frames 1 --shot ~/x.png --for ipad-13`.
  Otherwise the same image is used everywhere (a phone shot gets cropped on iPad).
- Units are resolution independent: font size and device width are a **percentage of
  the canvas width**, so the same settings look the same on iPhone and iPad.

## Visual editor

```bash
appshot editor          # http://localhost:4321
```

Left: frame strip · Middle: live preview · Right: inspector.
The **This frame / All frames** switch at the top decides whether an edit lands on one
frame or on the whole project (the same idea as `--frames` in the CLI).
Dropping PNGs on the window creates new frames; dropping one onto a card fills that
frame instead. **+ Add screen** asks whether you want a single frame or a linked
pair, then drops in empty frames with placeholders you click or drop onto — so you
can lay the whole set out before you have the images.

- **Grid / Edit** switch: Grid is the default — the blueprint board — **one row per language**, one
  column per frame. Headline and sub-headline are typed straight under each card. On
  translation rows the base-language text shows as the placeholder, and anything left
  empty falls back to the base. **+ Add language** at the end adds a row.
- **Browse all templates visually…** (in the Template section): renders every template
  *using that frame's own screenshot and copy*; click to apply.
- Clicking a card selects that frame (and drops out of All-frames scope, so the next
  edit hits only it). With **All frames** active every card is outlined, because that
  is what the next edit will change.
- **Layers** section: stack images, text and emoji on a frame — badges, logos,
  stickers, cut-outs. **Drag a layer on the canvas** to move it, use the round
  handle to rotate (hold Shift to snap to 15°) and the square one to resize.
  Handles are drawn in a screen-space overlay so they stay grabbable even on a
  layer at the very edge of the canvas.
  Everything is stored as a percentage of the canvas — `size` is image width for
  image layers and font size for text and emoji — so a layer holds its place at any
  zoom and on every device size. Layers are per frame and shared across languages
  (`frame.layers[]`, see `DEFAULT_LAYER` and `LAYER_TYPES` in `src/core/render.js`).
- Layers can be copied between frames: **⌘C** copy, **⌘V** paste into the selected
  frame, **⇧⌘V** paste onto every frame at once (handy for a badge that belongs on
  the whole set), **⌘D** duplicate in place. A pasted layer keeps its exact position
  and rotation, so it lands identically on each frame; a duplicate is nudged so it
  does not hide behind the original.
- **✳ Claude Code** button: the commands for that project, ready to copy — the short
  version of this file.

## File layout

```
projects/<project>/project.json    # the single source of truth (frames, defaults, devices)
projects/<project>/assets/         # uploaded screenshots
out/<project>/<device>/*.png       # exports
src/core/                          # render engine — shared by the browser and the CLI
```

`project.json` schema: any field on a frame (`template`, `background`, `text.*`,
`device.*`) overrides the one in `defaults`. Anything left empty comes from defaults.

## Technical notes

- Rendering runs through Chromium (`playwright-core`, found in the Playwright cache).
  If it is missing: `npx playwright install chromium`, or set
  `APPSHOT_CHROME=/path/to/chrome`.
- Device frames are drawn in pure CSS — no external assets, sharp at any scale.
- Fonts come from Google Fonts; with no internet, `--offline` falls back to system fonts.
- Style values are inlined into `style="..."` attributes, so **never use double quotes**
  inside them (font stacks, `url()` and friends must use single quotes).
