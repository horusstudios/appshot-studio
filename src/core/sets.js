// Style packs — a whole screenshot SET in one click.
//
// A pack defines background, typography, device settings AND which template
// each frame uses, all together. If `sequence` is shorter than the frame count
// it wraps around, so a set can never end up half-styled.
//
// Individual frames can still be changed after a pack is applied.

import { DEFAULT_TEXT, DEFAULT_DEVICE } from './render.js';

export const SETS = {
  'bold-gradient': {
    name: 'Bold Gradient',
    hint: 'Vivid purple-to-pink gradient, heavy white headline. The safest all-rounder.',
    defaults: {
      background: { type: 'linear', angle: 160, stops: ['#6366f1', '#ec4899'] },
      text: {
        font: 'Inter', color: '#ffffff', titleSize: 6.0, titleWeight: 800,
        titleLetterSpacing: -2, subtitleSize: 3.3, subtitleWeight: 500, shadow: 0,
      },
      device: { shadow: 0.55, scale: 1 },
    },
    sequence: ['text-top', 'tilt-right', 'text-top', 'tilt-left', 'duo'],
  },

  'clean-light': {
    name: 'Clean Light',
    hint: 'White ground, dark copy. For productivity and finance apps.',
    defaults: {
      background: { type: 'solid', color: '#f5f6f9' },
      text: {
        font: 'Inter', color: '#0f172a', titleSize: 5.6, titleWeight: 800,
        titleLetterSpacing: -2.5, subtitleSize: 3.1, subtitleWeight: 500,
        subtitleColor: '#64748b', shadow: 0,
      },
      device: { shadow: 0.35 },
    },
    sequence: ['hero', 'text-top', 'frameless', 'text-top', 'hero'],
  },

  'panorama-flow': {
    name: 'Panorama Flow',
    hint: 'The whole set flows as one wide image — neighbouring screens peek in.',
    defaults: {
      background: {
        type: 'mesh',
        base: '#0b1020',
        blobs: [
          { color: '#6366f1', x: 10, y: 18, size: 55 },
          { color: '#ec4899', x: 42, y: 78, size: 50 },
          { color: '#22d3ee', x: 74, y: 20, size: 50 },
          { color: '#a855f7', x: 95, y: 70, size: 55 },
        ],
      },
      text: {
        font: 'Plus Jakarta Sans', color: '#ffffff', titleSize: 5.7, titleWeight: 800,
        titleLetterSpacing: -2, subtitleSize: 3.2, subtitleWeight: 500, shadow: 0.25,
      },
      device: { shadow: 0.6 },
    },
    sequence: ['pano-flow'],
  },

  'panorama-tilt': {
    name: 'Panorama Tilt',
    hint: 'An unbroken ribbon of tilted devices. Great for games and social apps.',
    defaults: {
      background: { type: 'linear', angle: 115, stops: ['#0f172a', '#4c1d95', '#be185d'] },
      text: {
        font: 'Space Grotesk', color: '#ffffff', titleSize: 5.6, titleWeight: 700,
        titleLetterSpacing: -1, subtitleSize: 3.1, subtitleWeight: 400, shadow: 0.3,
      },
      device: { shadow: 0.65 },
    },
    sequence: ['pano-tilt'],
  },

  'dark-pro': {
    name: 'Dark Pro',
    hint: 'Black ground, fine dot pattern, bezel-free shots. For tools and developer apps.',
    defaults: {
      background: {
        type: 'solid', color: '#0b0b0f',
        overlay: { pattern: 'dots', color: '#ffffff', opacity: 0.09, size: 2.4 },
      },
      text: {
        font: 'Manrope', color: '#ffffff', titleSize: 5.5, titleWeight: 800,
        titleLetterSpacing: -2, subtitleSize: 3.0, subtitleWeight: 500,
        subtitleColor: '#94a3b8', shadow: 0,
      },
      device: { shadow: 0.7, frame: 'none' },
    },
    sequence: ['frameless', 'text-top', 'frameless', 'duo', 'text-bottom'],
  },

  'editorial-serif': {
    name: 'Editorial Serif',
    hint: 'Cream ground, serif headline. For reading, health and content apps.',
    defaults: {
      background: { type: 'solid', color: '#f6f1e7' },
      text: {
        font: 'Playfair Display', color: '#1c1917', titleSize: 6.2, titleWeight: 700,
        titleLetterSpacing: -1.5, subtitleSize: 3.0, subtitleWeight: 400,
        subtitleColor: '#78716c', shadow: 0,
      },
      device: { shadow: 0.3 },
    },
    sequence: ['text-top', 'hero', 'text-bottom', 'hero', 'text-top'],
  },

  'soft-pastel': {
    name: 'Soft Pastel',
    hint: 'Soft pastel mesh, rounded type. For kids, wellbeing and habit apps.',
    defaults: {
      background: {
        type: 'mesh', base: '#fff7ed',
        blobs: [
          { color: '#fca5a5', x: 12, y: 18, size: 70 },
          { color: '#fdba74', x: 90, y: 12, size: 60 },
          { color: '#a5b4fc', x: 60, y: 95, size: 75 },
        ],
      },
      text: {
        font: 'Nunito', color: '#3b2f2f', titleSize: 5.9, titleWeight: 800,
        titleLetterSpacing: -1.5, subtitleSize: 3.2, subtitleWeight: 600,
        subtitleColor: '#7c6f6f', shadow: 0,
      },
      device: { shadow: 0.4 },
    },
    sequence: ['text-top', 'tilt-left', 'hero', 'tilt-right', 'duo'],
  },

  'neon-night': {
    name: 'Neon Night',
    hint: 'Dark neon mesh, uppercase headline. Games and entertainment.',
    defaults: {
      background: {
        type: 'mesh', base: '#12081f',
        blobs: [
          { color: '#7c3aed', x: 25, y: 20, size: 80 },
          { color: '#db2777', x: 85, y: 60, size: 70 },
          { color: '#2563eb', x: 10, y: 88, size: 65 },
        ],
      },
      text: {
        font: 'Space Grotesk', color: '#ffffff', titleSize: 5.2, titleWeight: 700,
        titleTransform: 'uppercase', titleLetterSpacing: 2, subtitleSize: 3.0,
        subtitleWeight: 400, shadow: 0.35,
      },
      device: { shadow: 0.7 },
    },
    sequence: ['tilt-right', 'trio', 'tilt-left', 'duo', 'peek-bottom'],
  },

  'full-immersive': {
    name: 'Full Immersive',
    hint: 'The screenshot fills the frame, copy floats on top. Video and photo apps.',
    defaults: {
      background: { type: 'screenshot', blur: 70, dim: 0.35, scale: 1.5 },
      text: {
        font: 'Outfit', color: '#ffffff', titleSize: 5.6, titleWeight: 700,
        titleLetterSpacing: -1.5, subtitleSize: 3.1, subtitleWeight: 400, shadow: 0.5,
      },
      device: { shadow: 0.5 },
    },
    sequence: ['full-bleed', 'text-top', 'full-bleed', 'text-bottom', 'hero'],
  },

  'story-duo': {
    name: 'Story Duo',
    hint: 'Multi-device heavy — for showing features side by side.',
    defaults: {
      background: { type: 'linear', angle: 160, stops: ['#0ea5e9', '#2563eb'] },
      text: {
        font: 'Poppins', color: '#ffffff', titleSize: 5.6, titleWeight: 700,
        titleLetterSpacing: -1.5, subtitleSize: 3.1, subtitleWeight: 400, shadow: 0.2,
      },
      device: { shadow: 0.55 },
    },
    sequence: ['hero', 'duo', 'trio', 'duo', 'banner-top'],
  },
};

