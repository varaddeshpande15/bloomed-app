-- Run once in Supabase SQL Editor (or psql against DATABASE_URL) if multiplayer quiz fails with:
--   column "betweenQuestionEndsAt" of relation "QuizParty" does not exist
-- `CREATE TABLE IF NOT EXISTS` does not add columns to an existing table.

ALTER TABLE "QuizParty" ADD COLUMN IF NOT EXISTS "betweenQuestionEndsAt" timestamp;
ALTER TABLE "QuizParty" ADD COLUMN IF NOT EXISTS "title" text NOT NULL DEFAULT 'Multiplayer game';
ALTER TABLE "QuizParty" ADD COLUMN IF NOT EXISTS "reportJson" text;

ALTER TABLE "QuizPartyMember" ADD COLUMN IF NOT EXISTS "imageUrl" text;
