import { chromium } from "playwright";
import supabase from "./supabase";

// ─────────────────────────────────────────────────────────────────────────────
// Domain Resolver — handles Cinevo's frequent domain changes
// Stores the resolved domain in Supabase config table (or falls back to env)
// ─────────────────────────────────────────────────────────────────────────────

const CINEVO_DOMAIN_KEY = "cinevo_base_url";
const FALLBACK_DOMAINS = [
  "https://cinevo.us",
  "https://cinevo.pro",
  "https://cinevo.vip",
  "https://www.cinevo.nl",
];

let _resolvedDomain: string | null = null;
let _domainResolvedAt = 0;
const DOMAIN_TTL_MS = 30 * 60 * 1000; // re-check every 30 min

export async function getCinevoBaseUrl(): Promise<string> {
  // Return cached value if still fresh
  if (_resolvedDomain && Date.now() - _domainResolvedAt < DOMAIN_TTL_MS) {
    return _resolvedDomain;
  }

  // 1. Check env override first (admin can set CINEVO_BASE_URL in .env.local)
  if (process.env.CINEVO_BASE_URL) {
    _resolvedDomain = process.env.CINEVO_BASE_URL.replace(/\/$/, "");
    _domainResolvedAt = Date.now();
    return _resolvedDomain;
  }

  // 2. Check Supabase config table for a stored override
  try {
    const { data } = await supabase
      .from("AppConfig")
      .select("value")
      .eq("key", CINEVO_DOMAIN_KEY)
      .maybeSingle();

    if (data?.value) {
      const resolved = data.value.replace(/\/$/, "");
      _resolvedDomain = resolved;
      _domainResolvedAt = Date.now();
      console.log(`🌐 [Cinevo] Using stored domain: ${resolved}`);
      return resolved;
    }
  } catch (_) {
    // AppConfig table might not exist yet — that's ok
  }

  // 3. Fallback: try each known domain with a HEAD request
  for (const domain of FALLBACK_DOMAINS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${domain}/`, { method: "HEAD", signal: controller.signal });
      clearTimeout(timer);
      if (res.ok || res.status < 500) {
        _resolvedDomain = domain;
        _domainResolvedAt = Date.now();
        console.log(`✅ [Cinevo] Resolved domain: ${domain}`);
        return _resolvedDomain;
      }
    } catch (_) {
      console.warn(`⚠️ [Cinevo] Domain ${domain} unreachable`);
    }
  }

  // Hard fallback
  _resolvedDomain = FALLBACK_DOMAINS[0];
  _domainResolvedAt = Date.now();
  return _resolvedDomain;
}

/** Call this from the admin panel to update the domain in Supabase */
export async function setCinevoBaseUrl(newUrl: string): Promise<void> {
  const clean = newUrl.replace(/\/$/, "");
  _resolvedDomain = clean;
  _domainResolvedAt = Date.now();
  try {
    await supabase
      .from("AppConfig")
      .upsert({ key: CINEVO_DOMAIN_KEY, value: clean }, { onConflict: "key" });
  } catch (e: any) {
    console.warn("⚠️ [Cinevo] Could not persist domain to AppConfig:", e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&apos;/g, "'");
}

export function getCoreTitle(title: string): string {
  if (!title) return "";
  return decodeHtmlEntities(title)
    .toLowerCase()
    .replace(/(?:season\s*\d+|s\d+|\d+(?:nd|rd|th|st)?\s*season)/gi, "")
    .replace(/\b(?:movie|film|ova|ona|special|part)\b\s*\d*/gi, "")
    .replace(/\b(?:i{1,3}|iv|v|vi{1,3}|ix|x)\b\s*$/i, "")
    .replace(/\b\d+\b\s*$/gi, "")
    .replace(/\b(?:dub|sub|uncensored|uncut|tv|dual[- ]audio)\b/g, " ")
    .replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ")
    .replace(/[^a-z0-9]/g, "").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Metadata Scraper — fetches real data from a Cinevo detail/watch page
// ─────────────────────────────────────────────────────────────────────────────

export interface CinevoMetadata {
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  genre: string;
  duration: string;
  rating: string;
  year: string;
  type: "movie" | "series";
}

export async function scrapeCinevoMetadata(page: any, watchUrl: string): Promise<CinevoMetadata | null> {
  try {
    console.log(`📄 [Metadata] Scraping detail page: ${watchUrl}`);
    await page.goto(watchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2500));

    const meta = await page.evaluate((): any => {
      // ── Title ──────────────────────────────────────────────────────────────
      const titleEl =
        document.querySelector("h1") ||
        document.querySelector('[class*="title"]') ||
        document.querySelector("title");
      let title = titleEl?.textContent?.trim() || document.title || "";
      // Clean up "Watch X Online" / "X - Cinevo" patterns
      title = title
        .replace(/\s*[-|]\s*(cinevo|watch online|free|streaming).*/gi, "")
        .replace(/^watch\s+/i, "")
        .replace(/\s+online.*$/i, "")
        .trim();

      // ── Description ────────────────────────────────────────────────────────
      const descMeta =
        document.querySelector('meta[name="description"]') ||
        document.querySelector('meta[property="og:description"]');
      const descEl =
        document.querySelector('[class*="description"]') ||
        document.querySelector('[class*="synopsis"]') ||
        document.querySelector('[class*="overview"]') ||
        document.querySelector("p");
      let description =
        descMeta?.getAttribute("content") ||
        descEl?.textContent?.trim() ||
        "";
      if (description.length > 600) description = description.slice(0, 600).trim() + "…";

      // ── Poster / Backdrop ──────────────────────────────────────────────────
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";
      const posterImgEl =
        document.querySelector('[class*="poster"] img') ||
        document.querySelector('[class*="thumbnail"] img') ||
        document.querySelector('[class*="banner"] img') ||
        document.querySelector("img[src*=\"tmdb\"]") ||
        document.querySelector("img[src*=\"poster\"]") ||
        document.querySelector("img[alt]");
      const posterUrl = posterImgEl?.getAttribute("src") || ogImage || "";
      const backdropUrl = ogImage || posterUrl;

      // ── Genre ──────────────────────────────────────────────────────────────
      const genreEl =
        document.querySelector('[class*="genre"]') ||
        document.querySelector('a[href*="/genre/"]');
      const genreLinks = [...document.querySelectorAll('a[href*="/genre/"]')];
      const genre =
        genreLinks.slice(0, 2).map((a) => a.textContent?.trim()).filter(Boolean).join(", ") ||
        genreEl?.textContent?.trim() ||
        "Drama";

      // ── Duration ──────────────────────────────────────────────────────────
      const durationEl = document.querySelector('[class*="runtime"], [class*="duration"], [class*="length"]');
      const allText = document.body?.innerText || "";
      const durationMatch = allText.match(/(\d{2,3})\s*(?:min|minute|mins)/i);
      const epMatch = allText.match(/(\d+)\s*(?:episodes?|eps?)/i);
      const duration =
        durationEl?.textContent?.trim() ||
        (durationMatch ? `${durationMatch[1]} min` : null) ||
        (epMatch ? `${epMatch[1]} Episodes` : "N/A");

      // ── Year ───────────────────────────────────────────────────────────────
      const yearMatch = allText.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch?.[0] || String(new Date().getFullYear());

      // ── Rating ─────────────────────────────────────────────────────────────
      const ratingEl = document.querySelector('[class*="rating"], [class*="score"], [class*="imdb"]');
      const ratingMatch = allText.match(/(?:imdb|rating|score)[:\s]*(\d+\.?\d*)/i);
      const rating =
        ratingEl?.textContent?.trim() ||
        (ratingMatch ? ratingMatch[1] : "N/A");

      // ── Type (movie vs series) ─────────────────────────────────────────────
      const isTv =
        window.location.href.includes("/tv/") ||
        window.location.href.includes("/series/") ||
        !!document.querySelector('[class*="episode"], [class*="season"]') ||
        !!epMatch;

      return { title, description, posterUrl, backdropUrl, genre, duration, year, rating, isTv };
    });

    if (!meta.title) {
      console.warn("⚠️ [Metadata] Could not extract title from page");
      return null;
    }

    const BASE = await getCinevoBaseUrl();
    const normalize = (url: string) => {
      if (!url) return "";
      if (url.startsWith("http")) return url;
      return `${BASE}${url.startsWith("/") ? "" : "/"}${url}`;
    };

    return {
      title: decodeHtmlEntities(meta.title),
      description: decodeHtmlEntities(meta.description) || `Stream "${meta.title}" on ChillFlix.`,
      posterUrl: normalize(meta.posterUrl),
      backdropUrl: normalize(meta.backdropUrl),
      genre: decodeHtmlEntities(meta.genre) || "Drama",
      duration: meta.duration || "N/A",
      rating: meta.rating || "N/A",
      year: meta.year,
      type: meta.isTv ? "series" : "movie",
    };
  } catch (err: any) {
    console.error("❌ [Metadata] Failed to scrape metadata:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CinevoScraperService
// ─────────────────────────────────────────────────────────────────────────────

export class CinevoScraperService {
  static USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  // ── URL helpers (dynamic BASE_URL) ────────────────────────────────────────

  static async getBaseUrl(): Promise<string> {
    return getCinevoBaseUrl();
  }

  static async normalizeUrl(u: string): Promise<string> {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    const base = await getCinevoBaseUrl();
    return `${base}${u.startsWith("/") ? "" : "/"}${u}`;
  }

  static inferLangFromLabel(label: string, fallback = "sub"): string {
    const n = (label || "").toLowerCase();
    if (n.includes("dub")) return "dub";
    if (n.includes("hindi") || n.includes("french") || n.includes("italian") ||
        n.includes("spanish") || n.includes("german") || n.includes("portuguese")) return "dub";
    if (n.includes("sub") || n.includes("multi")) return "sub";
    return fallback;
  }

  static shouldKeepServer(label: string): boolean {
    const n = (label || "").toLowerCase();
    if (n.includes("hindi")) return true;
    const ignored = ["french", "italian", "spanish", "german", "portuguese"];
    if (ignored.some((lang) => n.includes(lang))) return false;
    return true;
  }

  static slugScore(slug: string, variant: string): number {
    const slugCore = slug.replace(/-\d+\/?$/, "").replace(/-/g, "").toLowerCase();
    const varCore = getCoreTitle(variant);
    if (!slugCore || !varCore) return 0;
    if (slugCore === varCore) return 1.0;
    if (slugCore.includes(varCore) || varCore.includes(slugCore)) {
      return Math.min(slugCore.length, varCore.length) / Math.max(slugCore.length, varCore.length);
    }
    return 0;
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  static async searchAnimeUrl(page: any, title: string, options: any = {}): Promise<string> {
    const BASE = await getCinevoBaseUrl();
    const dbAnimeId = options.dbAnimeId;
    const titleVariants = new Set<string>([title]);

    if (dbAnimeId) {
      try {
        const { data } = await supabase
          .from("anime")
          .select("title, title_romaji, title_english, title_synonyms")
          .eq("id", dbAnimeId)
          .maybeSingle();
        if (data) {
          [data.title, data.title_romaji, data.title_english].forEach((t) => {
            if (t) titleVariants.add(t);
          });
          if (Array.isArray(data.title_synonyms)) {
            data.title_synonyms.forEach((s) => {
              if (s && /^[a-zA-Z0-9\s\-':!,.&]+$/.test(s)) titleVariants.add(s);
            });
          }
        }
      } catch (e: any) {
        console.warn("⚠️ [Cinevo] DB variant fetch failed:", e.message);
      }
    }

    for (const keyword of titleVariants) {
      try {
        const searchUrl = `${BASE}/search?q=${encodeURIComponent(keyword)}`;
        console.log(`🔍 [Cinevo] Searching: ${searchUrl}`);

        await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 40000 });
        await new Promise((resolve) => setTimeout(resolve, 3500));

        try {
          await page.waitForSelector('a[href*="/tv/"], a[href*="/movie/"], a[href*="/watch/"]', { timeout: 8000 });
        } catch (_) {}

        const links = await page.evaluate(() => {
          const seen = new Set();
          const results: string[] = [];
          document.querySelectorAll("a[href]").forEach((a) => {
            const href = a.getAttribute("href") || "";
            if (seen.has(href)) return;
            if (!href.includes("/tv/") && !href.includes("/movie/") && !href.includes("/watch/")) return;
            if (href.includes("/discover") || href.includes("/search") || href === "/" || href === "#") return;
            seen.add(href);
            results.push(href);
          });
          return results;
        });

        console.log(`📋 [Cinevo] ${links.length} content links for "${keyword}"`);
        if (links.length === 0) continue;

        let bestHref = null;
        let bestScore = 0;

        for (const href of links) {
          const slugMatch = href.match(/\/(?:watch\/)?(?:tv|movie)\/([^/?#]+)/i);
          if (!slugMatch) continue;
          const score = this.slugScore(slugMatch[1], keyword);
          if (score > bestScore) { bestScore = score; bestHref = href; }
        }

        if (bestScore >= 0.4 && bestHref) {
          const slugPart = bestHref.match(/\/(tv|movie)\/([^/?#]+)/i)?.[2];
          const watchVariant = slugPart
            ? links.find((h: string) => h.includes("/watch/") && h.includes(slugPart))
            : null;

          const chosen = watchVariant || bestHref;
          const resolved = chosen.startsWith("http") ? chosen : `${BASE}${chosen}`;
          console.log(`✅ [Cinevo] Match (score ${bestScore.toFixed(2)}): ${resolved}`);
          return resolved;
        }

        console.warn(`⚠️ [Cinevo] Low confidence for "${keyword}" (best: ${bestScore.toFixed(2)})`);
      } catch (err: any) {
        console.warn(`⚠️ [Cinevo] Search "${keyword}" failed:`, err.message);
      }
    }

    throw new Error(`[Cinevo] Could not find "${title}" in Cinevo's library.`);
  }

  // ── Resolve watch URL ──────────────────────────────────────────────────────

  static async resolveWatchUrlWithPage(page: any, inputUrl: string, episodeNumber = 1, options: any = {}): Promise<string> {
    if (!inputUrl) throw new Error("[Cinevo] inputUrl required");
    const BASE = await getCinevoBaseUrl();

    // Replace any hardcoded cinevo domain with current resolved one
    let normalized = inputUrl;
    if (/^https?:\/\//i.test(inputUrl)) {
      // Swap domain in case cinevo changed it
      normalized = inputUrl.replace(/^https?:\/\/[^/]+/i, BASE);
    }

    const isUrl = /^https?:\/\//i.test(normalized) || normalized.includes("cinevo");
    const candidateUrl = isUrl
      ? normalized
      : await this.searchAnimeUrl(page, inputUrl, options);

    if (candidateUrl.includes("/watch/")) {
      const u = new URL(candidateUrl);
      u.searchParams.set("ep", String(episodeNumber));
      u.searchParams.set("episode", String(episodeNumber));
      if (options.season) u.searchParams.set("season", String(options.season));
      return u.toString();
    }

    const m = candidateUrl.match(/\/(tv|movie)\/([^/?#]+)/i);
    if (m) {
      const watchUrl = new URL(`${BASE}/watch/${m[1]}/${m[2]}`);
      if (m[1] === "tv") {
        watchUrl.searchParams.set("ep", String(episodeNumber));
        watchUrl.searchParams.set("episode", String(episodeNumber));
        if (options.season) watchUrl.searchParams.set("season", String(options.season));
      }
      return watchUrl.toString();
    }

    throw new Error(`[Cinevo] Cannot resolve watch URL from: ${candidateUrl}`);
  }

  // ── Collect ALL server sources from the watch page ─────────────────────────

  static async collectServerSources(page: any, requestedLang = "sub") {
    const sources: any[] = [];
    const seenUrls = new Set<string>();

    const isValidEmbed = (url: string) => {
      if (!url || url.trim() === "") return false;
      const u = url.toLowerCase();
      return !u.includes("about:blank") && !u.includes("disqus") &&
             !u.includes("google.com") && !u.includes("doubleclick") && u.startsWith("http");
    };

    const getIframeSrc = async () => {
      return page.evaluate(() => {
        const iframes = [...document.querySelectorAll("iframe")];
        const titledIf = iframes.find((f) => f.title && f.src && f.src.startsWith("http"));
        const anySrc = iframes.find((f) => f.src && f.src.startsWith("http"));
        return (titledIf || anySrc)?.src || null;
      });
    };

    const addSource = (label: string, iframeUrl: string, lang: string) => {
      if (!iframeUrl || !isValidEmbed(iframeUrl) || seenUrls.has(iframeUrl)) return false;
      seenUrls.add(iframeUrl);
      sources.push({ label, iframeUrl, lang, playableUrl: iframeUrl });
      console.log(`  ✨ [Cinevo] "${label}" [${lang}]: ${iframeUrl}`);
      return true;
    };

    try {
      await page.waitForSelector('button[role="combobox"]', { timeout: 15000 });
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (e: any) {
      console.warn("  ⚠️ [Cinevo] Timeout waiting for combobox:", e.message);
    }

    const initial = await getIframeSrc();
    if (initial) addSource("VidCore (active)", initial, requestedLang);

    console.log("  🎛️  [Cinevo] Opening server combobox...");
    const comboboxOpened = await page.evaluate(() => {
      const btn = document.querySelector('button[role="combobox"]') as HTMLButtonElement;
      if (!btn) return false;
      btn.focus();
      ["pointerdown", "mousedown", "click", "pointerup", "mouseup"].forEach((type) => {
        btn.dispatchEvent(new (type.startsWith("pointer") ? PointerEvent : MouseEvent)(type, {
          bubbles: true, cancelable: true, ...(type.startsWith("pointer") ? { pointerId: 1 } : {}),
        }));
      });
      return true;
    });

    if (!comboboxOpened) {
      console.warn("  ⚠️ [Cinevo] Combobox button not found — skipping server enumeration");
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      let options = await page.evaluate(() =>
        [...document.querySelectorAll('[role="option"]')].map((el, idx) => ({
          idx,
          label: el.textContent?.trim().replace(/\s+/g, " ") || `Server ${idx}`,
          checked: el.getAttribute("data-state") === "checked",
        }))
      );

      if (options.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        options = await page.evaluate(() =>
          [...document.querySelectorAll('[role="option"]')].map((el, idx) => ({
            idx,
            label: el.textContent?.trim().replace(/\s+/g, " ") || `Server ${idx}`,
            checked: el.getAttribute("data-state") === "checked",
          }))
        );
      }

      console.log(`  🎛️  [Cinevo] ${options.length} server options: ${(options as any[]).map((o) => `"${o.label}"`).join(", ")}`);

      for (const opt of options) {
        if (opt.checked || !this.shouldKeepServer(opt.label)) continue;

        const lang = this.inferLangFromLabel(opt.label, requestedLang);
        console.log(`  👉 [Cinevo] Selecting: "${opt.label}" [${lang}]`);

        await page.evaluate(() => {
          const btn = document.querySelector('button[role="combobox"]');
          if (!btn || btn.getAttribute("aria-expanded") === "true") return;
          ["pointerdown", "mousedown", "click", "pointerup"].forEach((type) => {
            btn.dispatchEvent(new (type.startsWith("pointer") ? PointerEvent : MouseEvent)(type, {
              bubbles: true, cancelable: true, ...(type.startsWith("pointer") ? { pointerId: 1 } : {}),
            }));
          });
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));

        const clicked = await page.evaluate((optIdx: number) => {
          const opts = [...document.querySelectorAll('[role="option"]')];
          const target = opts[optIdx] as HTMLElement;
          if (!target) return false;
          target.focus();
          ["pointerdown", "mousedown", "click", "pointerup", "mouseup"].forEach((type) => {
            target.dispatchEvent(new (type.startsWith("pointer") ? PointerEvent : MouseEvent)(type, {
              bubbles: true, cancelable: true, ...(type.startsWith("pointer") ? { pointerId: 1 } : {}),
            }));
          });
          return true;
        }, opt.idx);

        if (!clicked) continue;
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const iframeSrc = await getIframeSrc();
        if (iframeSrc) addSource(opt.label, iframeSrc, lang);
      }
    }

    // Try Cinevo Flash tab
    console.log("  ⚡ [Cinevo] Trying Flash tab...");
    await page.evaluate(() => {
      const flashBtn = document.querySelector('[id*="trigger-cinevo"], button[aria-controls*="content-cinevo"]');
      if (flashBtn) {
        ["mousedown", "click"].forEach((t) => flashBtn.dispatchEvent(new MouseEvent(t, { bubbles: true })));
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const flashIframe = await getIframeSrc();
    if (flashIframe && flashIframe !== initial) {
      addSource("Cinevo Flash", flashIframe, requestedLang);
    }

    return { sources, streamUrl: sources[0]?.iframeUrl || null };
  }

  // ── Main scrape entry point ────────────────────────────────────────────────

  static async scrapeAnimeEpisode(inputUrl: string, episodeNumber = 1, options: any = {}) {
    const { timeout = 40000, retries = 2 } = options;
    const requestedLang = options.lang === "dub" ? "dub" : "sub";
    const BASE = await getCinevoBaseUrl();

    console.log(`🎬 [Cinevo] scrape: "${inputUrl}" ep ${episodeNumber} [${requestedLang}]`);

    let lastError: any = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      let context: any = null;
      try {
        let browser: any;
        if (process.env.BROWSERLESS_API_KEY) {
          browser = await chromium.connectOverCDP(`wss://chrome.browserless.io?token=${process.env.BROWSERLESS_API_KEY}`);
        } else {
          browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
        }

        context = await browser.newContext({
          userAgent: this.USER_AGENT,
          viewport: { width: 1280, height: 900 },
          bypassCSP: true,
          javaScriptEnabled: true,
          extraHTTPHeaders: {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            DNT: "1",
            Connection: "keep-alive",
          },
        });

        const page = await context.newPage();
        await page.addInitScript(() => { try { (window as any).open = () => null; } catch (_) {} });

        // Block top-level frame redirects away from current cinevo domain
        await page.route("**/*", async (route: any) => {
          const req = route.request();
          if (req.isNavigationRequest() && req.frame() === page.mainFrame()) {
            const url = req.url();
            const currentBase = await getCinevoBaseUrl().catch(() => "cinevo");
            const domain = new URL(currentBase).hostname;
            if (url.includes(domain) || url.startsWith("about:") || url.startsWith("data:")) {
              route.continue();
            } else {
              console.log(`  🚫 [Cinevo] Blocked redirect to: ${url}`);
              route.abort();
            }
          } else {
            route.continue();
          }
        });

        const watchUrl = await this.resolveWatchUrlWithPage(page, inputUrl, episodeNumber, options);
        console.log(`🔗 [Cinevo] Watch URL: ${watchUrl}`);

        await page.goto(watchUrl, { waitUntil: "domcontentloaded", timeout });
        await new Promise((resolve) => setTimeout(resolve, 4000));

        const finalUrl = page.url();
        if (finalUrl === `${BASE}/` || finalUrl === BASE) {
          throw new Error(`[Cinevo] Redirected to homepage — ep ${episodeNumber} unavailable`);
        }

        const pageTitle = await page.title().catch(() => "");
        const bodyText = await page.evaluate(() => (document.body?.innerText || "").slice(0, 300)).catch(() => "");
        if (pageTitle.toLowerCase().includes("not found") || bodyText.toLowerCase().includes("page not found")) {
          throw new Error(`[Cinevo] 404: ${watchUrl}`);
        }

        const { sources, streamUrl } = await this.collectServerSources(page, requestedLang);

        await context.close();
        await browser.close();

        if (!streamUrl || sources.length === 0) {
          throw new Error("[Cinevo] No video sources found");
        }

        console.log(`✅ [Cinevo] ${sources.length} server(s) scraped for ep ${episodeNumber}`);
        return {
          success: true,
          watchUrl,
          streamUrl,
          episodeData: { inputUrl, watchUrl, sources, sourceCount: sources.length, episodeNumber, lang: requestedLang },
        };
      } catch (error: any) {
        lastError = error;
        console.error(`❌ [Cinevo] Attempt ${attempt}/${retries}: ${error.message}`);
        if (context) await context.close().catch(() => {});
        if (attempt < retries) {
          console.log(`⏳ [Cinevo] Retrying in 3s...`);
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }

    return { success: false, error: lastError?.message || "Unknown error" };
  }

  // ── Homepage catalog scraper ───────────────────────────────────────────────

  static async scrapeHomepageMovies(page: any): Promise<any[]> {
    const BASE = await getCinevoBaseUrl();
    console.log(`🎬 [Cinevo] Navigating to homepage: ${BASE}`);
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 45000 });
    await new Promise((resolve) => setTimeout(resolve, 4000));

    const items = await page.evaluate((baseUrl: string) => {
      const results: any[] = [];
      const seenHrefs = new Set<string>();

      document.querySelectorAll('a[href*="/movie/"], a[href*="/tv/"]').forEach((a: any) => {
        const href = a.getAttribute("href") || "";
        if (href.includes("/watch/") || href.includes("/search") || href.includes("/genre") || href === "/" || href === "#") return;
        if (seenHrefs.has(href)) return;
        seenHrefs.add(href);

        const img = a.querySelector("img");
        const titleEl = a.querySelector('h2, h3, h4, p, span, .title, [class*="title"]');
        const title = titleEl?.textContent?.trim() || img?.getAttribute("alt")?.trim() || "";
        const poster = img?.getAttribute("src") || "";

        if (title) {
          results.push({
            title,
            href,
            poster: poster.startsWith("http") ? poster : (poster ? `${baseUrl}${poster.startsWith("/") ? "" : "/"}${poster}` : ""),
            isTv: href.includes("/tv/"),
          });
        }
      });

      return results;
    }, BASE);

    console.log(`📋 [Cinevo] Extracted ${items.length} items from homepage.`);
    return items;
  }
}

export default CinevoScraperService;
