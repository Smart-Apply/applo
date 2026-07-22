/**
 * funnel-card.tsx
 * Conversion funnel with per-step drop-off connectors.
 * Clicking a stage navigates to the filtered application list.
 * Place at: apps/web/src/components/analytics/funnel-card.tsx
 */
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TrendingUp, ChevronRight, ArrowDown, Lightbulb, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricTip } from '@/components/analytics/metric-tip';
import { FUNNEL_BAR_COLORS, leakiestStep } from '@/lib/analytics-utils';
import { cn } from '@/lib/utils';
import type { FunnelStage } from '@/lib/analytics-utils';

interface Props {
  funnel: FunnelStage[];
  /**
   * Called when the user clicks a stage button.
   * Wire to: router.push(`/applications?status=${stage.toLowerCase()}`)
   * Adjust the status param to match your applications-list filter key.
   */
  onStageClick?: (stageKey: FunnelStage['key']) => void;
}

export function FunnelCard({ funnel, onStageClick }: Props) {
  const t = useTranslations('analytics');
  const [selected, setSelected] = useState<FunnelStage['key'] | null>(null);
  const max  = Math.max(...funnel.map(s => s.count), 1);
  const leak = leakiestStep(funnel);
  const sel  = selected ? funnel.find(f => f.key === selected) : null;
  const stageLabel = (key: FunnelStage['key']) => t(`stages.${key}`);

  const handleClick = (key: FunnelStage['key']) => {
    setSelected(prev => (prev === key ? null : key));
    onStageClick?.(key);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp size={17} strokeWidth={2} />
          {t('funnel.title')}
          <MetricTip content={t('funnel.tipHtml')} />
        </CardTitle>
        <CardDescription>
          {t('funnel.description')}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 pb-4">
        <div className="space-y-0">
          {funnel.map((stage, i) => {
            const widthPct = Math.max(stage.count > 0 ? (stage.count / max) * 100 : 0, 2);
            const color    = FUNNEL_BAR_COLORS[stage.key];
            const isSel    = selected === stage.key;

            return (
              <div key={stage.key}>
                {/* Stage row */}
                <button
                  type="button"
                  onClick={() => handleClick(stage.key)}
                  className={cn(
                    'relative w-full text-left px-3 py-3 rounded-[3px] transition-colors group',
                    isSel ? 'bg-accent/10' : 'hover:bg-muted/50',
                  )}
                >
                  {/* Label + counts */}
                  <div className="flex items-baseline justify-between mb-2.5 gap-3">
                    <span className="flex items-center gap-2 text-[13.5px] font-semibold text-foreground">
                      <span className="w-2 h-2 rounded-[3px] flex-none" style={{ background: color }} />
                      {stageLabel(stage.key)}
                    </span>
                    <span className="flex items-center gap-2 text-[13px]">
                      <span className="font-bold tabular-nums">{stage.count}</span>
                      {stage.conv != null && (
                        <span className="rounded-[2px] bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground tabular-nums">
                          {stage.conv}%
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Horizontal bar */}
                  <div className="h-3 bg-muted overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${widthPct}%`,
                        background: isSel ? 'var(--accent)' : color,
                      }}
                    />
                  </div>

                  {/* Arrow-right on hover/selected */}
                  <span className={cn(
                    'absolute right-3 top-1/2 -translate-y-1/2 transition-opacity',
                    isSel ? 'opacity-100 text-accent' : 'opacity-0 group-hover:opacity-60',
                  )}>
                    <ChevronRight size={16} />
                  </span>
                </button>

                {/* Step connector */}
                {i < funnel.length - 1 && (
                  <div className="flex items-center gap-1.5 px-4 py-1 text-[11.5px] text-muted-foreground">
                    <ArrowDown size={12} className="text-muted-foreground/50" />
                    {(() => {
                      const nextConversion = funnel[i + 1].conv;
                      return nextConversion == null ? null : (
                        <span>{t('funnel.continue', { value: nextConversion })}</span>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contextual note */}
        <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
          {sel ? (
            <>
              <ArrowRight size={14} className="text-accent mt-0.5 flex-none" />
              <span>
                {t.rich('funnel.opensStatus', {
                  count: sel.count,
                  status: stageLabel(sel.key),
                  strong: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
                })}
              </span>
            </>
          ) : leak ? (
            <>
              <Lightbulb size={14} className="mt-0.5 flex-none" />
              <span>
                {t('funnel.biggestDropAt')}{' '}
                <strong className="font-semibold text-foreground">
                  {stageLabel(funnel.find((stage) => stage.label === leak.from)?.key ?? 'CREATED')} → {stageLabel(funnel.find((stage) => stage.label === leak.to)?.key ?? 'CREATED')}
                </strong>
                {t('funnel.biggestDropValue', { value: leak.conv })}
              </span>
            </>
          ) : (
            <>
              <ChevronRight size={14} className="mt-0.5 flex-none" />
              <span>{t('funnel.clickStage')}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
