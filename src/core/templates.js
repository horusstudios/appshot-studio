// Layout templates.
//
// Every number is resolution independent:
//   x / w      -> percent of canvas WIDTH
//   y          -> percent of canvas HEIGHT (from top, or from bottom when anchor='bottom')
//   rotate     -> degrees
// A template may carry a `tablet` block that is merged on top of the base
// values when the target device is a tablet.

export const TEMPLATES = {
  'text-top': {
    name: 'Text Top',
    hint: 'Classic — headline on top, device below bleeding off the bottom.',
    text: { y: 6, height: 24, align: 'center', width: 84, anchor: 'top' },
    devices: [{ w: 76, y: 32, x: 0, rotate: 0 }],
    tablet: { devices: [{ w: 72, y: 34, x: 0, rotate: 0 }] },
  },

  'text-bottom': {
    name: 'Text Bottom',
    hint: 'Device bleeds in from the top, copy sits at the bottom.',
    text: { y: 6, height: 24, align: 'center', width: 84, anchor: 'bottom' },
    devices: [{ w: 86, y: -6, x: 0, rotate: 0 }],
    tablet: { devices: [{ w: 80, y: -5, x: 0, rotate: 0 }] },
  },

  hero: {
    name: 'Hero (full device)',
    hint: 'Whole device visible and centered. Safest for App Review.',
    text: { y: 5, height: 20, align: 'center', width: 86, anchor: 'top' },
    devices: [{ w: 62, y: 27, x: 0, rotate: 0 }],
    tablet: { devices: [{ w: 66, y: 28, x: 0, rotate: 0 }] },
  },

  'tilt-right': {
    name: 'Tilt Right',
    hint: 'Device angled clockwise — adds motion to feature shots.',
    text: { y: 6, height: 23, align: 'center', width: 84, anchor: 'top' },
    devices: [{ w: 74, y: 33, x: 4, rotate: 8 }],
    tablet: { devices: [{ w: 70, y: 34, x: 4, rotate: 6 }] },
  },

  'tilt-left': {
    name: 'Tilt Left',
    hint: 'Mirror of Tilt Right — alternate them across the set.',
    text: { y: 6, height: 23, align: 'center', width: 84, anchor: 'top' },
    devices: [{ w: 74, y: 33, x: -4, rotate: -8 }],
    tablet: { devices: [{ w: 70, y: 34, x: -4, rotate: -6 }] },
  },

  duo: {
    name: 'Duo (two devices)',
    hint: 'Two overlapping devices — great for before/after or two features.',
    text: { y: 6, height: 22, align: 'center', width: 86, anchor: 'top' },
    devices: [
      { w: 58, y: 36, x: -21, rotate: -7, z: 1 },
      { w: 58, y: 31, x: 21, rotate: 7, z: 2 },
    ],
    tablet: {
      devices: [
        { w: 54, y: 36, x: -19, rotate: -5, z: 1 },
        { w: 54, y: 32, x: 19, rotate: 5, z: 2 },
      ],
    },
  },

  trio: {
    name: 'Trio (fanned)',
    hint: 'Three devices fanned out — good for the first or last slide.',
    text: { y: 5, height: 20, align: 'center', width: 88, anchor: 'top' },
    devices: [
      { w: 46, y: 40, x: -28, rotate: -12, z: 1 },
      { w: 52, y: 32, x: 0, rotate: 0, z: 3 },
      { w: 46, y: 40, x: 28, rotate: 12, z: 2 },
    ],
  },

  'full-bleed': {
    name: 'Full Bleed',
    hint: 'Screenshot fills the whole canvas, text floats on a scrim.',
    text: { y: 5, height: 22, align: 'center', width: 86, anchor: 'top' },
    devices: [{ w: 100, y: 0, x: 0, rotate: 0, bleed: true, frame: 'none', radius: 0 }],
    scrim: { from: 'top', size: 42, opacity: 0.55 },
  },

  frameless: {
    name: 'Frameless',
    hint: 'No bezel — just the rounded screenshot with a soft shadow.',
    text: { y: 6, height: 23, align: 'center', width: 84, anchor: 'top' },
    devices: [{ w: 70, y: 33, x: 0, rotate: 0, frame: 'none' }],
    tablet: { devices: [{ w: 68, y: 34, x: 0, rotate: 0, frame: 'none' }] },
  },

  'split-left': {
    name: 'Split — text left',
    hint: 'Copy on the left, device on the right. Best on tablets.',
    text: { y: 26, height: 32, align: 'left', width: 44, anchor: 'top', x: -25 },
    devices: [{ w: 58, y: 30, x: 26, rotate: -4 }],
    tablet: {
      text: { y: 34, height: 32, align: 'left', width: 40, anchor: 'top', x: -27 },
      devices: [{ w: 52, y: 24, x: 25, rotate: 0 }],
    },
  },

  'split-right': {
    name: 'Split — text right',
    hint: 'Device on the left, copy on the right.',
    text: { y: 26, height: 32, align: 'right', width: 44, anchor: 'top', x: 25 },
    devices: [{ w: 58, y: 30, x: -26, rotate: 4 }],
    tablet: {
      text: { y: 34, height: 32, align: 'right', width: 40, anchor: 'top', x: 27 },
      devices: [{ w: 52, y: 24, x: -25, rotate: 0 }],
    },
  },

  'banner-top': {
    name: 'Banner',
    hint: 'Headline inside a rounded card — high contrast on busy backgrounds.',
    text: {
      y: 5,
      height: 22,
      align: 'center',
      width: 84,
      anchor: 'top',
      card: { color: '#ffffff', opacity: 0.12, radius: 6, padX: 5, padY: 4, blur: 20 },
    },
    devices: [{ w: 74, y: 34, x: 0, rotate: 0 }],
  },

  corner: {
    name: 'Corner',
    hint: 'Oversized device pushed into the corner, copy top-left.',
    text: { y: 7, height: 26, align: 'left', width: 66, anchor: 'top', x: -15 },
    devices: [{ w: 74, y: 36, x: 16, rotate: 11 }],
  },

  // --- continuous: the set reads as ONE wide artwork sliced into screenshots ---
  'pano-flow': {
    name: 'Panorama — flow',
    hint: 'Arkaplan tüm set boyunca akar; komşu ekranların cihazları kenardan görünür.',
    continuous: 'full',
    text: { y: 6, height: 22, align: 'center', width: 84, anchor: 'top' },
    devices: [{ w: 96, y: 36, x: 0, rotate: 0 }],
    tablet: { devices: [{ w: 92, y: 37, x: 0, rotate: 0 }] },
  },

  'pano-tilt': {
    name: 'Panorama — tilt',
    hint: 'Eğik cihazlardan oluşan kesintisiz şerit. Set halinde çok güçlü durur.',
    continuous: 'full',
    text: { y: 6, height: 22, align: 'center', width: 84, anchor: 'top' },
    devices: [{ w: 106, y: 38, x: 0, rotate: -7 }],
    tablet: { devices: [{ w: 100, y: 38, x: 0, rotate: -5 }] },
  },

  'pano-hero': {
    name: 'Panorama — sadece arkaplan',
    hint: 'Cihazlar bağımsız, sadece arkaplan tüm set boyunca devam eder.',
    continuous: 'background',
    text: { y: 6, height: 22, align: 'center', width: 86, anchor: 'top' },
    devices: [{ w: 66, y: 30, x: 0, rotate: 0 }],
    tablet: { devices: [{ w: 68, y: 30, x: 0, rotate: 0 }] },
  },

  // --- storyboard strips: set 10 kareye yayılmış TEK kompozisyondur -----------
  'strip-blocks': {
    name: 'Şerit — bloklar',
    hint: 'Renk blokları kare sınırlarını keser, cihaz boyları ritim halinde değişir.',
    continuous: 'full',
    text: { y: 6, height: 20, align: 'center', width: 82, anchor: 'top' },
    devices: [{ w: 68, y: 30, x: 0, rotate: 0 }],
    variants: [
      { w: 68, y: 30 },
      { w: 58, y: 17 },
      { w: 72, y: 34 },
      { w: 56, y: 15 },
      { w: 64, y: 27 },
    ],
    textVariants: [
      { anchor: 'top', y: 6 },
      { anchor: 'bottom', y: 8 },
      { anchor: 'top', y: 6 },
      { anchor: 'bottom', y: 8 },
      { anchor: 'top', y: 6 },
    ],
    cover: {
      device: { w: 56, y: 46 },
      text: { y: 8, width: 80 },
      style: { titleSize: 7.4, subtitleSize: 2.9, gap: 1.9 },
    },
    cta: {
      text: { y: 34, width: 76, anchor: 'top', align: 'center' },
      style: { titleSize: 6.8, subtitleSize: 3.0, gap: 2.2 },
    },
    tablet: { variants: [{ w: 64, y: 28 }, { w: 56, y: 18 }, { w: 68, y: 31 }, { w: 54, y: 16 }, { w: 62, y: 25 }] },
  },

  'strip-cross': {
    name: 'Şerit — taşan cihaz',
    hint: 'Her üçüncü kare, iki ekrana birden yayılan büyük bir cihazla kesilir.',
    continuous: 'full',
    text: { y: 6, height: 20, align: 'center', width: 82, anchor: 'top' },
    devices: [{ w: 62, y: 26, x: 0, rotate: 0 }],
    variants: [
      { w: 62, y: 26, z: 2 },
      { w: 62, y: 20, z: 2 },
      { w: 106, y: 30, z: 0 },
      { w: 62, y: 22, z: 2 },
      { w: 62, y: 28, z: 2 },
      { w: 104, y: 24, z: 0 },
    ],
    // Bu şablonda her cihaz ekranın üst üçte birinden başlayıp aşağı taşıyor;
    // alta düşen metin beyaz ekran görüntüsünün üstünde kayboluyordu.
    textVariants: [{ anchor: 'top', y: 6 }],
    cover: {
      device: { w: 58, y: 44 },
      text: { y: 8, width: 80 },
      style: { titleSize: 7.4, subtitleSize: 2.9, gap: 1.9 },
    },
    cta: {
      text: { y: 34, width: 76, anchor: 'top', align: 'center' },
      style: { titleSize: 6.8, subtitleSize: 3.0, gap: 2.2 },
    },
  },

  'strip-uniform': {
    name: 'Şerit — düzenli',
    hint: 'Eşit cihaz sırası, tüm metinler üstte. Arkaplan blokları akmaya devam eder.',
    continuous: 'full',
    text: { y: 6, height: 18, align: 'center', width: 84, anchor: 'top' },
    devices: [{ w: 66, y: 28, x: 0, rotate: 0 }],
    variants: [{ w: 66, y: 28 }],
    cover: {
      device: { w: 58, y: 44 },
      text: { y: 8, width: 80 },
      style: { titleSize: 7.4, subtitleSize: 2.9, gap: 1.9 },
    },
    cta: {
      text: { y: 34, width: 76, anchor: 'top', align: 'center' },
      style: { titleSize: 6.8, subtitleSize: 3.0, gap: 2.2 },
    },
  },

  'peek-bottom': {
    name: 'Peek',
    hint: 'Only the top third of the device shows — very editorial.',
    text: { y: 9, height: 30, align: 'center', width: 82, anchor: 'top' },
    devices: [{ w: 82, y: 52, x: 0, rotate: 0 }],
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES);

export function getTemplate(id, deviceKind = 'phone') {
  const t = TEMPLATES[id];
  if (!t) {
    throw new Error(
      `Unknown template "${id}". Available: ${TEMPLATE_IDS.join(', ')}`
    );
  }
  const base = {
    name: t.name,
    hint: t.hint,
    text: { x: 0, ...t.text },
    devices: t.devices.map((d) => ({ x: 0, rotate: 0, z: 1, ...d })),
    scrim: t.scrim || null,
    continuous: t.continuous || null,
    variants: t.variants || null,
    textVariants: t.textVariants || null,
    cover: t.cover || null,
    cta: t.cta || null,
  };
  if (deviceKind === 'tablet' && t.tablet) {
    if (t.tablet.text) base.text = { ...base.text, ...t.tablet.text };
    if (t.tablet.devices) {
      base.devices = t.tablet.devices.map((d) => ({ x: 0, rotate: 0, z: 1, ...d }));
    }
    if (t.tablet.variants) base.variants = t.tablet.variants;
  }
  return base;
}

/**
 * Bir karenin cihaz yerleşimi: temel şablon + o karenin ritim varyantı + rolü.
 * Ritim sayesinde set boyunca cihaz boyu/yüksekliği değişir, bazıları kareyi
 * aşıp komşuya taşar.
 */
export function deviceSpecFor(tpl, frameIndex, role) {
  let spec = { ...tpl.devices[0] };
  if (tpl.variants && tpl.variants.length) {
    spec = { ...spec, ...tpl.variants[frameIndex % tpl.variants.length] };
  }
  if (role === 'cover' && tpl.cover && tpl.cover.device) spec = { ...spec, ...tpl.cover.device };
  return spec;
}

export function textSpecFor(tpl, frameIndex, role) {
  let spec = { ...tpl.text };
  if (tpl.textVariants && tpl.textVariants.length) {
    spec = { ...spec, ...tpl.textVariants[frameIndex % tpl.textVariants.length] };
  }
  if (role === 'cover' && tpl.cover && tpl.cover.text) spec = { ...spec, ...tpl.cover.text };
  if (role === 'cta' && tpl.cta && tpl.cta.text) spec = { ...spec, ...tpl.cta.text };
  return spec;
}
