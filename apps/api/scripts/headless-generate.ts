/**
 * Headless generation CLI — the process seam the eval platform calls.
 *
 *   pnpm generate:headless -- --score < input.json > result.json
 *
 * Input (stdin, or --in <file>): JSON with either a fixture or raw objects:
 *   {
 *     "fixture": <EvalFixture>,            // scripts/eval/fixture.types.ts shape
 *     // or: "profile": <ProfileWithRelations-ish>, "job": <SerializableJobPosting>,
 *     "config": <Partial<GenerationConfig>> // optional; language/coverLetter
 *                                            // default from the fixture
 *   }
 *
 * Output: ONE JSON document on stdout (nothing else — logs go to stderr), the
 * `GenerationResult` plus run metadata and (with --score) the deterministic
 * quality reports produced by the product's own validators (grounding,
 * style-lint, ATS coverage, structural validity). See ADR-0003 in applo-eval:
 * scoring runs in-process here so scorer version == generator version.
 *
 * Flags:
 *   --in <file>   read input JSON from a file instead of stdin
 *   --score       embed deterministic scorer reports
 *   --pretty      pretty-print the output JSON
 *
 * Works offline with LLM_PROVIDER=fake (no DB, no Azure, no cost): required-
 * but-unused env vars (DATABASE_URL, JWT secrets) are auto-filled with
 * placeholders when absent, because this process never touches them.
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
import {
  generateApplication,
  type GenerationConfig,
  type GenerationResult,
} from '../src/applications/headless/generate';
import { GroundingValidatorService } from '../src/applications/grounding/grounding-validator.service';
import { lintGeneratedStyle } from '../src/applications/style-lint.util';
import { countResumeStyleViolations } from '../src/applications/resume-editor.util';
import { computePriority1Coverage } from '../src/applications/keyword-coverage.util';
import type { ProfileWithRelations } from '../src/applications/resume-template.util';
import type { SerializableJobPosting } from '../src/applications/serialize.util';
import type {
  RewrittenProfileDto,
  TailoredProfileDto,
  SelectedExperience,
  SelectedProject,
} from '../src/applications/dto/tailored-profile.dto';
import { hydrateProfile, type EvalFixture } from './eval/fixture.types';

interface CliInput {
  fixture?: EvalFixture;
  profile?: ProfileWithRelations;
  job?: SerializableJobPosting;
  config?: Partial<GenerationConfig>;
}

interface CliArgs {
  inFile?: string;
  score: boolean;
  pretty: boolean;
}

/** A human-readable résumé view (title/company + rewritten prose) for the UI. */
interface ResumeView {
  summary: string;
  experiences: Array<{
    profileExperienceId: string | null;
    title: string;
    company: string;
    description: string;
    achievements: string[];
  }>;
  projects: Array<{
    profileProjectId: string | null;
    name: string;
    description: string;
    highlights: string[];
  }>;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { score: false, pretty: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--score') args.score = true;
    else if (arg === '--pretty') args.pretty = true;
    else if (arg === '--in' && argv[i + 1]) args.inFile = argv[++i];
    else if (arg.startsWith('--in=')) args.inFile = arg.slice('--in='.length);
  }
  return args;
}

