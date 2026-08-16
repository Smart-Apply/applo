/**
 * Response shapes for the read-only LLM usage analytics endpoints
 * (issue #525, follow-up to the tracking added in #522).
 *
 * Aggregate-only by design. `actorHash` is neither a filter, a group-by
 * dimension, nor part of any response: the dataset is pseudonymous, not
 * anonymous (audit 2026-08-13, F11 — a usage burst time-correlates back to
 * the `Application`/`Validation`/`InterviewSession` that triggered it), so
 * handing out per-hash rows would hand out a re-identification primitive.
 * `distinctActors` is a plain count and exposes no hash.
 */

/**
 * Dimensions an admin may group by. `actorHash` is deliberately absent — see
 * the file header. So are `errorKind`/`latencyMs`: unbounded or continuous
 * columns that would explode cardinality without answering a usage question.
 */
export const LLM_USAGE_DIMENSIONS = [
  'feature',
  'tier',
  'language',
  'model',
  'provider',
  'lane',
] as const;

export type LlmUsageDimension = (typeof LLM_USAGE_DIMENSIONS)[number];

/** Bucket sizes for the time series. Buckets are UTC (`createdAt` is stored in UTC). */
export const LLM_USAGE_INTERVALS = ['day', 'week', 'month'] as const;

export type LlmUsageInterval = (typeof LLM_USAGE_INTERVALS)[number];

/** The metric set every endpoint returns, for the whole range or per group. */
export interface LlmUsageMetrics {
  calls: number;
  successes: number;
  failures: number;
  /** `successes / calls`, 0 when there were no calls. */
  successRate: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens: number;
  /** Sum over priced rows only — a lower bound on real spend, see `callsWithCost`. */
  estimatedCostUsd: number;
  /** Calls whose provider reported token usage; the rest contribute 0 tokens. */
  callsWithUsage: number;
  /** Calls whose model is priced in `llm-pricing.ts`; the rest contribute 0 cost. */
  callsWithCost: number;
  /** Distinct pseudonymous actors. A count only — no hash is ever returned. */
  distinctActors: number;
  avgLatencyMs: number;
}

/** Resolved (defaults applied) time window, half-open: `from <= createdAt < to`. */
export interface LlmUsageRange {
  from: string;
  to: string;
}

export interface LlmUsageSummary {
  range: LlmUsageRange;
  totals: LlmUsageMetrics;
}

export interface LlmUsageBreakdownRow extends LlmUsageMetrics {
  /** Null when the grouped column is null (e.g. tier/language unresolved). */
  key: string | null;
}

export interface LlmUsageBreakdown {
  range: LlmUsageRange;
  groupBy: LlmUsageDimension;
  rows: LlmUsageBreakdownRow[];
}

export interface LlmUsageTimeseriesPoint extends LlmUsageMetrics {
  /** Bucket start as an ISO timestamp (UTC). */
  bucket: string;
  /** Null when no secondary dimension was requested, or the column is null. */
  key: string | null;
}

export interface LlmUsageTimeseries {
  range: LlmUsageRange;
  interval: LlmUsageInterval;
  groupBy: LlmUsageDimension | null;
  /** True when the point cap was hit and the tail of the series was dropped. */
  truncated: boolean;
  points: LlmUsageTimeseriesPoint[];
}
