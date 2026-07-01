/**
 * analytics-utils.ts
 * Shared types + utilities for the Analytics redesign.
 * Place at: apps/web/src/lib/analytics-utils.ts
 */
import type { AnalyticsOverview } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────

export type AnalyticsRange = 7 | 30 | 90;

export interface FunnelStage {
  key: 'CREATED' | 'APPLIED' | 'INTERVIEW' | 'ACCEPTED';
  label: string;
  count: number;
  /** Conversion % from the previous stage. null for the first stage. */
  conv: number | null;
}

export interface DeltaValue {
  value: number;
  suffix: string;         // e.g. '%' | ' Pkt.' | '' (count)
  positiveIsGood: boolean;
}

export interface KpiWindow {
  delta: DeltaValue | null;
  /** Daily values for the mini sparkline (empty → sparkline hidden). */
  spark: number[];
}

export interface KpiMetrics {
  sinceLabel: string;
  applied: KpiWindow;
  interviewRate: KpiWindow;
  accepted: KpiWindow;
}

// ─── Chart colour ramp (monochrome navy, largest series lightest) ──────

/** Created (lightest/back) → Accepted (darkest/front). */
export const CHART_COLORS = {
  created:   '#8E9AB8',
  applied:   '#5A6A93',
  interview: '#34436E',
  accepted:  '#1B2A49',
} as const;

export const FUNNEL_BAR_COLORS: Record<FunnelStage['key'], string> = {
  CREATED:   '#1B2A49',
  APPLIED:   '#34436E',
  INTERVIEW: '#5A6A93',
  ACCEPTED:  '#7888AD',
};

// ─── Helpers ──────────────────────────────────────────────────────────

function pct(a: number, b: number): number | null {
  return b > 0 ? Math.round((a / b) * 100) : null;
}

function pctChange(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

type TimeEntry = AnalyticsOverview['timeseries30d'][number];
function sumWin(arr: TimeEntry[], key: keyof Omit<TimeEntry, 'date'>): number {
  return arr.reduce((s, d) => s + d[key], 0);
}

// ─── Core computations ────────────────────────────────────────────────

/**
 * Compute windowed KPI values + deltas from the existing timeseries30d.
 * Range=7/30 → slice the 30-day series. Range=90 → same data until the
 * backend returns a longer series (see README). No new API calls needed.
 */
export function computeKpis(
  data: AnalyticsOverview,
  range: AnalyticsRange,
): KpiMetrics {
  const ts  = data.timeseries30d;
  const n   = ts.length;
  const cap = Math.min(range, n);

  const cur  = ts.slice(Math.max(0, n - cap));
  const prev = ts.slice(Math.max(0, n - 2 * cap), Math.max(0, n - cap));

  const enoughHistory = data.totals.applications >= 8;
  const sinceLabel = `vs. vorherige ${cap} T.`;

  const appliedDelta = enoughHistory
    ? pctChange(sumWin(cur, 'applied'), sumWin(prev, 'applied'))
    : null;

  const irCur  = pct(sumWin(cur,  'interview'), sumWin(cur,  'applied')) ?? 0;
  const irPrev = pct(sumWin(prev, 'interview'), sumWin(prev, 'applied')) ?? 0;
  const irDelta = enoughHistory && sumWin(prev, 'applied') > 0
    ? irCur - irPrev
    : null;

  const accCur  = sumWin(cur,  'accepted');
  const accPrev = sumWin(prev, 'accepted');
  const accDelta = enoughHistory ? accCur - accPrev : null;

  // Cumulative accepted sparkline (monotonically rising → reads nicely)
  let run = 0;
  const accCum = cur.map(d => (run += d.accepted));

  return {
    sinceLabel,
    applied: {
      delta: appliedDelta == null ? null
        : { value: appliedDelta, suffix: '%', positiveIsGood: true },
      spark: enoughHistory ? cur.map(d => d.applied) : [],
    },
    interviewRate: {
      delta: irDelta == null ? null
        : { value: irDelta, suffix: ' Pkt.', positiveIsGood: true },
      spark: enoughHistory ? cur.map(d => d.interview) : [],
    },
    accepted: {
      delta: accDelta == null ? null
        : { value: accDelta, suffix: '', positiveIsGood: true },
      spark: enoughHistory ? accCum : [],
    },
  };
}

/** Build funnel stages with per-step conversion rates from all-time totals. */
export function buildFunnel(totals: AnalyticsOverview['totals']): FunnelStage[] {
  return [
    { key: 'CREATED',   label: 'Erstellt',   count: totals.applications, conv: null },
    { key: 'APPLIED',   label: 'Beworben',   count: totals.applied,      conv: pct(totals.applied,     totals.applications) },
    { key: 'INTERVIEW', label: 'Interview',  count: totals.interviews,   conv: pct(totals.interviews,  totals.applied) },
    { key: 'ACCEPTED',  label: 'Angenommen', count: totals.accepted,     conv: pct(totals.accepted,    totals.interviews) },
  ];
}

/** Returns the funnel step with the lowest conversion (the biggest drop-off). */
export function leakiestStep(
  funnel: FunnelStage[],
): { from: string; to: string; conv: number } | null {
  let worst: { from: string; to: string; conv: number } | null = null;
  for (let i = 1; i < funnel.length; i++) {
    const c = funnel[i].conv;
    if (c == null) continue;
    if (!worst || c < worst.conv) {
      worst = { from: funnel[i - 1].label, to: funnel[i].label, conv: c };
    }
  }
  return worst;
}

// ─── Date formatting ──────────────────────────────────────────────────

export function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  return d
    .toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
    .replace('.', '');
}

export function fmtLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
  });
}
