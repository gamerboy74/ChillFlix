/**
 * lib/tmdb.ts
 * TMDB (The Movie Database) API helper
 *
 * Get a FREE API key at: https://www.themoviedb.org/settings/api
 * Add to .env.local:  TMDB_API_KEY=your_key_here
 *
 * TMDB image base: https://image.tmdb.org/t/p/{size}/{path}
 * Sizes: w92, w154, w185, w342, w500, w780, original
 */

const TMDB_BASE   = "https://api.tmdb.org/3";
const TMDB_IMG    = "https://image.tmdb.org/t/p";
const API_KEY     = process.env.TMDB_API_KEY ?? "";

// ─── Image URL helpers ───────────────────────────────────────────────────────

export function tmdbPoster(path: string | null, size = "w500"): string {
  if (!path) return "";
  return `${TMDB_IMG}/${size}${path}`;
}

export function tmdbBackdrop(path: string | null, size = "original"): string {
  if (!path) return "";
  return `${TMDB_IMG}/${size}${path}`;
}

// ─── Shared fetch wrapper ────────────────────────────────────────────────────

async function tmdbFetch(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  if (!API_KEY) throw new Error("TMDB_API_KEY is not set in .env.local");

  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set("language", "en-US");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      // Send key in Authorization header — keeps it out of logs / CDN cache keys
      Authorization: `Bearer ${API_KEY}`,
    },
    next: { revalidate: 3600 }, // cache for 1 hour in Next.js
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`TMDB ${res.status}: ${err.status_message ?? res.statusText}`);
  }

  return res.json();
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TmdbSearchResult {
  id:            number;
  title?:        string;   // movies
  name?:         string;   // TV shows
  overview:      string;
  poster_path:   string | null;
  backdrop_path: string | null;
  release_date?: string;   // movies
  first_air_date?: string; // TV
  vote_average:  number;
  genre_ids:     number[];
  media_type?:   "movie" | "tv";
}

export interface TmdbMovieDetail {
  id:             number;
  title:          string;
  overview:       string;
  poster_path:    string | null;
  backdrop_path:  string | null;
  release_date:   string;
  vote_average:   number;
  runtime:        number | null;
  genres:         { id: number; name: string }[];
  status:         string;
  tagline:        string;
  imdb_id:        string | null;
}

export interface TmdbTvDetail {
  id:               number;
  name:             string;
  overview:         string;
  poster_path:      string | null;
  backdrop_path:    string | null;
  first_air_date:   string;
  vote_average:     number;
  number_of_episodes: number;
  number_of_seasons:  number;
  genres:           { id: number; name: string }[];
  status:           string;
  tagline:          string;
  episode_run_time: number[];
  seasons?:         { season_number: number; episode_count: number }[];
}

export interface ChillFlixMoviePayload {
  title:          string;
  description:    string;
  thumbnailUrl:   string;   // backdrop (landscape) — best for cards/billboard
  posterUrl:      string;   // portrait poster
  genre:          string;
  duration:       string;
  year:           string;
  rating:         string;
  tmdbId:         number;
  type:           "movie" | "series";
  videoUrl:       string;   // cinevo watch URL — set by caller or left blank
  onlyOnChillFlix: boolean;
  seasonsData?:   string | null;
}

// ─── Genre map (TMDB genre IDs → names) ─────────────────────────────────────

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};

function resolveGenres(ids: number[], nameList?: { id: number; name: string }[]): string {
  if (nameList?.length) return nameList.slice(0, 3).map((g) => g.name).join(", ");
  return ids.slice(0, 2).map((id) => GENRE_MAP[id] ?? "Drama").join(", ") || "Drama";
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Search for movies and TV shows by title.
 * Returns a combined multi-search result.
 */
export async function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch("/search/multi", { query, include_adult: "false", page: "1" });
  // Filter to only movies and TV shows, exclude people/collections
  return (data.results ?? []).filter(
    (r: any) => r.media_type === "movie" || r.media_type === "tv"
  );
}

/**
 * Search movies only.
 */
export async function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch("/search/movie", { query, include_adult: "false" });
  return (data.results ?? []).map((r: any) => ({ ...r, media_type: "movie" as const }));
}

/**
 * Search TV shows only.
 */
export async function searchTv(query: string): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch("/search/tv", { query, include_adult: "false" });
  return (data.results ?? []).map((r: any) => ({ ...r, media_type: "tv" as const }));
}

/**
 * Fetch full movie details by TMDB ID.
 */
export async function getMovieDetails(tmdbId: number): Promise<ChillFlixMoviePayload> {
  const d: TmdbMovieDetail = await tmdbFetch(`/movie/${tmdbId}`);
  const year = d.release_date?.slice(0, 4) ?? "";
  const runtime = d.runtime ? `${d.runtime} min` : "N/A";
  return {
    title:          d.title,
    description:    d.overview || `Watch ${d.title} on ChillFlix.`,
    thumbnailUrl:   tmdbBackdrop(d.backdrop_path, "original"),
    posterUrl:      tmdbPoster(d.poster_path, "w500"),
    genre:          resolveGenres([], d.genres),
    duration:       runtime,
    year,
    rating:         d.vote_average ? d.vote_average.toFixed(1) : "N/A",
    tmdbId:         d.id,
    type:           "movie",
    videoUrl:       "",
    onlyOnChillFlix: false,
  };
}

/**
 * Fetch full TV show details by TMDB ID.
 */
