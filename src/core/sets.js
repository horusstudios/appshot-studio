// Style packs — a whole screenshot SET in one click.
//
// Bir pack; arkaplan, tipografi, cihaz ayarı ve kare kare hangi şablonun
// kullanılacağını birlikte tanımlar. `sequence` kare sayısından kısaysa
// başa dönüp devam eder, böylece set hiçbir zaman yarım kalmaz.
//
// Pack uygulandıktan sonra tek tek kareler yine değiştirilebilir.

import { DEFAULT_TEXT, DEFAULT_DEVICE } from './render.js';

export const SETS = {
  'bold-gradient': {
    name: 'Bold Gradient',
    hint: 'Canlı mor-pembe geçiş, kalın beyaz başlık. En güvenli çok amaçlı set.',
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
    hint: 'Beyaz zemin, koyu metin. Üretkenlik ve finans uygulamaları için.',
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
    hint: 'Tüm set tek bir geniş görsel gibi akar — komşu ekranlar kenardan görünür.',
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
    hint: 'Eğik cihazlardan kesintisiz şerit. Oyun ve sosyal uygulamalarda çok iyi durur.',
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
    hint: 'Siyah zemin, ince nokta deseni, çerçevesiz görsel. Araç ve geliştirici uygulamaları.',
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
    hint: 'Krem zemin, serif başlık. Okuma, sağlık ve içerik uygulamaları için.',
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
    hint: 'Yumuşak pastel mesh, yuvarlak font. Çocuk, sağlık ve alışkanlık uygulamaları.',
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
    hint: 'Koyu neon mesh, büyük harf başlık. Oyun ve eğlence.',
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
    hint: 'Ekran görüntüsü tüm kareyi kaplar, metin üstte yüzer. Video ve foto uygulamaları.',
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
    hint: 'Çoklu cihaz ağırlıklı — özellikleri yan yana anlatmak için.',
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

  project.frames.forEach((f, i) => {
    f.template = set.sequence[i % set.sequence.length];
    delete f.background;
    delete f.text;
    delete f.device;
  });
  return project;
}
