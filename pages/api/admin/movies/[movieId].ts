import { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/serverAuth";
import supabase from "@/lib/supabase";


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try { await requireAdmin(req, res); } catch (e) { return; }

  const { movieId } = req.query;
  if (!movieId || typeof movieId !== "string") {
    return res.status(400).json({ error: "Invalid Movie ID" });
  }

  // PUT: Update an existing movie
  if (req.method === "PUT") {
    try {
      const { title, description, videoUrl, thumbnailUrl, genre, duration, onlyOnChillFlix, type, seasonsData } = req.body;

      const updates: any = {
        title,
        description,
        videoUrl,
        thumbnailUrl,
        genre,
        duration,
        onlyOnChillFlix: !!onlyOnChillFlix,
      };

      if (type !== undefined) updates.type = type;
      if (seasonsData !== undefined) updates.seasonsData = seasonsData;

      const { data, error } = await supabase
        .from("Movie")
        .update(updates)
        .eq("id", movieId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Sync/re-populate episodes for series if seasonsData has changed
      if (data && data.type === "series" && data.seasonsData) {
        try {
          const parsed = JSON.parse(data.seasonsData);
          if (Array.isArray(parsed)) {
            // 1. Get existing episodes from DB
            const { data: existingEps } = await supabase
              .from("Episode")
              .select("id, season, episode")
              .eq("movieId", movieId);

            const existingMap = new Map();
            (existingEps || []).forEach((ep: any) => {
              existingMap.set(`${ep.season}-${ep.episode}`, ep.id);
            });

            // 2. Build map of expected episodes
            const expectedSet = new Set();
            const episodesToInsert = [];

            for (const s of parsed) {
              for (let ep = 1; ep <= s.episodeCount; ep++) {
                const key = `${s.seasonNumber}-${ep}`;
                expectedSet.add(key);
                if (!existingMap.has(key)) {
                  episodesToInsert.push({
                    movieId: data.id,
                    season: s.seasonNumber,
                    episode: ep,
                    title: `Episode ${ep}`,
                    videoUrl: "",
                  });
                }
              }
            }

            // 3. Insert missing episodes
            if (episodesToInsert.length > 0) {
              await supabase.from("Episode").insert(episodesToInsert);
            }

            // 4. Delete episodes that are no longer expected
            const idsToDelete: string[] = [];
            (existingEps || []).forEach((ep: any) => {
              const key = `${ep.season}-${ep.episode}`;
              if (!expectedSet.has(key)) {
                idsToDelete.push(ep.id);
              }
            });

            if (idsToDelete.length > 0) {
              await supabase.from("Episode").delete().in("id", idsToDelete);
            }
          }
        } catch (e: any) {
          console.error("Failed to sync episodes on movie update:", e.message);
        }
      }

      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE: Delete a movie
  if (req.method === "DELETE") {
    try {
      const { error } = await supabase
        .from("Movie")
        .delete()
        .eq("id", movieId);

      if (error) throw new Error(error.message);
      return res.status(200).json({ message: "Movie deleted successfully" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).end();
}
