import { BadRequestException } from '@nestjs/common';
import type {
  LlmUsageBreakdownRow,
  LlmUsageMetrics,
  LlmUsageRange,
  LlmUsageTimeseriesPoint,
} from './admin-llm-usage.types';

/** Window used when the caller passes neither `from` nor `to`. */
export const DEFAULT_RANGE_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ResolvedRange {
  from: Date;
  to: Date;
}

/**
 * Resolve the requested window into a half-open `[from, to)` interval.
 *
 * Both bounds are optional: `to` defaults to now and `from` to
 * {@link DEFAULT_RANGE_DAYS} before `to`. The DTO already rejects
 * non-ISO-8601 input; the re-check here keeps the helper safe to call from
 * anywhere and turns a nonsensical window into a 400 rather than an empty
 * result the caller would misread as "no usage".
 */
export function resolveRange(from?: string, to?: string, now: Date = new Date()): ResolvedRange {
  const upper = to === undefined ? now : parseBound(to, 'to');
  const lower =
    from === undefined
      ? new Date(upper.getTime() - DEFAULT_RANGE_DAYS * MS_PER_DAY)
      : parseBound(from, 'from');

  if (lower.getTime() >= upper.getTime()) {
    throw new BadRequestException('"from" must be earlier than "to"');
  }

  return { from: lower, to: upper };
}

function parseBound(value: string, field: 'from' | 'to'): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`"${field}" must be a valid ISO-8601 date`);
  }
  return parsed;
}

export function formatRange(range: ResolvedRange): LlmUsageRange {
  return { from: range.from.toISOString(), to: range.to.toISOString() };
}

/**
 * Coerce an aggregate cell to a number. The SQL casts counts to `int` and sums
 * to `double precision`, but the value still crosses a driver boundary that
 * may hand back a `bigint` (int8) or a string (numeric) depending on the
 * adapter — so normalise instead of trusting the shape.
 */
export function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/** Grouped columns are nullable (`tier`, `language`); keep null rather than inventing a label. */
export function toKey(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : String(value);
}

/** `date_trunc` returns a timestamp; normalise it to an ISO string for the JSON response. */
export function toBucket(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }
  return new Date(0).toISOString();
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Map one raw aggregate row onto the public metric shape. */
export function mapMetrics(row: Record<string, unknown>): LlmUsageMetrics {
  const calls = toNumber(row.calls);
  const successes = toNumber(row.successes);

  return {
    calls,
    successes,
    failures: Math.max(0, calls - successes),
    successRate: calls > 0 ? roundTo(successes / calls, 4) : 0,
    promptTokens: toNumber(row.promptTokens),
    completionTokens: toNumber(row.completionTokens),
    totalTokens: toNumber(row.totalTokens),
    cachedTokens: toNumber(row.cachedTokens),
    estimatedCostUsd: roundTo(toNumber(row.estimatedCostUsd), 6),
    callsWithUsage: toNumber(row.callsWithUsage),
    callsWithCost: toNumber(row.callsWithCost),
    distinctActors: toNumber(row.distinctActors),
    avgLatencyMs: Math.round(toNumber(row.avgLatencyMs)),
  };
}

export function mapBreakdownRow(row: Record<string, unknown>): LlmUsageBreakdownRow {
  return { key: toKey(row.key), ...mapMetrics(row) };
}

export function mapTimeseriesPoint(row: Record<string, unknown>): LlmUsageTimeseriesPoint {
  return { bucket: toBucket(row.bucket), key: toKey(row.key), ...mapMetrics(row) };
}

/** Zero row for a window with no events, so the response shape never varies. */
export function emptyMetrics(): LlmUsageMetrics {
  return mapMetrics({});
}
