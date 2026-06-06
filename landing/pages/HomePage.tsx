import React from 'react';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import CardSlider from '../components/CardSlider';
import { movies as mockMovies } from '../data/movies';
import { onlyOnChillflix as mockOnlyOn } from '../data/onlyOnChillflix';

const HomePage: React.FC = () => {
  const { data: dbMovies = [], isLoading } = useSWR('/api/public/movies', fetcher);

  if (isLoading) return null;

  const mappedMovies = dbMovies.map((m: any) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    image: m.thumbnailUrl,
  }));

  const trending = mappedMovies.length > 0 ? mappedMovies.slice(0, 15) : mockMovies;
  
  const exclusiveDb = mappedMovies.filter((m: any) => {
    const orig = dbMovies.find((o: any) => o.id === m.id);
    return orig?.onlyOnChillFlix;
  });
  const exclusive = mappedMovies.length > 0 ? exclusiveDb : mockOnlyOn;

  return (
    <div>
      <CardSlider title="Trending Now" movies={trending} />
      {exclusive.length > 0 && <CardSlider title="Only on ChillFlix" movies={exclusive} />}
    </div>
  );
};

export default HomePage;
