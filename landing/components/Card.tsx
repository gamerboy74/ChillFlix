import React from 'react';
import { useSession } from 'next-auth/react';
import { Play } from 'lucide-react';

interface CardProps {
  id: string | number;
  title: string;
  image: string;
}

const Card: React.FC<CardProps> = ({ id, title, image }) => {
  const { data: session } = useSession();

  const handleClick = () => {
    if (session) {
      window.location.href = `/details/${id}`;
    } else {
      window.location.href = '/auth';
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="relative w-full h-full rounded-2xl overflow-hidden cursor-pointer group shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/[0.04] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_20px_50px_rgba(229,9,20,0.25)] hover:border-red-600/30"
    >
      {/* Background Poster Image */}
      <div 
        className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
        style={{ backgroundImage: `url(${image})` }}
      />

      {/* Cinematic Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Play Hover Overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transform scale-75 group-hover:scale-100 transition-transform duration-300">
          <Play size={18} fill="currentColor" className="ml-0.5" />
        </div>
      </div>

      {/* Title Label */}
      <div className="absolute bottom-0 left-0 w-full p-4 z-10">
        <h3 className="text-white text-xs sm:text-sm font-bold tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] line-clamp-2 leading-tight">
          {title}
        </h3>
      </div>
    </div>
  );
};

export default Card;
