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
 * - `v1/ats-keywords.md` + `matchKeywordsAgainstProfile` — not part of the judged
 *   resume/cover-letter prose, and the deterministic match relies on a private
 *   service method. (Add it here when item #6 needs measuring.)
 * - PDF rendering + persistence — irrelevant to output quality.
 */
import type { LLMService } from '../../src/llm/llm.service';
import {
  serializeProfileForLlm,
  serializeJobPostingForLlm,
} from '../../src/applications/serialize.util';
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
  /** Whether the resume-rewrite call succeeded (false = degraded fallback). */
  resumeRewriteSucceeded: boolean;
  durationMs: number;
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
 * Run the v1 generation chain for a single fixture.
 */
export async function generateForFixture(
  llm: LLMService,
  fixture: EvalFixture,
): Promise<GeneratedDocuments> {
  const start = Date.now();
  const profile = hydrateProfile(fixture);
  const serializedProfile = serializeProfileForLlm(profile);
  const serializedJob = serializeJobPostingForLlm(fixture.jobPosting);
  const language = fixture.language;

  // Step 1: skill selector (temp 0.2).
  const tailoredProfile = await llm.callJson<TailoredProfileDto>(
    'v1/skill-selector.md',
    {
      profile: serializedProfile,
      job: serializedJob,
      language,
      userId: fixture.id,
      jobPostingId: fixture.id,
    },
    { temperature: 0.2, maxTokens: 3000 },
  );

  // Step 2: parallel cover letter (text) + resume rewrite (json, temp 0.35).
  const coverLetterPromise = llm.callText('v1/cover-letter.md', {
    job: serializedJob,
    tailoredProfile,
    language,
    userId: fixture.id,
    jobPostingId: fixture.id,
  });

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
      { temperature: 0.35, maxTokens: 2000 },
    )
    .then((r) => (r && typeof r === 'object' ? r : null))
    .catch(() => null);

  const [coverLetterDraft, rewrittenProfile] = await Promise.all([
    coverLetterPromise,
    resumeRewritePromise,
  ]);

  // Step 3: cover-letter editor pass (#1).
  const editor = coverLetterDraft
    ? await runEditorPass(llm, coverLetterDraft, serializedJob, tailoredProfile, language, fixture.id)
    : { text: '', applied: false };

  const resumeView = assembleResumeView(
    tailoredProfile,
    rewrittenProfile,
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
    coverLetter: coverLetterDraft ? editor.text : null,
    resumeView,
    resumeJsonForGrounding,
    editorApplied: editor.applied,
    resumeRewriteSucceeded: rewrittenProfile !== null,
    durationMs: Date.now() - start,
  };
}
