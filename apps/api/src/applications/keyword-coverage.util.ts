import type { ProfileWithRelations } from './resume-template.util';

/**
 * Coverage-driven keyword loop helpers (#6).
 *
 * Pure, dependency-free logic for:
 * 1. Matching extracted ATS keywords against the candidate profile (extracted
 *    from `ApplicationsService` so the offline eval harness can reuse the exact
 *    same matcher — service keeps a thin logging wrapper).
 * 2. Selecting which priority-1, profile-supported keywords are still MISSING
 *    from a generated cover letter — the gaps a single guarded weave-in pass may
 *    close.
 * 3. Computing priority-1 keyword coverage as a measurable quality metric.
 *
 * Guiding rule: we only ever consider keywords the profile genuinely supports
 * (`source: 'both'`). Weaving an unsupported keyword would be fabrication and
 * would defeat the grounding validator (#7).
 */

export interface AtsHardSkill {
  keyword: string;
  /** 1 = must-have, 2 = important, 3 = nice-to-have. */
  priority?: number;
  /** 'both' = in job AND profile (supported); 'job' = job only (unsupported). */
  source?: 'both' | 'job';
}

export interface MatchedAtsKeywords {
  hard_skills?: AtsHardSkill[];
  soft_skills?: AtsHardSkill[];
}

/** Max keywords a single weave pass may add — keeps density natural. */
export const MAX_WEAVE_KEYWORDS = 3;

/**
 * Deterministically tag each extracted keyword with `source` ('both' when it
 * appears in the profile, else 'job') and deduplicate case-insensitively
 * (preferring 'both' over 'job'). Faithful extraction of the original
 * `ApplicationsService.matchKeywordsAgainstProfile` logic.
 */
export function matchAtsKeywordsToProfile(
  extractedKeywords: { hard_skills?: AtsHardSkill[] } | null | undefined,
  profile: ProfileWithRelations,
): MatchedAtsKeywords {
  const matchKeyword = (kw: AtsHardSkill): AtsHardSkill => {
    const keyword = kw.keyword.toLowerCase();

    const inSkills = profile.skills.some((s) => {
      const skillName = s.name.toLowerCase();
      return skillName === keyword || skillName.includes(keyword) || keyword.includes(skillName);
    });

    const inExperiences = profile.experiences.some(
      (e) =>
        e.description?.toLowerCase().includes(keyword) || e.title.toLowerCase().includes(keyword),
    );

    const inProjects = profile.projects.some(
      (p) =>
        p.description?.toLowerCase().includes(keyword) ||
        p.technologies?.some((t) => t.toLowerCase().includes(keyword)) ||
        p.name.toLowerCase().includes(keyword),
    );

    const inCertificates = profile.certificates.some(
      (c) => c.name.toLowerCase().includes(keyword) || c.issuer?.toLowerCase().includes(keyword),
    );

    const isMatched = inSkills || inExperiences || inProjects || inCertificates;
    return { ...kw, source: isMatched ? 'both' : 'job' };
  };

  const deduplicate = (keywords: AtsHardSkill[]): AtsHardSkill[] => {
    const seen = new Map<string, AtsHardSkill>();
    keywords.forEach((kw) => {
      const lowerKey = kw.keyword.toLowerCase();
      const existing = seen.get(lowerKey);
      if (!existing) {
        seen.set(lowerKey, kw);
      } else if (kw.source === 'both' && existing.source === 'job') {
        seen.set(lowerKey, kw);
      }
    });
    return Array.from(seen.values());
  };

  const hard_skills = deduplicate((extractedKeywords?.hard_skills || []).map(matchKeyword));
  return { hard_skills, soft_skills: [] };
}

/**
 * Is `keyword` already present in `text`? Case-insensitive, bounded by
 * non-alphanumeric characters (Unicode-aware) so "AWS" does not match "laws"
 * and "CNC" does not match "concncurrent". Handles regex-special keywords
 * (C++, .NET).
 */
export function isKeywordPresent(text: string, keyword: string): boolean {
  const needle = keyword.trim();
  if (!text || !needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'iu');
    return re.test(text);
  } catch {
    // Defensive: fall back to a simple case-insensitive substring check.
    return text.toLowerCase().includes(needle.toLowerCase());
  }
}

/**
 * The priority-1, profile-supported keywords that are MISSING from the cover
 * letter — i.e. the gaps a weave-in pass may legitimately close. Deduplicated
 * and capped to keep keyword density natural.
 */
export function selectKeywordsToWeave(
  atsKeywords: MatchedAtsKeywords | null | undefined,
  coverLetterText: string | null | undefined,
  max: number = MAX_WEAVE_KEYWORDS,
): string[] {
  if (!atsKeywords?.hard_skills || !coverLetterText) return [];

  const seen = new Set<string>();
  const missing: string[] = [];
  for (const kw of atsKeywords.hard_skills) {
    if (kw.priority !== 1 || kw.source !== 'both') continue;
    const key = kw.keyword.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (!isKeywordPresent(coverLetterText, kw.keyword)) missing.push(kw.keyword);
  }
  return missing.slice(0, Math.max(0, max));
}

export interface CoverageReport {
  /** Priority-1 keywords the profile supports (the set we want covered). */
  wanted: number;
  /** Of `wanted`, how many appear in the cover letter. */
  covered: number;
  /** 0-100 coverage rate (100 when there is nothing to cover). */
  rate: number;
  /** The wanted-but-absent keywords. */
  missing: string[];
}

/**
 * Priority-1 keyword coverage of a cover letter: of the priority-1 keywords the
 * profile supports, how many actually appear in the text. Unsupported keywords
 * are excluded — we never expect (or want) the model to include something the
 * candidate can't back up.
 */
export function computePriority1Coverage(
  atsKeywords: MatchedAtsKeywords | null | undefined,
  coverLetterText: string | null | undefined,
): CoverageReport {
  const seen = new Set<string>();
  const wantedKeywords: string[] = [];
  for (const kw of atsKeywords?.hard_skills || []) {
    if (kw.priority !== 1 || kw.source !== 'both') continue;
    const key = kw.keyword.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    wantedKeywords.push(kw.keyword);
  }

  const text = coverLetterText || '';
  const missing = wantedKeywords.filter((kw) => !isKeywordPresent(text, kw));
  const wanted = wantedKeywords.length;
  const covered = wanted - missing.length;
  const rate = wanted === 0 ? 100 : Math.round((covered / wanted) * 100);
  return { wanted, covered, rate, missing };
}
