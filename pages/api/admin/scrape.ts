import { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/serverAuth";
import { chromium } from "playwright";
import { CinevoScraperService, getCinevoBaseUrl } from "@/lib/cinevoScraper";
import supabase from "@/lib/supabase";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Always enforce auth — no dev bypass
  try { await requireAdmin(req, res); } catch (e) { return; }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Set headers for streaming response body
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
  });

  const singleMovieId = req.query.movieId as string | undefined;
  const force = req.query.force === "true";

  let browser: any = null;

  const logProgress = (msg: string) => {
    res.write(`${msg}\n`);
    console.log(`[Scrape Stream] ${msg}`);
  };

  try {
    const BASE = await getCinevoBaseUrl();
    const cinevoHost = new URL(BASE).hostname; // e.g. "cinevo.us"

    logProgress(`🎬 Starting stream resolution. Base: ${BASE} (force=${force})`);

    // Fetch movies
    let query = supabase.from("Movie").select("id, title, videoUrl, type, seasonsData");
    if (singleMovieId) query = query.eq("id", singleMovieId) as any;

    const { data: movies, error: dbError } = await query;
    if (dbError) throw new Error(dbError.message);
    if (!movies || movies.length === 0) {
      logProgress("No movies found to process.");
      res.end();
      return;
    }

    logProgress(`🚀 Launching scraper engine for ${movies.length} title(s)…`);
    if (process.env.BROWSERLESS_API_KEY) {
      browser = await chromium.connectOverCDP(`wss://chrome.browserless.io?token=${process.env.BROWSERLESS_API_KEY}`);
    } else {
      browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    }

    let processedCount = 0;

    for (const movie of movies) {
      const label = `"${movie.title}"`;

      try {
        // Skip if already cached and force is false
        if (!force) {
          const { data: existingEp } = await supabase
            .from("Episode")
            .select("id, videoUrl")
            .eq("movieId", movie.id)
            .eq("season", 1)
            .eq("episode", 1)
            .maybeSingle();

          if (existingEp && existingEp.videoUrl && existingEp.videoUrl.trim().startsWith("{")) {
            logProgress(`⏭️ ${label} already cached — skipping.`);
            continue;
          }
        }

        processedCount++;
        logProgress(`🔍 Processing: ${label} (${movie.type || "movie"})`);

        const context = await browser.newContext({
          userAgent: CinevoScraperService.USER_AGENT,
          viewport: { width: 1280, height: 720 },
          ignoreHTTPSErrors: true,
        });

        const page = await context.newPage();

        let watchUrl: string;
        const rawUrl: string = movie.videoUrl ?? "";

        // Check if stored URL is already a valid watch URL
        const isCinevoUrl =
          rawUrl.includes(cinevoHost) ||
          rawUrl.includes("cinevo") ||
          rawUrl.match(/^https?:\/\/[^/]*cinevo[^/]*/i);

        const isWatchUrl = isCinevoUrl && rawUrl.includes("/watch/");

        if (isWatchUrl) {
          watchUrl = rawUrl.replace(/^https?:\/\/[^/]+/i, BASE);
          logProgress(`  🔗 Using saved URL: ${watchUrl}`);
        } else {
          logProgress(`  📡 Searching Cinevo by title: ${label}…`);
          watchUrl = await CinevoScraperService.resolveWatchUrlWithPage(
            page,
            movie.title,
            1,
            { type: movie.type }
          );
          logProgress(`  ✅ Resolved watch URL: ${watchUrl}`);

          // Save to Movie table
          await supabase
            .from("Movie")
            .update({ videoUrl: watchUrl })
            .eq("id", movie.id);
        }

        // Determine episodes list
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
          for (const s of seasonsList) {
            for (let ep = 1; ep <= s.episodeCount; ep++) {
              epsToScrape.push({ season: s.seasonNumber, episode: ep });
            }
          }
        } else {
          epsToScrape.push({ season: 1, episode: 1 });
        }

        // Pre-populate missing Episode rows
        if (movie.type === "series") {
          try {
            const { data: existingEps } = await supabase
              .from("Episode")
              .select("season, episode")
              .eq("movieId", movie.id);
            
            const existingSet = new Set((existingEps ?? []).map((e: any) => `${e.season}-${e.episode}`));
            const toInsert = [];
            for (const ep of epsToScrape) {
              if (!existingSet.has(`${ep.season}-${ep.episode}`)) {
                toInsert.push({
                  movieId: movie.id,
                  season: ep.season,
                  episode: ep.episode,
                  title: `Episode ${ep.episode}`,
                  videoUrl: "",
                });
              }
            }
            if (toInsert.length > 0) {
              logProgress(`  📦 Pre-populating ${toInsert.length} episode slot(s)`);
              await supabase.from("Episode").insert(toInsert);
            }
          } catch (e: any) {
            console.error("Pre-populate error:", e.message);
          }
        }

        logProgress(`  🎬 Scraping ${epsToScrape.length} episode(s)…`);
        let resolvedCount = 0;
        let lastSourcesMap: Record<string, string> = {};

        for (const ep of epsToScrape) {
          try {
            const epUrl = new URL(watchUrl);
            if (movie.type === "series") {
              epUrl.searchParams.set("season", String(ep.season));
              epUrl.searchParams.set("ep", String(ep.episode));
              epUrl.searchParams.set("episode", String(ep.episode));
            }

            logProgress(`    🎞️ Resolving S${ep.season}E${ep.episode}…`);
            await page.goto(epUrl.toString(), { waitUntil: "domcontentloaded", timeout: 35000 });
            await new Promise((r) => setTimeout(r, 2000));

            const { sources } = await CinevoScraperService.collectServerSources(page, "sub");
            if (sources && sources.length > 0) {
              const sourcesMap: Record<string, string> = {};
              sources.forEach((src: any) => { sourcesMap[src.label] = src.iframeUrl; });
              const jsonStore = JSON.stringify(sourcesMap);

              const { error: upsertErr } = await supabase
                .from("Episode")
                .upsert(
                  { movieId: movie.id, season: ep.season, episode: ep.episode, videoUrl: jsonStore },
                  { onConflict: "movieId,season,episode" }
                );

              if (!upsertErr) {
                resolvedCount++;
                lastSourcesMap = sourcesMap;
                logProgress(`      ✅ S${ep.season}E${ep.episode} resolved successfully [${Object.keys(sourcesMap).join(", ")}]`);
              } else {
                logProgress(`      ❌ S${ep.season}E${ep.episode} database save error: ${upsertErr.message}`);
              }
            } else {
              logProgress(`      ⚠️ S${ep.season}E${ep.episode}: No server streams found.`);
            }
          } catch (e: any) {
            logProgress(`      ❌ S${ep.season}E${ep.episode} failed: ${e.message}`);
          }
        }

        await context.close();
      } catch (err: any) {
        logProgress(`  ❌ Error processing ${label}: ${err.message}`);
      }
    }

    logProgress(`🎉 Done! Processed ${processedCount} movie(s).`);
    res.end();
  } catch (err: any) {
    logProgress(`❌ Fatal Error: ${err.message}`);
    res.end();
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
