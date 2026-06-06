import { BsFillPlayFill } from "react-icons/bs";
import React from "react";
import { useRouter } from "next/router";

interface PlayButtonProps {
  movieId?: string;
}

const PlayButton: React.FC<PlayButtonProps> = ({ movieId }) => {
  const router = useRouter();

  const handlePlay = () => {
    if (movieId) router.push(`/watch/${movieId}`);
  };

  return (
    <button
      onClick={handlePlay}
      className="
        group relative inline-flex items-center gap-2
        bg-white text-black font-bold
        rounded-lg py-2.5 px-6 text-sm
        transition-all duration-200
        hover:bg-zinc-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.25)]
        active:scale-95
      "
    >
      <BsFillPlayFill
        size={22}
        className="transition-transform duration-200 group-hover:scale-110"
      />
      <span>Play</span>
    </button>
  );
};

export default PlayButton;
