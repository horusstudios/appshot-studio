// Device presets. Sizes are the exact pixel dimensions the stores accept.
// `frame` selects the bezel style drawn in CSS (no external image assets needed).

export const DEVICES = {
  'iphone-6.9': {
    label: 'iPhone 6.9" (16/15 Pro Max)',
    store: 'ios',
    kind: 'phone',
    frame: 'iphone-island',
    width: 1290,
    height: 2796,
    screen: [1290, 2796],
    required: true,
  },
  'iphone-6.5': {
    label: 'iPhone 6.5" (11 Pro Max / XS Max)',
    store: 'ios',
    kind: 'phone',
    frame: 'iphone-notch',
    width: 1242,
    height: 2688,
    screen: [1242, 2688],
  },
  'iphone-5.5': {
    label: 'iPhone 5.5" (8 Plus)',
    store: 'ios',
    kind: 'phone',
    frame: 'iphone-classic',
    width: 1242,
    height: 2208,
    screen: [1242, 2208],
  },
  'ipad-13': {
    label: 'iPad 13" (M4 Pro)',
    store: 'ios',
    kind: 'tablet',
    frame: 'ipad',
    width: 2064,
    height: 2752,
    screen: [2064, 2752],
    required: true,
  },
  'ipad-12.9': {
    label: 'iPad 12.9" (Pro gen 2-6)',
    store: 'ios',
    kind: 'tablet',
    frame: 'ipad',
    width: 2048,
    height: 2732,
    screen: [2048, 2732],
  },
  'android-phone': {
    label: 'Google Play — Phone',
    store: 'android',
    kind: 'phone',
    frame: 'android',
    width: 1080,
    height: 1920,
    screen: [1080, 2400],
  },
  'android-tablet-7': {
    label: 'Google Play — 7" Tablet',
    store: 'android',
    kind: 'tablet',
    frame: 'android-tablet',
    width: 1206,
    height: 2144,
    screen: [1206, 2144],
  },
  'android-tablet-10': {
    label: 'Google Play — 10" Tablet',
    store: 'android',
    kind: 'tablet',
    frame: 'android-tablet',
    width: 1600,
    height: 2560,
    screen: [1600, 2560],
  },
};

export const DEVICE_IDS = Object.keys(DEVICES);

// Bezel geometry, all values are a fraction of the *device body width*
// except heights marked `H` which are a fraction of the device body height.
export const FRAME_STYLES = {
  none: { pad: 0, radius: 0.055, band: null, camera: null, border: 0 },
  'iphone-island': {
    pad: 0.031,
    radius: 0.135,
    border: 0.006,
    band: { w: 0.3, hH: 0.0125, topH: 0.016, radius: 999 },
    homebar: { w: 0.36, hH: 0.0042, bottomH: 0.009 },
  },
  'iphone-notch': {
    pad: 0.031,
    radius: 0.135,
    border: 0.006,
    notch: { w: 0.52, hH: 0.031 },
    homebar: { w: 0.36, hH: 0.0042, bottomH: 0.009 },
  },
  'iphone-classic': {
    pad: 0.035,
    radius: 0.085,
    border: 0.005,
    chinH: 0.075,
    foreheadH: 0.062,
    camera: { d: 0.028 },
  },
  ipad: {
    pad: 0.026,
    radius: 0.055,
    border: 0.005,
    camera: { d: 0.016 },
    homebar: { w: 0.24, hH: 0.0035, bottomH: 0.007 },
  },
  android: {
    pad: 0.028,
    radius: 0.105,
    border: 0.005,
    punch: { d: 0.055, topH: 0.014 },
  },
  'android-tablet': {
    pad: 0.026,
    radius: 0.045,
    border: 0.005,
    punch: { d: 0.03, topH: 0.012 },
  },
};

export function getDevice(id) {
  const d = DEVICES[id];
  if (!d) {
    throw new Error(
      `Unknown device "${id}". Available: ${DEVICE_IDS.join(', ')}`
    );
  }
  return { id, ...d };
}

export function deviceSize(id, orientation = 'portrait') {
  const d = getDevice(id);
  return orientation === 'landscape'
    ? { width: d.height, height: d.width }
    : { width: d.width, height: d.height };
}
