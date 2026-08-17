/**
 * Data-integrity check for the programmatic SEO catalogs.
 *
 * TypeScript already guarantees that every locale has every profession and
 * every field. What it cannot see is the class of problem that only exists
 * *between* records:
 *
 *   • two professions sharing a slug inside one (locale, family) — the second
 *     page becomes unreachable and both emit the same sitemap URL;
 *   • a slug that is not URL-safe, which silently percent-encodes;
 *   • duplicate meta titles or descriptions, which is exactly the
 *     template-substitution signature Google's scaled-content-abuse policy
 *     demotes;
 *   • copy that was pasted between locales and never translated.
 *
 * Run via `pnpm --filter @applo/web check:seo`; it also runs as part of the
 * Cloudflare build, so bad data fails the deploy rather than the ranking.
 *
 * Uses Node's native type stripping (Node 22.18+/24), so no build step is
 * needed — the catalog files import nothing but their own types.
 */

import { professionsDe } from '../src/data/seo/professions/de.ts';
import { professionsEn } from '../src/data/seo/professions/en.ts';
import { professionsEs } from '../src/data/seo/professions/es.ts';
import { professionsFr } from '../src/data/seo/professions/fr.ts';
import { professionsIt } from '../src/data/seo/professions/it.ts';
import { professionsPt } from '../src/data/seo/professions/pt.ts';

const CATALOGS = {
  de: professionsDe,
  en: professionsEn,
  fr: professionsFr,
  es: professionsEs,
  pt: professionsPt,
  it: professionsIt,
};

const FAMILIES = ['application', 'interview'];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const errors = [];
const fail = (message) => errors.push(message);

/** Collect `value -> [where]` and report anything seen more than once. */
function reportDuplicates(label, seen) {
  for (const [value, wheres] of seen) {
    if (wheres.length > 1) {
      fail(`duplicate ${label}: ${JSON.stringify(value)}\n    ${wheres.join('\n    ')}`);
    }
  }
}

const titles = new Map();
const descriptions = new Map();
const headings = new Map();

for (const [locale, catalog] of Object.entries(CATALOGS)) {
  for (const family of FAMILIES) {
    const slugs = new Map();

    for (const [id, profession] of Object.entries(catalog)) {
      const content = profession[family];
      const where = `${locale}/${family}/${id}`;

      if (!SLUG_PATTERN.test(content.slug)) {
        fail(`slug is not URL-safe at ${where}: ${JSON.stringify(content.slug)}`);
      }

      const push = (map, key) => {
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(where);
      };
      push(slugs, content.slug);
      push(titles, content.metaTitle);
      push(descriptions, content.metaDescription);
      push(headings, content.heading);

      // Length limits are soft, but a title Google truncates at 60-ish
      // characters wastes the only line of the result a searcher reads.
      if (content.metaTitle.length > 70) {
        fail(`metaTitle too long (${content.metaTitle.length} chars) at ${where}`);
      }
      if (content.metaDescription.length > 175) {
        fail(`metaDescription too long (${content.metaDescription.length} chars) at ${where}`);
      }
      if (content.intro.length < 120) {
        fail(`intro too short (${content.intro.length} chars) at ${where}`);
      }

      // Shape checks the type system expresses but cannot count.
      const counts =
        family === 'application'
          ? {
              atsKeywords: [content.atsKeywords, 8],
              hardSkills: [content.hardSkills, 3],
              softSkills: [content.softSkills, 4],
              certifications: [content.certifications, 3],
              cvFocus: [content.cvFocus, 3],
              mistakes: [content.mistakes, 3],
              faq: [content.faq, 3],
            }
          : {
              questions: [content.questions, 5],
              redFlags: [content.redFlags, 3],
              askThem: [content.askThem, 3],
              faq: [content.faq, 2],
            };

      for (const [field, [list, min]] of Object.entries(counts)) {
        if (list.length < min) {
          fail(`${field} has ${list.length} entries, expected at least ${min}, at ${where}`);
        }
      }
    }

    reportDuplicates(`slug in ${locale}/${family}`, slugs);
  }
}

reportDuplicates('metaTitle', titles);
reportDuplicates('metaDescription', descriptions);
reportDuplicates('heading', headings);

/**
 * Untranslated copy: the same sentence appearing in two languages means a
 * record was duplicated and never translated. Proper nouns and tool lists
 * legitimately repeat, so only prose fields are compared.
 */
const prose = new Map();
for (const [locale, catalog] of Object.entries(CATALOGS)) {
  for (const family of FAMILIES) {
    for (const [id, profession] of Object.entries(catalog)) {
      const content = profession[family];
      const where = `${locale}/${family}/${id}`;
      const texts = [content.intro, ...content.faq.map((f) => f.answer)];
      if (family === 'application') texts.push(content.coverLetterOpener);
      for (const text of texts) {
        if (!prose.has(text)) prose.set(text, new Set());
        prose.get(text).add(where);
      }
    }
  }
}
for (const [text, wheres] of prose) {
  const localesSeen = new Set([...wheres].map((w) => w.split('/')[0]));
  if (localesSeen.size > 1) {
    fail(
      `identical prose across locales (${[...localesSeen].join(', ')}) — untranslated?\n    ${text.slice(0, 90)}…`,
    );
  }
}

const pages = Object.keys(CATALOGS).length * FAMILIES.length * Object.keys(professionsDe).length;

if (errors.length > 0) {
  console.error(`\n✖ SEO data check failed with ${errors.length} problem(s):\n`);
  for (const error of errors) console.error(`  • ${error}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ SEO data check passed — ${pages} entity pages across 6 locales.`);
