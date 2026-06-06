import { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabase";
import serverAuth from "@/lib/serverAuth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await serverAuth(req, res);

    const { movieId } = req.query;

    if (typeof movieId !== "string" || !movieId) {
      return res.status(400).json({ message: "Invalid movie id" });
    }

    const { data: movie, error } = await supabase
      .from("Movie")
      .select("*")
      .eq("id", movieId)
      .single();

    if (error || !movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    return res.status(200).json(movie);
  } catch (error) {
    console.error("[movie/[movieId]]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}