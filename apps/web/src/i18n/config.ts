/**
 * Shared i18n constants for the cookie-based locale setup.
 *
 * Applo uses next-intl WITHOUT i18n routing: there are no /en URL
 * prefixes. The active locale is stored in the NEXT_LOCALE cookie and
 * falls back to the Accept-Language header, then to German (the
 * product's home market default).
 */

export const locales = ['de', 'en'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'de';

/** Cookie that persists the user's UI language choice (1 year). */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

/**
 * Pick the best supported locale from an Accept-Language header.
 * Minimal prefix matcher — quality values are respected implicitly
 * because browsers order entries by preference.
 */
export function pickLocaleFromAcceptLanguage(header: string | null): Locale | undefined {
  if (!header) return undefined;
  for (const part of header.split(',')) {
    const lang = part.split(';')[0]?.trim().toLowerCase();
    if (!lang) continue;
    const prefix = lang.slice(0, 2);
    if (isLocale(prefix)) return prefix;
  }
  return undefined;
}

/** BCP-47 tag for Intl.* APIs (dates, numbers). */
export function toIntlLocale(locale: Locale): 'de-DE' | 'en-US' {
  return locale === 'de' ? 'de-DE' : 'en-US';
}
