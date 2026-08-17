import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { BrandMark } from '@/components/landing/landing-icons';
import type { Locale } from '@/i18n/config';
import { familyPath, guideHubPath } from '@/lib/seo/urls';

interface SeoNavProps {
  locale: Locale;
  /**
   * Locale → path for *this* page, so switching language lands on the
   * translated version of the page being read rather than the hub.
   */
  localeUrls: Record<Locale, string>;
}

/**
 * Header for the SEO route group. Mirrors the landing nav's markup (same
 * `.nav` styles from home.css) but links to real pages instead of on-page
 * anchors — these pages are entry points from search, so a visitor arriving
 * here has never seen the landing sections the anchors point at.
 */
export async function SeoNav({ locale, localeUrls }: SeoNavProps) {
  const [t, tLanding] = await Promise.all([
    getTranslations('seo'),
    getTranslations('landing'),
  ]);

  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Link className="brand" href="/">
          <BrandMark />
          <span>Applo</span>
        </Link>
        <nav className="nav-links" aria-label={tLanding('nav.ariaLabel')}>
          <Link href={guideHubPath(locale)}>{t('breadcrumb.guides')}</Link>
          <Link href={familyPath(locale, 'application')}>
            {t('families.application.shortName')}
          </Link>
          <Link href={familyPath(locale, 'interview')}>{t('families.interview.shortName')}</Link>
        </nav>
        <div className="nav-cta">
          <LanguageSwitcher localeUrls={localeUrls} />
          <Link className="nav-login" href="/login">
            {tLanding('nav.login')}
          </Link>
          <Link className="btn btn-primary" href="/register">
            {tLanding('nav.start')}
          </Link>
        </div>
      </div>
    </header>
  );
}
