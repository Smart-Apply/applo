-- CreateEnum
CREATE TYPE "LlmProviderKind" AS ENUM ('AZURE_OPENAI', 'AZURE_AI_FOUNDRY', 'MISTRAL', 'MOCK');

-- CreateEnum
CREATE TYPE "LlmRoutingLane" AS ENUM ('MAIN', 'FAST', 'MID');

-- CreateEnum
CREATE TYPE "LlmCircuitState" AS ENUM ('CLOSED', 'OPEN', 'HALF_OPEN');

-- CreateEnum
CREATE TYPE "LlmFeature" AS ENUM ('APPLICATION_COVER_LETTER', 'APPLICATION_COVER_LETTER_EDIT', 'APPLICATION_COVER_LETTER_KEYWORD_WEAVE', 'APPLICATION_COVER_LETTER_STYLE', 'APPLICATION_COVER_LETTER_LENGTH', 'APPLICATION_COVER_LETTER_GROUNDING', 'APPLICATION_RESUME', 'APPLICATION_RESUME_EDIT', 'APPLICATION_RESUME_STYLE', 'APPLICATION_RESUME_GROUNDING', 'APPLICATION_PROFILE_TAILOR', 'APPLICATION_JOB_FACTS', 'APPLICATION_ATS_KEYWORDS', 'APPLICATION_TRANSLATION_RESUME', 'APPLICATION_TRANSLATION_COVER_LETTER', 'APPLICATION_SUMMARY_TRANSLATION', 'KEYWORDS_EXTRACTION', 'KEYWORDS_PROFILE', 'INTERVIEW_QUESTIONS', 'INTERVIEW_ANALYSIS', 'INTERVIEW_FEEDBACK', 'RESUME_PARSER', 'VALIDATION_CHECK', 'MAILBOX_CLASSIFICATION', 'OTHER');

-- CreateTable
CREATE TABLE "llm_usage_events" (
    "id" TEXT NOT NULL,
    "actorHash" TEXT,
    "feature" "LlmFeature" NOT NULL,
    "provider" "LlmProviderKind" NOT NULL,
    "model" TEXT NOT NULL,
    "lane" "LlmRoutingLane" NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "cachedTokens" INTEGER,
    "tier" "SubscriptionTier",
    "language" TEXT,
    "latencyMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "circuitState" "LlmCircuitState" NOT NULL,
    "errorKind" TEXT,
    "estimatedCostUsd" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "llm_usage_events_feature_createdAt_idx" ON "llm_usage_events"("feature", "createdAt");

-- CreateIndex
CREATE INDEX "llm_usage_events_actorHash_createdAt_idx" ON "llm_usage_events"("actorHash", "createdAt");
