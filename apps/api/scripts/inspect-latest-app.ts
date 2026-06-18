/* Throwaway: inspect the most recent Application to verify the create pipeline. */
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

function firstTextLine(html: string | null): string {
  if (!html) return '(empty)';
  const text = html
    .replace(/<br\s*\/?>(?=)/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return text.split('\n').map((l) => l.trim()).filter(Boolean)[0] ?? '(empty)';
}

async function main(): Promise<void> {
  const app = await prisma.application.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { jobPosting: true },
  });

  if (!app) {
    console.log('No applications found.');
    return;
  }

  const tp = app.tailoredProfile as Record<string, unknown> | null;
  const salutation = firstTextLine(app.coverLetterText);
  const cl = app.coverLetterText ?? '';

  console.log('=== LATEST APPLICATION ===');
  console.log('id:        ', app.id);
  console.log('createdAt: ', app.createdAt.toISOString());
  console.log('status:    ', app.status);
  console.log('job:       ', `${app.jobPosting?.title ?? '?'} @ ${app.jobPosting?.company ?? '?'}`);
  console.log('jobLang:   ', app.jobPosting?.language ?? '(auto)');
  console.log('');
  console.log('coverLetter present:', Boolean(app.coverLetterText));
  console.log('resume present:     ', Boolean(app.resumeText));
  console.log('tailoredProfile:    ', tp ? `${tp.target_role} @ ${tp.target_company}` : '(none)');
  console.log('atsKeywords present:', Boolean(app.atsKeywords));
  console.log('');
  console.log('--- SALUTATION (first line of cover letter) ---');
  console.log(salutation);
  console.log('');
  console.log('--- CHECKS ---');
  console.log('doubled honorific (BUG):', /\b(Frau\s+Frau|Herr\s+Herr|Ms\.?\s+Ms\.?|Mr\.?\s+Mr\.?)\b/i.test(cl));
  console.log('contains [Full Name] placeholder:', /\[Full Name\]|\[Ihr Name\]|\[Your Name\]/i.test(cl));
  console.log('cover letter length (chars):', cl.length);
  console.log('');
  console.log('--- COVER LETTER (plain text) ---');
  console.log(
    cl
      .replace(/<br\s*\/?>(?=)/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim(),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
