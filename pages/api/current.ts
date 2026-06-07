import { NextApiRequest, NextApiResponse } from "next";
import serverAuth from "@/lib/serverAuth";
import { createClient } from "@supabase/supabase-js";

// Use admin client to always get fresh image from DB (image is NOT in the JWT)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const { currentUser } = await serverAuth(req, res);
    const profileId = req.cookies.chillflix_profile_id;

    let activeProfile: any = null;

    if (profileId) {
      const { data } = await supabaseAdmin
        .from("Profile")
        .select("*")
        .eq("id", profileId)
        .eq("userId", currentUser.id)
        .single();
      if (data) activeProfile = data;
    }

    // Fallback: fetch the first profile if no cookie is set or profile not found
    if (!activeProfile) {
      const { data: profiles } = await supabaseAdmin
        .from("Profile")
        .select("*")
        .eq("userId", currentUser.id)
        .order("createdAt", { ascending: true });

      if (profiles && profiles.length > 0) {
        activeProfile = profiles[0];
      } else {
        // Create default profile if user has none
        const defaultProfile = {
          userId: currentUser.id,
          name: currentUser.name || "Default",
          image: currentUser.image || "/images/default-blue.png",
          favouriteIds: currentUser.favouriteIds || [],
        };

        const { data: newProfile } = await supabaseAdmin
          .from("Profile")
          .insert(defaultProfile)
          .select("*")
          .single();
        if (newProfile) activeProfile = newProfile;
      }
    }

    return res.status(200).json({
      ...currentUser,
      // Override with active profile details
      name: activeProfile?.name ?? currentUser.name,
      image: activeProfile?.image ?? currentUser.image ?? null,
      favouriteIds: activeProfile?.favouriteIds ?? [],
      activeProfileId: activeProfile?.id ?? null,
    });
  } catch (error) {
    console.error("[current]", error);
    return res.status(400).end();
  }
}