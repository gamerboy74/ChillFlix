import React, { useCallback, useEffect, useState } from "react";
import useInfoModal from "@/hooks/useInfoModal";
import useMovie from "@/hooks/useMovie";
import useMovieList from "@/hooks/useMovieList";
import { AiOutlineClose } from "react-icons/ai";
import { BsFillPlayFill } from "react-icons/bs";
import PlayButton from "@/components/PlayButton";
import FavouriteButton from "@/components/FavouriteButton";
import useMuteBillboard from "@/hooks/useMuteBillboard";
import { getPreviewVideoSrc } from "@/lib/video";
import Image from "next/image";
import { useRouter } from "next/router";

interface InfoModalProps {
  visible?: boolean;
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(!!visible);
  const { muteBillboard } = useMuteBillboard();
  const { movieId, openModal } = useInfoModal();
  const { data = {} } = useMovie(movieId);
  const { data: allMovies = [] } = useMovieList();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);

  const currentYear = React.useMemo(() => new Date().getFullYear(), []);

  // Parse seasonsData from DB dynamically
  const seasonsList = React.useMemo(() => {
    if (data?.seasonsData) {
      try {
        const parsed = JSON.parse(data.seasonsData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse seasonsData:", e);
      }
    }
    if (data?.type === "series") {
      return [{ seasonNumber: 1, episodeCount: 24 }];
    }
    return [];
  }, [data]);

  const currentSeasonInfo = React.useMemo(() => {
    return seasonsList.find((s: any) => s.seasonNumber === selectedSeason);
  }, [seasonsList, selectedSeason]);

  const episodeCount = currentSeasonInfo ? currentSeasonInfo.episodeCount : 0;

  const recommendations = React.useMemo(() => {
    if (!data || !data.id || allMovies.length === 0) return [];
    return allMovies
      .filter((m: any) => {
        if (m.id === data.id) return false;
        if (m.type !== data.type) return false;
        const currentGenres = data.genre?.split(",").map((g: string) => g.trim().toLowerCase()) || [];
        const mGenres = m.genre?.split(",").map((g: string) => g.trim().toLowerCase()) || [];
        return mGenres.some((g: string) => currentGenres.includes(g));
      })
      .slice(0, 3); // limit to 3 inside the modal
  }, [data, allMovies]);

  // Reset selected season when movie changes
  useEffect(() => {
    setSelectedSeason(1);
  }, [data?.id]);

  useEffect(() => {
    if (visible) muteBillboard();
    setIsVisible(!!visible);
    setImgLoaded(false);
  }, [visible, muteBillboard]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && visible) handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [visible, handleClose]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4
        bg-black/80 backdrop-blur-sm transition-opacity duration-300
        ${isVisible ? "opacity-100" : "opacity-0"}`}
      onClick={handleClose}
    >
      <div
        className={`relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.9)]
          transition-all duration-300
          ${isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero video/poster section */}
        <div className="relative h-72 sm:h-80 md:h-96 w-full bg-zinc-900 overflow-hidden">
          {/* Poster image background */}
          {data?.thumbnailUrl && (
            <Image
              src={data.thumbnailUrl}
              alt={data?.title ?? ""}
              fill
              className={`object-cover transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              sizes="(max-width: 768px) 100vw, 672px"
              onLoad={() => setImgLoaded(true)}
            />
          )}
          {!imgLoaded && <div className="absolute inset-0 skeleton" />}

          {/* Preview video (plays on top) */}
          {data?.videoUrl && (
            <video
              className="absolute inset-0 w-full h-full object-cover brightness-[65%]"
              autoPlay
              muted
              loop
              playsInline
              poster={data?.thumbnailUrl}
              src={getPreviewVideoSrc(data?.videoUrl)}
            />
          )}

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800
              border border-zinc-700/60 hover:border-zinc-600
              flex items-center justify-center text-white
              transition-all duration-200 hover:scale-105 backdrop-blur-sm"
            aria-label="Close"
          >
            <AiOutlineClose size={18} />
          </button>

          {/* Title + actions at bottom of hero */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight mb-4 drop-shadow-lg">
              {data?.title}
            </h2>
            <div className="flex flex-row gap-3 items-center">
              <PlayButton movieId={data?.id} />
              <FavouriteButton movieId={data?.id} />
              <button
                onClick={() => {
                  handleClose();
                  router.push(`/details/${data?.id}`);
                }}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 rounded-xl py-2 px-4 text-xs sm:text-sm font-semibold transition hover:scale-105 active:scale-95 backdrop-blur-sm"
              >
                Full Details
              </button>
            </div>
          </div>
        </div>

        {/* Details panel */}
        <div className="bg-zinc-900 px-6 py-6 grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left: Description */}
          <div className="md:col-span-3 space-y-4">
            {/* Meta chips */}
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-green-400 font-bold text-sm">98% Match</span>
              <span className="text-zinc-400 text-xs font-semibold">{currentYear}</span>
              <span className="border border-zinc-700 text-zinc-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                HD
              </span>
              {data?.duration && (
                <span className="text-zinc-400 text-xs">{data.duration}</span>
              )}
            </div>

            {/* Description */}
            <p className="text-zinc-300 text-sm leading-relaxed">
              {data?.description}
            </p>
          </div>

          {/* Right: Metadata */}
          <div className="md:col-span-2 space-y-3 text-xs">
            {data?.genre && (
              <div>
                <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest block mb-1">
                  Genre
                </span>
                <span className="text-zinc-300 font-semibold">{data.genre}</span>
              </div>
            )}
            <div>
              <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest block mb-1">
                Maturity Rating
              </span>
              <span className="inline-block border border-zinc-700 bg-zinc-950 text-zinc-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                13+
              </span>
            </div>
            <div>
              <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest block mb-1">
                Audio
              </span>
              <span className="text-zinc-300">English [Original]</span>
            </div>
            <div>
              <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest block mb-1">
                Subtitles
              </span>
              <span className="text-zinc-300">English, Hindi +8 more</span>
            </div>
          </div>
        </div>

        {/* Episodes Section (Series only) */}
        {data?.type === "series" && seasonsList.length > 0 && (
          <div className="bg-zinc-900 px-6 pb-8 border-t border-zinc-800/40 pt-6">
            <div className="flex flex-row items-center justify-between mb-4">
              <h3 className="text-white text-lg font-bold">Episodes</h3>
              
              {/* Season Dropdown */}
              <div className="relative">
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  className="bg-zinc-800 border border-zinc-700 text-white text-xs font-bold px-3 py-1.5 rounded-md focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  {seasonsList.map((s: any) => (
                    <option key={s.seasonNumber} value={s.seasonNumber}>
                      Season {s.seasonNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Episode List */}
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
              {Array.from({ length: episodeCount }, (_, i) => i + 1).map((ep) => (
                <div
                  key={ep}
                  onClick={() => router.push(`/watch/${data.id}?season=${selectedSeason}&episode=${ep}`)}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition border border-transparent hover:border-zinc-800"
                >
                  {/* Episode Index */}
                  <span className="text-zinc-500 text-sm font-bold w-4 text-right">
                    {ep}
                  </span>

                  {/* Small Episode Thumbnail */}
                  <div className="relative w-24 aspect-video rounded-md overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700/30">
                    {data?.thumbnailUrl && (
                      <Image
                        src={data.thumbnailUrl}
                        alt={`Episode ${ep}`}
                        fill
                        sizes="96px"
                        className="object-cover opacity-70 group-hover:opacity-100 transition"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 transition">
                      <div className="w-8 h-8 rounded-full bg-white/10 border border-white/40 flex items-center justify-center backdrop-blur-sm">
                        <BsFillPlayFill size={16} className="text-white ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Episode Meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-xs sm:text-sm truncate">
                      Episode {ep}
                    </p>
                    <p className="text-zinc-400 text-[10px] sm:text-xs line-clamp-2 mt-0.5 leading-relaxed font-medium">
                      Watch Season {selectedSeason}, Episode {ep} of {data?.title} on ChillFlix.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <div className="bg-zinc-900 px-6 pb-8 border-t border-zinc-800/40 pt-6">
            <h3 className="text-white text-base sm:text-lg font-bold mb-4">
              More Like This
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recommendations.map((rec: any) => (
                <div
                  key={rec.id}
                  onClick={() => {
                    handleClose();
                    router.push(`/details/${rec.id}`);
                  }}
                  className="bg-zinc-850/45 hover:bg-zinc-800/90 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700/60 cursor-pointer transition duration-300 flex flex-col"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-full bg-zinc-800">
                    {rec.thumbnailUrl && (
                      <Image
                        src={rec.thumbnailUrl}
                        alt={rec.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 220px"
                        className="object-cover"
                      />
                    )}
                    {/* Tiny Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/10 transition">
                      <div className="w-8 h-8 rounded-full bg-white/10 border border-white/40 flex items-center justify-center backdrop-blur-sm">
                        <BsFillPlayFill size={16} className="text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Meta */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-green-400 font-bold">98% Match</span>
                        <span className="text-zinc-400">{rec.duration}</span>
                      </div>
                      <p className="text-white font-bold text-xs truncate">{rec.title}</p>
                      <p className="text-zinc-400 text-[9px] sm:text-[10px] line-clamp-2 leading-relaxed">
                        {rec.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfoModal;