// --- Poster packs ------------------------------------------------------------
// Frames with no device: the picture, a headline and whatever layers you stack.
// A poster frame takes the screenshot as its own background so it reads as a
// finished cover the moment the pack is applied — swap it for a photo by
// clicking the background.

Object.assign(SETS, {
  'poster-editorial': {
    name: 'Poster — Editorial',
    hint: 'Serif cover with no device, then clean device frames. Cream, ink and calm.',
    defaults: {
      background: { type: 'solid', color: '#efece7' },
      text: {
        font: 'Playfair Display', color: '#1c1917', titleSize: 6.4, titleWeight: 900,
        titleLineHeight: 1.05, titleLetterSpacing: -2, subtitleSize: 3.0,
        subtitleWeight: 400, subtitleColor: '#6b6560', shadow: 0,
      },
      device: { shadow: 0.32 },
    },
    sequence: ['poster', 'hero', 'text-top', 'hero', 'text-top'],
    frameStyle: {
      poster: {
        background: { type: 'screenshot', blur: 0, dim: 0.55, scale: 1.06 },
        text: { color: '#ffffff', subtitleColor: '#f2efe9', shadow: 0.55 },
      },
    },
    cover: true,
  },

  'poster-photo': {
    name: 'Poster — Photo',
    hint: 'Every frame a full-bleed poster, no devices at all. For photo and AI apps.',
    defaults: {
      background: { type: 'screenshot', blur: 0, dim: 0.55, scale: 1.06 },
      text: {
        font: 'Outfit', color: '#ffffff', titleSize: 6.0, titleWeight: 800,
        titleLetterSpacing: -1.8, subtitleSize: 3.1, subtitleWeight: 400, shadow: 0.6,
        // Bottom-anchored on purpose: an app screenshot has its own header at the
        // top, and a headline placed there collides with it.
        anchor: 'bottom', y: 9,
      },
      device: { hidden: true },
    },
    sequence: ['poster'],
    cover: true,
    cta: true,
  },
});

