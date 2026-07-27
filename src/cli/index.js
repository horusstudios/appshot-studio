#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import {
  listProjects,
  loadProject,
  saveProject,
  createProject,
  projectExists,
  importImage,
  projectDir,
  safeName,
} from '../server/store.js';
import { newFrame, parseFrameSelector, setPath, groupMembers, newGroupId } from '../core/project.js';
import { setScreenshot } from '../core/render.js';
import { SETS, SET_IDS, applySet } from '../core/sets.js';
import { setLocalized, baseLocale, localeLabel } from '../core/l10n.js';
import { TEMPLATES, TEMPLATE_IDS } from '../core/templates.js';
import { BACKGROUND_PRESETS, BACKGROUND_PRESET_IDS, PATTERNS } from '../core/backgrounds.js';
import { DEVICES, DEVICE_IDS } from '../core/devices.js';
import { FONTS, FONT_IDS } from '../core/fonts.js';
import { renderProject } from './renderer.js';
import { startServer } from '../server/index.js';

// ---------------------------------------------------------------- args
function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, inline] = a.slice(2).split(/=(.*)/s);
      const next = argv[i + 1];
      if (inline !== undefined) out.flags[k] = inline;
      else if (next !== undefined && !next.startsWith('--')) {
        out.flags[k] = next;
        i++;
      } else out.flags[k] = true;
    } else out._.push(a);
  }
  return out;
}

const num = (v, d) => (v === undefined || v === true ? d : Number(v));

// `--bg image:<path>` may point anywhere on disk; copy it into the project so the
// renderer (which serves from the project folder) can actually reach it.
function importBackground(name, bg) {
  if (!bg || typeof bg !== 'object' || bg.type !== 'image' || !bg.src) return bg;
  if (bg.src.startsWith('assets/') || /^https?:/.test(bg.src)) return bg;
  const abs = path.resolve(bg.src);
  if (!fs.existsSync(abs)) die(`no such background image: ${abs}`);
  return { ...bg, src: importImage(name, abs) };
}
const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : null);
const die = (msg) => {
  console.error(`\x1b[31m${msg}\x1b[0m`);
  process.exit(1);
};
const ok = (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`);

// --bg accepts: preset name | #hex | linear:160:#a,#b | radial:#a,#b | mesh:#base:#a,#b,#c
//               | image:assets/bg.jpg | blur
function parseBackground(v) {
  if (!v || v === true) return null;
  const s = String(v);
  if (BACKGROUND_PRESETS[s]) return s;
  if (s.startsWith('#')) return { type: 'solid', color: s };
  const [kind, ...rest] = s.split(':');
  const tail = rest.join(':');
  switch (kind) {
    case 'solid':
      return { type: 'solid', color: tail || '#0f172a' };
    case 'linear': {
      const parts = tail.split(':');
      const angle = parts.length > 1 ? Number(parts[0]) : 160;
      const stops = (parts.length > 1 ? parts[1] : parts[0]).split(',');
      return { type: 'linear', angle, stops };
    }
    case 'radial':
      return { type: 'radial', stops: tail.split(',') };
    case 'mesh': {
      const parts = tail.split(':');
      const base = parts[0];
      const colors = (parts[1] || '').split(',').filter(Boolean);
      const spots = [
        { x: 15, y: 12, size: 75 },
        { x: 88, y: 30, size: 65 },
        { x: 50, y: 92, size: 80 },
        { x: 70, y: 10, size: 60 },
      ];
      return {
        type: 'mesh',
        base,
        blobs: colors.map((c, i) => ({ color: c, ...spots[i % spots.length] })),
      };
    }
    case 'image':
      return { type: 'image', src: tail };
    case 'blur':
    case 'screenshot':
      return { type: 'screenshot', blur: 70, dim: 0.45, scale: 1.5 };
    default:
      die(`Unknown --bg value "${s}". Try: ${BACKGROUND_PRESET_IDS.slice(0, 6).join(', ')}, #hex, linear:160:#a,#b`);
  }
}

// ---------------------------------------------------------------- commands
const commands = {};

