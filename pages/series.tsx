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

export default function SeriesPage() {
  const { data: movies = [] } = useMovieList();
  const { isOpen, closeModal } = useInfoModal();

  // Filter for Series
  const series = useMemo(() => {
    return movies.filter((m: any) => m.type === "series");
  }, [movies]);

  // Pick a random series to feature on the Billboard
  const randomSeries = useMemo(() => {
    if (series.length === 0) return undefined;
    return series[Math.floor(Math.random() * series.length)];
  }, [series]);

  // Filter series by genre category
  const dramaSeries = useMemo(() => {
    return series.filter((m: any) => m.genre?.toLowerCase().includes("drama"));
  }, [series]);

  const actionSeries = useMemo(() => {
    return series.filter((m: any) => 
      m.genre?.toLowerCase().includes("action") || 
      m.genre?.toLowerCase().includes("crime") || 
      m.genre?.toLowerCase().includes("thriller") || 
      m.genre?.toLowerCase().includes("adventure")
    );
  }, [series]);

  const sciFiSeries = useMemo(() => {
    return series.filter((m: any) => 
      m.genre?.toLowerCase().includes("sci-fi") || 
      m.genre?.toLowerCase().includes("mystery") || 
      m.genre?.toLowerCase().includes("fantasy")
    );
  }, [series]);

  return (
    <>
      <InfoModal visible={isOpen} onClose={closeModal} />
      <Navbar />
      <Billboard movieData={randomSeries} />
      <div className="pb-40">
        {series.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center mt-24 px-4">
            <h2 className="text-white text-xl md:text-2xl font-bold mb-2">No TV Series Available</h2>
            <p className="text-zinc-400 text-sm max-w-md">We couldn&apos;t find any TV series in our database. Go to the Admin dashboard to import TV Series metadata!</p>
          </div>
        ) : (
          <>
            <MovieList title="Featured TV Series" data={series} />
            {actionSeries.length > 0 && <MovieList title="Action & Thriller Shows" data={actionSeries} />}
            {dramaSeries.length > 0 && <MovieList title="Critically Acclaimed Dramas" data={dramaSeries} />}
            {sciFiSeries.length > 0 && <MovieList title="Sci-Fi & Mystery Shows" data={sciFiSeries} />}
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
