/**
 * POST /api/login
 *
 * NOTE: This endpoint exists for legacy/direct login purposes.
 * The primary login flow goes through NextAuth (/api/auth/signin).
 * This endpoint now uses the Supabase client (same as everywhere else)
 * to eliminate the split Prisma+Supabase dual-DB architecture.
 */
import { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabase";
import bcrypt from "bcrypt";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  
});

export default async function loginHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const { email, password } = parsed.data;

    const { data: user, error } = await supabase
      .from("User")
      .select("id, email, name, image, hashedPassword, favouriteIds")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.hashedPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Return sanitized user (no password hash)
    const { hashedPassword: _, ...userWithoutPassword } = user;
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("[login]", error);
    return res.status(500).json({ error: "An unexpected error occurred" });
  }
}
