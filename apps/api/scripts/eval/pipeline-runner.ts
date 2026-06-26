/**
 * Pipeline runner for the eval harness (item #10).
 *
 * Mirrors the LIVE v1 generation chain from `ApplicationsService.createWithGeneration`
 * (skill-selector → parallel{cover-letter, resume-rewrite} → cover-letter editor
 * pass) by calling the exact same `prompts/v1/*.md` templates through the real
 * `LLMService` at the real temperatures. It deliberately reuses the extracted
 * `serializeProfileForLlm` / `serializeJobPostingForLlm` so the prompt inputs are
 * byte-for-byte identical to production.
 *
 * What it intentionally omits vs. the live path:
 * - PDF rendering + persistence — irrelevant to output quality.
 */
import type { LLMService } from '../../src/llm/llm.service';
import {
  serializeProfileForLlm,
  serializeJobPostingForLlm,
} from '../../src/applications/serialize.util';
import {
  matchAtsKeywordsToProfile,
  selectKeywordsToWeave,
  computePriority1Coverage,
  type MatchedAtsKeywords,
  type CoverageReport,
} from '../../src/applications/keyword-coverage.util';
import { isValidResumeEdit } from '../../src/applications/resume-editor.util';
import {
  buildSalutation,
  normalizeJobFacts,
  type JobFactsDto,
} from '../../src/applications/job-facts.util';
import { GENERATION_SYSTEM_ANCHOR } from '../../src/applications/constants';
import { lintGeneratedStyle, evaluateStyleRewrite } from '../../src/applications/style-lint.util';
import type {
  TailoredProfileDto,
  RewrittenProfileDto,
  SelectedExperience,
  SelectedProject,
} from '../../src/applications/dto/tailored-profile.dto';
import { hydrateProfile, type EvalFixture } from './fixture.types';

export interface GeneratedExperienceView {
  title: string;
  company: string;
  description: string;
  achievements: string[];
}

export interface GeneratedProjectView {
  name: string;
  description: string;
  highlights: string[];
}

export interface GeneratedResumeView {
  summary: string;
  experiences: GeneratedExperienceView[];
  projects: GeneratedProjectView[];
}

export interface GeneratedDocuments {
  /** Edited cover letter markdown (or the raw draft if the editor was skipped). */
  coverLetter: string | null;
  /** Resume content assembled for the judge to read. */
  resumeView: GeneratedResumeView;
  /**
   * JSON string fed to the GroundingValidatorService. Only prose keys
   * (summary / description / achievements / highlights) so the validator's
   * prose-only walk behaves exactly as in production.
   */
  resumeJsonForGrounding: string;
  /** True when the cover-letter editor pass produced a usable revision. */
  editorApplied: boolean;
  /** True when the resume editor pass produced a valid, ID-preserving revision. */
  resumeEditorApplied: boolean;
  /** Whether the resume-rewrite call succeeded (false = degraded fallback). */
  resumeRewriteSucceeded: boolean;
  /** True when the keyword weave pass actually ran (had a gap + succeeded). */
  weaveApplied: boolean;
  /** The profile-supported priority-1 keywords the weave attempted to add. */
  weaveKeywords: string[];
  /** Priority-1 coverage of the cover letter BEFORE the weave pass. */
  coverageBeforeWeave: CoverageReport;
  /** Priority-1 coverage of the FINAL cover letter (after weave, if applied). */
  coverageAfterWeave: CoverageReport;
  /** True when the style-rewrite "teeth" pass replaced the draft (improved it). */
  styleRewriteApplied: boolean;
  /** Deterministic style violations in the cover letter BEFORE the teeth pass. */
  styleViolationsBefore: number;
  /** Deterministic style violations in the FINAL cover letter (after teeth). */
  styleViolationsAfter: number;
  durationMs: number;
}

export interface GenerateOptions {
  /** When false, skip the keyword weave pass (#6) — for before/after A/B runs. */
  applyWeave?: boolean;
  /**
   * When false, omit the shared GENERATION_SYSTEM_ANCHOR system message from the
   * cover-letter + resume-rewrite calls — for a clean A/B of the system/user split.
   */
  applyAnchor?: boolean;
  /**
   * When false, skip the style-rewrite "teeth" pass — for a clean A/B of the
   * deterministic-linter enforcement step.
   */
  applyStyleRewrite?: boolean;
}

