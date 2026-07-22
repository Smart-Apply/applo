/**
 * insight-strip.tsx
 * Plain-language summary banner rendered at the top of the analytics page.
 * Surfaces the most actionable insight from the data.
 * Place at: apps/web/src/components/analytics/insight-strip.tsx
 */
import { Lightbulb } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AnalyticsOverview } from '@/types';
import { buildFunnel, leakiestStep } from '@/lib/analytics-utils';

interface Props {
  data: AnalyticsOverview;
}

export function InsightStrip({ data }: Props) {
  const t = useTranslations('analytics');
  const funnel = buildFunnel(data.totals);
  const leak   = leakiestStep(funnel);
  const isNew  = data.totals.applications < 8;
  const stageLabel = (label: string) =>
    t(`stages.${funnel.find((stage) => stage.label === label)?.key ?? 'CREATED'}`);

  return (
    <div className="flex items-start gap-3 px-4 py-3.5 bg-card border border-border border-l-4 border-l-brand rounded-[4px]">
      <span className="grid place-items-center w-8 h-8 rounded-[2px] bg-primary/10 text-primary flex-none mt-0.5">
        <Lightbulb size={16} strokeWidth={2} />
      </span>

      <p className="text-sm leading-relaxed text-foreground text-balance">
        {isNew ? (
          <>
            {t.rich('insight.new', {
              applications: data.totals.applications,
              applied: data.totals.applied,
              strong: (chunks) => <strong className="font-semibold">{chunks}</strong>,
              muted: (chunks) => <span className="text-muted-foreground">{chunks}</span>,
            })}
          </>
        ) : (
          <>
            {t.rich(data.interviewRate >= 20 ? 'insight.establishedAboveAverage' : 'insight.established', {
              rate: data.interviewRate,
              strong: (chunks) => <strong className="font-semibold">{chunks}</strong>,
            })}
            {leak && (
              <>
                {' '}{t('insight.biggestHurdle')}{' '}
                <strong className="font-semibold">
                  {stageLabel(leak.from)} → {stageLabel(leak.to)}
                </strong>{' '}
                {t('insight.continue', { value: leak.conv })}
              </>
            )}
            {' '}
            <span className="text-muted-foreground">
              {t('insight.tip')}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
