import { ListPageSkeleton, SkeletonScreen } from '@/components/shared/skeletons';

export default function Loading() {
  return (
    <SkeletonScreen>
      <ListPageSkeleton rows={3} />
    </SkeletonScreen>
  );
}
