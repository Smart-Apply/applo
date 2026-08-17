import { getTranslations } from 'next-intl/server';
import type { ApplicationContent } from '@/data/seo';
import type { Locale } from '@/i18n/config';

/**
 * Body of an "application documents" page.
 *
 * The section order follows how the documents are actually assembled — what
 * gets screened first, then the CV, then the letter, then the mistakes — so
 * the page reads as guidance rather than as a data dump of the record behind
 * it.
 */
export async function ApplicationArticle({
  locale,
  content,
}: {
  locale: Locale;
  content: ApplicationContent;
}) {
  const t = await getTranslations({ locale, namespace: 'seo.sections' });

  return (
    <>
      <section className="seo-block">
        <div className="wrap">
          <h2 className="h2">{t('atsKeywords')}</h2>
          <p className="hint">{t('atsKeywordsHint')}</p>
          <ul className="seo-chips">
            {content.atsKeywords.map((keyword) => (
              <li key={keyword}>{keyword}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="seo-block alt">
        <div className="wrap">
          <h2 className="h2" style={{ marginBottom: 26 }}>
            {t('hardSkills')}
          </h2>
          <dl className="seo-details">
            {content.hardSkills.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="seo-block">
        <div className="wrap">
          <h2 className="h2" style={{ marginBottom: 26 }}>
            {t('cvFocus')}
          </h2>
          <dl className="seo-details">
            {content.cvFocus.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="seo-block alt">
        <div className="wrap">
          <h2 className="h2">{t('coverLetterOpener')}</h2>
          <p className="hint">{t('coverLetterOpenerHint')}</p>
          <blockquote className="seo-sample">{content.coverLetterOpener}</blockquote>
        </div>
      </section>

      <section className="seo-block">
        <div className="wrap">
          <h2 className="h2" style={{ marginBottom: 26 }}>
            {t('certifications')}
          </h2>
          <ul className="seo-list">
            {content.certifications.map((certification) => (
              <li key={certification}>{certification}</li>
            ))}
          </ul>
          <h2 className="h2" style={{ marginTop: 48, marginBottom: 26 }}>
            {t('softSkills')}
          </h2>
          <ul className="seo-list">
            {content.softSkills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="seo-block alt">
        <div className="wrap">
          <h2 className="h2" style={{ marginBottom: 26 }}>
            {t('mistakes')}
          </h2>
          <dl className="seo-details">
            {content.mistakes.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
