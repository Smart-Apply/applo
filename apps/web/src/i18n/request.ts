import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  pickLocaleFromAcceptLanguage,
  type Locale,
} from './config';
import { messagesFor } from './messages';

/**
 * Per-request i18n config (next-intl "without i18n routing" setup).
 * Resolution order: NEXT_LOCALE cookie → Accept-Language header → de.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale: Locale | undefined = isLocale(cookieValue) ? cookieValue : undefined;

  if (!locale) {
    const acceptLanguage = (await headers()).get('accept-language');
    locale = pickLocaleFromAcceptLanguage(acceptLanguage) ?? defaultLocale;
  }

  return {
    locale,
    messages: messagesFor(locale),
  };
});
