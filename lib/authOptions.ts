/**
 * lib/authOptions.ts
 * Shared NextAuth config exported so API routes can call
 * `getServerSession(req, res, authOptions)` instead of the
 * client-side `getSession({ req })` which makes an extra HTTP round-trip.
 */
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcrypt";
import { SupabaseAdapter } from "@/lib/supabaseAdapter";
import supabase from "@/lib/supabase";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const { data: user } = await supabase
          .from("User")
          .select("id, email, name, image, hashedPassword, favouriteIds, isAdmin")
          .eq("email", credentials.email)
          .single();

        if (!user) throw new Error("Email does not exist");
        if (!user.hashedPassword) throw new Error("User has no password set");

        const isCorrectPassword = await compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isCorrectPassword) throw new Error("Incorrect password");

        return user;
      },
    }),
  ],
  pages: {
    signIn: "/auth",
  },
  debug: process.env.NODE_ENV === "development",
  adapter: SupabaseAdapter(),
  session: {
    strategy: "jwt",
  },
  jwt: {
    secret: process.env.NEXTAUTH_JWT_SECRET,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    /**
     * Embed the Supabase user ID and favouriteIds into the JWT so
     * serverAuth() can skip the extra DB round-trip for lightweight checks.
     */
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as any).id;
        token.favouriteIds = (user as any).favouriteIds ?? [];
        token.isAdmin = (user as any).isAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).favouriteIds = token.favouriteIds ?? [];
        (session.user as any).isAdmin = token.isAdmin ?? false;
      }
      return session;
    },
  },
};
