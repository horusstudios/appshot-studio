import {
  renderFrame,
  CANVAS_CSS,
  DEFAULT_TEXT,
  DEFAULT_DEVICE,
  setScreenshot,
  resolveScreenshots,
} from '/src/core/render.js';
import { TEMPLATES, TEMPLATE_IDS } from '/src/core/templates.js';
import { BACKGROUND_PRESETS, BACKGROUND_PRESET_IDS, PATTERNS, resolveBackground } from '/src/core/backgrounds.js';
import { DEVICES } from '/src/core/devices.js';
import { FONTS, FONT_IDS, googleFontsHref } from '/src/core/fonts.js';
import { newFrame, getPath, setPath } from '/src/core/project.js';
import { SETS, SET_IDS, applySet } from '/src/core/sets.js';
import { getLocalized, setLocalized, localeLabel, COMMON_LOCALES } from '/src/core/l10n.js';

// ---------------------------------------------------------------- boot
document.head.insertAdjacentHTML(
  'beforeend',
  `<link rel="stylesheet" href="${googleFontsHref()}"><style>${CANVAS_CSS}</style>`
);

const $ = (s) => document.querySelector(s);
const state = {
  name: null, project: null, device: null, sel: 0,
  scope: 'frame', zoom: 1, view: 'grid', locale: null, layer: 0, clip: null,
};

