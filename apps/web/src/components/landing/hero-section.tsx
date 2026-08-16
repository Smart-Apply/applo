import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { revealDelay } from '@/components/landing/reveal';

/** Hero: headline, primary CTAs and the decorative "receipt" product card. */
export async function HeroSection() {
  const t = await getTranslations('landing');

  return (
    <section className="hero" data-pose="wave" id="hero">
      <div className="wrap hero-grid">
        <div>
          <p className="eyebrow reveal">
            <span className="sq" />
            {t('hero.eyebrow')}
          </p>
          <h1 className="reveal" style={revealDelay('.05s')}>
            {t.rich('hero.title', {
              highlight: (chunks) => <span className="hl">{chunks}</span>,
            })}
          </h1>
          <p className="lead reveal" style={revealDelay('.12s')}>
            {t.rich('hero.lead', {
              strong: (chunks) => <b>{chunks}</b>,
            })}
          </p>
          <div className="hero-cta reveal" style={revealDelay('.18s')}>
            <Link className="btn btn-primary" href="/register">
              {t('nav.start')}<span className="m">→</span>
            </Link>
            <a className="btn btn-ghost" href="#how">
              {t('hero.secondaryCta')}<span className="m">↓</span>
            </a>
          </div>
          <div className="trust reveal" style={revealDelay('.24s')}>
            <span className="dot" /> {t('hero.trust.hosting')}
            <span className="dot" /> {t('hero.trust.gdpr')}
            <span className="dot" /> {t('hero.trust.grounded')}
          </div>
        </div>
        <div className="hero-stage reveal" style={revealDelay('.1s')} aria-hidden="true">
          {/* “Receipt” product card, the mascot dock peeks out behind it */}
          <div className="receipt">
            <div className="r-top">
              <span className="r-file">{t('receipt.file')}</span>
              <span className="r-lang">{t('receipt.language')}</span>
            </div>
            <div className="r-row">
              <div className="r-field">
                <span className="r-label">{t('receipt.profileLabel')}</span>
                <span className="r-val">{t('receipt.profileValue')}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" fill="#16A34A" /><path d="M7 12.5 L10.5 16 L17 8.5" fill="none" stroke="#fff" strokeWidth="2.6" /></svg>
            </div>
            <div className="r-row">
              <div className="r-field">
                <span className="r-label">{t('receipt.jobLabel')}</span>
                <span className="r-val">{t('receipt.jobValue')}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" fill="#16A34A" /><path d="M7 12.5 L10.5 16 L17 8.5" fill="none" stroke="#fff" strokeWidth="2.6" /></svg>
            </div>
            <div className="r-row" style={{ display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="r-label">{t('receipt.generationLabel')}</span>
                <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden="true"><circle className="fv-t1" cx="4" cy="5" r="2.4" fill="#5581C7" /><circle className="fv-t2" cx="13" cy="5" r="2.4" fill="#5581C7" /><circle className="fv-t3" cx="22" cy="5" r="2.4" fill="#5581C7" /></svg>
              </div>
              <p className="r-note">{t('receipt.note')}</p>
            </div>
            <div className="r-score">
              <div className="r-field">
                <span className="r-label">{t('receipt.scoreLabel')}</span>
                <span className="r-num">87<small>/100</small></span>
              </div>
              <div className="r-track">
                <div className="r-bar"><span /></div>
                <div className="r-meta"><span>{t('receipt.keywords')}</span><span className="ok">{t('receipt.scoreWord')}</span></div>
              </div>
            </div>
            <div className="r-foot">
              <span className="r-export">{t('receipt.export')}</span>
              <span className="r-hint">{t('receipt.hint')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