/**
 * Replicates `runCoverLetterEditorPass` (#1) including its guard: keep the
 * original draft if the editor returns empty or less than half its length.
 */
async function runEditorPass(
  llm: LLMService,
  draft: string,
  job: Record<string, unknown>,
  tailoredProfile: TailoredProfileDto,
  language: string,
  fixtureId: string,
): Promise<{ text: string; applied: boolean }> {
  try {
    const edited = await llm.callText(
      'v1/editor-cover-letter.md',
      { draft, job, tailoredProfile, language, userId: fixtureId, jobPostingId: fixtureId },
      { temperature: 0.4, maxTokens: 1500 },
    );
    if (!edited || edited.trim().length < draft.trim().length * 0.5) {
      return { text: draft, applied: false };
    }
    return { text: edited, applied: true };
  } catch {
    return { text: draft, applied: false };
  }
}

/**
 * Replicates `runKeywordWeavePass` (#6): weave the listed profile-supported
 * priority-1 keywords into the draft, keeping the pre-weave draft on failure or
 * a suspiciously short result.
 */
async function runWeavePass(
  llm: LLMService,
  draft: string,
  keywords: string[],
  tailoredProfile: TailoredProfileDto,
  language: string,
  fixtureId: string,
): Promise<{ text: string; applied: boolean }> {
  if (keywords.length === 0) return { text: draft, applied: false };
  try {
    const woven = await llm.callText(
      'v1/keyword-weave.md',
      { draft, keywords, tailoredProfile, language, userId: fixtureId, jobPostingId: fixtureId },
      { temperature: 0.3, maxTokens: 1500 },
    );
    if (!woven || woven.trim().length < draft.trim().length * 0.6) {
      return { text: draft, applied: false };
    }
    return { text: woven, applied: true };
  } catch {
    return { text: draft, applied: false };
  }
}

/**
 * Replicates `runStyleRewritePass` (the linter "teeth"): surgically fix the
 * deterministic linter's cliché/hedging hits, keeping the pre-rewrite draft
 * unless the rewrite both preserves length and strictly reduces violations.
 * Skips the LLM call when the draft is already clean.
 */
async function runStyleRewrite(
  llm: LLMService,
  draft: string,
  tailoredProfile: TailoredProfileDto,
  language: string,
  fixtureId: string,
): Promise<{ text: string; applied: boolean; before: number; after: number }> {
  const before = lintGeneratedStyle(draft, language);
  if (before.total === 0) return { text: draft, applied: false, before: 0, after: 0 };
  const violations = [...before.aiPhrases, ...before.hedging];
  try {
    const rewritten = await llm.callText(
      'v1/style-rewrite.md',
      { draft, violations, tailoredProfile, language, userId: fixtureId, jobPostingId: fixtureId },
      { temperature: 0.3, maxTokens: 1500, systemMessage: GENERATION_SYSTEM_ANCHOR },
    );
    const decision = evaluateStyleRewrite(draft, rewritten, language);
    if (!decision.accept) {
      return { text: draft, applied: false, before: decision.before, after: decision.after };
    }
    return { text: rewritten, applied: true, before: decision.before, after: decision.after };
  } catch {
    return { text: draft, applied: false, before: before.total, after: before.total };
  }
}

/**
 * Assemble a judge-readable resume view from the rewritten profile, falling back
 * to the tailored profile's selected summaries when the rewrite call degraded.
 */
