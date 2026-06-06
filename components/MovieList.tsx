import React from "react";
import { isEmpty } from "lodash";
import MovieCard from "@/components/MovieCard";
import { BsChevronRight } from "react-icons/bs";

interface MovieListProps {
  data: Record<string, any>[];
  title: string;
}

const MovieList: React.FC<MovieListProps> = ({ data, title }) => {
  if (isEmpty(data)) return null;

  return (
    <div className="px-4 md:px-10 lg:px-16 mt-6 space-y-3 group/section">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <h2 className="text-white text-sm sm:text-base md:text-lg font-bold tracking-tight">
          {title}
        </h2>
        <span className="hidden group-hover/section:flex items-center gap-1 text-green-400 text-xs font-bold cursor-pointer hover:text-green-300 transition-colors">
          Explore all <BsChevronRight size={12} />
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-zinc-800/60 to-transparent ml-2" />
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
        {data.map((movie, index) => (
          <MovieCard key={movie.id} data={movie} priority={index < 4} />
        ))}
      </div>
    </div>
  );
};

export default MovieList;
