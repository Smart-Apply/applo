'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Trophy, TrendingUp, TrendingDown, Target } from 'lucide-react';
import type { InterviewStats } from '@/types';

interface InterviewStatsCardsProps {
  stats: InterviewStats;
}

export function InterviewStatsCards({ stats }: InterviewStatsCardsProps) {
  const improvementColor =
    stats.scoreImprovement > 0
      ? 'text-success'
      : stats.scoreImprovement < 0
      ? 'text-destructive'
      : 'text-muted-foreground';

  const improvementSymbol = stats.scoreImprovement > 0 ? '+' : '';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Abgeschlossene Sessions</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-2xl font-bold tabular-nums">{stats.completedSessions}</div>
          <p className="text-xs text-muted-foreground">
            von {stats.totalSessions} Sessions insgesamt
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Durchschnittlicher Score</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-2xl font-bold tabular-nums">
            {stats.averageScore > 0 ? `${stats.averageScore}/100` : '—'}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.totalQuestionsAnswered} Fragen beantwortet
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Bester Score</CardTitle>
          <Trophy className="h-4 w-4 text-[#A16207] dark:text-amber-300" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-2xl font-bold tabular-nums">
            {stats.bestScore > 0 ? `${stats.bestScore}/100` : '—'}
          </div>
          <p className="text-xs text-muted-foreground">
            Ihr persönlicher Rekord
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Verbesserung</CardTitle>
          {stats.scoreImprovement < 0 ? (
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`font-mono text-2xl font-bold tabular-nums ${improvementColor}`}>
            {stats.scoredSessions >= 4
              ? `${improvementSymbol}${stats.scoreImprovement}`
              : '—'}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.scoredSessions >= 4
              ? 'Punkte seit Beginn'
              : 'Mind. 4 Sessions benötigt'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