function assembleResumeView(
  tailored: TailoredProfileDto,
  rewritten: RewrittenProfileDto | null,
  fallbackSummary: string,
): GeneratedResumeView {
  const expById = new Map<string, SelectedExperience>();
  for (const exp of tailored.selected_experiences ?? []) {
    if (exp.profileExperienceId) expById.set(exp.profileExperienceId, exp);
  }
  const projById = new Map<string, SelectedProject>();
  for (const proj of tailored.selected_projects ?? []) {
    if (proj.profileProjectId) projById.set(proj.profileProjectId, proj);
  }

  let experiences: GeneratedExperienceView[];
  let projects: GeneratedProjectView[];

  if (rewritten) {
    experiences = (rewritten.rewritten_experiences ?? []).map((re) => {
      const meta = expById.get(re.profileExperienceId);
      return {
        title: meta?.title ?? '',
        company: meta?.company ?? '',
        description: re.rewritten_description ?? '',
        achievements: re.rewritten_achievements ?? [],
      };
    });
    projects = (rewritten.rewritten_projects ?? []).map((rp) => {
      const meta = projById.get(rp.profileProjectId);
      return {
        name: meta?.name ?? '',
        description: rp.rewritten_description ?? '',
        highlights: rp.rewritten_highlights ?? [],
      };
    });
  } else {
    // Degraded fallback — use the selector's summaries so the judge still has
    // content to score (mirrors the service continuing with original data).
    experiences = (tailored.selected_experiences ?? []).map((exp) => ({
      title: exp.title,
      company: exp.company,
      description: exp.summary ?? '',
      achievements: [],
    }));
    projects = (tailored.selected_projects ?? []).map((proj) => ({
      name: proj.name,
      description: proj.summary ?? '',
      highlights: [],
    }));
  }

  return {
    summary: rewritten?.rewritten_summary || fallbackSummary || '',
    experiences,
    projects,
  };
}

/**
 * Replicates `runResumeEditorPass` (#1): one JSON→JSON critique pass over the
 * rewritten resume payload, keeping the pre-edit payload on failure or an edit
 * that fails the ID-preservation guard.
 */
async function runResumeEditor(
  llm: LLMService,
  rewritten: RewrittenProfileDto,
  tailoredProfile: TailoredProfileDto,
  language: string,
  fixtureId: string,
): Promise<{ profile: RewrittenProfileDto; applied: boolean }> {
  try {
    const edited = await llm.callJson<RewrittenProfileDto>(
      'v1/editor-resume.md',
      { rewrittenProfile: rewritten, tailoredProfile, language, userId: fixtureId, jobPostingId: fixtureId },
      { temperature: 0.35, maxTokens: 2000 },
    );
    if (!isValidResumeEdit(rewritten, edited)) {
      return { profile: rewritten, applied: false };
    }
    return { profile: edited, applied: true };
  } catch {
    return { profile: rewritten, applied: false };
  }
}

/**
 * Run the v1 generation chain for a single fixture.
 */
