import type { LLMService, LLMCallMeta } from '../../llm/llm.service';
import type { ReasoningEffort } from '../../llm/providers/model-tuning.util';
import type { ProfileWithRelations } from '../resume-template.util';
import {
  serializeProfileForLlm,
  serializeJobPostingForLlm,
  type SerializableJobPosting,
} from '../serialize.util';
import type {
  TailoredProfileDto,
  RewrittenProfileDto,
} from '../dto/tailored-profile.dto';
import {
  matchAtsKeywordsToProfile,
  selectKeywordsToWeave,
  computePriority1Coverage,
  type MatchedAtsKeywords,
  type CoverageReport,
} from '../keyword-coverage.util';
import {
  countResumeStyleViolations,
  evaluateResumeStyleRewrite,
  isValidResumeEdit,
} from '../resume-editor.util';
import {
  buildSalutation,
  isValidJobFacts,
  normalizeJobFacts,
  type JobFactsDto,
} from '../job-facts.util';
import { evaluateStyleRewrite, lintGeneratedStyle } from '../style-lint.util';
import { lintCoverLetterLength, evaluateShortenRewrite } from '../style-lint.util';
import { isValidTailoredProfile, isDegradedTailoredProfile } from '../tailored-profile.util';
import {
  evaluateGroundingRepair,
  evaluateResumeGroundingRepair,
} from '../grounding/grounding-repair.util';
import type { GroundingValidatorService } from '../grounding/grounding-validator.service';
import { extractResumeProse } from '../resume-editor.util';
import { isKeywordPresent } from '../keyword-coverage.util';
import {
  GENERATION_SYSTEM_ANCHOR,
  resolveCoverLetterBudget,
  resolveCoverLetterTargetMin,
} from '../constants';

/**
 * Headless, config-driven generation entrypoint — the single implementation of
 * the v1 application-generation chain.
 *
 * Zero persistence, zero auth, zero storage, zero subscription metering: plain
 * objects in, plain objects out. `ApplicationsService.createWithGeneration`
 * calls this same function and then does its own persistence, and the eval
 * platform calls it through `scripts/headless-generate.ts` — so the live path
 * and the eval path can never drift apart.
 *
 * Chain (identical order, temperatures and guards as the live pipeline):
 *   1a skill-selector ∥ 1b job-facts
 *   2  resume-rewrite ∥ 3 cover-letter ∥ 6 ats-keywords
 *   2.5 resume editor pass (guarded)   → 2.7 résumé style-rewrite (guarded)
 *   3.5 cover-letter editor (guarded)  → 4 keyword weave (guarded)
 *   5  cover-letter style-rewrite (guarded)
 */

/** One logical LLM call in the v1 chain. Keys are used in `GenerationConfig.models`. */
export type PipelineStep =
  | 'skillSelector'
  | 'jobFacts'
  | 'resumeRewrite'
  | 'resumeEditor'
  | 'resumeStyleRewrite'
  | 'coverLetter'
  | 'coverLetterEditor'
  | 'keywordWeave'
  | 'styleRewrite'
  | 'lengthGovernor'
  | 'groundingRepair'
  | 'resumeGroundingRepair'
  | 'atsKeywords';

