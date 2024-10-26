import { getSession } from "next-auth/react";
import { NextPageContext } from "next";
import Navbar from "../components/Navbar";
import Billboard from "../components/Billboard";
import MovieList from "../components/MovieList";
import useMovieList from "@/hooks/useMovieList";
import useFavourites from "@/hooks/useFavourites";
import InfoModal from "../components/InfoModal";
import useInfoModal from "@/hooks/useInfoModal";
import Footer from "../components/Footer";

// Define the Movie interface
interface Movie {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  genre: string;
  duration: string;
  onlyOnChillFlix: boolean; // Include the new attribute
}

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

export default function Home() {
  const { data: movies = [] } = useMovieList();
  const { data: favourites = [] } = useFavourites();
  const { isOpen, closeModal } = useInfoModal();

  // Filter using the defined Movie type
  const onlyOnChillFlixMovies = movies.filter(
    (movie: Movie) => movie.onlyOnChillFlix
  );

  return (
    <>
      <InfoModal visible={isOpen} onClose={closeModal} />
      <Navbar />
      <Billboard />
      <div className="pb-40">
        <MovieList title="Trending Now" data={movies} />
        <MovieList title="My List" data={favourites} />
        <MovieList title="Only on ChillFlix" data={onlyOnChillFlixMovies} />
      </div>
      <Footer />
    </>
  );
}
