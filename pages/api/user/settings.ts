import { NextApiRequest, NextApiResponse } from "next";
import serverAuth from "@/lib/serverAuth";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { currentUser } = await serverAuth(req, res);

    // ── GET: fetch current user + preferences ──────────────────────────────
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("User")
        .select("id, name, email, image, hashedPassword, preferences")
        .eq("id", currentUser.id)
        .single();

      if (error) throw new Error(error.message);
      return res.status(200).json(data);
    }

    // ── PUT: update name, password, or preferences ─────────────────────────
    if (req.method === "PUT") {
      const { name, password, preferences, clearFavourites } = req.body;
      const updates: any = {};

      // Update name
      if (name !== undefined) {
        if (!name.trim()) return res.status(400).json({ error: "Name cannot be empty" });
        const profileId = req.cookies.chillflix_profile_id;
        if (profileId) {
          await supabaseAdmin
            .from("Profile")
            .update({ name: name.trim() })
            .eq("id", profileId)
            .eq("userId", currentUser.id);
        }
        updates.name = name.trim();
      }

      // Update password
      if (password !== undefined) {
        if (password.length < 8) {
          return res.status(400).json({ error: "Password must be at least 8 characters" });
        }
        updates.hashedPassword = await bcrypt.hash(password, 12);
      }

      // Update preferences (merge with existing)
      if (preferences !== undefined) {
        // Fetch current preferences first
        const { data: existing } = await supabaseAdmin
          .from("User")
          .select("preferences")
          .eq("id", currentUser.id)
          .single();

        const current = existing?.preferences || {};
        updates.preferences = { ...current, ...preferences };
      }

      // Clear favourites / viewing history
      if (clearFavourites) {
        const profileId = req.cookies.chillflix_profile_id;
        if (profileId) {
          await supabaseAdmin
            .from("Profile")
            .update({ favouriteIds: [] })
            .eq("id", profileId)
            .eq("userId", currentUser.id);
        }
        updates.favouriteIds = [];
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "Nothing to update" });
      }

      const { error } = await supabaseAdmin
        .from("User")
        .update(updates)
        .eq("id", currentUser.id);

      if (error) throw new Error(error.message);
      return res.status(200).json({ message: "Settings updated successfully" });
    }

    // ── DELETE: permanently delete the account ─────────────────────────────
    if (req.method === "DELETE") {
      // Delete storage avatar if exists
      const { data: userData } = await supabaseAdmin
        .from("User")
        .select("image")
        .eq("id", currentUser.id)
        .single();

      if (userData?.image?.includes("supabase")) {
        // Extract the storage path from the public URL
        const url = new URL(userData.image);
        const path = url.pathname.split("/storage/v1/object/public/avatars/")[1];
        if (path) {
          await supabaseAdmin.storage.from("avatars").remove([path]);
        }
      }

      // Delete user (cascades to Account, Session, etc.)
      const { error } = await supabaseAdmin
        .from("User")
        .delete()
        .eq("id", currentUser.id);

      if (error) throw new Error(error.message);
      return res.status(200).json({ message: "Account deleted" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("[settings]", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
