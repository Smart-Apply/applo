import { ListPageSkeleton, SkeletonScreen } from '@/components/shared/skeletons';

export default function Loading() {
  return (
    <SkeletonScreen>
      <ListPageSkeleton rows={4} />
    </SkeletonScreen>
  );
}
