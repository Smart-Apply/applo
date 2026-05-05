-- CreateEnum
CREATE TYPE "AutoApplySuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'SKIPPED', 'BLOCKED', 'EXPIRED');

-- AlterTable
ALTER TABLE "subscription_usage" ADD COLUMN     "autoApplyApprovedUsed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "auto_apply_configs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "searchFilters" JSONB NOT NULL,
    "maxSuggestionsPerDay" INTEGER NOT NULL DEFAULT 5,
    "minAtsScore" INTEGER,
    "requiredKeywords" TEXT[],
    "blockedCompanies" TEXT[],
    "cronSchedule" TEXT NOT NULL DEFAULT '0 9 * * *',
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "digestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastDigestSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_apply_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_apply_suggestions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "externalJobId" TEXT NOT NULL,
    "jobPostingId" TEXT,
    "jobTitle" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "jobUrl" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3),
    "matchScore" DOUBLE PRECISION,
    "matchReasons" JSONB,
    "status" "AutoApplySuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "applicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_apply_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auto_apply_configs_userId_key" ON "auto_apply_configs"("userId");

-- CreateIndex
CREATE INDEX "auto_apply_configs_isActive_nextRunAt_idx" ON "auto_apply_configs"("isActive", "nextRunAt");

-- CreateIndex
CREATE INDEX "auto_apply_suggestions_userId_status_createdAt_idx" ON "auto_apply_suggestions"("userId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "auto_apply_suggestions_configId_idx" ON "auto_apply_suggestions"("configId");

-- CreateIndex
CREATE UNIQUE INDEX "auto_apply_suggestions_userId_externalJobId_key" ON "auto_apply_suggestions"("userId", "externalJobId");

-- AddForeignKey
ALTER TABLE "auto_apply_configs" ADD CONSTRAINT "auto_apply_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_apply_suggestions" ADD CONSTRAINT "auto_apply_suggestions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_apply_suggestions" ADD CONSTRAINT "auto_apply_suggestions_configId_fkey" FOREIGN KEY ("configId") REFERENCES "auto_apply_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_apply_suggestions" ADD CONSTRAINT "auto_apply_suggestions_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "job_postings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
