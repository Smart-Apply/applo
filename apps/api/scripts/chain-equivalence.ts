/**
 * Chain-equivalence harness — proves `GenerationService` and the headless seam
 * issue the SAME LLM chain for the same profile + job posting.
 *
 *   LLM_PROVIDER=fake pnpm --filter @applo/api run chain:equivalence -- \
 *     --fixture marketing-de --path single
 *
 * Why calls and not just final text: the two implementations differ in what
 * they persist (`GenerationService` writes a converted résumé JSON whose ids
 * embed `Date.now()`), so comparing stored documents would report noise. What
 * #797 actually asserts is that one chain runs — same templates, same rendered
 * variables, same generation params. That is what this compares, plus the
 * final cover-letter text as an end-to-end tie-breaker.
 *
 * Deliberate scope: persistence is stubbed in-memory rather than backed by a
 * real Postgres. The seam exists precisely so the chain does not depend on the
 * database; a stub keeps this runnable offline, in seconds, by anyone. What it
 * does NOT cover is the Prisma write shape — that is unchanged by this
 * refactor and is exercised by the e2e suite.
 *
 * Offline + deterministic with `LLM_PROVIDER=fake` (no DB, no Azure, no cost).
 * Exits 1 when the chains diverge, so it can gate a change.
 */
import './headless-env-fill';
import 'reflect-metadata';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { ConfigModule } from '../src/config/config.module';
import { LLMModule } from '../src/llm/llm.module';
import { LLMService } from '../src/llm/llm.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { GenerationService } from '../src/applications/generation.service';
import { TitleGeneratorService } from '../src/applications/title-generator.service';
import { TemplatesService } from '../src/templates/templates.service';
import { SubscriptionService } from '../src/subscription/subscription.service';
import { GroundingValidatorService } from '../src/applications/grounding/grounding-validator.service';
import { generateApplication, type GenerationConfig } from '../src/applications/headless/generate';
import type { ProfileWithRelations } from '../src/applications/resume-template.util';
import { hydrateProfile, type EvalFixture } from './eval/fixture.types';

const USER_ID = 'equivalence-user';
const APPLICATION_ID = 'equivalence-application';
const JOB_POSTING_ID = 'equivalence-job';

interface RecordedCall {
  kind: 'callText' | 'callJson';
  templatePath: string;
  variables: Record<string, unknown>;
  options: Record<string, unknown>;
}

interface Recorder {
  llm: LLMService;
  calls: RecordedCall[];
}

/** Wrap a real LLMService so every chain call is logged before it dispatches. */
function makeRecorder(llm: LLMService): Recorder {
  const calls: RecordedCall[] = [];
  const wrap =
    (kind: 'callText' | 'callJson') =>
    (templatePath: string, variables: Record<string, unknown>, options?: Record<string, unknown>) => {
      const { onCallMeta: _onCallMeta, ...rest } = options ?? {};
      calls.push({ kind, templatePath, variables, options: rest });
      return (llm[kind] as (...a: unknown[]) => unknown)(templatePath, variables, options);
    };

  const proxy = new Proxy(llm, {
    get(target, prop, receiver) {
      if (prop === 'callText' || prop === 'callJson') return wrap(prop);
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

  return { llm: proxy as LLMService, calls };
}

/**
 * In-memory stand-in for the handful of Prisma reads/writes the generation
 * entrypoints make. Anything not implemented here is not on the chain path —
 * an unexpected call throws loudly rather than silently returning undefined.
 */
function makePrismaStub(profile: ProfileWithRelations, jobPosting: Record<string, unknown>) {
  const progress: Array<{ percent: number; message: string }> = [];
  const row: Record<string, unknown> = {
    id: APPLICATION_ID,
    userId: USER_ID,
    jobPostingId: JOB_POSTING_ID,
    title: 'Equivalence run',
    status: 'PENDING',
    // Non-null enables the cover letter: generateWithSinglePipeline infers
    // `shouldGenerateCoverLetter` from `coverLetterText !== null`.
    coverLetterText: '',
    resumeText: null,
    coverLetterLength: 'standard',
    language: jobPosting.language,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };

  return {
    progress,
    application: {
      // `createWithGeneration`'s duplicate guard queries with `deletedAt: null`
      // and must find nothing; `generateWithSinglePipeline` looks the row up by
      // id and must find it.
      findFirst: async (args?: { where?: Record<string, unknown> }) =>
        args?.where && 'deletedAt' in args.where ? null : { ...row, jobPosting },
      findUnique: async () => ({ ...row, jobPosting }),
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        progress.push({
          percent: data.generationProgress as number,
          message: (data.generationMessage as string) ?? '',
        });
        return { count: 1 };
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(row, data);
        return { ...row, jobPosting };
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(row, data);
        return { ...row, jobPosting };
      },
    },
    jobPosting: {
      findFirst: async () => jobPosting,
    },
    profile: {
      findUnique: async () => profile,
    },
    template: {
      findUnique: async () => null,
    },
  };
}

/** Order-insensitive, function-free view of one call, for diffing. */
function canonical(call: RecordedCall): string {
  return JSON.stringify({
    kind: call.kind,
    template: call.templatePath,
    variables: sortDeep(call.variables),
    options: sortDeep(call.options),
  });
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortDeep(v)]),
    );
  }
  return value;
}

