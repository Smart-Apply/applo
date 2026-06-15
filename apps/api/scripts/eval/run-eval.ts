/**
 * LLM-as-judge evaluation harness — entrypoint (item #10).
 *
 * Runs the REAL v1 generation chain over the committed golden fixtures, scores
 * each output with an LLM judge (rubric #1/#3/#4/#5) and the deterministic
 * grounding validator (#7), then prints + writes a timestamped summary. Capture
 * a baseline now and re-run after each phase to prove the lift.
 *
 *   pnpm eval:llm                      # all fixtures, tag "baseline"
 *   pnpm eval:llm -- --limit=4         # first 4 fixtures (cheap smoke run)
 *   pnpm eval:llm -- --only=healthcare-de,sales-en
 *   pnpm eval:llm -- --tag=after-phase3
 *
 * Requires real LLM creds: LLM_PROVIDER=azure-openai (+ Azure vars) in
 * apps/api/.env. With LLM_PROVIDER=mock it skips gracefully (exit 0) because the
 * mock provider ignores prompts and would not measure anything real.
 */
import 'reflect-metadata';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '../../src/config/config.module';
import { LLMModule } from '../../src/llm/llm.module';
import { LLMService } from '../../src/llm/llm.service';
import { generateForFixture } from './pipeline-runner';
import { judgeDocuments } from './judge';
import { groundDocuments } from './grounding';
import { summarize, formatReport, type FixtureResult } from './aggregate';
import { hydrateProfile, type EvalFixture } from './fixture.types';
import {
  serializeProfileForLlm,
  serializeJobPostingForLlm,
} from '../../src/applications/serialize.util';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const RESULTS_DIR = path.join(__dirname, 'results');

@Module({ imports: [ConfigModule, LLMModule] })
class EvalHarnessModule {}

interface CliArgs {
  limit?: number;
  only?: string[];
  tag: string;
  concurrency: number;
  delayMs: number;
  retries: number;
  out?: string;
  validate: boolean;
  applyWeave: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    tag: 'baseline',
    concurrency: 1,
    delayMs: 1500,
    retries: 5,
    validate: false,
    applyWeave: true,
  };
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key === 'limit' && value) args.limit = Number(value);
    else if (key === 'only' && value) args.only = value.split(',').map((s) => s.trim());
    else if (key === 'tag' && value) args.tag = value;
    else if (key === 'concurrency' && value) args.concurrency = Math.max(1, Number(value));
    else if (key === 'delay' && value) args.delayMs = Math.max(0, Number(value));
    else if (key === 'retries' && value) args.retries = Math.max(0, Number(value));
    else if (key === 'out' && value) args.out = value;
    else if (key === 'validate') args.validate = true;
    else if (key === 'no-weave') args.applyWeave = false;
  }
  return args;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Rate-limit / circuit-breaker / network errors worth retrying. */
function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|too many requests|overloaded|überlastet|Breaker is open|503|Service Unavailable|ECONNRESET|ETIMEDOUT|rechtzeitig/i.test(
    msg,
  );
}

/**
 * Retry a step on transient failures with exponential backoff. The backoff
 * intentionally grows past the LLMService circuit-breaker reset (~30s) so a
 * tripped breaker has time to close before the next attempt.
 */
async function withRetry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries || !isTransient(err)) throw err;
      const waitMs = Math.min(64000, 4000 * 2 ** (attempt - 1)); // 4s,8s,16s,32s,64s
      process.stdout.write(`(throttled, retry ${attempt}/${retries} in ${Math.round(waitMs / 1000)}s) `);
      await sleep(waitMs);
    }
  }
}

