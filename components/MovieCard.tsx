import React, { useRef, useState } from "react";
import { BsFillPlayFill } from "react-icons/bs";
import { BiChevronDown } from "react-icons/bi";
import FavouriteButton from "@/components/FavouriteButton";
import { useRouter } from "next/router";
import useInfoModal from "@/hooks/useInfoModal";
import useMuteBillboard from "@/hooks/useMuteBillboard";
import Image from "next/image";
import { getPreviewVideoSrc } from "@/lib/video";

interface MovieCardProps {
  data: Record<string, any>;
  /** Only first few cards in a list should set priority=true on their image */
  priority?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = ({ data, priority = false }) => {
  const router = useRouter();
  const { openModal } = useInfoModal();
  const { muteBillboard } = useMuteBillboard();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    // Prefetch for instant navigation when clicked
    if (data?.id) {
      router.prefetch(`/details/${data.id}`);
      router.prefetch(`/watch/${data.id}`);
    }
    
    if (videoRef.current) {
      muteBillboard();
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/watch/${data?.id}`);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    router.push(`/details/${data?.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative bg-zinc-900 h-[26vw] sm:h-[11vw] w-full rounded-md overflow-hidden cursor-pointer
        border border-zinc-800/40
        transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)
        hover:scale-[1.06] hover:shadow-[0_0_20px_rgba(229,9,20,0.45)] hover:border-red-600/40
        ${isHovered ? "z-50" : "z-0"}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail */}
      <Image
        src={data.thumbnailUrl}
        alt={data.title ?? "thumbnail"}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
        className={`object-cover transition-opacity duration-300 rounded-md
          ${imgLoaded ? "opacity-100" : "opacity-0"}
          group-hover:opacity-0`}
        priority={priority}
        onLoad={() => setImgLoaded(true)}
      />

      {/* Skeleton while loading */}
      {!imgLoaded && <div className="absolute inset-0 skeleton rounded-md" />}

      {/* Video preview — src only set on hover to prevent mass preloading */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-md"
        src={isHovered ? getPreviewVideoSrc(data.videoUrl) : undefined}
        loop
        muted
        playsInline
        poster={data.thumbnailUrl}
      />

      {/* Details container overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent p-2 sm:p-3 pt-8 flex flex-col gap-1 transition-all duration-350 ease-out rounded-b-md">
        {/* Title */}
        <p className="text-white font-bold text-xs sm:text-sm md:text-base leading-tight truncate drop-shadow-md">
          {data?.title}
        </p>

        {/* Always visible metadata row */}
        <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-zinc-400 group-hover:text-zinc-200 transition-colors">
          {data?.genre && (
            <span className="font-semibold tracking-wider uppercase text-[8px] sm:text-[9px] text-red-500">
              {data.genre}
            </span>
          )}
          {data?.genre && data?.duration && <span className="text-zinc-600 font-bold">•</span>}
          {data?.duration && (
            <span className="font-medium">{data.duration}</span>
          )}
        </div>

        {/* Expandable Meta Section (Revealed on Hover) */}
        <div className="max-h-0 opacity-0 pointer-events-none group-hover:max-h-16 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-350 ease-out overflow-hidden flex flex-col gap-2 pt-1.5 border-t border-zinc-800/40 mt-1">
          {/* Action Buttons Row */}
          <div className="flex items-center gap-1.5">
            {/* Play */}
            <button
              onClick={handlePlay}
              className="flex-shrink-0 w-8 h-8 lg:w-9 lg:h-9 bg-white rounded-full flex items-center justify-center
                transition hover:bg-zinc-100 hover:scale-105 active:scale-95 shadow-md"
            >
              <BsFillPlayFill size={16} className="text-black ml-0.5" />
            </button>

            {/* Favourite */}
            <FavouriteButton movieId={data?.id} />

            {/* Info */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/details/${data?.id}`);
              }}
              className="ml-auto flex-shrink-0 w-8 h-8 lg:w-9 lg:h-9 border border-zinc-500 hover:border-white rounded-full flex items-center justify-center transition hover:scale-105 active:scale-95 bg-zinc-900/60"
            >
              <BiChevronDown className="text-white" size={18} />
            </button>
          </div>

          {/* Extra Meta Row */}
          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px]">
            <span className="text-green-400 font-bold">98% Match</span>
            <span className="border border-zinc-800 bg-zinc-900/50 text-[8px] text-zinc-400 px-1 py-0.2 rounded font-semibold">HD</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