function groupByTemplate(calls: RecordedCall[]): Map<string, RecordedCall[]> {
  const grouped = new Map<string, RecordedCall[]>();
  for (const call of calls) {
    const list = grouped.get(call.templatePath) ?? [];
    list.push(call);
    grouped.set(call.templatePath, list);
  }
  return grouped;
}

function describeVariableDelta(a: RecordedCall | undefined, b: RecordedCall | undefined): string[] {
  if (!a || !b) return [];
  const notes: string[] = [];
  const keysA = new Set(Object.keys(a.variables));
  const keysB = new Set(Object.keys(b.variables));
  const onlyA = [...keysA].filter((k) => !keysB.has(k));
  const onlyB = [...keysB].filter((k) => !keysA.has(k));
  if (onlyA.length) notes.push(`vars only in service: ${onlyA.join(', ')}`);
  if (onlyB.length) notes.push(`vars only in seam: ${onlyB.join(', ')}`);
  const changed = [...keysA]
    .filter((k) => keysB.has(k))
    .filter((k) => JSON.stringify(sortDeep(a.variables[k])) !== JSON.stringify(sortDeep(b.variables[k])));
  if (changed.length) notes.push(`vars differing: ${changed.join(', ')}`);

  const optKeys = new Set([...Object.keys(a.options), ...Object.keys(b.options)]);
  const optDiff = [...optKeys].filter(
    (k) => JSON.stringify(a.options[k]) !== JSON.stringify(b.options[k]),
  );
  if (optDiff.length) {
    notes.push(
      `opts differing: ${optDiff
        .map((k) => `${k}(${JSON.stringify(a.options[k])} vs ${JSON.stringify(b.options[k])})`)
        .join(', ')}`,
    );
  }
  return notes;
}

@Module({ imports: [ConfigModule, LLMModule] })
class EquivalenceModule {}

interface Args {
  fixture: string;
  pathName: 'single' | 'create';
}

