'use client';

import './home.css';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ApploRig, type ApploState } from '@/components/ui/applo-rig';

/** Inline reveal-delay helper (drives the CSS `--d` custom property). */
const d = (delay: string): CSSProperties => ({ ['--d']: delay }) as CSSProperties;

/** Dock speech-bubble copy per Applo pose. */
const POSE_BUBBLE: Record<ApploState, { title?: string; text: string }> = {
  wave: { title: 'Hi, ich bin Applo!', text: 'Ich helfe dir bei ehrlichen Bewerbungen.' },
  search: { text: 'Ich lese deinen CV.' },
  process: { text: 'Ich schreibe …' },
  success: { text: 'Stark gemacht!' },
  idle: { text: 'Ehrlich & ruhig.' },
  love: { text: 'Für dich gebaut.' },
  auto: { text: 'Stellen im Nu.' },
  coach: { text: 'Üb mit mir.' },
  think: { text: 'Mal sehen …' },
  done: { text: 'Erledigt!' },
};

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

  const bubble = POSE_BUBBLE[pose];

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
          <nav className="nav-links" aria-label="Hauptnavigation">
            <a href="#features">Features</a>
            <a href="#werte">Werte</a>
            <a href="#preise">Preise</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="nav-cta">
            <Link className="nav-login" href="/login">
              Anmelden
            </Link>
            <Link className="btn btn-primary" href="/register">
              Kostenlos starten
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
                Bewerben, ehrlich gemacht
              </p>
              <h1 className="reveal" style={d('.05s')}>
                Bewerbungen, die zu <span className="hl">dir</span> passen, nicht zu einer erfundenen
                Version von dir.
              </h1>
              <p className="lead reveal" style={d('.12s')}>
                Applo schreibt Anschreiben und Lebenslauf aus deinem <b>echten Profil</b>: KI-gestützt, ATS-optimiert und
                transparent. Du behältst die Kontrolle, die KI erfindet nichts dazu.
              </p>
              <div className="hero-cta reveal" style={d('.18s')}>
                <Link className="btn btn-primary" href="/register">
                  Kostenlos starten<span className="m">→</span>
                </Link>
                <a className="btn btn-ghost" href="#how">
                  So funktioniert’s<span className="m">↓</span>
                </a>
              </div>
              <div className="trust reveal" style={d('.24s')}>
                <span className="dot" /> EU-Hosting
                <span className="dot" /> DSGVO
                <span className="dot" /> Keine erfundenen Daten
              </div>
            </div>
            <div className="hero-stage reveal" style={d('.1s')} aria-hidden="true">
              {/* “Receipt” product card, the mascot dock peeks out behind it */}
              <div className="receipt">
                <div className="r-top">
                  <span className="r-file">bewerbung_vertriebsleitung.pdf</span>
                  <span className="r-lang">DE</span>
                </div>
                <div className="r-row">
                  <div className="r-field">
                    <span className="r-label">PROFIL</span>
                    <span className="r-val">Lena Weber · Vertriebsleiterin</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" fill="#16A34A" /><path d="M7 12.5 L10.5 16 L17 8.5" fill="none" stroke="#fff" strokeWidth="2.6" /></svg>
                </div>
                <div className="r-row">
                  <div className="r-field">
                    <span className="r-label">STELLE</span>
                    <span className="r-val">Vertriebsleitung · Nordwind GmbH</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" fill="#16A34A" /><path d="M7 12.5 L10.5 16 L17 8.5" fill="none" stroke="#fff" strokeWidth="2.6" /></svg>
                </div>
                <div className="r-row" style={{ display: 'block' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="r-label">KI-GENERIERUNG</span>
                    <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden="true"><circle className="fv-t1" cx="4" cy="5" r="2.4" fill="#5581C7" /><circle className="fv-t2" cx="13" cy="5" r="2.4" fill="#5581C7" /><circle className="fv-t3" cx="22" cy="5" r="2.4" fill="#5581C7" /></svg>
                  </div>
                  <p className="r-note">Grounding-Check aktiv: keine erfundenen Kennzahlen.</p>
                </div>
                <div className="r-score">
                  <div className="r-field">
                    <span className="r-label">ATS-SCORE</span>
                    <span className="r-num">87<small>/100</small></span>
                  </div>
                  <div className="r-track">
                    <div className="r-bar"><span /></div>
                    <div className="r-meta"><span>KEYWORDS 21/24</span><span className="ok">STARK</span></div>
                  </div>
                </div>
                <div className="r-foot">
                  <span className="r-export">Als PDF exportieren</span>
                  <span className="r-hint">50 VORLAGEN · DE/EN</span>
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
                <p className="eyebrow">01 · So funktioniert’s</p>
                <h2 className="h2">In drei Schritten zur fertigen Bewerbung</h2>
              </div>
              <p className="lead">Vom Lebenslauf zur abgeschickten, ATS-optimierten Bewerbung, ohne Copy-Paste-Chaos.</p>
            </div>
            <div className="grid steps">
              <article className="card reveal" style={d('0s')}>
                <div className="step-n">01</div>
                <h3 className="h3">Profil &amp; CV hochladen</h3>
                <p>Lade deinen Lebenslauf hoch. Der Resume-Parser liest ihn aus und füllt dein Profil automatisch. Du prüfst und korrigierst.</p>
              </article>
              <article className="card reveal" style={d('.1s')}>
                <div className="step-n">02</div>
                <h3 className="h3">Stelle einfügen</h3>
                <p>Füge eine Stelle als Text, URL oder PDF ein. Die KI schreibt Anschreiben und Lebenslauf passend zur Ausschreibung, ATS-optimiert.</p>
              </article>
              <article className="card reveal" style={d('.2s')}>
                <div className="step-n">03</div>
                <h3 className="h3">Als PDF exportieren</h3>
                <p>Wähle aus 50 ATS-Vorlagen, exportiere als PDF (DE/EN) und bewirb dich. Fertig.</p>
              </article>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section" id="features" data-pose="coach">
          <div className="wrap">
            <div className="sec-row reveal">
              <div>
                <p className="eyebrow">02 · Features</p>
                <h2 className="h2">Alles, was eine ehrliche Bewerbung braucht</h2>
              </div>
              <p className="lead">Konkrete Werkzeuge statt leerer Versprechen. Gebaut, damit deine Bewerbung stark <i>und</i> wahr ist.</p>
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
                <h3 className="h3">KI-Generierung</h3>
                <p>Self-Review &amp; ATS-Keyword-Loop verfeinern Anschreiben und CV automatisch, auf Basis deiner echten Daten.</p>
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
                <h3 className="h3">Smart Job-Ingestion</h3>
                <p>Stellen aus Indeed, LinkedIn und Glassdoor einlesen: als Text, URL oder PDF.</p>
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
                <h3 className="h3">Bewerbungs-Check</h3>
                <p>ATS-Score plus Ampel-Feedback zeigt dir, was vor dem Absenden noch besser geht.</p>
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
                <h3 className="h3">50 ATS-PDF-Vorlagen</h3>
                <p>Sauber strukturierte Vorlagen in Deutsch und Englisch, optimiert für Bewerbungssysteme.</p>
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
                <h3 className="h3">Mock-Interviews</h3>
                <p>Übe Interviews als Text oder per Voice und erhalte konkretes Feedback.<span className="tag">Premium</span></p>
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
                <h3 className="h3">E-Mail-Tracking</h3>
                <p>Verbinde Outlook/M365. Der Status deiner Bewerbungen aktualisiert sich automatisch.<span className="tag">Premium</span></p>
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
                <h3 className="h3">Mehrsprachig DE/EN</h3>
                <p>Erstelle und exportiere Bewerbungen wahlweise auf Deutsch oder Englisch.</p>
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
                <h3 className="h3">Live-Status der Pipeline</h3>
                <p>Behalte alle Bewerbungen und ihren aktuellen Stand an einem Ort im Blick.</p>
              </article>
            </div>
          </div>
        </section>

        {/* WERTE */}
        <section className="section values" id="werte" data-pose="idle">
          <div className="wrap">
            <div className="sec-row reveal">
              <div>
                <p className="eyebrow">03 · Werte &amp; Transparenz</p>
                <h2 className="h2">Ehrlich. Nachprüfbar. Auf deiner Seite.</h2>
              </div>
              <p className="lead">Transparenz ist kein Feature-Häkchen, sondern das Fundament. Wir sagen klar, was passiert und was nicht.</p>
            </div>
            <div className="grid val-grid">
              <article className="card val reveal">
                <div className="chk"><Check /></div>
                <h3 className="h3">Keine erfundenen Daten</h3>
                <p>Die KI nutzt nur, was dein Profil belegt. Ein Grounding-Check markiert erfundene Kennzahlen, bevor sie in deine Bewerbung geraten.</p>
              </article>
              <article className="card val reveal" style={d('.06s')}>
                <div className="chk"><Check /></div>
                <h3 className="h3">Deine Daten bleiben in der EU</h3>
                <p>Hosting und Speicherung erfolgen in der EU, nach DSGVO.</p>
              </article>
              <article className="card val reveal" style={d('.12s')}>
                <div className="chk"><Check /></div>
                <h3 className="h3">Interviews: kein Audio gespeichert</h3>
                <p>Von Mock-Interviews bleiben nur Transcript und Feedback, keine Audioaufnahme.</p>
              </article>
              <article className="card val reveal">
                <div className="chk"><Check /></div>
                <h3 className="h3">E-Mail-Tracking ohne Inhalte</h3>
                <p>Wir lesen den Status, nicht deine Nachrichten. Mail-Inhalte werden nicht gespeichert.</p>
              </article>
              <article className="card val reveal" style={d('.06s')}>
                <div className="chk"><Check /></div>
                <h3 className="h3">Sicherheit eingebaut</h3>
                <p>HttpOnly-JWT, 2FA, CSRF-Schutz, Rate-Limiting und Audit-Logs sind standardmäßig aktiv.</p>
              </article>
              <article className="card val reveal" style={d('.12s')}>
                <div className="chk"><Check /></div>
                <h3 className="h3">Für dich, nicht für Recruiter</h3>
                <p>Dein Profil ist die Basis <b>deiner</b> Bewerbungen, kein durchsuchbares Schaufenster für Firmen.</p>
              </article>
            </div>

            <div className="not reveal">
              <h3 className="h3">
                Was Applo <span className="u">nicht</span> tut
              </h3>
              <ul>
                <li><span className="x">×</span><span>Keine Massen-Spam-Bewerbungen in deinem Namen.</span></li>
                <li><span className="x">×</span><span>Keine Fake-Erfolge und keine erfundenen Kennzahlen.</span></li>
                <li><span className="x">×</span><span>Kein Verkauf deiner Daten, an niemanden.</span></li>
              </ul>
            </div>
          </div>
        </section>

        {/* PREISE */}
        <section className="section" id="preise" data-pose="idle">
          <div className="wrap">
            <div className="sec-row reveal">
              <div>
                <p className="eyebrow">04 · Preise</p>
                <h2 className="h2">Fair und ohne Überraschungen</h2>
              </div>
              <p className="lead">Starte kostenlos. Upgrade nur, wenn du mehr brauchst. Jederzeit kündbar.</p>
            </div>
            <div className="grid price-grid">
              <article className="card price reveal">
                <div className="pname">Free</div>
                <div className="pamt">€ 0 <small>/ Monat</small></div>
                <div className="ptbd">Zum Ausprobieren</div>
                <ul>
                  <li><span className="ck"><Check /></span> 5 Bewerbungs-Checks / Monat</li>
                  <li><span className="ck"><Check /></span> KI-Generierung &amp; ATS-Score</li>
                  <li><span className="ck"><Check /></span> 50 ATS-PDF-Vorlagen</li>
                  <li><span className="ck"><Check /></span> DE/EN</li>
                </ul>
                <Link className="btn btn-ghost" href="/register">Kostenlos starten</Link>
              </article>
              <article className="card price feature reveal" style={d('.08s')}>
                <span className="badge">Beliebt</span>
                <div className="pname">Pro</div>
                <div className="pamt">€ <span style={{ color: 'rgba(229,233,242,.5)' }}>TBD</span> <small>/ Monat</small></div>
                <div className="ptbd">Preis folgt</div>
                <ul>
                  <li><span className="ck"><Check color="#5581C7" /></span> Unlimitierte Bewerbungs-Checks</li>
                  <li><span className="ck"><Check color="#5581C7" /></span> Smart Job-Ingestion</li>
                  <li><span className="ck"><Check color="#5581C7" /></span> Live-Status der Pipeline</li>
                  <li><span className="ck"><Check color="#5581C7" /></span> Alles aus Free</li>
                </ul>
                <Link className="btn btn-primary" href="/register">Pro wählen<span className="m">→</span></Link>
              </article>
              <article className="card price reveal" style={d('.16s')}>
                <div className="pname">Premium</div>
                <div className="pamt">€ <span style={{ color: 'var(--muted-2)' }}>TBD</span> <small>/ Monat</small></div>
                <div className="ptbd">Preis folgt</div>
                <ul>
                  <li><span className="ck"><Check /></span> Mock-Interviews (Text &amp; Voice)</li>
                  <li><span className="ck"><Check /></span> E-Mail-Tracking (Outlook/M365)</li>
                  <li><span className="ck"><Check /></span> Alles aus Pro</li>
                </ul>
                <Link className="btn btn-ghost" href="/register">Premium wählen</Link>
              </article>
            </div>
            <div className="stats reveal" id="stats">
              <div className="stat"><b data-count="50">0</b><span>ATS-Vorlagen</span></div>
              <div className="stat"><b data-count="2" data-suffix=" Sprachen">0</b><span>Deutsch &amp; Englisch</span></div>
              <div className="stat"><b data-suffix="%" data-count="100">0</b><span>EU-Hosting &amp; DSGVO</span></div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section faq-sec" id="faq" data-pose="think">
          <div className="wrap faq-grid">
            <div className="reveal">
              <p className="eyebrow">05 · FAQ</p>
              <h2 className="h2" style={{ marginTop: 12 }}>Klare Antworten</h2>
            </div>
            <div className="faq-list">
              <details className="faq reveal"><summary>Was passiert mit meinen Daten?<span className="pls" /></summary><div className="ans">Deine Daten werden in der EU gehostet und gespeichert, nach DSGVO. Wir verkaufen deine Daten nicht. Bei Mock-Interviews wird kein Audio gespeichert, beim E-Mail-Tracking keine Mail-Inhalte.</div></details>
              <details className="faq reveal"><summary>Erfindet die KI Dinge über mich?<span className="pls" /></summary><div className="ans">Nein. Die KI nutzt nur, was dein Profil belegt. Ein Grounding-Check markiert erfundene Kennzahlen, damit nichts Unwahres in deine Bewerbung gerät.</div></details>
              <details className="faq reveal"><summary>Können Recruiter mein Profil sehen oder finden?<span className="pls" /></summary><div className="ans">Nein. Dein Profil ist die private Basis deiner eigenen Bewerbungen, kein durchsuchbares Schaufenster. Es wird Firmen nicht zur Suche angeboten.</div></details>
              <details className="faq reveal"><summary>In welchen Sprachen kann ich bewerben?<span className="pls" /></summary><div className="ans">Du kannst Bewerbungen auf Deutsch und Englisch erstellen und als PDF exportieren.</div></details>
              <details className="faq reveal"><summary>Ist Applo kündbar?<span className="pls" /></summary><div className="ans">Ja, jederzeit. Free bleibt kostenlos; bezahlte Tarife sind ohne lange Bindung kündbar.</div></details>
              <details className="faq reveal"><summary>Wem gehören meine Daten?<span className="pls" /></summary><div className="ans">Dir. Dein Profil und deine Inhalte gehören dir. Applo nutzt sie nur, um deine Bewerbungen zu erstellen.</div></details>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="section final" id="cta" data-pose="success">
          <div className="wrap final-wrap">
            <div className={`cta-applo-wrap${ctaRevealed ? ' revealed' : ''}`} aria-hidden>
              <ApploRig state={ctaState} className="cta-applo" aria-hidden />
            </div>
            <h2 className="h2 reveal" style={d('.05s')}>Bereit für ehrliche Bewerbungen?</h2>
            <p className="lead reveal" style={d('.1s')}>Starte kostenlos: keine erfundenen Daten, keine Massen-Spam-Bewerbungen.</p>
            <div className="hero-cta reveal" style={{ ...d('.16s'), justifyContent: 'center' }}>
              <Link className="btn btn-primary" href="/register">Kostenlos starten<span className="m">→</span></Link>
            </div>
            <p className="trust reveal" style={{ ...d('.22s'), justifyContent: 'center' }}>
              <span className="dot" /> EU-Hosting <span className="dot" /> DSGVO <span className="dot" /> jederzeit kündbar
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
              Bewerbungen aus deinem echten Profil: ehrlich, ATS-optimiert, in der EU gehostet.
            </p>
          </div>
          <div className="fcol">
            <Link href="/impressum">Impressum</Link>
            <Link href="/datenschutz">Datenschutz</Link>
            <Link href="/agb">AGB</Link>
          </div>
          <div className="fcol fmeta">
            <div>EU · DSGVO</div>
            <span className="pill">Source-available · BSL 1.1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
