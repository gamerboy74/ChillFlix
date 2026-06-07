import { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabase";
import serverAuth from "@/lib/serverAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { currentUser } = await serverAuth(req, res);
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Profile ID is required" });
    }

    // Verify profile belongs to current user
    const { data: profile, error: fetchError } = await supabase
      .from("Profile")
      .select("*")
      .eq("id", id)
      .eq("userId", currentUser.id)
      .single();

    if (fetchError || !profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // ── PUT: Update profile details ──────────────────────────────────────────
    if (req.method === "PUT") {
      const { name, image } = req.body;
      const updates: any = {};

      if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
          return res.status(400).json({ error: "Profile name cannot be empty" });
        }
        updates.name = name.trim();
      }

      if (image !== undefined) {
        updates.image = image || "/images/default-blue.png";
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "Nothing to update" });
      }

      const { data: updatedProfile, error: updateError } = await supabase
        .from("Profile")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (updateError) throw updateError;

      return res.status(200).json(updatedProfile);
    }

    // ── DELETE: Delete the profile ───────────────────────────────────────────
    if (req.method === "DELETE") {
      // Do not allow deleting if they only have 1 profile left
      const { count, error: countError } = await supabase
        .from("Profile")
        .select("*", { count: "exact", head: true })
        .eq("userId", currentUser.id);

      if (countError) throw countError;

      if (count !== null && count <= 1) {
        return res.status(400).json({ error: "Cannot delete the only remaining profile" });
      }

      const { error: deleteError } = await supabase
        .from("Profile")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      return res.status(200).json({ message: "Profile deleted successfully" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("[profile_id]", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
