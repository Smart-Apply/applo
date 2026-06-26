import type { RewrittenProfileDto } from './dto/tailored-profile.dto';
import { detectGermanVerbFirstBullets, lintGeneratedStyle } from './style-lint.util';

/**
 * Pure validation for the resume editor pass (#1).
 *
 * The editor (`v1/editor-resume.md`) revises the already-rewritten resume payload
 * but MUST preserve every `profileExperienceId` / `profileProjectId` exactly —
 * those IDs map the rewritten prose back onto the candidate's real experiences in
 * `convertTailoredProfileToResumeJson`. If the editor drops, adds or mangles an
 * ID, the rewritten (often translated) content is silently lost. This guard lets
 * the caller reject such an edit and keep the pre-edit payload.
 *
 * Extracted as a pure function so the safety logic is unit-testable without
 * booting Nest/Prisma or calling an LLM.
 */

/** Multiset of ids → sorted array, for order-insensitive comparison. */
function idMultiset(ids: (string | null | undefined)[]): string[] {
  return ids.filter((id): id is string => typeof id === 'string' && id.length > 0).sort();
}

function sameIdSet(a: (string | null | undefined)[], b: (string | null | undefined)[]): boolean {
  const sa = idMultiset(a);
  const sb = idMultiset(b);
  if (sa.length !== sb.length) return false;
  return sa.every((id, i) => id === sb[i]);
}

/**
 * Is `edited` a structurally valid, ID-preserving revision of `original`?
 *
 * Requires:
 * - `edited` is a well-formed `RewrittenProfileDto` with a non-empty summary,
 * - the set of experience ids matches `original` exactly (same multiset),
 * - the set of project ids matches `original` exactly,
 * - no experience/project ends up with BOTH an empty description AND no
 *   achievements/highlights (i.e. the editor didn't gut an entry to nothing
 *   that previously had content).
 */
export function isValidResumeEdit(
  original: RewrittenProfileDto,
  edited: unknown,
): edited is RewrittenProfileDto {
  if (!edited || typeof edited !== 'object') return false;
  const e = edited as Partial<RewrittenProfileDto>;

  if (typeof e.rewritten_summary !== 'string' || e.rewritten_summary.trim() === '') return false;
  if (!Array.isArray(e.rewritten_experiences) || !Array.isArray(e.rewritten_projects)) {
    return false;
  }

  // IDs must match the original exactly (no add / drop / rename).
  if (
    !sameIdSet(
      original.rewritten_experiences.map((x) => x.profileExperienceId),
      e.rewritten_experiences.map((x) => x?.profileExperienceId),
    )
  ) {
    return false;
  }
  if (
    !sameIdSet(
      original.rewritten_projects.map((x) => x.profileProjectId),
      e.rewritten_projects.map((x) => x?.profileProjectId),
    )
  ) {
    return false;
  }

  // No entry that had content may be reduced to entirely empty.
  const originalExpById = new Map(
    original.rewritten_experiences.map((x) => [x.profileExperienceId, x]),
  );
  for (const exp of e.rewritten_experiences) {
    const hadContent = (() => {
      const o = originalExpById.get(exp?.profileExperienceId);
      return !!o && ((o.rewritten_description?.trim() ?? '') !== '' || (o.rewritten_achievements?.length ?? 0) > 0);
    })();
    const isEmpty =
      (exp?.rewritten_description?.trim() ?? '') === '' &&
      (exp?.rewritten_achievements?.length ?? 0) === 0;
    if (hadContent && isEmpty) return false;
  }

  const originalProjById = new Map(
    original.rewritten_projects.map((x) => [x.profileProjectId, x]),
  );
  for (const proj of e.rewritten_projects) {
    const hadContent = (() => {
      const o = originalProjById.get(proj?.profileProjectId);
      return !!o && ((o.rewritten_description?.trim() ?? '') !== '' || (o.rewritten_highlights?.length ?? 0) > 0);
    })();
    const isEmpty =
      (proj?.rewritten_description?.trim() ?? '') === '' &&
      (proj?.rewritten_highlights?.length ?? 0) === 0;
    if (hadContent && isEmpty) return false;
  }

  return true;
}

/**
 * Concatenate every prose field of a rewritten resume payload (summary +
 * descriptions + achievements + highlights) into one newline-joined string.
 * Used to run the deterministic style linter over the résumé's *prose only* —
 * never the structural keys or the `profile*Id` values — so the style-rewrite
 * "teeth" measure exactly the human-readable text.
 */
