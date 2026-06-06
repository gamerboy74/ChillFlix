import React, { useState, useEffect } from "react";
import useMovie from "@/hooks/useMovie";
import { useRouter } from "next/router";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { Loader2, Server, ChevronDown, Tv, CheckCircle2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";

const Watch = () => {
  const router = useRouter();
  const { movieId } = router.query;

  const { data: movie } = useMovie(movieId as string);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [sources, setSources] = useState<{ label: string; iframeUrl: string }[]>([]);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [loadingStream, setLoadingStream] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing video player...");
  const [statusStep, setStatusStep] = useState(0); // 0-3 progress

  // Parse seasonsData from DB dynamically
  const seasonsList = React.useMemo(() => {
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
    // Fallback: if it's a TV show, assume 1 season with 24 episodes
    if (movie?.type === "series") {
      return [{ seasonNumber: 1, episodeCount: 24 }];
    }
    return [];
  }, [movie]);

  const currentSeasonInfo = React.useMemo(() => {
    return seasonsList.find((s: any) => s.seasonNumber === season);
  }, [seasonsList, season]);

  const episodeCount = currentSeasonInfo ? currentSeasonInfo.episodeCount : 24;

  // Sync state with router query parameters if present
  useEffect(() => {
    if (router.query.season) {
      const s = parseInt(router.query.season as string);
      if (!isNaN(s)) setSeason(s);
    }
    if (router.query.episode) {
      const e = parseInt(router.query.episode as string);
      if (!isNaN(e)) setEpisode(e);
    }
  }, [router.query.season, router.query.episode]);

  // Custom Dropdown Open States
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [episodeOpen, setEpisodeOpen] = useState(false);
  const [serverOpen, setServerOpen] = useState(false);

  const getPlayableUrl = (url: string | null | undefined) => {
    if (!url) return "";
    if (url.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(url);
        const vidCoreKey = Object.keys(parsed).find(k => k.toLowerCase().includes("vidcore"));
        return vidCoreKey ? parsed[vidCoreKey] : Object.values(parsed)[0] as string;
      } catch (e) {
        return "";
      }
    }
    return url;
  };

  useEffect(() => {
    if (!movieId || !movie) return;

    const resolveStream = async () => {
      try {
        setLoadingStream(true);
        setStatusStep(0);
        setStatusMessage(`Resolving stream${movie.type === "series" ? ` · S${season}E${episode}` : ""}...`);
        await new Promise((r) => setTimeout(r, 500));

        setStatusStep(1);
        setStatusMessage("Bypassing regional restrictions...");
        await new Promise((r) => setTimeout(r, 400));

        setStatusStep(2);
        setStatusMessage("Connecting to secure node...");

        const res = await fetch(`/api/movies/stream?movieId=${movieId}&season=${season}&episode=${episode}`);
        const data = await res.json();

        if (res.ok && data.streamUrl) {
          setStatusStep(3);
          setStatusMessage("Stream link resolved!");
          await new Promise((r) => setTimeout(r, 350));
          setStreamUrl(data.streamUrl);
          setSources(
            data.sources && data.sources.length > 0
              ? data.sources
              : [{ label: "Default Server", iframeUrl: data.streamUrl }]
          );
        } else {
          throw new Error(data.error || "Failed to resolve stream link");
        }
      } catch (err: any) {
        console.error(err);
        toast.error("Stream resolution failed. Trying fallback…");
        if (movie?.videoUrl) {
          if (movie.videoUrl.trim().startsWith("{")) {
            try {
              const parsed = JSON.parse(movie.videoUrl);
              const fallback = Object.values(parsed)[0] as string;
              setStreamUrl(fallback);
              setSources(Object.entries(parsed).map(([label, iframeUrl]) => ({ label, iframeUrl: iframeUrl as string })));
            } catch (_) {
              setStreamUrl(getPlayableUrl(movie.videoUrl));
            }
          } else {
            try {
              const fallbackUrl = new URL(movie.videoUrl);
              if (movie.type === "series") {
                fallbackUrl.searchParams.set("ep", String(episode));
                fallbackUrl.searchParams.set("season", String(season));
              }
              setStreamUrl(fallbackUrl.toString());
              setSources([{ label: "Cinevo Player", iframeUrl: fallbackUrl.toString() }]);
            } catch (_) {
              setStreamUrl(movie.videoUrl);
              setSources([{ label: "Cinevo Player", iframeUrl: movie.videoUrl }]);
            }
          }
        }
      } finally {
        setLoadingStream(false);
      }
    };

    resolveStream();
  }, [movieId, movie?.id, season, episode]);

  const activeUrl = streamUrl;

  // Sync sources from movie.videoUrl if pre-scraped (movies only)
  useEffect(() => {
    if (movie?.videoUrl && movie.videoUrl.trim().startsWith("{") && sources.length === 0) {
      try {
        const parsed = JSON.parse(movie.videoUrl);
        const list = Object.entries(parsed).map(([label, iframeUrl]) => ({ label, iframeUrl: iframeUrl as string }));
        setSources(list);
      } catch (e) {}
    }
  }, [movie, sources.length]);

  const isEmbed = activeUrl && (
    activeUrl.includes("embed") ||
    activeUrl.includes("iframe") ||
    activeUrl.includes("cinevo") ||
    activeUrl.includes("vidcore") ||
    activeUrl.includes("vidsrc") ||
    !activeUrl.match(/\.(mp4|m3u8|webm|ogg)/i)
  );

  const steps = [
    "Initializing",
    "Bypassing blocks",
    "Connecting node",
    "Resolved!",
  ];

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col relative overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Header ── */}
      <nav className="fixed w-full z-40 flex flex-row items-center justify-between px-4 sm:px-6 py-3 bg-gradient-to-b from-black/95 via-black/60 to-transparent backdrop-blur-[3px]">
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0 max-w-[55%]">
          <button
            onClick={() => router.push("/main")}
            className="flex-shrink-0 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/25
              flex items-center justify-center text-white transition-all duration-200 hover:scale-105 backdrop-blur-md"
            title="Back"
          >
            <AiOutlineArrowLeft size={17} />
          </button>

          <div className="min-w-0">
            <p className="text-zinc-400 text-[9px] uppercase tracking-[0.18em] font-bold leading-none mb-0.5">Now Watching</p>
            <h1 className="text-white text-sm sm:text-base md:text-lg font-extrabold tracking-tight truncate leading-none">
              {movie?.title ?? "Loading…"}
            </h1>
          </div>

          {movie?.type === "series" && (
            <span className="flex-shrink-0 hidden sm:inline text-zinc-500 text-xs font-bold">
              S{season} · E{episode}
            </span>
          )}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Season selector */}
          {movie?.type === "series" && (
            <div className="relative">
              <button
                onClick={() => { setSeasonOpen(!seasonOpen); setEpisodeOpen(false); setServerOpen(false); }}
                className="flex items-center gap-1.5 glass rounded-xl px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10 min-w-[60px] justify-between"
              >
                <span className="text-red-400 text-[9px] font-black uppercase tracking-widest">S</span>
                <span>{season}</span>
                <ChevronDown size={10} className={`text-zinc-400 transition-transform duration-200 ${seasonOpen ? "rotate-180" : ""}`} />
              </button>
              {seasonOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSeasonOpen(false)} />
                  <div className="absolute right-0 mt-2 w-28 max-h-52 overflow-y-auto glass-card rounded-xl shadow-2xl z-20 scrollbar-hide py-1.5 animate-slide-down">
                    {seasonsList.map((s: any) => (
                      <button
                        key={s.seasonNumber}
                        onClick={() => { setSeason(s.seasonNumber); setEpisode(1); setSources([]); setStreamUrl(null); setSeasonOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                          s.seasonNumber === season ? "text-red-400 bg-red-500/10" : "text-zinc-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >Season {s.seasonNumber}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Episode selector */}
          {movie?.type === "series" && (
            <div className="relative">
              <button
                onClick={() => { setEpisodeOpen(!episodeOpen); setSeasonOpen(false); setServerOpen(false); }}
                className="flex items-center gap-1.5 glass rounded-xl px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10 min-w-[60px] justify-between"
              >
                <span className="text-red-400 text-[9px] font-black uppercase tracking-widest">E</span>
                <span>{episode}</span>
                <ChevronDown size={10} className={`text-zinc-400 transition-transform duration-200 ${episodeOpen ? "rotate-180" : ""}`} />
              </button>
              {episodeOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setEpisodeOpen(false)} />
                  <div className="absolute right-0 mt-2 w-28 max-h-52 overflow-y-auto glass-card rounded-xl shadow-2xl z-20 scrollbar-hide py-1.5 animate-slide-down">
                    {Array.from({ length: episodeCount }, (_, i) => i + 1).map((ep) => (
                      <button
                        key={ep}
                        onClick={() => { setEpisode(ep); setSources([]); setStreamUrl(null); setEpisodeOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                          ep === episode ? "text-red-400 bg-red-500/10" : "text-zinc-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >Episode {ep}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Server selector */}
          {sources.length > 0 && (
            <div className="relative">
              <button
                onClick={() => { setServerOpen(!serverOpen); setSeasonOpen(false); setEpisodeOpen(false); }}
                className="flex items-center gap-2 glass rounded-xl px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 min-w-[110px] sm:min-w-[130px] justify-between"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Server size={12} className="text-red-400 flex-shrink-0" />
                  <span className="truncate max-w-[80px] text-[11px]">
                    {sources.find(src => src.iframeUrl === activeUrl)?.label ?? "Server"}
                  </span>
                </div>
                <ChevronDown size={10} className={`text-zinc-400 flex-shrink-0 transition-transform duration-200 ${serverOpen ? "rotate-180" : ""}`} />
              </button>
              {serverOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setServerOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 max-h-52 overflow-y-auto glass-card rounded-xl shadow-2xl z-20 scrollbar-hide py-1.5 animate-slide-down">
                    {sources.map((src) => {
                      const isActive = src.iframeUrl === activeUrl;
                      return (
                        <button
                          key={src.iframeUrl}
                          onClick={() => { setStreamUrl(src.iframeUrl); setServerOpen(false); }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors ${
                            isActive ? "text-red-400 bg-red-500/10" : "text-zinc-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="truncate">{src.label}</span>
                          {isActive && <CheckCircle2 size={13} className="text-red-400 flex-shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* ── Loading Overlay ── */}
      {loadingStream && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 bg-black/95">
          {/* Blurred thumbnail bg */}
          {movie?.thumbnailUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-[0.06] blur-2xl scale-105 pointer-events-none"
              style={{ backgroundImage: `url(${movie.thumbnailUrl})` }}
            />
          )}

          {/* Spinner */}
          <div className="relative flex items-center justify-center">
            <div className="absolute h-24 w-24 rounded-full bg-red-600/10 blur-2xl animate-pulse" />
            <div className="absolute h-16 w-16 rounded-full border border-red-600/20 animate-ping" />
            <Loader2 className="animate-spin text-red-500 relative z-10" size={52} strokeWidth={1.5} />
          </div>

          {/* Status */}
          <div className="flex flex-col items-center gap-2 relative z-10 text-center px-6">
            <p className="text-white font-bold text-base tracking-wide">{statusMessage}</p>
            <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Secure · Multi-Node Resolution
            </p>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-3 relative z-10">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300
                  ${i < statusStep ? "text-green-400" : i === statusStep ? "text-white" : "text-zinc-700"}`}>
                  {i < statusStep ? (
                    <CheckCircle2 size={12} className="text-green-400" />
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${i === statusStep ? "bg-red-500 animate-pulse" : "bg-zinc-800"}`} />
                  )}
                  <span className="hidden sm:inline">{step}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-6 sm:w-10 h-px transition-colors duration-500 ${i < statusStep ? "bg-green-500/40" : "bg-zinc-800"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Player ── */}
      <div className="flex-1 w-full h-full relative">
        {activeUrl ? (
          isEmbed ? (
            <iframe
              src={activeUrl}
              className="w-full h-full border-none pt-[60px]"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              title={movie?.title ?? "ChillFlix Player"}
            />
          ) : (
            <video
              autoPlay
              controls
              className="w-full h-full pt-[60px] bg-black"
              src={activeUrl}
            />
          )
        ) : (
          !loadingStream && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-5 bg-zinc-950">
              {movie?.thumbnailUrl && (
                <div className="absolute inset-0 bg-cover bg-center opacity-[0.04] blur-2xl pointer-events-none"
                  style={{ backgroundImage: `url(${movie.thumbnailUrl})` }} />
              )}
              <Tv size={52} className="text-zinc-700" strokeWidth={1} />
              <div className="text-center space-y-1 relative z-10">
                <p className="text-zinc-400 text-sm font-bold uppercase tracking-[0.2em]">No video source available</p>
                <p className="text-zinc-600 text-xs">Try refreshing or selecting a different server</p>
              </div>
              <button
                onClick={() => { setSources([]); setStreamUrl(null); }}
                className="btn-red text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg relative z-10"
              >
                Retry
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Watch;
