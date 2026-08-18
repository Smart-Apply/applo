import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CancellationClient } from './cancellation-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('subscription.cancellation');
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    // Not a page we want ranking; it exists to be reachable, not found.
    robots: { index: false, follow: true },
  };
}

/**
 * The § 312k BGB cancellation route. Must stay at a stable, directly
 * reachable URL and be linked from the footer on every page — the statute
 * requires the Kündigungsbutton to be "ständig verfügbar sowie unmittelbar und
 * leicht zugänglich".
 */
export default async function CancellationPage() {
  const t = await getTranslations('subscription.cancellation');

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
      <h1 className="font-heading text-3xl font-bold">{t('pageTitle')}</h1>
      <p className="mt-3 mb-8 text-muted-foreground">{t('pageLead')}</p>
      <CancellationClient />
    </main>
  );
}
