/*
  Warnings:

  - You are about to drop the column `description` on the `job_postings` table. All the data in the column will be lost.
  - You are about to drop the column `niceToHave` on the `job_postings` table. All the data in the column will be lost.
  - You are about to drop the column `requirements` on the `job_postings` table. All the data in the column will be lost.
  - You are about to drop the column `responsibilities` on the `job_postings` table. All the data in the column will be lost.
  - Added the required column `fullText` to the `job_postings` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add fullText column as nullable first
ALTER TABLE "job_postings" ADD COLUMN "fullText" TEXT;

-- Step 2: Migrate existing data - combine all sections into fullText
UPDATE "job_postings"
SET "fullText" = 
  COALESCE("description", '') || E'\n\n' ||
  CASE 
    WHEN array_length("requirements", 1) > 0 THEN 
      E'## Requirements\n' || array_to_string("requirements", E'\n- ', '- ')
    ELSE ''
  END || E'\n\n' ||
  CASE 
    WHEN array_length("responsibilities", 1) > 0 THEN 
      E'## Responsibilities\n' || array_to_string("responsibilities", E'\n- ', '- ')
    ELSE ''
  END || E'\n\n' ||
  CASE 
    WHEN array_length("niceToHave", 1) > 0 THEN 
      E'## Nice to Have\n' || array_to_string("niceToHave", E'\n- ', '- ')
    ELSE ''
  END
WHERE "fullText" IS NULL;

-- Step 3: Make fullText NOT NULL
ALTER TABLE "job_postings" ALTER COLUMN "fullText" SET NOT NULL;

-- Step 4: Drop old columns
ALTER TABLE "job_postings" 
  DROP COLUMN "description",
  DROP COLUMN "niceToHave",
  DROP COLUMN "requirements",
  DROP COLUMN "responsibilities";
