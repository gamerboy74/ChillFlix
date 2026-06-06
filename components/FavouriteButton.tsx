import React, { useCallback, useMemo } from "react";
import useFavourites from "@/hooks/useFavourites";
import { AiOutlinePlus, AiOutlineCheck } from "react-icons/ai";
import useCurrentUser from "@/hooks/useCurrentUser";
import axios from "axios";

interface FavouriteButtonProps {
  movieId: string;
}

const FavouriteButton: React.FC<FavouriteButtonProps> = ({ movieId }) => {
  const { mutate: mutateFavourites } = useFavourites();
  const { data: currentUser, mutate } = useCurrentUser();

  const isFavourite = useMemo(() => {
    const list = currentUser?.favouriteIds || [];
    return list.includes(movieId);
  }, [currentUser, movieId]);

  const toggleFavourites = useCallback(async () => {
    let response;
    if (isFavourite) {
      response = await axios.delete("/api/favourite", { data: { movieId } });
    } else {
      response = await axios.post("/api/favourite", { movieId });
    }
    const updatedFavouriteIds = response?.data?.favouriteIds;
    mutate({ ...currentUser, favouriteIds: updatedFavouriteIds });
    mutateFavourites();
  }, [movieId, isFavourite, currentUser, mutate, mutateFavourites]);

  return (
    <button
      onClick={toggleFavourites}
      title={isFavourite ? "Remove from My List" : "Add to My List"}
      className={`
        flex-shrink-0 w-8 h-8 lg:w-9 lg:h-9 rounded-full
        flex items-center justify-center
        border-2 transition-all duration-200 hover:scale-105
        ${isFavourite
          ? "border-white bg-white/10 text-white"
          : "border-zinc-500 hover:border-white text-zinc-300 hover:text-white bg-transparent"
        }
      `}
    >
      {isFavourite ? <AiOutlineCheck size={16} /> : <AiOutlinePlus size={16} />}
    </button>
  );
};

export default FavouriteButton;
