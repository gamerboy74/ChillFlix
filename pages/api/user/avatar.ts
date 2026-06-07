/**
 * /api/user/avatar
 *
 * Two-step browser-direct upload flow (avoids server-side Storage fetch):
 *
 * GET  → Returns a signed upload URL + the final public URL.
 *        The browser uploads the file directly to Supabase Storage.
 *
 * PUT  → After the browser upload succeeds, call this to save the
 *        public URL into the User.image column in the database.
 */
import { NextApiRequest, NextApiResponse } from "next";
import serverAuth from "@/lib/serverAuth";
import { createClient } from "@supabase/supabase-js";

// Admin client — only used for DB write and generating the signed URL.
// The actual file bytes never pass through this server.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { currentUser } = await serverAuth(req, res);

    // ── GET: issue a signed upload URL ──────────────────────────────────────
    if (req.method === "GET") {
      const { ext = "jpg" } = req.query as { ext?: string };

      // Sanitise extension — only allow image types
      const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext.toLowerCase())
        ? ext.toLowerCase()
        : "jpg";

      const storageKey = `${currentUser.id}/${Date.now()}.${safeExt}`;

      // createSignedUploadUrl works with the service-role key and does NOT
      // make an outbound fetch to Storage — it signs locally.
      const { data, error } = await supabaseAdmin.storage
        .from("avatars")
        .createSignedUploadUrl(storageKey, { upsert: true });

      if (error || !data) {
        console.error("Signed URL error:", error);
        return res.status(500).json({ error: "Could not generate upload URL" });
      }

      // Build the final public URL (deterministic — no fetch required)
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${storageKey}`;

      return res.status(200).json({
        signedUrl: data.signedUrl,
        token: data.token,
        path: storageKey,
        publicUrl,
      });
    }

    // ── PUT: save the public URL to the DB after browser upload completes ──
    if (req.method === "PUT") {
      const { imageUrl } = req.body;
      if (!imageUrl || typeof imageUrl !== "string") {
        return res.status(400).json({ error: "imageUrl is required" });
      }

      // Basic sanity check — must be our Supabase project URL
      const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
      if (!imageUrl.includes(supabaseHost)) {
        return res.status(400).json({ error: "Invalid image URL" });
      }

      const profileId = req.cookies.chillflix_profile_id;
      if (profileId) {
        await supabaseAdmin
          .from("Profile")
          .update({ image: imageUrl })
          .eq("id", profileId)
          .eq("userId", currentUser.id);
      }

      const { error } = await supabaseAdmin
        .from("User")
        .update({ image: imageUrl })
        .eq("id", currentUser.id);

      if (error) {
        console.error("DB update error:", error);
        return res.status(500).json({ error: "Failed to save avatar URL" });
      }

      return res.status(200).json({ message: "Avatar updated", url: imageUrl });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("[avatar]", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
