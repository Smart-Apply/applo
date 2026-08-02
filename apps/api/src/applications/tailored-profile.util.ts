import { TailoredProfileDto } from './dto/tailored-profile.dto';

/**
 * Guard for the `skill-selector` hand-off.
 *
 * `skill-selector` is the one non-optional producer in the pipeline: it runs
 * first and its output feeds BOTH `cover-letter` and `resume-rewrite`. Unlike
 * `job-facts` and `ats-keywords` it has no strict `json_schema` (its
 * `(string | object)[]` union fields can't be modelled in strict mode), so JSON
 * mode is the only shape enforcement — which is not enough once the call is
 * routed to a cheaper model via `LLM_FAST_MODEL`.
 *
 * Checks structure only. A payload that is well-formed but *thin* (few skills,
 * no experiences) is reported separately by {@link isDegradedTailoredProfile}.
 */
export function isValidTailoredProfile(value: unknown): value is TailoredProfileDto {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.target_role === 'string' &&
    Array.isArray(v.selected_hard_skills) &&
    Array.isArray(v.selected_soft_skills) &&
    Array.isArray(v.selected_tools) &&
    Array.isArray(v.selected_experiences) &&
    Array.isArray(v.selected_projects) &&
    Array.isArray(v.selected_certificates) &&
    Array.isArray(v.selected_education)
  );
}

/**
 * Structurally valid but too thin to write a tailored application from — the
 * failure mode a small model produces silently. `sourceExperienceCount` is the
 * candidate's real experience count, so a genuinely sparse profile isn't
 * mistaken for a bad selection.
 */
export function isDegradedTailoredProfile(
  profile: TailoredProfileDto,
  sourceExperienceCount: number,
): boolean {
  const noSkills = profile.selected_hard_skills.length === 0;
  const droppedEveryExperience =
    sourceExperienceCount > 0 && profile.selected_experiences.length === 0;
  return noSkills || droppedEveryExperience;
}