const api = {
  projects: () => fetch('/api/projects').then((r) => r.json()),
  load: (n) => fetch(`/api/project/${encodeURIComponent(n)}`).then((r) => r.json()),
  save: (n, p) =>
    fetch(`/api/project/${encodeURIComponent(n)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(p),
    }),
  create: (n) =>
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: n }),
    }).then((r) => r.json()),
  upload: (n, file) =>
    fetch(`/api/project/${encodeURIComponent(n)}/upload`, {
      method: 'POST',
      headers: { 'x-filename': file.name },
      body: file,
    }).then((r) => r.json()),
  render: (n, body = {}) =>
    fetch(`/api/project/${encodeURIComponent(n)}/render`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
  reveal: (n) => fetch(`/api/project/${encodeURIComponent(n)}/reveal`, { method: 'POST' }),
};

let toastTimer;
function toast(msg, ms = 2200) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), ms);
}

let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => api.save(state.name, state.project), 400);
}

const assetURL = (p) =>
  !p ? p : /^https?:|^data:/.test(p) ? p : `/projects/${encodeURIComponent(state.name)}/${p}`;

const frame = () => state.project.frames[state.sel];

// ---------------------------------------------------------------- value plumbing
function eff(path, fallback) {
  const f = frame();
  const a = f ? getPath(f, path) : undefined;
  if (a !== undefined && a !== null) return a;
  const b = getPath(state.project.defaults, path);
  if (b !== undefined && b !== null) return b;
  return fallback;
}

function clearPath(obj, path) {
  const keys = path.split('.');
  let node = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    node = node && node[keys[i]];
    if (!node) return;
  }
  delete node[keys[keys.length - 1]];
}

function write(path, value) {
  if (state.scope === 'frame') {
    setPath(frame(), path, value);
  } else {
    state.project.frames.forEach((f) => clearPath(f, path));
    setPath(state.project.defaults, path, value);
  }
  save();
  paint();
}

// ---------------------------------------------------------------- painting
function paint() {
  const grid = state.view === 'grid';
  $('#gridHost').hidden = !grid;
  $('.stage-inner').hidden = grid;
  $('.filmstrip').classList.toggle('collapsed', grid);
  if (grid) drawGrid();
  else { drawCanvas(); drawThumbs(); }
  markSelectedLayer();
}

// Blueprint board: one row per language, one column per frame.
function drawGrid() {
  const host = $('#gridHost');
  const base = state.project.locales[0];
  const seamless = state.project.frames.some(
    (f) => TEMPLATES[f.template || state.project.defaults.template].continuous
  );

  host.innerHTML =
    state.project.locales
      .map(
        (loc) => `<div class="brow" data-loc="${loc}">
          <div class="bhead">
            <b>${loc}</b>
            <span class="${loc === base ? 'base' : ''}">${
              loc === base ? 'base language' : localeLabel(loc)
            }</span>
            ${loc === base ? '' : `<button data-rmlang="${loc}">remove</button>`}
          </div>
          <div class="bframes">
            ${state.project.frames
              .map((f, i) => boardCard(f, i, loc, base, seamless))
              .join('')}
            ${loc === base ? '<button class="gadd" id="gridAdd">+ Add screenshot</button>' : ''}
          </div>
        </div>`
      )
      .join('') + `<button class="addlang" id="addLang">+ Add language</button>`;
}

function boardCard(f, i, loc, base, seamless) {
  const cardW = Math.round(150 * state.zoom);
  const { html, width, height } = renderFrame({
    frame: f,
    project: state.project,
    deviceId: state.device,
    orientation: state.project.orientation,
    assetURL,
    index: i,
    locale: loc,
  });
  const s = (146 * state.zoom) / width;
  const isSel = i === state.sel && loc === state.locale;
  const all = state.scope === 'all';
  const title = getLocalized(f, loc, base, 'title');
  const subtitle = getLocalized(f, loc, base, 'subtitle');
  // On translation rows, show the base-language text as the placeholder.
  const ph = loc === base ? ['Headline', 'Sub-headline'] : [f.title || 'Headline', f.subtitle || 'Sub-headline'];
  return `<div class="bcell${seamless ? ' seam' : ''}">
    <div class="gcard${isSel ? ' on' : ''}${all ? ' all' : ''}" data-i="${i}" data-loc="${loc}" style="width:${cardW}px;flex:0 0 ${cardW}px">
      <div class="gshot" style="height:${height * s}px">
        <span class="gidx">${i + 1}</span>
        <span class="gtpl">${TEMPLATES[f.template || state.project.defaults.template].name}</span>
        <div class="tw" style="transform:scale(${s})">${html}</div>
      </div>
      <input type="text" data-gt="${i}" data-loc="${loc}" placeholder="${escAttr(ph[0])}" value="${escAttr(title)}">
      <input type="text" class="gsub" data-gs="${i}" data-loc="${loc}" placeholder="${escAttr(ph[1])}" value="${escAttr(subtitle)}">
    </div>
  </div>`;
}

function drawCanvas() {
  const host = $('#canvasHost');
  if (!frame()) {
    host.innerHTML = '<div style="color:#5b6072;padding:60px">No frames yet — add a screenshot →</div>';
    host.style.transform = '';
    return;
  }
  const { html, width, height } = renderFrame({
    frame: frame(),
    project: state.project,
    deviceId: state.device,
    orientation: state.project.orientation,
    assetURL,
    index: state.sel,
    locale: state.locale,
  });
  host.innerHTML = html;
  const stage = $('#stage').getBoundingClientRect();
  const fit = Math.min((stage.width - 60) / width, (stage.height - 60) / height);
  const s = fit * state.zoom;
  host.style.width = width * s + 'px';
  host.style.height = height * s + 'px';
  const el = host.firstElementChild;
  el.style.transformOrigin = 'top left';
  el.style.transform = `scale(${s})`;
  el.style.position = 'absolute';
  host.style.position = 'relative';
}

function drawThumbs() {
  const list = $('#frameList');
  list.innerHTML = '';
  state.project.frames.forEach((f, i) => {
    const { html, width, height } = renderFrame({
      frame: f,
      project: state.project,
      deviceId: state.device,
      orientation: state.project.orientation,
      assetURL,
      index: i,
      locale: state.locale,
    });
    const s = 146 / width;
    const div = document.createElement('div');
    div.className = 'thumb' + (i === state.sel ? ' on' : '');
    div.style.height = height * s + 'px';
    div.innerHTML =
      `<span class="idx">${i + 1}</span>` +
      `<button class="del" data-del="${i}" title="Delete">×</button>` +
      `<span class="mv"><button data-mv="${i}:-1">↑</button><button data-mv="${i}:1">↓</button></span>` +
      `<div class="tw" style="transform:scale(${s})">${html}</div>`;
    div.onclick = (e) => {
      if (e.target.dataset.del !== undefined) {
        state.project.frames.splice(+e.target.dataset.del, 1);
        state.sel = Math.max(0, Math.min(state.sel, state.project.frames.length - 1));
        save(); paint(); buildInspector();
        return;
      }
      if (e.target.dataset.mv) {
        const [idx, dir] = e.target.dataset.mv.split(':').map(Number);
        const to = idx + dir;
        if (to < 0 || to >= state.project.frames.length) return;
        const [m] = state.project.frames.splice(idx, 1);
        state.project.frames.splice(to, 0, m);
        state.sel = to;
        save(); paint(); buildInspector();
        return;
      }
      state.sel = i;
      paint();
      buildInspector();
    };
    list.appendChild(div);
  });
}

function refreshGridCard(i, loc) {
  const card = $(`#gridHost .gcard[data-i="${i}"][data-loc="${loc}"]`);
  if (!card) return;
  const f = state.project.frames[i];
  const { html, width, height } = renderFrame({
    frame: f,
    project: state.project,
    deviceId: state.device,
    orientation: state.project.orientation,
    assetURL,
    index: i,
    locale: loc,
  });
  const s = (146 * state.zoom) / width; // same scale as boardCard
  card.querySelector('.gshot').style.height = height * s + 'px';
  card.querySelector('.tw').style.transform = `scale(${s})`;
  card.querySelector('.tw').innerHTML = html;
  card.querySelector('.gtpl').textContent =
    TEMPLATES[f.template || state.project.defaults.template].name;
}

$('#gridHost').addEventListener('input', (e) => {
  const t = e.target;
  const i = t.dataset.gt ?? t.dataset.gs;
  if (i === undefined) return;
  const loc = t.dataset.loc;
  const field = t.dataset.gt !== undefined ? 'title' : 'subtitle';
  setLocalized(state.project.frames[+i], loc, state.project.locales[0], field, t.value);
  save();
  refreshGridCard(+i, loc);
});

$('#gridHost').addEventListener('click', (e) => {
  if (justDragged) return;
  if (e.target.id === 'gridAdd') { pickTarget = 'new'; $('#filePicker').click(); return; }
  if (e.target.id === 'addLang') { addLanguage(); return; }
  if (e.target.dataset.rmlang) { removeLanguage(e.target.dataset.rmlang); return; }
  const card = e.target.closest('.gcard');
  if (!card) return;
  state.sel = +card.dataset.i;
  state.locale = card.dataset.loc;
  if (state.scope === 'all') {
    state.scope = 'frame';
    document.querySelectorAll('.scope button').forEach((x) =>
      x.classList.toggle('on', x.dataset.scope === 'frame')
    );
    paint();
  } else {
    document.querySelectorAll('.gcard').forEach((c) => c.classList.toggle('on', c === card));
  }
  buildInspector();
});

function commitLanguage(code) {
  const clean = String(code || '').trim();
  if (!clean) return;
  if (state.project.locales.includes(clean)) return toast('That language is already here');
  state.project.locales.push(clean);
  state.locale = clean;
  save();
  closeModal();
  paint();
  buildInspector();
  toast(`${localeLabel(clean)} added — fill in the translations on its row`);
}

function addLanguage() {
  const used = new Set(state.project.locales);
  const items = Object.entries(COMMON_LOCALES).filter(([c]) => !used.has(c));
  openModal(
    'Add language',
    `<div class="langgrid">${items
      .map(([c, l]) => `<button data-lang="${c}"><b>${c}</b><span>${l}</span></button>`)
      .join('')}</div>
     <div class="row" style="margin-top:14px">
       <input type="text" id="langCustom" placeholder="Not listed? Type a code (e.g. nb, zh-Hant)">
       <button class="ghost" id="langAdd" style="flex:0 0 auto">Add</button>
     </div>`
  );
  $('#modalBody').onclick = (e) => {
    const b = e.target.closest('[data-lang]');
    if (b) return commitLanguage(b.dataset.lang);
    if (e.target.id === 'langAdd') commitLanguage($('#langCustom').value);
  };
  $('#langCustom').onkeydown = (e) => {
    if (e.key === 'Enter') commitLanguage(e.target.value);
  };
}

function removeLanguage(code) {
  openModal(
    'Remove language',
    `<div class="cc-intro"><b>${code} — ${localeLabel(code)}</b> row and every translation in
      this language will be deleted. Other languages are untouched.</div>
     <div class="modal-actions">
       <button class="danger" id="rmYes">Remove</button>
       <button class="ghost" id="rmNo">Cancel</button>
     </div>`
  );
  $('#modalBody').onclick = (e) => {
    if (e.target.id === 'rmNo') return closeModal();
    if (e.target.id !== 'rmYes') return;
    state.project.locales = state.project.locales.filter((l) => l !== code);
    state.project.frames.forEach((f) => { if (f.l10n) delete f.l10n[code]; });
    if (state.locale === code) state.locale = state.project.locales[0];
    save(); closeModal(); paint(); buildInspector();
  };
}

const curLayer = () => {
  const ls = frame()?.layers;
  return ls && ls.length ? ls[Math.min(state.layer, ls.length - 1)] : null;
};

// An in-app clipboard, not the OS one: a layer is a small object, and keeping
// it here means paste works without clipboard permissions or parsing pasted text.
function copyLayer() {
  const l = curLayer();
  if (!l) return toast('Select a layer first');
  state.clip = JSON.parse(JSON.stringify(l));
  buildInspector();
  toast('Layer copied');
}

function pasteLayer(intoAll = false) {
  if (!state.clip) return;
  const targets = intoAll ? state.project.frames : [frame()];
  targets.forEach((f) => {
    if (!f) return;
    f.layers = f.layers || [];
    f.layers.push(JSON.parse(JSON.stringify(state.clip)));
  });
  const f = frame();
  if (f && f.layers) state.layer = f.layers.length - 1;
  save(); paint(); buildInspector(); markSelectedLayer();
  toast(intoAll ? `Pasted onto ${targets.length} frame(s)` : 'Layer pasted');
}

function duplicateLayer() {
  const l = curLayer();
  if (!l) return;
  // Nudge the copy so it does not hide exactly behind the original.
  addLayer({ ...JSON.parse(JSON.stringify(l)), x: (l.x ?? 0) + 4, y: (l.y ?? 50) + 4 });
  toast('Layer duplicated');
}

function addLayer(props) {
  const f = frame();
  if (!f) return toast('Select a frame first');
  f.layers = f.layers || [];
  f.layers.push({ x: 0, y: 50, size: 26, rotate: 0, opacity: 1, ...props });
  state.layer = f.layers.length - 1;
  save(); paint(); buildInspector(); markSelectedLayer();
}

const EMOJI = [
  '⭐','✨','🔥','💎','🚀','🎯','❤️','👍','🏆','🎉','💡','⚡','✅','🔔','📈','🧠',
  '🎁','🥇','🛡️','🔒','⏱️','📅','💬','📷','🎧','🎬','🍀','🌙','☀️','🌈','🎨','🧩',
  '💰','📊','🤖','👋','😍','😎','🤩','🙌','👀','💪','🍎','🥗','🏃','😴','📚','✏️',
];

function openEmojiPicker(replace = false) {
  openModal(
    'Pick an emoji',
    `<div class="emojigrid">${EMOJI.map((e) => `<button data-emoji="${e}">${e}</button>`).join('')}</div>
     <div class="row" style="margin-top:14px">
       <input type="text" id="emojiCustom" placeholder="Or paste any emoji or character">
       <button class="ghost" id="emojiAdd" style="flex:0 0 auto">Use</button>
     </div>`
  );
  const use = (ch) => {
    if (!ch) return;
    if (replace) {
      const l = curLayer();
      if (l) { l.text = ch; save(); paint(); buildInspector(); }
    } else {
      addLayer({ type: 'emoji', text: ch, size: 14 });
    }
    closeModal();
  };
  $('#modalBody').onclick = (e) => {
    const b = e.target.closest('[data-emoji]');
    if (b) return use(b.dataset.emoji);
    if (e.target.id === 'emojiAdd') use($('#emojiCustom').value.trim());
  };
  $('#emojiCustom').onkeydown = (e) => { if (e.key === 'Enter') use(e.target.value.trim()); };
}

// ---------------------------------------------------------------- layer dragging
// Drag a layer straight on the canvas — works in both the board and the single
// preview. Position is written as a percentage of the canvas, so the result is
// identical at any zoom or device size.
let drag = null;
let justDragged = false;

// The selected layer gets a rotate handle (round, above it) and a resize handle
// (square, bottom-right). They live in a screen-space overlay rather than inside
// the canvas: the canvas clips its overflow, so a handle on a layer near the
// edge would be cut off and impossible to grab.
function selectedLayerEl() {
  const scope = state.view === 'grid'
    ? document.querySelector(`.gcard[data-i="${state.sel}"][data-loc="${state.locale}"]`)
    : $('#canvasHost');
  return scope?.querySelector(`.ash-layer[data-l="${state.layer}"]`) || null;
}

function markSelectedLayer() {
  document.querySelectorAll('.ash-layer.sel').forEach((el) => el.classList.remove('sel'));
  const el = selectedLayerEl();
  const box = $('#layerHandles');
  if (!el) { box.hidden = true; return; }
  el.classList.add('sel');
  box.hidden = false;
  positionHandles();
}

function positionHandles() {
  const el = selectedLayerEl();
  const box = $('#layerHandles');
  if (!el || box.hidden) return;
  const b = el.getBoundingClientRect();
  const rot = box.querySelector('.lh-rot');
  const size = box.querySelector('.lh-size');
  rot.style.left = `${b.left + b.width / 2}px`;
  rot.style.top = `${b.top - 24}px`;
  size.style.left = `${b.right}px`;
  size.style.top = `${b.bottom}px`;
}

window.addEventListener('scroll', positionHandles, true);
window.addEventListener('resize', positionHandles);

document.addEventListener('mousedown', (e) => {
  const handle = e.target.closest('#layerHandles .lh');
  const el = handle ? selectedLayerEl() : e.target.closest('.ash-layer');
  if (!el) return;
  const canvas = el.closest('.ash-canvas');
  const card = el.closest('.gcard');
  // A board card only edits its own row's language; ignore drags on other rows.
  if (!handle && card && card.dataset.loc !== state.locale) return;
  const fi = handle ? state.sel : card ? +card.dataset.i : state.sel;
  const li = handle ? state.layer : +el.dataset.l;
  const layer = state.project.frames[fi]?.layers?.[li];
  if (!layer || !canvas) return;

  e.preventDefault();
  state.sel = fi;
  state.layer = li;

  const b = el.getBoundingClientRect();
  // Rotation is about the centre, so the axis-aligned box centre is still it.
  const cx = b.left + b.width / 2;
  const cy = b.top + b.height / 2;
  const mode = handle
    ? handle.classList.contains('lh-rot') ? 'rotate' : 'size'
    : 'move';

  drag = {
    mode, el, layer, cx, cy, moved: false,
    intrinsic: parseFloat(canvas.style.width) || canvas.offsetWidth,
    rect: canvas.getBoundingClientRect(),
    sx: e.clientX, sy: e.clientY,
    x0: layer.x ?? 0, y0: layer.y ?? 50,
    r0: layer.rotate ?? 0,
    size0: layer.size ?? layer.w ?? 26,
    a0: Math.atan2(e.clientY - cy, e.clientX - cx),
    d0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1,
  };
  document.body.classList.add(`dragging-${mode}`);
  if (!handle) { buildInspector(); markSelectedLayer(); }
});

window.addEventListener('mousemove', (e) => {
  if (!drag) return;
  const l = drag.layer;
  if (Math.abs(e.clientX - drag.sx) > 2 || Math.abs(e.clientY - drag.sy) > 2) drag.moved = true;

  if (drag.mode === 'move') {
    l.x = round1(drag.x0 + ((e.clientX - drag.sx) / drag.rect.width) * 100);
    l.y = round1(drag.y0 + ((e.clientY - drag.sy) / drag.rect.height) * 100);
    drag.el.style.left = `${50 + l.x}%`;
    drag.el.style.top = `${l.y}%`;
  } else if (drag.mode === 'rotate') {
    const a = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx);
    let deg = drag.r0 + ((a - drag.a0) * 180) / Math.PI;
    if (e.shiftKey) deg = Math.round(deg / 15) * 15;
    l.rotate = round1((((deg + 180) % 360) + 360) % 360 - 180);
    drag.el.style.transform = `translate(-50%,-50%) rotate(${l.rotate}deg)`;
  } else {
    // size: scale by how far the cursor moved from the centre
    const d = Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy);
    const size = Math.max(1, Math.min(200, round1((drag.size0 * d) / drag.d0)));
    l.size = size;
    delete l.w;
    if ((l.type || 'image') === 'image') drag.el.style.width = `${size}%`;
    else drag.el.style.fontSize = `${(size / 100) * drag.intrinsic}px`;
  }
  positionHandles();
});

