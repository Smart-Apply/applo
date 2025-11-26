'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Brain,
  Users,
  Briefcase,
  Building2,
} from 'lucide-react';
import type { CategoryScores } from '@/types';
import { cn } from '@/lib/utils';

interface MatchScoreCardProps {
  overallScore: number;
  categoryScores: CategoryScores;
  strengths?: string[];
  weaknesses?: string[];
  className?: string;
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 40) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

const getProgressColor = (score: number): string => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
};

const getScoreLabel = (score: number): string => {
  if (score >= 80) return 'Ausgezeichnet';
  if (score >= 60) return 'Gut';
  if (score >= 40) return 'Ausbaufähig';
  return 'Niedrig';
};

const categoryConfig = {
  technical: {
    label: 'Technische Skills',
    icon: Brain,
    description: 'Programmiersprachen, Frameworks, Tools',
  },
  soft: {
    label: 'Soft Skills',
    icon: Users,
    description: 'Teamarbeit, Kommunikation, Leadership',
  },
  experience: {
    label: 'Erfahrung',
    icon: Briefcase,
    description: 'Berufserfahrung und Seniorität',
  },
  industry: {
    label: 'Branche',
    icon: Building2,
    description: 'Branchenwissen und Domänenexpertise',
  },
};

export function MatchScoreCard({
  overallScore,
  categoryScores,
  strengths = [],
  weaknesses = [],
  className,
}: MatchScoreCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          Profil-Match-Analyse
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center p-6 bg-muted/50 rounded-lg">
          <div className={cn('text-5xl font-bold mb-2', getScoreColor(overallScore))}>
            {Math.round(overallScore)}%
          </div>
          <Badge variant="secondary" className="text-sm">
            {getScoreLabel(overallScore)}
          </Badge>
          <p className="text-sm text-muted-foreground mt-2">
            Gesamtübereinstimmung mit der Stellenausschreibung
          </p>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Kategorien
          </h4>
          {Object.entries(categoryScores).map(([key, score]) => {
            const config = categoryConfig[key as keyof typeof categoryConfig];
            if (!config) return null;
            const Icon = config.icon;

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <span className={cn('text-sm font-semibold', getScoreColor(score))}>
                    {Math.round(score)}%
                  </span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn('h-full transition-all duration-500', getProgressColor(score))}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            );
          })}
        </div>

        {/* Strengths & Weaknesses */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {strengths.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 font-medium text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Stärken
                </h4>
                <ul className="space-y-1">
                  {strengths.slice(0, 4).map((strength, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {weaknesses.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 font-medium text-sm text-orange-600 dark:text-orange-400">
                  <AlertCircle className="h-4 w-4" />
                  Verbesserungspotenzial
                </h4>
                <ul className="space-y-1">
                  {weaknesses.slice(0, 4).map((weakness, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-orange-500 mt-1">•</span>
                      {weakness}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