export async function generateForFixture(
  llm: LLMService,
  fixture: EvalFixture,
  options: GenerateOptions = {},
): Promise<GeneratedDocuments> {
  const applyWeave = options.applyWeave !== false;
  const applyStyleRewrite = options.applyStyleRewrite !== false;
  const systemMessage = options.applyAnchor === false ? undefined : GENERATION_SYSTEM_ANCHOR;
  const start = Date.now();
  const profile = hydrateProfile(fixture);
  const serializedProfile = serializeProfileForLlm(profile);
  const serializedJob = serializeJobPostingForLlm(fixture.jobPosting);
  const language = fixture.language;

  // Step 1: skill selector (temp 0.2), in parallel with job-facts (#5).
  const [tailoredProfile, jobFacts] = await Promise.all([
    llm.callJson<TailoredProfileDto>(
      'v1/skill-selector.md',
      {
        profile: serializedProfile,
        job: serializedJob,
        language,
        userId: fixture.id,
        jobPostingId: fixture.id,
      },
      { temperature: 0.2, maxTokens: 3000 },
    ),
    llm
      .callJson<JobFactsDto>(
        'v1/job-facts.md',
        { job: serializedJob, language, userId: fixture.id, jobPostingId: fixture.id },
        { temperature: 0, maxTokens: 500 },
      )
      .then((f) => normalizeJobFacts(f))
      .catch(() => normalizeJobFacts(null)),
  ]);

  // Step 2: parallel cover letter (text) + resume rewrite (json) + ATS keywords.
  const coverLetterPromise = llm.callText(
    'v1/cover-letter.md',
    {
      job: serializedJob,
      tailoredProfile,
      jobFacts,
      salutation: buildSalutation(jobFacts, language),
      language,
      userId: fixture.id,
      jobPostingId: fixture.id,
    },
    { systemMessage },
  );

  const resumeRewritePromise = llm
    .callJson<RewrittenProfileDto>(
      'v1/resume-rewrite.md',
      {
        tailoredProfile,
        job: serializedJob,
        language,
        userId: fixture.id,
        jobPostingId: fixture.id,
      },
      { temperature: 0.35, maxTokens: 2000, systemMessage },
    )
    .then((r) => (r && typeof r === 'object' ? r : null))
    .catch(() => null);

  const atsKeywordsPromise = llm
    .callJson<{ hard_skills?: { keyword: string; priority?: number }[] }>('v1/ats-keywords.md', {
      job: serializedJob,
      userId: fixture.id,
      jobPostingId: fixture.id,
    })
    .then((extracted) => matchAtsKeywordsToProfile(extracted, profile))
    .catch((): MatchedAtsKeywords => ({ hard_skills: [] }));

  const [coverLetterDraft, rewrittenProfile, atsKeywords] = await Promise.all([
    coverLetterPromise,
    resumeRewritePromise,
    atsKeywordsPromise,
  ]);

  // Step 3: cover-letter editor pass (#1).
  const editor = coverLetterDraft
    ? await runEditorPass(llm, coverLetterDraft, serializedJob, tailoredProfile, language, fixture.id)
    : { text: '', applied: false };

  // Coverage BEFORE the weave (priority-1 profile-supported keywords).
  const coverageBeforeWeave = computePriority1Coverage(atsKeywords, editor.text);

  // Step 4: keyword weave pass (#6) — close profile-supported priority-1 gaps.
  const weaveKeywords = applyWeave ? selectKeywordsToWeave(atsKeywords, editor.text) : [];
  const weave =
    coverLetterDraft && weaveKeywords.length > 0
      ? await runWeavePass(llm, editor.text, weaveKeywords, tailoredProfile, language, fixture.id)
      : { text: editor.text, applied: false };

  // Coverage is measured on the post-weave letter (the weave's own effect),
  // before the style-rewrite pass, so the coverage metric stays about the weave.
  const postWeave = coverLetterDraft ? weave.text : null;
  const coverageAfterWeave = computePriority1Coverage(atsKeywords, postWeave);

  // Style rewrite "teeth" pass — surgically fix the deterministic linter's
  // cliché/hedging hits. Skipped when --no-style-rewrite (A/B) or already clean.
  const styleRewrite =
    postWeave && applyStyleRewrite
      ? await runStyleRewrite(llm, postWeave, tailoredProfile, language, fixture.id)
      : { text: postWeave ?? '', applied: false, before: 0, after: 0 };
  const finalCoverLetter = postWeave ? styleRewrite.text : null;

  // Resume editor pass (#1) — JSON→JSON critique with ID-preservation guard.
  const resumeEditor = rewrittenProfile
    ? await runResumeEditor(llm, rewrittenProfile, tailoredProfile, language, fixture.id)
    : { profile: null as RewrittenProfileDto | null, applied: false };

  const resumeView = assembleResumeView(
    tailoredProfile,
    resumeEditor.profile,
    fixture.profile.summary,
  );

  // Grounding input — prose-only keys, matching the production resume JSON walk.
  const resumeJsonForGrounding = JSON.stringify({
    summary: resumeView.summary,
    experiences: resumeView.experiences.map((e) => ({
      description: e.description,
      achievements: e.achievements,
    })),
    projects: resumeView.projects.map((p) => ({
      description: p.description,
      highlights: p.highlights,
    })),
  });

  return {
    coverLetter: finalCoverLetter,
    resumeView,
    resumeJsonForGrounding,
    editorApplied: editor.applied,
    resumeEditorApplied: resumeEditor.applied,
    resumeRewriteSucceeded: rewrittenProfile !== null,
    weaveApplied: weave.applied,
    weaveKeywords,
    coverageBeforeWeave,
    coverageAfterWeave,
    styleRewriteApplied: styleRewrite.applied,
    styleViolationsBefore: styleRewrite.before,
    styleViolationsAfter: styleRewrite.after,
    durationMs: Date.now() - start,
  };
}
