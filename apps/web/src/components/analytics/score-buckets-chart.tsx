/**
 * score-buckets-chart.tsx
 * Vertical bar chart: ATS-score ranges vs. interview rate.
 * Best-performing bucket highlighted darkest; others muted.
 * Place at: apps/web/src/components/analytics/score-buckets-chart.tsx
 */
import { BarChart2, Lightbulb } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricTip } from '@/components/analytics/metric-tip';
import { cn } from '@/lib/utils';
import type { AnalyticsOverview } from '@/types';

interface Props {
  buckets: AnalyticsOverview['scoreBuckets'];
}

export function ScoreBucketsChart({ buckets }: Props) {
  const t = useTranslations('analytics');
  const isEmpty  = !buckets || buckets.length === 0;
  const maxRate  = isEmpty ? 1 : Math.max(...buckets.map(b => b.interviewRate), 1);
  const bestIdx  = isEmpty ? -1
    : buckets.reduce((bi, b, i, a) => (b.interviewRate > a[bi].interviewRate ? i : bi), 0);
  const best     = bestIdx >= 0 ? buckets[bestIdx] : null;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart2 size={17} strokeWidth={2} />
          {t('scoreBuckets.title')}
          <MetricTip
            content={t('scoreBuckets.tipHtml')}
            align="right"
          />
        </CardTitle>
        <CardDescription>
          {t('scoreBuckets.description')}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 pb-4">
        {isEmpty ? (
          <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <BarChart2 size={20} className="text-muted-foreground/40 flex-none" />
            {t('scoreBuckets.empty')}
          </div>
        ) : (
          <>
            {/* Bar chart */}
            <div className="flex items-end gap-3 h-44 pt-2">
              {buckets.map((b, i) => {
                const heightPct = Math.max((b.interviewRate / maxRate) * 100, b.interviewRate > 0 ? 4 : 1.5);
                const isBest    = i === bestIdx;
                return (
                  <div
                    key={b.bucket}
                    className="flex-1 flex flex-col items-center justify-end h-full gap-2 cursor-default"
                    title={t('scoreBuckets.bucketTitle', { bucket: b.bucket, count: b.applications, rate: b.interviewRate })}
                  >
                    <span className={cn(
                      'text-[13px] font-bold tabular-nums',
                      isBest ? 'text-foreground' : 'text-muted-foreground',
                    )}>
                      {b.interviewRate}%
                    </span>
                    <div className="w-full bg-muted flex items-end overflow-hidden" style={{ height: '80%' }}>
                      <div
                        className={cn(
                          'w-full transition-all duration-500',
                          isBest ? 'bg-primary' : 'bg-muted-foreground/40',
                        )}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[11.5px] font-semibold text-muted-foreground tabular-nums">{b.bucket}</span>
                    <span className="text-[10.5px] text-muted-foreground/70 tabular-nums">{t('scoreBuckets.applicationsShort', { count: b.applications })}</span>
                  </div>
                );
              })}
            </div>

            {/* Insight note */}
            {best && best.interviewRate > 0 && (
              <div className="mt-4 flex items-start gap-2 pt-3 border-t border-border text-xs text-muted-foreground leading-relaxed">
                <Lightbulb size={14} className="mt-0.5 flex-none" />
                <span>
                  {t.rich('scoreBuckets.best', {
                    bucket: best.bucket,
                    rate: best.interviewRate,
                    strong: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
                  })}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
