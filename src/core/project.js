// Project schema helpers. Browser-safe — no fs here (see server/store.js).

import { DEFAULT_TEXT, DEFAULT_DEVICE } from './render.js';
export { L10N_FIELDS, baseLocale, localizedFrame, getLocalized, setLocalized } from './l10n.js';

export const PROJECT_VERSION = 1;

export function newProject(name, opts = {}) {
  return {
    version: PROJECT_VERSION,
    name,
    app: opts.app || name,
    devices: opts.devices || ['iphone-6.9', 'ipad-13'],
    locales: opts.locales || ['en'],
    orientation: 'portrait',
    defaults: {
      template: opts.template || 'text-top',
      background: opts.background || 'indigo',
      text: { ...DEFAULT_TEXT },
      device: { ...DEFAULT_DEVICE },
    },
    frames: [],
  };
}

export function newFrame(i = 0, overrides = {}) {
  return {
    id: `f${Date.now().toString(36)}${i}`,
    title: '',
    subtitle: '',
    eyebrow: '',
    screenshot: null,
    ...overrides,
  };
}

export function normalizeProject(p) {
  const out = { ...newProject(p.name || 'untitled'), ...p };
  out.version = PROJECT_VERSION;
  out.defaults = {
    template: 'text-top',
    background: 'indigo',
    ...(p.defaults || {}),
    text: { ...DEFAULT_TEXT, ...((p.defaults || {}).text || {}) },
    device: { ...DEFAULT_DEVICE, ...((p.defaults || {}).device || {}) },
  };
  out.frames = (p.frames || []).map((f, i) => ({ ...newFrame(i), ...f }));
  if (!out.devices || !out.devices.length) out.devices = ['iphone-6.9', 'ipad-13'];
  if (!out.locales || !out.locales.length) out.locales = ['en'];
  return out;
}

// "1,3-5" / "all" -> zero-based indexes
export function parseFrameSelector(sel, count) {
  if (!sel || sel === 'all' || sel === '*') {
    return Array.from({ length: count }, (_, i) => i);
  }
  const out = new Set();
  for (const part of String(sel).split(',')) {
    const chunk = part.trim();
    if (!chunk) continue;
    const m = chunk.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const a = Math.min(+m[1], +m[2]);
      const b = Math.max(+m[1], +m[2]);
      for (let i = a; i <= b; i++) if (i >= 1 && i <= count) out.add(i - 1);
    } else if (/^\d+$/.test(chunk)) {
      const i = +chunk;
      if (i >= 1 && i <= count) out.add(i - 1);
    }
  }
  return [...out].sort((a, b) => a - b);
}

// Apply a shallow patch with dotted keys: setPath(frame, 'text.titleSize', 7)
export function setPath(obj, path, value) {
  const keys = path.split('.');
  let node = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof node[keys[i]] !== 'object' || node[keys[i]] === null) node[keys[i]] = {};
    node = node[keys[i]];
  }
  node[keys[keys.length - 1]] = value;
  return obj;
}

export function getPath(obj, path) {
  return path.split('.').reduce((n, k) => (n == null ? undefined : n[k]), obj);
}
