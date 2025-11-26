-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "keywordsData" JSONB,
ADD COLUMN     "matchDetails" JSONB,
ADD COLUMN     "matchScore" DOUBLE PRECISION;