window.addEventListener('mouseup', () => {
  if (!drag) return;
  justDragged = drag.moved;
  document.body.classList.remove('dragging-move', 'dragging-rotate', 'dragging-size');
  drag = null;
  save();
  paint();
  buildInspector();
  markSelectedLayer();
  setTimeout(() => (justDragged = false), 0);
});

const round1 = (n) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------- modal
function openModal(title, html) {
  $('#modalTitle').textContent = title;
  $('#modalBody').onclick = null;
  $('#modalBody').innerHTML = html;
  $('#modal').hidden = false;
}
const closeModal = () => { $('#modal').hidden = true; };
$('#modalClose').onclick = closeModal;
$('#modal').onclick = (e) => { if (e.target.id === 'modal') closeModal(); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// Style packs — pick a finished look for the WHOLE set first, tweak later.
function openPackGallery() {
  if (!state.project.frames.length) return toast('Add screenshots first');

  const cards = SET_IDS.map((id) => {
    const clone = JSON.parse(JSON.stringify(state.project));
    applySet(clone, id);
    // A storyboard composition only reads across several frames.
    const shown = clone.frames.slice(0, SETS[id].story ? 5 : 4);
    const cardW = 180;
    const strip = shown
      .map((f, j) => {
        const { html, width, height } = renderFrame({
          frame: f,
          project: clone,
          deviceId: state.device,
          orientation: clone.orientation,
          assetURL,
          index: j,
          locale: state.locale,
        });
        const w = Math.floor((cardW - (shown.length - 1) * 3) / shown.length);
        const s = w / width;
        return `<div class="sh" style="width:${w}px;height:${height * s}px">
          <div class="tw" style="transform:scale(${s})">${html}</div></div>`;
      })
      .join('');
    // No gap for continuous sets, so the flow is obvious at a glance.
    const seamless = SETS[id].sequence.some((t) => TEMPLATES[t].continuous);
    return `<div class="packcard${state.project.set === id ? ' on' : ''}" data-pack="${id}" title="${SETS[id].hint}">
      <div class="strip${seamless ? ' seamless' : ''}">${strip}</div>
      <div class="meta"><b>${SETS[id].name}</b></div>
    </div>`;
  }).join('');

  openModal('Choose a set', `<div class="packgal">${cards}</div>`);

  $('#modalBody').onclick = (e) => {
    const card = e.target.closest('[data-pack]');
    if (!card) return;
    applySet(state.project, card.dataset.pack);
    save();
    closeModal();
    paint();
    buildInspector();
    toast(`"${SETS[card.dataset.pack].name}" applied`);
  };
}

// Visual template gallery — every template rendered with THIS frame's content.
function openTemplateGallery() {
  const f = frame();
  if (!f) return toast('Add a screenshot first');
  const current = eff('template', 'text-top');
  const cards = TEMPLATE_IDS.map((id) => {
    const { html, width, height } = renderFrame({
      frame: { ...f, template: id },
      project: state.project,
      deviceId: state.device,
      orientation: state.project.orientation,
      assetURL,
      index: state.sel,
    });
    const s = 146 / width;
    return `<div class="tplcard${id === current ? ' on' : ''}" data-pick="${id}">
      <div class="tp" style="height:${height * s}px;overflow:hidden">
        <div class="tw" style="transform:scale(${s})">${html}</div>
      </div>
      <b>${TEMPLATES[id].name}</b><span>${TEMPLATES[id].hint}</span>
    </div>`;
  }).join('');
  openModal(
    `Templates — click to apply to ${state.scope === 'all' ? 'ALL frames' : `frame ${state.sel + 1}`}`,
    `<div class="tplgal">${cards}</div>`
  );
  $('#modalBody').onclick = (e) => {
    const card = e.target.closest('[data-pick]');
    if (!card) return;
    write('template', card.dataset.pick);
    closeModal();
    buildInspector();
  };
}

// Claude Code cheat sheet, filled in with the current project name.
function openClaudePanel() {
  const n = state.name;
  const rows = [
    ['What is in this project?', `appshot info ${n}`],
    ['Pick a ready-made look for the whole set',
     `appshot packs\nappshot pack ${n} story-blocks`],
    ['Rewrite every headline',
     `appshot set ${n} --frames all \\\n  --titles "Track it all in one place|Set it and forget it|See your progress" \\\n  --subtitles "Every account, one screen|Rules run in the background|Weekly and monthly views"`],
    ['Tilt frame 2, put two phones on frame 3',
     `appshot set ${n} --frames 2 --template tilt-right\nappshot set ${n} --frames 3 --template duo`],
    ['Change the background and type for the whole set',
     `appshot style ${n} --bg "linear:160:#6366f1,#ec4899" --font Poppins --title-size 6.3 --pattern dots`],
    ['Add another language',
     `appshot lang ${n} add de\nappshot set ${n} --lang de --frames all --titles "Alles an einem Ort|Einmal einstellen|Fortschritt sehen"`],
    ['Add new screenshots', `appshot add ${n} ~/Desktop/shots/*.png`],
    ['Use a different image for iPad',
     `appshot set ${n} --frames 1 --shot ~/Desktop/ipad-home.png --for ipad-13`],
    ['Export everything', `appshot render ${n} --open`],
    ['Export just iPhone, first three frames',
     `appshot render ${n} --devices iphone-6.9 --frames 1-3`],
  ];

  const body =
    `<div class="cc-intro">
       Tell Claude Code you are in <code>~/appshot-studio</code> — it reads the
       <code>CLAUDE.md</code> there and runs these commands itself. So you never have to
       memorise them: <b>just say what you want, like the left column below</b>.
       Use the copy button if you would rather run a command yourself.
     </div>
     <div class="cc-cmd"><pre>cd ~/appshot-studio &amp;&amp; claude</pre><button data-copy="cd ~/appshot-studio &amp;&amp; claude">Copy</button></div>` +
    rows
      .map(
        ([say, cmd]) => `<div class="cc-row">
          <div class="say">💬 <b>“${say}”</b></div>
          <div class="cc-cmd"><pre>${cmd.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>
            <button data-copy="${escAttr(cmd)}">Copy</button></div>
        </div>`
      )
      .join('');

  openModal('Use it with Claude Code', body);
  $('#modalBody').onclick = async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    await navigator.clipboard.writeText(btn.dataset.copy);
    btn.textContent = 'Copied';
    setTimeout(() => (btn.textContent = 'Copy'), 1200);
  };
}

