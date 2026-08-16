import { PageHeaderSkeleton, SkeletonScreen } from '@/components/shared/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <SkeletonScreen className="mx-auto max-w-3xl space-y-8">
      <PageHeaderSkeleton />
      <Skeleton className="h-64 w-full rounded-[4px]" />
      <Skeleton className="h-32 w-full rounded-[4px]" />
    </SkeletonScreen>
  );
}
