import type { RewrittenProfileDto } from './dto/tailored-profile.dto';

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
