import type { MetadataRoute } from 'next';
import { PROFESSION_IDS, SEO_FAMILIES } from '@/data/seo';
import { locales } from '@/i18n/config';
import { absoluteUrl, familyPath, guideHubPath, hreflangAlternates, professionPath } from '@/lib/seo/urls';

/**
 * The site's sitemap.
 *
 * Every SEO URL carries the full hreflang set as `alternates.languages`,
 * which Next renders as `xhtml:link rel="alternate"` entries. Emitting them
 * here as well as in each page's `<head>` is deliberate: the sitemap is how
 * Google discovers the cluster before it has crawled any member of it.
 *
 * `lastModified` is intentionally absent. The content is editorial and only
 * changes when this repository changes; stamping every URL with the build
 * time would tell crawlers the whole site changed on every deploy, which is
 * false and, repeated often enough, trains them to ignore the signal.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    { url: absoluteUrl('/faq'), changeFrequency: 'monthly', priority: 0.5 },
    // robots.ts deliberately keeps these crawlable, so list them here too.
    { url: absoluteUrl('/login'), changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/register'), changeFrequency: 'yearly', priority: 0.4 },
    { url: absoluteUrl('/impressum'), changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl('/datenschutz'), changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl('/agb'), changeFrequency: 'yearly', priority: 0.2 },
  ];

  for (const locale of locales) {
    entries.push({
      url: absoluteUrl(guideHubPath(locale)),
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: { languages: hreflangAlternates(guideHubPath) },
    });

    for (const family of SEO_FAMILIES) {
      entries.push({
        url: absoluteUrl(familyPath(locale, family)),
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: { languages: hreflangAlternates((l) => familyPath(l, family)) },
      });

      for (const id of PROFESSION_IDS) {
        entries.push({
          url: absoluteUrl(professionPath(locale, family, id)),
          changeFrequency: 'monthly',
          priority: 0.6,
          alternates: { languages: hreflangAlternates((l) => professionPath(l, family, id)) },
        });
      }
    }
  }

  return entries;
}
