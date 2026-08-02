/**
 * Translation utilities for enum values to display labels (all UI locales).
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
  fr: {
    'NATIVE': 'Langue maternelle',
    'FLUENT': 'Courant',
    'ADVANCED': 'Avancé',
    'INTERMEDIATE': 'Bon',
    'BASIC': 'Notions de base',
    'Muttersprache': 'Langue maternelle',
    'Fließend': 'Courant',
    'Verhandlungssicher': 'Courant (professionnel)',
    'Fortgeschritten': 'Avancé',
    'Gute Kenntnisse': 'Bon',
    'Grundkenntnisse': 'Notions de base',
    'Anfänger': 'Débutant',
  },
  es: {
    'NATIVE': 'Nativo',
    'FLUENT': 'Fluido',
    'ADVANCED': 'Avanzado',
    'INTERMEDIATE': 'Bueno',
    'BASIC': 'Básico',
    'Muttersprache': 'Nativo',
    'Fließend': 'Fluido',
    'Verhandlungssicher': 'Fluido (profesional)',
    'Fortgeschritten': 'Avanzado',
    'Gute Kenntnisse': 'Bueno',
    'Grundkenntnisse': 'Básico',
    'Anfänger': 'Principiante',
  },
  pt: {
    'NATIVE': 'Nativo',
    'FLUENT': 'Fluente',
    'ADVANCED': 'Avançado',
    'INTERMEDIATE': 'Bom',
    'BASIC': 'Básico',
    'Muttersprache': 'Nativo',
    'Fließend': 'Fluente',
    'Verhandlungssicher': 'Fluente (profissional)',
    'Fortgeschritten': 'Avançado',
    'Gute Kenntnisse': 'Bom',
    'Grundkenntnisse': 'Básico',
    'Anfänger': 'Iniciante',
  },
  it: {
    'NATIVE': 'Madrelingua',
    'FLUENT': 'Fluente',
    'ADVANCED': 'Avanzato',
    'INTERMEDIATE': 'Buono',
    'BASIC': 'Base',
    'Muttersprache': 'Madrelingua',
    'Fließend': 'Fluente',
    'Verhandlungssicher': 'Fluente (professionale)',
    'Fortgeschritten': 'Avanzato',
    'Gute Kenntnisse': 'Buono',
    'Grundkenntnisse': 'Base',
    'Anfänger': 'Principiante',
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
  fr: {
    'EXPERT': 'Expert',
    'ADVANCED': 'Avancé',
    'INTERMEDIATE': 'Intermédiaire',
    'BEGINNER': 'Débutant',
    'Experte': 'Expert',
    'Fortgeschritten': 'Avancé',
    'Mittel': 'Intermédiaire',
    'Anfänger': 'Débutant',
  },
  es: {
    'EXPERT': 'Experto',
    'ADVANCED': 'Avanzado',
    'INTERMEDIATE': 'Intermedio',
    'BEGINNER': 'Principiante',
    'Experte': 'Experto',
    'Fortgeschritten': 'Avanzado',
    'Mittel': 'Intermedio',
    'Anfänger': 'Principiante',
  },
  pt: {
    'EXPERT': 'Especialista',
    'ADVANCED': 'Avançado',
    'INTERMEDIATE': 'Intermédio',
    'BEGINNER': 'Iniciante',
    'Experte': 'Especialista',
    'Fortgeschritten': 'Avançado',
    'Mittel': 'Intermédio',
    'Anfänger': 'Iniciante',
  },
  it: {
    'EXPERT': 'Esperto',
    'ADVANCED': 'Avanzato',
    'INTERMEDIATE': 'Intermedio',
    'BEGINNER': 'Principiante',
    'Experte': 'Esperto',
    'Fortgeschritten': 'Avanzato',
    'Mittel': 'Intermedio',
    'Anfänger': 'Principiante',
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
