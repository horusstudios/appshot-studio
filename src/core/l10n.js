// Localization helpers. A standalone module so render.js and project.js do not
// end up importing each other in a cycle.
//
// Only text and (optionally) the screenshot vary by language; template,
// background and device settings are shared across every language.

export const L10N_FIELDS = ['title', 'subtitle', 'eyebrow', 'cta', 'screenshot'];

export function baseLocale(project) {
  return (project && project.locales && project.locales[0]) || 'en';
}

/** Resolve a frame for a language; fields left empty fall back to the base. */
export function localizedFrame(frame, locale, base) {
  if (!locale || locale === base) return frame;
  const o = (frame.l10n && frame.l10n[locale]) || {};
  const out = { ...frame };
  for (const k of L10N_FIELDS) {
    if (o[k] !== undefined && o[k] !== null && o[k] !== '') out[k] = o[k];
  }
  return out;
}

export function getLocalized(frame, locale, base, field) {
  if (locale === base) return frame[field] ?? '';
  return (frame.l10n && frame.l10n[locale] && frame.l10n[locale][field]) ?? '';
}

export function setLocalized(frame, locale, base, field, value) {
  if (locale === base) {
    frame[field] = value;
    return frame;
  }
  frame.l10n = frame.l10n || {};
  frame.l10n[locale] = frame.l10n[locale] || {};
  frame.l10n[locale][field] = value;
  return frame;
}

// Common locale codes — offered as suggestions when adding a language.
export const COMMON_LOCALES = {
  en: 'English', tr: 'Türkçe', de: 'Deutsch', fr: 'Français', es: 'Español',
  it: 'Italiano', pt: 'Português', ru: 'Русский', ja: '日本語', ko: '한국어',
  'zh-Hans': '简体中文', ar: 'العربية', nl: 'Nederlands', pl: 'Polski',
  sv: 'Svenska', id: 'Bahasa Indonesia', hi: 'हिन्दी',
};

export const localeLabel = (code) => COMMON_LOCALES[code] || code;
