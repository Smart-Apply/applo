import { FormFieldSkeleton, PageHeaderSkeleton, SkeletonScreen } from '@/components/shared/skeletons';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <SkeletonScreen className="mx-auto max-w-3xl space-y-6">
      <PageHeaderSkeleton />
      {[0, 1].map((card) => (
        <Card key={card}>
          <CardHeader>
            <Skeleton className="h-5 w-44" />
          </CardHeader>
          <CardContent className="space-y-4">
            <FormFieldSkeleton />
            <FormFieldSkeleton />
          </CardContent>
        </Card>
      ))}
    </SkeletonScreen>
  );
}
