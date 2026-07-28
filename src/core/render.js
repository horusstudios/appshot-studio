// The single rendering engine. The visual editor and the CLI both call
// renderFrame() so what you see in the browser is exactly what gets exported.

import { getDevice, FRAME_STYLES } from './devices.js';
import { getTemplate, deviceSpecFor, textSpecFor } from './templates.js';
import { shapesSVG } from './shapes.js';
import { localizedFrame } from './l10n.js';
import { groupRange } from './project.js';
import { backgroundCSS, overlayCSS, dimCSS, resolveBackground } from './backgrounds.js';
import { fontStack } from './fonts.js';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Text can contain **bold** and \n line breaks.
const richText = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\r?\n/g, '<br>');

export const DEFAULT_TEXT = {
  font: 'Inter',
  color: '#ffffff',
  align: null, // null -> use template alignment
  titleSize: 6.0,
  titleWeight: 800,
  titleLineHeight: 1.14,
  titleTransform: 'none',
  titleLetterSpacing: -2,
  subtitleSize: 3.3,
  subtitleWeight: 500,
  subtitleColor: null, // null -> title color at 78% opacity
  subtitleLineHeight: 1.38,
  subtitleLetterSpacing: 0,
  eyebrowSize: 2.5,
  eyebrowWeight: 700,
  eyebrowColor: null,
  eyebrowLetterSpacing: 8,
  gap: 2.0,
  shadow: 0,
};

export const DEFAULT_DEVICE = {
  hidden: false,
  frame: 'auto',
  shadow: 0.5,
  scale: 1,
  x: 0,
  y: 0,
  rotate: null,
  radius: null,
};

const merge = (...objs) => {
  const out = {};
  for (const o of objs) {
    if (!o) continue;
    for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  }
  return out;
};

