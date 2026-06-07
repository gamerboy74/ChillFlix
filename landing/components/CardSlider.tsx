import React, { useRef } from 'react';
import Card from './Card';
import { Movie } from '../data/movies';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CardSliderProps {
  title: string;
  movies: Movie[];
}

const CardSlider: React.FC<CardSliderProps> = ({ title, movies }) => {
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <section className="my-8 px-6 md:px-12 relative group/slider" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <h2 className="text-lg md:text-2xl font-extrabold mb-4 text-white tracking-tight">{title}</h2>
      
      <div className="relative flex items-center">
        {/* Left Arrow */}
        <button
          onClick={scrollLeft}
          className="absolute left-0 z-20 p-2.5 bg-black/60 hover:bg-red-650 hover:bg-opacity-95 rounded-full text-white border border-white/10 hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/slider:opacity-100 flex items-center justify-center shadow-lg"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          aria-label="Scroll Left"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Card Slider */}
        <div
          ref={sliderRef}
          className="flex overflow-x-scroll space-x-4 scrollbar-hide py-4 px-1 w-full"
        >
          {movies.map((movie) => (
            <div key={movie.id} className="flex-none w-[150px] sm:w-[200px] h-[225px] sm:h-[300px]">
              <Card {...movie} />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={scrollRight}
          className="absolute right-0 z-20 p-2.5 bg-black/60 hover:bg-red-650 hover:bg-opacity-95 rounded-full text-white border border-white/10 hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/slider:opacity-100 flex items-center justify-center shadow-lg"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          aria-label="Scroll Right"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
};

export default CardSlider;
