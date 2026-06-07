import { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/serverAuth";
import supabase from "@/lib/supabase";



/**
  * GET /api/admin/episodes?movieId=...\n  * Fetch all episodes for a given series.
  *
  * PUT /api/admin/episodes
  * Update a single episode's properties (title, videoUrl).
  */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try { await requireAdmin(req, res); } catch (e) { return; }

  // GET: Fetch all episodes for a movieId
  if (req.method === "GET") {
    const { movieId } = req.query;
    if (!movieId || typeof movieId !== "string") {
      return res.status(400).json({ error: "movieId query parameter is required" });
    }

    try {
      const { data: fetchedEpisodes, error } = await supabase
        .from("Episode")
        .select("id, season, episode, title, videoUrl")
        .eq("movieId", movieId)
        .order("season", { ascending: true })
        .order("episode", { ascending: true });

      if (error) throw error;
      let episodes = fetchedEpisodes;

      // If it's a Movie (not TV Series) and has no episode row yet, auto-create it
      if (!episodes || episodes.length === 0) {
        const { data: movie } = await supabase
          .from("Movie")
          .select("title, type")
          .eq("id", movieId)
          .single();

        if (movie && movie.type !== "series") {
          const { data: newEp, error: createErr } = await supabase
            .from("Episode")
            .insert({
              movieId,
              season: 1,
              episode: 1,
              title: movie.title,
              videoUrl: "",
            })
            .select("id, season, episode, title, videoUrl")
            .single();

          if (!createErr && newEp) {
            episodes = [newEp];
          }
        }
      }

      return res.status(200).json(episodes ?? []);
    } catch (err) {
      console.error("[admin/episodes GET]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // PUT: Update an existing episode's fields (e.g. title or videoUrl)
  if (req.method === "PUT") {
    try {
      const { id, title, videoUrl } = req.body;

      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Episode id is required" });
      }

      const updates: Record<string, string> = {};
      if (title !== undefined) updates.title = title;
      if (videoUrl !== undefined) updates.videoUrl = videoUrl;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      const { data, error } = await supabase
        .from("Episode")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (err) {
      console.error("[admin/episodes PUT]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).end();
}
