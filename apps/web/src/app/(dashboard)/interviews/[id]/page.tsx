'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useInterviewSession } from '@/hooks/use-interviews';
import { useVoiceInterviewConfig } from '@/hooks/use-voice-interview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  InterviewChat,
  InterviewVoice,
  InterviewFeedbackDisplay,
  InterviewModeSelect,
} from '@/components/interviews';
import { cn } from '@/lib/utils';
import { ArrowLeft, MessageSquare, Mic, Trophy } from 'lucide-react';

const statusVariants = {
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  ABANDONED: 'destructive',
} as const;

const statusLabelKeys = {
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
} as const;

const difficultyLabelKeys = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const;

const typeLabelKeys = {
  BEHAVIORAL: 'behavioral',
  TECHNICAL: 'technical',
  CASE_STUDY: 'caseStudy',
  MIXED: 'mixed',
} as const;

type Mode = 'select' | 'text' | 'voice';

export default function InterviewSessionPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('interviews');
  const sessionId = params.id as string;

  const { data: session, isLoading, refetch } = useInterviewSession(sessionId);
  const isInProgressSession = session?.status === 'IN_PROGRESS';
  const { data: voiceConfig } = useVoiceInterviewConfig({ enabled: isInProgressSession });
  // The user's explicit mode choice — `null` until they pick. Keeping it
  // nullable lets us derive the entry mode below without a setState-in-effect
  // cascade (react-hooks/set-state-in-effect).
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);

  // Resolve the entry mode while the user hasn't chosen yet. Voice unavailable →
  // straight to text. Resuming a session that already has answers → back into
  // the text chat rather than the mode picker. Otherwise show the picker.
  const defaultMode: Mode =
    voiceConfig && !voiceConfig.available
      ? 'text'
      : session && session.answeredCount > 0
        ? 'text'
        : 'select';
  const mode = selectedMode ?? defaultMode;

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container max-w-4xl py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('detail.notFound')}</p>
            <Button variant="outline" onClick={() => router.push('/interviews')} className="mt-4">
              {t('detail.backToOverview')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCompleted = session.status === 'COMPLETED';
  const isInProgress = session.status === 'IN_PROGRESS';
  const voiceAvailable = !!voiceConfig?.available;

  return (
    <div className="container max-w-5xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/interviews')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-heading text-2xl font-extrabold tracking-[-.025em]">{session.jobTitle || t('page.generalInterview')}</h1>
            <Badge variant={statusVariants[session.status]}>{t(`page.status.${statusLabelKeys[session.status]}`)}</Badge>
          </div>
          {session.company && <p className="text-muted-foreground">{session.company}</p>}
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline">{t(`detail.type.${typeLabelKeys[session.type]}`)}</Badge>
            <Badge variant="outline">{t(`detail.difficulty.${difficultyLabelKeys[session.difficulty]}`)}</Badge>
            {session.industry && <Badge variant="outline">{session.industry}</Badge>}
            <Badge variant="outline" className="gap-1">
              <MessageSquare className="h-3 w-3" />
              {t('detail.questionsProgress', {
                answered: session.answeredCount,
                total: session.maxQuestions,
              })}
            </Badge>
            {session.overallScore !== undefined && session.overallScore !== null && (
              <Badge variant="outline" className="gap-1">
                <Trophy className="h-3 w-3 text-[#A16207] dark:text-amber-300" />
                {t('detail.scorePoints', { score: session.overallScore })}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {isInProgress ? (
        mode === 'select' ? (
          <InterviewModeSelect
            voiceAvailable={voiceAvailable}
            remainingMinutes={voiceConfig?.remainingMinutes}
            onSelectText={() => setSelectedMode('text')}
            onSelectVoice={() => setSelectedMode('voice')}
          />
        ) : (
          <div className="space-y-5">
            {/* Shared segmented switch — change mode at any time. */}
            {voiceAvailable && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex gap-1 rounded-[3px] border bg-card p-1.5">
                  {(
                    [
                      { key: 'text' as const, label: t('detail.mode.text'), icon: MessageSquare },
                      { key: 'voice' as const, label: t('detail.mode.voice'), icon: Mic },
                    ]
                  ).map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedMode(key)}
                      className={cn(
                        'inline-flex h-10 items-center gap-2 rounded-[2px] px-4 text-sm font-semibold transition-colors',
                        mode === key
                          ? 'bg-primary text-primary-foreground'
                          : 'text-secondary hover:text-foreground',
                      )}
                    >
                      <Icon className="h-[17px] w-[17px]" />
                      {label}
                    </button>
                  ))}
                </div>
                <span className="text-[13px] text-muted-foreground">
                  {t('detail.modeSwitchHint')}
                </span>
              </div>
            )}

            {mode === 'voice' && voiceAvailable ? (
              <InterviewVoice
                session={session}
                maxSessionMinutes={voiceConfig!.maxSessionMinutes}
                remainingMinutes={voiceConfig!.remainingMinutes}
                onComplete={() => refetch()}
                onSwitchToText={() => setSelectedMode('text')}
              />
            ) : (
              <InterviewChat
                session={session}
                onComplete={() => refetch()}
                onAbandon={() => router.push('/interviews')}
              />
            )}
          </div>
        )
      ) : isCompleted && session.feedback ? (
        <InterviewFeedbackDisplay session={session} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.endedTitle')}</CardTitle>
            <CardDescription>
              {t(
                session.status === 'ABANDONED'
                  ? 'detail.endedDescriptionAbandoned'
                  : 'detail.endedDescriptionEnded',
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {session.status === 'ABANDONED'
                  ? t('detail.endedAbandonedHint')
                  : t('detail.endedCompletedHint')}
              </p>
              <Button onClick={() => router.push('/interviews')}>{t('detail.backToOverview')}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
