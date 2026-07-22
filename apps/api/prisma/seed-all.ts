/**
 * Combined seed script for production deployments
 * Runs both demo data seed and template seed
 * Used by: npx prisma db seed (configured in package.json)
 * 
 * This TypeScript file is compiled during Docker build to prisma/dist/seed-all.js
 */

import { PrismaClient } from '../src/generated/prisma/client';
import { execSync } from 'child_process';
import { join } from 'path';

// Prisma 7: Empty object for CLI-based seeds
const prisma = new PrismaClient({} as any);

async function main() {
  console.log('🌱 Starting combined database seed...');
  console.log('📍 Current directory:', __dirname);
  
  try {
    // Child seeds are compiled next to this file (prisma/dist/prisma/*.js in
    // the Docker image) — resolve them sibling-relative so the layout of the
    // tsc output can't break the paths.
    // 1. Seed demo data (user, profile, etc.)
    console.log('\n📦 Step 1: Seeding demo data...');
    execSync(`node "${join(__dirname, 'seed.js')}"`, {
      stdio: 'inherit',
    });
    
    // 2. Seed the react-pdf (TSX) template catalog + deactivate legacy rows
    console.log('\n📦 Step 2: Seeding react-pdf templates...');
    execSync(`node "${join(__dirname, 'seed-react-pdf-templates.js')}"`, {
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