commands.new = (a) => {
  const name = a._[0] || die('usage: appshot new <name>');
  const p = createProject(name, {
    app: a.flags.app || name,
    template: a.flags.template || 'text-top',
    background: parseBackground(a.flags.bg) || 'indigo',
    devices: list(a.flags.devices) || ['iphone-6.9', 'ipad-13'],
  });
  const n = num(a.flags.frames, 0);
  if (n > 0) {
    p.frames = Array.from({ length: n }, (_, i) => newFrame(i, { title: `Headline ${i + 1}` }));
    saveProject(name, p);
  }
  ok(`created ${projectDir(name)}`);
  console.log(`  drop screenshots in ${path.join(projectDir(name), 'assets')} then:  appshot add ${name} <files>`);
};

commands.add = (a) => {
  const name = a._[0] || die('usage: appshot add <project> <image...>');
  const files = a._.slice(1);
  if (!files.length) die('give at least one image path');
  const p = loadProject(name);
  const titles = typeof a.flags.titles === 'string' ? a.flags.titles.split('|') : [];
  for (const [i, f] of files.entries()) {
    const abs = path.resolve(f);
    if (!fs.existsSync(abs)) die(`no such file: ${abs}`);
    const rel = importImage(name, abs);
    p.frames.push(
      newFrame(p.frames.length + i, {
        screenshot: rel,
        title: titles[i] || a.flags.title || '',
        subtitle: a.flags.subtitle || '',
        template: a.flags.template || undefined,
      })
    );
  }
  saveProject(name, p);
  ok(`added ${files.length} frame(s) — ${p.frames.length} total`);
};

commands.blank = (a) => {
  const name = a._[0] || die('usage: appshot blank <project> [count] [--pair]');
  const p = loadProject(name);
  const n = Math.max(1, num(a._[1], a.flags.pair ? 2 : 1));
  const group = a.flags.pair ? newGroupId(p.frames) : null;
  for (let k = 0; k < n; k++) {
    const f = newFrame(p.frames.length);
    if (group) f.group = group;
    p.frames.push(f);
  }
  saveProject(name, p);
  ok(group
    ? `added a linked pair — one screenshot spans both (${p.frames.length} frames total)`
    : `added ${n} empty frame(s) — ${p.frames.length} total`);
};

commands.packs = () => {
  for (const id of SET_IDS) {
    const s = SETS[id];
    console.log(`  ${id.padEnd(16)} ${s.name.padEnd(18)} ${s.hint}`);
    console.log(`  ${''.padEnd(16)} ${'order:'.padEnd(18)} ${s.sequence.join(' → ')}`);
  }
};

commands.pack = (a) => {
  const name = a._[0] || die('usage: appshot pack <project> <pack-id>   (appshot packs = list them)');
  const setId = a._[1] || die(`give a pack id. Available: ${SET_IDS.join(', ')}`);
  const p = loadProject(name);
  applySet(p, setId);
  saveProject(name, p);
  ok(`"${SETS[setId].name}" applied to ${p.frames.length} frame(s)`);
  p.frames.forEach((f, i) => console.log(`   ${String(i + 1).padStart(2)}. ${f.template}`));
};

commands.set = (a) => {
  const name = a._[0] || die('usage: appshot set <project> --frames 1,2 --title "..."');
  const p = loadProject(name);
  const idx = parseFrameSelector(a.flags.frames, p.frames.length);
  if (!idx.length) die('no frames matched --frames');

  const titles = typeof a.flags.titles === 'string' ? a.flags.titles.split('|') : null;
  const subtitles = typeof a.flags.subtitles === 'string' ? a.flags.subtitles.split('|') : null;

  const base = baseLocale(p);
  const lang = typeof a.flags.lang === 'string' ? a.flags.lang : base;
  if (!p.locales.includes(lang)) die(`"${lang}" is not in this project — appshot lang ${name} add ${lang}`);
  const put = (f, field, v) => setLocalized(f, lang, base, field, v);

  idx.forEach((fi, k) => {
    const f = p.frames[fi];
    if (titles) put(f, 'title', (titles[k] ?? '').trim());
    else if (typeof a.flags.title === 'string') put(f, 'title', a.flags.title);
    if (subtitles) put(f, 'subtitle', (subtitles[k] ?? '').trim());
    else if (typeof a.flags.subtitle === 'string') put(f, 'subtitle', a.flags.subtitle);
    if (typeof a.flags.eyebrow === 'string') put(f, 'eyebrow', a.flags.eyebrow);
    if (typeof a.flags.role === 'string') {
      if (a.flags.role === 'feature') delete f.role;
      else f.role = a.flags.role;
    }
    if (typeof a.flags.cta === 'string') { put(f, 'cta', a.flags.cta); f.role = 'cta'; }
    if (typeof a.flags.template === 'string') f.template = a.flags.template;
    if (a.flags.bg) f.background = importBackground(name, parseBackground(a.flags.bg));
    if (typeof a.flags.shot === 'string') {
      const src = a.flags.shot;
      const rel = fs.existsSync(path.resolve(src)) && !src.startsWith('assets/')
        ? importImage(name, path.resolve(src))
        : src;
      // Linked frames are slices of one screenshot, so fill every member.
      for (const gi of groupMembers(p.frames, fi)) {
        setScreenshot(p.frames[gi], typeof a.flags.for === 'string' ? a.flags.for : null, rel, !a.flags.for);
      }
    }
  });
  saveProject(name, p);
  ok(`updated frame(s) ${idx.map((i) => i + 1).join(', ')}`);
};

