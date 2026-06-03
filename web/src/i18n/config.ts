// SPDX-License-Identifier: MIT
//
// Shared i18n constants. Kept dependency-free so it can be imported from the
// provider, the catalogs, and plain helper modules alike.

export const LOCALES = ['de', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * Default app language. English is the international-friendly default; the
 * provider only switches to German when localStorage or the browser asks for
 * it (see resolveInitialLocale).
 */
export const DEFAULT_LOCALE: Locale = 'en';

/** localStorage key holding the user's explicit language choice. */
export const LOCALE_STORAGE_KEY = 'athletly.locale';

/** Intl locale tags used for date/number formatting per app locale. */
export const INTL_LOCALE: Record<Locale, string> = {
  de: 'de-DE',
  en: 'en-US',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
