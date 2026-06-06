/**
 * GET /api/admin/fix-video-urls
 *
 * One-time cleanup: finds all movies where videoUrl is a guessed slug
 * (cinevo.pro/watch/movie/some-slug or cinevo.us/watch/movie/some-slug)
 * and resets them to empty string so the scraper will title-search on Cinevo.
 *
 * Visit: http://localhost:3001/api/admin/fix-video-urls
 */
import { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabase";
import { requireAdmin } from "@/lib/serverAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireAdmin(req, res);
  } catch (error) {
    return;
  }
  // Fetch all movies
  const { data: movies, error } = await supabase
    .from("Movie")
    .select("id, title, videoUrl");

  if (error) return res.status(500).json({ error: error.message });

  const toReset: { id: string; title: string; oldUrl: string }[] = [];

  for (const movie of movies ?? []) {
    const url: string = movie.videoUrl ?? "";

    // A "guessed" URL has a cinevo domain AND the path is just /watch/{type}/{slugified-title}
    // There's no real evidence this URL works — the scraper made it up.
    const isCinevoUrl = /cinevo\./i.test(url);
    const isWatchPath = /\/watch\/(movie|tv)\/[a-z0-9-]+$/i.test(url);

    // Also check: does it have a verified Episode row cached? If yes, keep it.
    // Only reset if there's NO verified Episode data (i.e., stream was never verified).
    if (isCinevoUrl && isWatchPath) {
      const { data: ep } = await supabase
        .from("Episode")
        .select("id, videoUrl")
        .eq("movieId", movie.id)
        .eq("season", 1)
        .eq("episode", 1)
        .maybeSingle();

      if (!ep || !ep.videoUrl || !ep.videoUrl.trim().startsWith("{")) {
        // No verified episode — this URL was never confirmed by the scraper
        toReset.push({ id: movie.id, title: movie.title, oldUrl: url });
      }
    }
  }

  if (toReset.length === 0) {
    return res.status(200).json({
      message: "No guessed URLs found to clean up. Everything looks good!",
      checked: movies?.length ?? 0,
    });
  }

  // Reset videoUrl to empty string for all unverified guessed URLs
  const ids = toReset.map((m) => m.id);
  const { error: updateErr } = await supabase
    .from("Movie")
    .update({ videoUrl: "" })
    .in("id", ids);

  if (updateErr) return res.status(500).json({ error: updateErr.message });

  return res.status(200).json({
    message: `Cleaned ${toReset.length} guessed URL(s). Run "Resolve Streams" to find the real ones.`,
    cleaned: toReset.map((m) => ({ title: m.title, removedUrl: m.oldUrl })),
    nextStep: "Go to Admin → Scraper Engine → Resolve Streams",
  });
}
