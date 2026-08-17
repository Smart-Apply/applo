import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SeoBreadcrumbs } from '@/components/seo/breadcrumbs';
import { SeoCtaBand } from '@/components/seo/cta-band';
import { SeoNav } from '@/components/seo/seo-nav';
import { allProfessions, SEO_FAMILIES } from '@/data/seo';
import { isLocale } from '@/i18n/config';
import {
  breadcrumbList,
  graph,
  itemList,
  serializeJsonLd,
  type Crumb,
} from '@/lib/seo/json-ld';
import { seoMetadata } from '@/lib/seo/metadata';
import { familyPath, guideHubPath, localeUrlMap, professionPath } from '@/lib/seo/urls';

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const t = await getTranslations({ locale, namespace: 'seo.hub' });

  return seoMetadata({
    locale,
    pathFor: guideHubPath,
    title: t('metaTitle'),
    description: t('metaDescription'),
  });
}

/**
 * Guide hub — the root of the SEO surface for one language.
 *
 * Every entity page links back here and this page links to every family hub
 * and every profession, so the whole set is reachable in two clicks from a
 * single URL. That matters more than it sounds: without a hub, 24 pages per
 * language hang off the sitemap alone and get crawled at whatever depth the
 * crawler feels like.
 */
export default async function GuideHubPage({ params }: Params) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = await getTranslations({ locale, namespace: 'seo' });
  const professions = allProfessions(locale);

  const crumbs: Crumb[] = [
    { name: t('breadcrumb.home'), path: '/' },
    { name: t('breadcrumb.guides'), path: guideHubPath(locale) },
  ];

  const jsonLd = graph([
    breadcrumbList(crumbs),
    itemList(
      SEO_FAMILIES.map((family) => ({
        name: t(`families.${family}.name`),
        path: familyPath(locale, family),
      })),
    ),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <SeoNav locale={locale} localeUrls={localeUrlMap(guideHubPath)} />

      <main id="top">
        <div className="wrap">
          <SeoBreadcrumbs crumbs={crumbs} label={t('breadcrumb.guides')} />
        </div>

        <header className="seo-head">
          <div className="wrap">
            <p className="eyebrow">
              <span className="sq" aria-hidden="true" />
              {t('hub.eyebrow')}
            </p>
            <h1>{t('hub.heading')}</h1>
            <p className="lead">{t('hub.intro')}</p>
          </div>
        </header>

        <section className="seo-block">
          <div className="wrap">
            <h2 className="h2">{t('hub.familiesHeading')}</h2>
            <div className="seo-cards cols-2" style={{ marginTop: 26 }}>
              {SEO_FAMILIES.map((family) => (
                <Link key={family} href={familyPath(locale, family)}>
                  <span className="h3">{t(`families.${family}.name`)}</span>
                  <p>{t(`families.${family}.cardDescription`)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="seo-block alt">
          <div className="wrap">
            <h2 className="h2">{t('hub.professionsHeading')}</h2>
            <p className="hint">{t('hub.professionsIntro')}</p>
            <div className="seo-index">
              {professions.map(({ id, content }) => (
                <div key={id}>
                  <span className="name">{content.name}</span>
                  <span className="links">
                    {SEO_FAMILIES.map((family) => (
                      <Link key={family} href={professionPath(locale, family, id)}>
                        {t(`families.${family}.shortName`)}
                      </Link>
                    ))}
                  </span>
                </div>
              ))}
            </div>
            <p className="seo-note">{t('disclaimer')}</p>
          </div>
        </section>

        <SeoCtaBand locale={locale} />
      </main>
    </>
  );
}
