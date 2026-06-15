/**
 * LLM-as-judge scorer for the eval harness (item #10).
 *
 * Reuses `LLMService.callJson` so the judge call goes through the same circuit
 * breaker + JSON-repair plumbing as production prompts. The rubric lives at
 * `prompts/eval/judge-rubric.md` (loaded by `LLMService` relative to
 * `prompts/`). Run at temperature 0 for repeatability.
 */
import type { LLMService } from '../../src/llm/llm.service';
import type { GeneratedDocuments } from './pipeline-runner';
import { serializeJobPostingForLlm } from '../../src/applications/serialize.util';
import type { EvalFixture } from './fixture.types';

export const RUBRIC_DIMENSIONS = [
  'action_verb_bullets',
  'quantified_or_qualitative',
  'summary_targeting',
  'cover_letter_personalization',
  'style_no_cliches',
  'language_correctness',
] as const;

export type RubricDimension = (typeof RUBRIC_DIMENSIONS)[number];

export interface JudgeResult {
  scores: Record<RubricDimension, number>;
  notes: Partial<Record<RubricDimension, string>>;
  overall: number;
}

interface RawJudgeResponse {
  scores?: Partial<Record<string, unknown>>;
  notes?: Partial<Record<string, unknown>>;
  overall?: unknown;
}

/** Clamp an unknown value to an integer score in [1, 5]; default 1. */
function clampScore(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/**
 * Score one fixture's generated documents against the rubric.
 */
export async function judgeDocuments(
  llm: LLMService,
  fixture: EvalFixture,
  docs: GeneratedDocuments,
): Promise<JudgeResult> {
  const raw = await llm.callJson<RawJudgeResponse>(
    'eval/judge-rubric.md',
    {
      language: fixture.language,
      job: serializeJobPostingForLlm(fixture.jobPosting),
      summary: docs.resumeView.summary || '(empty)',
      resumeExperiences: {
        experiences: docs.resumeView.experiences,
        projects: docs.resumeView.projects,
      },
      coverLetter: docs.coverLetter || '(no cover letter generated)',
    },
    { temperature: 0, maxTokens: 1200 },
  );

  const scores = {} as Record<RubricDimension, number>;
  const notes: Partial<Record<RubricDimension, string>> = {};
  for (const dim of RUBRIC_DIMENSIONS) {
    scores[dim] = clampScore(raw?.scores?.[dim]);
    const note = raw?.notes?.[dim];
    if (typeof note === 'string') notes[dim] = note;
  }

  return { scores, notes, overall: clampScore(raw?.overall) };
}
