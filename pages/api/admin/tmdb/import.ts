import { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/serverAuth";
import { getMovieDetails, getTvDetails, getTrending, getPopularMovies, getPopularTv } from "@/lib/tmdb";
import supabase from "@/lib/supabase";

/**
 * POST /api/admin/tmdb/import
 *
 * Import a single movie/show from TMDB into the Movie table.
 * videoUrl is intentionally left EMPTY — the scraper will search
 * Cinevo by title and fill it in when "Resolve Streams" is run.
 *
 * Body: { tmdbId: number, type: "movie" | "tv", cinevoUrl?: string }
 *   cinevoUrl — optional: if you already know the exact Cinevo watch URL,
 *               you can pass it here. Otherwise leave blank.
 *
 * GET /api/admin/tmdb/import?mode=trending|popular_movies|popular_tv
 * Bulk import trending/popular content (metadata only, no streams).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try { await requireAdmin(req, res); } catch (e) { return; }

  if (!process.env.TMDB_API_KEY) {
    return res.status(503).json({
      error: "TMDB_API_KEY not set. Add it to .env.local.",
      setup: "https://www.themoviedb.org/settings/api",
    });
  }

  // ── GET: bulk import trending/popular ──────────────────────────────────────
  if (req.method === "GET") {
    const mode  = String(req.query.mode ?? "trending");
    const limit = Math.min(parseInt(String(req.query.limit ?? 20)), 40);

    let rawResults: any[] = [];
    if (mode === "popular_movies")    rawResults = await getPopularMovies();
    else if (mode === "popular_tv")   rawResults = await getPopularTv();
    else                              rawResults = await getTrending("week");

    rawResults = rawResults.slice(0, limit);

    // Load existing titles to avoid duplicates
    const { data: existingMovies } = await supabase.from("Movie").select("title");
    const existingTitles = new Set((existingMovies ?? []).map((m: any) => m.title.toLowerCase()));

    const report: any[] = [];
    const toInsert: any[] = [];

    for (const item of rawResults) {
      const isTV  = item.media_type === "tv";
      const title = isTV ? item.name : item.title;

      if (existingTitles.has(title?.toLowerCase())) {
        report.push({ title, status: "skipped (duplicate)" });
        continue;
      }

      try {
        const meta = isTV
          ? await getTvDetails(item.id)
          : await getMovieDetails(item.id);

        // ⚠️  videoUrl intentionally EMPTY.
        // The scraper (Resolve Streams / scrape-by-title) will search Cinevo
        // by title and fill in the real watch URL.
        toInsert.push({
          title:           meta.title,
          description:     meta.description,
          videoUrl:        "",           // filled by scraper after title-search
          thumbnailUrl:    meta.thumbnailUrl || meta.posterUrl,
          genre:           meta.genre,
          duration:        meta.duration,
          type:            meta.type,
          onlyOnChillFlix: false,
          seasonsData:     meta.seasonsData || null,
        });
        report.push({
          title:    meta.title,
          type:     meta.type,
          genre:    meta.genre,
          duration: meta.duration,
          rating:   meta.rating,
          status:   "queued",
        });
      } catch (err: any) {
        report.push({ title, status: `error: ${err.message}` });
      }
    }

    if (toInsert.length > 0) {
      const { data, error } = await supabase.from("Movie").insert(toInsert).select();
      if (error) return res.status(500).json({ error: error.message });

      // Pre-populate the Episode table for any TV Series inserted
      if (data && data.length > 0) {
        const episodesToInsert = [];
        for (const movie of data) {
          if (movie.type === "series" && movie.seasonsData) {
            try {
              const parsed = JSON.parse(movie.seasonsData);
              if (Array.isArray(parsed)) {
                for (const s of parsed) {
                  for (let ep = 1; ep <= s.episodeCount; ep++) {
                    episodesToInsert.push({
                      movieId: movie.id,
                      season: s.seasonNumber,
                      episode: ep,
                      title: `Episode ${ep}`,
                      videoUrl: "", // empty until resolved
                    });
                  }
                }
              }
            } catch (e) {
              console.error(`Failed to pre-populate episodes for bulk movie "${movie.title}":`, e);
            }
          }
        }
        if (episodesToInsert.length > 0) {
          const { error: epError } = await supabase.from("Episode").insert(episodesToInsert);
          if (epError) console.error("Failed to insert bulk episodes:", epError.message);
        }
      }

      report.forEach((r) => { if (r.status === "queued") r.status = "inserted"; });
      return res.status(200).json({
        message: `Imported ${data?.length ?? 0} movies from TMDB! Run "Resolve Streams" to cache their embed URLs.`,
        insertedCount: data?.length ?? 0,
        report,
      });
    }

    return res.status(200).json({
      message: "Nothing new to import — all results already exist in DB.",
      insertedCount: 0,
      report,
    });
  }

  // ── POST: import single movie by TMDB ID ───────────────────────────────────
  if (req.method === "POST") {
    const { tmdbId, type, cinevoUrl } = req.body;

    if (!tmdbId || !type) {
      return res.status(400).json({ error: "tmdbId and type are required" });
    }

    try {
      const meta = type === "tv"
        ? await getTvDetails(Number(tmdbId))
        : await getMovieDetails(Number(tmdbId));

      // Check duplicate by title
      const { data: existing } = await supabase
        .from("Movie")
        .select("id, title")
        .eq("title", meta.title)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({
          error: `"${meta.title}" already exists in the database.`,
          existingId: existing.id,
        });
      }

      // Only use a real Cinevo URL if the caller explicitly provided one.
      // Otherwise leave videoUrl empty — the scraper will find the real URL
      // by searching Cinevo with the title when the user clicks Resolve.
      const videoUrl = cinevoUrl?.trim() ? cinevoUrl.trim() : "";

      const { data, error } = await supabase
        .from("Movie")
        .insert({
          title:           meta.title,
          description:     meta.description,
          videoUrl,
          thumbnailUrl:    meta.thumbnailUrl || meta.posterUrl,
          genre:           meta.genre,
          duration:        meta.duration,
          type:            meta.type,
          onlyOnChillFlix: false,
          seasonsData:     meta.seasonsData || null,
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      // Pre-populate the Episode table for single TV Series
      if (data && meta.type === "series" && meta.seasonsData) {
        try {
          const parsed = JSON.parse(meta.seasonsData);
          if (Array.isArray(parsed)) {
            const episodesToInsert = [];
            for (const s of parsed) {
              for (let ep = 1; ep <= s.episodeCount; ep++) {
                episodesToInsert.push({
                  movieId: data.id,
                  season: s.seasonNumber,
                  episode: ep,
                  title: `Episode ${ep}`,
                  videoUrl: "", // empty until resolved
                });
              }
            }
            if (episodesToInsert.length > 0) {
              const { error: epError } = await supabase.from("Episode").insert(episodesToInsert);
              if (epError) console.error("Failed to pre-populate episodes for single import:", epError.message);
            }
          }
        } catch (e) {
          console.error("Failed to parse seasonsData for single import:", e);
        }
      }

      return res.status(201).json({
        message: `"${meta.title}" imported! Click the ▶ button in Movies tab to resolve its stream URL.`,
        movie: data,
        metadata: meta,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
