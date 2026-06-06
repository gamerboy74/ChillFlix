import { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/serverAuth";
import { chromium } from "playwright";
import { CinevoScraperService, scrapeCinevoMetadata, getCinevoBaseUrl } from "@/lib/cinevoScraper";
import supabase from "@/lib/supabase";
import { searchTv, getTvDetails } from "@/lib/tmdb";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── Auth gate ────────────────────────────────────────────────────────────────
  try { await requireAdmin(req, res); } catch (e) { return; }

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Set headers for streaming response body
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
  });

  const limit  = Math.min(parseInt(String(req.query.limit  ?? 12)), 30);
  const force  = req.query.force === "true";

  let browser: any = null;

  const logProgress = (msg: string) => {
    res.write(`${msg}\n`);
    console.log(`[Seed Stream] ${msg}`);
  };

  try {
    const BASE = await getCinevoBaseUrl();
    logProgress(`🚀 Seeding catalog from base URL: ${BASE} (limit=${limit})`);

    logProgress("📡 Launching browser engine…");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: CinevoScraperService.USER_AGENT,
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();

    // ── Step 1: Scrape homepage catalog ─────────────────────────────────────
    logProgress("🌐 Accessing Cinevo home page to retrieve items…");
    const items = await CinevoScraperService.scrapeHomepageMovies(page);
    if (!items || items.length === 0) {
      logProgress("❌ No items found on Cinevo homepage.");
      await browser.close();
      res.end();
      return;
    }

    logProgress(`📋 Scraped ${items.length} items. Loading duplicate check database indexes…`);

    // ── Step 2: Load existing movies to prevent duplicates ──────────────────
    const { data: existingMovies } = await supabase.from("Movie").select("title, videoUrl");
    const existingUrls   = new Set((existingMovies || []).map((m: any) => m.videoUrl));
    const existingTitles = new Set((existingMovies || []).map((m: any) => m.title.toLowerCase()));

    // ── Step 3: Build candidate list ────────────────────────────────────────
    const candidates = items.slice(0, limit * 2); // oversample to reach limit after dups
    const moviesToInsert: any[] = [];

    for (const item of candidates) {
      if (moviesToInsert.length >= limit) break;

      const match = item.href.match(/\/(tv|movie)\/([^/?#]+)/i);
      if (!match) continue;

      const pathPart = item.href.substring(item.href.indexOf(match[0]));
      const watchUrl = `${BASE}/watch${pathPart}`;
      const detailUrl = `${BASE}${item.href.startsWith("/") ? "" : "/"}${item.href}`;

      // Skip duplicates (unless force flag)
      if (!force && (existingUrls.has(watchUrl) || existingTitles.has(item.title.toLowerCase()))) {
        logProgress(`⏭️ Skipping duplicate: "${item.title}"`);
        continue;
      }

      // ── Step 4: Scrape real metadata from the detail page ────────────────
      logProgress(`🔍 Fetching metadata for: "${item.title}"`);
      let meta: any = await scrapeCinevoMetadata(page, detailUrl);

      if (!meta) {
        logProgress(`  ⚠️ Metadata failed for "${item.title}" — using homepage fallback`);
        meta = {
          title: item.title,
          description: `Watch "${item.title}" on ChillFlix — multiple servers available.`,
          posterUrl: item.poster || "",
          backdropUrl: item.poster || "",
          genre: "Drama",
          duration: match[1] === "tv" ? "N/A" : "N/A",
          rating: "N/A",
          year: String(new Date().getFullYear()),
          type: (match[1] === "tv" ? "series" : "movie") as "movie" | "series",
        };
      }

      let seasonsData = null;
      if (meta.type === "series") {
        if (process.env.TMDB_API_KEY) {
          try {
            const searchResults = await searchTv(meta.title);
            if (searchResults && searchResults.length > 0) {
              const match = searchResults.find((r: any) => (r.name || "").toLowerCase() === meta.title.toLowerCase()) || searchResults[0];
              const tvDetails = await getTvDetails(match.id);
              seasonsData = tvDetails.seasonsData;
              
              // Enrich meta details with TMDB data
              meta.description = tvDetails.description || meta.description;
              meta.backdropUrl = tvDetails.thumbnailUrl || meta.backdropUrl;
              meta.posterUrl = tvDetails.posterUrl || meta.posterUrl;
              meta.genre = tvDetails.genre || meta.genre;
              meta.duration = tvDetails.duration || meta.duration;
              logProgress(`  %s Enriched series "${meta.title}" with TMDB metadata.`);
            }
          } catch (tmdbErr: any) {
            logProgress(`  ⚠️ TMDB enrichment failed for "${meta.title}": ${tmdbErr.message}`);
          }
        }

        if (!seasonsData) {
          seasonsData = JSON.stringify([{ seasonNumber: 1, episodeCount: 12 }]);
        }
      }

      moviesToInsert.push({
        title: meta.title || item.title,
        description: meta.description,
        videoUrl: watchUrl,
        thumbnailUrl: meta.backdropUrl || meta.posterUrl || item.poster || "",
        genre: meta.genre,
        duration: meta.duration,
        onlyOnChillFlix: false,
        type: meta.type,
        seasonsData,
      });

      logProgress(`  ✅ Queued: "${meta.title || item.title}" [${meta.type}]`);
    }

    await browser.close();
    browser = null;

    // ── Step 5: Batch insert into Supabase ──────────────────────────────────
    let insertedData: any[] = [];
    if (moviesToInsert.length > 0) {
      logProgress(`💾 Inserting ${moviesToInsert.length} item(s) into database…`);
      const { data, error } = await supabase
        .from("Movie")
        .insert(moviesToInsert)
        .select();

      if (error) throw new Error(error.message);
      insertedData = data || [];

      // Pre-populate the Episode table for any TV Series inserted
      if (insertedData.length > 0) {
        const episodesToInsert = [];
        for (const movie of insertedData) {
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
                      videoUrl: "",
                    });
                  }
                }
              }
            } catch (e) {
              console.error(`Failed to pre-populate episodes for seeded series "${movie.title}":`, e);
            }
          }
        }
        if (episodesToInsert.length > 0) {
          logProgress(`  📦 Pre-populating ${episodesToInsert.length} episode slots for series…`);
          const { error: epError } = await supabase.from("Episode").insert(episodesToInsert);
          if (epError) console.error("Failed to insert seeded episodes:", epError.message);
        }
      }
    }

    logProgress(`🎉 Done! Successfully seeded ${insertedData.length} new title(s).`);
    res.end();
  } catch (err: any) {
    logProgress(`❌ Error: ${err.message}`);
    if (browser) await browser.close().catch(() => {});
    res.end();
  }
}
