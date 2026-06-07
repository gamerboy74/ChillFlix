-- ─── ChillFlix: Profiles Table ────────────────────────────────────────────────
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Profile" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid(),
  "userId"       TEXT        NOT NULL,
  "name"         TEXT        NOT NULL,
  "image"        TEXT,
  "favouriteIds" TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Index for fast lookups of user profiles
CREATE INDEX IF NOT EXISTS "profile_userId_idx" ON "Profile"("userId");

-- Auto-update trigger for updatedAt
DROP TRIGGER IF EXISTS profile_updated_at ON "Profile";
CREATE TRIGGER profile_updated_at
  BEFORE UPDATE ON "Profile"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Disable Row Level Security (consistent with User and Movie tables)
ALTER TABLE "Profile" DISABLE ROW LEVEL SECURITY;
