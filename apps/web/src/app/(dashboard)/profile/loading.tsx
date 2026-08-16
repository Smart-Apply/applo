import { ProfileSkeleton, SkeletonScreen } from '@/components/shared/skeletons';

export default function Loading() {
  return (
    <SkeletonScreen>
      <ProfileSkeleton />
    </SkeletonScreen>
  );
}
