-- AlterTable
ALTER TABLE "validations" ADD COLUMN     "contentHash" TEXT;

-- CreateIndex
CREATE INDEX "validations_userId_contentHash_idx" ON "validations"("userId", "contentHash");
