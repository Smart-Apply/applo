import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

const betaFaqKeys = ['inviteCode', 'oauth', 'betaCost', 'betaIssues', 'feedback', 'betaData'] as const;
const generalFaqKeys = ['what', 'industries', 'languages', 'data', 'pricing', 'editing', 'ats', 'contact'] as const;

function stripRichText(message: string) {
  return message
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('faq');

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    robots: { index: true, follow: true },
  };
}

export default async function FaqPage() {
  const t = await getTranslations('faq');
  const allFaqKeys = [...betaFaqKeys, ...generalFaqKeys] as const;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allFaqKeys.map((key) => ({
      '@type': 'Question',
      name: t(`items.${key}.q`),
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripRichText(t.raw(`items.${key}.a`) as string),
      },
    })),
  };

  const richComponents = {
    code: (chunks: React.ReactNode) => (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{chunks}</code>
    ),
    email: (chunks: React.ReactNode) => (
      <a href="mailto:support@applo.ai" className="underline">{chunks}</a>
    ),
    privacy: (chunks: React.ReactNode) => (
      <Link href="/datenschutz" className="underline">{chunks}</Link>
    ),
    pricing: (chunks: React.ReactNode) => (
      <Link href="/#preise" className="underline">{chunks}</Link>
    ),
    home: (chunks: React.ReactNode) => (
      <Link href="/" className="underline">{chunks}</Link>
    ),
    list: (chunks: React.ReactNode) => (
      <ul className="mt-2 list-inside list-disc space-y-1">{chunks}</ul>
    ),
    item: (chunks: React.ReactNode) => <li>{chunks}</li>,
  };

  return (
    <>
      <h1>{t('title')}</h1>
      <p>
        {t.rich('intro', {
          home: (chunks) => <Link href="/" className="underline">{chunks}</Link>,
        })}
      </p>

      <aside
        role="note"
        aria-label={t('betaNotice.ariaLabel')}
        className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900"
      >
        <strong className="font-semibold">{t('betaNotice.strong')}</strong>{' '}
        {t('betaNotice.text')}
      </aside>

      <section aria-labelledby="beta-faq-heading" className="mt-8">
        <h2 id="beta-faq-heading" className="text-xl font-semibold">
          {t('sections.beta')}
        </h2>
        <div className="mt-3 space-y-3">
          {betaFaqKeys.map((key) => (
            <details key={key} className="group rounded-[4px] border border-border bg-card p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-heading text-base font-semibold text-primary [&::-webkit-details-marker]:hidden">
                <span>{t(`items.${key}.q`)}</span>
                <span
                  className="ml-4 select-none text-xl text-muted-foreground transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <div className="mt-3 text-foreground/80 leading-relaxed">
                {t.rich(`items.${key}.a`, richComponents)}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="general-faq-heading" className="mt-10">
        <h2 id="general-faq-heading" className="text-xl font-semibold">
          {t('sections.general')}
        </h2>
        <div className="mt-3 space-y-3">
          {generalFaqKeys.map((key) => (
            <details key={key} className="group rounded-[4px] border border-border bg-card p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-heading text-base font-semibold text-primary [&::-webkit-details-marker]:hidden">
                <span>{t(`items.${key}.q`)}</span>
                <span
                  className="ml-4 select-none text-xl text-muted-foreground transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <div className="mt-3 text-foreground/80 leading-relaxed">
                {t.rich(`items.${key}.a`, richComponents)}
              </div>
            </details>
          ))}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
