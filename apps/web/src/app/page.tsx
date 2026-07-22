'use client';

import './home.css';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { ApploRig, type ApploState } from '@/components/ui/applo-rig';

/** Inline reveal-delay helper (drives the CSS `--d` custom property). */
const d = (delay: string): CSSProperties => ({ ['--d']: delay }) as CSSProperties;

/** Applo wordmark/logo. `light` flips it for the dark footer. */
function BrandMark({ light = false }: { light?: boolean }) {
  const mark = light ? '#fff' : '#1B2A49';
  const screen = light ? '#1B2A49' : '#fff';
  return (
    <svg width="28" height="28" viewBox="0 0 140 140" aria-hidden="true">
      <g fill="none" stroke={mark} strokeWidth="7" strokeLinecap="round">
        <path d="M58 36 L52 18" />
        <path d="M82 36 L88 18" />
      </g>
      <circle cx="50" cy="14" r="8" fill={mark} />
      <circle cx="90" cy="14" r="8" fill={mark} />
      <rect x="20" y="64" width="14" height="34" rx="7" fill={mark} />
      <rect x="106" y="64" width="14" height="34" rx="7" fill={mark} />
      <rect x="30" y="34" width="80" height="84" rx="22" fill={mark} />
      <rect x="50" y="52" width="40" height="50" rx="7" fill={screen} />
      <path d="M56 82 L65 91 L84 70" fill="none" stroke={mark} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Check used in value cards and price lists (green by default, blue on the navy Pro card). */
function Check({ color = '#16A34A' }: { color?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  const t = useTranslations('landing');
  const rootRef = useRef<HTMLDivElement>(null);
  const [pose, setPose] = useState<ApploState>('wave');
  const [docked, setDocked] = useState<'hero' | 'float'>('hero');
  const [dockHidden, setDockHidden] = useState(false);
  const [ctaState, setCtaState] = useState<ApploState>('idle');
  const [ctaRevealed, setCtaRevealed] = useState(false);

  // Companion driver: pose per section, dock position, scroll-reveal and
  // animated stat counters, a React port of the design's vanilla script.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const poseEls = Array.from(root.querySelectorAll<HTMLElement>('[data-pose]'));
    const hero = root.querySelector<HTMLElement>('#hero');
    const ctaSec = root.querySelector<HTMLElement>('#cta');
    const stats = root.querySelector<HTMLElement>('#stats');

    let curPose: string | null = null;
    let lastDocked: 'hero' | 'float' | null = null;
    let lastHidden: boolean | null = null;
    let ctaDone = false;

    const onScroll = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const mid = vh * 0.5;
      // nearest [data-pose] section crossing the viewport middle
      let best: HTMLElement | null = null;
      let bestDist = Infinity;
      poseEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) {
          const dist = Math.abs((r.top + r.bottom) / 2 - mid);
          if (dist < bestDist) {
            bestDist = dist;
            best = el;
          }
        }
      });
      if (best) {
        const p = (best as HTMLElement).getAttribute('data-pose');
        if (p && p !== curPose) {
          curPose = p;
          setPose(p as ApploState);
        }
      }

      // dock: big in hero, small corner buddy afterwards, hidden over the CTA.
      let inCta = false;
      if (ctaSec) {
        const cr = ctaSec.getBoundingClientRect();
        inCta = cr.top < vh * 0.55 && cr.bottom > vh * 0.2;
        if (!ctaDone && cr.top < vh * 0.72) {
          ctaDone = true;
          setCtaRevealed(true);
          // let the entrance settle, then play the celebration
          window.setTimeout(() => setCtaState('success'), 520);
        }
      }
      const hr = hero?.getBoundingClientRect();
      const next: 'hero' | 'float' = hr && hr.bottom > vh * 0.4 ? 'hero' : 'float';
      if (next !== lastDocked) {
        lastDocked = next;
        setDocked(next);
      }
      const hidden = next === 'float' && inCta;
      if (hidden !== lastHidden) {
        lastHidden = hidden;
        setDockHidden(hidden);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    // scroll reveal (rect-based, robust)
    let revEls = Array.from(root.querySelectorAll<HTMLElement>('.reveal'));
    let revealTimer = 0;
    const checkReveal = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      for (let i = revEls.length - 1; i >= 0; i--) {
        const r = revEls[i].getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) {
          revEls[i].classList.add('in');
          revEls.splice(i, 1);
        }
      }
      if (!revEls.length) {
        window.removeEventListener('scroll', checkReveal);
        window.removeEventListener('resize', checkReveal);
      }
    };
    if (prefersReduced) {
      revEls.forEach((el) => el.classList.add('in'));
      revEls = [];
    } else {
      window.addEventListener('scroll', checkReveal, { passive: true });
      window.addEventListener('resize', checkReveal);
      checkReveal();
      revealTimer = window.setTimeout(checkReveal, 60);
    }

    // animated counters
    let counted = false;
    const runCount = () => {
      if (counted) return;
      counted = true;
      root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
        const target = parseFloat(el.getAttribute('data-count') || '0');
        const suffix = el.getAttribute('data-suffix') || '';
        if (prefersReduced) {
          el.textContent = target + suffix;
          return;
        }
        const dur = 1100;
        let t0: number | null = null;
        const step = (ts: number) => {
          if (t0 === null) t0 = ts;
          const k = Math.min((ts - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - k, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    };
    const checkCount = () => {
      if (counted || !stats) return;
      const r = stats.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh * 0.85 && r.bottom > 0) {
        runCount();
        window.removeEventListener('scroll', checkCount);
      }
    };
    window.addEventListener('scroll', checkCount, { passive: true });
    checkCount();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', checkReveal);
      window.removeEventListener('resize', checkReveal);
      window.removeEventListener('scroll', checkCount);
      window.clearTimeout(revealTimer);
    };
  }, []);

  const poseBubble: Record<ApploState, { title?: string; text: string }> = {
    wave: { title: t('mascot.wave.title'), text: t('mascot.wave.text') },
    search: { text: t('mascot.search.text') },
    process: { text: t('mascot.process.text') },
    success: { text: t('mascot.success.text') },
    idle: { text: t('mascot.idle.text') },
    love: { text: t('mascot.love.text') },
    auto: { text: t('mascot.auto.text') },
    coach: { text: t('mascot.coach.text') },
    think: { text: t('mascot.think.text') },
    done: { text: t('mascot.done.text') },
  };
  const bubble = poseBubble[pose];

  return (
    <div className="applo-home" ref={rootRef}>
      {/* companion: ONE Applo, pose per section */}
      <div
        id="applo-dock"
        className={docked === 'hero' ? 'dock-hero' : 'dock-float'}
        style={dockHidden ? { opacity: 0, visibility: 'hidden' } : undefined}
        aria-hidden
      >
        <ApploRig state={pose} aria-hidden />
        <div className="dock-bubble" id="dockBubble">
          {bubble.title ? (
            <>
              <b>{bubble.title}</b>
              <span>{bubble.text}</span>
            </>
          ) : (
            bubble.text
          )}
        </div>
      </div>

      {/* NAV */}
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

      <main id="top">
        {/* HERO */}
        <section className="hero" data-pose="wave" id="hero">
          <div className="wrap hero-grid">
            <div>
              <p className="eyebrow reveal">
                <span className="sq" />
                {t('hero.eyebrow')}
              </p>
              <h1 className="reveal" style={d('.05s')}>
                {t.rich('hero.title', {
                  highlight: (chunks) => <span className="hl">{chunks}</span>,
                })}
              </h1>
              <p className="lead reveal" style={d('.12s')}>
                {t.rich('hero.lead', {
                  strong: (chunks) => <b>{chunks}</b>,
                })}
              </p>
              <div className="hero-cta reveal" style={d('.18s')}>
                <Link className="btn btn-primary" href="/register">
                  {t('nav.start')}<span className="m">→</span>
                </Link>
                <a className="btn btn-ghost" href="#how">
                  {t('hero.secondaryCta')}<span className="m">↓</span>
                </a>
              </div>
              <div className="trust reveal" style={d('.24s')}>
                <span className="dot" /> {t('hero.trust.hosting')}
                <span className="dot" /> {t('hero.trust.gdpr')}
                <span className="dot" /> {t('hero.trust.grounded')}
              </div>
            </div>
            <div className="hero-stage reveal" style={d('.1s')} aria-hidden="true">
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

        {/* HOW */}
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
              <article className="card reveal" style={d('0s')}>
                <div className="step-n">01</div>
                <h3 className="h3">{t('how.steps.one.title')}</h3>
                <p>{t('how.steps.one.desc')}</p>
              </article>
              <article className="card reveal" style={d('.1s')}>
                <div className="step-n">02</div>
                <h3 className="h3">{t('how.steps.two.title')}</h3>
                <p>{t('how.steps.two.desc')}</p>
              </article>
              <article className="card reveal" style={d('.2s')}>
                <div className="step-n">03</div>
                <h3 className="h3">{t('how.steps.three.title')}</h3>
                <p>{t('how.steps.three.desc')}</p>
              </article>
            </div>
          </div>
        </section>

        {/* FEATURES */}
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

              <article className="card feat reveal" style={d('.06s')}>
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

              <article className="card feat reveal" style={d('.12s')}>
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

              <article className="card feat reveal" style={d('.18s')}>
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

              <article className="card feat reveal" style={d('.06s')}>
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

              <article className="card feat reveal" style={d('.12s')}>
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

              <article className="card feat reveal" style={d('.18s')}>
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

        {/* WERTE */}
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
                <div className="chk"><Check /></div>
                <h3 className="h3">{t('values.items.grounded.title')}</h3>
                <p>{t('values.items.grounded.desc')}</p>
              </article>
              <article className="card val reveal" style={d('.06s')}>
                <div className="chk"><Check /></div>
                <h3 className="h3">{t('values.items.eu.title')}</h3>
                <p>{t('values.items.eu.desc')}</p>
              </article>
              <article className="card val reveal" style={d('.12s')}>
                <div className="chk"><Check /></div>
                <h3 className="h3">{t('values.items.audio.title')}</h3>
                <p>{t('values.items.audio.desc')}</p>
              </article>
              <article className="card val reveal">
                <div className="chk"><Check /></div>
                <h3 className="h3">{t('values.items.email.title')}</h3>
                <p>{t('values.items.email.desc')}</p>
              </article>
              <article className="card val reveal" style={d('.06s')}>
                <div className="chk"><Check /></div>
                <h3 className="h3">{t('values.items.security.title')}</h3>
                <p>{t('values.items.security.desc')}</p>
              </article>
              <article className="card val reveal" style={d('.12s')}>
                <div className="chk"><Check /></div>
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

        {/* PREISE */}
        <section className="section" id="preise" data-pose="idle">
          <div className="wrap">
            <div className="sec-row reveal">
              <div>
                <p className="eyebrow">{t('pricing.eyebrow')}</p>
                <h2 className="h2">{t('pricing.title')}</h2>
              </div>
              <p className="lead">{t('pricing.lead')}</p>
            </div>
            <div className="grid price-grid">
              <article className="card price reveal">
                <div className="pname">{t('pricing.plans.free.name')}</div>
                <div className="pamt">{t('pricing.plans.free.currency')} {t('pricing.plans.free.amount')} <small>{t('pricing.plans.free.period')}</small></div>
                <div className="ptbd">{t('pricing.plans.free.tagline')}</div>
                <ul>
                  <li><span className="ck"><Check /></span> {t('pricing.plans.free.features.0')}</li>
                  <li><span className="ck"><Check /></span> {t('pricing.plans.free.features.1')}</li>
                  <li><span className="ck"><Check /></span> {t('pricing.plans.free.features.2')}</li>
                  <li><span className="ck"><Check /></span> {t('pricing.plans.free.features.3')}</li>
                </ul>
                <Link className="btn btn-ghost" href="/register">{t('pricing.plans.free.cta')}</Link>
              </article>
              <article className="card price feature reveal" style={d('.08s')}>
                <span className="badge">{t('pricing.plans.pro.badge')}</span>
                <div className="pname">{t('pricing.plans.pro.name')}</div>
                <div className="pamt">{t('pricing.plans.pro.currency')} <span style={{ color: 'rgba(229,233,242,.5)' }}>{t('pricing.plans.pro.amount')}</span> <small>{t('pricing.plans.pro.period')}</small></div>
                <div className="ptbd">{t('pricing.plans.pro.tagline')}</div>
                <ul>
                  <li><span className="ck"><Check color="#5581C7" /></span> {t('pricing.plans.pro.features.0')}</li>
                  <li><span className="ck"><Check color="#5581C7" /></span> {t('pricing.plans.pro.features.1')}</li>
                  <li><span className="ck"><Check color="#5581C7" /></span> {t('pricing.plans.pro.features.2')}</li>
                  <li><span className="ck"><Check color="#5581C7" /></span> {t('pricing.plans.pro.features.3')}</li>
                </ul>
                <Link className="btn btn-primary" href="/register">{t('pricing.plans.pro.cta')}<span className="m">→</span></Link>
              </article>
              <article className="card price reveal" style={d('.16s')}>
                <div className="pname">{t('pricing.plans.premium.name')}</div>
                <div className="pamt">{t('pricing.plans.premium.currency')} <span style={{ color: 'var(--muted-2)' }}>{t('pricing.plans.premium.amount')}</span> <small>{t('pricing.plans.premium.period')}</small></div>
                <div className="ptbd">{t('pricing.plans.premium.tagline')}</div>
                <ul>
                  <li><span className="ck"><Check /></span> {t('pricing.plans.premium.features.0')}</li>
                  <li><span className="ck"><Check /></span> {t('pricing.plans.premium.features.1')}</li>
                  <li><span className="ck"><Check /></span> {t('pricing.plans.premium.features.2')}</li>
                </ul>
                <Link className="btn btn-ghost" href="/register">{t('pricing.plans.premium.cta')}</Link>
              </article>
            </div>
            <div className="stats reveal" id="stats">
              <div className="stat"><b data-count="50">0</b><span>{t('pricing.stats.templates')}</span></div>
              <div className="stat"><b data-count="2" data-suffix={t('pricing.stats.languagesSuffix')}>0</b><span>{t('pricing.stats.languages')}</span></div>
              <div className="stat"><b data-suffix="%" data-count="100">0</b><span>{t('pricing.stats.hosting')}</span></div>
            </div>
          </div>
        </section>

        {/* FAQ */}
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

        {/* FINAL CTA */}
        <section className="section final" id="cta" data-pose="success">
          <div className="wrap final-wrap">
            <div className={`cta-applo-wrap${ctaRevealed ? ' revealed' : ''}`} aria-hidden>
              <ApploRig state={ctaState} className="cta-applo" aria-hidden />
            </div>
            <h2 className="h2 reveal" style={d('.05s')}>{t('final.title')}</h2>
            <p className="lead reveal" style={d('.1s')}>{t('final.lead')}</p>
            <div className="hero-cta reveal" style={{ ...d('.16s'), justifyContent: 'center' }}>
              <Link className="btn btn-primary" href="/register">{t('final.cta')}<span className="m">→</span></Link>
            </div>
            <p className="trust reveal" style={{ ...d('.22s'), justifyContent: 'center' }}>
              <span className="dot" /> {t('final.trust.hosting')} <span className="dot" /> {t('final.trust.gdpr')} <span className="dot" /> {t('final.trust.cancel')}
            </p>
          </div>
        </section>
      </main>

      {/* FOOTER */}
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
    </div>
  );
}