const withAlpha = (hex, a) => {
  let h = String(hex || '#ffffff').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

// Attach a screenshot to a frame for one device (or every device).
export function setScreenshot(frame, deviceId, path, forAllDevices = false) {
  if (forAllDevices || !deviceId) {
    frame.screenshot = path;
    return frame;
  }
  const cur = frame.screenshot;
  if (!cur) frame.screenshot = { default: path };
  else if (typeof cur === 'string') frame.screenshot = { default: cur, [deviceId]: path };
  else frame.screenshot = { ...cur, [deviceId]: path };
  return frame;
}

// Screenshot paths can be a string, an array, or per-device map.
export function resolveScreenshots(frame, deviceId) {
  const s = frame.screenshot ?? frame.screenshots;
  if (!s) return [];
  if (typeof s === 'string') return [s];
  if (Array.isArray(s)) return s.filter(Boolean);
  if (typeof s === 'object') {
    const picked = s[deviceId] ?? s.default ?? Object.values(s)[0];
    if (!picked) return [];
    return Array.isArray(picked) ? picked.filter(Boolean) : [picked];
  }
  return [];
}

function deviceGeometry({ bodyW, screenAspect, frameStyle }) {
  const fs = FRAME_STYLES[frameStyle] || FRAME_STYLES.none;
  const pad = fs.pad * bodyW;
  const border = (fs.border || 0) * bodyW;
  const screenW = bodyW - 2 * pad - 2 * border;
  const screenH = screenW / screenAspect;
  const forehead = (fs.foreheadH || 0) * bodyW;
  const chin = (fs.chinH || 0) * bodyW;
  const bodyH = screenH + 2 * pad + 2 * border + forehead + chin;
  const radius = fs.radius * bodyW;
  return { fs, pad, border, screenW, screenH, bodyH, radius, forehead, chin };
}

function renderDeviceEl({ cw, ch, spec, deviceCfg, dev, src, index, template, leftCSS }) {
  const wPct = (spec.w ?? 70) * (deviceCfg.scale ?? 1);
  const bodyW = (wPct / 100) * cw;
  const screenAspect = dev.screen[0] / dev.screen[1];
  const frameStyle =
    spec.frame || (deviceCfg.frame && deviceCfg.frame !== 'auto' ? deviceCfg.frame : dev.frame);

  const g = deviceGeometry({ bodyW, screenAspect, frameStyle });

  const bleed = spec.bleed;
  const left = 50 + (spec.x ?? 0) + (deviceCfg.x ?? 0);
  const top = (spec.y ?? 30) + (deviceCfg.y ?? 0);
  const rotate = deviceCfg.rotate !== null && deviceCfg.rotate !== undefined
    ? deviceCfg.rotate
    : spec.rotate ?? 0;

  const shadowAmt = deviceCfg.shadow ?? 0.5;
  const shadow = shadowAmt
    ? `box-shadow:0 ${bodyW * 0.06}px ${bodyW * 0.16}px rgba(0,0,0,${
        0.55 * shadowAmt
      }), 0 ${bodyW * 0.015}px ${bodyW * 0.04}px rgba(0,0,0,${0.35 * shadowAmt});`
    : '';

  if (bleed) {
    // Full bleed: the screenshot covers the entire canvas.
    return `<div class="ash-device ash-bleed" style="z-index:${spec.z ?? 1};">
      ${src ? `<img class="ash-shot" src="${esc(src)}" alt="">` : '<div class="ash-empty"></div>'}
    </div>`;
  }

  const radiusOverride = deviceCfg.radius !== null && deviceCfg.radius !== undefined
    ? (deviceCfg.radius / 100) * bodyW
    : null;
  const outerRadius = spec.radius !== undefined ? spec.radius * bodyW : radiusOverride ?? g.radius;
  const innerRadius = Math.max(0, outerRadius - g.pad - g.border);

  const chrome = [];
  const fs = g.fs;
  if (fs.band) {
    chrome.push(
      `<div class="ash-island" style="width:${fs.band.w * bodyW}px;height:${
        fs.band.hH * g.bodyH
      }px;top:${g.pad + g.border + fs.band.topH * g.bodyH}px;border-radius:999px;"></div>`
    );
  }
  if (fs.notch) {
    chrome.push(
      `<div class="ash-notch" style="width:${fs.notch.w * bodyW}px;height:${
        fs.notch.hH * g.bodyH
      }px;top:${g.pad + g.border}px;border-bottom-left-radius:${bodyW * 0.05}px;border-bottom-right-radius:${
        bodyW * 0.05
      }px;"></div>`
    );
  }
  if (fs.punch) {
    chrome.push(
      `<div class="ash-punch" style="width:${fs.punch.d * bodyW}px;height:${
        fs.punch.d * bodyW
      }px;top:${g.pad + g.border + fs.punch.topH * g.bodyH}px;"></div>`
    );
  }
  if (fs.camera) {
    chrome.push(
      `<div class="ash-cam" style="width:${fs.camera.d * bodyW}px;height:${
        fs.camera.d * bodyW
      }px;top:${g.pad * 0.25 + g.border}px;"></div>`
    );
  }
  if (fs.homebar) {
    chrome.push(
      `<div class="ash-homebar" style="width:${fs.homebar.w * bodyW}px;height:${Math.max(
        2,
        fs.homebar.hH * g.bodyH
      )}px;bottom:${g.pad + g.border + fs.homebar.bottomH * g.bodyH}px;"></div>`
    );
  }

  const screenTop = g.pad + g.border + g.forehead;

  return `<div class="ash-device" style="
      width:${bodyW}px;height:${g.bodyH}px;
      left:${leftCSS || `${left}%`};top:${top}%;
      transform:translateX(-50%) rotate(${rotate}deg);
      z-index:${spec.z ?? 1};">
    <div class="ash-body" style="
        border-radius:${outerRadius}px;
        ${frameStyle === 'none' ? 'background:transparent;' : `background:#08080c;border:${g.border}px solid #2a2a33;`}
        ${shadow}">
      <div class="ash-screen" style="
          position:absolute;left:${g.pad + g.border}px;top:${screenTop}px;
          width:${g.screenW}px;height:${g.screenH}px;
          border-radius:${innerRadius}px;">
        ${src ? `<img class="ash-shot" src="${esc(src)}" alt="">` : `<div class="ash-empty"><span>screenshot ${index + 1}</span></div>`}
      </div>
      ${chrome.join('')}
    </div>
  </div>`;
}

// Free-floating things stacked on a frame — images, text and emoji.
// `behind: true` puts one under the device instead of over it.
// `size` is a percentage of canvas width: image width for image layers,
// font size for text and emoji, so one control fits every type.
export const DEFAULT_LAYER = {
  type: 'image',
  x: 0, y: 50, size: 26, rotate: 0, opacity: 1, behind: false,
  text: '', color: '#ffffff', font: 'Inter', weight: 800, width: 60, shadow: 0,
};

const EMOJI_STACK =
  "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

export const LAYER_TYPES = ['image', 'text', 'emoji'];

function renderLayers(frame, assetURL, cw) {
  const layers = frame.layers;
  if (!Array.isArray(layers) || !layers.length) return '';
  return layers
    .map((raw, k) => {
      const l = { ...DEFAULT_LAYER, ...raw };
      const size = l.size ?? l.w ?? DEFAULT_LAYER.size;
      // data-l lets the editor map a dragged element back to its layer.
      const box =
        `left:${50 + l.x}%;top:${l.y}%;` +
        `transform:translate(-50%,-50%) rotate(${l.rotate}deg);` +
        `opacity:${l.opacity};z-index:${l.behind ? 1 : 6};`;

      if (l.type === 'text' || l.type === 'emoji') {
        if (!l.text) return '';
        const emoji = l.type === 'emoji';
        const fs = (size / 100) * cw;
        const shadow = l.shadow
          ? `text-shadow:0 ${fs * 0.05}px ${fs * 0.16}px rgba(0,0,0,${0.7 * l.shadow});`
          : '';
        return `<div class="ash-layer ash-layer-text" data-l="${k}" style="${box}
          font-family:${emoji ? EMOJI_STACK : fontStack(l.font)};
          font-size:${fs}px;font-weight:${emoji ? 400 : l.weight};
          ${emoji ? '' : `color:${l.color};`}
          max-width:${l.width}%;${shadow}">${richText(l.text)}</div>`;
      }

      if (!l.src) return '';
      return `<div class="ash-layer" data-l="${k}" style="${box}width:${size}%;">
        <img src="${esc(assetURL(l.src))}" alt=""></div>`;
    })
    .join('');
}

