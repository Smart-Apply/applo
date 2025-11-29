import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkExperienceDescriptions() {
  console.log('🔍 Checking experience descriptions in database...\n');

  const users = await prisma.user.findMany({
    include: {
      profile: {
        include: {
          experiences: true,
        },
      },
    },
  });

  for (const user of users) {
    console.log(`\n📧 User: ${user.email}`);
    
    if (!user.profile) {
      console.log('   ❌ No profile found');
      continue;
    }

    if (user.profile.experiences.length === 0) {
      console.log('   ❌ No experiences found');
      continue;
    }

    console.log(`   ✅ ${user.profile.experiences.length} experience(s) found:\n`);

    for (const exp of user.profile.experiences) {
      console.log(`   📌 ${exp.title} @ ${exp.company}`);
      console.log(`      Start: ${exp.startDate.toISOString().split('T')[0]}`);
      console.log(`      End: ${exp.endDate ? exp.endDate.toISOString().split('T')[0] : 'Current'}`);
      
      if (exp.description) {
        console.log(`      ✅ Description: "${exp.description.substring(0, 100)}${exp.description.length > 100 ? '...' : ''}"`);
      } else {
        console.log(`      ❌ Description: NULL/Empty`);
      }

      if (exp.achievements && exp.achievements.length > 0) {
        console.log(`      ✅ Achievements: ${exp.achievements.length} items`);
      } else {
        console.log(`      ❌ Achievements: Empty`);
      }
      console.log('');
    }
  }

  await prisma.$disconnect();
}

checkExperienceDescriptions().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