function parseArgs(argv: string[]): Args {
  const args: Args = { fixture: 'marketing-de', pathName: 'single' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--fixture' && argv[i + 1]) args.fixture = argv[++i];
    else if (arg.startsWith('--fixture=')) args.fixture = arg.slice('--fixture='.length);
    else if (arg === '--path' && argv[i + 1]) args.pathName = argv[++i] as Args['pathName'];
    else if (arg.startsWith('--path=')) args.pathName = arg.slice('--path='.length) as Args['pathName'];
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const fixturePath = path.join(__dirname, 'eval', 'fixtures', `${args.fixture}.json`);
  const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf-8')) as EvalFixture;

  const profile = hydrateProfile(fixture);
  const jobPosting = {
    id: JOB_POSTING_ID,
    userId: USER_ID,
    title: fixture.jobPosting.title,
    company: fixture.jobPosting.company ?? null,
    location: fixture.jobPosting.location ?? null,
    description: fixture.jobPosting.fullText ?? '',
    fullText: fixture.jobPosting.fullText ?? '',
    language: fixture.language,
  } as Record<string, unknown>;

  const app = await NestFactory.createApplicationContext(EquivalenceModule, { logger: false });
  let divergences = 0;

  try {
    const llm = app.get(LLMService);
    const grounding = new GroundingValidatorService();

    // ── A: the live service path ───────────────────────────────────────────
    const serviceRecorder = makeRecorder(llm);
    const prismaStub = makePrismaStub(profile, jobPosting);
    const prisma = prismaStub as unknown as PrismaService;
    const service = new GenerationService(
      prisma,
      serviceRecorder.llm,
      { generateTitle: async () => 'Equivalence run' } as unknown as TitleGeneratorService,
      { findByCategoryAndLanguage: async () => null } as unknown as TemplatesService,
      {} as SubscriptionService,
      grounding,
    );

    const serviceResult =
      args.pathName === 'single'
        ? await service.generateWithSinglePipeline(APPLICATION_ID, USER_ID)
        : await service.createWithGeneration(USER_ID, {
            jobPostingId: JOB_POSTING_ID,
            generateCoverLetter: true,
            coverLetterLength: 'standard',
            language: fixture.language,
          });

    // ── B: the headless seam ───────────────────────────────────────────────
    const seamRecorder = makeRecorder(llm);
    const config: GenerationConfig = {
      language: fixture.language,
      generateCoverLetter: true,
      coverLetterLength: 'standard',
      context: { userId: USER_ID, jobPostingId: JOB_POSTING_ID },
    };
    const seamResult = await generateApplication(profile, fixture.jobPosting, config, {
      llm: seamRecorder.llm,
      grounding,
    });

    // ── compare ────────────────────────────────────────────────────────────
    const byTemplateA = groupByTemplate(serviceRecorder.calls);
    const byTemplateB = groupByTemplate(seamRecorder.calls);
    const templates = [...new Set([...byTemplateA.keys(), ...byTemplateB.keys()])].sort();

    process.stdout.write(
      `\n=== chain equivalence — fixture "${fixture.id}", path "${args.pathName}" ===\n` +
        `service calls: ${serviceRecorder.calls.length}   seam calls: ${seamRecorder.calls.length}\n\n`,
    );

    for (const template of templates) {
      const a = byTemplateA.get(template) ?? [];
      const b = byTemplateB.get(template) ?? [];
      const same =
        a.length === b.length && a.every((call, i) => canonical(call) === canonical(b[i]));
      if (!same) divergences++;
      const notes = describeVariableDelta(a[0], b[0]);
      const detail =
        a.length !== b.length ? `call count ${a.length} vs ${b.length}` : notes.join('; ') || '—';
      process.stdout.write(
        `${same ? '  ok  ' : ' DIFF '} ${template.padEnd(38)} A=${a.length} B=${b.length}  ${same ? '' : detail}\n`,
      );
    }

    const serviceCoverLetter = extractCoverLetterText(serviceResult.coverLetterText);
    const seamCoverLetter = (seamResult.coverLetter ?? '').trim();
    const coverLetterMatches = normalizeProse(serviceCoverLetter) === normalizeProse(seamCoverLetter);
    if (!coverLetterMatches) divergences++;
    process.stdout.write(
      `\n${coverLetterMatches ? '  ok  ' : ' DIFF '} final cover letter        ` +
        `service=${serviceCoverLetter.length} chars, seam=${seamCoverLetter.length} chars\n`,
    );

    // Progress writes are fire-and-forget; give the microtask queue a turn so
    // the ladder is complete before it is printed.
    await new Promise((resolve) => setImmediate(resolve));
    const ladder = prismaStub.progress.map((p) => `${p.percent}% ${p.message}`);
    const monotonic = prismaStub.progress.every((p, i, all) => i === 0 || p.percent >= all[i - 1].percent);
    process.stdout.write(
      `\nSSE progress ladder (${ladder.length} writes, ${monotonic ? 'monotonic' : 'NON-MONOTONIC'}):\n` +
        ladder.map((line) => `    ${line}\n`).join(''),
    );

    process.stdout.write(
      `\nVERDICT: ${divergences === 0 ? 'EQUIVALENT' : `DIVERGENT (${divergences} difference(s))`}\n\n`,
    );
  } finally {
    await app.close();
  }

  process.exitCode = divergences === 0 ? 0 : 1;
}

/** The service persists HTML; the seam returns Markdown. Compare the prose. */
function extractCoverLetterText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function normalizeProse(text: string): string {
  return text
    .replace(/[*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

main().catch((err) => {
  process.stderr.write(
    `chain-equivalence failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
});
