/**
 * Static glyphs used across the landing page. Deliberately plain SVG so the
 * sections that render them can stay Server Components.
 */

/** Applo wordmark/logo. `light` flips it for the dark footer. */
export function BrandMark({ light = false }: { light?: boolean }) {
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
export function CheckMark({ color = '#16A34A' }: { color?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** TikTok glyph — lucide-react ships no brand icon for it. */
export function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z" />
    </svg>
  );
}
