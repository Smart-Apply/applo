-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validationResult" JSONB,
ADD COLUMN     "validationScore" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "subscription_usage" ADD COLUMN     "validationsUsed" INTEGER NOT NULL DEFAULT 0;
