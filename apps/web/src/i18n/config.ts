/**
 * Shared i18n constants for the cookie-based locale setup.
 *
 * Applo uses next-intl WITHOUT i18n routing: the *app* has no /en URL
 * prefixes. The active locale is stored in the NEXT_LOCALE cookie and
 * falls back to the Accept-Language header, then to German (the
 * product's home market default).
 *
 * The one exception is the public SEO route group (`app/(seo)`), whose
 * URLs DO carry a `/{locale}` prefix — search engines need one indexable
 * URL per language. For those paths the middleware extracts the prefix and
 * forwards it as `LOCALE_HEADER`, which `request.ts` prefers over the
 * cookie. See `src/lib/seo/urls.ts`.
 */

export const locales = ['de', 'en', 'fr', 'es', 'pt', 'it'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'de';

/** Cookie that persists the user's UI language choice (1 year). */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Request header the middleware sets when the pathname starts with a
 * supported locale segment. Read by `src/i18n/request.ts`.
 *
 * Request headers can be spoofed by clients, but the only thing this one
 * can do is pick one of six UI languages — it never grants access or
 * changes data, and `isLocale()` rejects anything outside the allow-list.
 */
export const LOCALE_HEADER = 'x-applo-locale';

/**
 * Extract the locale from a URL pathname like `/en/cover-letter/nurse`.
 * Returns `undefined` for every non-prefixed path (the entire app outside
 * the SEO route group), which keeps those on the cookie-based resolution.
 */
export function localeFromPathname(pathname: string): Locale | undefined {
  const segment = pathname.split('/')[1];
  return isLocale(segment) ? segment : undefined;
}

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
export type IntlLocale = 'de-DE' | 'en-US' | 'fr-FR' | 'es-ES' | 'pt-PT' | 'it-IT';

const INTL_LOCALES: Record<Locale, IntlLocale> = {
  de: 'de-DE',
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
  pt: 'pt-PT',
  it: 'it-IT',
};

export function toIntlLocale(locale: Locale): IntlLocale {
  return INTL_LOCALES[locale];
}
