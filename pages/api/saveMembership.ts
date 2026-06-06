import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import supabase from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

const saveMembershipSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum wallet address"),
  plan: z.enum(["Basic", "Standard", "Premium"]),
  date: z.string().datetime(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = saveMembershipSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      });
    }

    const { plan, date } = result.data;

    const { error } = await supabase.from("Membership").insert({
      
      plan,
      date,
    });

    if (error) throw new Error(error.message);
    return res.status(200).json({ message: "Membership saved successfully" });
  } catch (error) {
    console.error("Error saving membership:", error);
    return res.status(500).json({ error: "Failed to save membership data" });
  }
}