export async function getTvDetails(tmdbId: number): Promise<ChillFlixMoviePayload> {
  const d: TmdbTvDetail = await tmdbFetch(`/tv/${tmdbId}`);
  const year = d.first_air_date?.slice(0, 4) ?? "";
  const avgRuntime = d.episode_run_time?.[0];
  const duration = d.number_of_episodes
    ? `${d.number_of_episodes} Episodes`
    : avgRuntime
    ? `~${avgRuntime} min/ep`
    : "N/A";

  const seasonsData = d.seasons
    ? JSON.stringify(
        d.seasons
          .filter((s: any) => s.season_number > 0)
          .map((s: any) => ({
            seasonNumber: s.season_number,
            episodeCount: s.episode_count,
          }))
      )
    : null;

  return {
    title:          d.name,
    description:    d.overview || `Watch ${d.name} on ChillFlix.`,
    thumbnailUrl:   tmdbBackdrop(d.backdrop_path, "original"),
    posterUrl:      tmdbPoster(d.poster_path, "w500"),
    genre:          resolveGenres([], d.genres),
    duration,
    year,
    rating:         d.vote_average ? d.vote_average.toFixed(1) : "N/A",
    tmdbId:         d.id,
    type:           "series",
    videoUrl:       "",
    onlyOnChillFlix: false,
    seasonsData,
  };
}

/**
 * Get popular movies (for bulk seeding without a specific title).
 */
export async function getPopularMovies(page = 1): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch("/movie/popular", { page: String(page) });
  return (data.results ?? []).map((r: any) => ({ ...r, media_type: "movie" as const }));
}

/**
 * Get popular TV shows.
 */
export async function getPopularTv(page = 1): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch("/tv/popular", { page: String(page) });
  return (data.results ?? []).map((r: any) => ({ ...r, media_type: "tv" as const }));
}

/**
 * Get trending content (movies + TV) for today or this week.
 */
export async function getTrending(timeWindow: "day" | "week" = "week"): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch(`/trending/all/${timeWindow}`);
  return (data.results ?? []).filter(
    (r: any) => r.media_type === "movie" || r.media_type === "tv"
  );
}

/**
 * Fetch credits (cast & crew) for a movie or TV show.
 */
export async function getCredits(tmdbId: number, type: "movie" | "series"): Promise<any> {
  const endpoint = type === "series" ? `/tv/${tmdbId}/credits` : `/movie/${tmdbId}/credits`;
  try {
    return await tmdbFetch(endpoint);
  } catch (e) {
    console.error(`Failed to fetch credits for ${type} ${tmdbId}:`, e);
    return { cast: [], crew: [] };
  }
}

/**
 * Fetch videos (trailers, clips) for a movie or TV show.
 */
export async function getVideos(tmdbId: number, type: "movie" | "series"): Promise<any> {
  const endpoint = type === "series" ? `/tv/${tmdbId}/videos` : `/movie/${tmdbId}/videos`;
  try {
    return await tmdbFetch(endpoint);
  } catch (e) {
    console.error(`Failed to fetch videos for ${type} ${tmdbId}:`, e);
    return { results: [] };
  }
}

/**
 * Search and resolve TMDB details, credits, and videos by matching title and type.
 */
export async function getMoreDetailsByTitle(title: string, type: "movie" | "series"): Promise<any> {
  try {
    const searchResults = type === "series" ? await searchTv(title) : await searchMovies(title);
    if (!searchResults || searchResults.length === 0) return null;

    // Try to find the exact match or closest title match
    const match = searchResults.find((r: any) => {
      const itemTitle = r.title || r.name || "";
      return itemTitle.toLowerCase() === title.toLowerCase();
    }) || searchResults[0];

    const tmdbId = match.id;
    const detailPromise = type === "series" ? tmdbFetch(`/tv/${tmdbId}`) : tmdbFetch(`/movie/${tmdbId}`);
    const creditsPromise = getCredits(tmdbId, type);
    const videosPromise = getVideos(tmdbId, type);

    const [details, credits, videos] = await Promise.all([
      detailPromise.catch(() => null),
      creditsPromise.catch(() => ({ cast: [], crew: [] })),
      videosPromise.catch(() => ({ results: [] })),
    ]);

    if (!details) return null;

    // Extract directors / creators
    let director = "";
    if (type === "series") {
      director = details.created_by?.map((c: any) => c.name).join(", ") || "";
    } else {
      director = credits.crew?.filter((c: any) => c.job === "Director").map((c: any) => c.name).join(", ") || "";
    }

    // Extract writers / screenplay
    const writers = credits.crew?.filter((c: any) => c.job === "Writer" || c.job === "Screenplay" || c.job === "Novel").map((c: any) => c.name).join(", ") || "";

    // Find official trailer on YouTube
    const trailer = videos.results?.find(
      (v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
    );

    return {
      tmdbId,
      tagline: details.tagline || "",
      posterUrl: details.poster_path ? tmdbPoster(details.poster_path, "w500") : null,
      cast: credits.cast?.slice(0, 8).map((c: any) => ({
        name: c.name,
        character: c.character,
        profilePath: c.profile_path ? tmdbPoster(c.profile_path, "w185") : null,
      })) || [],
      director,
      writers,
      status: details.status || "",
      rating: details.vote_average ? details.vote_average.toFixed(1) : "N/A",
      voteCount: details.vote_count || 0,
      popularity: details.popularity ? Math.round(details.popularity) : null,
      budget: details.budget ? `$${(details.budget / 1000000).toFixed(1)}M` : null,
      revenue: details.revenue ? `$${(details.revenue / 1000000).toFixed(1)}M` : null,
      trailerUrl: trailer ? `https://www.youtube.com/embed/${trailer.key}` : null,
      productionCompanies: details.production_companies?.slice(0, 3).map((c: any) => c.name).join(", ") || "",
    };
  } catch (err) {
    console.error("Error in getMoreDetailsByTitle:", err);
    return null;
  }
}