export function extractResumeProse(profile: RewrittenProfileDto | null | undefined): string {
  if (!profile) return '';
  const parts: string[] = [];
  if (profile.rewritten_summary) parts.push(profile.rewritten_summary);
  for (const exp of profile.rewritten_experiences ?? []) {
    if (exp?.rewritten_description) parts.push(exp.rewritten_description);
    for (const a of exp?.rewritten_achievements ?? []) {
      if (a) parts.push(a);
    }
  }
  for (const proj of profile.rewritten_projects ?? []) {
    if (proj?.rewritten_description) parts.push(proj.rewritten_description);
    for (const h of proj?.rewritten_highlights ?? []) {
      if (h) parts.push(h);
    }
  }
  return parts.join('\n');
}

/**
 * Collect every résumé *bullet* (achievements + highlights) as discrete strings.
 * Bullets are checked for the German verb-first anti-pattern (the summary and
 * descriptions are full sentences and are deliberately excluded).
 */
export function collectResumeBullets(profile: RewrittenProfileDto | null | undefined): string[] {
  if (!profile) return [];
  const bullets: string[] = [];
  for (const exp of profile.rewritten_experiences ?? []) {
    for (const a of exp?.rewritten_achievements ?? []) {
      if (a) bullets.push(a);
    }
  }
  for (const proj of profile.rewritten_projects ?? []) {
    for (const h of proj?.rewritten_highlights ?? []) {
      if (h) bullets.push(h);
    }
  }
  return bullets;
}

/** All deterministic style violations across a résumé payload. */
export interface ResumeStyleViolations {
  /** Forbidden AI clichés found anywhere in the prose. */
  aiPhrases: string[];
  /** German hedging/Konjunktiv found anywhere in the prose. */
  hedging: string[];
  /** Bullets (achievements/highlights) that open with a German finite past-tense verb. */
  verbFirstBullets: string[];
  /** Total distinct violations = clichés + hedging + verb-first bullets. */
  total: number;
}

/**
 * Count every deterministic style violation in a résumé payload: the cliché +
 * hedging hits over its prose PLUS the German verb-first bullets (the anglicised
 * "Entwickelte…" opener). This is the unified signal the résumé style-rewrite
 * teeth must strictly reduce.
 */
export function countResumeStyleViolations(
  profile: RewrittenProfileDto | null | undefined,
  language = 'de',
): ResumeStyleViolations {
  const prose = lintGeneratedStyle(extractResumeProse(profile), language);
  const verbFirstBullets = detectGermanVerbFirstBullets(collectResumeBullets(profile), language);
  return {
    aiPhrases: prose.aiPhrases,
    hedging: prose.hedging,
    verbFirstBullets,
    total: prose.total + verbFirstBullets.length,
  };
}

/** Verdict of the guarded résumé style-rewrite ("teeth") pass. */
export interface ResumeStyleRewriteEvaluation {
  /** Whether the rewrite should replace the pre-rewrite résumé payload. */
  accept: boolean;
  /** Distinct style violations in the original résumé prose. */
  before: number;
  /** Distinct style violations in the rewrite (equals `before` when rejected on structure). */
  after: number;
  /** Why the rewrite was accepted or rejected. */
  reason: 'invalid-structure' | 'not-improved' | 'improved';
}

/**
 * Decide whether a résumé style-rewrite candidate may replace the payload. The
 * JSON analogue of `evaluateStyleRewrite`: it gives the linter "teeth" on the
 * résumé without ever shipping a worse or structurally-broken payload. A rewrite
 * is accepted ONLY if it (a) is a valid, ID-preserving `RewrittenProfileDto`
 * (via `isValidResumeEdit`) AND (b) strictly reduces the deterministic style
 * violation count over the résumé prose. Otherwise the caller keeps the original.
 *
 * Pure and side-effect-free so it can be unit-tested and reused identically by
 * the live pipeline and the offline eval harness.
 */
export function evaluateResumeStyleRewrite(
  original: RewrittenProfileDto,
  edited: unknown,
  language = 'de',
): ResumeStyleRewriteEvaluation {
  const before = countResumeStyleViolations(original, language).total;

  if (!isValidResumeEdit(original, edited)) {
    return { accept: false, before, after: before, reason: 'invalid-structure' };
  }

  const after = countResumeStyleViolations(edited, language).total;
  if (after >= before) {
    return { accept: false, before, after, reason: 'not-improved' };
  }

  return { accept: true, before, after, reason: 'improved' };
}
