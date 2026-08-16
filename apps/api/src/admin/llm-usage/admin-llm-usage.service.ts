import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LlmUsageBreakdownQueryDto,
  LlmUsageFilterQueryDto,
  LlmUsageTimeseriesQueryDto,
} from './dto/llm-usage-query.dto';
import type {
  LlmUsageBreakdown,
  LlmUsageDimension,
  LlmUsageSummary,
  LlmUsageTimeseries,
} from './admin-llm-usage.types';
import {
  type ResolvedRange,
  emptyMetrics,
  formatRange,
  mapBreakdownRow,
  mapMetrics,
  mapTimeseriesPoint,
  resolveRange,
} from './admin-llm-usage.util';

/** Fallback group count when the caller doesn't pass `limit`. */
const DEFAULT_BREAKDOWN_LIMIT = 50;

/**
 * Safety valve for a very wide window combined with a high-cardinality second
 * dimension. Hitting it sets `truncated: true` rather than silently returning
 * a series that looks complete.
 */
const TIMESERIES_MAX_POINTS = 2000;

type RawRow = Record<string, unknown>;

/**
 * The metric projection shared by all three endpoints.
 *
 * Counts are cast to `int` and sums to `double precision` so nothing comes
 * back as a bigint/numeric the JSON serializer would choke on. `count(<col>)`
 * counts non-null values, which is exactly the "how many calls actually
 * reported usage / had a known price" coverage signal — without it a cost sum
 * that silently excludes the unpriced mid lane reads like total spend.
 */
const METRIC_COLUMNS = Prisma.sql`
  count(*)::int AS "calls",
  count(*) FILTER (WHERE "success")::int AS "successes",
  count("totalTokens")::int AS "callsWithUsage",
  count("estimatedCostUsd")::int AS "callsWithCost",
  count(DISTINCT "actorHash")::int AS "distinctActors",
  coalesce(sum("promptTokens"), 0)::double precision AS "promptTokens",
  coalesce(sum("completionTokens"), 0)::double precision AS "completionTokens",
  coalesce(sum("totalTokens"), 0)::double precision AS "totalTokens",
  coalesce(sum("cachedTokens"), 0)::double precision AS "cachedTokens",
  coalesce(sum("estimatedCostUsd"), 0)::double precision AS "estimatedCostUsd",
  coalesce(avg("latencyMs"), 0)::double precision AS "avgLatencyMs"
`;

/** Busiest-first: cost, then tokens, then raw call count. Repeats the aggregates
 * instead of ordering by output alias so the ordering can't quietly bind to the
 * underlying column of the same name. */
const BREAKDOWN_ORDER = Prisma.sql`
  coalesce(sum("estimatedCostUsd"), 0) DESC,
  coalesce(sum("totalTokens"), 0) DESC,
  count(*) DESC
`;

/**
 * Static SQL fragment per group-by dimension.
 *
 * A `switch` over the union rather than a lookup table so the column name is a
 * compile-time constant on every path — no caller-supplied string can ever
 * reach the query text, only bound parameters can. Enum columns are cast to
 * `text` so the key serialises as a plain string.
 */
function dimensionExpression(dimension: LlmUsageDimension): Prisma.Sql {
  switch (dimension) {
    case 'feature':
      return Prisma.sql`"feature"::text`;
    case 'tier':
      return Prisma.sql`"tier"::text`;
    case 'language':
      return Prisma.sql`"language"`;
    case 'model':
      return Prisma.sql`"model"`;
    case 'provider':
      return Prisma.sql`"provider"::text`;
    case 'lane':
      return Prisma.sql`"lane"::text`;
    default:
      throw new BadRequestException(`Unsupported groupBy: ${String(dimension)}`);
  }
}

/**
 * Read-only aggregation over `llm_usage_events` (issue #525).
 *
 * Raw SQL rather than Prisma's typed `groupBy`, because the headline question
 * ("cost per feature per day") needs `date_trunc`, which the query builder
 * cannot express — and running one code path for time buckets and another for
 * flat groups would mean maintaining the metric definitions twice. Every
 * caller-supplied value is a bound parameter; every identifier is a constant.
 *
 * Aggregates only: `actorHash` is never selected, grouped by, filtered on or
 * returned — only counted distinctly.
 */