// ---------------------------------------------------------------- inspector
const rowRange = (label, path, min, max, step, fallback) => {
  const v = eff(path, fallback);
  return `<div class="row"><label>${label}</label>
    <input type="range" data-path="${path}" data-kind="num" min="${min}" max="${max}" step="${step}" value="${v}">
    <span class="val">${(+v).toFixed(step < 1 ? 1 : 0)}</span></div>`;
};
const rowColor = (label, path, fallback) =>
  `<div class="row"><label>${label}</label>
    <input type="color" data-path="${path}" data-kind="str" value="${String(eff(path, fallback)).slice(0, 7)}">
    <input type="text" data-path="${path}" data-kind="str" value="${eff(path, fallback)}"></div>`;
const rowSelect = (label, path, options, fallback) => {
  const v = String(eff(path, fallback));
  return `<div class="row"><label>${label}</label><select data-path="${path}" data-kind="str">${options
    .map((o) => {
      const [val, txt] = Array.isArray(o) ? o : [o, o];
      return `<option value="${val}"${String(val) === v ? ' selected' : ''}>${txt}</option>`;
    })
    .join('')}</select></div>`;
};

function sec(id, title, body, closed = false) {
  return `<div class="sec${closed ? ' closed' : ''}" data-sec="${id}"><h3>${title}</h3><div class="body">${body}</div></div>`;
}

const txt = (field) =>
  getLocalized(frame(), state.locale, state.project.locales[0], field);
// While translating, show the base-language text as the placeholder.
const ph = (field, fallback) =>
  state.locale === state.project.locales[0] ? fallback : frame()[field] || fallback;

