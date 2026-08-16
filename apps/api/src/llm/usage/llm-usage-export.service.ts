import { BadRequestException, Inject, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  LlmCircuitState,
  LlmFeature,
  LlmProviderKind,
  LlmRoutingLane,
  SubscriptionTier,
} from '../../generated/prisma/client';
import type { LlmUsageExportQueryDto } from './dto/llm-usage-export-query.dto';

export type LlmUsageExportFormat = 'jsonl' | 'csv';
export type LlmUsageExportBucket = 'hour' | 'day' | 'month';
export type LlmUsageExportActorMode = 'pseudonym' | 'none';

/** Bumped whenever a column is added, removed or redefined. */
export const LLM_USAGE_EXPORT_SCHEMA_VERSION = 1;

export const DEFAULT_EXPORT_LIMIT = 50_000;
/** Rows are buffered to compute k-anonymity, so the cap is a memory bound. */
export const MAX_EXPORT_LIMIT = 200_000;
export const DEFAULT_K_ANONYMITY = 5;

const DB_PAGE_SIZE = 1_000;
const SERIALIZE_CHUNK_ROWS = 500;
/** Latency is a per-call measurement — round it so it can't fingerprint a request. */
const LATENCY_ROUNDING_MS = 10;

export interface LlmUsageExportOptions {
  format: LlmUsageExportFormat;
  bucket: LlmUsageExportBucket;
  actor: LlmUsageExportActorMode;
  k: number;
  limit: number;
  /** Inclusive lower bound. */
  from?: Date;
  /** Exclusive upper bound. */
  to?: Date;
}

/** One released record. Key order defines the JSONL and CSV column order. */
export interface LlmUsageExportRow {
  timeBucket: string;
  actorId: string | null;
  feature: LlmFeature;
  provider: LlmProviderKind;
  model: string;
  lane: LlmRoutingLane;
  tier: SubscriptionTier | null;
  language: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  cachedTokens: number | null;
  latencyMs: number;
  success: boolean;
  circuitState: LlmCircuitState;
  errorKind: string | null;
  estimatedCostUsd: number | null;
}

export interface LlmUsageExportColumn {
  name: keyof LlmUsageExportRow;
  type: 'timestamp' | 'string' | 'integer' | 'float' | 'boolean';
  description: string;
}

export interface LlmUsageExportManifest {
  dataset: 'llm_usage_events';
  schemaVersion: number;
  generatedAt: string;
  parameters: {
    from: string | null;
    to: string | null;
    format: LlmUsageExportFormat;
    timestampBucket: LlmUsageExportBucket;
    actorMode: LlmUsageExportActorMode;
    kAnonymity: number;
    limit: number;
  };
  counts: {
    sourceRows: number;
    readRows: number;
    exportedRows: number;
    suppressedRows: number;
    suppressedGroups: number;
    truncated: boolean;
  };
  columns: LlmUsageExportColumn[];
  quasiIdentifiers: Array<keyof LlmUsageExportRow>;
  guarantees: string[];
  residualRisks: string[];
}

export interface LlmUsageExportDataset {
  manifest: LlmUsageExportManifest;
  rows: LlmUsageExportRow[];
}

/**
 * The exported schema. Also the CSV header and the manifest's column list, so
 * the three can never drift apart.
 */
export const LLM_USAGE_EXPORT_COLUMNS: LlmUsageExportColumn[] = [
  {
    name: 'timeBucket',
    type: 'timestamp',
    description:
      'Start of the UTC bucket the call fell into (ISO 8601). The raw millisecond createdAt is never exported.',
  },
  {
    name: 'actorId',
    type: 'string',
    description:
      'Pseudonym re-keyed with a random salt generated for this export and discarded afterwards. Empty when actorMode=none or when the call ran outside any user context.',
  },
  { name: 'feature', type: 'string', description: 'Product surface that made the call.' },
  { name: 'provider', type: 'string', description: 'Provider that served the call.' },
  { name: 'model', type: 'string', description: 'Deployment/model that served the call.' },
  { name: 'lane', type: 'string', description: 'Routing lane that served the call.' },
  { name: 'tier', type: 'string', description: 'Subscription tier at call time. Empty when unresolved.' },
  { name: 'language', type: 'string', description: 'Document language (allow-listed at write time).' },
  { name: 'promptTokens', type: 'integer', description: 'Prompt tokens. Empty when the provider reported none.' },
  { name: 'completionTokens', type: 'integer', description: 'Completion tokens. Empty when unreported.' },
  { name: 'totalTokens', type: 'integer', description: 'promptTokens + completionTokens. Empty when unreported.' },
  { name: 'cachedTokens', type: 'integer', description: 'Prompt tokens served from the provider cache.' },
  { name: 'latencyMs', type: 'integer', description: 'End-to-end latency, rounded to the nearest 10 ms.' },
  { name: 'success', type: 'boolean', description: 'Whether the call returned a usable result.' },
  { name: 'circuitState', type: 'string', description: 'Circuit-breaker state at dispatch.' },
  {
    name: 'errorKind',
    type: 'string',
    description: 'Error CLASS name on failure — never a message, which could echo prompt text.',
  },
  { name: 'estimatedCostUsd', type: 'float', description: 'Modelled cost. Empty when the model is unpriced.' },
];

