// SPDX-License-Identifier: MIT
//
// Locale-aware date/time formatting. Centralizes the month/weekday names and
// Intl formatting that used to be hardcoded to German across the screens. All
// functions take an Intl locale tag (e.g. 'de-DE' / 'en-US') from useI18n().

/** Full month name for a 0-based month index in the given locale. */
export function monthName(intlLocale: string, monthIndex: number): string {
  const d = new Date(2020, monthIndex, 1);
  return d.toLocaleDateString(intlLocale, { month: 'long' });
}

/** Short (3-letter-ish) month name for a 0-based month index. */
export function monthNameShort(intlLocale: string, monthIndex: number): string {
  const d = new Date(2020, monthIndex, 1);
  return d.toLocaleDateString(intlLocale, { month: 'short' });
}

/** Full weekday name for a 0-based day index (0 = Sunday). */
export function weekdayName(intlLocale: string, dayIndex: number): string {
  // 2024-01-07 is a Sunday; add dayIndex days to land on the target weekday.
  const d = new Date(2024, 0, 7 + dayIndex);
  return d.toLocaleDateString(intlLocale, { weekday: 'long' });
}

/** Short weekday name (e.g. 'Mon' / 'Mo') for a 0-based day index (0 = Sunday). */
export function weekdayNameShort(intlLocale: string, dayIndex: number): string {
  const d = new Date(2024, 0, 7 + dayIndex);
  return d.toLocaleDateString(intlLocale, { weekday: 'short' });
}

export function formatDate(
  intlLocale: string,
  date: Date,
  opts: Intl.DateTimeFormatOptions,
): string {
  return date.toLocaleDateString(intlLocale, opts);
}

export function formatNumber(intlLocale: string, value: number): string {
  return value.toLocaleString(intlLocale);
}
