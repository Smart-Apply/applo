/**
 * Locale access for NON-React modules (api-client, error-messages, Zod
 * schemas, toast helpers, date formatting). React components should use
 * next-intl's useTranslations()/useLocale() instead.
 *
 * A module-level variable holds the active locale. It is set:
 *  - during render by <LocaleRuntimeSync> (before children render), and
 *  - kept in sync on locale switches.
 *
 * Caveat: on the server this module state is shared per runtime instance,
 * so under concurrent SSR of requests with different locales a
 * locale-dependent helper could briefly read the other request's locale.
 * All current call sites are client-side event handlers (form validation,
 * API errors, toasts) or render-time date formatting where a mismatch is
 * corrected on hydration — acceptable for now. Helpers accept an explicit
 * locale parameter for call sites that need to be exact.
 */

import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  toIntlLocale,
  type Locale,
} from '@/i18n/config';

let activeLocale: Locale = defaultLocale;

export function setActiveLocale(locale: Locale): void {
  activeLocale = locale;
}

export function getActiveLocale(): Locale {
  // In the browser the cookie is authoritative — covers code paths that
  // run before <LocaleRuntimeSync> mounts (e.g. module init in providers).
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    const fromCookie = match?.[1];
    if (isLocale(fromCookie)) return fromCookie;
  }
  return activeLocale;
}

/** BCP-47 tag for Intl.* APIs based on the active locale. */
export function getIntlLocale(): 'de-DE' | 'en-US' {
  return toIntlLocale(getActiveLocale());
}

/**
 * Persist a locale choice in the NEXT_LOCALE cookie (client-side).
 * Callers should follow up with router.refresh() so server components
 * re-render in the new language.
 */
export function setLocaleCookie(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
  setActiveLocale(locale);
}

/**
 * Tiny lookup helper for the small bilingual dictionaries kept in
 * non-React modules (error messages, validation messages, enum labels).
 * These dictionaries live in code — NOT in messages/*.json — so the
 * client bundle only carries the few strings those modules need instead
 * of both full message trees.
 */
export function pick<T>(dict: Record<Locale, T>, locale?: Locale): T {
  return dict[locale ?? getActiveLocale()];
}
