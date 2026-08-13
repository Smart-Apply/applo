'use client';

import { useEffect } from 'react';
import NextError from 'next/error';
import * as Sentry from '@sentry/nextjs';
import { getActiveLocale } from '@/lib/i18n-runtime';

/**
 * Next.js App Router global error boundary.
 * Catches errors that escape every other boundary (errors in the root layout,
 * top-level providers, etc.) and renders a minimal fallback page.
 *
 * Renders OUTSIDE NextIntlClientProvider (it replaces the root layout), so
 * the locale is read from the cookie via the client runtime instead of
 * next-intl hooks.
 *
 * This boundary is the only place React render crashes are reported from —
 * they are not captured automatically.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang={getActiveLocale()}>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
