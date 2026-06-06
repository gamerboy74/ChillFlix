import { NextApiRequest, NextApiResponse } from "next";
import { getCinevoBaseUrl, setCinevoBaseUrl } from "@/lib/cinevoScraper";
import { requireAdmin } from "@/lib/serverAuth";

/**
 * GET  /api/admin/domain  — returns the current resolved Cinevo base URL
 * POST /api/admin/domain  — body: { url: "https://newdomain.xyz" } — updates it
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireAdmin(req, res);
  } catch (error) {
    return;
  }

  if (req.method === "GET") {
    const url = await getCinevoBaseUrl();
    return res.status(200).json({ url, source: process.env.CINEVO_BASE_URL ? "env" : "auto" });
  }

  if (req.method === "POST") {
    const { url } = req.body;
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: "Invalid URL. Must start with http:// or https://" });
    }
    await setCinevoBaseUrl(url);
    return res.status(200).json({ message: "Domain updated successfully", url });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
