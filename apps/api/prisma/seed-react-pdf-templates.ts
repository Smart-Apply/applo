/**
 * React-PDF Template Seed (TSX era)
 * =================================
 * Seeds the Template catalog for the react-pdf (TSX) rendering pipeline and
 * heals environments that still carry legacy HBS-era rows.
 *
 * Since v1.16 removed the Puppeteer/Handlebars renderer, every ACTIVE template
 * row MUST resolve to a factory registered in
 * `src/pdf-v2/template-registry.ts` — otherwise `PdfService` throws at
 * generation time. This seed is therefore the single canonical source of
 * catalog rows:
 *
 *   1. Upserts one row per design × color variant × type (resume/cover letter)
 *      for the registered TSX designs. `htmlTemplate`/`cssStyles` are unused
 *      relics of the HBS pipeline and stay empty on new rows; updates never
 *      touch them (nor `previewImageKey`, so cached previews survive).
 *   2. Deactivates every other still-active row (e.g. the legacy
 *      "Modern Professional"/"Tech Modern" seeds) so the catalog can never
 *      offer a design that would crash generation. Rows are deactivated, not
 *      deleted — existing applications keep their references.
 *
 * When you add a NEW TSX design (see .github/skills/pdf-react-pdf-template.md):
 * register its factory in template-registry.ts AND add its entry below —
 * otherwise the next seed run will deactivate its rows.
 *
 * Usage:
 *   pnpm prisma:seed:templates          (local)
 *   node prisma/dist/seed-react-pdf-templates.js   (compiled, via seed-all)
 */

import { PrismaClient, TemplateType } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { join } from 'path';

// Load .env from apps/api directory (one level up from prisma/)
config({ path: join(__dirname, '../.env') });

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/smartapply',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface ColorVariant {
  /** Variant slug used in row ids, e.g. 'default' → classic-ats-default-resume. */
  id: string;
  /** Display name shown as the color swatch label. */
  name: string;
  /** Accent hex the TSX component derives its palette from. */
  accent: string;
  /** Marks the catalog default (exactly one variant across all designs). */
  isDefault?: boolean;
}

interface TsxDesign {
  /**
   * Design slug — MUST match a `key` in src/pdf-v2/template-registry.ts
   * (resolution also matches the kebab-cased row name, which is derived
   * from `name` below).
   */
  id: string;
  name: string;
  description: string;
  category: string;
  variants: ColorVariant[];
}

/**
 * Canonical catalog. Mirrors the three registered TSX designs; ids, names,
 * categories and accents intentionally match the rows that already exist in
 * staging/prod so re-runs are pure metadata upserts.
 */
const DESIGNS: TsxDesign[] = [
  {
    id: 'classic-ats',
    name: 'Classic ATS',
    description:
      'Klares, ATS-optimiertes Layout mit maximaler Lesbarkeit für automatische Bewerbungsparser.',
    category: 'Professional',
    variants: [
      { id: 'default', name: 'Klassisch', accent: '#1a1a1a', isDefault: true },
      { id: 'blue', name: 'Navy', accent: '#1B2A49' },
      { id: 'teal', name: 'Teal', accent: '#0d9488' },
    ],
  },
  {
    id: 'harvard-classic',
    name: 'Harvard Classic',
    description: 'Zeitloses, akademisches Design inspiriert vom klassischen Harvard-Format.',
    category: 'Academic',
    variants: [
      { id: 'crimson', name: 'Harvard Crimson', accent: '#A51C30' },
      { id: 'navy', name: 'Navy', accent: '#1B2A49' },
      { id: 'charcoal', name: 'Charcoal', accent: '#374151' },
    ],
  },
  {
    id: 'elegant-sidebar',
    name: 'Elegant Sidebar',
    description:
      'Modernes zweispaltiges Layout mit farbiger Seitenleiste für einen professionellen Auftritt.',
    category: 'Creative',
    variants: [
      { id: 'brown', name: 'Original Brown', accent: '#8B5E3C' },
      { id: 'blue', name: 'Ocean Blue', accent: '#2563eb' },
      { id: 'green', name: 'Forest Green', accent: '#16a34a' },
    ],
  },
];

async function seedReactPdfTemplates(): Promise<void> {
  console.log('🎨 Seeding react-pdf (TSX) template catalog...\n');

  const seededIds: string[] = [];
  let created = 0;
  let updated = 0;

  for (const design of DESIGNS) {
    console.log(`✨ ${design.name} (${design.category})`);

    for (const variant of design.variants) {
      for (const kind of ['resume', 'cover-letter'] as const) {
        const id = `${design.id}-${variant.id}-${kind}`;
        const type = kind === 'resume' ? TemplateType.RESUME : TemplateType.COVER_LETTER;
        // Groups color variants of one design (per type) for the wizard swatches.
        const baseTemplateId = `${design.id}-${kind}`;
        const metadata = {
          name: `${design.name} (${variant.name})`,
          description: design.description,
          category: design.category,
          language: 'en', // TSX designs are language-neutral; labels follow data.language
          baseTemplateId,
          accentColor: variant.accent,
          colorVariantName: variant.name,
          isActive: true,
          isDefault: Boolean(variant.isDefault),
        };

        const existing = await prisma.template.findUnique({ where: { id }, select: { id: true } });
        if (existing) {
          await prisma.template.update({ where: { id }, data: metadata });
          updated++;
        } else {
          await prisma.template.create({
            data: {
              id,
              type,
              // HBS-era relics — required columns, unused by the TSX renderer.
              htmlTemplate: '',
              cssStyles: '',
              ...metadata,
            },
          });
          created++;
        }
        seededIds.push(id);
      }
    }
  }

  // Heal legacy data: any still-active row outside the canonical set has no
  // registered react-pdf factory and would crash generation if selected.
  const legacy = await prisma.template.findMany({
    where: { isActive: true, id: { notIn: seededIds } },
    select: { id: true, name: true },
  });
  if (legacy.length > 0) {
    await prisma.template.updateMany({
      where: { id: { in: legacy.map((t) => t.id) } },
      data: { isActive: false, isDefault: false },
    });
    console.log(`\n🧹 Deactivated ${legacy.length} legacy template row(s) without a TSX factory:`);
    legacy.forEach((t) => console.log(`   • ${t.id} ("${t.name}")`));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Template seeding complete!');
  console.log(`   • Created: ${created}`);
  console.log(`   • Updated: ${updated}`);
  console.log(`   • Deactivated legacy: ${legacy.length}`);
  console.log('='.repeat(60));
}

seedReactPdfTemplates()
  .then(() => {
    console.log('\n🎉 Template seeding completed successfully!');
  })
  .catch((error) => {
    console.error('\n❌ Error seeding templates:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