commands.style = (a) => {
  const name = a._[0] || die('usage: appshot style <project> [--frames all] --font Inter ...');
  const p = loadProject(name);
  const scope = a.flags.frames ? parseFrameSelector(a.flags.frames, p.frames.length) : null;

  const patch = {};
  const put = (k, v) => { if (v !== undefined) patch[k] = v; };
  if (typeof a.flags.font === 'string') put('text.font', a.flags.font);
  if (typeof a.flags.color === 'string') put('text.color', a.flags.color);
  if (typeof a.flags['subtitle-color'] === 'string') put('text.subtitleColor', a.flags['subtitle-color']);
  if (a.flags['title-size'] !== undefined) put('text.titleSize', num(a.flags['title-size']));
  if (a.flags['title-weight'] !== undefined) put('text.titleWeight', num(a.flags['title-weight']));
  if (a.flags['subtitle-size'] !== undefined) put('text.subtitleSize', num(a.flags['subtitle-size']));
  if (a.flags['text-shadow'] !== undefined) put('text.shadow', num(a.flags['text-shadow']));
  if (typeof a.flags.align === 'string') put('text.align', a.flags.align);
  if (typeof a.flags.uppercase !== 'undefined') put('text.titleTransform', 'uppercase');
  if (a.flags['device-scale'] !== undefined) put('device.scale', num(a.flags['device-scale']));
  if (a.flags['device-x'] !== undefined) put('device.x', num(a.flags['device-x']));
  if (a.flags['device-y'] !== undefined) put('device.y', num(a.flags['device-y']));
  if (a.flags.rotate !== undefined) put('device.rotate', num(a.flags.rotate));
  if (a.flags.shadow !== undefined) put('device.shadow', num(a.flags.shadow));
  if (typeof a.flags['frame-style'] === 'string') put('device.frame', a.flags['frame-style']);

  const bg = importBackground(name, parseBackground(a.flags.bg));
  const pattern = typeof a.flags.pattern === 'string' ? a.flags.pattern : null;
  const template = typeof a.flags.template === 'string' ? a.flags.template : null;

  // A panorama background is shared by definition, so it always lands on the
  // project defaults and per-frame overrides are cleared.
  const panorama = a.flags.panorama !== undefined;
  if (panorama) {
    const cur = bg || (typeof p.defaults.background === 'object'
      ? p.defaults.background
      : { preset: p.defaults.background || 'indigo' });
    p.defaults.background = typeof cur === 'string' ? { preset: cur, span: true } : { ...cur, span: true };
    p.frames.forEach((f) => delete f.background);
  }

  const applyTo = (target) => {
    for (const [k, v] of Object.entries(patch)) setPath(target, k, v);
    if (bg && !panorama) target.background = bg;
    if (pattern) {
      if (!PATTERNS.includes(pattern)) die(`--pattern must be one of ${PATTERNS.join(', ')}`);
      const base = typeof target.background === 'object' ? target.background : { preset: target.background || 'indigo' };
      target.background = {
        ...base,
        overlay: {
          pattern,
          color: a.flags['pattern-color'] || '#ffffff',
          opacity: num(a.flags['pattern-opacity'], 0.07),
          size: num(a.flags['pattern-size'], 3),
        },
      };
    }
    if (template) target.template = template;
  };

  if (scope) scope.forEach((i) => applyTo(p.frames[i]));
  else applyTo(p.defaults);

  saveProject(name, p);
  ok(scope ? `styled frame(s) ${scope.map((i) => i + 1).join(', ')}` : 'styled project defaults');
};

