import type { SVGProps } from 'react';

/**
 * Applo brand lockup — the mascot mark + "Applo" wordmark as a single
 * self-contained SVG that scales like an image (size it via `className`,
 * e.g. `h-12 w-auto`). The artwork is navy on transparent, mirroring the
 * previous logo bitmap, so existing `brightness-0 invert` usages keep
 * rendering it white on dark surfaces.
 */
export function AppLogo({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 432 140"
      className={className}
      role="img"
      aria-label="Applo"
      fill="none"
      {...rest}
    >
      {/* mascot mark */}
      <g stroke="#15233f" strokeWidth="7" strokeLinecap="round">
        <path d="M58 36 L52 18" />
        <path d="M82 36 L88 18" />
      </g>
      <circle cx="50" cy="14" r="8" fill="#15233f" />
      <circle cx="90" cy="14" r="8" fill="#15233f" />
      <rect x="20" y="64" width="14" height="34" rx="7" fill="#15233f" />
      <rect x="106" y="64" width="14" height="34" rx="7" fill="#15233f" />
      <rect x="30" y="34" width="80" height="84" rx="22" fill="#15233f" />
      <rect x="50" y="52" width="40" height="50" rx="7" fill="#fff" />
      <path d="M56 82 L65 91 L84 70" stroke="#15233f" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      {/* wordmark */}
      <text
        x="156"
        y="101"
        fontFamily="var(--font-inter), Inter, system-ui, sans-serif"
        fontSize="90"
        fontWeight="800"
        letterSpacing="-3"
        fill="#15233f"
      >
        Applo
      </text>
    </svg>
  );
}
