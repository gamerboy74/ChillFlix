import React, { useRef } from 'react';
import Card from './Card';
import { Movie } from '../data/movies';

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
    <section className="my-8 px-4 relative">
      <h2 className="text-2xl font-bold mb-4 text-white">{title}</h2>
      <div className="relative flex items-center">
        {/* Left Arrow */}
        <button
          onClick={scrollLeft}
          className="absolute left-2 z-20 p-2 bg-black bg-opacity-60 rounded-full text-white hover:bg-opacity-80"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          aria-label="Scroll Left"
        >
          ❮
        </button>

        {/* Card Slider */}
        <div
          ref={sliderRef}
          className="flex overflow-x-scroll space-x-4 scrollbar-hide p-10"
        >
          {movies.map((movie) => (
            <div key={movie.id} className="flex-none w-[200px] h-[300px]">
              <Card {...movie} />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={scrollRight}
          className="absolute right-2 z-20 p-2 bg-black bg-opacity-60 rounded-full text-white hover:bg-opacity-80"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          aria-label="Scroll Right"
        >
          ❯
        </button>
      </div>
    </section>
  );
};

export default CardSlider;
