/**
 * GET /api/admin/scrape-by-title
 *
 * Quick-scrape a movie by title — searches Cinevo, collects servers,
 * and upserts to the Episode table for the first matching Movie in DB.
 *
 * Query params:
 *   title  (required) — movie/series title to search
 *   type   (optional) — "movie" | "tv" (helps Cinevo slug matching)
 *   force  (optional) — re-scrape even if already cached
 */
import { NextApiRequest, NextApiResponse } from "next";
import { chromium } from "playwright";
import { CinevoScraperService, getCinevoBaseUrl } from "@/lib/cinevoScraper";
import supabase from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const title = String(req.query.title ?? "").trim();
  const type  = String(req.query.type  ?? "").toLowerCase();
  const force = req.query.force === "true";

  if (!title) return res.status(400).json({ error: "title param is required" });

  let browser: any = null;

  try {
    // ── 1. Find matching movie in DB ────────────────────────────────────────
    const { data: movies } = await supabase
      .from("Movie")
      .select("id, title, videoUrl, type")
      .ilike("title", `%${title}%`)
      .limit(5);

    if (!movies || movies.length === 0) {
      return res.status(404).json({
        error: `No movie found in database matching "${title}". Import it first via TMDB import.`,
        hint: "Admin → Import (TMDB) → search and import the movie, then retry.",
      });
    }

    // Pick the best match (exact first, then first fuzzy)
    const exact = movies.find((m: any) => m.title.toLowerCase() === title.toLowerCase());
    const movie = exact ?? movies[0];

    // ── 2. Check existing Episode cache ────────────────────────────────────
    if (!force) {
      const { data: ep } = await supabase
        .from("Episode")
        .select("id, videoUrl")
        .eq("movieId", movie.id)
        .eq("season", 1)
        .eq("episode", 1)
        .maybeSingle();

      if (ep && ep.videoUrl && ep.videoUrl.trim().startsWith("{")) {
        try {
          const sources = JSON.parse(ep.videoUrl);
          const serverNames = Object.keys(sources);
          return res.status(200).json({
            message: `"${movie.title}" already cached with ${serverNames.length} server(s). Add ?force=true to re-scrape.`,
            cached: true,
            movieId: movie.id,
            title: movie.title,
            servers: serverNames,
            sources,
          });
        } catch (e) {
          console.error("Failed to parse cached videoUrl:", e);
        }
      }
    }

    // ── 3. Launch browser & resolve the watch URL ───────────────────────────
    const BASE = await getCinevoBaseUrl();
    const cinevoHost = new URL(BASE).hostname;

    console.log(`🔍 [ScrapeByTitle] Searching Cinevo for "${movie.title}" (BASE=${BASE})`);
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const context = await browser.newContext({
      userAgent: CinevoScraperService.USER_AGENT,
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    // Determine watch URL
    const rawUrl: string = movie.videoUrl ?? "";
    const isWatchUrl = (rawUrl.includes(cinevoHost) || rawUrl.includes("cinevo")) && rawUrl.includes("/watch/");

    let watchUrl: string;
    if (isWatchUrl) {
      watchUrl = rawUrl.replace(/^https?:\/\/[^/]+/i, BASE);
      console.log(`🔗 [ScrapeByTitle] Using stored URL: ${watchUrl}`);
    } else {
      // Search Cinevo by title
      watchUrl = await CinevoScraperService.resolveWatchUrlWithPage(
        page,
        movie.title,
        1,
        { type: type || movie.type }
      );
      console.log(`✅ [ScrapeByTitle] Found: ${watchUrl}`);
      // Persist real URL
      await supabase.from("Movie").update({ videoUrl: watchUrl }).eq("id", movie.id);
    }

    // ── 4. Navigate & collect servers ───────────────────────────────────────
    console.log(`🎞️  [ScrapeByTitle] Loading watch page…`);
    await page.goto(watchUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await new Promise((r) => setTimeout(r, 3000));

    const { sources } = await CinevoScraperService.collectServerSources(page, "sub");
    await context.close();

    if (!sources || sources.length === 0) {
      return res.status(200).json({
        message: `Found Cinevo page but no embed servers detected for "${movie.title}".`,
        watchUrl,
        movieId: movie.id,
        sources: {},
      });
    }

    // ── 5. Save to Episode table ────────────────────────────────────────────
    const sourcesMap: Record<string, string> = {};
    sources.forEach((s: any) => { sourcesMap[s.label] = s.iframeUrl; });

    await supabase.from("Episode").upsert(
      { movieId: movie.id, season: 1, episode: 1, videoUrl: JSON.stringify(sourcesMap) },
      { onConflict: "movieId,season,episode" }
    );

    const serverNames = Object.keys(sourcesMap);
    console.log(`💾 [ScrapeByTitle] Saved ${serverNames.length} servers for "${movie.title}"`);

    return res.status(200).json({
      message: `"${movie.title}" resolved with ${serverNames.length} stream server(s)!`,
      cached: false,
      movieId: movie.id,
      title: movie.title,
      watchUrl,
      servers: serverNames,
      sources: sourcesMap,
    });
  } catch (err: any) {
    console.error(`❌ [ScrapeByTitle] ${err.message}`);
    return res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
