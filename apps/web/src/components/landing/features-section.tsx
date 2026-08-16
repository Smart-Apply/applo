import { getTranslations } from 'next-intl/server';
import { revealDelay } from '@/components/landing/reveal';

/** Feature grid — eight cards, each with a decorative inline-SVG visual. */
export async function FeaturesSection() {
  const t = await getTranslations('landing');

  return (
    <section className="section" id="features" data-pose="coach">
      <div className="wrap">
        <div className="sec-row reveal">
          <div>
            <p className="eyebrow">{t('features.eyebrow')}</p>
            <h2 className="h2">{t('features.title')}</h2>
          </div>
          <p className="lead">{t.rich('features.lead', { emphasis: (chunks) => <i>{chunks}</i> })}</p>
        </div>
        <div className="grid feat-grid">
          <article className="card feat reveal">
            <div className="feat-viz">
              <svg viewBox="0 0 240 104" className="fv" preserveAspectRatio="xMidYMid meet">
                <rect x="72" y="10" width="96" height="82" fill="#fff" stroke="#1B2A49" strokeWidth="1.5" />
                <rect x="84" y="22" width="44" height="7" fill="#1B2A49" />
                <rect x="84" y="40" width="70" height="5" fill="#E5E9F2" className="fv-w fv-w1" />
                <rect x="84" y="52" width="70" height="5" fill="#E5E9F2" className="fv-w fv-w2" />
                <rect x="84" y="64" width="46" height="5" fill="#E5E9F2" className="fv-w fv-w3" />
                <rect x="84" y="76" width="58" height="5" fill="#5581C7" />
                <g className="fv-spark" style={{ transformOrigin: '178px 18px' }}>
                  <rect x="172" y="12" width="12" height="12" fill="#5581C7" transform="rotate(45 178 18)" />
                </g>
              </svg>
            </div>
            <h3 className="h3">{t('features.items.generation.title')}</h3>
            <p>{t('features.items.generation.desc')}</p>
          </article>

          <article className="card feat reveal" style={revealDelay('.06s')}>
            <div className="feat-viz">
              <svg viewBox="0 0 240 104" className="fv" preserveAspectRatio="xMidYMid meet">
                <g className="fv-chip fv-c1"><rect x="20" y="12" width="76" height="18" fill="#fff" stroke="#E0E0E0" strokeWidth="1.5" /><rect x="27" y="17" width="8" height="8" fill="#5581C7" /><rect x="42" y="19" width="42" height="4" fill="#E5E9F2" /></g>
                <g className="fv-chip fv-c2"><rect x="20" y="40" width="76" height="18" fill="#fff" stroke="#E0E0E0" strokeWidth="1.5" /><rect x="27" y="45" width="8" height="8" fill="#16A34A" /><rect x="42" y="47" width="42" height="4" fill="#E5E9F2" /></g>
                <g className="fv-chip fv-c3"><rect x="20" y="68" width="76" height="18" fill="#fff" stroke="#E0E0E0" strokeWidth="1.5" /><rect x="27" y="73" width="8" height="8" fill="#1B2A49" /><rect x="42" y="75" width="42" height="4" fill="#E5E9F2" /></g>
                <path d="M102 21 H126 L148 49 L126 77 H102" fill="none" stroke="#B0B0B0" strokeWidth="1.5" strokeDasharray="2 6" />
                <rect x="156" y="28" width="60" height="42" fill="#1B2A49" />
                <rect x="167" y="41" width="36" height="5" fill="#fff" opacity=".55" />
                <rect x="167" y="53" width="22" height="5" fill="#5581C7" />
              </svg>
            </div>
            <h3 className="h3">{t('features.items.ingestion.title')}</h3>
            <p>{t('features.items.ingestion.desc')}</p>
          </article>

          <article className="card feat reveal" style={revealDelay('.12s')}>
            <div className="feat-viz">
              <svg viewBox="0 0 240 104" className="fv" preserveAspectRatio="xMidYMid meet">
                <circle cx="86" cy="52" r="32" fill="none" stroke="#E5E9F2" strokeWidth="8" />
                <circle cx="86" cy="52" r="32" fill="none" stroke="#16A34A" strokeWidth="8" strokeDasharray="201" strokeDashoffset="60" transform="rotate(-90 86 52)" className="fv-ring" />
                <text x="86" y="53" textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-mono-plex),IBM Plex Mono,monospace" fontWeight="600" fontSize="21" fill="#1B2A49">87</text>
                <rect x="146" y="22" width="62" height="60" fill="#fff" stroke="#E0E0E0" strokeWidth="1.5" />
                <rect x="158" y="32" width="10" height="10" fill="#16A34A" />
                <rect x="174" y="35" width="24" height="4" fill="#E5E9F2" />
                <rect x="158" y="47" width="10" height="10" fill="#EAB308" className="fv-dot" />
                <rect x="174" y="50" width="24" height="4" fill="#E5E9F2" />
                <rect x="158" y="62" width="10" height="10" fill="#DC2626" opacity=".3" />
                <rect x="174" y="65" width="24" height="4" fill="#E5E9F2" />
              </svg>
            </div>
            <h3 className="h3">{t('features.items.validation.title')}</h3>
            <p>{t('features.items.validation.desc')}</p>
          </article>

          <article className="card feat reveal" style={revealDelay('.18s')}>
            <div className="feat-viz">
              <svg viewBox="0 0 240 104" className="fv" preserveAspectRatio="xMidYMid meet">
                <rect x="88" y="12" width="64" height="76" fill="#F5F6F8" stroke="#E0E0E0" strokeWidth="1.5" />
                <rect x="83" y="15" width="64" height="76" fill="#FAFAFA" stroke="#E0E0E0" strokeWidth="1.5" />
                <g className="fv-page">
                  <rect x="78" y="18" width="64" height="76" fill="#fff" stroke="#1B2A49" strokeWidth="1.5" />
                  <rect x="88" y="28" width="28" height="6" fill="#1B2A49" />
                  <rect x="88" y="42" width="44" height="4" fill="#E5E9F2" />
                  <rect x="88" y="51" width="44" height="4" fill="#E5E9F2" />
                  <rect x="88" y="63" width="32" height="4" fill="#5581C7" />
                  <rect x="88" y="72" width="44" height="4" fill="#E5E9F2" />
                </g>
                <g className="fv-badge" style={{ transformOrigin: '162px 26px' }}><rect x="148" y="12" width="28" height="28" fill="#5581C7" /><text x="162" y="27" textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-mono-plex),IBM Plex Mono,monospace" fontWeight="600" fontSize="12" fill="#fff">50</text></g>
              </svg>
            </div>
            <h3 className="h3">{t('features.items.templates.title')}</h3>
            <p>{t('features.items.templates.desc')}</p>
          </article>

          <article className="card feat reveal">
            <div className="feat-viz">
              <svg viewBox="0 0 240 104" className="fv" preserveAspectRatio="xMidYMid meet">
                <rect x="30" y="14" width="118" height="28" fill="#fff" stroke="#E0E0E0" strokeWidth="1.5" />
                <rect x="42" y="25" width="72" height="5" fill="#E5E9F2" />
                <rect x="92" y="56" width="118" height="30" fill="#1B2A49" />
                <circle cx="128" cy="71" r="3.6" fill="#fff" className="fv-typ fv-t1" />
                <circle cx="144" cy="71" r="3.6" fill="#fff" className="fv-typ fv-t2" />
                <circle cx="160" cy="71" r="3.6" fill="#fff" className="fv-typ fv-t3" />
              </svg>
            </div>
            <h3 className="h3">{t('features.items.interviews.title')}</h3>
            <p>{t.rich('features.items.interviews.desc', { tag: (chunks) => <span className="tag">{chunks}</span> })}</p>
          </article>

          <article className="card feat reveal" style={revealDelay('.06s')}>
            <div className="feat-viz">
              <svg viewBox="0 0 240 104" className="fv" preserveAspectRatio="xMidYMid meet">
                <rect x="42" y="24" width="84" height="56" fill="#fff" stroke="#1B2A49" strokeWidth="1.5" />
                <path d="M44 27 L84 54 L124 27" fill="none" stroke="#5581C7" strokeWidth="2.4" />
                <g className="fv-status">
                  <rect x="140" y="30" width="62" height="18" fill="#D1FADF" /><rect x="147" y="35" width="8" height="8" fill="#16A34A" className="fv-dot" /><rect x="161" y="37" width="30" height="4" fill="#16A34A" />
                  <rect x="140" y="56" width="62" height="18" fill="#F5F6F8" /><rect x="147" y="61" width="8" height="8" fill="#A0A0A0" /><rect x="161" y="63" width="30" height="4" fill="#E0E0E0" />
                </g>
              </svg>
            </div>
            <h3 className="h3">{t('features.items.tracking.title')}</h3>
            <p>{t.rich('features.items.tracking.desc', { tag: (chunks) => <span className="tag">{chunks}</span> })}</p>
          </article>

          <article className="card feat reveal" style={revealDelay('.12s')}>
            <div className="feat-viz">
              <svg viewBox="0 0 240 104" className="fv" preserveAspectRatio="xMidYMid meet">
                <rect x="56" y="34" width="128" height="36" fill="#fff" stroke="#1B2A49" strokeWidth="1.5" />
                <rect x="61" y="39" width="58" height="26" fill="#1B2A49" className="fv-toggle" />
                <text x="90" y="52" textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-mono-plex),IBM Plex Mono,monospace" fontWeight="600" fontSize="13" fill="#fff" className="fv-de">DE</text>
                <text x="150" y="52" textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-mono-plex),IBM Plex Mono,monospace" fontWeight="600" fontSize="13" fill="#A0A0A0" className="fv-en">EN</text>
              </svg>
            </div>
            <h3 className="h3">{t('features.items.languages.title')}</h3>
            <p>{t('features.items.languages.desc')}</p>
          </article>

          <article className="card feat reveal" style={revealDelay('.18s')}>
            <div className="feat-viz">
              <svg viewBox="0 0 240 104" className="fv" preserveAspectRatio="xMidYMid meet">
                <rect x="24" y="14" width="58" height="76" fill="#fff" stroke="#E0E0E0" strokeWidth="1.5" />
                <rect x="91" y="14" width="58" height="76" fill="#fff" stroke="#E0E0E0" strokeWidth="1.5" />
                <rect x="158" y="14" width="58" height="76" fill="#fff" stroke="#E0E0E0" strokeWidth="1.5" />
                <rect x="32" y="24" width="42" height="13" fill="#E5E9F2" />
                <rect x="32" y="42" width="42" height="13" fill="#E5E9F2" />
                <rect x="99" y="24" width="42" height="13" fill="#5581C7" opacity=".85" />
                <rect x="166" y="24" width="42" height="13" fill="#16A34A" />
                <rect x="166" y="42" width="42" height="13" fill="#16A34A" opacity=".45" />
                <rect x="99" y="42" width="42" height="13" fill="#5581C7" opacity=".4" className="fv-move" />
              </svg>
            </div>
            <h3 className="h3">{t('features.items.pipeline.title')}</h3>
            <p>{t('features.items.pipeline.desc')}</p>
          </article>
        </div>
      </div>
    </section>
  );
}
