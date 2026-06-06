import React, { useMemo } from "react";
import { getSession } from "next-auth/react";
import { NextPageContext } from "next";

import Navbar from "@/components/Navbar";
import Billboard from "@/components/Billboard";
import MovieList from "@/components/MovieList";
import InfoModal from "@/components/InfoModal";
import Footer from "@/components/Footer";

import useMovieList from "@/hooks/useMovieList";
import useInfoModal from "@/hooks/useInfoModal";

export async function getServerSideProps(context: NextPageContext) {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: "/auth",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}

export default function MoviesPage() {
  const { data: movies = [] } = useMovieList();
  const { isOpen, closeModal } = useInfoModal();

  // Filter for Movies
  const onlyMovies = useMemo(() => {
    return movies.filter((m: any) => m.type === "movie" || !m.type);
  }, [movies]);

  // Pick a random movie to feature on the Billboard
  const randomMovie = useMemo(() => {
    if (onlyMovies.length === 0) return undefined;
    return onlyMovies[Math.floor(Math.random() * onlyMovies.length)];
  }, [onlyMovies]);

  // Filter movies by genre category
  const dramaMovies = useMemo(() => {
    return onlyMovies.filter((m: any) => m.genre?.toLowerCase().includes("drama"));
  }, [onlyMovies]);

  const actionMovies = useMemo(() => {
    return onlyMovies.filter((m: any) => 
      m.genre?.toLowerCase().includes("action") || 
      m.genre?.toLowerCase().includes("crime") || 
      m.genre?.toLowerCase().includes("thriller") || 
      m.genre?.toLowerCase().includes("adventure")
    );
  }, [onlyMovies]);

  const sciFiMovies = useMemo(() => {
    return onlyMovies.filter((m: any) => 
      m.genre?.toLowerCase().includes("sci-fi") || 
      m.genre?.toLowerCase().includes("mystery") || 
      m.genre?.toLowerCase().includes("fantasy")
    );
  }, [onlyMovies]);

  return (
    <>
      <InfoModal visible={isOpen} onClose={closeModal} />
      <Navbar />
      <Billboard movieData={randomMovie} />
      <div className="pb-40">
        {onlyMovies.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center mt-24 px-4">
            <h2 className="text-white text-xl md:text-2xl font-bold mb-2">No Movies Available</h2>
            <p className="text-zinc-400 text-sm max-w-md">We couldn&apos;t find any movies in our database. Go to the Admin dashboard to import movie metadata!</p>
          </div>
        ) : (
          <>
            <MovieList title="Trending Movies" data={onlyMovies} />
            {actionMovies.length > 0 && <MovieList title="Action Thrillers & Adventures" data={actionMovies} />}
            {dramaMovies.length > 0 && <MovieList title="Engaging Dramas" data={dramaMovies} />}
            {sciFiMovies.length > 0 && <MovieList title="Sci-Fi & Fantasy Blockbusters" data={sciFiMovies} />}
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
