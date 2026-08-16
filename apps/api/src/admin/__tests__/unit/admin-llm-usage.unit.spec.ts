import { BadRequestException, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import type { ConfigService } from '../../../config/config.service';
import type { PrismaService } from '../../../prisma/prisma.service';
import { LlmFeature, LlmRoutingLane, SubscriptionTier } from '../../../generated/prisma/client';
import { AdminGuard } from '../../admin.guard';
import { AdminLlmUsageController } from '../../llm-usage/admin-llm-usage.controller';
import { AdminLlmUsageService } from '../../llm-usage/admin-llm-usage.service';
import {
  LLM_USAGE_DIMENSIONS,
  type LlmUsageDimension,
} from '../../llm-usage/admin-llm-usage.types';
import {
  DEFAULT_RANGE_DAYS,
  mapMetrics,
  resolveRange,
  toBucket,
  toKey,
  toNumber,
} from '../../llm-usage/admin-llm-usage.util';

/** Minimal view of a composed `Prisma.Sql` — the bits the assertions need. */
interface CapturedSql {
  text: string;
  values: unknown[];
}

function createPrismaStub(rows: Record<string, unknown>[]) {
  const queryRaw = vi.fn().mockResolvedValue(rows);
  const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;
  return { prisma, queryRaw };
}

function capturedSql(queryRaw: ReturnType<typeof vi.fn>): CapturedSql {
  return queryRaw.mock.calls[0]?.[0] as CapturedSql;
}

/** One fully-populated raw aggregate row, as Postgres would hand it back. */
const RAW_ROW: Record<string, unknown> = {
  key: LlmFeature.APPLICATION_COVER_LETTER,
  calls: 10,
  successes: 8,
  callsWithUsage: 9,
  callsWithCost: 7,
  distinctActors: 3,
  promptTokens: 1000,
  completionTokens: 500,
  totalTokens: 1500,
  cachedTokens: 200,
  estimatedCostUsd: 0.1234567,
  avgLatencyMs: 812.6,
};

describe('resolveRange', () => {
  const NOW = new Date('2026-08-16T12:00:00.000Z');

  it('defaults to the last 30 days', () => {
    const range = resolveRange(undefined, undefined, NOW);

    expect(range.to).toEqual(NOW);
    expect(range.from).toEqual(new Date('2026-07-17T12:00:00.000Z'));
    expect((range.to.getTime() - range.from.getTime()) / (24 * 60 * 60 * 1000)).toBe(
      DEFAULT_RANGE_DAYS,
    );
  });

  it('anchors the default window to an explicit "to"', () => {
    const range = resolveRange(undefined, '2026-03-31T00:00:00.000Z', NOW);

    expect(range.to).toEqual(new Date('2026-03-31T00:00:00.000Z'));
    expect(range.from).toEqual(new Date('2026-03-01T00:00:00.000Z'));
  });

  it('honours both explicit bounds', () => {
    const range = resolveRange('2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z', NOW);

    expect(range.from).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(range.to).toEqual(new Date('2026-02-01T00:00:00.000Z'));
  });

  // An inverted window silently returns zeros, which reads as "no AI usage" —
  // exactly the wrong conclusion to hand an admin. Fail loudly instead.
  it('rejects an inverted or empty window', () => {
    expect(() => resolveRange('2026-02-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', NOW)).toThrow(
      BadRequestException,
    );
    expect(() => resolveRange('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', NOW)).toThrow(
      BadRequestException,
    );
  });

  it('rejects an unparseable bound', () => {
    expect(() => resolveRange('not-a-date', undefined, NOW)).toThrow(BadRequestException);
  });
});

describe('mapMetrics', () => {
  it('maps a full row, deriving failures and success rate', () => {
    const metrics = mapMetrics(RAW_ROW);

    expect(metrics).toEqual({
      calls: 10,
      successes: 8,
      failures: 2,
      successRate: 0.8,
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
      cachedTokens: 200,
      estimatedCostUsd: 0.123457,
      callsWithUsage: 9,
      callsWithCost: 7,
      distinctActors: 3,
      avgLatencyMs: 813,
    });
  });

  // Counts cross a driver boundary that may hand back int8 as a bigint and
  // numeric as a string; JSON.stringify throws on the former and adding the
  // latter concatenates. Coerce rather than trust.
  it('coerces bigint and string aggregates to numbers', () => {
    const metrics = mapMetrics({
      calls: 4n,
      successes: '3',
      totalTokens: '2500',
      estimatedCostUsd: 0.5,
    });

    expect(metrics.calls).toBe(4);
    expect(metrics.successes).toBe(3);
    expect(metrics.failures).toBe(1);
    expect(metrics.successRate).toBe(0.75);
    expect(metrics.totalTokens).toBe(2500);
  });

  it('returns zeros (not NaN) for an empty window', () => {
    const metrics = mapMetrics({});

    expect(metrics.calls).toBe(0);
    expect(metrics.successRate).toBe(0);
    expect(metrics.estimatedCostUsd).toBe(0);
    expect(metrics.avgLatencyMs).toBe(0);
    expect(Object.values(metrics).every((value) => Number.isFinite(value))).toBe(true);
  });

  it('never reports negative failures when counts disagree', () => {
    expect(mapMetrics({ calls: 2, successes: 5 }).failures).toBe(0);
  });
});

describe('toNumber / toKey / toBucket', () => {
  it.each([
    [7, 7],
    [7n, 7],
    ['7.5', 7.5],
    ['not-a-number', 0],
    [null, 0],
    [undefined, 0],
    [Number.NaN, 0],
    // %s, not %j: JSON.stringify cannot serialize the bigint case.
  ])('coerces %s to %s', (input, expected) => {
    expect(toNumber(input)).toBe(expected);
  });

  it('keeps a null group key null rather than inventing a label', () => {
    expect(toKey(null)).toBeNull();
    expect(toKey(undefined)).toBeNull();
    expect(toKey('de')).toBe('de');
  });

  it('normalises a date_trunc bucket to an ISO timestamp', () => {
    expect(toBucket(new Date('2026-08-16T00:00:00.000Z'))).toBe('2026-08-16T00:00:00.000Z');
    expect(toBucket('2026-08-16T00:00:00.000Z')).toBe('2026-08-16T00:00:00.000Z');
  });
});

describe('AdminLlmUsageService', () => {
  it('aggregates totals for the default window', async () => {
    const { prisma, queryRaw } = createPrismaStub([RAW_ROW]);

    const result = await new AdminLlmUsageService(prisma).summary({});

    expect(result.totals.calls).toBe(10);
    expect(result.totals.successRate).toBe(0.8);
    expect(new Date(result.range.to).getTime()).toBeGreaterThan(
      new Date(result.range.from).getTime(),
    );
    expect(capturedSql(queryRaw).text).toContain('FROM "llm_usage_events"');
  });

  it('returns a zeroed summary when the window has no events', async () => {
    const { prisma } = createPrismaStub([]);

    const result = await new AdminLlmUsageService(prisma).summary({});

    expect(result.totals.calls).toBe(0);
    expect(result.totals.estimatedCostUsd).toBe(0);
  });

  // Filters must travel as bound parameters. If any of them were concatenated
  // into the statement, this repo would have a SQL-injection sink on an
  // admin-authenticated route.
  it('binds every filter as a parameter instead of inlining it', async () => {
    const { prisma, queryRaw } = createPrismaStub([RAW_ROW]);

    await new AdminLlmUsageService(prisma).summary({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-02-01T00:00:00.000Z',
      feature: LlmFeature.APPLICATION_RESUME,
      tier: SubscriptionTier.PREMIUM,
      lane: LlmRoutingLane.FAST,
      language: 'de',
    });

    const sql = capturedSql(queryRaw);
    expect(sql.values).toEqual([
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-02-01T00:00:00.000Z'),
      LlmFeature.APPLICATION_RESUME,
      SubscriptionTier.PREMIUM,
      LlmRoutingLane.FAST,
      'de',
    ]);
    expect(sql.text).not.toContain(LlmFeature.APPLICATION_RESUME);
    expect(sql.text).not.toContain('PREMIUM');
  });

  it('omits filters that were not requested', async () => {
    const { prisma, queryRaw } = createPrismaStub([RAW_ROW]);

    await new AdminLlmUsageService(prisma).summary({ feature: LlmFeature.VALIDATION_CHECK });

    // Two range bounds + the single filter.
    expect(capturedSql(queryRaw).values).toHaveLength(3);
  });

  it.each(LLM_USAGE_DIMENSIONS)('groups a breakdown by %s', async (groupBy) => {
    const { prisma, queryRaw } = createPrismaStub([RAW_ROW]);

    const result = await new AdminLlmUsageService(prisma).breakdown({ groupBy });

    expect(result.groupBy).toBe(groupBy);
    expect(result.rows[0]?.key).toBe(LlmFeature.APPLICATION_COVER_LETTER);
    const sql = capturedSql(queryRaw);
    expect(sql.text).toContain(`"${groupBy}"`);
    expect(sql.text).toContain('GROUP BY 1');
    // Default limit is bound, not inlined.
    expect(sql.values.at(-1)).toBe(50);
  });

  it('applies an explicit breakdown limit', async () => {
    const { prisma, queryRaw } = createPrismaStub([RAW_ROW]);

    await new AdminLlmUsageService(prisma).breakdown({ groupBy: 'model', limit: 5 });

    expect(capturedSql(queryRaw).values.at(-1)).toBe(5);
  });

  // Defense in depth: the DTO allow-lists groupBy, but the service must not
  // become an identifier-injection sink if it is ever called directly.
  it('rejects an unknown group-by dimension', async () => {
    const { prisma, queryRaw } = createPrismaStub([RAW_ROW]);

    await expect(
      new AdminLlmUsageService(prisma).breakdown({
        groupBy: '"createdAt"; DROP TABLE users; --' as LlmUsageDimension,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('buckets a time series by day and binds the interval', async () => {
    const { prisma, queryRaw } = createPrismaStub([
      { ...RAW_ROW, key: null, bucket: new Date('2026-08-16T00:00:00.000Z') },
    ]);

    const result = await new AdminLlmUsageService(prisma).timeseries({});

    expect(result.interval).toBe('day');
    expect(result.groupBy).toBeNull();
    expect(result.truncated).toBe(false);
    expect(result.points[0]?.bucket).toBe('2026-08-16T00:00:00.000Z');
    expect(result.points[0]?.key).toBeNull();
    const sql = capturedSql(queryRaw);
    expect(sql.text).toContain('date_trunc(');
    expect(sql.text).not.toContain("'day'");
    expect(sql.values).toContain('day');
  });

  it('splits a time series by a second dimension', async () => {
    const { prisma, queryRaw } = createPrismaStub([
      { ...RAW_ROW, bucket: new Date('2026-08-16T00:00:00.000Z') },
    ]);

    const result = await new AdminLlmUsageService(prisma).timeseries({
      interval: 'week',
      groupBy: 'feature',
    });

    expect(result.interval).toBe('week');
    expect(result.groupBy).toBe('feature');
    expect(result.points[0]?.key).toBe(LlmFeature.APPLICATION_COVER_LETTER);
    const sql = capturedSql(queryRaw);
    expect(sql.text).toContain('GROUP BY 1, 2');
    expect(sql.values).toContain('week');
  });

  it('flags a truncated series instead of pretending it is complete', async () => {
    const overflow = Array.from({ length: 2001 }, () => ({
      ...RAW_ROW,
      bucket: new Date('2026-08-16T00:00:00.000Z'),
    }));
    const { prisma } = createPrismaStub(overflow);

    const result = await new AdminLlmUsageService(prisma).timeseries({});

    expect(result.truncated).toBe(true);
    expect(result.points).toHaveLength(2000);
  });
});

/**
 * Issue #525 acceptance criterion: no endpoint may map an `actorHash` back to
 * a real user. The dataset is pseudonymous, not anonymous (audit F11), so the
 * hash must never be selectable, groupable, filterable or returned.
 */
describe('AdminLlmUsageService de-anonymization guards', () => {
  it('offers no actorHash group-by dimension', () => {
    expect(LLM_USAGE_DIMENSIONS).not.toContain('actorHash');
  });

  it('never selects, groups by or returns an actorHash', async () => {
    const { prisma, queryRaw } = createPrismaStub([
      { ...RAW_ROW, actorHash: 'deadbeef', bucket: new Date('2026-08-16T00:00:00.000Z') },
    ]);
    const service = new AdminLlmUsageService(prisma);

    const results = [
      await service.summary({}),
      await service.breakdown({ groupBy: 'feature' }),
      await service.timeseries({ groupBy: 'tier' }),
    ];

    for (const call of queryRaw.mock.calls) {
      const sql = call[0] as CapturedSql;
      // Counting distinct actors is fine; exposing which ones is not.
      expect(sql.text).not.toMatch(/GROUP BY\s+"?actorHash/i);
      expect(sql.text.replace(/count\(DISTINCT "actorHash"\)/g, '')).not.toContain('actorHash');
    }
    for (const result of results) {
      expect(JSON.stringify(result)).not.toContain('deadbeef');
      expect(JSON.stringify(result)).not.toContain('actorHash');
    }
  });
});

describe('AdminLlmUsageController gating', () => {
  it('is guarded by JwtAuthGuard + AdminGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AdminLlmUsageController) as unknown[];

    expect(guards).toEqual([JwtAuthGuard, AdminGuard]);
  });
});

describe('AdminGuard', () => {
  function createContext(user?: { email?: string }): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  function createGuard(adminEmails: string[]): AdminGuard {
    return new AdminGuard({ adminEmails } as unknown as ConfigService);
  }

  it('allows an allow-listed admin regardless of email casing', () => {
    expect(
      createGuard(['admin@applo.ai']).canActivate(createContext({ email: 'Admin@Applo.ai' })),
    ).toBe(true);
  });

  it('denies a non-admin', () => {
    expect(() =>
      createGuard(['admin@applo.ai']).canActivate(createContext({ email: 'user@applo.ai' })),
    ).toThrow(ForbiddenException);
  });

  it('fails closed when ADMIN_EMAILS is empty', () => {
    expect(() => createGuard([]).canActivate(createContext({ email: 'admin@applo.ai' }))).toThrow(
      ForbiddenException,
    );
  });

  it('denies an unauthenticated request', () => {
    expect(() => createGuard(['admin@applo.ai']).canActivate(createContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
