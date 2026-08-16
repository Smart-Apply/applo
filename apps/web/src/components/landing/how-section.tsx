import { getTranslations } from 'next-intl/server';
import { revealDelay } from '@/components/landing/reveal';

/** "So funktioniert's" — the three-step explainer. */
export async function HowSection() {
  const t = await getTranslations('landing');

  return (
    <section className="section alt" id="how" data-pose="process">
      <div className="wrap">
        <div className="sec-row reveal">
          <div>
            <p className="eyebrow">{t('how.eyebrow')}</p>
            <h2 className="h2">{t('how.title')}</h2>
          </div>
          <p className="lead">{t('how.lead')}</p>
        </div>
        <div className="grid steps">
          <article className="card reveal" style={revealDelay('0s')}>
            <div className="step-n">01</div>
            <h3 className="h3">{t('how.steps.one.title')}</h3>
            <p>{t('how.steps.one.desc')}</p>
          </article>
          <article className="card reveal" style={revealDelay('.1s')}>
            <div className="step-n">02</div>
            <h3 className="h3">{t('how.steps.two.title')}</h3>
            <p>{t('how.steps.two.desc')}</p>
          </article>
          <article className="card reveal" style={revealDelay('.2s')}>
            <div className="step-n">03</div>
            <h3 className="h3">{t('how.steps.three.title')}</h3>
            <p>{t('how.steps.three.desc')}</p>
          </article>
        </div>
      </div>
    </section>
  );
}
