-- ChillFlix: Add preferences column to User
-- Run this in: Supabase Dashboard > SQL Editor > New Query

-- Add a preferences JSONB column to store per-user settings
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "preferences" JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Default structure comment (stored as JSON):
-- {
--   "playback": {
--     "autoplay": true,
--     "autoPreview": true,
--     "quality": "auto",
--     "audioLang": "en",
--     "subtitleLang": "off"
--   },
--   "notifications": {
--     "emailUpdates": true,
--     "newReleases": true,
--     "recommendations": false,
--     "accountAlerts": true
--   },
--   "privacy": {
--     "viewingHistory": true,
--     "dataPersonalization": true,
--     "marketingEmails": false
--   }
-- }
