import { NextApiRequest, NextApiResponse } from "next";
import { chromium } from "playwright";
import { CinevoScraperService, getCinevoBaseUrl } from "@/lib/cinevoScraper";
import supabase from "@/lib/supabase";
import { requireAdmin } from "@/lib/serverAuth";

/**
 * POST /api/admin/resolve-stream
 *
 * Resolve stream URL for a single movie by ID.
 * Used from the movie list to resolve individual movies.
 *
 * Body: { movieId: string, force?: boolean }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireAdmin(req, res);
  } catch (error) {
    return;
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { movieId, force = false, season, episode } = req.body;
  if (!movieId) return res.status(400).json({ error: "movieId required" });

  let browser: any = null;

  try {
    // Fetch movie
    const { data: movie, error } = await supabase
      .from("Movie")
      .select("id, title, videoUrl, type, seasonsData")
      .eq("id", movieId)
      .single();

    if (error || !movie) return res.status(404).json({ error: "Movie not found" });

    // Check existing (only for movies/first ep if not forcing)
    if (!force) {
      const sCheck = season !== undefined ? Number(season) : 1;
      const eCheck = episode !== undefined ? Number(episode) : 1;
      const { data: ep } = await supabase
        .from("Episode")
        .select("id, videoUrl")
        .eq("movieId", movieId)
        .eq("season", sCheck)
        .eq("episode", eCheck)
        .maybeSingle();

      if (ep && ep.videoUrl && ep.videoUrl.trim().startsWith("{")) {
        try {
          const sources = JSON.parse(ep.videoUrl);
          return res.status(200).json({
            message: `Episode S${sCheck}E${eCheck} already resolved (use force=true to re-scrape)`,
            cached: true,
            sources,
          });
        } catch (e) {
          console.error("Failed to parse cached videoUrl:", e);
        }
      }
    }

    const BASE = await getCinevoBaseUrl();
    const cinevoHost = new URL(BASE).hostname;

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
      console.log(`🔗 [ResolveStream] Using stored URL: ${watchUrl}`);
    } else {
      console.log(`🔍 [ResolveStream] Searching Cinevo for: "${movie.title}"`);
      watchUrl = await CinevoScraperService.resolveWatchUrlWithPage(page, movie.title, 1, { type: movie.type });
      console.log(`✅ [ResolveStream] Found: ${watchUrl}`);
      // Save real URL back
      await supabase.from("Movie").update({ videoUrl: watchUrl }).eq("id", movieId);
    }

    // Resolve TV seasons list
    let seasonsList = [];
    if (movie.type === "series" && movie.seasonsData) {
      try {
        seasonsList = JSON.parse(movie.seasonsData);
      } catch (e) {
        console.error("Failed to parse seasonsData:", e);
      }
    }
    if (movie.type === "series" && seasonsList.length === 0) {
      seasonsList = [{ seasonNumber: 1, episodeCount: 12 }];
    }

    const epsToScrape = [];
    if (movie.type === "series") {
      if (season !== undefined && episode !== undefined) {
        epsToScrape.push({ season: Number(season), episode: Number(episode) });
      } else {
        for (const s of seasonsList) {
          for (let ep = 1; ep <= s.episodeCount; ep++) {
            epsToScrape.push({ season: s.seasonNumber, episode: ep });
          }
        }
      }
    } else {
      epsToScrape.push({ season: 1, episode: 1 });
    }

    // Pre-populate missing episodes in the Episode table so they exist in DB
    if (movie.type === "series") {
      try {
        const { data: existingEps } = await supabase
          .from("Episode")
          .select("season, episode")
          .eq("movieId", movieId);
        
        const existingSet = new Set((existingEps ?? []).map((e: any) => `${e.season}-${e.episode}`));
        const toInsert = [];
        for (const ep of epsToScrape) {
          if (!existingSet.has(`${ep.season}-${ep.episode}`)) {
            toInsert.push({
              movieId,
              season: ep.season,
              episode: ep.episode,
              title: `Episode ${ep.episode}`,
              videoUrl: "",
            });
          }
        }
        if (toInsert.length > 0) {
          console.log(`Pre-populating ${toInsert.length} missing episodes for series "${movie.title}"`);
          await supabase.from("Episode").insert(toInsert);
        }
      } catch (e: any) {
        console.error("Failed to pre-populate missing episodes in resolve-stream:", e.message);
      }
    }

    console.log(`🔁 [ResolveStream] Scraping ${epsToScrape.length} episodes for "${movie.title}"`);
    let resolvedCount = 0;
    const firstEpSources: Record<string, string> = {};

    for (const ep of epsToScrape) {
      try {
        const epUrl = new URL(watchUrl);
        if (movie.type === "series") {
          epUrl.searchParams.set("season", String(ep.season));
          epUrl.searchParams.set("ep", String(ep.episode));
          epUrl.searchParams.set("episode", String(ep.episode));
        }

        console.log(`🎞️  [ResolveStream] Scraping S${ep.season}E${ep.episode} at ${epUrl.toString()}`);
        await page.goto(epUrl.toString(), { waitUntil: "domcontentloaded", timeout: 35000 });
        await new Promise((r) => setTimeout(r, 2500));

        const { sources } = await CinevoScraperService.collectServerSources(page, "sub");
        if (sources && sources.length > 0) {
          const sourcesMap: Record<string, string> = {};
          sources.forEach((s: any) => { sourcesMap[s.label] = s.iframeUrl; });

          await supabase.from("Episode").upsert(
            { movieId, season: ep.season, episode: ep.episode, videoUrl: JSON.stringify(sourcesMap) },
            { onConflict: "movieId,season,episode" }
          );
          resolvedCount++;

          if (ep.season === 1 && ep.episode === 1) {
            Object.assign(firstEpSources, sourcesMap);
          }
        }
      } catch (e: any) {
        console.error(`❌ [ResolveStream] Failed S${ep.season}E${ep.episode}:`, e.message);
      }
    }

    await context.close();

    return res.status(200).json({
      message: `Resolved ${resolvedCount}/${epsToScrape.length} episodes of "${movie.title}"`,
      sources: firstEpSources,
      watchUrl,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
