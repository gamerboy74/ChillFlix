import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { NextPageContext } from "next";
import { useRouter } from "next/router";

import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import InfoModal from "@/components/InfoModal";
import Footer from "@/components/Footer";

import useFavourites from "@/hooks/useFavourites";
import useInfoModal from "@/hooks/useInfoModal";

export async function getServerSideProps(context: NextPageContext) {
  const session = await getServerSession(
    context.req as any,
    context.res as any,
    authOptions
  );

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

export default function MyListPage() {
  const { data: favourites = [] } = useFavourites();
  const { isOpen, closeModal } = useInfoModal();
  const router = useRouter();

  return (
    <>
      <InfoModal visible={isOpen} onClose={closeModal} />
      <Navbar />
      
      {/* Scrollable Container with Navbar spacer */}
      <div className="min-h-screen bg-[#0a0a0a] pt-24 sm:pt-28 px-4 md:px-12 lg:px-16 pb-40">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <h1 className="text-white text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
            My List
          </h1>
          <span className="text-zinc-500 text-xs sm:text-sm font-medium">
            ({favourites.length} {favourites.length === 1 ? "title" : "titles"})
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-zinc-800/60 to-transparent ml-2" />
        </div>

        {/* Content */}
        {favourites.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center mt-20 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5 text-zinc-600 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 sm:w-10 sm:h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <h2 className="text-white text-lg sm:text-xl font-bold mb-2">Your List is Empty</h2>
            <p className="text-zinc-500 text-sm max-w-sm mb-6 leading-relaxed">
              Explore our collection of movies and TV series, and click the &quot;+&quot; icon to save titles here.
            </p>
            <button
              onClick={() => router.push("/main")}
              className="bg-white hover:bg-zinc-200 text-black text-xs sm:text-sm font-bold py-2.5 px-6 rounded-md transition duration-200 shadow-md hover:scale-105 active:scale-95"
            >
              Browse Home
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
            {favourites.map((movie: any) => (
              <MovieCard key={movie.id} data={movie} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
