import { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabase";
import serverAuth from "@/lib/serverAuth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await serverAuth(req, res);

    const limit = Math.min(parseInt(String(req.query.limit ?? 80)), 200);
    const page  = Math.max(parseInt(String(req.query.page  ??  1)),  1);
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    const { data: movies, error } = await supabase
      .from("Movie")
      .select("id, title, description, thumbnailUrl, genre, duration, type, onlyOnChillFlix, seasonsData")
      .range(from, to);

    if (error) throw new Error(error.message);

    // Allow CDN / browser to cache for 60 s, serve stale for up to 5 min
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(movies ?? []);
  } catch (error) {
    console.error(error);
    return res.status(400).end();
  }
}