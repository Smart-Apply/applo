import { type Locale, locales } from '@/i18n/config';
import { professionsDe } from './professions/de';
import { professionsEn } from './professions/en';
import { professionsEs } from './professions/es';
import { professionsFr } from './professions/fr';
import { professionsIt } from './professions/it';
import { professionsPt } from './professions/pt';
import {
  contentForFamily,
  PROFESSION_IDS,
  type ProfessionCatalog,
  type ProfessionContent,
  type ProfessionId,
  type SeoFamily,
} from './types';

export * from './types';
export * from './families';

/**
 * All six catalogs, keyed by locale. `Record<Locale, ProfessionCatalog>` means
 * adding a locale to `i18n/config` fails the build here until its catalog
 * exists — the SEO surface can never be silently missing a language.
 *
 * These are server-only imports (every consumer is a Server Component or a
 * route handler), so the ~200 KB of copy never reaches the browser bundle.
 */
const CATALOGS: Record<Locale, ProfessionCatalog> = {
  de: professionsDe,
  en: professionsEn,
  fr: professionsFr,
  es: professionsEs,
  pt: professionsPt,
  it: professionsIt,
};

export function catalogFor(locale: Locale): ProfessionCatalog {
  return CATALOGS[locale];
}

export function professionFor(locale: Locale, id: ProfessionId): ProfessionContent {
  return CATALOGS[locale][id];
}

/** Every profession in one locale, in the catalog's declared order. */
export function allProfessions(locale: Locale): Array<{ id: ProfessionId; content: ProfessionContent }> {
  return PROFESSION_IDS.map((id) => ({ id, content: CATALOGS[locale][id] }));
}

/**
 * Reverse lookup for the `[slug]` route param.
 *
 * Slugs are localized and differ per family (a profession can share a slug
 * across families — `/de/bewerbung-schreiben/pflegefachkraft` and
 * `/de/vorstellungsgespraech-fragen/pflegefachkraft` — so the family has to
 * be part of the key).
 */
export function professionIdFromSlug(
  locale: Locale,
  family: SeoFamily,
  slug: string,
): ProfessionId | undefined {
  return PROFESSION_IDS.find((id) => contentForFamily(CATALOGS[locale][id], family).slug === slug);
}

/**
 * Curated cross-links between professions, used for the "other professions"
 * block at the foot of each page. Hand-picked rather than computed: the point
 * is a reader who might plausibly be weighing both roles, which no similarity
 * metric over this data would capture.
 */
const RELATED: Record<ProfessionId, readonly ProfessionId[]> = {
  'software-developer': ['data-analyst', 'project-manager', 'marketing-manager'],
  nurse: ['teacher', 'customer-service-agent', 'office-administrator'],
  'project-manager': ['software-developer', 'marketing-manager', 'accountant'],
  'sales-representative': ['marketing-manager', 'customer-service-agent', 'project-manager'],
  accountant: ['office-administrator', 'data-analyst', 'project-manager'],
  'marketing-manager': ['sales-representative', 'data-analyst', 'project-manager'],
  'data-analyst': ['software-developer', 'marketing-manager', 'accountant'],
  teacher: ['nurse', 'customer-service-agent', 'office-administrator'],
  'office-administrator': ['accountant', 'customer-service-agent', 'warehouse-logistics'],
  'customer-service-agent': ['sales-representative', 'office-administrator', 'nurse'],
  electrician: ['warehouse-logistics', 'project-manager', 'office-administrator'],
  'warehouse-logistics': ['electrician', 'office-administrator', 'customer-service-agent'],
};

export function relatedProfessions(
  locale: Locale,
  id: ProfessionId,
): Array<{ id: ProfessionId; content: ProfessionContent }> {
  return RELATED[id].map((relatedId) => ({ id: relatedId, content: CATALOGS[locale][relatedId] }));
}

/** Total indexable entity pages, for the hub copy and for sanity checks. */
export const PROFESSION_PAGE_COUNT = PROFESSION_IDS.length * locales.length * 2;