function renderTextEl({ cw, ch, frame, text, tpl, tSpec, project, assetURL }) {
  const title = frame.title ?? '';
  const subtitle = frame.subtitle ?? '';
  const eyebrow = frame.eyebrow ?? '';
  const role = frame.role || 'feature';
  const icon = role === 'cover' && project.appIcon ? assetURL(project.appIcon) : null;
  const cta = role === 'cta' ? frame.cta || '' : '';
  if (!title && !subtitle && !eyebrow && !icon && !cta) return '';

  const align = text.align || tSpec.align || 'center';
  const pct = (v) => (v / 100) * cw;
  const shadow = text.shadow
    ? `text-shadow:0 ${pct(0.4)}px ${pct(1.2)}px rgba(0,0,0,${0.6 * text.shadow});`
    : '';

  const subColor = text.subtitleColor || withAlpha(text.color, 0.78);
  const eyeColor = text.eyebrowColor || withAlpha(text.color, 0.85);

  const anchor = tSpec.anchor === 'bottom'
    ? `bottom:${tSpec.y}%;`
    : `top:${tSpec.y}%;`;

  const card = tSpec.card;
  const cardCSS = card
    ? `background:${withAlpha(card.color, card.opacity)};border-radius:${pct(
        card.radius
      )}px;padding:${pct(card.padY)}px ${pct(card.padX)}px;backdrop-filter:blur(${pct(
        card.blur / 10
      )}px);`
    : '';

  const parts = [];
  if (icon) {
    parts.push(
      `<img class="ash-appicon" src="${esc(icon)}" alt="" style="width:${pct(
        text.iconSize ?? 11
      )}px;height:${pct(text.iconSize ?? 11)}px;border-radius:${pct(
        (text.iconSize ?? 11) * 0.22
      )}px;margin-bottom:${pct(text.gap * 1.1)}px;">`
    );
  }
  if (eyebrow) {
    parts.push(
      `<div class="ash-eyebrow" style="font-size:${pct(text.eyebrowSize)}px;font-weight:${
        text.eyebrowWeight
      };color:${eyeColor};letter-spacing:${text.eyebrowLetterSpacing / 100}em;margin-bottom:${pct(
        text.gap * 0.55
      )}px;">${richText(eyebrow)}</div>`
    );
  }
  if (title) {
    parts.push(
      `<div class="ash-title" style="font-size:${pct(text.titleSize)}px;font-weight:${
        text.titleWeight
      };color:${text.color};line-height:${text.titleLineHeight};letter-spacing:${
        text.titleLetterSpacing / 100
      }em;text-transform:${text.titleTransform};">${richText(title)}</div>`
    );
  }
  if (subtitle) {
    parts.push(
      `<div class="ash-subtitle" style="font-size:${pct(text.subtitleSize)}px;font-weight:${
        text.subtitleWeight
      };color:${subColor};line-height:${text.subtitleLineHeight};letter-spacing:${
        text.subtitleLetterSpacing / 100
      }em;margin-top:${pct(text.gap)}px;">${richText(subtitle)}</div>`
    );
  }

  if (cta) {
    parts.push(
      `<div class="ash-ctabtn" style="margin-top:${pct(text.gap * 1.4)}px;font-size:${pct(
        text.subtitleSize * 0.86
      )}px;font-weight:700;color:${text.ctaColor || '#0f172a'};background:${
        text.ctaBg || '#ffffff'
      };padding:${pct(1.5)}px ${pct(4)}px;border-radius:${pct(9)}px;">${richText(cta)}</div>`
    );
  }

  return `<div class="ash-text" style="
      ${anchor}
      left:${50 + (tSpec.x || 0)}%;
      width:${tSpec.width}%;
      transform:translateX(-50%);
      text-align:${align};
      font-family:${fontStack(text.font)};
      ${shadow}">
    <div class="ash-text-inner" style="${cardCSS}">${parts.join('')}</div>
  </div>`;
}

