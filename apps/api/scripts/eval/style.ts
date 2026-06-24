/**
 * Deterministic style scorer for the eval harness (item #10).
 *
 * Reuses `lintGeneratedStyle` (the same util the live pipeline's `runStyleCheck`
 * uses) so the harness reports the exact forbidden-AI-cliché + German-hedging
 * rate on the generated documents — a deterministic complement to the LLM
 * judge's holistic `style_no_cliches` score. Like `grounding.ts`, this has no
 * dependencies and is side-effect-free.
 */
import { lintGeneratedStyle, type StyleLintResult } from '../../src/applications/style-lint.util';
import type { EvalFixture } from './fixture.types';
import type { GeneratedDocuments } from './pipeline-runner';

export interface StyleReport {
  coverLetter: StyleLintResult;
  resume: StyleLintResult;
  /** Distinct violation count across both documents. */
  total: number;
  /** Distinct AI-cliché phrases found across both documents. */
  aiPhrases: string[];
  /** Distinct German hedging constructions found across both documents. */
  hedging: string[];
}

export function styleCheckDocuments(fixture: EvalFixture, docs: GeneratedDocuments): StyleReport {
  const language = fixture.language;
  const coverLetter = lintGeneratedStyle(docs.coverLetter, language);
  const resume = lintGeneratedStyle(docs.resumeJsonForGrounding, language);
  const aiPhrases = [...new Set([...coverLetter.aiPhrases, ...resume.aiPhrases])];
  const hedging = [...new Set([...coverLetter.hedging, ...resume.hedging])];
  return { coverLetter, resume, total: aiPhrases.length + hedging.length, aiPhrases, hedging };
}
