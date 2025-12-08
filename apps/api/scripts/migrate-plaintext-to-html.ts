/**
 * Data Migration Script: Convert Plain Text Descriptions to HTML
 *
 * This script converts existing plain text descriptions in the database to HTML format,
 * preserving newlines as <br> tags or paragraph breaks.
 *
 * Affected fields:
 * - Profile.summary
 * - Experience.description
 * - Project.description
 * - Education.description
 *
 * Usage:
 *   npx ts-node scripts/migrate-plaintext-to-html.ts [--dry-run]
 *
 * Options:
 *   --dry-run    Show what would be changed without updating the database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Convert plain text to HTML, preserving structure
 * - Wraps content in <p> tags
 * - Converts single newlines to <br>
 * - Converts double newlines to paragraph breaks
 */
function convertPlainTextToHtml(text: string | null | undefined): string | null {
  if (!text || text.trim() === '') {
    return null;
  }

  // If already contains HTML tags, skip conversion
  if (/<[a-z][\s\S]*>/i.test(text)) {
    console.log('  ⚠️  Skipping (already contains HTML tags)');
    return text;
  }

  // Split by double newlines to detect paragraphs
  const paragraphs = text.split(/\n\n+/);

  // Convert each paragraph
  const htmlParagraphs = paragraphs.map((para) => {
    const trimmed = para.trim();
    if (!trimmed) return '';

    // Convert single newlines within paragraph to <br>
    const withBreaks = trimmed.replace(/\n/g, '<br>');

    // Wrap in <p> tag
    return `<p>${withBreaks}</p>`;
  });

  // Join paragraphs
  return htmlParagraphs.filter((p) => p).join('\n');
}

async function migrateData(dryRun: boolean = false) {
  console.log('🚀 Starting migration: Plain Text → HTML\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;

  try {
    // 1. Migrate Profile.summary
    console.log('📋 Migrating Profile.summary...');
    const profiles = await prisma.profile.findMany({
      where: {
        summary: { not: null },
      },
      select: { id: true, summary: true },
    });

    for (const profile of profiles) {
      const htmlSummary = convertPlainTextToHtml(profile.summary);
      if (htmlSummary && htmlSummary !== profile.summary) {
        console.log(`  ✅ Profile ${profile.id.substring(0, 8)}...`);
        if (!dryRun) {
          await prisma.profile.update({
            where: { id: profile.id },
            data: { summary: htmlSummary },
          });
        }
        totalUpdated++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`  Updated: ${totalUpdated}, Skipped: ${totalSkipped}\n`);

    // 2. Migrate Experience.description
    console.log('💼 Migrating Experience.description...');
    totalUpdated = 0;
    totalSkipped = 0;
    const experiences = await prisma.experience.findMany({
      where: {
        description: { not: null },
      },
      select: { id: true, description: true, title: true },
    });

    for (const exp of experiences) {
      const htmlDescription = convertPlainTextToHtml(exp.description);
      if (htmlDescription && htmlDescription !== exp.description) {
        console.log(`  ✅ Experience: ${exp.title} (${exp.id.substring(0, 8)}...)`);
        if (!dryRun) {
          await prisma.experience.update({
            where: { id: exp.id },
            data: { description: htmlDescription },
          });
        }
        totalUpdated++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`  Updated: ${totalUpdated}, Skipped: ${totalSkipped}\n`);

    // 3. Migrate Project.description
    console.log('🚀 Migrating Project.description...');
    totalUpdated = 0;
    totalSkipped = 0;
    const projects = await prisma.project.findMany({
      where: {
        description: { not: null },
      },
      select: { id: true, description: true, name: true },
    });

    for (const project of projects) {
      const htmlDescription = convertPlainTextToHtml(project.description);
      if (htmlDescription && htmlDescription !== project.description) {
        console.log(`  ✅ Project: ${project.name} (${project.id.substring(0, 8)}...)`);
        if (!dryRun) {
          await prisma.project.update({
            where: { id: project.id },
            data: { description: htmlDescription },
          });
        }
        totalUpdated++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`  Updated: ${totalUpdated}, Skipped: ${totalSkipped}\n`);

    // 4. Migrate Education.description
    console.log('🎓 Migrating Education.description...');
    totalUpdated = 0;
    totalSkipped = 0;
    const educationRecords = await prisma.education.findMany({
      where: {
        description: { not: null },
      },
      select: { id: true, description: true, degree: true, institution: true },
    });

    for (const edu of educationRecords) {
      const htmlDescription = convertPlainTextToHtml(edu.description);
      if (htmlDescription && htmlDescription !== edu.description) {
        console.log(
          `  ✅ Education: ${edu.degree} at ${edu.institution} (${edu.id.substring(0, 8)}...)`,
        );
        if (!dryRun) {
          await prisma.education.update({
            where: { id: edu.id },
            data: { description: htmlDescription },
          });
        }
        totalUpdated++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`  Updated: ${totalUpdated}, Skipped: ${totalSkipped}\n`);

    console.log('✅ Migration completed successfully!\n');

    if (dryRun) {
      console.log('💡 This was a DRY RUN. No changes were made to the database.');
      console.log('   Run without --dry-run to apply changes.\n');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run migration
migrateData(dryRun).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
