import React, { useMemo, useState } from "react";
import { NextPageContext } from "next";
import { useRouter } from "next/router";
import Image from "next/image";
import Head from "next/head";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { BsFillPlayFill } from "react-icons/bs";

import Navbar from "@/components/Navbar";
import FavouriteButton from "@/components/FavouriteButton";
import MovieList from "@/components/MovieList";
import Footer from "@/components/Footer";
import supabase from "@/lib/supabase";
import { getMoreDetailsByTitle } from "@/lib/tmdb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

interface DetailsPageProps {
  movie: any;
  recommendations: any[];
  extraDetails?: any;
  episodes?: any[];
}

export async function getServerSideProps(context: NextPageContext) {
  const session = await getServerSession(
    context.req as any,
    context.res as any,
    authOptions
  );

  if (!session) {
    return {
      redirect: {
        destination: "/auth",
        permanent: false,
      },
    };
  }

  const { movieId } = context.query;

  if (typeof movieId !== "string" || !movieId) {
    return { notFound: true };
  }

  // 1. Fetch the movie itself
  const { data: movie, error } = await supabase
    .from("Movie")
    .select("*")
    .eq("id", movieId)
    .single();

  if (error || !movie) {
    return { notFound: true };
  }

  // 2. Parallelise: recommendations + episodes + TMDB — all at once
  //    Recommendations: filter by same type + overlapping genre IN the query
  //    (no more full-table fetch + client-side filter)
  const genreList = (movie.genre ?? "")
    .split(",")
    .map((g: string) => g.trim())
    .filter(Boolean);

  const recsQuery = supabase
    .from("Movie")
    .select("id, title, thumbnailUrl, genre, duration, type, onlyOnChillFlix, seasonsData")
    .neq("id", movieId)
    .eq("type", movie.type)
    .limit(12);

  // Apply genre filter if we have genres (Supabase: match any genre substring)
  const filteredRecsQuery = genreList.length > 0
    ? recsQuery.ilike("genre", `%${genreList[0]}%`)
    : recsQuery;

  const episodesQuery = movie.type === "series"
    ? supabase
        .from("Episode")
        .select("id, season, episode, title, videoUrl")
        .eq("movieId", movieId)
        .order("season", { ascending: true })
        .order("episode", { ascending: true })
    : Promise.resolve({ data: [], error: null });

  const tmdbQuery = getMoreDetailsByTitle(movie.title, movie.type).catch(() => null);

  // Fire all three in parallel
  const [recsResult, episodesResult, extraDetails] = await Promise.all([
    filteredRecsQuery,
    episodesQuery,
    tmdbQuery,
  ]);

  const recommendations = (recsResult.data ?? []).slice(0, 6);
  const episodes = episodesResult.data ?? [];

  return {
    props: {
      movie,
      recommendations,
      extraDetails: extraDetails ?? null,
      episodes,
    },
  };
}

