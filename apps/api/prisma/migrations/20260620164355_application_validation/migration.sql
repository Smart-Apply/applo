-- AlterTable
ALTER TABLE "subscription_usage" ADD COLUMN     "validationsUsed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "validations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "resumeText" TEXT NOT NULL,
    "coverLetterText" TEXT,
    "jobContext" TEXT,
    "language" TEXT,
    "result" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "validations_userId_idx" ON "validations"("userId");

-- CreateIndex
CREATE INDEX "validations_userId_createdAt_idx" ON "validations"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "validations" ADD CONSTRAINT "validations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