/** Per-step model/params override for the variant matrix. */
export interface StepModelConfig {
  /** Azure deployment name to serve this call (falls back to env default). */
  deployment?: string;
  /** Reasoning effort for GPT-5-family deployments (ignored for classic models). */
  reasoningEffort?: ReasoningEffort;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerationToggles {
  /** Run the resume + cover-letter editor passes (default true). */
  editorPass?: boolean;
  /** Run the keyword-weave pass (default true). */
  keywordWeave?: boolean;
  /** Run the style-rewrite "teeth" passes (default true). */
  styleRewrite?: boolean;
  /** Run the deterministic cover-letter length governor (default true). */
  lengthGovernor?: boolean;
  /** Run the two grounding-repair passes (default true). */
  groundingRepair?: boolean;
  /** Attach GENERATION_SYSTEM_ANCHOR to the writer calls (default true). */
  systemAnchor?: boolean;
}

export interface GenerationConfig {
  /** Output language. 'de' | 'en' are first-class; other ISO codes pass through to the prompts. */
  language: string;
  generateCoverLetter: boolean;
  /** Cover-letter word budget selector; drives the length governor. */
  coverLetterLength?: string;
  /** Per-call model + params so the matrix can vary one step at a time. */
  models?: Partial<Record<PipelineStep, StepModelConfig>>;
  /** Prompt-template dir, e.g. 'v1' (default) | 'v2'. */
  promptVersion?: string;
  toggles?: GenerationToggles;
  /** Log-context passthrough (real ids on the live path, fixture ids on eval). */
  context?: { userId?: string; jobPostingId?: string };
}

/**
 * Coarse, completion-based progress milestones. The chain's writer steps run
 * concurrently, so progress is reported when a *group* finishes rather than
 * when an individual call starts — a per-step ladder would have to serialize
 * the chain to stay truthful. Messages are user-visible (SSE → the generating
 * view); keep them German-first and profession-neutral.
 */
const PROGRESS = {
  tailored: { percent: 25, message: 'Profil auf die Stelle zugeschnitten' },
  draftedWithCoverLetter: { percent: 55, message: 'Lebenslauf und Anschreiben entworfen' },
  draftedResumeOnly: { percent: 55, message: 'Lebenslauf entworfen' },
  revised: { percent: 80, message: 'Texte überarbeitet und optimiert' },
  checked: { percent: 92, message: 'Fakten und Länge geprüft' },
} as const;

/** Outcome of a guarded pass: applied, guard-rejected (fallback), errored, or not run. */
export type GuardOutcome = 'applied' | 'fallback' | 'error' | 'skipped';

export interface PerCallTelemetry {
  step: PipelineStep;
  template: string;
  model: string;
  /** Lane that ACTUALLY served the call — 'main' after a side-lane fallback. */
  lane?: 'main' | 'fast' | 'mid';
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  usageReported: boolean;
  /** For guarded passes: true when the pass output was rejected and the chain fell back. */
  guardFallback?: boolean;
  /** Present when the call itself failed and the chain degraded gracefully. */
  error?: string;
}

export interface GenerationResult {
  /** Final cover letter (Markdown), or null when disabled/degraded. */
  coverLetter: string | null;
  /** Final rewritten résumé payload, or null when the rewrite degraded. */
  resume: RewrittenProfileDto | null;
  atsKeywords: MatchedAtsKeywords | null;
  tailoredProfile: TailoredProfileDto;
  jobFacts: JobFactsDto | null;
  /** Intermediate drafts, for diffing each pass's effect in the eval UI. */
  stages: {
    coverLetterDraft: string | null;
    coverLetterEdited: string | null;
    coverLetterWoven: string | null;
    resumeRewritten: RewrittenProfileDto | null;
    resumeEdited: RewrittenProfileDto | null;
  };
  guards: {
    resumeEditor: GuardOutcome;
    resumeStyleRewrite: GuardOutcome;
    coverLetterEditor: GuardOutcome;
    keywordWeave: GuardOutcome;
    styleRewrite: GuardOutcome;
    lengthGovernor: GuardOutcome;
    groundingRepair: GuardOutcome;
    resumeGroundingRepair: GuardOutcome;
  };
  /** Priority-1 profile-supported ATS coverage of the cover letter. */
  coverage: { beforeWeave: CoverageReport; afterWeave: CoverageReport };
  telemetry: {
    perCall: PerCallTelemetry[];
    totalLatencyMs: number;
  };
}

/** The slice of `LLMService` the pipeline needs — swappable/fakeable in tests. */
export type LlmLike = Pick<LLMService, 'callText' | 'callJson' | 'isFastRouted' | 'defaultModel'>;

/**
 * Optional progress sink. The live path forwards it to the SSE stream; the
 * eval path passes nothing. Never awaited — a slow or throwing consumer must
 * not be able to stall or break generation.
 */
export type ProgressSink = (progress: number, message: string) => void;

/**
 * The slice of `GroundingValidatorService` the chain needs. Passed in rather
 * than constructed so the live path and the eval path share one validator
 * instance — the anti-hallucination verdict must not depend on who called.
 */
export type GroundingLike = Pick<GroundingValidatorService, 'validate'>;

interface CallOptions {
  temperature?: number;
  maxTokens?: number;
  systemMessage?: string;
  model?: string;
  reasoningEffort?: ReasoningEffort;
}

/** Internal per-run context threading config + telemetry sink through the steps. */
interface RunContext {
  llm: LlmLike;
  config: GenerationConfig;
  promptDir: string;
  perCall: PerCallTelemetry[];
  vars: { userId: string; jobPostingId: string };
  onProgress?: ProgressSink;
}

/** Report a milestone without letting a misbehaving consumer break the chain. */
function emit(ctx: RunContext, milestone: { percent: number; message: string }): void {
  try {
    ctx.onProgress?.(milestone.percent, milestone.message);
  } catch {
    // Progress is cosmetic; the chain must continue.
  }
}

function stepOptions(ctx: RunContext, step: PipelineStep, base: CallOptions): CallOptions {
  const override = ctx.config.models?.[step];
  if (!override) return base;
  const merged: CallOptions = { ...base };
  if (override.deployment !== undefined) merged.model = override.deployment;
  if (override.reasoningEffort !== undefined) merged.reasoningEffort = override.reasoningEffort;
  if (override.temperature !== undefined) merged.temperature = override.temperature;
  if (override.maxTokens !== undefined) merged.maxTokens = override.maxTokens;
  return merged;
}

function record(
  ctx: RunContext,
  step: PipelineStep,
  meta: LLMCallMeta,
  extra?: Partial<PerCallTelemetry>,
): void {
  ctx.perCall.push({
    step,
    template: meta.templatePath,
    model: meta.model || ctx.config.models?.[step]?.deployment || '',
    lane: meta.lane,
    latencyMs: meta.latencyMs,
    promptTokens: meta.promptTokens,
    completionTokens: meta.completionTokens,
    totalTokens: meta.totalTokens,
    usageReported: meta.usageReported,
    ...extra,
  });
}

function recordError(ctx: RunContext, step: PipelineStep, template: string, err: unknown): void {
  ctx.perCall.push({
    step,
    template,
    model: ctx.config.models?.[step]?.deployment ?? '',
    latencyMs: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    usageReported: false,
    error: err instanceof Error ? err.message : String(err),
  });
}

async function callJsonStep<T>(
  ctx: RunContext,
  step: PipelineStep,
  template: string,
  variables: Record<string, unknown>,
  options: CallOptions,
): Promise<T> {
  return ctx.llm.callJson<T>(`${ctx.promptDir}/${template}`, { ...variables, ...ctx.vars }, {
    ...stepOptions(ctx, step, options),
    onCallMeta: (meta) => record(ctx, step, meta),
  });
}

async function callTextStep(
  ctx: RunContext,
  step: PipelineStep,
  template: string,
  variables: Record<string, unknown>,
  options: CallOptions,
): Promise<string> {
  return ctx.llm.callText(`${ctx.promptDir}/${template}`, { ...variables, ...ctx.vars }, {
    ...stepOptions(ctx, step, options),
    onCallMeta: (meta) => record(ctx, step, meta),
  });
}

/** Flip the guardFallback flag on the most recent telemetry row of a step. */
function markGuardFallback(ctx: RunContext, step: PipelineStep, fallback: boolean): void {
  for (let i = ctx.perCall.length - 1; i >= 0; i--) {
    if (ctx.perCall[i].step === step) {
      ctx.perCall[i].guardFallback = fallback;
      return;
    }
  }
}

/**
 * Run the skill selector and validate the hand-off before the prose calls
 * consume it. This is the chain's only non-optional producer: it feeds BOTH
 * `cover-letter` and `resume-rewrite`. It has no strict `json_schema`, so when
 * `LLM_FAST_MODEL` routes it to a cheaper model a malformed or gutted payload
 * is retried once on the default model — the fast model is an optimization,
 * the default is the floor.
 */
async function selectTailoredProfile(
  ctx: RunContext,
  serializedProfile: Record<string, unknown>,
  serializedJob: Record<string, unknown>,
  language: string,
  profile: ProfileWithRelations,
): Promise<TailoredProfileDto> {
  const variables = { profile: serializedProfile, job: serializedJob, language };
  const sourceExperienceCount = profile.experiences?.length ?? 0;

  const attempt = async (model?: string): Promise<TailoredProfileDto | string> => {
    try {
      const raw = await callJsonStep<TailoredProfileDto>(
        ctx,
        'skillSelector',
        'skill-selector.md',
        variables,
        { temperature: 0.2, maxTokens: 3000, ...(model ? { model } : {}) },
      );
      if (!isValidTailoredProfile(raw)) return 'malformed payload';
      if (isDegradedTailoredProfile(raw, sourceExperienceCount)) {
        return 'no skills selected or every experience dropped';
      }
      return raw;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };

  const first = await attempt();
  if (typeof first !== 'string') return first;

  if (!ctx.llm.isFastRouted(`${ctx.promptDir}/skill-selector.md`)) {
    throw new Error(`Skill selection failed: ${first}`);
  }

  const escalated = await attempt(ctx.llm.defaultModel);
  if (typeof escalated === 'string') {
    throw new Error(`Skill selection failed on both models: ${escalated}`);
  }
  return escalated;
}

/**
 * Run the v1 generation chain headlessly. Never throws for degradable steps —
 * only a failed skill-selector (the chain's root input) propagates, matching
 * the live pipeline's behavior.
 */
export async function generateApplication(
  profile: ProfileWithRelations,
  job: SerializableJobPosting,
  config: GenerationConfig,
  deps: { llm: LlmLike; grounding: GroundingLike; onProgress?: ProgressSink },
): Promise<GenerationResult> {
  const started = Date.now();
  const language = config.language;
  const toggles = config.toggles ?? {};
  const editorPass = toggles.editorPass !== false;
  const keywordWeave = toggles.keywordWeave !== false;
  const styleRewrite = toggles.styleRewrite !== false;
  const lengthGovernor = toggles.lengthGovernor !== false;
  const groundingRepair = toggles.groundingRepair !== false;
  const anchor = toggles.systemAnchor !== false ? GENERATION_SYSTEM_ANCHOR : undefined;
  const lengthBudget = resolveCoverLetterBudget(config.coverLetterLength);
  const lengthTargetMin = resolveCoverLetterTargetMin(lengthBudget);

  const ctx: RunContext = {
    llm: deps.llm,
    config,
    promptDir: config.promptVersion ?? 'v1',
    perCall: [],
    vars: {
      userId: config.context?.userId ?? 'headless',
      jobPostingId: config.context?.jobPostingId ?? 'headless',
    },
    onProgress: deps.onProgress,
  };

  const serializedProfile = serializeProfileForLlm(profile);
  const serializedJob = serializeJobPostingForLlm(job);

  // Step 1a ∥ 1b: skill selection + job facts (cover-letter data layer, #5).
  const [tailoredProfile, jobFacts] = await Promise.all([
    selectTailoredProfile(ctx, serializedProfile, serializedJob, language, profile),
    config.generateCoverLetter
      ? callJsonStep<JobFactsDto>(
          ctx,
          'jobFacts',
          'job-facts.md',
          { job: serializedJob, language },
          { temperature: 0, maxTokens: 500 },
        )
          .then((raw) => (isValidJobFacts(raw) ? normalizeJobFacts(raw) : null))
          .catch((err) => {
            recordError(ctx, 'jobFacts', 'job-facts.md', err);
            return null;
          })
      : Promise.resolve(null),
  ]);

  // Step 2 ∥ 3 ∥ 6: resume rewrite + cover letter + ATS keyword extraction.
  emit(ctx, PROGRESS.tailored);
  const coverLetterPromise: Promise<string | null> = config.generateCoverLetter
    ? callTextStep(
        ctx,
        'coverLetter',
        'cover-letter.md',
        {
          job: serializedJob,
          tailoredProfile,
          jobFacts: normalizeJobFacts(jobFacts),
          salutation: buildSalutation(jobFacts, language),
          language,
          lengthBudget,
          lengthTargetMin,
        },
        { systemMessage: anchor },
      )
    : Promise.resolve(null);

  const resumeRewritePromise: Promise<RewrittenProfileDto | null> =
    callJsonStep<RewrittenProfileDto>(
      ctx,
      'resumeRewrite',
      'resume-rewrite.md',
      { tailoredProfile, job: serializedJob, language },
      { temperature: 0.35, maxTokens: 2000, systemMessage: anchor },
    )
      .then((r) => (r && typeof r === 'object' ? r : null))
      .catch((err) => {
        recordError(ctx, 'resumeRewrite', 'resume-rewrite.md', err);
        return null;
      });

  const atsKeywordsPromise: Promise<MatchedAtsKeywords | null> = callJsonStep<{
    hard_skills?: { keyword: string; priority?: number }[];
  }>(ctx, 'atsKeywords', 'ats-keywords.md', { job: serializedJob }, {})
    .then((extracted) => matchAtsKeywordsToProfile(extracted, profile))
    .catch((err) => {
      recordError(ctx, 'atsKeywords', 'ats-keywords.md', err);
      return null;
    });

  const [coverLetterDraft, rewrittenProfile, atsKeywords] = await Promise.all([
    coverLetterPromise,
    resumeRewritePromise,
    atsKeywordsPromise,
  ]);

  // Step 2.5: resume editor pass (guarded, ID-preserving).
  emit(
    ctx,
    config.generateCoverLetter ? PROGRESS.draftedWithCoverLetter : PROGRESS.draftedResumeOnly,
  );
  let resumeEdited = rewrittenProfile;
  let resumeEditorOutcome: GuardOutcome = 'skipped';
  if (rewrittenProfile && editorPass) {
    try {
      const edited = await callJsonStep<RewrittenProfileDto>(
        ctx,
        'resumeEditor',
        'editor-resume.md',
        { rewrittenProfile, tailoredProfile, job: serializedJob, language },
        { temperature: 0.35, maxTokens: 2000, systemMessage: anchor },
      );
      if (isValidResumeEdit(rewrittenProfile, edited)) {
        resumeEdited = edited;
        resumeEditorOutcome = 'applied';
        markGuardFallback(ctx, 'resumeEditor', false);
      } else {
        resumeEditorOutcome = 'fallback';
        markGuardFallback(ctx, 'resumeEditor', true);
      }
    } catch (err) {
      recordError(ctx, 'resumeEditor', 'editor-resume.md', err);
      resumeEditorOutcome = 'error';
    }
  }

  // Step 2.7: résumé style-rewrite "teeth" (guarded, strictly-cleaner).
  let resumeFinal = resumeEdited;
  let resumeStyleOutcome: GuardOutcome = 'skipped';
  if (resumeEdited && styleRewrite) {
    const before = countResumeStyleViolations(resumeEdited, language);
    if (before.total > 0) {
      const violations = [...before.aiPhrases, ...before.hedging];
      try {
        const edited = await callJsonStep<RewrittenProfileDto>(
          ctx,
          'resumeStyleRewrite',
          'resume-style-rewrite.md',
          {
            rewrittenProfile: resumeEdited,
            tailoredProfile,
            job: serializedJob,
            violations,
            verbFirstBullets: before.verbFirstBullets,
            language,
          },
          { temperature: 0.3, maxTokens: 2000, systemMessage: anchor },
        );
        const decision = evaluateResumeStyleRewrite(resumeEdited, edited, language);
        if (decision.accept) {
          resumeFinal = edited as RewrittenProfileDto;
          resumeStyleOutcome = 'applied';
          markGuardFallback(ctx, 'resumeStyleRewrite', false);
        } else {
          resumeStyleOutcome = 'fallback';
          markGuardFallback(ctx, 'resumeStyleRewrite', true);
        }
      } catch (err) {
        recordError(ctx, 'resumeStyleRewrite', 'resume-style-rewrite.md', err);
        resumeStyleOutcome = 'error';
      }
    }
  }

  // Step 3.5: cover-letter editor pass (guarded: ≥50% of draft length).
  let coverLetterEdited = coverLetterDraft;
  let coverLetterEditorOutcome: GuardOutcome = 'skipped';
  if (coverLetterDraft && coverLetterDraft.trim() !== '' && editorPass) {
    try {
      const edited = await callTextStep(
        ctx,
        'coverLetterEditor',
        'editor-cover-letter.md',
        {
          draft: coverLetterDraft,
          job: serializedJob,
          tailoredProfile,
          language,
          lengthBudget,
          lengthTargetMin,
        },
        { temperature: 0.4, maxTokens: 1500, systemMessage: anchor },
      );
      if (edited && edited.trim().length >= coverLetterDraft.trim().length * 0.5) {
        coverLetterEdited = edited;
        coverLetterEditorOutcome = 'applied';
        markGuardFallback(ctx, 'coverLetterEditor', false);
      } else {
        coverLetterEditorOutcome = 'fallback';
        markGuardFallback(ctx, 'coverLetterEditor', true);
      }
    } catch (err) {
      recordError(ctx, 'coverLetterEditor', 'editor-cover-letter.md', err);
      coverLetterEditorOutcome = 'error';
    }
  }

  const coverageBeforeWeave = computePriority1Coverage(atsKeywords, coverLetterEdited);

  // Step 4: keyword weave (guarded: ≥60% of draft length; only on a real gap).
  let coverLetterWoven = coverLetterEdited;
  let weaveOutcome: GuardOutcome = 'skipped';
  if (coverLetterEdited && coverLetterEdited.trim() !== '' && keywordWeave) {
    const keywords = selectKeywordsToWeave(atsKeywords, coverLetterEdited);
    if (keywords.length > 0) {
      try {
        const woven = await callTextStep(
          ctx,
          'keywordWeave',
          'keyword-weave.md',
          { draft: coverLetterEdited, keywords, job: serializedJob, language, lengthBudget, lengthTargetMin },
          { temperature: 0.3, maxTokens: 1500, systemMessage: anchor },
        );
        if (woven && woven.trim().length >= coverLetterEdited.trim().length * 0.6) {
          coverLetterWoven = woven;
          weaveOutcome = 'applied';
          markGuardFallback(ctx, 'keywordWeave', false);
        } else {
          weaveOutcome = 'fallback';
          markGuardFallback(ctx, 'keywordWeave', true);
        }
      } catch (err) {
        recordError(ctx, 'keywordWeave', 'keyword-weave.md', err);
        weaveOutcome = 'error';
      }
    }
  }

  const coverageAfterWeave = computePriority1Coverage(atsKeywords, coverLetterWoven);

  // Step 5: cover-letter style-rewrite "teeth" (guarded, strictly-cleaner).
  let coverLetterFinal = coverLetterWoven;
  let styleOutcome: GuardOutcome = 'skipped';
  if (coverLetterWoven && coverLetterWoven.trim() !== '' && styleRewrite) {
    const before = lintGeneratedStyle(coverLetterWoven, language);
    if (before.total > 0) {
      const violations = [...before.aiPhrases, ...before.hedging];
      try {
        const rewritten = await callTextStep(
          ctx,
          'styleRewrite',
          'style-rewrite.md',
          { draft: coverLetterWoven, violations, job: serializedJob, language },
          { temperature: 0.3, maxTokens: 1500, systemMessage: anchor },
        );
        const decision = evaluateStyleRewrite(coverLetterWoven, rewritten, language);
        if (decision.accept) {
          coverLetterFinal = rewritten;
          styleOutcome = 'applied';
          markGuardFallback(ctx, 'styleRewrite', false);
        } else {
          styleOutcome = 'fallback';
          markGuardFallback(ctx, 'styleRewrite', true);
        }
      } catch (err) {
        recordError(ctx, 'styleRewrite', 'style-rewrite.md', err);
        styleOutcome = 'error';
      }
    }
  }

  // Step 6: deterministic length governor (guarded). Only shortens, so it must
  // run BEFORE the grounding repair — a repair placed earlier could be re-cut.
  emit(ctx, PROGRESS.revised);
  let coverLetterGoverned = coverLetterFinal;
  let lengthOutcome: GuardOutcome = 'skipped';
  if (coverLetterFinal && coverLetterFinal.trim() !== '' && lengthGovernor) {
    const lint = lintCoverLetterLength(coverLetterFinal, lengthBudget, language);
    if (lint.overrun) {
      // The weave's priority-1 keywords must survive the cut (#6).
      const hardSkillsRaw =
        atsKeywords && typeof atsKeywords === 'object'
          ? (atsKeywords as { hard_skills?: unknown }).hard_skills
          : undefined;
      const mustKeepKeywords = (Array.isArray(hardSkillsRaw) ? hardSkillsRaw : [])
        .filter((kw): kw is { keyword: string } => {
          if (!kw || typeof kw !== 'object') return false;
          const c = kw as { keyword?: unknown; priority?: unknown; source?: unknown };
          return (
            c.priority === 1 &&
            c.source === 'both' &&
            typeof c.keyword === 'string' &&
            isKeywordPresent(coverLetterFinal, c.keyword)
          );
        })
        .map((kw) => kw.keyword);

      try {
        const shortened = await callTextStep(
          ctx,
          'lengthGovernor',
          'shorten-cover-letter.md',
          {
            draft: coverLetterFinal,
            lengthBudget,
            lengthTargetMin,
            currentWords: lint.words,
            job: serializedJob,
            language,
          },
          { temperature: 0.3, maxTokens: 1500, systemMessage: anchor },
        );
        const decision = evaluateShortenRewrite(
          coverLetterFinal,
          shortened,
          lengthBudget,
          language,
          mustKeepKeywords,
        );
        if (decision.accept) {
          coverLetterGoverned = shortened;
          lengthOutcome = 'applied';
          markGuardFallback(ctx, 'lengthGovernor', false);
        } else {
          lengthOutcome = 'fallback';
          markGuardFallback(ctx, 'lengthGovernor', true);
        }
      } catch (err) {
        recordError(ctx, 'lengthGovernor', 'shorten-cover-letter.md', err);
        lengthOutcome = 'error';
      }
    }
  }

  // Step 7a: cover-letter grounding repair (guarded). Corpus = profile + job
  // posting; quoting the ad is legitimate personalization.
  let coverLetterGrounded = coverLetterGoverned;
  let groundingOutcome: GuardOutcome = 'skipped';
  if (coverLetterGoverned && coverLetterGoverned.trim() !== '' && groundingRepair) {
    const before = deps.grounding.validate({ coverLetter: coverLetterGoverned }, profile, job.fullText);
    if (before.unsupported.length > 0) {
      try {
        const repaired = await callTextStep(
          ctx,
          'groundingRepair',
          'fix-unsupported-numbers.md',
          {
            draft: coverLetterGoverned,
            unsupported: before.unsupported,
            job: serializedJob,
            language,
          },
          { temperature: 0.3, maxTokens: 1500, systemMessage: anchor },
        );
        const after = repaired?.trim()
          ? deps.grounding.validate({ coverLetter: repaired }, profile, job.fullText).unsupported
          : [];
        const decision = evaluateGroundingRepair(
          coverLetterGoverned,
          repaired,
          before.unsupported,
          after,
          lengthBudget,
          language,
        );
        if (decision.accept) {
          coverLetterGrounded = repaired;
          groundingOutcome = 'applied';
          markGuardFallback(ctx, 'groundingRepair', false);
        } else {
          groundingOutcome = 'fallback';
          markGuardFallback(ctx, 'groundingRepair', true);
        }
      } catch (err) {
        recordError(ctx, 'groundingRepair', 'fix-unsupported-numbers.md', err);
        groundingOutcome = 'error';
      }
    }
  }

  // Step 7b: résumé grounding repair (guarded, strict JSON). Corpus = profile
  // ONLY — a figure from the job ad is never evidence of the candidate's own
  // achievement.
  let resumeGrounded = resumeFinal;
  let resumeGroundingOutcome: GuardOutcome = 'skipped';
  if (resumeFinal && groundingRepair) {
    const before = deps.grounding.validate({ resume: extractResumeProse(resumeFinal) }, profile);
    if (before.unsupported.length > 0) {
      try {
        const repaired = await callJsonStep<unknown>(
          ctx,
          'resumeGroundingRepair',
          'fix-unsupported-numbers-resume.md',
          {
            rewrittenProfile: resumeFinal,
            tailoredProfile,
            job: serializedJob,
            unsupported: before.unsupported,
            language,
          },
          { temperature: 0.3, maxTokens: 2000, systemMessage: anchor },
        );
        const validCandidate = isValidResumeEdit(resumeFinal, repaired)
          ? (repaired as RewrittenProfileDto)
          : null;
        const after = validCandidate
          ? deps.grounding.validate({ resume: extractResumeProse(validCandidate) }, profile)
              .unsupported
          : [];
        const decision = evaluateResumeGroundingRepair(
          resumeFinal,
          repaired,
          before.unsupported,
          after,
          language,
        );
        if (decision.accept && validCandidate) {
          resumeGrounded = validCandidate;
          resumeGroundingOutcome = 'applied';
          markGuardFallback(ctx, 'resumeGroundingRepair', false);
        } else {
          resumeGroundingOutcome = 'fallback';
          markGuardFallback(ctx, 'resumeGroundingRepair', true);
        }
      } catch (err) {
        recordError(ctx, 'resumeGroundingRepair', 'fix-unsupported-numbers-resume.md', err);
        resumeGroundingOutcome = 'error';
      }
    }
  }

  emit(ctx, PROGRESS.checked);

  return {
    coverLetter: coverLetterGrounded,
    resume: resumeGrounded,
    atsKeywords,
    tailoredProfile,
    jobFacts,
    stages: {
      coverLetterDraft,
      coverLetterEdited,
      coverLetterWoven,
      resumeRewritten: rewrittenProfile,
      resumeEdited,
    },
    guards: {
      resumeEditor: resumeEditorOutcome,
      resumeStyleRewrite: resumeStyleOutcome,
      coverLetterEditor: coverLetterEditorOutcome,
      keywordWeave: weaveOutcome,
      styleRewrite: styleOutcome,
      lengthGovernor: lengthOutcome,
      groundingRepair: groundingOutcome,
      resumeGroundingRepair: resumeGroundingOutcome,
    },
    coverage: { beforeWeave: coverageBeforeWeave, afterWeave: coverageAfterWeave },
    telemetry: {
      perCall: ctx.perCall,
      totalLatencyMs: Date.now() - started,
    },
  };
}
