import { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabase";
import serverAuth from "@/lib/serverAuth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const { currentUser } = await serverAuth(req, res);
    const profileId = req.cookies.chillflix_profile_id;
    let favouriteIds = currentUser.favouriteIds || [];

    if (profileId) {
      const { data: profile } = await supabase
        .from("Profile")
        .select("favouriteIds")
        .eq("id", profileId)
        .eq("userId", currentUser.id)
        .single();
      if (profile) {
        favouriteIds = profile.favouriteIds || [];
      }
    }

    if (!favouriteIds.length) {
      return res.status(200).json([]);
    }

    const { data: favouriteMovies, error } = await supabase
      .from("Movie")
      .select("id, title, description, thumbnailUrl, genre, duration, type, onlyOnChillFlix, seasonsData")
      .in("id", favouriteIds);

    if (error) throw new Error(error.message);
    return res.status(200).json(favouriteMovies ?? []);
  } catch (error) {
    console.error("[favourites]", error);
    return res.status(400).end();
  }
}