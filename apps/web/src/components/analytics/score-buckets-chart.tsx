/**
 * score-buckets-chart.tsx
 * Vertical bar chart: ATS-score ranges vs. interview rate.
 * Best-performing bucket highlighted darkest; others muted.
 * Place at: apps/web/src/components/analytics/score-buckets-chart.tsx
 */
import { BarChart2, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricTip } from '@/components/analytics/metric-tip';
import { cn } from '@/lib/utils';
import type { AnalyticsOverview } from '@/types';

interface Props {
  buckets: AnalyticsOverview['scoreBuckets'];
}

export function ScoreBucketsChart({ buckets }: Props) {
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
          ATS-Score &amp; Interviews
          <MetricTip
            content="Wir gruppieren deine abgeschickten Bewerbungen nach <b>ATS-Score</b> und zeigen je Gruppe die Interview-Quote. Ziel: möglichst viele Bewerbungen im grünen Bereich (80+)."
            align="right"
          />
        </CardTitle>
        <CardDescription>
          Welche Score-Bereiche am häufigsten zum Interview führen.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 pb-4">
        {isEmpty ? (
          <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <BarChart2 size={20} className="text-muted-foreground/40 flex-none" />
            Sobald du Bewerbungen mit ATS-Score erstellst, zeigen wir hier,
            welche Score-Bereiche die meisten Interviews bringen.
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
                    title={`${b.bucket} Pkt. · ${b.applications} Bewerbungen · ${b.interviewRate}% Interview-Quote`}
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
                    <span className="text-[10.5px] text-muted-foreground/70 tabular-nums">{b.applications} Bew.</span>
                  </div>
                );
              })}
            </div>

            {/* Insight note */}
            {best && best.interviewRate > 0 && (
              <div className="mt-4 flex items-start gap-2 pt-3 border-t border-border text-xs text-muted-foreground leading-relaxed">
                <Lightbulb size={14} className="mt-0.5 flex-none" />
                <span>
                  Bewerbungen mit{' '}
                  <strong className="font-semibold text-foreground">
                    {best.bucket} Punkten
                  </strong>{' '}
                  erreichen die höchste Interview-Quote ({best.interviewRate}%).
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
