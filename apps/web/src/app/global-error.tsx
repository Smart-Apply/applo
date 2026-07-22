'use client';

import NextError from 'next/error';
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
 * Sentry was removed from the frontend (see next.config.ts). If you re-enable
 * it, restore the `Sentry.captureException(error)` call inside a useEffect.
 */
export default function GlobalError(_: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang={getActiveLocale()}>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
