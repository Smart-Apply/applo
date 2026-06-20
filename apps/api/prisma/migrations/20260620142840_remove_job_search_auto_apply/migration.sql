/*
  Warnings:

  - You are about to drop the column `autoApplyApprovedUsed` on the `subscription_usage` table. All the data in the column will be lost.
  - You are about to drop the `auto_apply_configs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `auto_apply_suggestions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "auto_apply_configs" DROP CONSTRAINT "auto_apply_configs_userId_fkey";

-- DropForeignKey
ALTER TABLE "auto_apply_suggestions" DROP CONSTRAINT "auto_apply_suggestions_configId_fkey";

-- DropForeignKey
ALTER TABLE "auto_apply_suggestions" DROP CONSTRAINT "auto_apply_suggestions_jobPostingId_fkey";

-- DropForeignKey
ALTER TABLE "auto_apply_suggestions" DROP CONSTRAINT "auto_apply_suggestions_userId_fkey";

-- AlterTable
ALTER TABLE "subscription_usage" DROP COLUMN "autoApplyApprovedUsed";

-- DropTable
DROP TABLE "auto_apply_configs";

-- DropTable
DROP TABLE "auto_apply_suggestions";

-- DropEnum
DROP TYPE "AutoApplySuggestionStatus";
