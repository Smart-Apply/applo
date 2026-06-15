/**
 * Pure helpers that turn the deterministic keyword match into user-facing match
 * insights (suggestions / strengths / weaknesses).
 *
 * Extracted from `ApplicationsService.calculateMatchAnalysis` so the branching
 * copy logic is unit-testable without booting Nest/Prisma. The numeric
 * `overallScore` stays in the service and is ALWAYS deterministic keyword
 * coverage — never an LLM self-report (#9).
 *
 * Design rules:
 * - **Specific.** Suggestions name the actual missing high-value keywords.
 * - **Actionable + honest.** They tell the user to back a keyword with a real,
 *   measurable result in their target role — "nur dort, wo du es wirklich
 *   nachweisen kannst" — never to invent anything (aligns with the grounding
 *   validator, #7).
 * - **Profession-neutral.** Phrasing works for a nurse, CNC operator, teacher or
 *   developer — no IT-default wording.
 */

/** Minimal shape of a matched/missing keyword used for insight building. */
export interface MatchKeywordLite {
  keyword: string;
  category: string;
}

export interface MatchInsights {
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
}

/** High-value keyword categories worth weaving into experience / summary. */
const HARD_CATEGORIES = new Set([
  'core',
  'methodology',
  'technical',
  'tool',
  'requirement',
  'industry',
]);

const dedupe = (arr: string[]): string[] => Array.from(new Set(arr));

/**
 * Strip gender markers / parentheticals from a job title so it reads cleanly
 * inline (e.g. "Pflegedienstleitung (m/w/d)" → "Pflegedienstleitung").
 */
export function cleanRoleLabel(title?: string): string | undefined {
  if (!title) return undefined;
  const cleaned = title
    .replace(/\(\s*[mwfdx](?:\s*\/\s*[mwfdx])+\s*\)/gi, '') // (m/w/d), (w/m/d/x)
    .replace(/\bm\s*\/\s*w\s*\/\s*[dx]\b/gi, '') // m/w/d without parens
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s\-–·,]+$/, '')
    .trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Build specific, actionable, profession-neutral match insights.
 */
export function buildMatchInsights(
  matchedKeywords: MatchKeywordLite[],
  missingKeywords: MatchKeywordLite[],
  scores: { overallScore: number; experienceScore: number },
  targetRole?: string,
): MatchInsights {
  const suggestions: string[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  const { overallScore, experienceScore } = scores;
  const role = cleanRoleLabel(targetRole);
  const roleSuffix = role ? ` als „${role}“` : '';

  const missingHard = dedupe(
    missingKeywords.filter((k) => HARD_CATEGORIES.has(k.category)).map((k) => k.keyword),
  );
  const matchedHard = dedupe(
    matchedKeywords.filter((k) => HARD_CATEGORIES.has(k.category)).map((k) => k.keyword),
  );

  // --- Strengths: name what is already covered ---
  if (matchedHard.length > 0) {
    strengths.push(
      `Deine Bewerbung deckt bereits zentrale Begriffe der Stelle ab: ${matchedHard
        .slice(0, 4)
        .join(', ')}.`,
    );
  }
  if (experienceScore >= 70) {
    strengths.push('Deine Berufserfahrung passt zu den geforderten Anforderungen.');
  }
  if (overallScore >= 75 && matchedHard.length > 0) {
    strengths.push(`Insgesamt passt dein Profil${roleSuffix} gut zur Ausschreibung.`);
  }

  // --- Suggestions: specific keyword + actionable + no fabrication ---
  if (missingHard.length > 0) {
    for (const kw of missingHard.slice(0, 2)) {
      suggestions.push(
        `Belege „${kw}“ mit einem konkreten, messbaren Ergebnis aus deiner Tätigkeit${roleSuffix} — nur dort, wo du es wirklich nachweisen kannst, statt das Schlagwort nur zu nennen.`,
      );
    }
    const rest = missingHard.slice(2, 7);
    if (rest.length > 0) {
      suggestions.push(
        `Diese gefragten Begriffe fehlen noch in deiner Bewerbung: ${rest.join(
          ', ',
        )}. Nimm sie dort auf, wo deine Erfahrung sie tatsächlich deckt.`,
      );
    }
    weaknesses.push(
      `${missingHard.length} gefragte ${
        missingHard.length === 1 ? 'Schlüsselbegriff ist' : 'Schlüsselbegriffe sind'
      } noch nicht abgedeckt.`,
    );
  }

  // --- Low-coverage nudge: concrete, references the score + role ---
  if (overallScore < 50) {
    suggestions.push(
      `Erst ${overallScore}% der wichtigen Begriffe sind abgedeckt. Schärfe Kurzprofil und Erfahrungsbeschreibungen gezielt auf die Anforderungen${roleSuffix}.`,
    );
    if (weaknesses.length === 0) {
      weaknesses.push('Das Profil ist noch nicht klar genug auf die Stelle zugeschnitten.');
    }
  }

  // --- Fully covered: reassure instead of inventing work ---
  if (missingHard.length === 0 && overallScore >= 75) {
    suggestions.push(
      'Alle wichtigen Begriffe der Stelle sind abgedeckt. Prüfe zum Feinschliff, ob jede Aussage mit einem konkreten Ergebnis belegt ist.',
    );
  }

  return { suggestions, strengths, weaknesses };
}
