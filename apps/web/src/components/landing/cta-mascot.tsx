'use client';

import { useEffect, useRef, useState } from 'react';
import { ApploRig, type ApploState } from '@/components/ui/applo-rig';

/**
 * The celebrating Applo in the final CTA section: slides in once the section
 * comes into view, then plays the success pose. Client-only (scroll driven);
 * the surrounding section stays a Server Component.
 */
export function CtaMascot() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ApploState>('idle');
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const section = wrapRef.current?.closest<HTMLElement>('section');
    if (!section) return;
    let celebrateTimer = 0;

    const check = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (section.getBoundingClientRect().top >= vh * 0.72) return;
      setRevealed(true);
      // let the entrance settle, then play the celebration
      celebrateTimer = window.setTimeout(() => setState('success'), 520);
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };

    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    check();

    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      window.clearTimeout(celebrateTimer);
    };
  }, []);

  return (
    <div className={`cta-applo-wrap${revealed ? ' revealed' : ''}`} ref={wrapRef} aria-hidden>
      <ApploRig state={state} className="cta-applo" aria-hidden />
    </div>
  );
}
