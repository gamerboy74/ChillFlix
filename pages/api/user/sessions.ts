import { NextApiRequest, NextApiResponse } from "next";
import serverAuth from "@/lib/serverAuth";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { currentUser } = await serverAuth(req, res);

    // ── GET: list all active sessions for this user ────────────────────────
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("Session")
        .select("id, sessionToken, expires")
        .eq("userId", currentUser.id)
        .order("expires", { ascending: false });

      if (error) throw new Error(error.message);
      return res.status(200).json(data || []);
    }

    // ── DELETE: sign out all OTHER sessions (keep current) ────────────────
    if (req.method === "DELETE") {
      const { currentToken } = req.body;

      if (currentToken) {
        // Delete all sessions EXCEPT the current one
        const { error } = await supabaseAdmin
          .from("Session")
          .delete()
          .eq("userId", currentUser.id)
          .neq("sessionToken", currentToken);

        if (error) throw new Error(error.message);
        return res.status(200).json({ message: "All other sessions signed out" });
      }

      // Delete ALL sessions (full sign out)
      const { error } = await supabaseAdmin
        .from("Session")
        .delete()
        .eq("userId", currentUser.id);

      if (error) throw new Error(error.message);
      return res.status(200).json({ message: "All sessions signed out" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("[sessions]", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
