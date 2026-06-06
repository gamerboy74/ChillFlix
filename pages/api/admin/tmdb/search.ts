import { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/serverAuth";
import { searchTmdb, searchMovies, searchTv } from "@/lib/tmdb";



/**
 * GET /api/admin/tmdb/search?q=inception&type=movie
 *
 * Query params:
 *   q     (required) — search query
 *   type  (optional) — "movie" | "tv" | "all" (default: "all")
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireAdmin(req, res);
  } catch (e) {
    return;
  }

  const query = String(req.query.q ?? "").trim();
  const type  = String(req.query.type ?? "all");

  if (!query) return res.status(400).json({ error: "q param is required" });
  if (!process.env.TMDB_API_KEY) {
    return res.status(503).json({
      error: "TMDB_API_KEY is not configured. Add it to your .env.local file.",
      setup: "Get a free key at https://www.themoviedb.org/settings/api",
    });
  }

  try {
    let results;
    if (type === "movie")     results = await searchMovies(query);
    else if (type === "tv")   results = await searchTv(query);
    else                      results = await searchTmdb(query);

    return res.status(200).json({ results: results.slice(0, 15) });
  } catch (err: any) {
    console.error("[admin/tmdb/search]", err);
    return res.status(500).json({ error: "Search failed. Please try again." });
  }
}
