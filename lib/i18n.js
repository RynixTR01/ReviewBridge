export const DEFAULT_LOCALE = "tr";
export const LOCALE_COOKIE = "reviewbridge_locale";

export function normalizeLocale(value) {
  return value === "en" ? "en" : DEFAULT_LOCALE;
}

export function t(locale, turkish, english) {
  return locale === "en" ? english : turkish;
}