/**
 * Render one screenshot frame.
 * @param {object} o
 * @param {object} o.frame       frame spec from project.frames
 * @param {object} o.project     whole project (for defaults)
 * @param {string} o.deviceId    device preset id
 * @param {(p:string)=>string} o.assetURL  resolves an asset path to a URL
 * @returns {{html:string, width:number, height:number}}
 */
export function renderFrame({
  frame,
  project,
  deviceId,
  orientation = 'portrait',
  assetURL = (p) => p,
  index,
  locale,
}) {
  const dev = getDevice(deviceId);
  // Text and (optionally) the screenshot resolve per language; layout is shared.
  const base = (project.locales && project.locales[0]) || 'en';
  const L = (fr) => localizedFrame(fr, locale, base);
  frame = L(frame);
  const cw = orientation === 'landscape' ? dev.height : dev.width;
  const ch = orientation === 'landscape' ? dev.width : dev.height;

  const defaults = project.defaults || {};
  const templateId = frame.template || defaults.template || 'text-top';
  const tpl = getTemplate(templateId, dev.kind);

  // Cover and CTA frames use their own type scale; a per-frame override the
  // user set still wins over it.
  const roleStyle =
    frame.role === 'cover' ? tpl.cover && tpl.cover.style
    : frame.role === 'cta' ? tpl.cta && tpl.cta.style
    : null;
  const text = merge(DEFAULT_TEXT, defaults.text, roleStyle, frame.text);
  const deviceCfg = merge(DEFAULT_DEVICE, defaults.device, frame.device);
  const bgRaw = frame.background ?? defaults.background ?? 'midnight';

  const shots = resolveScreenshots(frame, deviceId).map(assetURL);
  const bgResolved = resolveBackground(bgRaw);
  if (bgResolved.type === 'image' && bgResolved.src) {
    bgResolved.src = assetURL(bgResolved.src);
  }

  // ---- continuity across the whole set ------------------------------------
  // A "continuous" template renders a strip that is `count` frames wide and
  // slides it left by `index` frames, so the background — and optionally the
  // devices — flow from one screenshot into the next.
  const frames = (project.frames || []).length ? project.frames : [frame];
  const i = index ?? Math.max(0, frames.indexOf(frame));
  const count = Math.max(1, frames.length);
  const cont = tpl.continuous || null;
  const stripW = cont ? cw * count : cw;
  const stripX = cont ? -i * cw : 0;

  // A panoramic background spans the whole set even on a template that is not
  // continuous: the background element becomes count frames wide and slides left
  // by one frame per index, so each frame shows its own slice of one image.
  const bgSpan = Boolean(cont) || Boolean(bgResolved.span);
  const bgStripW = bgSpan ? cw * count : cw;
  const bgStripX = bgSpan ? -i * cw : 0;

  const ctx = { cw: bgStripW, ch, screenshotURL: shots[0] || '' };
  const bgCSS = backgroundCSS(bgResolved, ctx);
  const ovCSS = overlayCSS(bgResolved, { cw, ch });
  const dCSS = dimCSS(bgResolved);

  const stripStyle = cont
    ? `left:${stripX}px;width:${stripW}px;right:auto;`
    : '';
  const bgStripStyle = bgSpan
    ? `left:${bgStripX}px;width:${bgStripW}px;right:auto;`
    : '';

  let devicesHTML;
  if (deviceCfg.hidden) {
    // "No device": the frame becomes a poster — background, copy and layers only.
    devicesHTML = '';
  } else if (cont === 'full') {
    devicesHTML = frames
      .map((fRaw, j) => {
        const f = L(fRaw);
        if (f.role === 'cta') return ''; // no device on a CTA frame
        // Linked frames share one device straddling the seam between them, so it
        // is drawn once by the first member and skipped by the rest.
        const [ga, gb] = groupRange(frames, j);
        const span = gb - ga + 1;
        if (span > 1 && j !== ga) return '';
        const spec = deviceSpecFor(tpl, j, f.role);
        const w = span > 1 ? (spec.w ?? 70) * (1 + (span - 1) * 0.42) : spec.w;
        const s = resolveScreenshots(f, deviceId).map(assetURL);
        // A spanning device centres on the seam; a single one on its own frame.
        const centre = span > 1 ? (ga + gb + 1) / 2 : j + 0.5;
        return renderDeviceEl({
          cw,
          ch,
          spec: { ...spec, w },
          deviceCfg,
          dev,
          src: s[0] || '',
          index: j,
          template: tpl,
          leftCSS: `${centre * cw + (((spec.x ?? 0) + (deviceCfg.x ?? 0)) / 100) * cw}px`,
        });
      })
      .join('');
  } else if (frame.role === 'cta') {
    devicesHTML = '';
  } else {
    // Linked frames on an ordinary template: there is no strip to draw across,
    // so each frame draws the shared device shifted by half a canvas so the two
    // halves meet exactly at the seam. Anything past the edge is clipped.
    const [ga, gb] = groupRange(frames, i);
    const span = gb - ga + 1;
    const base = tpl.variants
      ? [deviceSpecFor(tpl, i, frame.role)]
      : tpl.devices.map((d) => (frame.role === 'cover' && tpl.cover && tpl.cover.device
          ? { ...d, ...tpl.cover.device }
          : d));
    const specs = span > 1 && base.length
      ? [{
          ...base[0],
          x: (base[0].x ?? 0) + ((ga + gb + 1) / 2 - (i + 0.5)) * 100,
          w: (base[0].w ?? 70) * (1 + (span - 1) * 0.42),
        }]
      : base;
    devicesHTML = specs
      .map((spec, k) =>
        renderDeviceEl({
          cw,
          ch,
          spec,
          deviceCfg,
          dev,
          src: shots[k] || shots[shots.length - 1] || '',
          index: k,
          template: tpl,
        })
      )
      .join('');
  }

  // Decorative shape layer flowing along the strip.
  const shapeSpec = bgResolved.shapes;
  const shapesHTML = shapeSpec
    ? shapesSVG(shapeSpec, { stripW: bgStripW, ch, cw, count: bgSpan ? count : 1 })
    : '';

  const scrim = tpl.scrim
    ? `<div class="ash-scrim" style="background:linear-gradient(to ${
        tpl.scrim.from === 'bottom' ? 'top' : 'bottom'
      }, rgba(0,0,0,${tpl.scrim.opacity}) 0%, rgba(0,0,0,0) ${tpl.scrim.size}%);"></div>`
    : '';

  const html = `<div class="ash-canvas" data-frame="${esc(frame.id ?? '')}" style="width:${cw}px;height:${ch}px;">
    <div class="ash-bg" style="${bgStripStyle}${bgCSS}"></div>
    ${shapesHTML ? `<div class="ash-shapes" style="${bgStripStyle}">${shapesHTML}</div>` : ''}
    ${dCSS ? `<div class="ash-dim" style="${dCSS}"></div>` : ''}
    ${ovCSS ? `<div class="ash-pattern" style="${ovCSS}"></div>` : ''}
    ${scrim}
    <div class="ash-stage" style="${cont === 'full' ? stripStyle : ''}">${devicesHTML}</div>
    ${renderLayers(frame, assetURL, cw)}
    ${renderTextEl({
      cw, ch, frame, text, tpl,
      // A dragged headline overrides wherever the template put it.
      tSpec: (() => {
        const t = textSpecFor(tpl, i, frame.role);
        if (text.x !== undefined && text.x !== null) t.x = text.x;
        if (text.y !== undefined && text.y !== null) { t.y = text.y; t.anchor = 'top'; }
        if (text.anchor) t.anchor = text.anchor;
        return t;
      })(),
      project, assetURL,
    })}
  </div>`;

  return { html, width: cw, height: ch };
}