function buildInspector() {
  const f = frame();
  if (!f) { $('#panels').innerHTML = '<div class="body mini">Add a screenshot to begin.</div>'; return; }

  const bg = resolveBackground(eff('background', 'indigo'));
  const bgIsPreset = typeof eff('background', 'indigo') === 'string';

  const content = sec(
    'content',
    'Content',
    `<div class="mini">Text always applies to this frame. **bold** and line breaks work.</div>
     ${state.project.locales.length > 1
       ? `<div class="row"><label>Language</label><select data-loc>${state.project.locales
           .map((l) => `<option value="${l}"${l === state.locale ? ' selected' : ''}>${l} — ${localeLabel(l)}</option>`)
           .join('')}</select></div>`
       : ''}
     <input type="text" data-frame="eyebrow" placeholder="Eyebrow (optional)" value="${escAttr(txt('eyebrow'))}">
     <textarea data-frame="title" placeholder="${escAttr(ph('title', 'Headline'))}">${escHtml(txt('title'))}</textarea>
     <textarea data-frame="subtitle" placeholder="${escAttr(ph('subtitle', 'Sub-headline'))}">${escHtml(txt('subtitle'))}</textarea>
     <div class="row"><label>Role</label><select data-role>
       ${[['feature', 'Feature'], ['cover', 'Cover (first frame)'], ['cta', 'CTA (last frame)']]
         .map(([v, t]) => `<option value="${v}"${(f.role || 'feature') === v ? ' selected' : ''}>${t}</option>`)
         .join('')}
     </select></div>
     ${f.role === 'cta' ? `<input type="text" data-frame="cta" placeholder="Button label" value="${escAttr(txt('cta'))}">` : ''}
     ${f.role === 'cover' ? `<button class="ghost" id="pickIcon">App icon…${state.project.appIcon ? ' ✓' : ''}</button>` : ''}
     <button class="ghost" id="pickShot">Replace screenshot for ${DEVICES[state.device].label.split('(')[0].trim()}…</button>
     <div class="mini">${
       resolveScreenshots(f, state.device)[0]
         ? shotLabel(resolveScreenshots(f, state.device)[0]) +
           (typeof f.screenshot === 'object' ? ' · per-device' : ' · all devices')
         : 'no screenshot yet'
     }</div>
     ${typeof f.screenshot === 'object' ? '<button class="ghost" id="shotAll">Use this one for all devices</button>' : ''}`
  );

  const layout = sec(
    'layout',
    'Template',
    `<div class="tplgrid">${TEMPLATE_IDS.map(
      (id) =>
        `<button data-tpl="${id}" class="${eff('template', 'text-top') === id ? 'on' : ''}" title="${TEMPLATES[id].hint}">${TEMPLATES[id].name}</button>`
    ).join('')}</div>
     <div class="mini">${TEMPLATES[eff('template', 'text-top')].hint}</div>
     <button class="ghost" id="browseTpl">Browse all templates visually…</button>`
  );

  const text = sec(
    'text',
    'Text style',
    rowSelect('Font', 'text.font', FONT_IDS.map((id) => [id, FONTS[id].label]), 'Inter') +
      rowSelect('Align', 'text.align', [['', 'auto'], 'left', 'center', 'right'], '') +
      rowColor('Colour', 'text.color', '#ffffff') +
      rowRange('Title size', 'text.titleSize', 2, 12, 0.1, DEFAULT_TEXT.titleSize) +
      rowRange('Title weight', 'text.titleWeight', 300, 900, 100, DEFAULT_TEXT.titleWeight) +
      rowRange('Tracking', 'text.titleLetterSpacing', -6, 12, 0.5, DEFAULT_TEXT.titleLetterSpacing) +
      rowRange('Line height', 'text.titleLineHeight', 0.9, 1.8, 0.02, DEFAULT_TEXT.titleLineHeight) +
      rowRange('Sub size', 'text.subtitleSize', 1.5, 8, 0.1, DEFAULT_TEXT.subtitleSize) +
      rowRange('Sub weight', 'text.subtitleWeight', 300, 900, 100, DEFAULT_TEXT.subtitleWeight) +
      rowRange('Gap', 'text.gap', 0, 8, 0.1, DEFAULT_TEXT.gap) +
      rowRange('Shadow', 'text.shadow', 0, 1, 0.05, DEFAULT_TEXT.shadow) +
      rowSelect('Case', 'text.titleTransform', ['none', 'uppercase', 'lowercase'], 'none')
  );

  const bgPanel = sec(
    'bg',
    'Background',
    `<div class="swatches">${BACKGROUND_PRESET_IDS.map(
      (id) =>
        `<button class="swatch${bgIsPreset && eff('background') === id ? ' on' : ''}" data-bgp="${id}" title="${id}" style="${swatchStyle(id)}"></button>`
    ).join('')}</div>` +
      rowSelectRaw('Type', 'bgtype', ['solid', 'linear', 'radial', 'mesh', 'image', 'screenshot'], bg.type) +
      bgTypeControls(bg) +
      `<div class="row"><label>Dim</label><input type="range" data-bg="dim" min="0" max="0.8" step="0.05" value="${bg.dim ?? 0}"><span class="val">${(bg.dim ?? 0).toFixed(2)}</span></div>` +
      rowSelectRaw('Pattern', 'pattern', PATTERNS, (bg.overlay && bg.overlay.pattern) || 'none') +
      `<div class="row"><label>Pattern α</label><input type="range" data-ov="opacity" min="0" max="0.4" step="0.01" value="${(bg.overlay && bg.overlay.opacity) ?? 0.07}"><span class="val">${((bg.overlay && bg.overlay.opacity) ?? 0.07).toFixed(2)}</span></div>` +
      `<div class="row"><label>Pattern size</label><input type="range" data-ov="size" min="0.5" max="10" step="0.1" value="${(bg.overlay && bg.overlay.size) ?? 3}"><span class="val">${((bg.overlay && bg.overlay.size) ?? 3).toFixed(1)}</span></div>`
  );

  const devicePanel = sec(
    'device',
    'Device',
    rowSelect('Frame', 'device.frame', [
      ['auto', 'auto (match device)'],
      ['none', 'none (frameless)'],
      'iphone-island',
      'iphone-notch',
      'iphone-classic',
      'ipad',
      'android',
      'android-tablet',
    ], 'auto') +
      rowRange('Scale', 'device.scale', 0.4, 1.8, 0.01, DEFAULT_DEVICE.scale) +
      rowRange('Offset X', 'device.x', -40, 40, 0.5, 0) +
      rowRange('Offset Y', 'device.y', -40, 60, 0.5, 0) +
      rowRange('Shadow', 'device.shadow', 0, 1, 0.05, DEFAULT_DEVICE.shadow) +
      `<div class="row"><label>Rotate</label><input type="range" data-path="device.rotate" data-kind="numnull" min="-25" max="25" step="1" value="${eff('device.rotate', 0) ?? 0}"><span class="val">${eff('device.rotate', 0) ?? 0}</span></div>
       <button class="ghost" data-reset="device.rotate">Use template rotation</button>`
  );

  // Stacked images, text and emoji. Always per-frame — "All frames" would stamp
  // the same artwork on every screenshot, which is almost never what you want.
  const layers = Array.isArray(f.layers) ? f.layers : [];
  const li = Math.min(state.layer, layers.length - 1);
  const sel = layers[li];
  const selType = sel ? sel.type || 'image' : null;
  const isText = selType === 'text' || selType === 'emoji';
  const layerPanel = sec(
    'layers',
    'Layers',
    `<div class="mini">Images, text and emoji stacked on this frame.
       ⌘C copy · ⌘V paste · ⇧⌘V paste onto every frame · ⌘D duplicate.</div>
     ${layers.length
       ? `<div class="layerlist">${layers
           .map((l, k) => {
             const t = l.type || 'image';
             const label = t === 'image' ? shotLabel(l.src) : l.text || t;
             const thumb = t === 'image'
               ? `<img src="${assetURL(l.src)}" alt="">`
               : `<i class="lchip">${escHtml((l.text || '').slice(0, 2))}</i>`;
             return `<div class="layeritem${k === li ? ' on' : ''}" data-layer="${k}">
               ${thumb}<span>${escHtml(label)}</span>
               <button data-layerup="${k}" title="Bring forward">↑</button>
               <button data-layerdel="${k}" title="Delete">×</button>
             </div>`;
           })
           .join('')}</div>`
       : ''}
     <div class="addlayer">
       <button class="ghost" id="addLayerImage">+ Image</button>
       <button class="ghost" id="addLayerText">+ Text</button>
       <button class="ghost" id="addLayerEmoji">+ Emoji</button>
     </div>
     ${sel || state.clip
       ? `<div class="addlayer">
            ${sel ? `<button class="ghost" id="copyLayer">Copy</button>
                     <button class="ghost" id="dupLayer">Duplicate</button>` : ''}
            ${state.clip ? `<button class="ghost" id="pasteLayer">Paste</button>` : ''}
          </div>
          ${state.clip
            ? `<button class="ghost" id="pasteAll">Paste onto all ${state.project.frames.length} frames</button>`
            : ''}`
       : ''}
     ${sel
       ? `<div class="mini">Drag it on the canvas. Use the round handle to rotate
            and the square one to resize — hold Shift to snap the angle.</div>` +
         (selType === 'text'
           ? `<textarea data-layertext placeholder="Text">${escHtml(sel.text || '')}</textarea>
              <div class="row"><label>Colour</label>
                <input type="color" data-layercolor value="${sel.color || '#ffffff'}"></div>
              ${rowSelectRaw('Font', 'layerfont', FONT_IDS, sel.font || 'Inter')}
              ${rowSelectRaw('Weight', 'layerweight', [400, 500, 600, 700, 800, 900], sel.weight ?? 800)}
              ${layerRange('Max width', 'width', 10, 100, 1, sel.width ?? 60)}
              ${layerRange('Shadow', 'shadow', 0, 1, 0.05, sel.shadow ?? 0)}`
           : '') +
         (selType === 'emoji'
           ? `<input type="text" data-layertext placeholder="Emoji" value="${escAttr(sel.text || '')}">
              <button class="ghost" id="pickEmoji">Pick an emoji…</button>`
           : '') +
         (selType === 'image' ? `<button class="ghost" id="replaceLayer">Replace image…</button>` : '') +
         layerRange(isText ? 'Font size' : 'Size', 'size', 1, 120, 0.5, sel.size ?? sel.w ?? 26) +
         layerRange('X', 'x', -60, 60, 0.5, sel.x ?? 0) +
         layerRange('Y', 'y', -10, 110, 0.5, sel.y ?? 50) +
         layerRange('Rotate', 'rotate', -180, 180, 1, sel.rotate ?? 0) +
         layerRange('Opacity', 'opacity', 0, 1, 0.05, sel.opacity ?? 1) +
         `<label class="chk"><input type="checkbox" data-layerbehind ${sel.behind ? 'checked' : ''}>Behind the device</label>`
       : ''}`,
    !layers.length
  );

  const exportPanel = sec(
    'export',
    'Export',
    `<div class="mini">Devices exported for this project:</div>
     ${Object.keys(DEVICES).map((id) => `<label class="chk"><input type="checkbox" data-dev="${id}" ${state.project.devices.includes(id) ? 'checked' : ''}>${DEVICES[id].label} · ${DEVICES[id].width}×${DEVICES[id].height}</label>`).join('')}
     <button class="primary" id="exportNow">Export all frames</button>`,
    true
  );

  $('#panels').innerHTML =
    content + layout + text + layerPanel + bgPanel + devicePanel + exportPanel;
}