commands.lang = (a) => {
  const name = a._[0] || die('usage: appshot lang <project> [add|rm|ls] <code>');
  const p = loadProject(name);
  const action = a._[1];
  if (!action || action === 'ls') {
    p.locales.forEach((l, i) =>
      console.log(`  ${l.padEnd(10)} ${localeLabel(l)}${i === 0 ? '   (base)' : ''}`)
    );
    return;
  }
  const code = a._[2] || die('give a locale code, e.g. tr, de, ja');
  if (action === 'add') {
    if (p.locales.includes(code)) die(`"${code}" is already there`);
    p.locales.push(code);
  } else if (action === 'rm') {
    if (p.locales[0] === code) die('the base language cannot be removed');
    p.locales = p.locales.filter((l) => l !== code);
    p.frames.forEach((f) => { if (f.l10n) delete f.l10n[code]; });
  } else die('action must be add, rm or ls');
  saveProject(name, p);
  ok(`languages: ${p.locales.join(', ')}`);
};

commands.icon = (a) => {
  const name = a._[0] || die('usage: appshot icon <project> <icon.png>');
  const src = a._[1] || die('give an icon image path');
  const p = loadProject(name);
  p.appIcon = importImage(name, path.resolve(src));
  saveProject(name, p);
  ok(`app icon set (shows on the cover frame) → ${p.appIcon}`);
};

commands.order = (a) => {
  const name = a._[0] || die('usage: appshot order <project> 3,1,2');
  const order = list(a._[1]) || die('give the new order, e.g. 3,1,2');
  const p = loadProject(name);
  const idx = order.map((n) => Number(n) - 1);
  if (idx.some((i) => Number.isNaN(i) || i < 0 || i >= p.frames.length)) die('bad frame numbers');
  const rest = p.frames.filter((_, i) => !idx.includes(i));
  p.frames = [...idx.map((i) => p.frames[i]), ...rest];
  saveProject(name, p);
  ok(`reordered → ${p.frames.map((f, i) => i + 1).join(', ')}`);
};

commands.rm = (a) => {
  const name = a._[0] || die('usage: appshot rm <project> --frames 2,4');
  const p = loadProject(name);
  const idx = parseFrameSelector(a.flags.frames, p.frames.length);
  if (!idx.length) die('no frames matched --frames');
  p.frames = p.frames.filter((_, i) => !idx.includes(i));
  saveProject(name, p);
  ok(`removed ${idx.length} frame(s) — ${p.frames.length} left`);
};

commands.render = async (a) => {
  const name = a._[0] || die('usage: appshot render <project>');
  const t0 = Date.now();
  const res = await renderProject(name, {
    devices: list(a.flags.devices),
    locales: list(a.flags.locales) || (typeof a.flags.lang === 'string' ? [a.flags.lang] : null),
    out: typeof a.flags.out === 'string' ? a.flags.out : null,
    frames: typeof a.flags.frames === 'string' ? a.flags.frames : null,
    format: a.flags.format,
    quality: num(a.flags.quality, 92),
    orientation: a.flags.landscape ? 'landscape' : undefined,
    offline: !!a.flags.offline,
    onProgress: ({ file }) => console.log(`  · ${path.relative(process.cwd(), file)}`),
  });
  ok(`${res.files.length} image(s) in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${res.outDir}`);
  if (a.flags.open) execFile('open', [res.outDir]);
};

commands.editor = async (a) => {
  const port = num(a.flags.port, 4321);
  const srv = await startServer({ port, renderProject });
  console.log(`\n  \x1b[1mAppShot Studio\x1b[0m  →  \x1b[36m${srv.url}\x1b[0m\n  ctrl-c to stop\n`);
  if (a.flags.open !== false) execFile('open', [srv.url]);
};

commands.ls = () => {
  const ps = listProjects();
  if (!ps.length) return console.log('no projects yet — appshot new <name>');
  for (const p of ps) console.log(`  ${p.name.padEnd(20)} ${String(p.frames).padStart(2)} frames  ${p.devices.join(', ')}`);
};

