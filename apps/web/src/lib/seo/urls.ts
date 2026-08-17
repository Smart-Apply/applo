import { type Locale, locales } from '@/i18n/config';
import { SITE_URL } from '@/lib/site-url';
import {
  catalogFor,
  contentForFamily,
  FAMILY_SLUGS,
  type ProfessionId,
  type SeoFamily,
} from '@/data/seo';

/**
 * URL construction for the programmatic SEO surface.
 *
 * Every path here carries a `/{locale}` prefix — including German, the default
 * locale. Skipping the prefix for the default is a common pattern, but it
 * breaks hreflang symmetry (the `de` variant would live at a path shaped
 * differently from its five siblings) and it forces a second route tree for
 * one language. One shape for all six is worth two extra characters.
 */

/** `/de` — the localized guide hub that lists both families. */
export function guideHubPath(locale: Locale): string {
  return `/${locale}`;
}

/** `/de/bewerbung-schreiben` — one family's index for one locale. */
export function familyPath(locale: Locale, family: SeoFamily): string {
  return `/${locale}/${FAMILY_SLUGS[family][locale]}`;
}

/** `/de/bewerbung-schreiben/pflegefachkraft` — one entity page. */
export function professionPath(locale: Locale, family: SeoFamily, id: ProfessionId): string {
  const slug = contentForFamily(catalogFor(locale)[id], family).slug;
  return `${familyPath(locale, family)}/${slug}`;
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/**
 * Build the hreflang map for one page, as `Metadata.alternates.languages`.
 *
 * Google ignores an entire hreflang cluster if any single annotation is wrong,
 * so this is the only place that builds them: pass the function that maps a
 * locale to that locale's path and every page gets a complete, symmetric set
 * for free. The self-reference is included (required), and `x-default` points
 * at English as the version most likely to be readable by a visitor whose
 * language Applo does not support — the app's own Accept-Language fallback is
 * German, but that only applies to non-prefixed paths, so the two never
 * disagree about a URL.
 */
export function hreflangAlternates(pathFor: (locale: Locale) => string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = absoluteUrl(pathFor(locale));
  }
  languages['x-default'] = absoluteUrl(pathFor('en'));
  return languages;
}

/** Canonical + hreflang for one page, ready to spread into `Metadata`. */
export function alternatesFor(locale: Locale, pathFor: (l: Locale) => string) {
  return {
    canonical: absoluteUrl(pathFor(locale)),
    languages: hreflangAlternates(pathFor),
  };
}

/**
 * Locale → path for every SEO page, used by the language switcher so changing
 * language navigates to the translated URL instead of re-rendering the same
 * one. Returning a full map (rather than a single href) keeps the switcher a
 * dumb component that never has to know which page it is on.
 */
export function localeUrlMap(pathFor: (locale: Locale) => string): Record<Locale, string> {
  return Object.fromEntries(locales.map((locale) => [locale, pathFor(locale)])) as Record<
    Locale,
    string
  >;
}
