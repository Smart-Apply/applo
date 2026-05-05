import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationTrackingStatus } from '../generated/prisma/client';
import type { AnalyticsOverviewDto } from './analytics.dto';

/**
 * Read-only aggregations over the user's `Application` history.
 *
 * All queries are scoped to a single userId and run as plain Prisma
 * aggregates — no schema additions, no warehouse, no background job.
 * Suitable for the per-user dashboard at `/analytics`.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Single-shot dashboard payload. Designed to be cheap enough to compute
   * on every page load (a handful of grouped queries on indexed columns).
   */
  async getOverview(userId: string): Promise<AnalyticsOverviewDto> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Pull the minimal columns we need once and aggregate in memory. The
    // dataset is per-user so cardinality stays low (typically <1000 rows).
    // Trading one larger SELECT for many GROUP BYs keeps the controller
    // simple and avoids round-trip overhead.
    const apps = await this.prisma.application.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        applicationStatus: true,
        matchScore: true,
        createdAt: true,
        statusUpdatedAt: true,
        resumeTemplateId: true,
        resumeTemplate: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      generatedAt: now.toISOString(),
      totals: this.computeTotals(apps),
      funnel: this.computeFunnel(apps),
      responseRate: this.computeRate(apps, ['INTERVIEW', 'ACCEPTED', 'REJECTED'], ['APPLIED', 'INTERVIEW', 'ACCEPTED', 'REJECTED']),
      interviewRate: this.computeRate(apps, ['INTERVIEW', 'ACCEPTED'], ['APPLIED', 'INTERVIEW', 'ACCEPTED', 'REJECTED']),
      offerRate: this.computeRate(apps, ['ACCEPTED'], ['APPLIED', 'INTERVIEW', 'ACCEPTED', 'REJECTED']),
      averageAtsScore: this.computeAverageScore(apps),
      timeseries30d: this.computeTimeseries(apps, thirtyDaysAgo, now),
      scoreBuckets: this.computeScoreBuckets(apps),
      topTemplates: this.computeTopTemplates(apps),
    };
  }

  // ─── private helpers ─────────────────────────────────────────────

  private computeTotals(apps: ApplicationLite[]): AnalyticsOverviewDto['totals'] {
    const counts = this.countByStatus(apps);
    return {
      applications: apps.length,
      applied: counts.APPLIED + counts.INTERVIEW + counts.ACCEPTED + counts.REJECTED,
      interviews: counts.INTERVIEW + counts.ACCEPTED,
      accepted: counts.ACCEPTED,
      rejected: counts.REJECTED,
      activelyTracked: counts.APPLIED + counts.INTERVIEW + counts.ACCEPTED + counts.REJECTED,
    };
  }

  private computeFunnel(apps: ApplicationLite[]): AnalyticsOverviewDto['funnel'] {
    const counts = this.countByStatus(apps);
    // Each later stage is a STRICT subset of the earlier one (a user who
    // got an interview must have applied first). We model this as a
    // monotonically decreasing funnel.
    const created = apps.length;
    const applied = counts.APPLIED + counts.INTERVIEW + counts.ACCEPTED + counts.REJECTED;
    const interview = counts.INTERVIEW + counts.ACCEPTED;
    const accepted = counts.ACCEPTED;

    const stages: Array<['CREATED' | 'APPLIED' | 'INTERVIEW' | 'ACCEPTED', number]> = [
      ['CREATED', created],
      ['APPLIED', applied],
      ['INTERVIEW', interview],
      ['ACCEPTED', accepted],
    ];

    return stages.map(([stage, count], idx) => {
      if (idx === 0) {
        return { stage, count, conversionFromPrevious: null };
      }
      const prev = stages[idx - 1][1];
      const rate = prev > 0 ? Math.round((count / prev) * 100) : 0;
      return { stage, count, conversionFromPrevious: rate };
    });
  }

  private computeRate(
    apps: ApplicationLite[],
    numeratorStatuses: ApplicationTrackingStatus[],
    denominatorStatuses: ApplicationTrackingStatus[],
  ): number {
    const numerator = apps.filter((a) => numeratorStatuses.includes(a.applicationStatus)).length;
    const denominator = apps.filter((a) => denominatorStatuses.includes(a.applicationStatus)).length;
    if (denominator === 0) return 0;
    return Math.round((numerator / denominator) * 100);
  }

  private computeAverageScore(apps: ApplicationLite[]): number | null {
    const scored = apps.filter((a): a is ApplicationLite & { matchScore: number } => a.matchScore !== null);
    if (scored.length === 0) return null;
    const sum = scored.reduce((acc, a) => acc + a.matchScore, 0);
    return Math.round(sum / scored.length);
  }

  private computeTimeseries(
    apps: ApplicationLite[],
    from: Date,
    to: Date,
  ): AnalyticsOverviewDto['timeseries30d'] {
    // Build a Map keyed by YYYY-MM-DD so days with zero events still appear
    // as flat bars in the chart (no missing-data gaps).
    const byDay = new Map<string, AnalyticsOverviewDto['timeseries30d'][number]>();

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const key = this.toIsoDate(d);
      byDay.set(key, { date: key, created: 0, applied: 0, interview: 0, accepted: 0, rejected: 0 });
    }

    for (const app of apps) {
      // Bucket by createdAt so the chart shows "applications generated per day"
      const created = app.createdAt;
      if (created >= from && created <= to) {
        const key = this.toIsoDate(created);
        const day = byDay.get(key);
        if (day) day.created += 1;
      }

      // Bucket terminal states by statusUpdatedAt (when the user marked it).
      // Falls back to createdAt for legacy rows that pre-date the tracking
      // feature so they still appear somewhere.
      const statusDate = app.statusUpdatedAt ?? app.createdAt;
      if (statusDate >= from && statusDate <= to) {
        const key = this.toIsoDate(statusDate);
        const day = byDay.get(key);
        if (!day) continue;
        switch (app.applicationStatus) {
          case 'APPLIED':
            day.applied += 1;
            break;
          case 'INTERVIEW':
            day.interview += 1;
            break;
          case 'ACCEPTED':
            day.accepted += 1;
            break;
          case 'REJECTED':
            day.rejected += 1;
            break;
          default:
            break;
        }
      }
    }

    return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  private computeScoreBuckets(apps: ApplicationLite[]): AnalyticsOverviewDto['scoreBuckets'] {
    const bucketDefs: Array<{ label: string; min: number; max: number }> = [
      { label: '0–25', min: 0, max: 25 },
      { label: '26–50', min: 26, max: 50 },
      { label: '51–75', min: 51, max: 75 },
      { label: '76–100', min: 76, max: 100 },
    ];

    const buckets = bucketDefs.map((b) => {
      const inBucket = apps.filter(
        (a) => a.matchScore !== null && a.matchScore >= b.min && a.matchScore <= b.max,
      );
      const interviews = inBucket.filter((a) =>
        ['INTERVIEW', 'ACCEPTED'].includes(a.applicationStatus),
      ).length;

      return {
        bucket: b.label,
        applications: inBucket.length,
        interviews,
        interviewRate: inBucket.length > 0 ? Math.round((interviews / inBucket.length) * 100) : 0,
      };
    });

    return buckets.filter((b) => b.applications > 0);
  }

  private computeTopTemplates(apps: ApplicationLite[]): AnalyticsOverviewDto['topTemplates'] {
    const grouped = new Map<string, { name: string; total: number; interviews: number }>();

    for (const app of apps) {
      const tmpl = app.resumeTemplate;
      if (!tmpl) continue;
      const entry = grouped.get(tmpl.id) ?? { name: tmpl.name, total: 0, interviews: 0 };
      entry.total += 1;
      if (['INTERVIEW', 'ACCEPTED'].includes(app.applicationStatus)) {
        entry.interviews += 1;
      }
      grouped.set(tmpl.id, entry);
    }

    return Array.from(grouped.entries())
      .map(([templateId, v]) => ({
        templateId,
        templateName: v.name,
        usageCount: v.total,
        interviewRate: v.total > 0 ? Math.round((v.interviews / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);
  }

  private countByStatus(apps: ApplicationLite[]): Record<ApplicationTrackingStatus, number> {
    const counts: Record<ApplicationTrackingStatus, number> = {
      CREATED: 0,
      APPLIED: 0,
      INTERVIEW: 0,
      ACCEPTED: 0,
      REJECTED: 0,
    };
    for (const a of apps) counts[a.applicationStatus] += 1;
    return counts;
  }

  private toIsoDate(d: Date): string {
    // Use UTC to match Postgres' default storage timezone — avoids day
    // boundaries shifting when the user changes locale or DST flips.
    return d.toISOString().slice(0, 10);
  }
}

interface ApplicationLite {
  id: string;
  applicationStatus: ApplicationTrackingStatus;
  matchScore: number | null;
  createdAt: Date;
  statusUpdatedAt: Date | null;
  resumeTemplateId: string | null;
  resumeTemplate: { id: string; name: string } | null;
}
