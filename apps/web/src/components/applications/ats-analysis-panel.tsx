'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MatchScoreCard } from './match-score-card';
import { KeywordsOverview } from './keywords-overview';
import { SuggestionsCard } from './suggestions-card';
import { useKeywordsAnalysis, useAnalyzeKeywords } from '@/hooks/use-applications';
import { getIntlLocale } from '@/lib/i18n-runtime';
import { cn } from '@/lib/utils';

interface ATSAnalysisPanelProps {
  applicationId: string;
  className?: string;
  onAnalysisComplete?: () => void;
}

/**
 * Main panel combining all ATS analysis components
 * Shows match score, keywords, and improvement suggestions
 */
export function ATSAnalysisPanel({
  applicationId,
  className,
  onAnalysisComplete,
}: ATSAnalysisPanelProps) {
  const t = useTranslations('applications');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const {
    data: analysis,
    isLoading,
    error,
    refetch,
  } = useKeywordsAnalysis(applicationId);
  
  const analyzeKeywords = useAnalyzeKeywords(applicationId);

  const handleRefreshAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await analyzeKeywords.mutateAsync();
      await refetch();
      onAnalysisComplete?.();
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-4 gap-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="py-12 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center border border-border bg-muted">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">{t('atsPanel.startTitle')}</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            {t('atsPanel.startDescription')}
          </p>
          <Button
            onClick={handleRefreshAnalysis}
            disabled={isAnalyzing || analyzeKeywords.isPending}
          >
            {isAnalyzing || analyzeKeywords.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t('atsPanel.analyzing')}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {t('atsPanel.analyzeNow')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            {t('atsPanel.title')}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    {t('atsPanel.tooltip')}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('atsPanel.analyzedAt', {
              date: new Date(analysis.analyzedAt).toLocaleDateString(getIntlLocale(), {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              }),
            })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAnalysis}
          disabled={isAnalyzing || analyzeKeywords.isPending}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', (isAnalyzing || analyzeKeywords.isPending) && 'animate-spin')} />
          {t('atsPanel.reanalyze')}
        </Button>
      </div>

      {/* Match Score */}
      <MatchScoreCard
        overallScore={analysis.matchAnalysis.overallScore}
        categoryScores={analysis.matchAnalysis.categoryScores}
        strengths={analysis.matchAnalysis.strengths}
        weaknesses={analysis.matchAnalysis.weaknesses}
      />

      {/* Keywords Overview */}
      <KeywordsOverview
        keywords={analysis.keywords}
        matchedKeywords={analysis.matchedKeywords}
        missingKeywords={analysis.missingKeywords}
      />

      {/* Suggestions */}
      <SuggestionsCard
        suggestions={analysis.matchAnalysis.suggestions}
        missingKeywords={analysis.missingKeywords}
      />

      {/* Low score warning */}
      {analysis.matchAnalysis.overallScore < 40 && (
        <Card className="border-[#F3E3B3] bg-[#FDF6E7] dark:border-amber-400/30 dark:bg-amber-400/10">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-[#A16207] dark:text-amber-300" />
              <div>
                <h4 className="font-medium text-[#A16207] dark:text-amber-200">
                  {t('atsPanel.lowScoreTitle')}
                </h4>
                <p className="text-sm text-[#854D0E] dark:text-amber-300/80 mt-1">
                  {t('atsPanel.lowScoreDescription')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
