// Background presets + CSS generation.
// A background is a plain object, e.g.
//   { type:'linear', angle:160, stops:['#6366f1','#ec4899'] }
//   { type:'mesh', base:'#0b1020', blobs:[{color:'#6366f1',x:20,y:15,size:70}] }
//   { type:'solid', color:'#0f172a' }
//   { type:'image', src:'assets/bg.jpg', blur:0, dim:0.2 }
//   { type:'screenshot', blur:70, dim:0.45, scale:1.4 }  // blurred app screenshot
// Optional on any background:  overlay:{ pattern:'dots', color:'#fff', opacity:0.06, size:3 }

export const BACKGROUND_PRESETS = {
  midnight: { type: 'linear', angle: 160, stops: ['#0f172a', '#1e293b'] },
  indigo: { type: 'linear', angle: 160, stops: ['#4f46e5', '#7c3aed'] },
  sunset: { type: 'linear', angle: 160, stops: ['#fb7185', '#f59e0b'] },
  ocean: { type: 'linear', angle: 160, stops: ['#0ea5e9', '#2563eb'] },
  mint: { type: 'linear', angle: 160, stops: ['#34d399', '#0ea5e9'] },
  grape: { type: 'linear', angle: 160, stops: ['#a855f7', '#ec4899'] },
  peach: { type: 'linear', angle: 160, stops: ['#fed7aa', '#fda4af'] },
  cream: { type: 'solid', color: '#f8f5f0' },
  paper: { type: 'solid', color: '#ffffff' },
  ink: { type: 'solid', color: '#0b0b0f' },
  slate: { type: 'linear', angle: 160, stops: ['#f1f5f9', '#cbd5e1'] },
  gold: { type: 'linear', angle: 160, stops: ['#78350f', '#b45309'] },
  forest: { type: 'linear', angle: 160, stops: ['#064e3b', '#065f46'] },
  aurora: {
    type: 'mesh',
    base: '#0b1020',
    blobs: [
      { color: '#6366f1', x: 15, y: 12, size: 75 },
      { color: '#ec4899', x: 88, y: 30, size: 65 },
      { color: '#22d3ee', x: 50, y: 92, size: 80 },
    ],
  },
  bloom: {
    type: 'mesh',
    base: '#fff7ed',
    blobs: [
      { color: '#fca5a5', x: 12, y: 18, size: 70 },
      { color: '#fdba74', x: 90, y: 12, size: 60 },
      { color: '#a5b4fc', x: 60, y: 95, size: 75 },
    ],
  },
  nebula: {
    type: 'mesh',
    base: '#12081f',
    blobs: [
      { color: '#7c3aed', x: 25, y: 20, size: 80 },
      { color: '#db2777', x: 85, y: 60, size: 70 },
      { color: '#2563eb', x: 10, y: 88, size: 65 },
    ],
  },
  blurshot: { type: 'screenshot', blur: 70, dim: 0.45, scale: 1.5 },
};

export const BACKGROUND_PRESET_IDS = Object.keys(BACKGROUND_PRESETS);

export const PATTERNS = ['none', 'dots', 'grid', 'diagonal', 'noise'];

