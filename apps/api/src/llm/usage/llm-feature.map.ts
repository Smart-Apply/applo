import { LlmFeature } from '../../generated/prisma/client';

/**
 * Exact-key template → feature map (issue #522). Deliberately NOT `includes()`
 * matching like `LLMService.FAST_MODEL_TEMPLATES` — an `includes()` check here
 * would make `v1/ats-keywords.md` swallow `v1/ats-keywords-extract.md`, which
 * are different features on different lanes.
 *
 * Covers all 22 production templates under `apps/api/prompts/`. Two live
 * templates are intentionally absent:
 *   - `eval/judge-rubric.md` — the offline LLM-as-judge harness
 *     (`scripts/eval/judge.ts`), a dev tool, not user traffic. Falls to OTHER.
 *   - `extract-job-posting.md` — consumed by `job-postings/agents/agent-url.parser.ts`,
 *     which calls Azure directly and never goes through LLMService, so it is
 *     not tracked at all (known gap, see the PR description).
 */
const TEMPLATE_FEATURE_MAP: Record<string, LlmFeature> = {
  'v1/cover-letter.md': LlmFeature.APPLICATION_COVER_LETTER,
  'v1/editor-cover-letter.md': LlmFeature.APPLICATION_COVER_LETTER_EDIT,
  'v1/keyword-weave.md': LlmFeature.APPLICATION_COVER_LETTER_KEYWORD_WEAVE,
  'v1/style-rewrite.md': LlmFeature.APPLICATION_COVER_LETTER_STYLE,
  'v1/shorten-cover-letter.md': LlmFeature.APPLICATION_COVER_LETTER_LENGTH,
  'v1/fix-unsupported-numbers.md': LlmFeature.APPLICATION_COVER_LETTER_GROUNDING,
  'v1/resume-rewrite.md': LlmFeature.APPLICATION_RESUME,
  'v1/editor-resume.md': LlmFeature.APPLICATION_RESUME_EDIT,
  'v1/resume-style-rewrite.md': LlmFeature.APPLICATION_RESUME_STYLE,
  'v1/fix-unsupported-numbers-resume.md': LlmFeature.APPLICATION_RESUME_GROUNDING,
  'v1/skill-selector.md': LlmFeature.APPLICATION_PROFILE_TAILOR,
  'v1/job-facts.md': LlmFeature.APPLICATION_JOB_FACTS,
  'v1/ats-keywords.md': LlmFeature.APPLICATION_ATS_KEYWORDS,
  'v1/translate-resume.md': LlmFeature.APPLICATION_TRANSLATION_RESUME,
  'v1/translate-cover-letter.md': LlmFeature.APPLICATION_TRANSLATION_COVER_LETTER,
  'v1/ats-keywords-extract.md': LlmFeature.KEYWORDS_EXTRACTION,
  'v1/profile-keywords.md': LlmFeature.KEYWORDS_PROFILE,
  'v1/extract-resume.md': LlmFeature.RESUME_PARSER,
  'v1/application-validation.md': LlmFeature.VALIDATION_CHECK,
  'interview-question.md': LlmFeature.INTERVIEW_QUESTIONS,
  'interview-answer-analyzer.md': LlmFeature.INTERVIEW_ANALYSIS,
  'interview-feedback.md': LlmFeature.INTERVIEW_FEEDBACK,
};

/** Resolve the anonymised usage feature for a `callText`/`callJson` template path. */
export function featureForTemplate(templatePath: string): LlmFeature {
  return TEMPLATE_FEATURE_MAP[templatePath] ?? LlmFeature.OTHER;
}
