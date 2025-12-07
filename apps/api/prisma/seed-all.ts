/**
 * Combined seed script for production deployments
 * Runs both demo data seed and template seed
 * Used by: npx prisma db seed (configured in package.json)
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting combined database seed...');
  console.log('📍 Current directory:', __dirname);
  
  try {
    // 1. Seed demo data (user, profile, etc.)
    console.log('\n📦 Step 1: Seeding demo data...');
    execSync('ts-node --compiler-options {\\"module\\":\\"CommonJS\\"} prisma/seed.ts', {
      cwd: join(__dirname, '..'),
      stdio: 'inherit',
    });
    
    // 2. Seed multilingual templates
    console.log('\n📦 Step 2: Seeding multilingual templates...');
    execSync('ts-node --compiler-options {\\"module\\":\\"CommonJS\\"} prisma/seed-multilingual-templates.ts', {
      cwd: join(__dirname, '..'),
      stdio: 'inherit',
    });
    
    console.log('\n✅ Combined seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed script error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
