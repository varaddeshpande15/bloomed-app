-- Run this in Supabase: SQL Editor → New query → Paste → Run.
-- Matches Drizzle schema in src/db/schema.ts (Postgres, quoted identifiers).

-- Enum for roadmap visibility
DO $$ BEGIN
  CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'PUBLIC');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Users (Clerk user id = primary key)
CREATE TABLE IF NOT EXISTS "User" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "imageUrl" text,
  "credits" integer NOT NULL DEFAULT 5
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_id_key" ON "User" ("id");

-- Roadmaps
CREATE TABLE IF NOT EXISTS "roadmap" (
  "id" text PRIMARY KEY,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "userId" text NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "views" integer NOT NULL DEFAULT 0,
  "searchCount" integer NOT NULL DEFAULT 0,
  "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC'
);

CREATE UNIQUE INDEX IF NOT EXISTS "roadmap_title_key" ON "roadmap" ("title");
CREATE INDEX IF NOT EXISTS "Roadmap_title_idx" ON "roadmap" ("title");

-- Saved roadmaps (bookmark-style rows)
CREATE TABLE IF NOT EXISTS "SavedRoadmap" (
  "id" text PRIMARY KEY,
  "title" text NOT NULL,
  "roadmapId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE
);

-- Drawer / node detail cache per roadmap
CREATE TABLE IF NOT EXISTS "DrawerDetail" (
  "id" text PRIMARY KEY,
  "details" text NOT NULL,
  "youtubeVideoIds" text[] NOT NULL,
  "books" text NOT NULL,
  "nodeName" text NOT NULL,
  "roadmapId" text NOT NULL REFERENCES "roadmap" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DrawerDetail_nodeName_key" ON "DrawerDetail" ("nodeName");

-- Psychological profiling (FastAPI session mirror + final JSON report)
CREATE TABLE IF NOT EXISTS "PsychProfile" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "fastapiSessionId" text NOT NULL,
  "historyJson" text NOT NULL DEFAULT '[]',
  "reportJson" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "PsychProfile_fastapiSessionId_key" ON "PsychProfile" ("fastapiSessionId");
CREATE INDEX IF NOT EXISTS "PsychProfile_userId_idx" ON "PsychProfile" ("userId");

-- Adaptive tests (BloomEd UI → FastAPI session + report snapshot)
CREATE TABLE IF NOT EXISTS "BloomTestSession" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "templateKey" text,
  "examType" text NOT NULL DEFAULT 'STANDARD',
  "markingSchemeJson" text NOT NULL,
  "testPlanJson" text,
  "syllabusTopicsJson" text,
  "traitProfileJson" text,
  "targetQuestionCount" integer NOT NULL DEFAULT 5,
  "status" text NOT NULL DEFAULT 'draft',
  "reportJson" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "BloomTestSession_userId_idx" ON "BloomTestSession" ("userId");
CREATE INDEX IF NOT EXISTS "BloomTestSession_status_idx" ON "BloomTestSession" ("status");

CREATE TABLE IF NOT EXISTS "BloomTestAttempt" (
  "id" text PRIMARY KEY,
  "sessionId" text NOT NULL REFERENCES "BloomTestSession" ("id") ON DELETE CASCADE,
  "questionId" text NOT NULL,
  "topic" text,
  "userAnswer" text NOT NULL,
  "correctAnswer" text,
  "isCorrect" boolean NOT NULL,
  "timeTakenSeconds" double precision NOT NULL,
  "explanation" text,
  "orderIndex" integer NOT NULL,
  "insightJson" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "BloomTestAttempt_sessionId_idx" ON "BloomTestAttempt" ("sessionId");

-- Multiplayer quiz / game parties
CREATE TABLE IF NOT EXISTS "QuizParty" (
  "id" text PRIMARY KEY,
  "code" text NOT NULL UNIQUE,
  "hostUserId" text NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'lobby',
  "examType" text NOT NULL DEFAULT 'STANDARD',
  "engineMode" text NOT NULL DEFAULT 'standard',
  "markingSchemeJson" text,
  "syllabusTopicsJson" text,
  "testPlanJson" text,
  "questionsJson" text,
  "currentQuestionIndex" integer NOT NULL DEFAULT 0,
  "totalQuestions" integer NOT NULL DEFAULT 5,
  "secondsPerQuestion" integer NOT NULL DEFAULT 45,
  "countdownEndsAt" timestamp,
  "questionEndsAt" timestamp,
  "betweenQuestionEndsAt" timestamp,
  "startedAt" timestamp,
  "finishedAt" timestamp,
  "title" text NOT NULL DEFAULT 'Multiplayer game',
  "reportJson" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "QuizParty_hostUserId_idx" ON "QuizParty" ("hostUserId");
CREATE INDEX IF NOT EXISTS "QuizParty_status_idx" ON "QuizParty" ("status");

CREATE TABLE IF NOT EXISTS "QuizPartyMember" (
  "id" text PRIMARY KEY,
  "partyId" text NOT NULL REFERENCES "QuizParty" ("id") ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "displayName" text NOT NULL,
  "imageUrl" text,
  "isReady" boolean NOT NULL DEFAULT false,
  "isHost" boolean NOT NULL DEFAULT false,
  "joinedAt" timestamp NOT NULL DEFAULT now(),
  UNIQUE ("partyId", "userId")
);

CREATE INDEX IF NOT EXISTS "QuizPartyMember_partyId_idx" ON "QuizPartyMember" ("partyId");
CREATE INDEX IF NOT EXISTS "QuizPartyMember_userId_idx" ON "QuizPartyMember" ("userId");

CREATE TABLE IF NOT EXISTS "QuizPartyAnswer" (
  "id" text PRIMARY KEY,
  "partyId" text NOT NULL REFERENCES "QuizParty" ("id") ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "questionIndex" integer NOT NULL,
  "userAnswer" text NOT NULL,
  "isCorrect" boolean NOT NULL,
  "timeTakenSeconds" double precision NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  UNIQUE ("partyId", "userId", "questionIndex")
);

CREATE INDEX IF NOT EXISTS "QuizPartyAnswer_partyId_idx" ON "QuizPartyAnswer" ("partyId");

-- If `QuizParty` already existed from an older deploy, new columns are NOT added automatically.
-- Run: supabase/migrate_quiz_party_columns.sql (same ALTERs as below).
-- ALTER TABLE "QuizParty" ADD COLUMN IF NOT EXISTS "betweenQuestionEndsAt" timestamp;
-- ALTER TABLE "QuizParty" ADD COLUMN IF NOT EXISTS "title" text NOT NULL DEFAULT 'Multiplayer game';
-- ALTER TABLE "QuizParty" ADD COLUMN IF NOT EXISTS "reportJson" text;
-- ALTER TABLE "QuizPartyMember" ADD COLUMN IF NOT EXISTS "imageUrl" text;

-- Optional: let the Postgres role used by DATABASE_URL insert/update.
-- If you use RLS later, add policies; for server-side pooler connection this is usually enough.
