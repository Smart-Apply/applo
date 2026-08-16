'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApploRig, type ApploState } from '@/components/ui/applo-rig';

/**
 * The landing page companion: ONE Applo whose pose follows the section
 * currently crossing the viewport middle. He starts tucked behind the hero
 * receipt card, pops out to greet, then rides along as a corner buddy.
 *
 * Client-only by necessity (scroll/resize driven DOM positioning). The
 * sections he reacts to stay Server Components — this component finds them
 * through the shared `.applo-home` root instead of through refs.
 */
export function ApploCompanion() {
  const t = useTranslations('landing');
  const dockRef = useRef<HTMLDivElement>(null);
  const [pose, setPose] = useState<ApploState>('wave');
  const [docked, setDocked] = useState<'hero' | 'float'>('hero');
  const [introReady, setIntroReady] = useState(false);

  useEffect(() => {
    const dock = dockRef.current;
    const root = dock?.closest<HTMLElement>('.applo-home');
    if (!dock || !root) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const poseEls = Array.from(root.querySelectorAll<HTMLElement>('[data-pose]'));
    const card = root.querySelector<HTMLElement>('.receipt');
    const pricingSec = root.querySelector<HTMLElement>('#preise');
    const ctaSec = root.querySelector<HTMLElement>('#cta');

    let curPose: string | null = null;
    let curDocked: 'hero' | 'float' | null = null;
    let lastHidden: boolean | null = null;

    // intro: Applo starts tucked behind the receipt card, then springs up to greet.
    let introStarted = false;
    let introRunning = false;
    let introDone = prefersReduced;

    const rigWidth = (mode: 'hero' | 'float') => {
      const vw = window.innerWidth;
      return mode === 'hero'
        ? Math.min(180, Math.max(120, vw * 0.13))
        : Math.min(72, Math.max(56, vw * 0.055));
    };

    const setHidden = (hidden: boolean) => {
      if (hidden === lastHidden) return;
      lastHidden = hidden;
      dock.style.opacity = hidden ? '0' : '1';
      dock.style.visibility = hidden ? 'hidden' : 'visible';
    };

    const maybeIntro = () => {
      if (introStarted) return;
      introStarted = true;
      const settle = () => {
        introRunning = false;
        introDone = true;
        dock.style.transition = 'opacity .4s ease';
        dock.style.transform = 'none';
        setIntroReady(true);
      };
      if (prefersReduced) {
        settle();
        return;
      }
      window.setTimeout(() => {
        if (!dockRef.current) return;
        introRunning = true;
        // Overshooting bezier gives the pop-out bounce as he clears the card edge.
        dock.style.transition = 'transform .95s cubic-bezier(.34,1.5,.5,1), opacity .4s ease';
        dock.style.transform = 'translateY(132%)';
        void dock.getBoundingClientRect();
        requestAnimationFrame(() => {
          dock.style.transform = 'none';
        });
        window.setTimeout(settle, 1000);
      }, 520);
    };

    // Hero: glued to the receipt card (viewport coords, recomputed each scroll) so
    // he rides with it; sits behind its right edge and peeks over the top. The dock
    // is z-index 1, the card z-index 5, so the card cuts him off just under the eyes.
    const placeHero = () => {
      const svg = dock.querySelector<SVGSVGElement>('.applo');
      if (!card || !svg) return;
      const cr = card.getBoundingClientRect();
      if (!cr.width) return;
      const rw = rigWidth('hero');
      const rh = rw * 1.25; // 240×300 viewBox
      svg.style.width = `${rw}px`;
      dock.style.position = 'fixed';
      dock.style.right = 'auto';
      dock.style.bottom = 'auto';
      if (!introRunning) dock.style.transition = 'opacity .4s ease';
      dock.style.left = `${Math.round(cr.right - rw - Math.min(40, cr.width * 0.09))}px`;
      dock.style.top = `${Math.round(cr.top - rh * 0.64)}px`;
      // Until the intro plays, keep him pushed down out of sight behind the card.
      if (!introRunning) dock.style.transform = introDone ? 'none' : 'translateY(132%)';
      maybeIntro();
    };

    const placeFloat = () => {
      const svg = dock.querySelector<SVGSVGElement>('.applo');
      if (svg) svg.style.width = `${rigWidth('float')}px`;
      dock.style.transition = 'opacity .4s ease';
      dock.style.position = 'fixed';
      dock.style.left = 'auto';
      dock.style.top = 'auto';
      dock.style.right = '14px';
      dock.style.bottom = '14px';
      dock.style.transform = 'none';
    };

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

      // Hide the corner buddy over pricing / CTA — he'd cover the plan cards
      // and the CTA has its own celebrating Applo.
      let inCta = false;
      if (ctaSec) {
        const cr = ctaSec.getBoundingClientRect();
        inCta = cr.top < vh * 0.55 && cr.bottom > vh * 0.2;
      }
      let inPricing = false;
      if (pricingSec) {
        const pricingRect = pricingSec.getBoundingClientRect();
        inPricing = pricingRect.top < vh * 0.85 && pricingRect.bottom > vh * 0.15;
      }

      // dock: peek behind the card while it's on screen, keyed off the card's top
      // edge so he flips to the corner exactly as his head reaches the viewport top.
      const narrow = window.innerWidth < 880;
      const cardTop = card ? card.getBoundingClientRect().top : 1;
      const next: 'hero' | 'float' = !narrow && card && cardTop > -20 ? 'hero' : 'float';
      if (next !== curDocked) {
        curDocked = next;
        setDocked(next);
      }
      if (next === 'hero') placeHero();
      else placeFloat();
      setHidden(next === 'float' && (inPricing || inCta));
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    // The card shifts while fonts load / the hero reveal runs, so re-place whenever
    // it changes size rather than guessing a settle time.
    let ro: ResizeObserver | undefined;
    if (window.ResizeObserver && card) {
      ro = new ResizeObserver(() => {
        if (curDocked === 'hero') placeHero();
      });
      ro.observe(card);
      ro.observe(document.documentElement);
    }
    const settleTimers = [0, 300, 800, 1600].map((ms) => window.setTimeout(onScroll, ms));
    if (document.fonts && document.fonts.ready) void document.fonts.ready.then(onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      settleTimers.forEach((id) => window.clearTimeout(id));
      ro?.disconnect();
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
    <div
      id="applo-dock"
      ref={dockRef}
      className={`${docked === 'hero' ? 'dock-hero' : 'dock-float'}${introReady ? ' intro-ready' : ''}`}
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
  );
}
