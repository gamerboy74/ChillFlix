import React from 'react';
import { useSession } from 'next-auth/react';

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
      className="relative transition-transform duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:z-10 mt-6 mb-6 cursor-pointer"
    >
      <div
        className="w-[200px] h-[300px] rounded-lg overflow-hidden shadow-md"
        style={{
          backgroundImage: `url(${image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(1.3)',
          borderRadius: '15px',
        }}
      >
        <div className="h-full flex items-end p-4 bg-black bg-opacity-20 rounded-lg">
          <h3 className="text-white font-semibold drop-shadow-md">{title}</h3>
        </div>
      </div>
    </div>
  );
};

export default Card;