// --- Storyboard setleri ------------------------------------------------------
// Here the set is ONE composition sliced into ~10 frames: background shapes cut
// across frame edges, device size shifts from frame to frame, and some devices
// span two screenshots. The first frame becomes a cover, the last a CTA.

const storyText = (over = {}) => ({
  font: 'Inter', color: '#ffffff', titleSize: 4.6, titleWeight: 800,
  titleLetterSpacing: -1.5, subtitleSize: 2.5, subtitleWeight: 400,
  eyebrowSize: 1.9, eyebrowWeight: 700, eyebrowLetterSpacing: 12,
  // Copy sometimes lands on top of a coloured block; a light shadow keeps it
  // readable on either ground.
  gap: 1.6, shadow: 0.3, ...over,
});

Object.assign(SETS, {
  'story-blocks': {
    name: 'Storyboard — Blocks',
    hint: 'Lime blocks cut across frame edges on deep teal. The screens read as one strip.',
    story: true,
    defaults: {
      background: {
        type: 'solid', color: '#0e4a5e',
        // One colour + alt mode: panels flip side each frame and zigzag, so every
        // frame keeps both a dark area and a lime one.
        shapes: { kind: 'blocks', mode: 'alt', colors: ['#5f9e2b'], skew: 0.1, size: 0.56 },
      },
      text: storyText(),
      device: { shadow: 0.5 },
    },
    sequence: ['strip-blocks'],
    cover: true,
    cta: true,
  },

  'story-citrus': {
    name: 'Storyboard — Citrus',
    hint: 'Full-height yellow and teal panels, offset by half a frame.',
    story: true,
    defaults: {
      background: {
        type: 'solid', color: '#0e5563',
        shapes: { kind: 'blocks', mode: 'full', colors: ['#f0a92b', 'transparent'], skew: 0.06 },
      },
      text: storyText({ font: 'Poppins', titleWeight: 700 }),
      device: { shadow: 0.5 },
    },
    sequence: ['strip-blocks'],
    cover: true,
    cta: true,
  },

  'story-organic': {
    name: 'Storyboard — Organic',
    hint: 'Orange and dark blobs drift over blue; every third frame is cut by a spanning device.',
    story: true,
    defaults: {
      background: {
        type: 'solid', color: '#4a3fe0',
        shapes: { kind: 'blobs', colors: ['#e2724a', '#2b2b3a', '#5b51ef'], per: 1.6, size: 0.62, opacity: 0.95 },
      },
      text: storyText({ font: 'Plus Jakarta Sans' }),
      device: { shadow: 0.55 },
    },
    sequence: ['strip-cross'],
    cover: true,
    cta: true,
  },

  'story-wave': {
    name: 'Storyboard — Wave',
    hint: 'A single mustard wave crosses the whole set, spanning devices riding on it.',
    story: true,
    defaults: {
      background: {
        type: 'solid', color: '#0d0d12',
        shapes: { kind: 'waves', colors: ['#d9a13b', '#b8862c'], size: 0.17, baseline: 0.6 },
      },
      text: storyText({ font: 'Space Grotesk', titleWeight: 700 }),
      device: { shadow: 0.6 },
    },
    sequence: ['strip-cross'],
    cover: true,
    cta: true,
  },

  'story-berry': {
    name: 'Storyboard — Berry',
    hint: 'Crimson and purple panels; an even device row with all copy on top.',
    story: true,
    defaults: {
      background: {
        type: 'solid', color: '#a81f4a',
        shapes: { kind: 'blocks', mode: 'full', colors: ['#6b2d8f', 'transparent'], skew: 0.12, pitch: 1.3 },
      },
      text: storyText({ font: 'Manrope' }),
      device: { shadow: 0.5 },
    },
    sequence: ['strip-uniform'],
    cover: true,
    cta: true,
  },

  'story-circles': {
    name: 'Storyboard — Circles',
    hint: 'Large circles sitting behind the copy; a calm, even device row.',
    story: true,
    defaults: {
      background: {
        type: 'linear', angle: 160, stops: ['#2233c4', '#1a2596'],
        shapes: { kind: 'circles', colors: ['#6b2d6b', '#7e3a7e'], size: 0.46, every: 2, phase: 1 },
      },
      text: storyText({ font: 'DM Sans' }),
      device: { shadow: 0.5 },
    },
    sequence: ['strip-uniform'],
    cover: true,
    cta: true,
  },
});

