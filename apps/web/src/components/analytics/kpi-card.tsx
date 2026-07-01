/**
 * kpi-card.tsx
 * KPI scorecard with sparkline, period-over-period delta chip,
 * and plain-language metric tooltip. Used in the 4-card header row.
 * Place at: apps/web/src/components/analytics/kpi-card.tsx
 */
'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { MetricTip } from '@/components/analytics/metric-tip';
import { cn } from '@/lib/utils';
import type { DeltaValue } from '@/lib/analytics-utils';

// ─── Inline SVG sparkline (no Recharts — overkill for 30 tiny points) ──

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 128, H = 28, PAD = 2;
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => [
    PAD + (i / (data.length - 1)) * (W - PAD * 2),
    H - PAD - ((v - min) / span) * (H - PAD * 2),
  ] as [number, number]);

  // Smooth line via quadratic midpoints (matches prototype)
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q ${pts[i][0]} ${pts[i][1]} ${mx} ${my}`;
  }
  d += ` L ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`;
  const area = `${d} L ${pts[pts.length - 1][0]} ${H} L ${pts[0][0]} ${H} Z`;
  const id = `sp-${color.replace('#', '')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      className="block w-full overflow-visible" height={H}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.16} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.6}
        strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.1} fill={color} />
    </svg>
  );
}

// ─── Delta chip ────────────────────────────────────────────────────────

function DeltaChip({ delta }: { delta: DeltaValue }) {
  const { value, suffix, positiveIsGood } = delta;
  const up   = value > 0;
  const flat = value === 0;
  const good = flat ? null : up === positiveIsGood;
  const Arrow = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full',
      flat              && 'bg-muted text-muted-foreground',
      good === true     && 'bg-[#E8F2EC] text-[#1F7A54]',
      good === false    && 'bg-[#F6ECEA] text-[#B14A3F]',
    )}>
      <Arrow size={12} strokeWidth={2.4} />
      {Math.abs(value)}{suffix}
    </span>
  );
}

// ─── KPI card ──────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  /** HTML string explaining the metric in plain German. Used for the ⓘ tooltip. */
  tipHtml: string;
  value: string | number;
  /** Optional unit rendered smaller/muted after the value, e.g. "/100". */
  unit?: string;
  delta?: DeltaValue | null;
  since?: string;
  spark?: number[];
  sparkColor?: string;
}

export function KpiCard({
  icon: Icon,
  label,
  tipHtml,
  value,
  unit,
  delta,
  since,
  spark,
  sparkColor = '#5A6A93',
}: KpiCardProps) {
  const empty   = value === '—' || value == null;
  const hasSpark = !empty && spark && spark.length > 1;

  return (
    <Card className="flex flex-col min-h-[132px]">
      <CardContent className="pt-4 pb-3 px-4 flex flex-col flex-1 gap-0">
        {/* label row */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="grid place-items-center w-6 h-6 rounded-lg bg-primary/10 text-primary flex-none">
            <Icon size={14} strokeWidth={2} />
          </span>
          <span className="text-[13px] font-semibold">{label}</span>
          <MetricTip content={tipHtml} />
        </div>

        {/* value */}
        <p className="mt-2.5 text-[30px] leading-none font-bold tracking-tight tabular-nums">
          {value}
          {unit && !empty && (
            <span className="text-[17px] font-semibold text-muted-foreground ml-0.5">{unit}</span>
          )}
        </p>

        {/* sparkline */}
        {hasSpark && (
          <div className="mt-2">
            <Sparkline data={spark!} color={sparkColor} />
          </div>
        )}

        {/* footer: delta + since */}
        <div className="mt-auto pt-2 flex items-center gap-2 flex-wrap">
          {empty ? (
            <span className="text-xs text-muted-foreground">Noch keine Daten</span>
          ) : (
            <>
              {delta && <DeltaChip delta={delta} />}
              {since && <span className="text-xs text-muted-foreground">{since}</span>}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
