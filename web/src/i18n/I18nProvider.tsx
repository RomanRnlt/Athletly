'use client';
// SPDX-License-Identifier: MIT
//
// Lightweight client-side i18n. NO locale-based URL routing: the active
// language lives in a React context (and localStorage), entirely outside auth,
// so it works identically in demo mode (which bypasses auth) and in the real
// app.
//
// Resolution order on first load:
//   1. localStorage override (explicit user choice) ->
//   2. navigator.language starting with 'de' -> German ->
//   3. otherwise English (DEFAULT_LOCALE; international-friendly).
//
// A manual switch persists to localStorage and updates <html lang>.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LOCALE,
  INTL_LOCALE,
  isLocale,
  LOCALE_STORAGE_KEY,
  type Locale,
} from './config';
import { de, type MessageKey } from './messages/de';
import { en } from './messages/en';

const CATALOGS: Record<Locale, Record<MessageKey, string>> = { de, en };

export type TranslateValues = Record<string, string | number>;
export type TranslateFn = (key: MessageKey, values?: TranslateValues) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
  /** Intl locale tag (e.g. 'de-DE') for date/number formatting. */
  intlLocale: string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** Pure resolver, reused by the provider's lazy initial state. */
export function resolveInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // localStorage may be unavailable (private mode / SSR mismatch); ignore.
  }
  const nav = window.navigator?.language?.toLowerCase() ?? '';
  if (nav.startsWith('de')) return 'de';
  return DEFAULT_LOCALE;
}

function interpolate(template: string, values?: TranslateValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Start from DEFAULT_LOCALE so server and first client render agree (avoids a
  // hydration mismatch); the real locale is applied in a layout effect.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Resolve the actual locale on mount (client only).
  useEffect(() => {
    const resolved = resolveInitialLocale();
    setLocaleState(resolved);
  }, []);

  // Keep <html lang> in sync with the active locale.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Persisting is best-effort; the in-memory choice still applies.
    }
  }, []);

  const t = useCallback<TranslateFn>(
    (key, values) => {
      const catalog = CATALOGS[locale];
      const template = catalog[key] ?? CATALOGS[DEFAULT_LOCALE][key] ?? key;
      return interpolate(template, values);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, intlLocale: INTL_LOCALE[locale] }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}

/** Convenience hook returning just the translate function. */
export function useT(): TranslateFn {
  return useI18n().t;
}