const hexToRgba = (hex, a) => {
  let h = String(hex || '#000').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

export function resolveBackground(bg) {
  if (!bg) return { ...BACKGROUND_PRESETS.midnight };
  if (typeof bg === 'string') {
    const preset = BACKGROUND_PRESETS[bg];
    if (preset) return { ...preset };
    if (bg.startsWith('#')) return { type: 'solid', color: bg };
    return { ...BACKGROUND_PRESETS.midnight };
  }
  if (bg.preset && BACKGROUND_PRESETS[bg.preset]) {
    const { preset, ...rest } = bg;
    return { ...BACKGROUND_PRESETS[preset], ...rest };
  }
  return { ...bg };
}

// Returns { layers: [cssBackgroundString], style: extraCssText }
export function backgroundCSS(bgRaw, ctx) {
  const bg = resolveBackground(bgRaw);
  const { cw, ch, screenshotURL } = ctx;
  let css = '';

  switch (bg.type) {
    case 'solid':
      css = `background:${bg.color || '#0f172a'};`;
      break;

    case 'linear': {
      const stops = (bg.stops && bg.stops.length ? bg.stops : ['#4f46e5', '#7c3aed'])
        .join(', ');
      css = `background:linear-gradient(${bg.angle ?? 160}deg, ${stops});`;
      break;
    }

    case 'radial': {
      const stops = (bg.stops && bg.stops.length ? bg.stops : ['#4f46e5', '#0b1020'])
        .join(', ');
      const at = `${bg.x ?? 50}% ${bg.y ?? 20}%`;
      css = `background:radial-gradient(circle at ${at}, ${stops});`;
      break;
    }

    case 'mesh': {
      const blobs = (bg.blobs || []).map((b) => {
        const size = (b.size ?? 70) / 100;
        const r = Math.round(Math.max(cw, ch) * size);
        const a = b.alpha ?? 0.85;
        return `radial-gradient(circle ${r}px at ${b.x}% ${b.y}%, ${hexToRgba(
          b.color,
          a
        )} 0%, ${hexToRgba(b.color, a * 0.45)} 38%, ${hexToRgba(
          b.color,
          a * 0.12
        )} 68%, ${hexToRgba(b.color, 0)} 100%)`;
      });
      css = `background-color:${bg.base || '#0b1020'};background-image:${
        blobs.join(', ') || 'none'
      };`;
      break;
    }

    case 'image':
      css =
        `background-image:url('${bg.src}');background-size:${bg.fit || 'cover'};` +
        `background-position:${bg.position || 'center'};`;
      if (bg.blur) css += `filter:blur(${(bg.blur / 100) * cw * 0.08}px);transform:scale(1.15);`;
      break;

    case 'screenshot': {
      const src = screenshotURL || '';
      css =
        `background-image:url('${src}');background-size:cover;background-position:center;` +
        `transform:scale(${bg.scale ?? 1.4});` +
        `filter:blur(${((bg.blur ?? 70) / 100) * cw * 0.12}px) saturate(1.3);`;
      break;
    }

    default:
      css = 'background:#0f172a;';
  }
  return css;
}

export function dimCSS(bgRaw) {
  const bg = resolveBackground(bgRaw);
  const dim = bg.dim ?? 0;
  if (!dim) return null;
  return `background:rgba(0,0,0,${dim});`;
}

export function overlayCSS(bgRaw, ctx) {
  const bg = resolveBackground(bgRaw);
  const ov = bg.overlay;
  if (!ov || !ov.pattern || ov.pattern === 'none') return null;
  const { cw } = ctx;
  const color = hexToRgba(ov.color || '#ffffff', ov.opacity ?? 0.07);
  const size = Math.round(((ov.size ?? 3) / 100) * cw);

  switch (ov.pattern) {
    case 'dots':
      return (
        `background-image:radial-gradient(${color} ${Math.max(
          1,
          size * 0.12
        )}px, transparent ${Math.max(1, size * 0.12)}px);` +
        `background-size:${size}px ${size}px;`
      );
    case 'grid':
      return (
        `background-image:linear-gradient(${color} 1px, transparent 1px),` +
        `linear-gradient(90deg, ${color} 1px, transparent 1px);` +
        `background-size:${size}px ${size}px;`
      );
    case 'diagonal':
      return (
        `background-image:repeating-linear-gradient(45deg, ${color} 0 ${Math.max(
          1,
          size * 0.1
        )}px, transparent ${Math.max(1, size * 0.1)}px ${size}px);`
      );
    case 'noise': {
      const svg = encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3"/></filter><rect width="120" height="120" filter="url(%23n)" opacity="1"/></svg>`
      ).replace(/%23/g, '%23');
      return `background-image:url('data:image/svg+xml,${svg}');background-size:${
        size * 8
      }px ${size * 8}px;opacity:${ov.opacity ?? 0.07};mix-blend-mode:overlay;`;
    }
    default:
      return null;
  }
}
