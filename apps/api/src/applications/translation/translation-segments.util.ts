/**
 * Segment extraction + merge for the résumé translation pass
 * (fix plan `docs/bug_fixes/LANGUAGE_SWITCH_EXPORT.md`).
 *
 * Instead of asking the LLM to re-emit the whole stored resume JSON (where a
 * mangled id/date/URL silently corrupts the document), we extract only the
 * human-readable display strings as flat `{ id, text }` segments, translate
 * those under a strict JSON schema, and merge them back deterministically.
 * Everything the LLM never sees (ids, raw dates, emails, links, structure)
 * cannot break.
 *
 * Guard contract (`isValidSegmentTranslation`): the translation is accepted
 * only when EVERY requested segment comes back exactly once with non-empty
 * text — otherwise the caller falls back to the untranslated source, so a
 * partially-translated (mixed-language) résumé can never ship.
 *
 * Pure + dependency-free so the mapping is unit-testable without Nest/Prisma.
 */

/** A single translatable display string, addressed by a stable path id. */
export interface TranslationSegment {
  id: string;
  text: string;
}

/** Loose stored-resume shape (structural subset of `Application.resumeText`). */
export interface TranslatableResume {
  summary?: string | null;
  targetJobTitle?: string | null;
  skillCategories?: Array<{ type?: string }>;
  experiences?: Array<{
    title?: string;
    description?: string | null;
    achievements?: string[];
  }>;
  projects?: Array<{
    name?: string;
    description?: string | null;
    highlights?: string[];
  }>;
  education?: Array<{
    degree?: string;
    fieldOfStudy?: string | null;
    description?: string | null;
  }>;
  languages?: Array<{ name?: string; level?: string }>;
}

function push(segments: TranslationSegment[], id: string, text: unknown): void {
  if (typeof text === 'string' && text.trim() !== '') {
    segments.push({ id, text });
  }
}

/**
 * Extract every translatable display string of a stored resume as flat
 * segments with stable path ids (`summary`, `exp.0.title`, `exp.0.ach.2`, …).
 * Contact data, URLs, dates and structural fields are deliberately excluded.
 */
export function extractTranslatableSegments(resume: TranslatableResume): TranslationSegment[] {
  const segments: TranslationSegment[] = [];

  push(segments, 'summary', resume.summary);
  push(segments, 'targetJobTitle', resume.targetJobTitle);

  (resume.skillCategories ?? []).forEach((category, i) => {
    push(segments, `skillCat.${i}.type`, category.type);
  });

  (resume.experiences ?? []).forEach((exp, i) => {
    push(segments, `exp.${i}.title`, exp.title);
    push(segments, `exp.${i}.description`, exp.description);
    (exp.achievements ?? []).forEach((achievement, j) => {
      push(segments, `exp.${i}.ach.${j}`, achievement);
    });
  });

  (resume.projects ?? []).forEach((project, i) => {
    push(segments, `proj.${i}.name`, project.name);
    push(segments, `proj.${i}.description`, project.description);
    (project.highlights ?? []).forEach((highlight, j) => {
      push(segments, `proj.${i}.hl.${j}`, highlight);
    });
  });

  (resume.education ?? []).forEach((edu, i) => {
    push(segments, `edu.${i}.degree`, edu.degree);
    push(segments, `edu.${i}.fieldOfStudy`, edu.fieldOfStudy);
    push(segments, `edu.${i}.description`, edu.description);
  });

  (resume.languages ?? []).forEach((lang, i) => {
    push(segments, `lang.${i}.name`, lang.name);
    // Normalized proficiency keys ("level.native") are localized by the PDF
    // templates via tLevel — only free-text levels need translation.
    if (typeof lang.level === 'string' && lang.level && !lang.level.startsWith('level.')) {
      push(segments, `lang.${i}.level`, lang.level);
    }
  });

  return segments;
}

/**
 * Is `translated` a complete, well-formed translation of `requested`?
 * Every requested id must come back exactly once with a non-empty string —
 * anything else (missing, duplicated, invented, emptied) rejects the whole
 * translation so a partially-translated résumé never ships.
 */
export function isValidSegmentTranslation(
  requested: TranslationSegment[],
  translated: unknown,
): translated is TranslationSegment[] {
  if (!Array.isArray(translated)) return false;
  if (translated.length !== requested.length) return false;

  const requestedIds = new Set(requested.map((s) => s.id));
  const seen = new Set<string>();
  for (const segment of translated) {
    if (!segment || typeof segment !== 'object') return false;
    const { id, text } = segment as Partial<TranslationSegment>;
    if (typeof id !== 'string' || !requestedIds.has(id) || seen.has(id)) return false;
    if (typeof text !== 'string' || text.trim() === '') return false;
    seen.add(id);
  }
  return seen.size === requested.length;
}

/**
 * Merge translated segments back into a deep clone of the resume by path id.
 * Unknown ids are ignored (defense in depth — the guard already rejects them).
 */
export function applyTranslatedSegments<T extends TranslatableResume>(
  resume: T,
  segments: TranslationSegment[],
): T {
  const clone: TranslatableResume = JSON.parse(JSON.stringify(resume));

  for (const { id, text } of segments) {
    const parts = id.split('.');
    switch (parts[0]) {
      case 'summary':
        clone.summary = text;
        break;
      case 'targetJobTitle':
        clone.targetJobTitle = text;
        break;
      case 'skillCat': {
        const category = clone.skillCategories?.[Number(parts[1])];
        if (category && parts[2] === 'type') category.type = text;
        break;
      }
      case 'exp': {
        const exp = clone.experiences?.[Number(parts[1])];
        if (!exp) break;
        if (parts[2] === 'title') exp.title = text;
        else if (parts[2] === 'description') exp.description = text;
        else if (parts[2] === 'ach' && exp.achievements) {
          const j = Number(parts[3]);
          if (j < exp.achievements.length) exp.achievements[j] = text;
        }
        break;
      }
      case 'proj': {
        const project = clone.projects?.[Number(parts[1])];
        if (!project) break;
        if (parts[2] === 'name') project.name = text;
        else if (parts[2] === 'description') project.description = text;
        else if (parts[2] === 'hl' && project.highlights) {
          const j = Number(parts[3]);
          if (j < project.highlights.length) project.highlights[j] = text;
        }
        break;
      }
      case 'edu': {
        const edu = clone.education?.[Number(parts[1])];
        if (!edu) break;
        if (parts[2] === 'degree') edu.degree = text;
        else if (parts[2] === 'fieldOfStudy') edu.fieldOfStudy = text;
        else if (parts[2] === 'description') edu.description = text;
        break;
      }
      case 'lang': {
        const lang = clone.languages?.[Number(parts[1])];
        if (!lang) break;
        if (parts[2] === 'name') lang.name = text;
        else if (parts[2] === 'level') lang.level = text;
        break;
      }
    }
  }

  return clone as T;
}
