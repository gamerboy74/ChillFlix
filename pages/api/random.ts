import { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabase";
import serverAuth from "@/lib/serverAuth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await serverAuth(req, res);

    const { count } = await supabase
      .from("Movie")
      .select("*", { count: "exact", head: true });

    if (!count) return res.status(404).json({ error: "No movies found" });

    const randomIndex = Math.floor(Math.random() * count);

    const { data: movies, error } = await supabase
      .from("Movie")
      .select("*")
      .range(randomIndex, randomIndex);

    if (error || !movies?.length) {
      return res.status(404).json({ error: "No movies found" });
    }

    return res.status(200).json(movies[0]);
  } catch (error) {
    console.error("[random]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}