const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const escAttr = (s) => escHtml(s).replace(/"/g, '&quot;');
const shotLabel = (s) => (typeof s === 'string' ? s : JSON.stringify(s)).replace('assets/', '');

function layerRange(label, key, min, max, step, value) {
  return `<div class="row"><label>${label}</label>
    <input type="range" data-layerset="${key}" min="${min}" max="${max}" step="${step}" value="${value}">
    <span class="val">${value}</span></div>`;
}

function rowSelectRaw(label, key, options, value) {
  return `<div class="row"><label>${label}</label><select data-raw="${key}">${options
    .map((o) => `<option value="${o}"${String(o) === String(value) ? ' selected' : ''}>${o}</option>`)
    .join('')}</select></div>`;
}

function swatchStyle(id) {
  const b = BACKGROUND_PRESETS[id];
  if (b.type === 'solid') return `background:${b.color}`;
  if (b.type === 'linear') return `background:linear-gradient(${b.angle}deg,${b.stops.join(',')})`;
  if (b.type === 'mesh')
    return `background:${b.base};background-image:${b.blobs
      .map((x) => `radial-gradient(circle at ${x.x}% ${x.y}%, ${x.color}, transparent 60%)`)
      .join(',')}`;
  return 'background:linear-gradient(135deg,#334,#667)';
}

function bgTypeControls(bg) {
  const stops = bg.stops || ['#4f46e5', '#7c3aed'];
  switch (bg.type) {
    case 'solid':
      return `<div class="row"><label>Colour</label><input type="color" data-bg="color" value="${bg.color || '#0f172a'}"><input type="text" data-bg="color" value="${bg.color || '#0f172a'}"></div>`;
    case 'linear':
      return `<div class="row"><label>Colours</label><span class="stops"><input type="color" data-stop="0" value="${stops[0]}"><input type="color" data-stop="1" value="${stops[1] || stops[0]}"></span></div>
        <div class="row"><label>Angle</label><input type="range" data-bg="angle" min="0" max="360" step="5" value="${bg.angle ?? 160}"><span class="val">${bg.angle ?? 160}</span></div>`;
    case 'radial':
      return `<div class="row"><label>Colours</label><span class="stops"><input type="color" data-stop="0" value="${stops[0]}"><input type="color" data-stop="1" value="${stops[1] || '#0b1020'}"></span></div>
        <div class="row"><label>Center X</label><input type="range" data-bg="x" min="0" max="100" step="1" value="${bg.x ?? 50}"><span class="val">${bg.x ?? 50}</span></div>
        <div class="row"><label>Center Y</label><input type="range" data-bg="y" min="0" max="100" step="1" value="${bg.y ?? 20}"><span class="val">${bg.y ?? 20}</span></div>`;
    case 'mesh': {
      const blobs = bg.blobs || [];
      return `<div class="row"><label>Base</label><input type="color" data-bg="base" value="${bg.base || '#0b1020'}"></div>
        <div class="row"><label>Blobs</label><span class="stops">${blobs
          .map((b, i) => `<input type="color" data-blob="${i}" value="${b.color}">`)
          .join('')}</span></div>`;
    }
    case 'image':
      return `<button class="ghost" id="pickBg">Choose background image…</button>
        <div class="mini">${bg.src ? shotLabel(bg.src) : 'none selected'}</div>
        <div class="row"><label>Blur</label><input type="range" data-bg="blur" min="0" max="100" step="1" value="${bg.blur ?? 0}"><span class="val">${bg.blur ?? 0}</span></div>`;
    case 'screenshot':
      return `<div class="mini">Uses this frame's own screenshot, blurred.</div>
        <div class="row"><label>Blur</label><input type="range" data-bg="blur" min="10" max="100" step="1" value="${bg.blur ?? 70}"><span class="val">${bg.blur ?? 70}</span></div>
        <div class="row"><label>Zoom</label><input type="range" data-bg="scale" min="1" max="3" step="0.05" value="${bg.scale ?? 1.5}"><span class="val">${(bg.scale ?? 1.5).toFixed(2)}</span></div>`;
    default:
      return '';
  }
}

function writeBG(mutate) {
  const cur = resolveBackground(eff('background', 'indigo'));
  mutate(cur);
  write('background', cur);
}

// ---------------------------------------------------------------- events
$('#panels').addEventListener('input', (e) => {
  const t = e.target;
  const valEl = t.parentElement && t.parentElement.querySelector('.val');

  if (t.dataset.path) {
    let v = t.value;
    if (t.dataset.kind === 'num' || t.dataset.kind === 'numnull') v = Number(v);
    if (t.dataset.path === 'text.align' && v === '') v = null;
    if (valEl) valEl.textContent = typeof v === 'number' ? (t.step && +t.step < 1 ? v.toFixed(1) : v) : '';
    write(t.dataset.path, v);
    if (t.type === 'color' || t.type === 'text') syncPairs(t);
    return;
  }
  if (t.dataset.frame) {
    setLocalized(frame(), state.locale, state.project.locales[0], t.dataset.frame, t.value);
    save(); paint();
    return;
  }
  if (t.dataset.loc !== undefined) {
    state.locale = t.value;
    paint(); buildInspector();
    return;
  }
  if (t.dataset.layerset !== undefined) {
    const l = frame().layers[Math.min(state.layer, frame().layers.length - 1)];
    if (l) {
      l[t.dataset.layerset] = +t.value;
      const val = t.parentElement.querySelector('.val');
      if (val) val.textContent = t.value;
      save(); paint();
    }
    return;
  }
  if (t.dataset.layertext !== undefined) {
    const l = curLayer();
    if (l) { l.text = t.value; save(); paint(); }
    return;
  }
  if (t.dataset.layercolor !== undefined) {
    const l = curLayer();
    if (l) { l.color = t.value; save(); paint(); }
    return;
  }
  if (t.dataset.raw === 'layerfont' || t.dataset.raw === 'layerweight') {
    const l = curLayer();
    if (l) {
      if (t.dataset.raw === 'layerfont') l.font = t.value;
      else l.weight = +t.value;
      save(); paint();
    }
    return;
  }
  if (t.dataset.layerbehind !== undefined) {
    const l = frame().layers[Math.min(state.layer, frame().layers.length - 1)];
    if (l) { l.behind = t.checked; save(); paint(); }
    return;
  }
  if (t.dataset.role !== undefined) {
    if (t.value === 'feature') delete frame().role;
    else {
      frame().role = t.value;
      if (t.value === 'cta' && !frame().cta) frame().cta = 'Download free';
    }
    save(); paint(); buildInspector();
    return;
  }
  if (t.dataset.raw === 'bgtype') {
    const seeds = {
      solid: { type: 'solid', color: '#0f172a' },
      linear: { type: 'linear', angle: 160, stops: ['#4f46e5', '#7c3aed'] },
      radial: { type: 'radial', stops: ['#4f46e5', '#0b1020'], x: 50, y: 20 },
      mesh: BACKGROUND_PRESETS.aurora,
      image: { type: 'image', src: '' },
      screenshot: { type: 'screenshot', blur: 70, dim: 0.45, scale: 1.5 },
    };
    write('background', JSON.parse(JSON.stringify(seeds[t.value])));
    buildInspector();
    return;
  }
  if (t.dataset.raw === 'pattern') {
    writeBG((bg) => {
      if (t.value === 'none') delete bg.overlay;
      else bg.overlay = { pattern: t.value, color: '#ffffff', opacity: 0.07, size: 3, ...(bg.overlay || {}), pattern: t.value };
    });
    return;
  }
  if (t.dataset.bg) {
    const k = t.dataset.bg;
    const numeric = ['angle', 'dim', 'blur', 'scale', 'x', 'y'].includes(k);
    if (valEl) valEl.textContent = numeric ? Number(t.value).toFixed(k === 'scale' || k === 'dim' ? 2 : 0) : '';
    writeBG((bg) => { bg[k] = numeric ? Number(t.value) : t.value; });
    if (t.type === 'color' || t.type === 'text') syncPairs(t);
    return;
  }
  if (t.dataset.ov) {
    const k = t.dataset.ov;
    if (valEl) valEl.textContent = Number(t.value).toFixed(k === 'opacity' ? 2 : 1);
    writeBG((bg) => { bg.overlay = { pattern: 'dots', color: '#ffffff', ...(bg.overlay || {}), [k]: Number(t.value) }; });
    return;
  }
  if (t.dataset.stop !== undefined) {
    writeBG((bg) => { bg.stops = [...(bg.stops || [])]; bg.stops[+t.dataset.stop] = t.value; });
    return;
  }
  if (t.dataset.blob !== undefined) {
    writeBG((bg) => { bg.blobs = bg.blobs.map((b, i) => (i === +t.dataset.blob ? { ...b, color: t.value } : b)); });
    return;
  }
  if (t.dataset.dev) {
    const set = new Set(state.project.devices);
    t.checked ? set.add(t.dataset.dev) : set.delete(t.dataset.dev);
    state.project.devices = [...set];
    save();
    buildDeviceTabs();
  }
});

function syncPairs(t) {
  const twins = t.parentElement.querySelectorAll(
    `[data-path="${t.dataset.path}"],[data-bg="${t.dataset.bg}"]`
  );
  twins.forEach((x) => { if (x !== t) x.value = t.value; });
}

$('#panels').addEventListener('click', (e) => {
  const t = e.target;
  if (t.tagName === 'H3') { t.parentElement.classList.toggle('closed'); return; }
  if (t.dataset.tpl) { write('template', t.dataset.tpl); buildInspector(); return; }
  if (t.dataset.bgp) { write('background', t.dataset.bgp); buildInspector(); return; }
  if (t.dataset.reset) { write(t.dataset.reset, null); buildInspector(); return; }
  if (t.id === 'browseTpl') { openTemplateGallery(); return; }
  if (t.id === 'addLayerImage') { bgPickerTarget = 'layer'; $('#bgPicker').click(); return; }
  if (t.id === 'replaceLayer') { bgPickerTarget = 'layerReplace'; $('#bgPicker').click(); return; }
  if (t.id === 'addLayerText') { addLayer({ type: 'text', text: 'Your text', size: 7 }); return; }
  if (t.id === 'addLayerEmoji') { openEmojiPicker(); return; }
  if (t.id === 'copyLayer') { copyLayer(); return; }
  if (t.id === 'dupLayer') { duplicateLayer(); return; }
  if (t.id === 'pasteLayer') { pasteLayer(false); return; }
  if (t.id === 'pasteAll') { pasteLayer(true); return; }
  if (t.id === 'pickEmoji') { openEmojiPicker(true); return; }
  if (t.dataset.layerdel !== undefined) {
    frame().layers.splice(+t.dataset.layerdel, 1);
    state.layer = 0;
    save(); paint(); buildInspector();
    return;
  }
  if (t.dataset.layerup !== undefined) {
    const k = +t.dataset.layerup;
    const ls = frame().layers;
    if (k < ls.length - 1) {
      [ls[k], ls[k + 1]] = [ls[k + 1], ls[k]];
      state.layer = k + 1;
      save(); paint(); buildInspector();
    }
    return;
  }
  const litem = t.closest('[data-layer]');
  if (litem) { state.layer = +litem.dataset.layer; buildInspector(); markSelectedLayer(); return; }
  if (t.id === 'pickShot') { pickTarget = 'shot'; $('#filePicker').click(); return; }
  if (t.id === 'shotAll') {
    const cur = resolveScreenshots(frame(), state.device)[0];
    frame().screenshot = cur;
    save(); paint(); buildInspector();
    return;
  }
  if (t.id === 'pickBg') { bgPickerTarget = 'bg'; $('#bgPicker').click(); return; }
  if (t.id === 'pickIcon') { bgPickerTarget = 'icon'; $('#bgPicker').click(); return; }
  if (t.id === 'exportNow') doExport();
});

document.querySelectorAll('.scope button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.scope button').forEach((x) => x.classList.toggle('on', x === b));
    state.scope = b.dataset.scope;
    // Repaint so the board shows what the next edit will hit.
    paint();
  };
});

