'use client';

import { useEffect } from 'react';

/**
 * Scroll-reveal driver for the landing page: adds `.in` to every `.reveal`
 * element once it enters the viewport (`home.css` animates the transition).
 *
 * Renders nothing — it only drives DOM that Server Components emitted. When
 * scripting is disabled the `<noscript>` fallback on the page shows the same
 * content immediately, so nothing here is required to READ the page.
 */
export function ScrollReveal() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.applo-home');
    if (!root) return;

    const elements = Array.from(root.querySelectorAll<HTMLElement>('.reveal'));

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((el) => el.classList.add('in'));
      return;
    }

    // rect-based rather than IntersectionObserver: the sections shift while
    // fonts load, and a plain rect check re-evaluates on every scroll tick.
    const check = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      for (let i = elements.length - 1; i >= 0; i--) {
        const r = elements[i].getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) {
          elements[i].classList.add('in');
          elements.splice(i, 1);
        }
      }
      if (!elements.length) {
        window.removeEventListener('scroll', check);
        window.removeEventListener('resize', check);
      }
    };

    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    check();
    const settleTimer = window.setTimeout(check, 60);

    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      window.clearTimeout(settleTimer);
    };
  }, []);

  return null;
}
