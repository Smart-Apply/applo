import { SkeletonScreen } from '@/components/shared/skeletons';
import { AnalyticsSkeleton } from '@/components/analytics/analytics-skeleton';

export default function Loading() {
  return (
    <SkeletonScreen>
      <AnalyticsSkeleton />
    </SkeletonScreen>
  );
}