/**
 * Attributes an outsider could plausibly already know about a person (when they
 * used the product, what for, on which plan, in which language, on which model).
 * The measurements (tokens, latency, cost, success) are the sensitive payload
 * and deliberately excluded — they are what the dataset exists to carry.
 */
const QUASI_IDENTIFIERS: Array<keyof LlmUsageExportRow> = [
  'timeBucket',
  'feature',
  'tier',
  'language',
  'model',
];

/**
 * Explicit source allow-list. `llm_usage_events` holds no prompt/response text
 * today, and this select keeps that true even if a column is added later: a new
 * column cannot reach the export without being added here on purpose.
 *
 * `id` is read for cursor pagination only and is NEVER exported — it is a cuid,
 * which embeds a millisecond timestamp and would undo the bucketing below.
 */
const EXPORT_SOURCE_SELECT = {
  id: true,
  actorHash: true,
  feature: true,
  provider: true,
  model: true,
  lane: true,
  promptTokens: true,
  completionTokens: true,
  totalTokens: true,
  cachedTokens: true,
  tier: true,
  language: true,
  latencyMs: true,
  success: true,
  circuitState: true,
  errorKind: true,
  estimatedCostUsd: true,
  createdAt: true,
} as const;

interface SourceRow {
  id: string;
  actorHash: string | null;
  feature: LlmFeature;
  provider: LlmProviderKind;
  model: string;
  lane: LlmRoutingLane;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  cachedTokens: number | null;
  tier: SubscriptionTier | null;
  language: string | null;
  latencyMs: number;
  success: boolean;
  circuitState: LlmCircuitState;
  errorKind: string | null;
  estimatedCostUsd: number | null;
  createdAt: Date;
}

/** Truncate to the start of the containing UTC bucket. */
export function bucketTimestamp(value: Date, bucket: LlmUsageExportBucket): string {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth();
  if (bucket === 'month') {
    return new Date(Date.UTC(year, month, 1)).toISOString();
  }
  const day = value.getUTCDate();
  if (bucket === 'day') {
    return new Date(Date.UTC(year, month, day)).toISOString();
  }
  return new Date(Date.UTC(year, month, day, value.getUTCHours())).toISOString();
}

export function roundLatency(latencyMs: number): number {
  return Math.round(latencyMs / LATENCY_ROUNDING_MS) * LATENCY_ROUNDING_MS;
}

function quasiIdentifierKey(row: LlmUsageExportRow): string {
  // \u0000 cannot appear in any of these values, so the join is unambiguous.
  return QUASI_IDENTIFIERS.map((column) => String(row[column] ?? '')).join('\u0000');
}

/**
 * Suppress rows whose quasi-identifier group is backed by fewer than `k`
 * DISTINCT actors — counting rows, not people, would let one heavy user's `k`
 * calls pass as a crowd. Rows with no actor carry no personal data at all and
 * are always released.
 */
