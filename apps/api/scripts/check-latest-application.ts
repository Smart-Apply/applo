import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLatestApplication() {
  console.log('🔍 Checking latest application resume data...\n');

  const application = await prisma.application.findFirst({
    where: {
      user: {
        email: 'arianit.sheholli@gmail.com',
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      jobPosting: true,
    },
  });

  if (!application) {
    console.log('❌ No application found for this user');
    await prisma.$disconnect();
    return;
  }

  console.log(`📄 Application: ${application.title}`);
  console.log(`📅 Created: ${application.createdAt.toISOString()}`);
  console.log(`🏢 Job: ${application.jobPosting?.title || 'N/A'}\n`);

  if (!application.resumeText) {
    console.log('❌ No resume data found in application');
    await prisma.$disconnect();
    return;
  }

  try {
    const resumeData = JSON.parse(application.resumeText);

    console.log('📋 Resume Data:\n');
    console.log(`👤 Candidate: ${resumeData.candidateName}`);
    console.log(`📧 Email: ${resumeData.email}`);
    console.log(`🌍 Language: ${resumeData.language || 'Not set'}\n`);

    if (resumeData.summary) {
      console.log(
        `📝 Summary: "${resumeData.summary.substring(0, 100)}${resumeData.summary.length > 100 ? '...' : ''}"\n`,
      );
    }

    if (resumeData.experiences && resumeData.experiences.length > 0) {
      console.log(`💼 Experiences (${resumeData.experiences.length}):\n`);

      for (let i = 0; i < resumeData.experiences.length; i++) {
        const exp = resumeData.experiences[i];
        console.log(`   ${i + 1}. ${exp.title} @ ${exp.company}`);
        console.log(`      📅 ${exp.dateRange}`);

        if (exp.description) {
          console.log(
            `      ✅ Description: "${exp.description.substring(0, 100)}${exp.description.length > 100 ? '...' : ''}"`,
          );
        } else {
          console.log(`      ❌ Description: MISSING!`);
        }

        if (exp.achievements && exp.achievements.length > 0) {
          console.log(`      ✅ Achievements: ${exp.achievements.length} items`);
          exp.achievements.forEach((ach: string) => {
            console.log(`         - ${ach.substring(0, 80)}${ach.length > 80 ? '...' : ''}`);
          });
        } else {
          console.log(`      ❌ Achievements: None`);
        }
        console.log('');
      }
    } else {
      console.log('❌ No experiences found in resume data\n');
    }

    if (resumeData.skillCategories && resumeData.skillCategories.length > 0) {
      console.log(`🎯 Skills (${resumeData.skillCategories.length} categories):`);
      resumeData.skillCategories.forEach((cat: any) => {
        console.log(`   - ${cat.type}: ${cat.skills.join(', ')}`);
      });
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error parsing resume data:', error);
  }

  await prisma.$disconnect();
}

checkLatestApplication().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
