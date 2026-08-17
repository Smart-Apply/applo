import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SeoBreadcrumbs } from '@/components/seo/breadcrumbs';
import { SeoCtaBand } from '@/components/seo/cta-band';
import { SeoNav } from '@/components/seo/seo-nav';
import {
  allProfessions,
  contentForFamily,
  familyFromSlug,
  type SeoFamily,
} from '@/data/seo';
import { isLocale, type Locale, toIntlLocale } from '@/i18n/config';
import {
  breadcrumbList,
  graph,
  itemList,
  serializeJsonLd,
  type Crumb,
} from '@/lib/seo/json-ld';
import {
  alternatesFor,
  familyPath,
  guideHubPath,
  localeUrlMap,
  professionPath,
} from '@/lib/seo/urls';

type Params = { params: Promise<{ locale: string; family: string }> };

/** Resolve and validate both route params in one place. */
async function resolve(params: Params['params']): Promise<{ locale: Locale; family: SeoFamily } | null> {
  const { locale, family: familySlug } = await params;
  if (!isLocale(locale)) return null;
  const family = familyFromSlug(locale, familySlug);
  if (!family) return null;
  return { locale, family };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const resolved = await resolve(params);
  if (!resolved) return {};
  const { locale, family } = resolved;

  const t = await getTranslations({ locale, namespace: `seo.families.${family}` });
  const title = t('hubMetaTitle');
  const description = t('hubMetaDescription');
  const pathFor = (l: Locale) => familyPath(l, family);

  return {
    title,
    description,
    alternates: alternatesFor(locale, pathFor),
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      url: pathFor(locale),
      siteName: 'Applo',
      locale: toIntlLocale(locale).replace('-', '_'),
      title,
      description,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

/**
 * Family hub — every profession's page for one family, in one language.
 *
 * The `ItemList` here is the honest structured-data description of the page:
 * an ordered list of the entity pages below it. It is what makes the set
 * legible to a crawler as a collection rather than 12 unrelated URLs.
 */
export default async function FamilyHubPage({ params }: Params) {
  const resolved = await resolve(params);
  if (!resolved) notFound();
  const { locale, family } = resolved;

  const t = await getTranslations({ locale, namespace: 'seo' });
  const professions = allProfessions(locale);
  const pathFor = (l: Locale) => familyPath(l, family);

  const crumbs: Crumb[] = [
    { name: t('breadcrumb.home'), path: '/' },
    { name: t('breadcrumb.guides'), path: guideHubPath(locale) },
    { name: t(`families.${family}.name`), path: familyPath(locale, family) },
  ];

  const jsonLd = graph([
    breadcrumbList(crumbs),
    itemList(
      professions.map(({ id, content }) => ({
        name: contentForFamily(content, family).heading,
        path: professionPath(locale, family, id),
      })),
    ),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <SeoNav locale={locale} localeUrls={localeUrlMap(pathFor)} />

      <main id="top">
        <div className="wrap">
          <SeoBreadcrumbs crumbs={crumbs} label={t('breadcrumb.guides')} />
        </div>

        <header className="seo-head">
          <div className="wrap">
            <p className="eyebrow">
              <span className="sq" aria-hidden="true" />
              {t(`families.${family}.name`)}
            </p>
            <h1>{t(`families.${family}.hubHeading`)}</h1>
            <p className="lead">{t(`families.${family}.hubIntro`)}</p>
          </div>
        </header>

        <section className="seo-block">
          <div className="wrap">
            <h2 className="h2">{t('hub.professionsHeading')}</h2>
            <p className="hint">{t('hub.professionsIntro')}</p>
            <div className="seo-cards cols-3">
              {professions.map(({ id, content }) => (
                <Link key={id} href={professionPath(locale, family, id)}>
                  <span className="h3">{content.name}</span>
                  <p>{contentForFamily(content, family).metaDescription}</p>
                </Link>
              ))}
            </div>
            <p className="seo-note">{t('disclaimer')}</p>
          </div>
        </section>

        <SeoCtaBand />
      </main>
    </>
  );
}
