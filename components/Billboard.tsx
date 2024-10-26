import React, { useCallback, useEffect, useRef } from "react";
import useBillboard from "@/hooks/useBillboard";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { VscMute, VscUnmute } from "react-icons/vsc";
import PlayButton from "@/components/PlayButton";
import useInfoModal from "@/hooks/useInfoModal";
import useMuteBillboard from "@/hooks/useMuteBillboard";

const Billboard = () => {
  const { data } = useBillboard();
  const { openModal } = useInfoModal();
  const { isMuted, muteBillboard, unmuteBillboard } = useMuteBillboard();
  const videoRef = useRef<HTMLVideoElement | null>(null); // Reference for the video element

  const handleOpenModal = useCallback(() => {
    openModal(data?.id);
  }, [openModal, data?.id]);

  const handleToggleMute = () => {
    isMuted ? unmuteBillboard() : muteBillboard();
  };

  const MuteIcon = isMuted ? VscMute : VscUnmute;

  // Effect to handle video playback time
  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) return; // Ensure video element is available

    const handleTimeUpdate = () => {
      if (videoElement.currentTime >= 60) {
        // 60 seconds
        videoElement.currentTime = 0; // Reset to start
        videoElement.play(); // Play again
      }
    };

    videoElement.addEventListener("timeupdate", handleTimeUpdate);

    // Cleanup the event listener
    return () => {
      videoElement.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []);

  return (
    <div className="relative h-screen max-h-[56.25vw]">
      <video
        ref={videoRef} // Attach the ref to the video element
        className="w-full h-screen max-h-[56.25vw] object-cover brightness-[60%]"
        autoPlay
        muted={isMuted}
        loop={false} // Disable loop since we're handling it manually
        poster={data?.thumbnailUrl}
        src={data?.videoUrl}
      />
      <div className="absolute top-[30%] md:top-[40%] ml-4 md:ml-16">
        <p className="text-white text-1xl md:text-5xl h-full w-[50%] lg:text-6xl font-bold drop-shadow-xl">
          {data?.title}
        </p>
        <p className="text-white text-[8px] md:text-lg mt-3 md:mt-8 w-[90%] md:w-[80%] lg:w-[50%] drop-shadow-xl">
          {data?.description}
        </p>
        <div className="flex flex-row items-center mt-3 md:mt-4 gap-3">
          <PlayButton movieId={data?.id} />
          <button
            onClick={handleToggleMute}
            className="bg-white text-white bg-opacity-30 rounded-md py-1 md:py-2 px-2 md:px-4 w-auto text-xs lg:text-lg font-semibold flex flex-row items-center hover:bg-opacity-20 transition"
          >
            <MuteIcon className="mr-1" />
            {isMuted ? "Unmute" : "Mute"}
          </button>
          <button
            onClick={handleOpenModal}
            className="bg-white text-white bg-opacity-30 rounded-md py-1 md:py-2 px-2 md:px-4 w-auto text-xs lg:text-lg font-semibold flex flex-row items-center hover:bg-opacity-20 transition"
          >
            <AiOutlineInfoCircle className="mr-1" />
            More Info
          </button>
        </div>
      </div>
    </div>
  );
};

export default Billboard;
