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

// ---------------------------------------------------------------- boot
document.head.insertAdjacentHTML(
  'beforeend',
  `<link rel="stylesheet" href="${googleFontsHref()}"><style>${CANVAS_CSS}</style>`
);

const $ = (s) => document.querySelector(s);
const state = { name: null, project: null, device: null, sel: 0, scope: 'frame', zoom: 1 };

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
  drawCanvas();
  drawThumbs();
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

function buildInspector() {
  const f = frame();
  if (!f) { $('#panels').innerHTML = '<div class="body mini">Add a screenshot to begin.</div>'; return; }

  const bg = resolveBackground(eff('background', 'indigo'));
  const bgIsPreset = typeof eff('background', 'indigo') === 'string';

  const content = sec(
    'content',
    'Content',
    `<div class="mini">Text always applies to this frame. **bold** and line breaks work.</div>
     <input type="text" data-frame="eyebrow" placeholder="Eyebrow (optional)" value="${escAttr(f.eyebrow)}">
     <textarea data-frame="title" placeholder="Headline">${escHtml(f.title)}</textarea>
     <textarea data-frame="subtitle" placeholder="Sub-headline">${escHtml(f.subtitle)}</textarea>
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
     <div class="mini">${TEMPLATES[eff('template', 'text-top')].hint}</div>`
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

  const exportPanel = sec(
    'export',
    'Export',
    `<div class="mini">Devices exported for this project:</div>
     ${Object.keys(DEVICES).map((id) => `<label class="chk"><input type="checkbox" data-dev="${id}" ${state.project.devices.includes(id) ? 'checked' : ''}>${DEVICES[id].label} · ${DEVICES[id].width}×${DEVICES[id].height}</label>`).join('')}
     <button class="primary" id="exportNow">Export all frames</button>`,
    true
  );

  $('#panels').innerHTML = content + layout + text + bgPanel + devicePanel + exportPanel;
}

const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const escAttr = (s) => escHtml(s).replace(/"/g, '&quot;');
const shotLabel = (s) => (typeof s === 'string' ? s : JSON.stringify(s)).replace('assets/', '');

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
    frame()[t.dataset.frame] = t.value;
    save(); paint();
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
  if (t.id === 'pickShot') { pickTarget = 'shot'; $('#filePicker').click(); return; }
  if (t.id === 'shotAll') {
    const cur = resolveScreenshots(frame(), state.device)[0];
    frame().screenshot = cur;
    save(); paint(); buildInspector();
    return;
  }
  if (t.id === 'pickBg') { $('#bgPicker').click(); return; }
  if (t.id === 'exportNow') doExport();
});

document.querySelectorAll('.scope button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.scope button').forEach((x) => x.classList.toggle('on', x === b));
    state.scope = b.dataset.scope;
  };
});

let pickTarget = 'new';
$('#addFrame').onclick = () => { pickTarget = 'new'; $('#filePicker').click(); };

$('#filePicker').onchange = async (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  await addShots(files, pickTarget === 'shot');
};

$('#bgPicker').onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const { path } = await api.upload(state.name, file);
  writeBG((bg) => { bg.type = 'image'; bg.src = path; });
  buildInspector();
};

async function addShots(files, replaceCurrent) {
  if (!files.length) return;
  for (const [i, file] of files.entries()) {
    const { path } = await api.upload(state.name, file);
    if (i === 0 && replaceCurrent && frame()) setScreenshot(frame(), state.device, path);
    else {
      state.project.frames.push(newFrame(state.project.frames.length, { screenshot: path }));
      state.sel = state.project.frames.length - 1;
    }
  }
  save();
  paint();
  buildInspector();
  toast(`${files.length} screenshot(s) added`);
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
$('#zoom').oninput = (e) => { state.zoom = +e.target.value / 100; drawCanvas(); };
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

$('#newProject').onclick = async () => {
  const name = prompt('Project name (e.g. fluenta)');
  if (!name) return;
  const p = await api.create(name);
  if (p.error) return toast(p.error);
  await loadProjects(p.name);
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
  state.project = await api.load(name);
  state.sel = 0;
  state.device = state.project.devices[0];
  buildDeviceTabs();
  paint();
  buildInspector();
}

async function loadProjects(select) {
  let list = await api.projects();
  if (!list.length) { await api.create('demo'); list = await api.projects(); }
  $('#projectSelect').innerHTML = list
    .map((p) => `<option value="${p.name}">${p.name}</option>`)
    .join('');
  const pick = select || list[0].name;
  $('#projectSelect').value = pick;
  await openProject(pick);
}

window.addEventListener('resize', drawCanvas);
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input,textarea,select')) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    state.sel = Math.min(state.sel + 1, state.project.frames.length - 1); paint(); buildInspector();
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    state.sel = Math.max(state.sel - 1, 0); paint(); buildInspector();
  }
});

loadProjects();
