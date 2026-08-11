/**
 * Deterministic acceptance guard for the grounding-repair pass.
 *
 * `GroundingValidatorService` detects impact numbers that don't trace back to
 * the candidate's profile (or, for the cover letter, the job posting) but is
 * deliberately non-destructive — it only reports. This module is the guard that
 * lets a single surgical LLM repair pass act on those findings without ever
 * shipping a worse letter, mirroring `evaluateShortenRewrite` /
 * `evaluateStyleRewrite`: detect deterministically → guarded LLM fix →
 * deterministic acceptance → graceful fallback to the untouched draft.
 *
 * Pure and side-effect-free (the caller runs the validator and hands the
 * before/after findings in), so the live pipeline and the offline eval harness
 * apply the identical acceptance rule.
 */
import {
  extractSalutationLine,
  lintCoverLetterLength,
  lintGeneratedStyle,
} from '../style-lint.util';
import type { GroundingFinding } from './grounding-validator.service';

/** Verdict of the guarded grounding-repair pass. */
export interface GroundingRepairEvaluation {
  /** Whether the repaired letter may replace the draft. */
  accept: boolean;
  /** Why the candidate was accepted or rejected. */
  reason:
    | 'empty'
    | 'gutted'
    | 'salutation-changed'
    | 'not-cleaner'
    | 'new-fabrication'
    | 'style-regressed'
    | 'underrun'
    | 'repaired';
  /** Unsupported impact numbers in the pre-repair draft. */
  unsupportedBefore: number;
  /** Unsupported impact numbers in the candidate (equals `unsupportedBefore` when empty). */
  unsupportedAfter: number;
}

/**
 * Decide whether a grounding-repair candidate may replace the draft. Accepts
 * ONLY when the candidate (a) isn't empty or gutted, (b) keeps the salutation
 * line verbatim, (c) strictly reduces the unsupported-number count, (d)
 * introduces no unsupported number that wasn't already flagged — a repair that
 * trades one fabrication for another is worthless — (e) doesn't increase the
 * deterministic style-violation count, and (f) doesn't push the letter under
 * its length floor (an already-short draft is not held against the repair — it
 * would otherwise keep its fabricated numbers forever). On any failure the
 * caller keeps the pre-repair draft.
 *
 * @param draft             The pre-repair cover letter (known to carry unsupported numbers).
 * @param repaired          The LLM's repair candidate (may be empty on failure).
 * @param unsupportedBefore Findings the validator reported for `draft`.
 * @param unsupportedAfter  Findings the validator reported for `repaired`.
 * @param budget            Word budget the candidate must stay above the floor of.
 * @param language          Target language code (floor + hedging rules).
 * @param minLengthRatio    Minimum fraction of the draft the candidate must retain.
 */
export function evaluateGroundingRepair(
  draft: string,
  repaired: string | null | undefined,
  unsupportedBefore: readonly GroundingFinding[],
  unsupportedAfter: readonly GroundingFinding[],
  budget: number,
  language = 'de',
  minLengthRatio = 0.5,
): GroundingRepairEvaluation {
  const countBefore = unsupportedBefore.length;

  if (!repaired || !repaired.trim()) {
    return {
      accept: false,
      reason: 'empty',
      unsupportedBefore: countBefore,
      unsupportedAfter: countBefore,
    };
  }

  const countAfter = unsupportedAfter.length;
  const counts = { unsupportedBefore: countBefore, unsupportedAfter: countAfter };

  if (repaired.trim().length < draft.trim().length * minLengthRatio) {
    return { accept: false, reason: 'gutted', ...counts };
  }

  const draftSalutation = extractSalutationLine(draft);
  if (draftSalutation && extractSalutationLine(repaired) !== draftSalutation) {
    return { accept: false, reason: 'salutation-changed', ...counts };
  }

  if (countAfter >= countBefore) {
    return { accept: false, reason: 'not-cleaner', ...counts };
  }

  const knownValues = new Set(unsupportedBefore.map((finding) => finding.normalized));
  if (unsupportedAfter.some((finding) => !knownValues.has(finding.normalized))) {
    return { accept: false, reason: 'new-fabrication', ...counts };
  }

  const styleBefore = lintGeneratedStyle(draft, language).total;
  const styleAfter = lintGeneratedStyle(repaired, language).total;
  if (styleAfter > styleBefore) {
    return { accept: false, reason: 'style-regressed', ...counts };
  }

  // Only the repair PUSHING the letter under the floor disqualifies it — an
  // already-short draft would otherwise keep its fabricated numbers forever.
  const underrunAfter = lintCoverLetterLength(repaired, budget, language).underrun;
  if (underrunAfter && !lintCoverLetterLength(draft, budget, language).underrun) {
    return { accept: false, reason: 'underrun', ...counts };
  }

  return { accept: true, reason: 'repaired', ...counts };
}
