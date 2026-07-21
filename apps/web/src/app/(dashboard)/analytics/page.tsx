'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Send, Sparkles, Trophy, Target } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFeatureGate } from '@/hooks/use-tier-gate';
import { api } from '@/lib/api-client';
import { ApiError } from '@/lib/errors';
import { computeKpis, buildFunnel, CHART_COLORS } from '@/lib/analytics-utils';
import type { AnalyticsOverview } from '@/types';
import type { AnalyticsRange } from '@/lib/analytics-utils';

import { AnalyticsSkeleton } from '@/components/analytics/analytics-skeleton';
import { AnalyticsUpgrade } from '@/components/analytics/analytics-upgrade';
import { AnalyticsEmptyState } from '@/components/analytics/analytics-empty-state';
import { InsightStrip } from '@/components/analytics/insight-strip';
import { KpiCard } from '@/components/analytics/kpi-card';
import { ActivityChart } from '@/components/analytics/activity-chart';
import { FunnelCard } from '@/components/analytics/funnel-card';
import { ScoreBucketsChart } from '@/components/analytics/score-buckets-chart';
import { TopTemplatesCard } from '@/components/analytics/top-templates-card';
import { RangeToggle } from '@/components/analytics/range-toggle';

// ─── KPI tooltip copy ─────────────────────────────────────────────────

const TIPS = {
  applied:       'Wie viele deiner erstellten Bewerbungen du tatsächlich <b>abgeschickt</b> hast. Mehr Bewerbungen = mehr Chancen.',
  interviewRate: 'Anteil deiner abgeschickten Bewerbungen, die zu einer <b>Interview-Einladung</b> geführt haben. Üblicher Schnitt: 15–25 %.',
  accepted:      'Bewerbungen, die mit einem <b>Job-Angebot</b> endeten.',
  ats:           'Wie gut deine Lebensläufe von Bewerber-Management-Systemen (<b>ATS</b>) gelesen werden — 0 bis 100. Ziel: 80+.',
};

/**
 * Premium analytics dashboard.
 *
 * Single-fetch page — `useQuery` hits `/analytics/overview` once and the
 * whole UI renders from that payload. Feature-gated client-side via
 * `useFeatureGate('advancedAnalytics')`; the API also enforces the gate
 * via `FeatureGuard`, so a free-tier user who URL-types here sees the
 * upgrade prompt instead of any data.
 */
export default function AnalyticsPage() {
  const router = useRouter();
  const { hasAccess, isLoading: gateLoading } = useFeatureGate('advancedAnalytics');
  const [range, setRange] = useState<AnalyticsRange>(30);

  const { data, isLoading, error } = useQuery<AnalyticsOverview>({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.analytics.getOverview(),
    enabled: hasAccess,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, err) => {
      // Don't retry 403s — the FeatureGuard rejected the request.
      if (err instanceof ApiError && err.status === 403) return false;
      return failureCount < 2;
    },
  });

  const kpis = useMemo(
    () => (data ? computeKpis(data, range) : null),
    [data, range],
  );
  const funnel = useMemo(
    () => (data ? buildFunnel(data.totals) : null),
    [data],
  );

  if (gateLoading || isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (!hasAccess) {
    return <AnalyticsUpgrade />;
  }

  if (error || !data || !kpis || !funnel) {
    return (
      <div className="container max-w-7xl py-6">
        <Card>
          <CardHeader>
            <CardTitle>Analytics konnte nicht geladen werden</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'Unbekannter Fehler'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isEmpty = data.totals.applications === 0;
  const enough = data.totals.applications >= 8;

  return (
    <div className="container max-w-7xl px-0 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading flex items-center gap-2.5 text-2xl sm:text-[28px] font-extrabold tracking-[-.025em]">
            <span className="grid place-items-center w-9 h-9 rounded-[3px] border border-primary-soft bg-primary-soft/60 text-brand dark:border-slate-600 dark:bg-slate-800">
              <BarChart3 size={20} strokeWidth={2} />
            </span>
            Analytics
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Wie läuft deine Bewerbungssuche? Trends, Konversionsraten und Template-Performance auf einen Blick.
          </p>
        </div>
        {!isEmpty && (
          <div className="flex flex-col items-end gap-1.5">
            <RangeToggle value={range} onChange={setRange} />
            <span className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[.08em] text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full bg-success opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 bg-success" />
              </span>
              Aktualisiert gerade eben
            </span>
          </div>
        )}
      </div>

      {isEmpty ? (
        <AnalyticsEmptyState />
      ) : (
        <>
          {/* Insight strip */}
          <InsightStrip data={data} />

          {/* KPI grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Send}
              label="Beworben"
              tipHtml={TIPS.applied}
              value={data.totals.applied}
              delta={kpis.applied.delta}
              since={kpis.sinceLabel}
              spark={enough ? kpis.applied.spark : undefined}
              sparkColor={CHART_COLORS.applied}
            />
            <KpiCard
              icon={Sparkles}
              label="Interview-Quote"
              tipHtml={TIPS.interviewRate}
              value={`${data.interviewRate}%`}
              delta={kpis.interviewRate.delta}
              since={kpis.sinceLabel}
              spark={enough ? kpis.interviewRate.spark : undefined}
              sparkColor={CHART_COLORS.interview}
            />
            <KpiCard
              icon={Trophy}
              label="Angenommen"
              tipHtml={TIPS.accepted}
              value={data.totals.accepted}
              delta={kpis.accepted.delta}
              since={kpis.sinceLabel}
              spark={enough ? kpis.accepted.spark : undefined}
              sparkColor={CHART_COLORS.accepted}
            />
            <KpiCard
              icon={Target}
              label="Ø ATS-Score"
              tipHtml={TIPS.ats}
              value={data.averageAtsScore ?? '—'}
              unit="/100"
            />
          </div>

          {/* Activity chart */}
          <ActivityChart
            timeseries={data.timeseries30d}
            range={range}
            onRangeChange={setRange}
          />

          {/* Funnel + ATS buckets */}
          <div className="grid gap-6 lg:grid-cols-2">
            <FunnelCard
              funnel={funnel}
              onStageClick={(key) => router.push(`/applications?status=${key}`)}
            />
            <ScoreBucketsChart buckets={data.scoreBuckets} />
          </div>

          {/* Templates */}
          <TopTemplatesCard templates={data.topTemplates} />
        </>
      )}
    </div>
  );
}
