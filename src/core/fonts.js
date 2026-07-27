// Curated font list. Google fonts are pulled in by the renderer page;
// `system` needs no network and is the offline-safe default.
//
// Stacks use SINGLE quotes only — they are inlined into style="..." attributes.

const FALLBACK = `-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif`;
const SERIF_FALLBACK = `Georgia, 'Times New Roman', serif`;

export const FONTS = {
  system: {
    label: 'System (SF / Helvetica)',
    stack: FALLBACK,
    google: null,
  },
  Inter: { label: 'Inter', stack: `'Inter', ${FALLBACK}`, google: 'Inter:wght@300;400;500;600;700;800;900' },
  Poppins: { label: 'Poppins', stack: `'Poppins', ${FALLBACK}`, google: 'Poppins:wght@300;400;500;600;700;800' },
  Montserrat: { label: 'Montserrat', stack: `'Montserrat', ${FALLBACK}`, google: 'Montserrat:wght@300;400;500;600;700;800;900' },
  'DM Sans': { label: 'DM Sans', stack: `'DM Sans', ${FALLBACK}`, google: 'DM+Sans:wght@400;500;700;900' },
  'Space Grotesk': { label: 'Space Grotesk', stack: `'Space Grotesk', ${FALLBACK}`, google: 'Space+Grotesk:wght@400;500;600;700' },
  Nunito: { label: 'Nunito', stack: `'Nunito', ${FALLBACK}`, google: 'Nunito:wght@400;600;700;800;900' },
  Rubik: { label: 'Rubik', stack: `'Rubik', ${FALLBACK}`, google: 'Rubik:wght@400;500;600;700;800;900' },
  Manrope: { label: 'Manrope', stack: `'Manrope', ${FALLBACK}`, google: 'Manrope:wght@400;500;600;700;800' },
  'Plus Jakarta Sans': { label: 'Plus Jakarta Sans', stack: `'Plus Jakarta Sans', ${FALLBACK}`, google: 'Plus+Jakarta+Sans:wght@400;500;600;700;800' },
  Outfit: { label: 'Outfit', stack: `'Outfit', ${FALLBACK}`, google: 'Outfit:wght@300;400;500;600;700;800;900' },
  'Bebas Neue': { label: 'Bebas Neue (display)', stack: `'Bebas Neue', ${FALLBACK}`, google: 'Bebas+Neue' },
  'Playfair Display': { label: 'Playfair Display (serif)', stack: `'Playfair Display', ${SERIF_FALLBACK}`, google: 'Playfair+Display:wght@400;500;600;700;800;900' },
  Lora: { label: 'Lora (serif)', stack: `'Lora', ${SERIF_FALLBACK}`, google: 'Lora:wght@400;500;600;700' },
};

export const FONT_IDS = Object.keys(FONTS);

export function fontStack(id) {
  return (FONTS[id] || FONTS.system).stack;
}

// The css2 endpoint requires families in alphabetical order.
export function googleFontsHref() {
  const families = Object.values(FONTS)
    .filter((f) => f.google)
    .map((f) => f.google)
    .sort((a, b) => a.localeCompare(b))
    .map((g) => `family=${g}`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=block`;
}
