import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DEFAULT_EXPORT_LIMIT,
  DEFAULT_K_ANONYMITY,
  LLM_USAGE_EXPORT_COLUMNS,
  LlmUsageExportService,
  applyKAnonymity,
  bucketTimestamp,
  csvCell,
  parseExportOptions,
  roundLatency,
  type LlmUsageExportOptions,
  type LlmUsageExportRow,
} from '../../usage/llm-usage-export.service';
import type { LlmUsageExportQueryDto } from '../../usage/dto/llm-usage-export-query.dto';
import {
  LlmCircuitState,
  LlmFeature,
  LlmProviderKind,
  LlmRoutingLane,
  SubscriptionTier,
} from '../../../generated/prisma/client';

interface FakeSourceRow {
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

let rowCounter = 0;

function makeSourceRow(overrides: Partial<FakeSourceRow> = {}): FakeSourceRow {
  rowCounter += 1;
  return {
    id: `evt-${String(rowCounter).padStart(4, '0')}`,
    actorHash: 'a'.repeat(64),
    feature: LlmFeature.APPLICATION_COVER_LETTER,
    provider: LlmProviderKind.AZURE_OPENAI,
    model: 'gpt-4.1',
    lane: LlmRoutingLane.MAIN,
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
    cachedTokens: 0,
    tier: SubscriptionTier.PRO,
    language: 'de',
    latencyMs: 1234,
    success: true,
    circuitState: LlmCircuitState.CLOSED,
    errorKind: null,
    estimatedCostUsd: 0.0006,
    createdAt: new Date('2026-08-16T11:17:18.497Z'),
    ...overrides,
  };
}

interface FindManyArgs {
  take: number;
  cursor?: { id: string };
  skip?: number;
  where?: { createdAt?: { gte?: Date; lt?: Date } };
}

function matches(row: FakeSourceRow, where: FindManyArgs['where']): boolean {
  const range = where?.createdAt;
  if (!range) return true;
  if (range.gte && row.createdAt.getTime() < range.gte.getTime()) return false;
  if (range.lt && row.createdAt.getTime() >= range.lt.getTime()) return false;
  return true;
}

/** Minimal stand-in for the two Prisma calls the exporter makes. */
function createFakePrisma(rows: FakeSourceRow[]): PrismaService {
  const ordered = [...rows].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : 1),
  );
  return {
    llmUsageEvent: {
      count: vi.fn(async ({ where }: { where?: FindManyArgs['where'] }) =>
        ordered.filter((row) => matches(row, where)).length,
      ),
      findMany: vi.fn(async ({ take, cursor, skip, where }: FindManyArgs) => {
        const visible = ordered.filter((row) => matches(row, where));
        const start = cursor
          ? visible.findIndex((row) => row.id === cursor.id) + (skip ?? 0)
          : 0;
        return visible.slice(start, start + take);
      }),
    },
  } as unknown as PrismaService;
}

function options(overrides: Partial<LlmUsageExportOptions> = {}): LlmUsageExportOptions {
  return {
    format: 'jsonl',
    bucket: 'hour',
    actor: 'pseudonym',
    k: 1,
    limit: DEFAULT_EXPORT_LIMIT,
    ...overrides,
  };
}

function makeExportRow(overrides: Partial<LlmUsageExportRow> = {}): LlmUsageExportRow {
  return {
    timeBucket: '2026-08-16T11:00:00.000Z',
    actorId: 'actor-1',
    feature: LlmFeature.APPLICATION_COVER_LETTER,
    provider: LlmProviderKind.AZURE_OPENAI,
    model: 'gpt-4.1',
    lane: LlmRoutingLane.MAIN,
    tier: SubscriptionTier.PRO,
    language: 'de',
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
    cachedTokens: 0,
    latencyMs: 1230,
    success: true,
    circuitState: LlmCircuitState.CLOSED,
    errorKind: null,
    estimatedCostUsd: 0.0006,
    ...overrides,
  };
}

describe('bucketTimestamp', () => {
  const at = new Date('2026-08-16T11:17:18.497Z');

  it.each([
    ['hour', '2026-08-16T11:00:00.000Z'],
    ['day', '2026-08-16T00:00:00.000Z'],
    ['month', '2026-08-01T00:00:00.000Z'],
  ] as const)('truncates to the start of the UTC %s', (bucket, expected) => {
    expect(bucketTimestamp(at, bucket)).toBe(expected);
  });
});

describe('roundLatency', () => {
  it.each([
    [0, 0],
    [4, 0],
    [5, 10],
    [1234, 1230],
    [1235, 1240],
  ])('rounds %i ms to %i ms', (input, expected) => {
    expect(roundLatency(input)).toBe(expected);
  });
});