export default function DetailsPage({ movie, recommendations, extraDetails, episodes = [] }: DetailsPageProps) {
  const router = useRouter();
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Parse seasonsData JSON string from TMDB
  const seasonsList = useMemo(() => {
    if (movie?.seasonsData) {
      try {
        const parsed = JSON.parse(movie.seasonsData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse seasonsData:", e);
      }
    }
    if (movie?.type === "series") {
      return [{ seasonNumber: 1, episodeCount: 24 }];
    }
    return [];
  }, [movie]);

  const currentSeasonInfo = useMemo(() => {
    return seasonsList.find((s: any) => s.seasonNumber === selectedSeason);
  }, [seasonsList, selectedSeason]);

  const episodeCount = currentSeasonInfo ? currentSeasonInfo.episodeCount : 0;

  const seasonEpisodes = useMemo(() => {
    const filtered = episodes.filter((ep: any) => ep.season === selectedSeason);
    
    // Fallback if episodes not populated in database yet
    if (filtered.length === 0 && episodeCount > 0) {
      return Array.from({ length: episodeCount }, (_, i) => ({
        season: selectedSeason,
        episode: i + 1,
        title: `Episode ${i + 1}`,
        videoUrl: "",
      }));
    }
    return filtered;
  }, [episodes, selectedSeason, episodeCount]);

  const handlePlayNow = () => {
    if (movie.type === "series") {
      const firstEp = seasonEpisodes[0]?.episode || 1;
      router.push(`/watch/${movie.id}?season=${selectedSeason}&episode=${firstEp}`);
    } else {
      router.push(`/watch/${movie.id}`);
    }
  };

  // Convert cast array to comma-separated string for quick summary
  const starringSummary = useMemo(() => {
    if (!extraDetails?.cast) return "";
    return extraDetails.cast
      .slice(0, 4)
      .map((c: any) => c.name)
      .join(", ");
  }, [extraDetails]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      <Head>
        <title>{`${movie.title} - Watch on ChillFlix`}</title>
        <meta name="description" content={movie.description?.slice(0, 160) || `Watch ${movie.title} on ChillFlix.`} />
        <meta name="og:title" content={`${movie.title} - Watch on ChillFlix`} />
        <meta name="og:description" content={movie.description?.slice(0, 160) || `Watch ${movie.title} on ChillFlix.`} />
        <meta name="og:image" content={movie.thumbnailUrl || ""} />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <Navbar />

      {/* Cinematic Backdrop Hero - Unified background banner */}
      <div className="relative h-[60vh] sm:h-[70vh] md:h-[80vh] w-full overflow-hidden bg-zinc-950">
        
        {/* Floating Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-24 left-4 sm:left-12 md:left-16 z-30 flex items-center gap-2 text-xs sm:text-sm text-zinc-300 hover:text-white transition font-bold bg-black/40 hover:bg-black/60 px-3.5 py-2 rounded-lg backdrop-blur-md border border-white/10"
        >
          <AiOutlineArrowLeft size={16} /> Back
        </button>

        {/* Backdrop image */}
        {movie?.thumbnailUrl && (
          <Image
            src={movie.thumbnailUrl}
            alt={movie.title}
            fill
            className={`object-cover transition-opacity duration-700 brightness-[35%] ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            priority
            sizes="100vw"
            onLoad={() => setImgLoaded(true)}
          />
        )}
        {!imgLoaded && <div className="absolute inset-0 skeleton" />}

        {/* Vignette Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/70 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/90 via-[#0a0a0a]/30 to-transparent z-10 pointer-events-none" />

        {/* Hero Bottom Info Overlay */}
        <div className="absolute inset-0 z-20 flex items-end pb-12 px-4 md:px-12 lg:px-16">
          <div className="max-w-3xl space-y-4">
            
            {/* Type badge */}
            <span className="inline-block bg-red-600/20 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded">
              {movie.type === "series" ? "TV Series" : "Movie"}
            </span>

            {/* Title */}
            <h1 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight drop-shadow-2xl">
              {movie.title}
            </h1>

            {/* Tagline */}
            {extraDetails?.tagline && (
              <p className="text-zinc-300 text-sm sm:text-base md:text-lg italic font-medium leading-snug drop-shadow-md">
                &quot;{extraDetails.tagline}&quot;
              </p>
            )}

            {/* Main Action Play & Fav Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handlePlayNow}
                className="bg-white hover:bg-zinc-200 text-black rounded-lg py-2.5 px-6 text-sm font-bold flex items-center gap-2 transition hover:scale-105 active:scale-95 shadow-lg"
              >
                <BsFillPlayFill size={20} className="text-black ml-0.5" />
                {movie.type === "series" ? "Start Watching" : "Play Movie"}
              </button>
              
              <FavouriteButton movieId={movie.id} />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: CORE DETAILS & PLOT & TRAILER */}
      <div className="px-4 md:px-12 lg:px-16 py-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left Side: Metadata & Description */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Metadata Badges */}
          <div className="flex items-center gap-3.5 flex-wrap">
            <span className="text-green-400 font-bold text-sm">
              {extraDetails?.rating && extraDetails.rating !== "N/A"
                ? `${Math.round(Number(extraDetails.rating) * 10)}% Match`
                : "98% Match"}
            </span>
            <span className="text-zinc-400 text-sm font-semibold">
              {movie.year || currentYear}
            </span>
            <span className="border border-zinc-700 bg-zinc-950/50 text-zinc-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded leading-none">
              HD
            </span>
            {movie.duration && (
              <span className="text-zinc-300 text-sm font-semibold">{movie.duration}</span>
            )}
            {extraDetails?.status && (
              <span className="text-zinc-400 text-xs font-semibold px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded">
                {extraDetails.status}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-zinc-200 text-sm sm:text-base md:text-lg leading-relaxed font-normal">
            {movie.description}
          </p>

          {/* Casting Summary */}
          <div className="pt-4 border-t border-zinc-800/60 space-y-2.5 text-sm">
            {starringSummary && (
              <div>
                <span className="text-zinc-500 font-bold mr-2">Starring:</span>
                <span className="text-zinc-300 font-medium">{starringSummary}</span>
              </div>
            )}
            {extraDetails?.director && (
              <div>
                <span className="text-zinc-500 font-bold mr-2">
                  {movie.type === "series" ? "Created By:" : "Directed By:"}
                </span>
                <span className="text-zinc-300 font-medium">{extraDetails.director}</span>
              </div>
            )}
            {movie.genre && (
              <div>
                <span className="text-zinc-500 font-bold mr-2">Genres:</span>
                <span className="text-zinc-300 font-medium">{movie.genre}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Embedded Trailer (Integrated natively instead of sub-tabs) */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-zinc-400 font-extrabold text-xs uppercase tracking-wider">
            {extraDetails?.trailerUrl ? "Official Video Trailer" : "Poster Art"}
          </h3>
          
          {extraDetails?.trailerUrl ? (
            <div className="relative aspect-video w-full rounded-xl overflow-hidden shadow-2xl border border-zinc-800 bg-black">
              <iframe
                src={extraDetails.trailerUrl}
                title={`${movie.title} Trailer`}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          ) : (
            <div className="relative aspect-[2/3] w-48 mx-auto rounded-xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-900">
              {extraDetails?.posterUrl ? (
                <Image
                  src={extraDetails.posterUrl}
                  alt={movie.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold">
                  ChillFlix
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: EPISODES (TV Series only) */}
      {movie.type === "series" && seasonsList.length > 0 && (
        <div className="border-t border-zinc-900 bg-zinc-950/20">
          <div className="px-4 md:px-12 lg:px-16 py-12 max-w-7xl mx-auto w-full space-y-6">
            <div className="flex flex-row items-center justify-between border-b border-zinc-850 pb-4">
              <div>
                <h2 className="text-white text-lg sm:text-xl md:text-2xl font-black tracking-tight">
                  Episodes
                </h2>
                <p className="text-zinc-500 text-xs mt-1">Select an episode below to stream instantly.</p>
              </div>
              
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-850 hover:border-zinc-700/80 text-white text-xs sm:text-sm font-extrabold px-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-650/50 cursor-pointer shadow-lg transition"
              >
                {seasonsList.map((s: any) => (
                  <option key={s.seasonNumber} value={s.seasonNumber}>
                    Season {s.seasonNumber} ({s.episodeCount} Episodes)
                  </option>
                ))}
              </select>
            </div>

            {/* Premium Episode Showcase Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {seasonEpisodes.map((ep: any) => {
                let mirrors: string[] = [];
                if (ep.videoUrl && ep.videoUrl.trim().startsWith("{")) {
                  try {
                    mirrors = Object.keys(JSON.parse(ep.videoUrl));
                  } catch (e) {}
                }
                const isResolved = mirrors.length > 0;

                return (
                  <div
                    key={ep.id || ep.episode}
                    onClick={() => router.push(`/watch/${movie.id}?season=${selectedSeason}&episode=${ep.episode}`)}
                    className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-zinc-900/10 hover:bg-zinc-900/40 border border-zinc-900/50 hover:border-zinc-800/80 p-3.5 rounded-xl cursor-pointer transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)]"
                  >
                    {/* Left: Thumbnail aspect-video */}
                    <div className="relative aspect-video w-full sm:w-44 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0 border border-white/[0.03]">
                      {movie.thumbnailUrl && (
                        <Image
                          src={movie.thumbnailUrl}
                          alt={ep.title || `Episode ${ep.episode}`}
                          fill
                          sizes="(max-width: 640px) 100vw, 176px"
                          className="object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition duration-500"
                        />
                      )}
                      
                      {/* Play Hover Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition duration-300">
                        <div className="w-10 h-10 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
                          <BsFillPlayFill size={24} className="ml-0.5" />
                        </div>
                      </div>

                      {/* Episode Badge */}
                      <div className="absolute bottom-2 left-2 bg-black/85 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded border border-white/5 uppercase tracking-wider">
                        EP {ep.episode}
                      </div>
                    </div>

                    {/* Right: Info */}
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex flex-row items-center gap-2.5 justify-between">
                        <h3 className="text-white font-extrabold text-xs sm:text-sm md:text-base group-hover:text-red-500 transition-colors truncate">
                          {ep.title || `Episode ${ep.episode}`}
                        </h3>
                        
                        {/* Stream Resolution Badge */}
                        <div className="flex-shrink-0">
                          {isResolved ? (
                            <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded">
                              <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                              Ready ({mirrors.length} mirrors)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Auto-Resolve
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-zinc-400 text-[10px] sm:text-xs line-clamp-2 leading-relaxed font-normal">
                        {ep.title 
                          ? `Watch Season ${selectedSeason}, Episode ${ep.episode}: "${ep.title}" on ChillFlix. Choose from multiple responsive video streams.`
                          : `Watch Season ${selectedSeason}, Episode ${ep.episode} of ${movie.title} on ChillFlix with premium automatic resolver capability.`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: STARRING CAST HEADSHOTS */}
      {extraDetails?.cast?.length > 0 && (
        <div className="border-t border-zinc-900">
          <div className="px-4 md:px-12 lg:px-16 py-12 max-w-7xl mx-auto w-full space-y-6">
            <h2 className="text-white text-lg sm:text-xl font-bold tracking-tight">
              Starring Cast
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-5">
              {extraDetails.cast.map((actor: any) => (
                <div key={actor.name} className="flex flex-col items-center text-center space-y-2 group">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-zinc-800/80 group-hover:border-red-600/40 bg-zinc-900 shadow-md transition duration-300 group-hover:scale-105">
                    {actor.profilePath ? (
                      <Image src={actor.profilePath} alt={actor.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500 font-bold text-lg">
                        {actor.name[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-white text-xs sm:text-sm font-bold line-clamp-1">{actor.name}</p>
                    <p className="text-zinc-400 text-[10px] sm:text-xs line-clamp-1 italic">{actor.character}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: RECOMMENDATIONS (More Like This) */}
      {recommendations.length > 0 && (
        <div className="py-8 border-t border-zinc-900 bg-zinc-950/35 pb-16">
          <MovieList title="More Like This" data={recommendations} />
        </div>
      )}

      {/* SECTION 5: ABOUT SPECIFICATIONS DETAIL GRID */}
      <div className="border-t border-zinc-900 bg-[#070707] pb-24">
        <div className="px-4 md:px-12 lg:px-16 py-12 max-w-7xl mx-auto w-full space-y-6">
          <h2 className="text-white text-lg sm:text-xl font-bold tracking-tight">
            About <span className="text-red-500">{movie.title}</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm bg-zinc-900/10 border border-zinc-850 p-6 sm:p-8 rounded-2xl">
            {/* Left Specs */}
            <div className="space-y-4">
              {extraDetails?.director && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
                    {movie.type === "series" ? "Creator" : "Director"}
                  </span>
                  <span className="text-white text-sm font-medium">{extraDetails.director}</span>
                </div>
              )}
              {extraDetails?.writers && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Writers</span>
                  <span className="text-white text-sm font-medium">{extraDetails.writers}</span>
                </div>
              )}
              {extraDetails?.productionCompanies && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
                    {movie.type === "series" ? "Broadcaster / Studios" : "Production Studios"}
                  </span>
                  <span className="text-white text-sm font-medium leading-relaxed">{extraDetails.productionCompanies}</span>
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Maturity Rating</span>
                <span className="text-zinc-300 text-sm font-medium">13+ (Suitable for general audiences above 13)</span>
              </div>
            </div>

            {/* Right Specs */}
            <div className="space-y-4">
              {movie.type === "series" ? (
                <>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Seasons</span>
                    <span className="text-white text-sm font-medium">{seasonsList.length} Seasons</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total Episodes</span>
                    <span className="text-white text-sm font-medium">
                      {seasonsList.reduce((acc: number, s: any) => acc + s.episodeCount, 0)} Episodes
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {extraDetails?.budget && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Production Budget</span>
                      <span className="text-white text-sm font-medium">{extraDetails.budget}</span>
                    </div>
                  )}
                  {extraDetails?.revenue && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Box Office Revenue</span>
                      <span className="text-white text-sm font-medium">{extraDetails.revenue}</span>
                    </div>
                  )}
                </>
              )}
              {extraDetails?.popularity && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Popularity Score</span>
                  <span className="text-white text-sm font-medium">{extraDetails.popularity} points</span>
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Audio Tracks & Subtitles</span>
                <span className="text-white text-sm font-medium">Audio: English (Original), Spanish, Hindi | Subtitles: English, Spanish, Hindi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
