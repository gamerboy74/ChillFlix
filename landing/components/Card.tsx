import React from 'react';
import { Movie } from '../data/movies';

const Card: React.FC<Movie> = ({ title, image }) => (
  <div className="relative transition-transform duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:z-10 mt-6 mb-6">
    <div
      className="w-[200px] h-[300px] rounded-lg overflow-hidden shadow-md"
      style={{
        backgroundImage: `url(${image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'brightness(1.3)', // Increase brightness (more than 1 for brighter images)
        borderRadius: '15px', // Rounded corners
      }}
    >
      <div className="h-full flex items-end p-4 bg-black bg-opacity-20 rounded-lg"> {/* Reduced opacity */}
        <h3 className="text-white font-semibold">{title}</h3>
      </div>
    </div>
  </div>
);

export default Card;

