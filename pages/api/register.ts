import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcrypt";
import { z } from "zod";
import supabase from "@/lib/supabase";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default async function registerHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      });
    }

    const { email, name, password } = result.data;

    const { data: existingEmail } = await supabase
      .from("User")
      .select("id")
      .eq("email", email)
      .single();

    if (existingEmail) {
      return res.status(422).json({ error: "Email already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from("User")
      .insert({
        email,
        name,
        hashedPassword,
        image: "",
        emailVerified: new Date().toISOString(),
        
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const { hashedPassword: _, ...userWithoutPassword } = user;
    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Registration failed" });
  }
}
