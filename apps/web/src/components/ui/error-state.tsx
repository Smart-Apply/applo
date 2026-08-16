'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  /** Optional headline. Falls back to a generic "could not be loaded" title. */
  title?: string;
  /** Optional explanation shown below the headline. */
  description?: string;
  /** Retry handler — usually TanStack Query's `refetch`. Hides the button when omitted. */
  onRetry?: () => void;
  /** Shows the button's spinner while a retry is in flight. */
  isRetrying?: boolean;
  className?: string;
}

/**
 * Error counterpart to {@link EmptyState} — shown when a data fetch fails.
 *
 * Same visual rhythm as the empty state (icon tile, headline, description,
 * action) so a failed load reads as a normal page state instead of a crash.
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError, refetch, isFetching } = useApplications();
 *
 * if (isError) {
 *   return <ErrorState onRetry={() => refetch()} isRetrying={isFetching} />;
 * }
 * ```
 */
export function ErrorState({
  title,
  description,
  onRetry,
  isRetrying = false,
  className,
}: ErrorStateProps) {
  const t = useTranslations('common');

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-[4px] border border-[#F3C9C9] bg-[#FDEEEE] px-4 py-12 text-center dark:border-red-400/30 dark:bg-red-400/10',
        className
      )}
    >
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-[4px] border border-[#F3C9C9] bg-background dark:border-red-400/30">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">
        {title ?? t('errorState.title')}
      </h3>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        {description ?? t('errorState.description')}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} disabled={isRetrying}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isRetrying && 'animate-spin')} aria-hidden="true" />
          {t('actions.retry')}
        </Button>
      )}
    </div>
  );
}
