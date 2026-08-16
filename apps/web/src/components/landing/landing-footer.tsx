import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Instagram, Linkedin, X as XIcon } from 'lucide-react';
import { BrandMark, TikTokIcon } from '@/components/landing/landing-icons';
import { SOCIAL_LINKS } from '@/lib/social-links';

const hasSocialLinks = Object.values(SOCIAL_LINKS).some(Boolean);

/** Landing footer with legal links and (when configured) social profiles. */
export async function LandingFooter() {
  const t = await getTranslations('landing');

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="fcol">
          <a className="brand" href="#top">
            <BrandMark light />
            <span>Applo</span>
          </a>
          <p style={{ maxWidth: 240, lineHeight: 1.6, marginTop: 4 }}>
            {t('footer.tagline')}
          </p>
          {hasSocialLinks && (
            <div className="fsocial">
              {SOCIAL_LINKS.x && (
                <a href={SOCIAL_LINKS.x} target="_blank" rel="noopener noreferrer" aria-label={t('footer.social.x')}>
                  <XIcon size={18} />
                </a>
              )}
              {SOCIAL_LINKS.linkedin && (
                <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer" aria-label={t('footer.social.linkedin')}>
                  <Linkedin size={18} />
                </a>
              )}
              {SOCIAL_LINKS.instagram && (
                <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label={t('footer.social.instagram')}>
                  <Instagram size={18} />
                </a>
              )}
              {SOCIAL_LINKS.tiktok && (
                <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener noreferrer" aria-label={t('footer.social.tiktok')}>
                  <TikTokIcon size={18} />
                </a>
              )}
            </div>
          )}
        </div>
        <div className="fcol">
          <Link href="/impressum">Impressum</Link>
          <Link href="/datenschutz">Datenschutz</Link>
          <Link href="/agb">AGB</Link>
        </div>
        <div className="fcol fmeta">
          <div>{t('footer.compliance')}</div>
          <span className="pill">{t('footer.license')}</span>
        </div>
      </div>
    </footer>
  );
}