let pickTarget = 'new';
$('#addFrame').onclick = () => { pickTarget = 'new'; $('#filePicker').click(); };

$('#filePicker').onchange = async (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  await addShots(files, pickTarget === 'shot');
};

let bgPickerTarget = 'bg';
$('#bgPicker').onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const { path } = await api.upload(state.name, file);
  if (bgPickerTarget === 'icon') {
    state.project.appIcon = path;
    save(); paint();
  } else if (bgPickerTarget === 'layer') {
    addLayer({ type: 'image', src: path });
  } else if (bgPickerTarget === 'layerReplace') {
    const l = curLayer();
    if (l) { l.src = path; save(); paint(); }
  } else {
    writeBG((bg) => { bg.type = 'image'; bg.src = path; });
  }
  buildInspector();
};

async function addShots(files, replaceCurrent) {
  if (!files.length) return;
  for (const [i, file] of files.entries()) {
    const { path } = await api.upload(state.name, file);
    if (i === 0 && replaceCurrent && frame()) {
      const b = state.project.locales[0];
      if (state.locale === b) setScreenshot(frame(), state.device, path);
      else {
        // Language-specific screenshot: only changes on that language's row.
        const cur = { ...(frame().l10n?.[state.locale] || {}) };
        const tmp = { screenshot: cur.screenshot };
        setScreenshot(tmp, state.device, path);
        setLocalized(frame(), state.locale, b, 'screenshot', tmp.screenshot);
      }
    }
    else {
      state.project.frames.push(newFrame(state.project.frames.length, { screenshot: path }));
      state.sel = state.project.frames.length - 1;
    }
  }
  save();
  paint();
  buildInspector();
  toast(`${files.length} screenshot(s) added`);
  if (!state.project.set) openPackGallery();
}

