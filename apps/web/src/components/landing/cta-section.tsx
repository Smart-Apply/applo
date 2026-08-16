import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CtaMascot } from '@/components/landing/cta-mascot';
import { revealDelay } from '@/components/landing/reveal';

/** Closing call-to-action. */
export async function CtaSection() {
  const t = await getTranslations('landing');

  return (
    <section className="section final" id="cta" data-pose="success">
      <div className="wrap final-wrap">
        <CtaMascot />
        <h2 className="h2 reveal" style={revealDelay('.05s')}>{t('final.title')}</h2>
        <p className="lead reveal" style={revealDelay('.1s')}>{t('final.lead')}</p>
        <div className="hero-cta reveal" style={{ ...revealDelay('.16s'), justifyContent: 'center' }}>
          <Link className="btn btn-primary" href="/register">{t('final.cta')}<span className="m">→</span></Link>
        </div>
        <p className="trust reveal" style={{ ...revealDelay('.22s'), justifyContent: 'center' }}>
          <span className="dot" /> {t('final.trust.hosting')} <span className="dot" /> {t('final.trust.gdpr')} <span className="dot" /> {t('final.trust.cancel')}
        </p>
      </div>
    </section>
  );
}
