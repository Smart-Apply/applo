import type { Locale } from '@/i18n/config';
import type { SeoFamily } from './types';

/**
 * Localized URL segment for each page family.
 *
 * The slugs are the search term, not a translation of an internal name:
 * German job seekers search "Vorstellungsgespräch Fragen", the French search
 * "questions entretien d'embauche". Umlauts are transliterated (ae/oe/ue/ss)
 * and accents dropped so every URL stays ASCII — percent-encoded paths are
 * legal but they read as gibberish when shared and copied.
 *
 * These are permanent identifiers: changing one breaks every inbound link and
 * every indexed URL, so treat an edit here as a redirect-requiring migration.
 */
export const FAMILY_SLUGS: Record<SeoFamily, Record<Locale, string>> = {
  application: {
    de: 'bewerbung-schreiben',
    en: 'cover-letter',
    fr: 'lettre-de-motivation',
    es: 'carta-de-presentacion',
    pt: 'carta-de-apresentacao',
    it: 'lettera-di-presentazione',
  },
  interview: {
    de: 'vorstellungsgespraech-fragen',
    en: 'interview-questions',
    fr: 'questions-entretien-embauche',
    es: 'preguntas-entrevista-trabajo',
    pt: 'perguntas-entrevista-emprego',
    it: 'domande-colloquio-lavoro',
  },
};

/** Resolve a URL segment back to its family, for the `[family]` route param. */
export function familyFromSlug(locale: Locale, slug: string): SeoFamily | undefined {
  if (FAMILY_SLUGS.application[locale] === slug) return 'application';
  if (FAMILY_SLUGS.interview[locale] === slug) return 'interview';
  return undefined;
}
