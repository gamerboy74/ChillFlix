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

    // ── GET: list connected OAuth providers for this user ──────────────────
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("Account")
        .select("provider, providerAccountId")
        .eq("userId", currentUser.id);

      if (error) throw new Error(error.message);
      return res.status(200).json(data || []);
    }

    // ── DELETE: disconnect an OAuth provider ───────────────────────────────
    if (req.method === "DELETE") {
      const { provider } = req.body;
      if (!provider) return res.status(400).json({ error: "Provider is required" });

      // Don't allow disconnecting the only auth method if user has no password
      const { data: userData } = await supabaseAdmin
        .from("User")
        .select("hashedPassword")
        .eq("id", currentUser.id)
        .single();

      const { data: accounts } = await supabaseAdmin
        .from("Account")
        .select("provider")
        .eq("userId", currentUser.id);

      const hasPassword = !!userData?.hashedPassword;
      const linkedCount = accounts?.length ?? 0;

      if (!hasPassword && linkedCount <= 1) {
        return res.status(400).json({
          error: "Cannot disconnect your only login method. Set a password first.",
        });
      }

      const { error } = await supabaseAdmin
        .from("Account")
        .delete()
        .eq("userId", currentUser.id)
        .eq("provider", provider);

      if (error) throw new Error(error.message);
      return res.status(200).json({ message: `${provider} disconnected` });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("[accounts]", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
