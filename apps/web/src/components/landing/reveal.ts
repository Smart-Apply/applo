import type { CSSProperties } from 'react';

/**
 * Inline reveal-delay helper. Drives the CSS `--d` custom property that
 * `home.css` reads to stagger the scroll-reveal transition of `.reveal`
 * elements.
 */
export const revealDelay = (delay: string): CSSProperties =>
  ({ ['--d']: delay }) as CSSProperties;
