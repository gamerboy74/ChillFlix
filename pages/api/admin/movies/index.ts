import { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/serverAuth";
import supabase from "@/lib/supabase";


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try { await requireAdmin(req, res); } catch (e) { return; }

  // GET: Fetch all movies
  if (req.method === "GET") {
    try {
      const { data: movies, error } = await supabase
        .from("Movie")
        .select(`
          *,
          Episode (
            id,
            season,
            episode,
            videoUrl
          )
        `);

      if (error) throw new Error(error.message);
      return res.status(200).json(movies || []);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST: Create a new movie
  if (req.method === "POST") {
    try {
      const { title, description, videoUrl, thumbnailUrl, genre, duration, onlyOnChillFlix, type = "movie", seasonsData } = req.body;

      if (!title || !thumbnailUrl || !genre) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if a movie with the same watch URL already exists (only if videoUrl is provided)
      if (videoUrl) {
        const { data: existingMovie } = await supabase
          .from("Movie")
          .select("id")
          .eq("videoUrl", videoUrl)
          .maybeSingle();

        if (existingMovie) {
          return res.status(400).json({ error: "A movie with this video source URL already exists" });
        }
      }

      const { data, error } = await supabase
        .from("Movie")
        .insert({
          title,
          description: description || `Watch "${title}" on ChillFlix.`,
          videoUrl: videoUrl || "",
          thumbnailUrl,
          genre,
          duration: duration || (type === "series" ? "12 Episodes" : "N/A"),
          onlyOnChillFlix: !!onlyOnChillFlix,
          type,
          seasonsData: type === "series" ? (seasonsData || JSON.stringify([{ seasonNumber: 1, episodeCount: 12 }])) : null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Pre-populate episodes for series
      if (data && type === "series" && data.seasonsData) {
        try {
          const parsed = JSON.parse(data.seasonsData);
          if (Array.isArray(parsed)) {
            const episodesToInsert = [];
            for (const s of parsed) {
              for (let ep = 1; ep <= s.episodeCount; ep++) {
                episodesToInsert.push({
                  movieId: data.id,
                  season: s.seasonNumber,
                  episode: ep,
                  title: `Episode ${ep}`,
                  videoUrl: "",
                });
              }
            }
            if (episodesToInsert.length > 0) {
              await supabase.from("Episode").insert(episodesToInsert);
            }
          }
        } catch (e: any) {
          console.error("Failed to pre-populate manual series episodes:", e.message);
        }
      }

      return res.status(201).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).end(); // Method Not Allowed
}
