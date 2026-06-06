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

export default function PopularPage() {
  const { data: movies = [] } = useMovieList();
  const { isOpen, closeModal } = useInfoModal();

  // Feature a random item on the Billboard
  const featuredItem = useMemo(() => {
    if (movies.length === 0) return undefined;
    return movies[Math.floor(Math.random() * movies.length)];
  }, [movies]);

  // "New Releases" (we simulate this by reversing the movie list to get the newest first)
  const newReleases = useMemo(() => {
    return [...movies].reverse();
  }, [movies]);

  // "Trending Now" (sorted or just full list)
  const trending = useMemo(() => {
    return movies;
  }, [movies]);

  // "Only on ChillFlix" (filter onlyOnChillFlix === true)
  const onlyOnChillFlix = useMemo(() => {
    return movies.filter((m: any) => m.onlyOnChillFlix);
  }, [movies]);

  return (
    <>
      <InfoModal visible={isOpen} onClose={closeModal} />
      <Navbar />
      <Billboard movieData={featuredItem} />
      <div className="pb-40">
        {movies.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center mt-24 px-4">
            <h2 className="text-white text-xl md:text-2xl font-bold mb-2">No Content Available</h2>
            <p className="text-zinc-400 text-sm max-w-md">Browse our catalogue once we import content from the Admin page.</p>
          </div>
        ) : (
          <>
            <MovieList title="New Releases" data={newReleases} />
            <MovieList title="Trending Now" data={trending} />
            {onlyOnChillFlix.length > 0 && (
              <MovieList title="Only on ChillFlix" data={onlyOnChillFlix} />
            )}
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
