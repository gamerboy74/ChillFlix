import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./authOptions";
import supabase from "./supabase";

/**
 * Server-side auth helper.
 *
 * Uses `getServerSession` (reads the JWT directly — no extra HTTP call)
 * instead of the old `getSession({ req })` which made a round-trip to
 * /api/auth/session on every request.
 *
 * For lightweight checks, userId and favouriteIds are already in the JWT token
 * (see authOptions callbacks) so we skip the DB lookup unless `requireUser`
 * is explicitly true.
 */
const serverAuth = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    throw new Error("Not signed in");
  }

  // Prefer JWT-embedded fields to avoid a DB hit on every request
  const sessionUser = session.user as any;
  if (sessionUser.id && sessionUser.favouriteIds !== undefined && sessionUser.isAdmin !== undefined) {
    return {
      currentUser: {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name ?? "",
        image: sessionUser.image ?? "",
        favouriteIds: sessionUser.favouriteIds ?? [],
        isAdmin: sessionUser.isAdmin ?? false,
      },
    };
  }

  // Fallback: fetch from DB if token doesn't have the extra fields yet
  const { data: currentUser, error } = await supabase
    .from("User")
    .select("id, email, name, image, favouriteIds, isAdmin")
    .eq("email", session.user.email)
    .single();

  if (error || !currentUser) {
    throw new Error("Not signed in");
  }

  return { currentUser };
};

export const requireAdmin = async (req: NextApiRequest, res: NextApiResponse) => {
  const { currentUser } = await serverAuth(req, res);
  if (!currentUser.isAdmin) {
    res.status(403).json({ error: "Access denied. Admin role required." });
    throw new Error("Access denied");
  }
  return currentUser;
};

export default serverAuth;