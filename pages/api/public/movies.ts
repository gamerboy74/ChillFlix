import { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const { data: movies, error } = await supabase
      .from("Movie")
      .select("id, title, description, thumbnailUrl, genre, onlyOnChillFlix")
      .limit(30);

    if (error) throw new Error(error.message);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(movies ?? []);
  } catch (error) {
    console.error(error);
    return res.status(400).end();
  }
}
