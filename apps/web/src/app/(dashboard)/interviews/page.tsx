'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useInterviewSessions, useInterviewStats, useStartInterview } from '@/hooks/use-interviews';
import { useFeatureGate } from '@/hooks/use-tier-gate';
import { getIntlLocale } from '@/lib/i18n-runtime';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { StartInterviewDialog } from '@/components/interviews/start-interview-dialog';
import { InterviewIntro } from '@/components/interviews/interview-intro';
import { Applo } from '@/components/interviews/applo';
import {
  MessageSquare,
  Play,
  Trophy,
  Target,
  TrendingUp,
  Loader2,
  Lock,
  RefreshCw,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import type { InterviewSession, InterviewSessionStatus } from '@/types';

/** Score → badge colour, matching the design's green/amber/red tiers. */
function scoreTone(score: number): string {
  if (score >= 85)
    return 'border-[#BFE9CC] bg-[#ECFAF0] text-success dark:border-green-400/30 dark:bg-green-400/10';
  if (score >= 60)
    return 'border-[#F3E3B3] bg-[#FDF6E7] text-[#A16207] dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300';
  return 'border-[#F3C9C9] bg-[#FDEEEE] text-destructive dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300';
}

function StatCell({
  icon,
  value,
  label,
  good,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  good?: boolean;
}) {
  return (
    <div className="flex flex-1 items-center gap-4 p-6">
      <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[3px] bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0">
        <div className={cn('font-mono text-3xl font-bold leading-none tabular-nums', good && 'text-success')}>
          {value}
        </div>
        <div className="mt-1.5 truncate text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: InterviewSession }) {
  const router = useRouter();
  const t = useTranslations('interviews');
  const running = session.status === 'IN_PROGRESS';
  const score = session.overallScore;
  const meta = [
    session.company,
    t('page.sessionQuestions', { count: session.maxQuestions }),
    new Date(session.startedAt).toLocaleDateString(getIntlLocale()),
  ]
    .filter(Boolean)
    .join(' · ');

  const open = () => router.push(`/interviews/${session.id}`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      className="group flex cursor-pointer items-center gap-4 py-4 outline-none"
    >
      <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[3px] bg-muted text-muted-foreground">
        <MessageSquare className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">
          {session.jobTitle || t('page.generalInterview')}
        </div>
        <div className="mt-0.5 truncate text-sm text-muted-foreground">{meta}</div>
      </div>
      {running ? (
        <span className="flex flex-none items-center gap-1.5 rounded-[2px] border border-primary-soft bg-primary-soft/40 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[.05em] text-foreground dark:border-slate-600 dark:bg-slate-800/60">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" /> {t('page.status.inProgress')}
        </span>
      ) : session.status === 'ABANDONED' ? (
        <span className="flex-none text-sm text-muted-foreground">{t('page.status.abandoned')}</span>
      ) : score != null && score > 0 ? (
        <span
          className={cn(
            'flex-none rounded-[2px] border px-2.5 py-1 font-mono text-[11px] font-semibold tabular-nums tracking-[.05em]',
            scoreTone(score)
          )}
        >
          {score}%
        </span>
      ) : null}
      <span className="flex-none text-muted-foreground transition-colors group-hover:text-foreground">
        {running ? <ArrowRight className="h-5 w-5" /> : <ExternalLink className="h-5 w-5" />}
      </span>
    </div>
  );
}

function SessionRowsSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 py-4">
          <Skeleton className="h-12 w-12 flex-none rounded-[3px]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-7 w-14 rounded-[2px]" />
        </div>
      ))}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col divide-y rounded-[4px] border bg-card sm:flex-row sm:divide-x sm:divide-y-0">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-1 items-center gap-3 p-4">
            <Skeleton className="h-9 w-9 flex-none rounded-[3px]" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:min-h-[34rem]">
        <Card>
          <CardContent className="p-6">
            <SessionRowsSkeleton />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-36 w-full rounded-[4px]" />
            <Skeleton className="mx-auto mt-4 h-6 w-2/3" />
            <Skeleton className="mx-auto mt-2 h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function InterviewsPage() {
  const router = useRouter();
  const t = useTranslations('interviews');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const sessionFilters: [string, string][] = [
    ['all', t('page.filters.all')],
    ['IN_PROGRESS', t('page.filters.inProgress')],
    ['COMPLETED', t('page.filters.completed')],
    ['ABANDONED', t('page.filters.abandoned')],
  ];

  // Premium gate. We render the full page UI even for FREE users so they
  // can see what they would unlock, but:
  //  - the interactive surface is greyed out and pointer-events disabled
  //  - hovering the locked area shows "Nur in Premium verfügbar"
  //  - the underlying API calls are skipped (they would 403 anyway, and
  //    each 403 used to flood the console).
  const { hasAccess: hasInterviewCoach, isLoading: isLoadingTier } =
    useFeatureGate('interviewCoach');
  const isLocked = !isLoadingTier && !hasInterviewCoach;

  const statusFilter = activeTab === 'all' ? undefined : (activeTab as InterviewSessionStatus);
  const { data: sessionsData, isLoading: sessionsLoading } = useInterviewSessions({
    status: statusFilter,
    enabled: hasInterviewCoach,
  });
  const { data: stats } = useInterviewStats({
    enabled: hasInterviewCoach,
  });
  const startInterview = useStartInterview();

  const handleStartInterview = async (data: Parameters<typeof startInterview.mutateAsync>[0]) => {
    const session = await startInterview.mutateAsync(data);
    setDialogOpen(false);
    router.push(`/interviews/${session.id}`);
  };

  // First-time experience: a user who has never run a session (or any FREE
  // user behind the lock) sees the guided 3-step tutorial. Once at least one
  // session exists (even an abandoned one), the redesigned dashboard — stat
  // strip + recent sessions + Applo "next round" sidebar — takes over. That
  // redesigned view *is* how returning users experience the new look, so no
  // manual tutorial toggle is needed.
  const hasNoSessions = !!stats && stats.totalSessions === 0;
  const showIntro = isLocked || hasNoSessions;

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-[-.025em]">Interview Coach</h1>
          <p className="mt-1 text-muted-foreground">
            {t('page.subtitle')}
          </p>
        </div>
        {isLocked ? (
          <Button asChild size="lg" className="gap-2">
            <Link href="/#pricing">
              <Lock className="h-4 w-4" />
              {t('page.unlockPremium')}
            </Link>
          </Button>
        ) : (
          !showIntro && (
            <Button onClick={() => setDialogOpen(true)} size="lg" className="gap-2">
              <Play className="h-4 w-4" />
              {t('page.startNew')}
            </Button>
          )
        )}
      </div>

      {/* Locked overlay wraps the rest of the page for FREE users.
          The inner div is visually dimmed and pointer-events: none, while
          a transparent absolutely-positioned layer captures hover so the
          tooltip "Nur in Premium verfügbar" can appear. */}
      <TooltipProvider delayDuration={150}>
        <div className="relative">
          <div
            className={
              isLocked
                ? 'pointer-events-none select-none opacity-50 grayscale transition-opacity'
                : ''
            }
            aria-hidden={isLocked}
          >
            {/* First-time tutorial (also shown behind the lock for FREE users
                so they preview the experience) vs. the returning layout. */}
            {showIntro ? (
              <InterviewIntro onStart={() => setDialogOpen(true)} />
            ) : !stats ? (
              <DashboardSkeleton />
            ) : (
              <div className="space-y-6">
                {/* Stat strip */}
                <div className="flex flex-col divide-y overflow-hidden rounded-[4px] border bg-card sm:flex-row sm:divide-x sm:divide-y-0">
                  <StatCell
                    icon={<MessageSquare className="h-5 w-5" />}
                    value={stats.completedSessions}
                    label={t('stats.completedSessions')}
                  />
                  <StatCell
                    icon={<Target className="h-5 w-5" />}
                    value={stats.averageScore > 0 ? `${stats.averageScore}%` : '—'}
                    label={t('stats.averageScoreWithQuestions', {
                      count: stats.totalQuestionsAnswered,
                    })}
                  />
                  <StatCell
                    icon={<Trophy className="h-5 w-5" />}
                    value={stats.bestScore > 0 ? `${stats.bestScore}%` : '—'}
                    label={t('stats.bestScore')}
                    good
                  />
                  <StatCell
                    icon={<TrendingUp className="h-5 w-5" />}
                    value={
                      stats.scoredSessions >= 4
                        ? `${stats.scoreImprovement > 0 ? '+' : ''}${stats.scoreImprovement}`
                        : '—'
                    }
                    label={
                      stats.scoredSessions >= 4
                        ? t('stats.improvement')
                        : t('stats.minimumSessions')
                    }
                    good={stats.scoredSessions >= 4 && stats.scoreImprovement >= 0}
                  />
                </div>

                {/* Sessions + next-round sidebar */}
                <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:min-h-[34rem]">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold">{t('page.recentSessions')}</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {sessionFilters.map(([id, label]) => (
                            <button
                              key={id}
                              onClick={() => setActiveTab(id)}
                              className={cn(
                                'rounded-[3px] border px-3.5 py-2 text-sm font-medium transition-colors',
                                activeTab === id
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:border-muted-foreground/40'
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 divide-y">
                        {sessionsLoading ? (
                          <SessionRowsSkeleton />
                        ) : sessionsData?.sessions?.length ? (
                          sessionsData.sessions.map((session: InterviewSession) => (
                            <SessionRow key={session.id} session={session} />
                          ))
                        ) : (
                          <p className="py-12 text-center text-sm text-muted-foreground">
                            {t('page.noSessionsForStatus')}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="flex h-full flex-col p-6">
                      <div className="grid h-36 place-items-center rounded-[4px]">
                        <Applo state="success" size={116} aria-hidden />
                      </div>
                      <h3 className="mt-3 text-center text-xl font-semibold">
                        {t('page.nextRoundTitle')}
                      </h3>
                      <p className="mb-5 mt-1.5 text-center text-sm text-muted-foreground">
                        {t('page.nextRoundDescription')}
                      </p>

                      <button
                        onClick={() => setDialogOpen(true)}
                        className="mb-3 flex w-full items-center gap-3 rounded-[3px] border bg-card p-3.5 text-left transition-colors hover:bg-muted/50"
                      >
                        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[3px] bg-muted text-foreground">
                          <MessageSquare className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block text-[15px] font-semibold">{t('page.freeInterview')}</span>
                          <span className="block text-xs text-muted-foreground">
                            {t('page.freeInterviewDescription')}
                          </span>
                        </span>
                      </button>
                      <button
                        onClick={() => setDialogOpen(true)}
                        className="flex w-full items-center gap-3 rounded-[3px] border bg-card p-3.5 text-left transition-colors hover:bg-muted/50"
                      >
                        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[3px] bg-muted text-foreground">
                          <RefreshCw className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block text-[15px] font-semibold">
                            {t('page.applicationBased')}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {t('page.applicationBasedDescription')}
                          </span>
                        </span>
                      </button>

                      <Button
                        onClick={() => setDialogOpen(true)}
                        className="mt-auto w-full gap-2"
                        size="lg"
                      >
                        <Play className="h-4 w-4" />
                        {t('page.startNew')}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>

          {/* Hover-trigger overlay: covers the dimmed area and shows the
              tooltip on hover. Sits above the dimmed content (which has
              pointer-events: none) so it always wins for hover/click.
              Clicking jumps to the pricing page. */}
          {isLocked && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/#pricing"
                  aria-label={t('page.lockedAria')}
                  className="absolute inset-0 z-10 flex cursor-not-allowed items-start justify-center rounded-[3px] pt-12"
                >
                  <span className="rounded-[2px] border border-[#F3E3B3] bg-[#FDF6E7]/95 px-4 py-2 text-sm font-medium text-[#854D0E] shadow-sm backdrop-blur dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300/90">
                    <Lock className="mr-1 inline h-4 w-4" />
                    {t('page.premiumOnly')}
                  </span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-center">
                {t('page.premiumTooltip')}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>

      {/* Start Interview Dialog */}
      {!isLocked && (
        <StartInterviewDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onStart={handleStartInterview}
          isLoading={startInterview.isPending}
        />
      )}
    </div>
  );
}
