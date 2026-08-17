import type { Metadata } from 'next';
import { type Locale, toIntlLocale } from '@/i18n/config';
import { X_HANDLE } from '@/lib/social-links';
import { alternatesFor } from './urls';

/**
 * Shared social/OG image for the public site. Resolved against
 * `metadataBase` (set in the root layout), so a relative path is correct.
 */
export const OG_IMAGE = '/Logo/Full Logo.png';

/**
 * Build the full `Metadata` for an SEO page.
 *
 * This exists because Next merges metadata **shallowly**: a page that declares
 * `openGraph` replaces the parent's object outright rather than merging into
 * it. The root layout sets `openGraph.images`, so any child that declared its
 * own `openGraph` silently dropped the image — 162 pages advertising
 * `twitter:card="summary_large_image"` with no image to show, which renders as
 * a blank card everywhere they are shared.
 *
 * Routing every SEO page through one builder is what stops that from
 * reappearing the next time a page is added.
 */
export function seoMetadata({
  locale,
  pathFor,
  title,
  description,
  type = 'website',
}: {
  locale: Locale;
  /** Locale → path for *this* page; also drives canonical + hreflang. */
  pathFor: (locale: Locale) => string;
  title: string;
  description: string;
  type?: 'website' | 'article';
}): Metadata {
  return {
    title,
    description,
    alternates: alternatesFor(locale, pathFor),
    robots: { index: true, follow: true },
    openGraph: {
      type,
      url: pathFor(locale),
      siteName: 'Applo',
      // og:locale wants language_TERRITORY, Intl wants language-TERRITORY.
      locale: toIntlLocale(locale).replace('-', '_'),
      title,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE],
      site: X_HANDLE ? `@${X_HANDLE}` : undefined,
    },
  };
}
