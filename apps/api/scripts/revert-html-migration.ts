/**
 * Revert HTML Migration Script
 *
 * This script reverts the HTML conversion for descriptions that were plain text
 * and only contain <p> and <br> tags (from the migration script).
 *
 * Usage:
 *   npx ts-node scripts/revert-html-migration.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Convert simple HTML back to plain text (remove <p>, </p>, <br> tags)
 */
function revertSimpleHtml(text: string | null | undefined): string | null {
  if (!text || text.trim() === '') {
    return null;
  }

  // Check if it only contains simple tags from migration (<p>, <br>)
  const hasOnlySimpleTags =
    /<p>|<\/p>|<br>/i.test(text) && !/<(ul|ol|li|strong|em|b|i|blockquote|h[1-6])/i.test(text);

  if (!hasOnlySimpleTags) {
    console.log('  ⚠️  Skipping (contains rich formatting)');
    return text;
  }

  // Remove <p> and </p> tags
  let cleaned = text.replace(/<\/?p>/g, '');

  // Convert <br> to newlines
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');

  // Clean up extra whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

async function revertData(dryRun: boolean = false) {
  console.log('🔄 Starting HTML reversion: Simple HTML → Plain Text\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}\n`);

  let totalReverted = 0;
  let totalSkipped = 0;

  try {
    // 1. Revert Profile.summary
    console.log('📋 Reverting Profile.summary...');
    const profiles = await prisma.profile.findMany({
      where: {
        summary: { not: null },
      },
      select: { id: true, summary: true },
    });

    for (const profile of profiles) {
      const plainText = revertSimpleHtml(profile.summary);
      if (plainText && plainText !== profile.summary) {
        console.log(`  ✅ Profile ${profile.id.substring(0, 8)}... (removed HTML tags)`);
        if (!dryRun) {
          await prisma.profile.update({
            where: { id: profile.id },
            data: { summary: plainText },
          });
        }
        totalReverted++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`  Reverted: ${totalReverted}, Skipped: ${totalSkipped}\n`);

    // 2. Revert Experience.description
    console.log('💼 Reverting Experience.description...');
    totalReverted = 0;
    totalSkipped = 0;
    const experiences = await prisma.experience.findMany({
      where: {
        description: { not: null },
      },
      select: { id: true, description: true, title: true },
    });

    for (const exp of experiences) {
      const plainText = revertSimpleHtml(exp.description);
      if (plainText && plainText !== exp.description) {
        console.log(
          `  ✅ Experience: ${exp.title} (${exp.id.substring(0, 8)}...) - removed HTML tags`,
        );
        if (!dryRun) {
          await prisma.experience.update({
            where: { id: exp.id },
            data: { description: plainText },
          });
        }
        totalReverted++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`  Reverted: ${totalReverted}, Skipped: ${totalSkipped}\n`);

    // 3. Revert Project.description
    console.log('🚀 Reverting Project.description...');
    totalReverted = 0;
    totalSkipped = 0;
    const projects = await prisma.project.findMany({
      where: {
        description: { not: null },
      },
      select: { id: true, description: true, name: true },
    });

    for (const project of projects) {
      const plainText = revertSimpleHtml(project.description);
      if (plainText && plainText !== project.description) {
        console.log(
          `  ✅ Project: ${project.name} (${project.id.substring(0, 8)}...) - removed HTML tags`,
        );
        if (!dryRun) {
          await prisma.project.update({
            where: { id: project.id },
            data: { description: plainText },
          });
        }
        totalReverted++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`  Reverted: ${totalReverted}, Skipped: ${totalSkipped}\n`);

    // 4. Revert Education.description
    console.log('🎓 Reverting Education.description...');
    totalReverted = 0;
    totalSkipped = 0;
    const educationRecords = await prisma.education.findMany({
      where: {
        description: { not: null },
      },
      select: { id: true, description: true, degree: true, institution: true },
    });

    for (const edu of educationRecords) {
      const plainText = revertSimpleHtml(edu.description);
      if (plainText && plainText !== edu.description) {
        console.log(
          `  ✅ Education: ${edu.degree} at ${edu.institution} (${edu.id.substring(0, 8)}...) - removed HTML tags`,
        );
        if (!dryRun) {
          await prisma.education.update({
            where: { id: edu.id },
            data: { description: plainText },
          });
        }
        totalReverted++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`  Reverted: ${totalReverted}, Skipped: ${totalSkipped}\n`);

    console.log('✅ Reversion completed successfully!\n');

    if (dryRun) {
      console.log('💡 This was a DRY RUN. No changes were made to the database.');
      console.log('   Run without --dry-run to apply changes.\n');
    } else {
      console.log('✅ All simple HTML tags removed. Your data is now plain text again.');
      console.log('   Use the rich text editor in the UI to add formatting.\n');
    }
  } catch (error) {
    console.error('❌ Reversion failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run reversion
revertData(dryRun).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