async function readInput(args: CliArgs): Promise<CliInput> {
  if (args.inFile) {
    return JSON.parse(await fs.readFile(path.resolve(args.inFile), 'utf-8')) as CliInput;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf-8').trim();
  if (!raw) {
    throw new Error('No input: pipe JSON to stdin or pass --in <file>. See file header.');
  }
  return JSON.parse(raw) as CliInput;
}

/** Map the structured result back to a readable résumé document view. */
function buildResumeView(
  tailored: TailoredProfileDto,
  rewritten: RewrittenProfileDto | null,
  fallbackSummary: string,
): ResumeView {
  const expById = new Map<string, SelectedExperience>();
  for (const exp of tailored.selected_experiences ?? []) {
    if (exp.profileExperienceId) expById.set(exp.profileExperienceId, exp);
  }
  const projById = new Map<string, SelectedProject>();
  for (const proj of tailored.selected_projects ?? []) {
    if (proj.profileProjectId) projById.set(proj.profileProjectId, proj);
  }

  if (rewritten) {
    return {
      summary: rewritten.rewritten_summary || fallbackSummary || '',
      experiences: (rewritten.rewritten_experiences ?? []).map((re) => ({
        profileExperienceId: re.profileExperienceId,
        title: expById.get(re.profileExperienceId)?.title ?? '',
        company: expById.get(re.profileExperienceId)?.company ?? '',
        description: re.rewritten_description ?? '',
        achievements: re.rewritten_achievements ?? [],
      })),
      projects: (rewritten.rewritten_projects ?? []).map((rp) => ({
        profileProjectId: rp.profileProjectId,
        name: projById.get(rp.profileProjectId)?.name ?? '',
        description: rp.rewritten_description ?? '',
        highlights: rp.rewritten_highlights ?? [],
      })),
    };
  }

  // Degraded fallback — mirror the live pipeline continuing with selector data.
  return {
    summary: fallbackSummary || '',
    experiences: (tailored.selected_experiences ?? []).map((exp) => ({
      profileExperienceId: exp.profileExperienceId,
      title: exp.title,
      company: exp.company,
      description: exp.summary ?? '',
      achievements: [],
    })),
    projects: (tailored.selected_projects ?? []).map((proj) => ({
      profileProjectId: proj.profileProjectId,
      name: proj.name,
      description: proj.summary ?? '',
      highlights: [],
    })),
  };
}

/** Prose-only resume JSON — the exact shape the grounding validator walks. */
function resumeJsonForGrounding(view: ResumeView): string {
  return JSON.stringify({
    summary: view.summary,
    experiences: view.experiences.map((e) => ({
      description: e.description,
      achievements: e.achievements,
    })),
    projects: view.projects.map((p) => ({
      description: p.description,
      highlights: p.highlights,
    })),
  });
}

function computeScores(
  result: GenerationResult,
  profile: ProfileWithRelations,
  view: ResumeView,
  language: string,
) {
  const grounding = new GroundingValidatorService().validate(
    { resume: resumeJsonForGrounding(view), coverLetter: result.coverLetter },
    profile,
  );
  const styleCoverLetter = lintGeneratedStyle(result.coverLetter, language);
  const styleResume = result.resume
    ? countResumeStyleViolations(result.resume, language)
    : { aiPhrases: [], hedging: [], verbFirstBullets: [], total: 0 };
  const finalCoverage = computePriority1Coverage(result.atsKeywords, result.coverLetter);

  return {
    grounding: {
      grounded: grounding.grounded,
      score: grounding.score,
      totalChecked: grounding.totalChecked,
      unsupported: grounding.unsupported,
    },
    style: {
      coverLetter: styleCoverLetter,
      resume: styleResume,
      total: styleCoverLetter.total + styleResume.total,
    },
    atsCoverage: {
      beforeWeave: result.coverage.beforeWeave,
      afterWeave: result.coverage.afterWeave,
      final: finalCoverage,
    },
    structural: {
      resumeRewriteSucceeded: result.resume !== null,
      coverLetterGenerated: result.coverLetter !== null && result.coverLetter.trim() !== '',
      atsKeywordsExtracted: result.atsKeywords !== null,
    },
    guards: result.guards,
  };
}

@Module({ imports: [ConfigModule, LLMModule] })
class HeadlessCliModule {}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const input = await readInput(args);

  let profile: ProfileWithRelations;
  let job: SerializableJobPosting;
  let fixtureMeta: { id: string; profession?: string; language?: string } | null = null;

  if (input.fixture) {
    profile = hydrateProfile(input.fixture);
    job = input.fixture.jobPosting;
    fixtureMeta = {
      id: input.fixture.id,
      profession: input.fixture.profession,
      language: input.fixture.language,
    };
  } else if (input.profile && input.job) {
    profile = input.profile;
    job = input.job;
  } else {
    throw new Error('Input must contain either "fixture" or both "profile" and "job".');
  }

  const config: GenerationConfig = {
    language: input.config?.language ?? input.fixture?.language ?? 'de',
    generateCoverLetter: input.config?.generateCoverLetter ?? true,
    models: input.config?.models,
    promptVersion: input.config?.promptVersion,
    toggles: input.config?.toggles,
    context: input.config?.context ?? {
      userId: fixtureMeta?.id ?? 'headless',
      jobPostingId: fixtureMeta?.id ?? 'headless',
    },
  };

  const debug = process.env.DEBUG_HEADLESS === 'true';
  const app = await NestFactory.createApplicationContext(HeadlessCliModule, {
    // stdout must carry ONLY the result JSON; Nest logs otherwise land there.
    logger: debug ? ['error', 'warn', 'log'] : false,
  });

  try {
    const llm = app.get(LLMService);
    // One validator for the chain's repair passes AND the scorer below, so the
    // grounding verdict can't differ between them.
    const grounding = new GroundingValidatorService();
    const result = await generateApplication(profile, job, config, { llm, grounding });
    const view = buildResumeView(result.tailoredProfile, result.resume, profile.summary ?? '');

    const output = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      provider: process.env.LLM_PROVIDER ?? 'mock',
      fixture: fixtureMeta,
      config,
      result,
      resumeView: view,
      scores: args.score ? computeScores(result, profile, view, config.language) : undefined,
    };

    process.stdout.write(JSON.stringify(output, null, args.pretty ? 2 : undefined) + '\n');
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  process.stderr.write(`headless-generate failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
