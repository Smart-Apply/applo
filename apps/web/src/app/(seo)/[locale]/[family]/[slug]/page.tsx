import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ApplicationArticle } from '@/components/seo/application-article';
import { SeoBreadcrumbs } from '@/components/seo/breadcrumbs';
import { SeoCtaBand } from '@/components/seo/cta-band';
import { InterviewArticle } from '@/components/seo/interview-article';
import { SeoNav } from '@/components/seo/seo-nav';
import {
  contentForFamily,
  familyFromSlug,
  professionFor,
  professionIdFromSlug,
  relatedProfessions,
  type ProfessionId,
  type SeoFamily,
} from '@/data/seo';
import { isLocale, type Locale, toIntlLocale } from '@/i18n/config';
import {
  article,
  breadcrumbList,
  faqPage,
  graph,
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

type Params = { params: Promise<{ locale: string; family: string; slug: string }> };

interface Resolved {
  locale: Locale;
  family: SeoFamily;
  id: ProfessionId;
}

/**
 * Validate all three route params together.
 *
 * The slug is looked up per (locale, family) rather than globally: slugs are
 * localized, and a valid German slug on an English URL has to 404 rather than
 * quietly resolve — otherwise every profession would be reachable at six
 * wrong URLs, each of them a duplicate of the right one.
 */
async function resolve(params: Params['params']): Promise<Resolved | null> {
  const { locale, family: familySlug, slug } = await params;
  if (!isLocale(locale)) return null;
  const family = familyFromSlug(locale, familySlug);
  if (!family) return null;
  const id = professionIdFromSlug(locale, family, slug);
  if (!id) return null;
  return { locale, family, id };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const resolved = await resolve(params);
  if (!resolved) return {};
  const { locale, family, id } = resolved;

  const content = contentForFamily(professionFor(locale, id), family);
  const pathFor = (l: Locale) => professionPath(l, family, id);

  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: alternatesFor(locale, pathFor),
    robots: { index: true, follow: true },
    openGraph: {
      type: 'article',
      url: pathFor(locale),
      siteName: 'Applo',
      locale: toIntlLocale(locale).replace('-', '_'),
      title: content.metaTitle,
      description: content.metaDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: content.metaTitle,
      description: content.metaDescription,
    },
  };
}

/** The entity page: one profession, one family, one language. */
export default async function ProfessionPage({ params }: Params) {
  const resolved = await resolve(params);
  if (!resolved) notFound();
  const { locale, family, id } = resolved;

  const t = await getTranslations({ locale, namespace: 'seo' });
  const profession = professionFor(locale, id);
  const content = contentForFamily(profession, family);
  const pathFor = (l: Locale) => professionPath(l, family, id);
  const otherFamily: SeoFamily = family === 'application' ? 'interview' : 'application';
  const related = relatedProfessions(locale, id);

  const crumbs: Crumb[] = [
    { name: t('breadcrumb.home'), path: '/' },
    { name: t('breadcrumb.guides'), path: guideHubPath(locale) },
    { name: t(`families.${family}.name`), path: familyPath(locale, family) },
    { name: profession.name, path: professionPath(locale, family, id) },
  ];

  const jsonLd = graph([
    breadcrumbList(crumbs),
    article({
      path: professionPath(locale, family, id),
      headline: content.heading,
      description: content.metaDescription,
      locale,
      about: profession.name,
    }),
    faqPage(
      content.faq.map((entry) => ({ question: entry.question, answer: entry.answer })),
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
              {profession.name}
            </p>
            <h1>{content.heading}</h1>
            <p className="lead">{content.intro}</p>
          </div>
        </header>

        {family === 'application' ? (
          <ApplicationArticle locale={locale} content={profession.application} />
        ) : (
          <InterviewArticle locale={locale} content={profession.interview} />
        )}

        <section className="seo-block alt">
          <div className="wrap">
            <h2 className="h2" style={{ marginBottom: 26 }}>
              {t('sections.faq')}
            </h2>
            <div className="faq-list">
              {content.faq.map((entry) => (
                <details key={entry.question} className="faq">
                  <summary>
                    <span>{entry.question}</span>
                    <span className="pls" aria-hidden="true" />
                  </summary>
                  <p className="ans">{entry.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="seo-block">
          <div className="wrap">
            <h2 className="h2" style={{ marginBottom: 26 }}>
              {t(`sections.crossFamily.${otherFamily}`)}
            </h2>
            <div className="seo-cards cols-2">
              <Link href={professionPath(locale, otherFamily, id)}>
                <span className="h3">
                  {contentForFamily(profession, otherFamily).heading}
                </span>
                <p>
                  {t(`sections.crossFamilyHint.${otherFamily}`, { profession: profession.name })}
                </p>
              </Link>
              <Link href={familyPath(locale, family)}>
                <span className="h3">{t(`families.${family}.hubHeading`)}</span>
                <p>{t(`families.${family}.cardDescription`)}</p>
              </Link>
            </div>

            <h2 className="h2" style={{ marginTop: 56, marginBottom: 26 }}>
              {t('sections.related')}
            </h2>
            <div className="seo-cards cols-3">
              {related.map((entry) => (
                <Link key={entry.id} href={professionPath(locale, family, entry.id)}>
                  <span className="h3">{entry.content.name}</span>
                  <p>{contentForFamily(entry.content, family).heading}</p>
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
