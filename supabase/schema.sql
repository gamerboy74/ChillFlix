-- ChillFlix Database Schema for Supabase
-- Run this in: Supabase Dashboard > SQL Editor > New Query

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── User ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "User" (
  "id"             TEXT        NOT NULL DEFAULT gen_random_uuid(),
  "name"           TEXT        NOT NULL DEFAULT '',
  "image"          TEXT,
  "email"          TEXT        UNIQUE,
  "emailVerified"  TIMESTAMPTZ,
  "hashedPassword" TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "favouriteIds"   TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isAdmin"        BOOLEAN     NOT NULL DEFAULT FALSE,
  PRIMARY KEY ("id")
);

-- ─── Account (OAuth providers) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Account" (
  "id"                TEXT    NOT NULL DEFAULT gen_random_uuid(),
  "userId"            TEXT    NOT NULL,
  "type"              TEXT    NOT NULL,
  "provider"          TEXT    NOT NULL,
  "providerAccountId" TEXT    NOT NULL,
  "refresh_token"     TEXT,
  "access_token"      TEXT,
  "expires_at"        INTEGER,
  "token_type"        TEXT,
  "scope"             TEXT,
  "id_token"          TEXT,
  "session_state"     TEXT,
  PRIMARY KEY ("id"),
  UNIQUE ("provider", "providerAccountId"),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- ─── Session ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Session" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid(),
  "sessionToken" TEXT        NOT NULL UNIQUE,
  "userId"       TEXT        NOT NULL,
  "expires"      TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- ─── VerificationToken ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "VerificationToken" (
  "id"         TEXT        NOT NULL DEFAULT gen_random_uuid(),
  "identifier" TEXT        NOT NULL,
  "token"      TEXT        NOT NULL UNIQUE,
  "expires"    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("identifier", "token")
);

-- ─── Movie ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Movie" (
  "id"              TEXT    NOT NULL DEFAULT gen_random_uuid(),
  "title"           TEXT    NOT NULL,
  "description"     TEXT    NOT NULL,
  "videoUrl"        TEXT    NOT NULL,
  "thumbnailUrl"    TEXT    NOT NULL,
  "genre"           TEXT    NOT NULL,
  "duration"        TEXT    NOT NULL,
  "onlyOnChillFlix" BOOLEAN NOT NULL DEFAULT FALSE,
  "type"            TEXT    NOT NULL DEFAULT 'movie',
  "seasonsData"     JSONB,
  PRIMARY KEY ("id")
);

-- ─── Episode ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Episode" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid(),
  "movieId"       TEXT        NOT NULL,
  "title"         TEXT,
  "season"        INTEGER     NOT NULL DEFAULT 1,
  "episode"       INTEGER     NOT NULL,
  "videoUrl"      TEXT        NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  UNIQUE ("movieId", "season", "episode"),
  FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE
);

-- ─── Auto-update updatedAt ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_updated_at ON "User";
CREATE TRIGGER user_updated_at
  BEFORE UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Disable RLS (for server-side access with anon key) ───────────────────────
ALTER TABLE "User"              DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Account"           DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Session"           DISABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Movie"             DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Episode"           DISABLE ROW LEVEL SECURITY;
