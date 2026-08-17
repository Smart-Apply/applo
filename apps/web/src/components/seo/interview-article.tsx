import { getTranslations } from 'next-intl/server';
import type { InterviewContent } from '@/data/seo';
import type { Locale } from '@/i18n/config';

/**
 * Body of an "interview questions" page.
 *
 * Each question carries both what it is testing and how to answer it, which
 * is the whole reason this page exists as something other than a list of
 * questions anyone could generate.
 */
export async function InterviewArticle({
  locale,
  content,
}: {
  locale: Locale;
  content: InterviewContent;
}) {
  const t = await getTranslations({ locale, namespace: 'seo.sections' });

  return (
    <>
      <section className="seo-block">
        <div className="wrap">
          <h2 className="h2" style={{ marginBottom: 26 }}>
            {t('questions')}
          </h2>
          <div className="seo-qa">
            {content.questions.map((question) => (
              <article key={question.question}>
                <h3>{question.question}</h3>
                <div className="qa-row">
                  <span className="qa-label">{t('questionWhy')}</span>
                  <p className="qa-text">{question.why}</p>
                </div>
                <div className="qa-row">
                  <span className="qa-label">{t('questionTip')}</span>
                  <p className="qa-text">{question.tip}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="seo-block alt">
        <div className="wrap">
          <h2 className="h2" style={{ marginBottom: 26 }}>
            {t('redFlags')}
          </h2>
          <ul className="seo-list warn">
            {content.redFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="seo-block">
        <div className="wrap">
          <h2 className="h2" style={{ marginBottom: 26 }}>
            {t('askThem')}
          </h2>
          <ul className="seo-list">
            {content.askThem.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
