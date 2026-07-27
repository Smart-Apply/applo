-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "generationMessage" TEXT,
ADD COLUMN     "generationProgress" INTEGER NOT NULL DEFAULT 0;