async function loadFixtures(args: CliArgs): Promise<EvalFixture[]> {
  let entries: string[];
  try {
    entries = (await fs.readdir(FIXTURES_DIR)).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  entries.sort();

  const fixtures: EvalFixture[] = [];
  for (const file of entries) {
    const raw = await fs.readFile(path.join(FIXTURES_DIR, file), 'utf-8');
    const fixture = JSON.parse(raw) as EvalFixture;
    if (args.only && !args.only.includes(fixture.id)) continue;
    fixtures.push(fixture);
  }

  const selected = args.limit ? fixtures.slice(0, args.limit) : fixtures;
  return selected;
}

async function runOne(
  llm: LLMService,
  fixture: EvalFixture,
  retries: number,
  applyWeave: boolean,
): Promise<FixtureResult> {
  const base = {
    id: fixture.id,
    profession: fixture.profession,
    language: fixture.language,
  };
  try {
    const docs = await withRetry(() => generateForFixture(llm, fixture, { applyWeave }), retries);
    const grounding = groundDocuments(fixture, docs);
    const judge = await withRetry(() => judgeDocuments(llm, fixture, docs), retries);
    return {
      ...base,
      judge,
      grounding: {
        grounded: grounding.grounded,
        score: grounding.score,
        totalChecked: grounding.totalChecked,
        unsupportedCount: grounding.unsupported.length,
        unsupportedValues: grounding.unsupported.map((u) => u.value),
      },
      coverage: {
        wanted: docs.coverageAfterWeave.wanted,
        beforeRate: docs.coverageBeforeWeave.rate,
        afterRate: docs.coverageAfterWeave.rate,
        weaveApplied: docs.weaveApplied,
        weaveKeywords: docs.weaveKeywords,
      },
      durationMs: docs.durationMs,
      editorApplied: docs.editorApplied,
      resumeEditorApplied: docs.resumeEditorApplied,
      resumeRewriteSucceeded: docs.resumeRewriteSucceeded,
    };
  } catch (err) {
    return {
      ...base,
      durationMs: 0,
      editorApplied: false,
      resumeEditorApplied: false,
      resumeRewriteSucceeded: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Run fixtures with a small concurrency pool to respect rate limits. */
async function runPool(
  llm: LLMService,
  fixtures: EvalFixture[],
  args: CliArgs,
): Promise<FixtureResult[]> {
  const results: FixtureResult[] = new Array(fixtures.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = next++;
      if (index >= fixtures.length) return;
      const fixture = fixtures[index];
      process.stdout.write(`  → [${index + 1}/${fixtures.length}] ${fixture.id} ... `);
      const result = await runOne(llm, fixture, args.retries, args.applyWeave);
      process.stdout.write(result.error ? `ERROR\n` : `overall ${result.judge?.overall}\n`);
      results[index] = result;
      if (args.delayMs > 0 && index + 1 < fixtures.length) await sleep(args.delayMs);
    }
  }

  const workers = Array.from({ length: Math.min(args.concurrency, fixtures.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

/**
 * Structural validation only — hydrate + serialize every fixture without calling
 * the LLM. Token-free; safe to run with LLM_PROVIDER=mock and in CI.
 */
async function validateFixtures(fixtures: EvalFixture[]): Promise<number> {
  let failed = 0;
  for (const fixture of fixtures) {
    try {
      if (!fixture.id || !fixture.language || !fixture.profile || !fixture.jobPosting) {
        throw new Error('missing required top-level field (id/language/profile/jobPosting)');
      }
      if (!fixture.profile.summary || fixture.profile.experiences.length === 0) {
        throw new Error('profile needs a summary and at least one experience');
      }
      if (!fixture.jobPosting.fullText) {
        throw new Error('jobPosting needs fullText');
      }
      const profile = hydrateProfile(fixture);
      serializeProfileForLlm(profile);
      serializeJobPostingForLlm(fixture.jobPosting);
      console.log(`  ✓ ${fixture.id} (${fixture.profession}, ${fixture.language})`);
    } catch (err) {
      failed++;
      console.log(`  ✖ ${fixture.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return failed;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.validate) {
    const fixtures = await loadFixtures(args);
    console.log(`\n🔍 Validating ${fixtures.length} fixtures (no LLM calls)...\n`);
    const failed = await validateFixtures(fixtures);
    console.log(
      failed
        ? `\n✖ ${failed} fixture(s) invalid.\n`
        : `\n✓ All ${fixtures.length} fixtures valid.\n`,
    );
    process.exit(failed ? 1 : 0);
  }

  const provider = (process.env.LLM_PROVIDER ?? 'mock').toLowerCase();

  if (provider === 'mock' || provider === '') {
    console.log(
      '\n⚠️  LLM_PROVIDER is "mock" (or unset) — the mock provider ignores prompts, so the\n' +
        '   eval would not measure real output quality. Set LLM_PROVIDER=azure-openai with\n' +
        '   Azure creds in apps/api/.env to run a real baseline. Skipping.\n',
    );
    return;
  }

  const fixtures = await loadFixtures(args);
  if (fixtures.length === 0) {
    console.log(`\n⚠️  No fixtures found in ${FIXTURES_DIR}. Nothing to evaluate.\n`);
    return;
  }

  console.log(
    `\n🧪 Running eval (provider=${provider}, fixtures=${fixtures.length}, ` +
      `concurrency=${args.concurrency}, weave=${args.applyWeave ? 'on' : 'off'}, tag=${args.tag})\n`,
  );

  const app = await NestFactory.createApplicationContext(EvalHarnessModule, {
    // Surface 'log' level (incl. the #8 JSON parse-clean telemetry) when
    // LOG_LLM_CALLS is set, otherwise keep the run output quiet.
    logger:
      process.env.LOG_LLM_CALLS === 'true' ? ['error', 'warn', 'log'] : ['error', 'warn'],
  });

  try {
    const llm = app.get(LLMService);
    const results = await runPool(llm, fixtures, args);
    const summary = summarize(results, { provider, tag: args.tag });

    console.log(formatReport(summary));

    await fs.mkdir(RESULTS_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = args.out
      ? path.resolve(args.out)
      : path.join(RESULTS_DIR, `eval-${args.tag}-${stamp}.json`);
    await fs.writeFile(outPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`📄 Full results written to ${outPath}\n`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('Eval harness failed:', err);
  process.exit(1);
});
