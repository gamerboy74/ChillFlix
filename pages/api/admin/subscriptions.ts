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
    const { data: memberships, error } = await supabase
      .from("Membership")
      .select("id, plan, date")
      .order("date", { ascending: false });

    if (error) throw error;
    return res.status(200).json(memberships ?? []);
  } catch (err) {
    console.error("[admin/subscriptions]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
