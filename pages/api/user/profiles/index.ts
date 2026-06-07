import { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabase";
import serverAuth from "@/lib/serverAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { currentUser } = await serverAuth(req, res);

    // ── GET: Fetch all profiles for the current user ────────────────────────
    if (req.method === "GET") {
      const { data: profiles, error } = await supabase
        .from("Profile")
        .select("*")
        .eq("userId", currentUser.id)
        .order("createdAt", { ascending: true });

      if (error) {
        throw error;
      }

      // If no profiles exist, automatically create a default one for backward compatibility
      if (!profiles || profiles.length === 0) {
        const defaultProfile = {
          userId: currentUser.id,
          name: currentUser.name || "Default",
          image: currentUser.image || "/images/default-blue.png",
          favouriteIds: currentUser.favouriteIds || [],
        };

        const { data: newProfile, error: insertError } = await supabase
          .from("Profile")
          .insert(defaultProfile)
          .select("*")
          .single();

        if (insertError) {
          throw insertError;
        }

        return res.status(200).json([newProfile]);
      }

      return res.status(200).json(profiles);
    }

    // ── POST: Create a new profile ──────────────────────────────────────────
    if (req.method === "POST") {
      const { name, image } = req.body;

      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Profile name is required" });
      }

      // Check current profile count (limit to 5)
      const { count, error: countError } = await supabase
        .from("Profile")
        .select("*", { count: "exact", head: true })
        .eq("userId", currentUser.id);

      if (countError) throw countError;

      if (count !== null && count >= 5) {
        return res.status(400).json({ error: "Maximum of 5 profiles allowed" });
      }

      const newProfileData = {
        userId: currentUser.id,
        name: name.trim(),
        image: image || "/images/default-blue.png",
        favouriteIds: [],
      };

      const { data: newProfile, error: insertError } = await supabase
        .from("Profile")
        .insert(newProfileData)
        .select("*")
        .single();

      if (insertError) throw insertError;

      return res.status(200).json(newProfile);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("[profiles]", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