describe('csvCell', () => {
  it.each([
    [null, ''],
    [42, '42'],
    [true, 'true'],
    ['gpt-4.1', 'gpt-4.1'],
    ['a,b', '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ['line\nbreak', '"line\nbreak"'],
  ] as const)('renders %j as %j', (input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });

  // A cell a spreadsheet would execute must not stay executable in a file
  // that gets mailed to a reviewer.
  it.each(['=1+1', '+1', '-1', '@SUM(A1)'])('neutralises the formula trigger in %j', (input) => {
    expect(csvCell(input)).toBe(`'${input}`);
  });
});

describe('applyKAnonymity', () => {
  it('suppresses a quasi-identifier group backed by fewer than k distinct actors', () => {
    const rows = [
      ...Array.from({ length: 5 }, (_, i) => makeExportRow({ actorId: `actor-${i}` })),
      makeExportRow({ actorId: 'lonely', feature: LlmFeature.INTERVIEW_FEEDBACK }),
    ];

    const result = applyKAnonymity(rows, 5);

    expect(result.rows).toHaveLength(5);
    expect(result.suppressedRows).toBe(1);
    expect(result.suppressedGroups).toBe(1);
    expect(result.rows.some((row) => row.actorId === 'lonely')).toBe(false);
  });

  // Counting rows instead of people would let one heavy user pass as a crowd.
  it('counts distinct actors, not rows', () => {
    const rows = Array.from({ length: 10 }, () => makeExportRow({ actorId: 'same-person' }));

    expect(applyKAnonymity(rows, 5).rows).toHaveLength(0);
  });

  it('always releases rows that carry no actor', () => {
    const rows = [makeExportRow({ actorId: null }), makeExportRow({ actorId: 'lonely' })];

    const result = applyKAnonymity(rows, 5);

    expect(result.rows).toEqual([rows[0]]);
    expect(result.suppressedRows).toBe(1);
  });

  it('suppresses nothing when k=1', () => {
    const rows = [makeExportRow({ actorId: 'lonely' })];

    expect(applyKAnonymity(rows, 1)).toEqual({
      rows,
      suppressedRows: 0,
      suppressedGroups: 0,
    });
  });
});

describe('parseExportOptions', () => {
  it('applies the documented defaults', () => {
    expect(parseExportOptions({} as LlmUsageExportQueryDto)).toEqual({
      format: 'jsonl',
      bucket: 'hour',
      actor: 'pseudonym',
      k: DEFAULT_K_ANONYMITY,
      limit: DEFAULT_EXPORT_LIMIT,
      from: undefined,
      to: undefined,
    });
  });

  it('rejects an inverted time range', () => {
    expect(() =>
      parseExportOptions({
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-08-01T00:00:00.000Z',
      } as LlmUsageExportQueryDto),
    ).toThrow(BadRequestException);
  });
});

describe('LlmUsageExportService', () => {
  it('never exports the row id, the raw timestamp or the stored actorHash', async () => {
    const actorHash = 'f'.repeat(64);
    const source = makeSourceRow({ id: 'evt-secret-id', actorHash });
    const service = new LlmUsageExportService(createFakePrisma([source]));

    const dataset = await service.buildDataset(options());
    const serialised = [...service.serialize(dataset)].join('');

    expect(dataset.rows).toHaveLength(1);
    expect(Object.keys(dataset.rows[0])).toEqual(
      LLM_USAGE_EXPORT_COLUMNS.map((column) => column.name),
    );
    expect(serialised).not.toContain(source.id);
    expect(serialised).not.toContain(actorHash);
    expect(serialised).not.toContain(source.createdAt.toISOString());
    expect(dataset.rows[0].timeBucket).toBe('2026-08-16T11:00:00.000Z');
    expect(dataset.rows[0].latencyMs).toBe(1230);
  });

  it('re-keys the actor per export: stable within one, unlinkable across two', async () => {
    const prisma = createFakePrisma([
      makeSourceRow({ actorHash: 'a'.repeat(64) }),
      makeSourceRow({ actorHash: 'a'.repeat(64) }),
      makeSourceRow({ actorHash: 'b'.repeat(64) }),
    ]);
    const service = new LlmUsageExportService(prisma);

    const first = await service.buildDataset(options());
    const second = await service.buildDataset(options());

    const firstActors = new Set(first.rows.map((row) => row.actorId));
    expect(firstActors.size).toBe(2);
    expect(
      first.rows.every((row) => second.rows.every((other) => other.actorId !== row.actorId)),
    ).toBe(true);
  });

  it('emits no actor value at all with actor=none', async () => {
    const service = new LlmUsageExportService(
      createFakePrisma([makeSourceRow(), makeSourceRow({ actorHash: 'b'.repeat(64) })]),
    );

    const dataset = await service.buildDataset(options({ actor: 'none' }));

    expect(dataset.rows.every((row) => row.actorId === null)).toBe(true);
  });

  // With no actor and no pseudonym salt in play the artefact must be
  // byte-reproducible — that is the due-diligence claim.
  it('is byte-reproducible for the same window when actor=none', async () => {
    const rows = [
      makeSourceRow({ createdAt: new Date('2026-08-16T11:59:59.999Z') }),
      makeSourceRow({ createdAt: new Date('2026-08-16T11:00:00.001Z'), model: 'gpt-4.1-mini' }),
      makeSourceRow({ createdAt: new Date('2026-08-16T11:30:00.000Z'), latencyMs: 10 }),
    ];
    const service = new LlmUsageExportService(createFakePrisma(rows));
    const reversed = new LlmUsageExportService(createFakePrisma([...rows].reverse()));

    const first = [...service.serialize(await service.buildDataset(options({ actor: 'none' })))];
    const second = [
      ...reversed.serialize(await reversed.buildDataset(options({ actor: 'none' }))),
    ];

    expect(first.join('')).toBe(second.join(''));
  });

  it('honours the time window and reports truncation in the manifest', async () => {
    const service = new LlmUsageExportService(
      createFakePrisma([
        makeSourceRow({ createdAt: new Date('2026-07-31T23:59:59.999Z') }),
        makeSourceRow({ createdAt: new Date('2026-08-01T00:00:00.000Z') }),
        makeSourceRow({ createdAt: new Date('2026-08-15T12:00:00.000Z') }),
        makeSourceRow({ createdAt: new Date('2026-09-01T00:00:00.000Z') }),
      ]),
    );

    const dataset = await service.buildDataset(
      options({ from: new Date('2026-08-01T00:00:00.000Z'), to: new Date('2026-09-01T00:00:00.000Z'), limit: 1 }),
    );

    expect(dataset.manifest.counts).toMatchObject({
      sourceRows: 2,
      readRows: 1,
      exportedRows: 1,
      truncated: true,
    });
    expect(dataset.manifest.parameters).toMatchObject({
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-09-01T00:00:00.000Z',
      timestampBucket: 'hour',
    });
  });

  it('pages through the source table with a cursor', async () => {
    const rows = Array.from({ length: 2_500 }, (_, i) =>
      makeSourceRow({ createdAt: new Date(Date.UTC(2026, 7, 16, 11, 0, 0, i)) }),
    );
    const prisma = createFakePrisma(rows);
    const service = new LlmUsageExportService(prisma);

    const dataset = await service.buildDataset(options());

    expect(dataset.rows).toHaveLength(2_500);
    expect(prisma.llmUsageEvent.findMany).toHaveBeenCalledTimes(3);
  });

  it('serialises CSV with the schema header and JSONL as one object per line', async () => {
    const service = new LlmUsageExportService(createFakePrisma([makeSourceRow()]));

    const csv = [...service.serialize(await service.buildDataset(options({ format: 'csv' })))]
      .join('')
      .trim()
      .split('\n');
    const jsonl = [...service.serialize(await service.buildDataset(options({ format: 'jsonl' })))]
      .join('')
      .trim()
      .split('\n');

    expect(csv[0]).toBe(LLM_USAGE_EXPORT_COLUMNS.map((column) => column.name).join(','));
    expect(csv[1].split(',')).toHaveLength(LLM_USAGE_EXPORT_COLUMNS.length);
    expect(jsonl).toHaveLength(1);
    expect(JSON.parse(jsonl[0])).toMatchObject({
      feature: LlmFeature.APPLICATION_COVER_LETTER,
      timeBucket: '2026-08-16T11:00:00.000Z',
    });
  });

  it('documents the anonymity guarantees and residual risks in the manifest', async () => {
    const service = new LlmUsageExportService(createFakePrisma([makeSourceRow()]));

    const { manifest } = await service.buildDataset(options({ k: 5, actor: 'none' }));

    expect(manifest.columns).toEqual(LLM_USAGE_EXPORT_COLUMNS);
    expect(manifest.guarantees.join(' ')).toContain('k=5');
    expect(manifest.guarantees.join(' ')).toContain('actorMode=none');
    expect(manifest.residualRisks.length).toBeGreaterThan(0);
  });

  it('warns in the manifest when suppression is disabled', async () => {
    const service = new LlmUsageExportService(createFakePrisma([makeSourceRow()]));

    const { manifest } = await service.buildDataset(options({ k: 1 }));

    expect(manifest.guarantees.join(' ')).toContain('k-anonymity is DISABLED');
  });
});