@Injectable()
export class AdminLlmUsageService {
  constructor(private readonly prisma: PrismaService) {}

  /** Totals for the window — the "what did AI cost us" number. */
  async summary(query: LlmUsageFilterQueryDto): Promise<LlmUsageSummary> {
    const range = resolveRange(query.from, query.to);
    const where = this.buildWhere(range, query);

    const rows = await this.prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT ${METRIC_COLUMNS}
      FROM "llm_usage_events"
      WHERE ${where}
    `);

    return {
      range: formatRange(range),
      totals: rows[0] ? mapMetrics(rows[0]) : emptyMetrics(),
    };
  }

  /** Totals grouped by one dimension — busiest features, cost per tier, etc. */
  async breakdown(query: LlmUsageBreakdownQueryDto): Promise<LlmUsageBreakdown> {
    const range = resolveRange(query.from, query.to);
    const where = this.buildWhere(range, query);
    const groupExpression = dimensionExpression(query.groupBy);
    const limit = query.limit ?? DEFAULT_BREAKDOWN_LIMIT;

    const rows = await this.prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT ${groupExpression} AS "key", ${METRIC_COLUMNS}
      FROM "llm_usage_events"
      WHERE ${where}
      GROUP BY 1
      ORDER BY ${BREAKDOWN_ORDER}
      LIMIT ${limit}
    `);

    return {
      range: formatRange(range),
      groupBy: query.groupBy,
      rows: rows.map(mapBreakdownRow),
    };
  }

  /** Totals per time bucket, optionally split by a second dimension. */
  async timeseries(query: LlmUsageTimeseriesQueryDto): Promise<LlmUsageTimeseries> {
    const range = resolveRange(query.from, query.to);
    const where = this.buildWhere(range, query);
    const interval = query.interval ?? 'day';
    // One row over the cap tells us the series was cut short without a second query.
    const fetchLimit = TIMESERIES_MAX_POINTS + 1;

    const rows = query.groupBy
      ? await this.prisma.$queryRaw<RawRow[]>(Prisma.sql`
          SELECT
            date_trunc(${interval}::text, "createdAt") AS "bucket",
            ${dimensionExpression(query.groupBy)} AS "key",
            ${METRIC_COLUMNS}
          FROM "llm_usage_events"
          WHERE ${where}
          GROUP BY 1, 2
          ORDER BY 1 ASC, 2 ASC
          LIMIT ${fetchLimit}
        `)
      : await this.prisma.$queryRaw<RawRow[]>(Prisma.sql`
          SELECT date_trunc(${interval}::text, "createdAt") AS "bucket", ${METRIC_COLUMNS}
          FROM "llm_usage_events"
          WHERE ${where}
          GROUP BY 1
          ORDER BY 1 ASC
          LIMIT ${fetchLimit}
        `);

    const truncated = rows.length > TIMESERIES_MAX_POINTS;

    return {
      range: formatRange(range),
      interval,
      groupBy: query.groupBy ?? null,
      truncated,
      points: rows.slice(0, TIMESERIES_MAX_POINTS).map(mapTimeseriesPoint),
    };
  }

  /**
   * Half-open window plus the optional filters, all as bound parameters. Enum
   * columns are compared as text so a filter value never has to be cast into a
   * Postgres enum type from user input.
   */
  private buildWhere(range: ResolvedRange, filters: LlmUsageFilterQueryDto): Prisma.Sql {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`"createdAt" >= ${range.from}`,
      Prisma.sql`"createdAt" < ${range.to}`,
    ];

    if (filters.feature) {
      conditions.push(Prisma.sql`"feature"::text = ${filters.feature}`);
    }
    if (filters.tier) {
      conditions.push(Prisma.sql`"tier"::text = ${filters.tier}`);
    }
    if (filters.provider) {
      conditions.push(Prisma.sql`"provider"::text = ${filters.provider}`);
    }
    if (filters.lane) {
      conditions.push(Prisma.sql`"lane"::text = ${filters.lane}`);
    }
    if (filters.language) {
      conditions.push(Prisma.sql`"language" = ${filters.language}`);
    }

    return Prisma.join(conditions, ' AND ');
  }
}
