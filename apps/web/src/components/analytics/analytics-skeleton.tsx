/**
 * analytics-skeleton.tsx
 * Loading state for the full analytics page.
 * Place at: apps/web/src/components/analytics/analytics-skeleton.tsx
 */
import { Skeleton } from '@/components/ui/skeleton';

export function AnalyticsSkeleton() {
  return (
    <div className="container max-w-7xl px-0 py-6 space-y-6">
      {/* header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-80" />
      </div>
      {/* insight */}
      <Skeleton className="h-14 w-full rounded-[4px]" />
      {/* kpi grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-[4px]" />
        ))}
      </div>
      {/* activity chart */}
      <Skeleton className="h-[380px] rounded-[4px]" />
      {/* funnel + buckets */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-[4px]" />
        <Skeleton className="h-64 rounded-[4px]" />
      </div>
      {/* templates */}
      <Skeleton className="h-48 rounded-[4px]" />
    </div>
  );
}
