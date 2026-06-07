import { NextApiRequest, NextApiResponse } from "next";
import serverAuth from "@/lib/serverAuth";
import supabase from "@/lib/supabase";
import bcrypt from "bcrypt";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { currentUser } = await serverAuth(req, res);
    const { name, password } = req.body;

    const updates: any = {
      name: name || currentUser.name,
    };

    if (password && password.length >= 8) {
      const hashedPassword = await bcrypt.hash(password, 12);
      updates.hashedPassword = hashedPassword;
    } else if (password && password.length > 0) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const { error } = await supabase
      .from("User")
      .update(updates)
      .eq("id", currentUser.id);

    if (error) {
      throw new Error(error.message);
    }

    return res.status(200).json({ message: "Settings updated successfully" });
  } catch (error: any) {
    console.error("Settings update error:", error);
    return res.status(500).json({ error: error.message || "Failed to update settings" });
  }
}
