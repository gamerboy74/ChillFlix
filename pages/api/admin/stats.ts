import { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/serverAuth";
import supabase from "@/lib/supabase";


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try { await requireAdmin(req, res); } catch (e) { return; }

  if (req.method !== "GET") {
    return res.status(405).end();
  }

  try {
    // 1. Get count of Movies
    const { count: movieCount, error: movieError } = await supabase
      .from("Movie")
      .select("*", { count: "exact", head: true });

    if (movieError) throw new Error(movieError.message);

    // 2. Get count of Users
    const { count: userCount, error: userError } = await supabase
      .from("User")
      .select("*", { count: "exact", head: true });

    if (userError) throw new Error(userError.message);

    // 3. Get count of Memberships
    const { count: membershipCount, error: membershipError } = await supabase
      .from("Membership")
      .select("*", { count: "exact", head: true });

    if (membershipError) throw new Error(membershipError.message);

    // 4. Fetch the latest 5 registered users
    const { data: recentUsers, error: recentUsersError } = await supabase
      .from("User")
      .select("id, name, email, createdAt")
      .order("createdAt", { ascending: false })
      .limit(5);

    if (recentUsersError) throw new Error(recentUsersError.message);

    return res.status(200).json({
      stats: {
        totalMovies: movieCount || 0,
        totalUsers: userCount || 0,
        totalMemberships: membershipCount || 0,
      },
      recentUsers: recentUsers || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
