import { NextApiRequest, NextApiResponse } from "next";
import { without } from "lodash";
import supabase from "@/lib/supabase";
import serverAuth from "@/lib/serverAuth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "POST") {
      const { currentUser } = await serverAuth(req, res);
      const { movieId } = req.body;

      if (!movieId || typeof movieId !== "string") {
        return res.status(400).json({ error: "movieId is required" });
      }

      const { data: existingMovie } = await supabase
        .from("Movie")
        .select("id")
        .eq("id", movieId)
        .single();

      if (!existingMovie) return res.status(404).json({ error: "Movie not found" });

      const newFavouriteIds = [...(currentUser.favouriteIds || []), movieId];

      const { data: user, error } = await supabase
        .from("User")
        .update({ favouriteIds: newFavouriteIds })
        .eq("email", currentUser.email)
        .select("id, email, name, image, favouriteIds")
        .single();

      if (error) throw error;
      return res.status(200).json(user);
    }

    if (req.method === "DELETE") {
      const { currentUser } = await serverAuth(req, res);
      const { movieId } = req.body;

      if (!movieId || typeof movieId !== "string") {
        return res.status(400).json({ error: "movieId is required" });
      }

      const { data: existingMovie } = await supabase
        .from("Movie")
        .select("id")
        .eq("id", movieId)
        .single();

      if (!existingMovie) return res.status(404).json({ error: "Movie not found" });

      const updatedFavouriteIds = without(currentUser.favouriteIds || [], movieId);

      const { data: user, error } = await supabase
        .from("User")
        .update({ favouriteIds: updatedFavouriteIds })
        .eq("email", currentUser.email)
        .select("id, email, name, image, favouriteIds")
        .single();

      if (error) throw error;
      return res.status(200).json(user);
    }

    return res.status(405).end();
  } catch (error) {
    console.error("[favourite]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}