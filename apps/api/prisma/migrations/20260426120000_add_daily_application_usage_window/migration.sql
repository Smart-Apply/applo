-- AlterTable
-- Add rolling 24h application usage window for cost-protection caps.
-- These columns are independent of the existing monthly periodStart/periodEnd
-- and are reset by the application logic in SubscriptionService.canPerformAction.
ALTER TABLE "subscription_usage"
  ADD COLUMN "dailyApplicationsUsed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "dailyWindowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
