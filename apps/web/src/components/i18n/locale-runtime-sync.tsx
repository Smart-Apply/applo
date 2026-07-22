'use client';

import { useEffect } from 'react';
import { setActiveLocale } from '@/lib/i18n-runtime';
import type { Locale } from '@/i18n/config';

/**
 * Bridges the server-resolved locale into the module-level runtime used
 * by non-React modules (error messages, Zod schemas, date formatting).
 *
 * Rendered as the first child of NextIntlClientProvider so the runtime
 * locale is set before sibling components render (both during SSR and on
 * the client).
 */
export function LocaleRuntimeSync({ locale }: { locale: Locale }) {
  // Intentional render-time assignment (idempotent): effects run only on
  // the client and only after children rendered, which would be too late
  // for locale-dependent formatting during SSR/first render.
  setActiveLocale(locale);

  useEffect(() => {
    setActiveLocale(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
