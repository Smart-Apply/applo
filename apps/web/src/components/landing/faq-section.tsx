import { getTranslations } from 'next-intl/server';

/**
 * Landing FAQ. Uses native `<details>` so the answers stay reachable
 * (and indexable) without JavaScript.
 */
export async function FaqSection() {
  const t = await getTranslations('landing');

  return (
    <section className="section faq-sec" id="faq" data-pose="think">
      <div className="wrap faq-grid">
        <div className="reveal">
          <p className="eyebrow">{t('faq.eyebrow')}</p>
          <h2 className="h2" style={{ marginTop: 12 }}>{t('faq.title')}</h2>
        </div>
        <div className="faq-list">
          <details className="faq reveal"><summary>{t('faq.items.data.q')}<span className="pls" /></summary><div className="ans">{t('faq.items.data.a')}</div></details>
          <details className="faq reveal"><summary>{t('faq.items.fabrication.q')}<span className="pls" /></summary><div className="ans">{t('faq.items.fabrication.a')}</div></details>
          <details className="faq reveal"><summary>{t('faq.items.recruiters.q')}<span className="pls" /></summary><div className="ans">{t('faq.items.recruiters.a')}</div></details>
          <details className="faq reveal"><summary>{t('faq.items.languages.q')}<span className="pls" /></summary><div className="ans">{t('faq.items.languages.a')}</div></details>
          <details className="faq reveal"><summary>{t('faq.items.cancel.q')}<span className="pls" /></summary><div className="ans">{t('faq.items.cancel.a')}</div></details>
          <details className="faq reveal"><summary>{t('faq.items.ownership.q')}<span className="pls" /></summary><div className="ans">{t('faq.items.ownership.a')}</div></details>
        </div>
      </div>
    </section>
  );
}
