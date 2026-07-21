/**
 * insight-strip.tsx
 * Plain-language summary banner rendered at the top of the analytics page.
 * Surfaces the most actionable insight from the data.
 * Place at: apps/web/src/components/analytics/insight-strip.tsx
 */
import { Lightbulb } from 'lucide-react';
import type { AnalyticsOverview } from '@/types';
import { buildFunnel, leakiestStep } from '@/lib/analytics-utils';

interface Props {
  data: AnalyticsOverview;
}

export function InsightStrip({ data }: Props) {
  const funnel = buildFunnel(data.totals);
  const leak   = leakiestStep(funnel);
  const isNew  = data.totals.applications < 8;

  return (
    <div className="flex items-start gap-3 px-4 py-3.5 bg-card border border-border border-l-4 border-l-brand rounded-[4px]">
      <span className="grid place-items-center w-8 h-8 rounded-[2px] bg-primary/10 text-primary flex-none mt-0.5">
        <Lightbulb size={16} strokeWidth={2} />
      </span>

      <p className="text-sm leading-relaxed text-foreground text-balance">
        {isNew ? (
          <>
            Guter Start —{' '}
            <strong className="font-semibold">{data.totals.applications} Bewerbungen</strong>{' '}
            erstellt, davon{' '}
            <strong className="font-semibold">{data.totals.applied} abgeschickt</strong>.{' '}
            <span className="text-muted-foreground">
              Erstelle ein paar mehr, damit aussagekräftige Trends entstehen.
            </span>
          </>
        ) : (
          <>
            Deine Interview-Quote liegt bei{' '}
            <strong className="font-semibold">{data.interviewRate}%</strong>
            {data.interviewRate >= 20 && ' — über dem Durchschnitt'}.
            {leak && (
              <>
                {' '}Die größte Hürde ist{' '}
                <strong className="font-semibold">
                  {leak.from} → {leak.to}
                </strong>{' '}
                ({leak.conv}% gehen weiter).
              </>
            )}
            {' '}
            <span className="text-muted-foreground">
              Tipp: Ein höherer ATS-Score senkt die Abbruchrate spürbar.
            </span>
          </>
        )}
      </p>
    </div>
  );
}
