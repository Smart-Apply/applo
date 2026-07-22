'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { InterviewStats } from '@/types';

interface InterviewProgressChartProps {
  stats: InterviewStats;
}

export function InterviewProgressChart({ stats }: InterviewProgressChartProps) {
  const t = useTranslations('interviews');
  // Category scores data for the bar chart
  const categoryData = useMemo(() => {
    const { averageCategoryScores } = stats;
    const categories = [
      { name: t('feedback.categories.communication'), score: averageCategoryScores.communication, color: 'bg-brand' },
      { name: t('feedback.categories.presentation'), score: averageCategoryScores.presentation, color: 'bg-success' },
    ];

    if (averageCategoryScores.technical !== undefined && averageCategoryScores.technical > 0) {
      categories.push({
        name: t('feedback.categories.technical'),
        score: averageCategoryScores.technical,
        color: 'bg-primary',
      });
    }

    if (
      averageCategoryScores.problemSolving !== undefined &&
      averageCategoryScores.problemSolving > 0
    ) {
      categories.push({
        name: t('feedback.categories.problemSolving'),
        score: averageCategoryScores.problemSolving,
        color: 'bg-warning',
      });
    }

    if (averageCategoryScores.cultureFit !== undefined && averageCategoryScores.cultureFit > 0) {
      categories.push({
        name: t('feedback.categories.cultureFit'),
        score: averageCategoryScores.cultureFit,
        color: 'bg-destructive',
      });
    }

    return categories;
  }, [stats, t]);

  // Session type distribution
  const typeDistribution = useMemo(() => {
    const { sessionsByType } = stats;
    const types = [
      { name: t('detail.type.behavioral'), count: sessionsByType.BEHAVIORAL, color: 'bg-brand' },
      { name: t('detail.type.technical'), count: sessionsByType.TECHNICAL, color: 'bg-primary' },
      { name: t('detail.type.caseStudy'), count: sessionsByType.CASE_STUDY, color: 'bg-warning' },
      { name: t('detail.type.mixed'), count: sessionsByType.MIXED, color: 'bg-success' },
    ].filter((t) => t.count > 0);

    const total = types.reduce((sum, t) => sum + t.count, 0);
    return types.map((t) => ({
      ...t,
      percentage: total > 0 ? Math.round((t.count / total) * 100) : 0,
    }));
  }, [stats, t]);

  if (stats.completedSessions === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        {t('progress.noStats')}
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Category Scores */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">
          {t('progress.averageCategoryScores')}
        </h4>
        <div className="space-y-3">
          {categoryData.map((category) => (
            <div key={category.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{category.name}</span>
                <span className="font-medium">{category.score}/100</span>
              </div>
              <div className="h-2 bg-muted overflow-hidden">
                <div
                  className={`h-full ${category.color} transition-all duration-500`}
                  style={{ width: `${category.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interview Type Distribution */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">{t('progress.interviewTypes')}</h4>
        <div className="space-y-3">
          {typeDistribution.map((type) => (
            <div key={type.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{type.name}</span>
                <span className="font-medium">
                  {type.count} ({type.percentage}%)
                </span>
              </div>
              <div className="h-2 bg-muted overflow-hidden">
                <div
                  className={`h-full ${type.color} transition-all duration-500`}
                  style={{ width: `${type.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('progress.mostPracticedType')}</span>
            <span className="font-medium">
              {stats.mostPracticedType === 'BEHAVIORAL' && t('detail.type.behavioralLong')}
              {stats.mostPracticedType === 'TECHNICAL' && t('detail.type.technical')}
              {stats.mostPracticedType === 'CASE_STUDY' && t('detail.type.caseStudy')}
              {stats.mostPracticedType === 'MIXED' && t('detail.type.mixed')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