export const CANVAS_CSS = `
.ash-canvas{position:relative;overflow:hidden;isolation:isolate;background:#000;}
.ash-canvas *{box-sizing:border-box;margin:0;padding:0;}
.ash-bg,.ash-dim,.ash-pattern,.ash-scrim,.ash-shapes{position:absolute;inset:0;}
.ash-shapes{z-index:1;pointer-events:none;overflow:hidden;}
.ash-shapes svg{display:block;height:100%;}
.ash-appicon{display:inline-block;object-fit:cover;box-shadow:0 6px 24px rgba(0,0,0,.28);}
.ash-ctabtn{display:inline-block;line-height:1;}
.ash-bg{background-repeat:no-repeat;background-position:center;transform-origin:center;}
.ash-pattern{pointer-events:none;}
.ash-scrim{pointer-events:none;z-index:4;}
.ash-stage{position:absolute;inset:0;z-index:2;}
.ash-device{position:absolute;transform-origin:center center;}
.ash-device.ash-bleed{inset:0;left:0;top:0;width:100%;height:100%;transform:none;}
.ash-device.ash-bleed .ash-shot{width:100%;height:100%;object-fit:cover;}
.ash-body{position:relative;width:100%;height:100%;}
.ash-screen{overflow:hidden;background:#111;}
.ash-shot{display:block;width:100%;height:100%;object-fit:cover;}
.ash-empty{width:100%;height:100%;display:flex;align-items:center;justify-content:center;
  background:repeating-linear-gradient(45deg,#1b1b22 0 20px,#23232c 20px 40px);
  color:#8b8b9a;font:600 2vw/1.2 -apple-system,sans-serif;letter-spacing:.05em;}
.ash-island,.ash-notch,.ash-punch,.ash-cam{position:absolute;left:50%;transform:translateX(-50%);background:#000;z-index:3;}
.ash-punch,.ash-cam{border-radius:50%;background:#0a0a0f;}
.ash-cam{background:#15151c;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);}
.ash-homebar{position:absolute;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.85);border-radius:999px;z-index:3;}
.ash-text{position:absolute;z-index:5;}
.ash-layer{position:absolute;pointer-events:none;}
.ash-layer img{display:block;width:100%;height:auto;}
.ash-layer-text{text-align:center;line-height:1.15;white-space:pre-wrap;word-break:break-word;width:max-content;}
.ash-title b,.ash-subtitle b{font-weight:900;}
`;
