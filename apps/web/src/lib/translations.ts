/**
 * Translation utilities for enum values to display labels (de/en).
 *
 * These mappings convert backend enum values to user-friendly labels in
 * the active UI language. They also support legacy German strings for
 * backward compatibility.
 */

import type { Locale } from '@/i18n/config';
import { getActiveLocale } from './i18n-runtime';

// Language Proficiency Level translations
export const LANGUAGE_LEVEL_LABELS: Record<Locale, Record<string, string>> = {
  de: {
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
  },
  en: {
    'NATIVE': 'Native',
    'FLUENT': 'Fluent',
    'ADVANCED': 'Advanced',
    'INTERMEDIATE': 'Good',
    'BASIC': 'Basic',
    // Legacy German values stored in older profiles
    'Muttersprache': 'Native',
    'Fließend': 'Fluent',
    'Verhandlungssicher': 'Business fluent',
    'Fortgeschritten': 'Advanced',
    'Gute Kenntnisse': 'Good',
    'Grundkenntnisse': 'Basic',
    'Anfänger': 'Beginner',
  },
};

// Skill Level translations
export const SKILL_LEVEL_LABELS: Record<Locale, Record<string, string>> = {
  de: {
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
  },
  en: {
    'EXPERT': 'Expert',
    'ADVANCED': 'Advanced',
    'INTERMEDIATE': 'Intermediate',
    'BEGINNER': 'Beginner',
    // Legacy German values stored in older profiles
    'Experte': 'Expert',
    'Fortgeschritten': 'Advanced',
    'Mittel': 'Intermediate',
    'Anfänger': 'Beginner',
  },
};

/**
 * Get the display label for a language proficiency level
 * Handles both new enum values (NATIVE, FLUENT) and legacy German strings
 */
export function getLanguageLevelLabel(level?: string | null): string {
  if (!level) return '';
  return LANGUAGE_LEVEL_LABELS[getActiveLocale()][level] || level;
}

/**
 * Get the display label for a skill level
 * Handles both new enum values (EXPERT, ADVANCED) and legacy German strings
 */
export function getSkillLevelLabel(level?: string | null): string {
  if (!level) return '';
  return SKILL_LEVEL_LABELS[getActiveLocale()][level] || level;
}
