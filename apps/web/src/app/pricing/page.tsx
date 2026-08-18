import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PricingClient } from './pricing-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('subscription');
  return {
    title: t('pricing.metaTitle'),
    description: t('pricing.metaDescription'),
  };
}

/**
 * Static top-level route, deliberately outside `(dashboard)`: a paywall has to
 * be reachable logged-out, and `app/[locale]` (the SEO group) never shadows a
 * static segment.
 */
export default function PricingPage() {
  // useSearchParams in the client child needs a Suspense boundary to prerender.
  return (
    <Suspense fallback={null}>
      <PricingClient />
    </Suspense>
  );
}
