import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/config';

/**
 * Closing conversion band, shared by all SEO pages.
 *
 * Deliberately at the foot and never mid-article: these pages exist to answer
 * a question someone typed into a search engine, and a page that interrupts
 * its own answer to sell is the pattern search quality guidelines single out.
 */
export async function SeoCtaBand({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'seo.cta' });

  return (
    <section className="section final">
      <div className="wrap final-wrap">
        <h2 className="h2">{t('heading')}</h2>
        <p className="lead" style={{ margin: '0 auto', maxWidth: 620 }}>
          {t('body')}
        </p>
        <div
          className="hero-cta"
          style={{ justifyContent: 'center', marginTop: 32 }}
        >
          <Link className="btn btn-primary" href="/register">
            {t('primary')}
          </Link>
          <Link className="btn btn-ghost" href="/">
            {t('secondary')}
          </Link>
        </div>
      </div>
    </section>
  );
}
