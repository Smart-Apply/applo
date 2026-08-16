import { DashboardSkeleton, SkeletonScreen } from '@/components/shared/skeletons';

export default function Loading() {
  return (
    <SkeletonScreen>
      <DashboardSkeleton />
    </SkeletonScreen>
  );
}
