-- CreateEnum for ApplicationTrackingStatus
CREATE TYPE "ApplicationTrackingStatus" AS ENUM ('APPLIED', 'INTERVIEW', 'ACCEPTED', 'REJECTED');

-- AlterEnum: Rename ApplicationStatus to ApplicationGenerationStatus
ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationGenerationStatus";

-- AlterTable: Add new columns to applications table
ALTER TABLE "applications" ADD COLUMN "title" TEXT;
ALTER TABLE "applications" ADD COLUMN "applicationStatus" "ApplicationTrackingStatus" NOT NULL DEFAULT 'APPLIED';
ALTER TABLE "applications" ADD COLUMN "statusUpdatedAt" TIMESTAMP(3);

-- CreateIndex for better query performance on applicationStatus
CREATE INDEX "applications_userId_applicationStatus_idx" ON "applications"("userId", "applicationStatus");
