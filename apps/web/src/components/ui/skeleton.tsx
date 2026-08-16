import { cn } from "@/lib/utils"

/**
 * A single shimmering placeholder block.
 *
 * Intentionally decorative (`aria-hidden`): a page skeleton is built from
 * dozens of these, and giving every one `role="status"` made screen readers
 * announce the same loading string dozens of times. Wrap a group in
 * <SkeletonScreen> instead — it owns the single localized live region for the
 * whole loading area.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden motion-shimmer animate-pulse rounded-md bg-muted",
        className
      )}
      aria-hidden="true"
      {...props}
    />
  )
}

export { Skeleton }
