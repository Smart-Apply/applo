import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { BrandMark } from '@/components/landing/landing-icons';

/** Sticky landing-page header. Server-rendered; only the switcher is client. */
export async function LandingNav() {
  const t = await getTranslations('landing');

  return (
    <header className="nav">
      <div className="wrap nav-in">
        <a className="brand" href="#top">
          <BrandMark />
          <span>Applo</span>
        </a>
        <nav className="nav-links" aria-label={t('nav.ariaLabel')}>
          <a href="#features">{t('nav.features')}</a>
          <a href="#werte">{t('nav.values')}</a>
          <a href="#preise">{t('nav.pricing')}</a>
          <a href="#faq">{t('nav.faq')}</a>
        </nav>
        <div className="nav-cta">
          <LanguageSwitcher />
          <Link className="nav-login" href="/login">
            {t('nav.login')}
          </Link>
          <Link className="btn btn-primary" href="/register">
            {t('nav.start')}
          </Link>
        </div>
      </div>
    </header>
  );
}