export function applyKAnonymity(
  rows: LlmUsageExportRow[],
  k: number,
): { rows: LlmUsageExportRow[]; suppressedRows: number; suppressedGroups: number } {
  if (k <= 1) {
    return { rows, suppressedRows: 0, suppressedGroups: 0 };
  }

  const actorsByGroup = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.actorId === null) continue;
    const key = quasiIdentifierKey(row);
    const actors = actorsByGroup.get(key);
    if (actors) {
      actors.add(row.actorId);
    } else {
      actorsByGroup.set(key, new Set([row.actorId]));
    }
  }

  const suppressedGroupKeys = new Set<string>();
  const kept = rows.filter((row) => {
    if (row.actorId === null) return true;
    const key = quasiIdentifierKey(row);
    if ((actorsByGroup.get(key)?.size ?? 0) >= k) return true;
    suppressedGroupKeys.add(key);
    return false;
  });

  return {
    rows: kept,
    suppressedRows: rows.length - kept.length,
    suppressedGroups: suppressedGroupKeys.size,
  };
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1;
  const left = String(a);
  const right = String(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Total order derived only from exported columns. Emitting rows in database
 * read order would leak the sub-bucket sequence of calls (and therefore part of
 * what the bucketing removes); it would also make the output depend on paging.
 */
function compareRows(a: LlmUsageExportRow, b: LlmUsageExportRow): number {
  for (const column of LLM_USAGE_EXPORT_COLUMNS) {
    const result = compareValues(a[column.name], b[column.name]);
    if (result !== 0) return result;
  }
  return 0;
}

/**
 * CSV cell rendering with spreadsheet formula-injection neutralisation. No
 * current column can carry a leading `=`/`+`/`-`/`@` (enums, config-owned model
 * names and error class names), but a future one must not silently become an
 * Excel formula in a file that gets mailed to a due-diligence reviewer.
 */
export function csvCell(value: string | number | boolean | null): string {
  if (value === null) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const neutralised = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(neutralised) ? `"${neutralised.replace(/"/g, '""')}"` : neutralised;
}

/** Normalise the validated query DTO into the options the exporter runs on. */
export function parseExportOptions(query: LlmUsageExportQueryDto): LlmUsageExportOptions {
  const from = query.from ? new Date(query.from) : undefined;
  const to = query.to ? new Date(query.to) : undefined;
  if (from && to && from.getTime() >= to.getTime()) {
    throw new BadRequestException('`from` must be strictly before `to`');
  }
  return {
    format: query.format ?? 'jsonl',
    bucket: query.bucket ?? 'hour',
    actor: query.actor ?? 'pseudonym',
    k: query.k ?? DEFAULT_K_ANONYMITY,
    limit: query.limit ?? DEFAULT_EXPORT_LIMIT,
    from,
    to,
  };
}

/**
 * Anonymising exporter for `llm_usage_events` (issue #523) — the portable
 * dataset artefact for ML work and due diligence.
 *
 * The live table is PSEUDONYMOUS, not anonymous (audit 2026-08-13, F11): its
 * `actorHash` is stable per user and its millisecond `createdAt` time-correlates
 * with `applications`/`validations`/`interview_sessions`. This exporter is what
 * closes that gap, and every transformation below exists for that reason:
 * drop the row id, bucket the timestamp, round the latency, re-key or drop the
 * actor, and suppress thin quasi-identifier groups.
 *
 * See docs/security/LLM_USAGE_DATASET.md for the guarantees this backs.
 */
@Injectable()
export class LlmUsageExportService {
  constructor(
    // Optional for the same reason as in LlmUsageService, and @Inject is
    // load-bearing there for the same reason too — see that constructor.
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  async buildDataset(options: LlmUsageExportOptions): Promise<LlmUsageExportDataset> {
    const prisma = this.prisma;
    if (!prisma) {
      throw new ServiceUnavailableException('LLM usage export requires a database connection');
    }

    const where =
      options.from || options.to
        ? {
            createdAt: {
              ...(options.from ? { gte: options.from } : {}),
              ...(options.to ? { lt: options.to } : {}),
            },
          }
        : {};

    const sourceRows = await prisma.llmUsageEvent.count({ where });

    const raw: SourceRow[] = [];
    let cursor: { id: string } | undefined;
    while (raw.length < options.limit) {
      const take = Math.min(DB_PAGE_SIZE, options.limit - raw.length);
      const page: SourceRow[] = await prisma.llmUsageEvent.findMany({
        where,
        select: EXPORT_SOURCE_SELECT,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take,
        ...(cursor ? { cursor, skip: 1 } : {}),
      });
      if (page.length === 0) break;
      raw.push(...page);
      cursor = { id: page[page.length - 1].id };
      if (page.length < take) break;
    }

    // Fresh, random, never persisted and never returned: the pseudonyms of two
    // exports cannot be joined to each other or back to the live actorHash.
    const exportSalt = options.actor === 'pseudonym' ? randomBytes(32) : null;
    const anonymised = raw.map((row) => this.anonymise(row, options, exportSalt));
    const { rows, suppressedRows, suppressedGroups } = applyKAnonymity(anonymised, options.k);
    rows.sort(compareRows);

    return {
      manifest: {
        dataset: 'llm_usage_events',
        schemaVersion: LLM_USAGE_EXPORT_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        parameters: {
          from: options.from?.toISOString() ?? null,
          to: options.to?.toISOString() ?? null,
          format: options.format,
          timestampBucket: options.bucket,
          actorMode: options.actor,
          kAnonymity: options.k,
          limit: options.limit,
        },
        counts: {
          sourceRows,
          readRows: raw.length,
          exportedRows: rows.length,
          suppressedRows,
          suppressedGroups,
          truncated: sourceRows > raw.length,
        },
        columns: LLM_USAGE_EXPORT_COLUMNS,
        quasiIdentifiers: QUASI_IDENTIFIERS,
        guarantees: this.guarantees(options),
        residualRisks: RESIDUAL_RISKS,
      },
      rows,
    };
  }

  /** Chunked so a large export streams instead of materialising one string. */
  *serialize(dataset: LlmUsageExportDataset): Generator<string> {
    const { format } = dataset.manifest.parameters;
    if (format === 'csv') {
      yield `${LLM_USAGE_EXPORT_COLUMNS.map((column) => column.name).join(',')}\n`;
    }

    let chunk = '';
    let rowsInChunk = 0;
    for (const row of dataset.rows) {
      chunk +=
        format === 'csv'
          ? `${LLM_USAGE_EXPORT_COLUMNS.map((column) => csvCell(row[column.name])).join(',')}\n`
          : `${JSON.stringify(row)}\n`;
      if (++rowsInChunk >= SERIALIZE_CHUNK_ROWS) {
        yield chunk;
        chunk = '';
        rowsInChunk = 0;
      }
    }
    if (chunk) yield chunk;
  }

  private anonymise(
    row: SourceRow,
    options: LlmUsageExportOptions,
    exportSalt: Buffer | null,
  ): LlmUsageExportRow {
    return {
      timeBucket: bucketTimestamp(row.createdAt, options.bucket),
      actorId:
        exportSalt && row.actorHash
          ? createHmac('sha256', exportSalt).update(row.actorHash).digest('hex').slice(0, 16)
          : null,
      feature: row.feature,
      provider: row.provider,
      model: row.model,
      lane: row.lane,
      tier: row.tier,
      language: row.language,
      promptTokens: row.promptTokens,
      completionTokens: row.completionTokens,
      totalTokens: row.totalTokens,
      cachedTokens: row.cachedTokens,
      latencyMs: roundLatency(row.latencyMs),
      success: row.success,
      circuitState: row.circuitState,
      errorKind: row.errorKind,
      estimatedCostUsd: row.estimatedCostUsd,
    };
  }

  private guarantees(options: LlmUsageExportOptions): string[] {
    return [
      'No User foreign key, email or name is read: the export selects an explicit column allow-list from llm_usage_events, a table that never stores prompt or response content.',
      'The source row id is used for cursor pagination only and is never exported — it is a cuid embedding a millisecond timestamp, which would undo the bucketing below.',
      `createdAt is truncated to the start of its UTC ${options.bucket}; no sub-bucket timestamp is exported, so a row cannot be time-correlated at millisecond precision with applications, validations or interview_sessions.`,
      `latencyMs is rounded to the nearest ${LATENCY_ROUNDING_MS} ms.`,
      options.actor === 'none'
        ? 'actorMode=none: no actor value is emitted at all, so the export cannot be grouped by person.'
        : 'The stored actorHash is never exported. It is re-keyed with a random 32-byte salt generated for this export and discarded afterwards, so pseudonyms are unlinkable across exports and cannot be joined back to the live table.',
      options.k > 1
        ? `k-anonymity k=${options.k}: a row carrying an actor is released only if its quasi-identifier group holds at least ${options.k} distinct actors.`
        : 'k-anonymity is DISABLED (k=1) — every row was released. Do not hand this configuration out externally.',
      'Rows are ordered by their exported column values only, so the database read order (and with it the sub-bucket call sequence) is not observable in the output.',
    ];
  }
}

const RESIDUAL_RISKS: string[] = [
  'Token counts, cost and latency are per-call measurements. A party that already holds a user\u2019s prompts could in principle match them, so an export with actorMode=pseudonym is pseudonymous personal data under GDPR and must be handled as such.',
  'Within a single export, actorMode=pseudonym still allows per-actor grouping. Combined with outside knowledge of when a specific person used the product, a small k can be insufficient — use actorMode=none with k>=5 for artefacts that leave the company.',
  'An export is a point-in-time copy. The retention sweep (LLM_USAGE_RETENTION_DAYS) and the account-deletion erasure hook only act on the live table, so every copy must be tracked and deleted separately.',
];