// drag & drop
const stage = $('#stage');
['dragenter', 'dragover'].forEach((ev) =>
  document.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.add('dragging'); })
);
['dragleave', 'drop'].forEach((ev) =>
  document.addEventListener(ev, (e) => {
    e.preventDefault();
    if (ev === 'drop' || e.relatedTarget === null) stage.classList.remove('dragging');
  })
);
document.addEventListener('drop', async (e) => {
  const files = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'));
  if (files.length) await addShots(files, false);
});

// topbar
$('#zoom').oninput = (e) => {
  state.zoom = +e.target.value / 100;
  // Card width changes in board view, so it needs a full redraw.
  if (state.view === 'grid') { $('#gridHost').innerHTML = ''; drawGrid(); }
  else drawCanvas();
};
$('#claudeBtn').onclick = openClaudePanel;
$('#packsBtn').onclick = openPackGallery;
document.querySelectorAll('#viewTabs button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('#viewTabs button').forEach((x) => x.classList.toggle('on', x === b));
    state.view = b.dataset.view;
    paint();
  };
});
$('#revealBtn').onclick = () => api.reveal(state.name);
$('#renderBtn').onclick = doExport;

async function doExport() {
  const btn = $('#renderBtn');
  btn.disabled = true;
  btn.textContent = 'Rendering…';
  try {
    const res = await api.render(state.name, {});
    if (res.error) toast('Error: ' + res.error, 5000);
    else { toast(`${res.files.length} images → out/${state.name}`, 4000); api.reveal(state.name); }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Export all';
  }
}

$('#newProject').onclick = () => {
  openModal(
    'New project',
    `<div class="cc-intro">The project name becomes its folder name — letters, digits and dashes.</div>
     <div class="row">
       <input type="text" id="npName" placeholder="my-app">
       <button class="primary" id="npGo" style="flex:0 0 auto">Create</button>
     </div>`
  );
  const go = async () => {
    const name = $('#npName').value.trim();
    if (!name) return;
    const p = await api.create(name);
    if (p.error) return toast(p.error);
    closeModal();
    await loadProjects(p.name);
    toast(`"${p.name}" is ready — drop your screenshots in`);
  };
  $('#modalBody').onclick = (e) => { if (e.target.id === 'npGo') go(); };
  $('#npName').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  $('#npName').focus();
};

$('#projectSelect').onchange = (e) => openProject(e.target.value);

function buildDeviceTabs() {
  const tabs = $('#deviceTabs');
  tabs.innerHTML = state.project.devices
    .map((id) => `<button data-d="${id}" class="${id === state.device ? 'on' : ''}">${DEVICES[id].label.split('(')[0].trim()}</button>`)
    .join('');
  tabs.querySelectorAll('button').forEach((b) => {
    b.onclick = () => { state.device = b.dataset.d; buildDeviceTabs(); paint(); };
  });
}

async function openProject(name) {
  state.name = name;
  const p = await api.load(name);
  // A project.json written by an older version can be missing newer fields.
  // Fill them in here so a stale file can never take the whole editor down.
  if (!Array.isArray(p.locales) || !p.locales.length) p.locales = ['en'];
  if (!Array.isArray(p.devices) || !p.devices.length) p.devices = ['iphone-6.9', 'ipad-13'];
  if (!Array.isArray(p.frames)) p.frames = [];
  p.defaults = p.defaults || {};
  state.project = p;
  state.sel = 0;
  state.device = state.project.devices[0];
  state.locale = state.project.locales[0];
  buildDeviceTabs();
  paint();
  buildInspector();
  // Editing frames one by one before picking a set leads to half-styled sets,
  // so ask for a pack the first time a project is opened.
  if (!state.project.set && state.project.frames.length) openPackGallery();
}

async function loadProjects(select) {
  const list = await api.projects();
  // No projects yet: ask for a name rather than silently inventing one.
  if (!list.length) {
    $('#projectSelect').innerHTML = '';
    $('#panels').innerHTML = '<div class="body mini">Create a project to begin.</div>';
    $('#frameList').innerHTML = '';
    $('#canvasHost').innerHTML =
      '<div style="color:#5b6072;padding:60px">No projects yet — create one to begin.</div>';
    $('#newProject').click();
    return;
  }
  $('#projectSelect').innerHTML = list
    .map((p) => `<option value="${p.name}">${p.name}</option>`)
    .join('');
  const pick = select || list[0].name;
  $('#projectSelect').value = pick;
  await openProject(pick);
}

window.addEventListener('resize', drawCanvas);
window.addEventListener('keydown', (e) => {
  if (e.target.matches?.('input,textarea,select')) return;
  if (e.metaKey || e.ctrlKey) {
    const k = e.key.toLowerCase();
    if (k === 'c' && curLayer()) { e.preventDefault(); copyLayer(); return; }
    if (k === 'v' && state.clip) { e.preventDefault(); pasteLayer(e.shiftKey); return; }
    if (k === 'd' && curLayer()) { e.preventDefault(); duplicateLayer(); return; }
    return;
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    state.sel = Math.min(state.sel + 1, state.project.frames.length - 1); paint(); buildInspector();
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    state.sel = Math.max(state.sel - 1, 0); paint(); buildInspector();
  }
});

loadProjects();
