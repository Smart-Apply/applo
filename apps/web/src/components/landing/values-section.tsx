import { getTranslations } from 'next-intl/server';
import { CheckMark } from '@/components/landing/landing-icons';
import { revealDelay } from '@/components/landing/reveal';

/** "Werte" — what Applo stands for, plus the explicit "what we don't do" list. */
export async function ValuesSection() {
  const t = await getTranslations('landing');

  return (
    <section className="section values" id="werte" data-pose="idle">
      <div className="wrap">
        <div className="sec-row reveal">
          <div>
            <p className="eyebrow">{t('values.eyebrow')}</p>
            <h2 className="h2">{t('values.title')}</h2>
          </div>
          <p className="lead">{t('values.lead')}</p>
        </div>
        <div className="grid val-grid">
          <article className="card val reveal">
            <div className="chk"><CheckMark /></div>
            <h3 className="h3">{t('values.items.grounded.title')}</h3>
            <p>{t('values.items.grounded.desc')}</p>
          </article>
          <article className="card val reveal" style={revealDelay('.06s')}>
            <div className="chk"><CheckMark /></div>
            <h3 className="h3">{t('values.items.eu.title')}</h3>
            <p>{t('values.items.eu.desc')}</p>
          </article>
          <article className="card val reveal" style={revealDelay('.12s')}>
            <div className="chk"><CheckMark /></div>
            <h3 className="h3">{t('values.items.audio.title')}</h3>
            <p>{t('values.items.audio.desc')}</p>
          </article>
          <article className="card val reveal">
            <div className="chk"><CheckMark /></div>
            <h3 className="h3">{t('values.items.email.title')}</h3>
            <p>{t('values.items.email.desc')}</p>
          </article>
          <article className="card val reveal" style={revealDelay('.06s')}>
            <div className="chk"><CheckMark /></div>
            <h3 className="h3">{t('values.items.security.title')}</h3>
            <p>{t('values.items.security.desc')}</p>
          </article>
          <article className="card val reveal" style={revealDelay('.12s')}>
            <div className="chk"><CheckMark /></div>
            <h3 className="h3">{t('values.items.candidate.title')}</h3>
            <p>{t.rich('values.items.candidate.desc', { strong: (chunks) => <b>{chunks}</b> })}</p>
          </article>
        </div>

        <div className="not reveal">
          <h3 className="h3">
            {t.rich('values.not.title', { underline: (chunks) => <span className="u">{chunks}</span> })}
          </h3>
          <ul>
            <li><span className="x">×</span><span>{t('values.not.items.spam')}</span></li>
            <li><span className="x">×</span><span>{t('values.not.items.fake')}</span></li>
            <li><span className="x">×</span><span>{t('values.not.items.sale')}</span></li>
          </ul>
        </div>
      </div>
    </section>
  );
}
