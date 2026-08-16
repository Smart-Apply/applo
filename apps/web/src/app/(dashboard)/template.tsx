/**
 * Route transition for every dashboard page.
 *
 * `template.tsx` (unlike `layout.tsx`) is re-created on navigation, which
 * restarts the CSS enter animation without any client-side JS — this file
 * stays a Server Component, so the transition costs 0 kB in the bundle.
 *
 * Verified: templates are keyed by pathname only, so `?section=`/`?status=`
 * navigations (settings sections, application filters) do NOT remount and
 * therefore never discard in-progress form state.
 *
 * `.motion-page-enter` animates opacity + transform only (never layout), so
 * the transition cannot contribute to CLS, and it honours
 * `prefers-reduced-motion` through the global guard in `globals.css`.
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="motion-page-enter">{children}</div>;
}