commands.info = (a) => {
  const name = a._[0] || die('usage: appshot info <project>');
  const p = loadProject(name);
  console.log(`\n  ${p.name}  (${p.app})`);
  console.log(`  devices: ${p.devices.join(', ')}`);
  console.log(`  default template: ${p.defaults.template}   background: ${JSON.stringify(p.defaults.background)}`);
  console.log(`  frames:`);
  p.frames.forEach((f, i) => {
    console.log(
      `   ${String(i + 1).padStart(2)}. [${(f.template || p.defaults.template).padEnd(12)}] ` +
        `${(f.title || '(no title)').slice(0, 40).padEnd(42)} ${f.screenshot ? '' : '⚠ no screenshot'}`
    );
  });
  console.log('');
};

commands.templates = () => {
  for (const id of TEMPLATE_IDS) console.log(`  ${id.padEnd(14)} ${TEMPLATES[id].name.padEnd(22)} ${TEMPLATES[id].hint}`);
};
commands.backgrounds = () => {
  for (const id of BACKGROUND_PRESET_IDS) console.log(`  ${id.padEnd(12)} ${JSON.stringify(BACKGROUND_PRESETS[id])}`);
};
commands.devices = () => {
  for (const id of DEVICE_IDS) {
    const d = DEVICES[id];
    console.log(`  ${id.padEnd(18)} ${String(d.width).padStart(4)}x${String(d.height).padEnd(5)} ${d.label}${d.required ? '  (required by App Store)' : ''}`);
  }
};
commands.fonts = () => {
  for (const id of FONT_IDS) console.log(`  ${id.padEnd(20)} ${FONTS[id].label}`);
};

const help = `
  \x1b[1mAppShot Studio\x1b[0m — App Store / Play Store screenshot builder

  \x1b[1mVisual editor\x1b[0m
    appshot editor [--port 4321]

  \x1b[1mProjects\x1b[0m
    appshot new <name> [--app "App Name"] [--template text-top] [--bg indigo] [--devices iphone-6.9,ipad-13]
    appshot ls
    appshot info <project>

  \x1b[1mStyle packs\x1b[0m  (start here — gives the whole set one consistent look)
    appshot packs
    appshot pack <project> panorama-flow

  \x1b[1mContent\x1b[0m
    appshot blank <project> 3            (empty frames; fill them in the editor)
    appshot blank <project> --pair       (two linked frames sharing one screenshot)
    appshot add <project> shot1.png shot2.png [--titles "A|B"]
    appshot set <project> --frames 1,3 --title "..." --subtitle "..." [--eyebrow "..."] [--template hero] [--bg sunset]
    appshot set <project> --frames all --titles "One|Two|Three"
    appshot set <project> --frames 1 --shot ~/Desktop/ipad-home.png --for ipad-13   (per-device screenshot)
    appshot set <project> --frames 1 --role cover      (cover frame: icon + big headline)
    appshot set <project> --frames 8 --cta "Download free"    (last frame: CTA button)
    appshot icon <project> icon.png
    appshot order <project> 3,1,2

  [1mLocalization[0m
    appshot lang <project>                     (list languages)
    appshot lang <project> add tr
    appshot set <project> --lang de --frames all --titles "Eins|Zwei|Drei"
    appshot render <project> --locales en,tr   (out/<project>/<locale>/<device>/…)
    appshot rm <project> --frames 4

  \x1b[1mStyling\x1b[0m  (no --frames = edit project defaults, applies to every frame)
    appshot style <project> [--frames all] [--template hero] [--bg "linear:160:#6366f1,#ec4899"]
    appshot style <project> --bg image:assets/wide.jpg --panorama   (one image across every screen)
        [--font Inter] [--color "#fff"] [--title-size 6] [--subtitle-size 3.3] [--align center]
        [--uppercase] [--text-shadow 0.4] [--pattern dots] [--device-scale 1.05] [--device-y 2]
        [--rotate 8] [--shadow 0.6] [--frame-style none]

  \x1b[1mExport\x1b[0m
    appshot render <project> [--devices iphone-6.9,ipad-13] [--frames 1-3] [--out ./out] [--format png|jpg] [--open]

  \x1b[1mReference\x1b[0m
    appshot templates | backgrounds | devices | fonts
`;

// ---------------------------------------------------------------- main
const argv = process.argv.slice(2);
const cmd = argv[0];
if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
  console.log(help);
  process.exit(0);
}
if (!commands[cmd]) {
  console.error(`unknown command "${cmd}"`);
  console.log(help);
  process.exit(1);
}
try {
  await commands[cmd](parseArgs(argv.slice(1)));
} catch (err) {
  die(err && err.stack ? err.message : String(err));
}
