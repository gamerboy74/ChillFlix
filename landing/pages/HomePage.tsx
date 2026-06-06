import React from 'react';
import { movies } from '../data/movies';
import CardSlider from '../components/CardSlider';
import { onlyOnChillflix } from '../data/onlyOnChillflix';

const HomePage: React.FC = () => (
  <div>
    <CardSlider title="Trending Now" movies={movies} />
    <CardSlider title="Only on Chillflix" movies={onlyOnChillflix} />
  </div>
);

export default HomePage;
