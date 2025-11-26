-- AlterEnum
ALTER TYPE "ApplicationTrackingStatus" ADD VALUE 'CREATED';

-- AlterTable
ALTER TABLE "applications" ALTER COLUMN "applicationStatus" SET DEFAULT 'CREATED';
