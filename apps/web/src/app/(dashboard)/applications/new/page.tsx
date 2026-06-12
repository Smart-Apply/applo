'use client';
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ApplicationWizard } from '@/components/forms/application-wizard';
import { useJobPosting } from '@/hooks/use-job-postings';
import { CenteredLoader } from '@/components/shared/loading';

function NewApplicationContent() {
  const searchParams = useSearchParams();
  const jobPostingId = searchParams.get('jobPostingId') ?? undefined;

  const { data: prefetchedJob, isLoading: isLoadingJob } = useJobPosting(
    jobPostingId ?? '',
  );

  // When ?jobPostingId is supplied (e.g. from the LinkedIn job-search flow),
  // wait for the JobPosting to load so we can hand it to the wizard and
  // skip the first step.
  const waitingForPrefetch = !!jobPostingId && isLoadingJob;

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {waitingForPrefetch ? (
        <CenteredLoader />
      ) : (
        <ApplicationWizard initialJobPosting={prefetchedJob ?? null} />
      )}
    </div>
  );
}

export default function NewApplicationPage() {
  return (
    <Suspense fallback={<CenteredLoader />}>
      <NewApplicationContent />
    </Suspense>
  );
}

