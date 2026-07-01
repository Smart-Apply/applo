/**
 * activity-chart.tsx
 * Hero area chart: daily application activity with toggleable series.
 * Uses Recharts (install: pnpm add recharts, or: npx shadcn add chart).
 * Place at: apps/web/src/components/analytics/activity-chart.tsx
 */
'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  type TooltipContentProps,
} from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { MetricTip } from '@/components/analytics/metric-tip';
import { RangeToggle } from '@/components/analytics/range-toggle';
import { CHART_COLORS, fmtShortDate, fmtLongDate } from '@/lib/analytics-utils';
import { cn } from '@/lib/utils';
import type { AnalyticsRange } from '@/lib/analytics-utils';
import type { AnalyticsOverview } from '@/types';

// ─── Series config (ordered largest → smallest for painter's order) ────

const SERIES = [
  { key: 'created',   label: 'Erstellt',   color: CHART_COLORS.created   },
  { key: 'applied',   label: 'Beworben',   color: CHART_COLORS.applied   },
  { key: 'interview', label: 'Interview',  color: CHART_COLORS.interview },
  { key: 'accepted',  label: 'Angenommen', color: CHART_COLORS.accepted  },
] as const;

type SeriesKey = typeof SERIES[number]['key'];

function getVal(d: AnalyticsOverview['timeseries30d'][number], key: SeriesKey): number {
  const m: Record<SeriesKey, number> = {
    created: d.created, applied: d.applied,
    interview: d.interview, accepted: d.accepted,
  };
  return m[key];
}

// ─── Custom tooltip ────────────────────────────────────────────────────

function ChartTip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5 shadow-xl text-xs min-w-[152px]"
      style={{ background: '#1B2A49', color: '#fff' }}
    >
      <p className="font-semibold mb-2" style={{ color: '#98A8C4' }}>
        {fmtLongDate(label as string)}
      </p>
      {payload.map(entry => {
        const s = SERIES.find(s => s.key === entry.dataKey);
        return (
          <div key={String(entry.dataKey)} className="flex items-center gap-2 leading-[1.7]">
            <span className="w-2 h-2 rounded-[3px] flex-none" style={{ background: s?.color }} />
            <span className="flex-1" style={{ color: '#C8D0E0' }}>{s?.label}</span>
            <span className="font-bold tabular-nums">{entry.value}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Activity chart ────────────────────────────────────────────────────

interface Props {
  /** Full timeseries30d from the API (up to 30 entries). */
  timeseries: AnalyticsOverview['timeseries30d'];
  range: AnalyticsRange;
  onRangeChange: (r: AnalyticsRange) => void;
}

export function ActivityChart({ timeseries, range, onRangeChange }: Props) {
  const [active, setActive] = useState<Set<SeriesKey>>(
    new Set<SeriesKey>(['created', 'applied']),
  );

  const data = useMemo(
    () => timeseries.slice(-Math.min(range, timeseries.length)),
    [timeseries, range],
  );

  const totals = useMemo(() =>
    Object.fromEntries(SERIES.map(s => [s.key, data.reduce((sum, d) => sum + getVal(d, s.key), 0)])),
    [data],
  );

  const toggle = (key: SeriesKey) =>
    setActive(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });

  const interval = Math.max(1, Math.floor(data.length / 6));

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity size={17} strokeWidth={2} />
              Aktivität
              <MetricTip content="Tagesverlauf deiner Bewerbungsaktivität. Schalte Kennzahlen per Chip an/ab; fahre mit der Maus über den Verlauf für genaue Werte." />
            </CardTitle>
            <CardDescription className="mt-1">
              Erstellte und abgeschickte Bewerbungen pro Tag · letzte {Math.min(range, timeseries.length)} Tage
            </CardDescription>
          </div>
          <RangeToggle value={range} onChange={onRangeChange} />
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Legend / toggle chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SERIES.map(s => {
            const on = active.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(s.key)}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold transition-colors',
                  on ? 'border-border' : 'border-border/50 opacity-55',
                )}
              >
                <span className="w-2.5 h-2.5 rounded-[3px] flex-none" style={{ background: s.color, opacity: on ? 1 : 0.3 }} />
                <span className={on ? 'text-foreground' : 'text-muted-foreground'}>{s.label}</span>
                <span className={cn('font-bold tabular-nums', on ? 'text-foreground' : 'text-muted-foreground/50')}>
                  {totals[s.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Recharts area chart */}
        <ResponsiveContainer width="100%" height={252}>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              {SERIES.map(s => (
                <linearGradient key={s.key} id={`anlg-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
                  <stop offset="92%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="#E6E8EC" />
            <XAxis
              dataKey="date"
              tickFormatter={fmtShortDate}
              tick={{ fill: '#98A1B0', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={interval}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: '#98A1B0', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={24}
            />
            <Tooltip
              content={(props) => <ChartTip {...props} />}
              cursor={{ stroke: '#A6B0C6', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            {SERIES.filter(s => active.has(s.key)).map(s => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#anlg-${s.key})`}
                dot={false}
                activeDot={{ r: 3.5, fill: s.color, stroke: '#fff', strokeWidth: 2 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
