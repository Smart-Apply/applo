-- CreateEnum
CREATE TYPE "InterviewMode" AS ENUM ('TEXT', 'VOICE');

-- AlterTable
ALTER TABLE "interview_sessions" ADD COLUMN     "mode" "InterviewMode" NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "realtimeModel" TEXT,
ADD COLUMN     "transcript" JSONB,
ADD COLUMN     "voice" TEXT,
ADD COLUMN     "voiceDurationSeconds" INTEGER;
