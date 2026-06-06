import { NextApiRequest, NextApiResponse } from "next";
import { chromium } from "playwright";
import { CinevoScraperService, getCinevoBaseUrl } from "@/lib/cinevoScraper";
import supabase from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Always enforce auth — no dev bypass
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { movieId } = req.query;
  const season = parseInt(req.query.season as string) || 1;
  const episode = parseInt(req.query.episode as string) || 1;

  if (!movieId || typeof movieId !== "string") {
    return res.status(400).json({ error: "Missing or invalid movieId parameter" });
  }

  try {
    // 1. Fetch movie details from Supabase
    const { data: movie, error } = await supabase
      .from("Movie")
      .select("title, videoUrl, type")
      .eq("id", movieId)
      .single();

    if (error || !movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    // Unify parameters: movies default to Season 1, Episode 1 in the Episode table
    const s = movie.type === "series" ? season : 1;
    const e = movie.type === "series" ? episode : 1;

    // 2. Check Episode table for cached direct stream links
    const { data: episodeRecord, error: epError } = await supabase
      .from("Episode")
      .select("videoUrl")
      .eq("movieId", movieId)
      .eq("season", s)
      .eq("episode", e)
      .maybeSingle();

    if (episodeRecord && episodeRecord.videoUrl.trim().startsWith("{")) {
      try {
        const sourcesObj = JSON.parse(episodeRecord.videoUrl);
        const sources = Object.entries(sourcesObj).map(([label, iframeUrl]) => ({
          label,
          iframeUrl,
          lang: label.toLowerCase().includes("hindi") ? "dub" : "sub"
        }));

        const vidCoreKey = Object.keys(sourcesObj).find(k => k.toLowerCase().includes("vidcore"));
        const defaultStream = vidCoreKey ? sourcesObj[vidCoreKey] : Object.values(sourcesObj)[0] as string;

        console.log(`⚡ [Stream API] Cache hit (Episode table) for "${movie.title}" S${s}E${e}.`);
        return res.status(200).json({
          success: true,
          streamUrl: defaultStream,
          sources,
        });
      } catch (err) {
        console.error("⚠️ [Stream API] Failed to parse cached episode videoUrl JSON:", err);
      }
    }

    // 3. Resolve base URL and check stored watch URL validity
    const cinevoBase = await getCinevoBaseUrl();
    const cinevoHost = new URL(cinevoBase).hostname;

    let watchUrlStr = movie.videoUrl ?? "";
    const isCinevoUrl = watchUrlStr.includes(cinevoHost) || watchUrlStr.includes("cinevo");
    const isWatchUrl = isCinevoUrl && watchUrlStr.includes("/watch/");

    // If it's a direct external link and NOT a Cinevo link, return it immediately
    if (watchUrlStr && !isCinevoUrl) {
      console.log(`🔗 [Stream API] Returning direct URL for "${movie.title}": ${watchUrlStr}`);
      return res.status(200).json({ success: true, streamUrl: watchUrlStr, sources: [] });
    }

    // If we don't have a valid Cinevo watch URL yet, search Cinevo and resolve it dynamically
    if (!isWatchUrl) {
      console.log(`🔍 [Stream API] No valid watch URL for "${movie.title}". Searching Cinevo…`);
      const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
      const context = await browser.newContext({
        userAgent: CinevoScraperService.USER_AGENT,
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
      });
      const page = await context.newPage();
      try {
        const resolved = await CinevoScraperService.resolveWatchUrlWithPage(page, movie.title, 1, { type: movie.type });
        watchUrlStr = resolved;
        console.log(`✅ [Stream API] Resolved watch URL: ${watchUrlStr}`);
        // Save back
        await supabase.from("Movie").update({ videoUrl: watchUrlStr }).eq("id", movieId);
      } catch (err: any) {
        console.error("❌ [Stream API] Search failed:", err.message);
        // Fallback: build a guessed Cinevo URL
        const slug = movie.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        watchUrlStr = `${cinevoBase}/watch/${movie.type === "series" ? "tv" : "movie"}/${slug}`;
      } finally {
        await browser.close().catch(() => {});
      }
    }

    // Swap host in case domain changed
    watchUrlStr = watchUrlStr.replace(/^https?:\/\/[^/]+/i, cinevoBase);

    // Build final watch URL with params
    const watchUrl = new URL(watchUrlStr);
    if (movie.type === "series") {
      watchUrl.searchParams.set("season", String(s));
      watchUrl.searchParams.set("ep", String(e));
      watchUrl.searchParams.set("episode", String(e));
    }

    console.log(`🚀 [Stream API] Scraping direct player link on-demand for "${movie.title}" S${s}E${e}`);
    const result = await CinevoScraperService.scrapeAnimeEpisode(watchUrl.toString(), e, {
      season: s,
      timeout: 35000,
      retries: 2,
    });

    if (result.success && result.streamUrl && result.episodeData?.sources) {
      // Create JSON store object
      const sourcesObj: Record<string, string> = {};
      result.episodeData.sources.forEach((src: any) => {
        sourcesObj[src.label] = src.iframeUrl;
      });
      const jsonStore = JSON.stringify(sourcesObj);

      // Save to Episode table so we have a cache next time
      try {
        await supabase
          .from("Episode")
          .upsert({
            movieId,
            season: s,
            episode: e,
            videoUrl: jsonStore,
          }, { onConflict: "movieId,season,episode" });
        console.log(`💾 [Stream API] Cached S${s}E${e} to Episode table for "${movie.title}"`);
      } catch (dbErr: any) {
        console.error(`⚠️ [Stream API] Failed to cache episode to DB:`, dbErr.message);
      }

      const sourcesList = result.episodeData.sources.map((src: any) => ({
        label: src.label,
        iframeUrl: src.iframeUrl,
        lang: src.lang,
      }));

      return res.status(200).json({
        success: true,
        streamUrl: result.streamUrl,
        sources: sourcesList,
      });
    } else {
      // Fallback to the watch URL itself
      console.warn(`⚠️ [Stream API] Failed to resolve direct player, falling back to watch URL.`);
      return res.status(200).json({
        success: true,
        streamUrl: watchUrl.toString(),
        sources: [{ label: "Cinevo Player", iframeUrl: watchUrl.toString(), lang: "sub" }],
      });
    }
  } catch (err: any) {
    console.error("❌ [Stream API] Error:", err.message);
    return res.status(500).json({ error: "Stream resolution failed. Please try again." });
  }
}
