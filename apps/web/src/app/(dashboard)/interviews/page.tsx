'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useInterviewSessions, useInterviewStats, useStartInterview } from '@/hooks/use-interviews';
import { useFeatureGate } from '@/hooks/use-tier-gate';
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

const SESSION_FILTERS: [string, string][] = [
  ['all', 'Alle'],
  ['IN_PROGRESS', 'Laufend'],
  ['COMPLETED', 'Abgeschlossen'],
  ['ABANDONED', 'Abgebrochen'],
];

/** Score → badge colour, matching the design's green/amber/red tiers. */
function scoreTone(score: number): string {
  if (score >= 85) return 'bg-green-100 text-green-700';
  if (score >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
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
    <div className="flex flex-1 items-center gap-3 p-4">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0">
        <div className={cn('text-xl font-bold leading-none', good && 'text-green-600')}>
          {value}
        </div>
        <div className="mt-1 truncate text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: InterviewSession }) {
  const router = useRouter();
  const running = session.status === 'IN_PROGRESS';
  const score = session.overallScore;
  const meta = [
    session.company,
    `${session.maxQuestions} Fragen`,
    new Date(session.startedAt).toLocaleDateString('de-DE'),
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
      className="group flex cursor-pointer items-center gap-4 py-3 outline-none"
    >
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <MessageSquare className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          {session.jobTitle || 'Allgemeines Interview'}
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</div>
      </div>
      {running ? (
        <span className="flex flex-none items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          <Loader2 className="h-3 w-3 animate-spin" /> Laufend
        </span>
      ) : session.status === 'ABANDONED' ? (
        <span className="flex-none text-xs text-muted-foreground">Abgebrochen</span>
      ) : score != null && score > 0 ? (
        <span
          className={cn(
            'flex-none rounded-full px-2.5 py-1 text-xs font-bold',
            scoreTone(score)
          )}
        >
          {score}%
        </span>
      ) : null}
      <span className="flex-none text-muted-foreground transition-colors group-hover:text-foreground">
        {running ? <ArrowRight className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
      </span>
    </div>
  );
}

function SessionRowsSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <Skeleton className="h-10 w-10 flex-none rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      ))}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col divide-y rounded-xl border bg-card sm:flex-row sm:divide-x sm:divide-y-0">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-1 items-center gap-3 p-4">
            <Skeleton className="h-9 w-9 flex-none rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="p-5">
            <SessionRowsSkeleton />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="mx-auto mt-4 h-5 w-2/3" />
            <Skeleton className="mx-auto mt-2 h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function InterviewsPage() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

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
    <div className="container max-w-7xl py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interview Coach</h1>
          <p className="text-muted-foreground">
            Üben Sie Vorstellungsgespräche mit KI-gestütztem Feedback
          </p>
        </div>
        {isLocked ? (
          <Button asChild className="gap-2">
            <Link href="/#pricing">
              <Lock className="h-4 w-4" />
              Premium freischalten
            </Link>
          </Button>
        ) : (
          !showIntro && (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Play className="h-4 w-4" />
              Neues Interview starten
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
                <div className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card shadow-sm sm:flex-row sm:divide-x sm:divide-y-0">
                  <StatCell
                    icon={<MessageSquare className="h-5 w-5" />}
                    value={stats.completedSessions}
                    label="Abgeschlossene Sessions"
                  />
                  <StatCell
                    icon={<Target className="h-5 w-5" />}
                    value={stats.averageScore > 0 ? `${stats.averageScore}%` : '—'}
                    label={`Ø Score · ${stats.totalQuestionsAnswered} Fragen`}
                  />
                  <StatCell
                    icon={<Trophy className="h-5 w-5" />}
                    value={stats.bestScore > 0 ? `${stats.bestScore}%` : '—'}
                    label="Bester Score"
                    good
                  />
                  <StatCell
                    icon={<TrendingUp className="h-5 w-5" />}
                    value={
                      stats.scoredSessions >= 4
                        ? `${stats.scoreImprovement > 0 ? '+' : ''}${stats.scoreImprovement}`
                        : '—'
                    }
                    label={stats.scoredSessions >= 4 ? 'Verbesserung' : 'Mind. 4 Sessions'}
                    good={stats.scoredSessions >= 4 && stats.scoreImprovement >= 0}
                  />
                </div>

                {/* Sessions + next-round sidebar */}
                <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-base font-semibold">Letzte Sessions</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {SESSION_FILTERS.map(([id, label]) => (
                            <button
                              key={id}
                              onClick={() => setActiveTab(id)}
                              className={cn(
                                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
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

                      <div className="mt-2 divide-y">
                        {sessionsLoading ? (
                          <SessionRowsSkeleton />
                        ) : sessionsData?.sessions?.length ? (
                          sessionsData.sessions.map((session: InterviewSession) => (
                            <SessionRow key={session.id} session={session} />
                          ))
                        ) : (
                          <p className="py-10 text-center text-sm text-muted-foreground">
                            Keine Sessions mit diesem Status.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="flex h-full flex-col p-5">
                      <div
                        className="grid h-28 place-items-center rounded-xl"
                        style={{
                          background:
                            'radial-gradient(55% 60% at 50% 45%, rgba(59,130,246,0.10) 0%, transparent 72%)',
                        }}
                      >
                        <Applo state="success" size={92} aria-hidden />
                      </div>
                      <h3 className="mt-2 text-center text-lg font-semibold">
                        Bereit für die nächste Runde?
                      </h3>
                      <p className="mb-4 mt-1 text-center text-sm text-muted-foreground">
                        Übe gezielt weiter — mit jeder Runde wirst du besser.
                      </p>

                      <button
                        onClick={() => setDialogOpen(true)}
                        className="mb-2.5 flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-muted text-foreground">
                          <MessageSquare className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">Freies Interview</span>
                          <span className="block text-xs text-muted-foreground">
                            Für eine beliebige Position üben
                          </span>
                        </span>
                      </button>
                      <button
                        onClick={() => setDialogOpen(true)}
                        className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-muted text-foreground">
                          <RefreshCw className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">
                            Basierend auf Bewerbung
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            Fragen aus einer echten Stelle
                          </span>
                        </span>
                      </button>

                      <Button
                        onClick={() => setDialogOpen(true)}
                        className="mt-auto w-full gap-2"
                        size="lg"
                      >
                        <Play className="h-4 w-4" />
                        Neues Interview starten
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
                  aria-label="Nur in Premium verfügbar – jetzt upgraden"
                  className="absolute inset-0 z-10 flex cursor-not-allowed items-start justify-center rounded-lg pt-12"
                >
                  <span className="rounded-full border border-amber-300 bg-amber-100/95 px-4 py-2 text-sm font-medium text-amber-900 shadow-sm backdrop-blur">
                    <Lock className="mr-1 inline h-4 w-4" />
                    Nur in Premium verfügbar
                  </span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-center">
                Nur in Premium verfügbar. Klicke, um zu upgraden.
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
