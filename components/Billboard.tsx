import React, { useCallback, useEffect, useRef, useState } from "react";
import useBillboard from "@/hooks/useBillboard";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { VscMute, VscUnmute } from "react-icons/vsc";
import { BsFillPlayFill } from "react-icons/bs";
import PlayButton from "@/components/PlayButton";
import useInfoModal from "@/hooks/useInfoModal";
import useMuteBillboard from "@/hooks/useMuteBillboard";
import { getPreviewVideoSrc } from "@/lib/video";
import Image from "next/image";
import { useRouter } from "next/router";

interface BillboardProps {
  movieData?: Record<string, any>;
}

const Billboard: React.FC<BillboardProps> = ({ movieData }) => {
  const router = useRouter();
  const { data: randomData } = useBillboard();
  const data = movieData || randomData;
  const { openModal } = useInfoModal();
  const { isMuted, muteBillboard, unmuteBillboard } = useMuteBillboard();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleOpenModal = useCallback(() => {
    openModal(data?.id);
  }, [openModal, data?.id]);

  const handleMoreInfo = useCallback(() => {
    if (data?.id) {
      router.push(`/details/${data.id}`);
    }
  }, [router, data?.id]);

  const handleToggleMute = () => {
    isMuted ? unmuteBillboard() : muteBillboard();
  };

  const MuteIcon = isMuted ? VscMute : VscUnmute;

  useEffect(() => {
    setVideoLoaded(false);
    setImageLoaded(false);
  }, [data?.videoUrl]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    // Use 'ended' (fires once) instead of 'timeupdate' (fires ~4x/sec)
    const handleEnded = () => {
      videoElement.currentTime = 0;
      videoElement.play().catch(() => {});
    };
    videoElement.addEventListener("ended", handleEnded);
    return () => videoElement.removeEventListener("ended", handleEnded);
  }, [videoLoaded]);

  return (
    <div className="relative h-[56.25vw] min-h-[55vh] max-h-[90vh] w-full overflow-hidden bg-[#0a0a0a]">
      {/* Poster image (fades out when video loads) */}
      {data?.thumbnailUrl && (
        <div className="absolute inset-0">
          <Image
            src={data.thumbnailUrl}
            alt={data?.title ?? "Billboard"}
            fill
            className={`object-cover transition-opacity duration-700 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            } ${videoLoaded ? "opacity-0" : ""}`}
            priority
            sizes="100vw"
            onLoad={() => setImageLoaded(true)}
          />
        </div>
      )}

      {/* Background video */}
      {data?.videoUrl && (
        <video
          ref={videoRef}
          onPlay={() => setVideoLoaded(true)}
          onLoadedData={() => setVideoLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            videoLoaded ? "opacity-100" : "opacity-0"
          }`}
          autoPlay
          muted={isMuted}
          loop={false}
          playsInline
          src={getPreviewVideoSrc(data?.videoUrl)}
        />
      )}

      {/* Multi-layer dark gradient overlays for premium depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/10 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent z-10 pointer-events-none" />

      {/* Content overlay */}
      <div className="absolute inset-0 z-20 flex items-end pb-[10%] sm:pb-[8%] md:pb-[10%] lg:pb-[12%]">
        <div className="ml-6 sm:ml-10 md:ml-16 max-w-[90%] sm:max-w-[70%] lg:max-w-[48%] animate-fade-in">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 bg-red-600/20 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Now Streaming
            </span>
          </div>

          {/* Title */}
          <h1 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-none drop-shadow-2xl mb-3 sm:mb-4">
            {data?.title}
          </h1>

          {/* Meta row */}
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <span className="text-green-400 text-xs sm:text-sm font-bold">98% Match</span>
            <span className="text-zinc-400 text-xs sm:text-sm">{new Date().getFullYear()}</span>
            <span className="border border-zinc-600/80 text-zinc-400 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">HD</span>
          </div>

          {/* Description */}
          <p className="text-zinc-200/90 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-2 sm:line-clamp-3 md:line-clamp-4 mb-5 sm:mb-7 drop-shadow-md font-medium max-w-md">
            {data?.description}
          </p>

          {/* Action buttons */}
          <div className="flex flex-row items-center gap-3 flex-wrap">
            <PlayButton movieId={data?.id} />

            <button
              onClick={handleMoreInfo}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 rounded-lg py-2.5 px-5 text-sm font-semibold transition-all duration-250 backdrop-blur-sm"
            >
              <AiOutlineInfoCircle size={18} />
              More Info
            </button>
          </div>
        </div>
      </div>

      {/* Mute button — bottom right */}
      <button
        onClick={handleToggleMute}
        className="absolute right-4 sm:right-8 md:right-12 bottom-[14%] sm:bottom-[12%] md:bottom-[16%] z-20
          h-9 w-9 rounded-full flex items-center justify-center
          border border-white/30 hover:border-white/60
          bg-black/30 hover:bg-black/50
          text-white transition-all duration-200 backdrop-blur-md"
        title={isMuted ? "Unmute" : "Mute"}
      >
        <MuteIcon size={16} />
      </button>

      {/* Age rating badge — bottom right */}
      <div className="absolute right-4 sm:right-8 md:right-12 bottom-[5%] z-20
        border-l-4 border-zinc-400/60 bg-black/50 backdrop-blur-sm
        text-zinc-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 py-1">
        13+
      </div>
    </div>
  );
};

export default Billboard;
