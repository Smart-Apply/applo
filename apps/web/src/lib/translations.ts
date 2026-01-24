/**
 * Translation utilities for enum values to German display labels
 * 
 * These mappings convert backend enum values to user-friendly German labels.
 * They also support legacy German strings for backward compatibility.
 */

// Language Proficiency Level translations
export const LANGUAGE_LEVEL_LABELS: Record<string, string> = {
  // Enum values (from backend LanguageProficiency enum)
  'NATIVE': 'Muttersprache',
  'FLUENT': 'Fließend',
  'ADVANCED': 'Fortgeschritten',
  'INTERMEDIATE': 'Gut',
  'BASIC': 'Grundkenntnisse',
  // Legacy support for old German values
  'Muttersprache': 'Muttersprache',
  'Fließend': 'Fließend',
  'Verhandlungssicher': 'Verhandlungssicher',
  'Fortgeschritten': 'Fortgeschritten',
  'Gute Kenntnisse': 'Gut',
  'Grundkenntnisse': 'Grundkenntnisse',
  'Anfänger': 'Anfänger',
};

// Skill Level translations
export const SKILL_LEVEL_LABELS: Record<string, string> = {
  // Enum values (from backend SkillLevel enum)
  'EXPERT': 'Experte',
  'ADVANCED': 'Fortgeschritten',
  'INTERMEDIATE': 'Mittel',
  'BEGINNER': 'Anfänger',
  // Legacy support for old German values
  'Experte': 'Experte',
  'Fortgeschritten': 'Fortgeschritten',
  'Mittel': 'Mittel',
  'Anfänger': 'Anfänger',
};

/**
 * Get German display label for a language proficiency level
 * Handles both new enum values (NATIVE, FLUENT) and legacy German strings
 */
export function getLanguageLevelLabel(level?: string | null): string {
  if (!level) return '';
  return LANGUAGE_LEVEL_LABELS[level] || level;
}

/**
 * Get German display label for a skill level
 * Handles both new enum values (EXPERT, ADVANCED) and legacy German strings
 */
export function getSkillLevelLabel(level?: string | null): string {
  if (!level) return '';
  return SKILL_LEVEL_LABELS[level] || level;
}