export const SET_IDS = Object.keys(SETS);

/**
 * Apply a pack to a whole project: defaults are replaced and every frame gets
 * its template from the sequence. Per-frame look overrides are cleared so the
 * pack is what you actually see — text content is never touched.
 */
export function applySet(project, setId) {
  const set = SETS[setId];
  if (!set) throw new Error(`Unknown set "${setId}". Available: ${SET_IDS.join(', ')}`);

  // Rebuild from the library defaults, not the previous pack — otherwise a
  // value the old pack set (uppercase, a subtitle colour) survives the switch.
  project.defaults = {
    ...project.defaults,
    template: set.sequence[0],
    background: JSON.parse(JSON.stringify(set.defaults.background)),
    text: { ...DEFAULT_TEXT, ...set.defaults.text },
    device: { ...DEFAULT_DEVICE, ...set.defaults.device },
  };
  project.set = setId;

  const last = project.frames.length - 1;
  project.frames.forEach((f, i) => {
    f.template = set.sequence[i % set.sequence.length];
    delete f.background;
    delete f.text;
    delete f.device;

    // Some templates need their own treatment — a poster frame wants the picture
    // as its background, while the device frames keep the pack's flat colour.
    const fs = set.frameStyle && set.frameStyle[f.template];
    if (fs) {
      if (fs.background) f.background = JSON.parse(JSON.stringify(fs.background));
      if (fs.text) f.text = { ...fs.text };
      if (fs.device) f.device = { ...fs.device };
    }

    // Storyboard setleri ilk kareyi kapak, son kareyi CTA yapar.
    if (set.cover && i === 0) f.role = 'cover';
    else if (set.cta && i === last && last > 1) {
      f.role = 'cta';
      if (!f.cta) f.cta = 'Download free';
    } else delete f.role;
  });
  return project;
}
