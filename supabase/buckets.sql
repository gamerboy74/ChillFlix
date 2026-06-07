-- ─── ChillFlix: Supabase Storage Buckets ─────────────────────────────────────
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. avatars — public bucket for user profile pictures
--    Max file size: 2 MB | Allowed: jpg, jpeg, png, webp, gif
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,   -- 2 MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. thumbnails — public bucket for movie/show cover images
--    Max file size: 5 MB | Allowed: jpg, jpeg, png, webp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true,
  5242880,   -- 5 MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. videos — private bucket for movie/show video files (served via signed URLs)
--    Max file size: 2 GB | Allowed: mp4, webm, ogg
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  false,
  2147483648,  -- 2 GB in bytes
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ─── Storage Policies ────────────────────────────────────────────────────────
-- NOTE: RLS is disabled on your tables (see schema.sql), but Storage
-- always enforces its own policies. We use the service role key server-side
-- (bypasses all policies), so client-side policies are just a safety net.

-- ── avatars bucket ──

-- Anyone can read/view avatars (public profile pictures)
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Only authenticated users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update/replace their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ── thumbnails bucket ──

-- Anyone can read thumbnails (public movie covers)
CREATE POLICY "Public read thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails');

-- Only admins can upload thumbnails (handled server-side with service role key)
-- No client-side upload policy needed — admin panel uses service key


-- ── videos bucket ──

-- Videos are private — no public SELECT policy
-- Access is granted via signed URLs generated server-side with the service role key
-- No client-side policies needed
