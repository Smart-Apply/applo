import './home.css';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { ApploCompanion } from '@/components/landing/applo-companion';
import { CtaSection } from '@/components/landing/cta-section';
import { FaqSection } from '@/components/landing/faq-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { HeroSection } from '@/components/landing/hero-section';
import { HowSection } from '@/components/landing/how-section';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingNav } from '@/components/landing/landing-nav';
import { PricingSection } from '@/components/landing/pricing-section';
import { ScrollReveal } from '@/components/landing/scroll-reveal';
import { ValuesSection } from '@/components/landing/values-section';
import { defaultLocale, isLocale, locales, toIntlLocale } from '@/i18n/config';
import { ORGANIZATION_ID } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/site-url';
import { SOCIAL_LINKS, X_HANDLE } from '@/lib/social-links';

const OG_IMAGE = '/Logo/Full Logo.png';

/**
 * Monthly plan prices for the structured-data offers. Kept in code rather than
 * read from the message catalogs: those are localized display strings
 * ("9,95" in de/fr/it) while schema.org needs a machine-readable decimal.
 * Mirrors the tier contract in GET /api/v1/subscription/tiers.
 */
const PLAN_PRICES = { free: '0', pro: '9.95', premium: '19.95' } as const;

async function getLandingContext() {
  const [t, rawLocale] = await Promise.all([getTranslations('landing'), getLocale()]);
  return { t, locale: isLocale(rawLocale) ? rawLocale : defaultLocale };
}

/** JSON-LD is embedded as raw HTML, so neutralize any `</script>` breakout. */
function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getLandingContext();
  const title = t('meta.title');
  const description = t('meta.description');
  const rawKeywords: unknown = t.raw('meta.keywords');
  const keywords = Array.isArray(rawKeywords)
    ? rawKeywords.filter((keyword): keyword is string => typeof keyword === 'string')
    : undefined;

  return {
    title,
    description,
    keywords,
    alternates: { canonical: '/' },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      url: '/',
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

/**
 * Public landing page — a Server Component so the marketing copy is in the
 * initial HTML (SEO, social previews, no-JS readability). Only the mascot
 * animations and the scroll-reveal driver ship as client components.
 */
export default async function Home() {
  const { t, locale } = await getLandingContext();
  const description = t('meta.description');
  const socialProfiles = Object.values(SOCIAL_LINKS).filter(Boolean);
  const organizationId = ORGANIZATION_ID;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: 'Applo',
        url: `${SITE_URL}/`,
        logo: encodeURI(`${SITE_URL}${OG_IMAGE}`),
        ...(socialProfiles.length > 0 ? { sameAs: socialProfiles } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: 'Applo',
        description,
        inLanguage: locale,
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#application`,
        name: 'Applo',
        url: `${SITE_URL}/`,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description,
        inLanguage: [...locales],
        publisher: { '@id': organizationId },
        offers: (['free', 'pro', 'premium'] as const).map((plan) => ({
          '@type': 'Offer',
          name: t(`pricing.plans.${plan}.name`),
          price: PLAN_PRICES[plan],
          priceCurrency: 'EUR',
          url: `${SITE_URL}/#preise`,
        })),
      },
    ],
  };

  return (
    <div className="applo-home">
      {/*
        Sections fade in via `.reveal` (opacity 0 until ScrollReveal adds `.in`).
        Without JavaScript nothing would ever be revealed, so unhide everything.
      */}
      <noscript
        dangerouslySetInnerHTML={{
          __html: '<style>.applo-home .reveal{opacity:1!important;transform:none!important}</style>',
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <ScrollReveal />
      <ApploCompanion />
      <LandingNav />

      <main id="top">
        <HeroSection />
        <HowSection />
        <FeaturesSection />
        <ValuesSection />
        <PricingSection />
        <FaqSection />
        <CtaSection />
      </main>

      <LandingFooter />
    </div>
  );
}
