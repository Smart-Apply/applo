import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  pickLocaleFromAcceptLanguage,
  type Locale,
} from './config';
import { messagesFor } from './messages';

/**
 * Per-request i18n config (next-intl "without i18n routing" setup).
 *
 * Resolution order:
 *   1. An explicit locale passed to an awaitable API — `getTranslations({locale})`.
 *      The SEO pages use this so a page can render a language other than the
 *      viewer's own (e.g. building all six hreflang titles in one request).
 *   2. The `/{locale}` URL prefix, forwarded by the middleware as a header.
 *      Only the `app/(seo)` route group has prefixed URLs; for those the URL
 *      is authoritative, because a search engine (or anyone following a
 *      hreflang link) must get the language the URL promises — not whatever
 *      the visitor's cookie happens to say.
 *   3. The NEXT_LOCALE cookie — the user's explicit choice, used by the app.
 *   4. The Accept-Language header.
 *   5. German, the home-market default.
 */
export default getRequestConfig(async ({ locale: explicitLocale }) => {
  if (isLocale(explicitLocale)) {
    return { locale: explicitLocale, messages: messagesFor(explicitLocale) };
  }

  const headerStore = await headers();
  const pathLocale = headerStore.get(LOCALE_HEADER);
  if (isLocale(pathLocale)) {
    return { locale: pathLocale, messages: messagesFor(pathLocale) };
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale: Locale | undefined = isLocale(cookieValue) ? cookieValue : undefined;

  if (!locale) {
    locale = pickLocaleFromAcceptLanguage(headerStore.get('accept-language')) ?? defaultLocale;
  }

  return {
    locale,
    messages: messagesFor(locale),
  };
});
