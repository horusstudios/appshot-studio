// Decorative shape layer drawn ACROSS the whole set.
//
// One SVG is drawn across the whole strip (width = frame count × frame width),
// and each frame shows its own slice of it. Shape edges deliberately do not line
// up with the frame boundaries, so the set reads as a single composition.

const rnd = (seed) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// Smooth closed path through points (quadratic curves at the midpoints).
function smoothClosedPath(pts) {
  if (pts.length < 3) return '';
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M ${mid(pts[pts.length - 1], pts[0]).join(' ')}`;
  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i];
    const next = pts[(i + 1) % pts.length];
    const m = mid(cur, next);
    d += ` Q ${cur[0]} ${cur[1]} ${m[0]} ${m[1]}`;
  }
  return d + ' Z';
}

function blob(cx, cy, rx, ry, seed, points = 7) {
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const j = 0.68 + 0.55 * rnd(seed + i * 3.3);
    pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
  }
  return smoothClosedPath(pts);
}

/**
 * @param {object} spec  { kind, colors, opacity, pitch, offset, skew, mode, seed, size }
 * @param {object} geo   { stripW, ch, cw, count }
 * @returns {string} SVG markup, or '' when there is nothing to draw
 */
export function shapesSVG(spec, geo) {
  if (!spec || !spec.kind || spec.kind === 'none') return '';
  const { stripW, ch, cw, count } = geo;
  const colors = spec.colors && spec.colors.length ? spec.colors : ['#ffffff'];
  const op = spec.opacity ?? 1;
  const seed = spec.seed ?? 7;
  let body = '';

  switch (spec.kind) {
    // Colour panels. The pitch equals one frame width but is offset by half a
    // frame, so the seams land mid-frame — that is what ties the set together.
    case 'blocks': {
      const pitch = cw * (spec.pitch ?? 1);
      const off = (spec.offset ?? 0.5) * pitch;
      const skew = (spec.skew ?? 0.09) * cw;
      const mode = spec.mode || 'full';
      const n = Math.ceil(stripW / pitch) + 2;
      for (let k = -1; k < n; k++) {
        const color = colors[((k % colors.length) + colors.length) % colors.length];
        if (!color || color === 'transparent') continue;
        const x0 = k * pitch + off;
        const x1 = x0 + pitch;
        let pts;
        if (mode === 'alt') {
          // The top/bottom flip must be independent of the colour cycle, or blocks
          // of one colour all stick to the same side and the rhythm disappears.
          const top = Math.floor(k / colors.length) % 2 === 0;
          const h = ch * (spec.size ?? 0.56);
          pts = top
            ? `${x0 - skew},0 ${x1 + skew},0 ${x1 - skew},${h} ${x0 + skew},${h + skew * 1.6}`
            : `${x0 + skew},${ch - h - skew * 1.6} ${x1 - skew},${ch - h} ${x1 + skew},${ch} ${x0 - skew},${ch}`;
        } else {
          pts = `${x0 + skew},0 ${x1 + skew},0 ${x1 - skew},${ch} ${x0 - skew},${ch}`;
        }
        body += `<polygon points="${pts}" fill="${color}" />`;
      }
      break;
    }

    // Organic blobs — scattered across the strip, ignoring frame boundaries.
    case 'blobs': {
      const per = spec.per ?? 1.4;
      const total = Math.max(3, Math.round(count * per));
      for (let i = 0; i < total; i++) {
        const color = colors[i % colors.length];
        const cx = ((i + 0.35 + rnd(seed + i) * 0.55) / total) * stripW;
        const cy = ch * (0.12 + rnd(seed + i * 2.7) * 0.78);
        const r = cw * (spec.size ?? 0.55) * (0.6 + rnd(seed + i * 5.1) * 0.9);
        body += `<path d="${blob(cx, cy, r, r * (0.7 + rnd(seed + i * 1.9) * 0.7), seed + i)}" fill="${color}" />`;
      }
      break;
    }

    // A single wave rising and falling along the strip.
    case 'waves': {
      const amp = ch * (spec.size ?? 0.16);
      const base = ch * (spec.baseline ?? 0.62);
      const segs = Math.max(2, count);
      colors.slice(0, 2).forEach((color, ci) => {
        const shift = ci * cw * 0.45;
        const yOff = ci * amp * 0.5;
        let d = `M ${-cw} ${base + yOff + amp}`;
        for (let k = 0; k <= segs; k++) {
          const x0 = k * cw - cw + shift;
          const x1 = x0 + cw;
          const y0 = base + yOff + (k % 2 === 0 ? -amp : amp);
          const y1 = base + yOff + (k % 2 === 0 ? amp : -amp);
          d += ` C ${x0 + cw * 0.4} ${y0} ${x1 - cw * 0.4} ${y1} ${x1} ${y1}`;
        }
        d += ` L ${stripW + cw} ${ch} L ${-cw} ${ch} Z`;
        body += `<path d="${d}" fill="${color}" />`;
      });
      break;
    }

    // Large circles sitting behind the copy blocks.
    case 'circles': {
      const r = cw * (spec.size ?? 0.44);
      const every = spec.every ?? 2;
      // Circles belong behind the copy; when a template keeps all copy on top,
      // a circle drifting to the bottom just looks unrelated.
      for (let j = 0; j < count; j++) {
        if (j % every !== (spec.phase ?? 1) % every) continue;
        const color = colors[j % colors.length];
        const cy = ch * (spec.alternate && j % (every * 2) >= every ? 0.84 : spec.y ?? 0.15);
        body += `<circle cx="${(j + 0.5) * cw}" cy="${cy}" r="${r}" fill="${color}" />`;
      }
      break;
    }

    default:
      return '';
  }

  if (!body) return '';
  return `<svg class="ash-shapes-svg" width="${stripW}" height="${ch}" viewBox="0 0 ${stripW} ${ch}"
    preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="opacity:${op}">${body}</svg>`;
}
