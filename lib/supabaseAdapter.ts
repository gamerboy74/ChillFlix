import { Adapter, AdapterUser, AdapterAccount } from "next-auth/adapters";
import supabase from "./supabase";

function mapUser(data: any): AdapterUser {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    image: data.image ?? null,
    emailVerified: data.emailVerified ? new Date(data.emailVerified) : null,
  };
}

export function SupabaseAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">) {
      const { data, error } = await supabase
        .from("User")
        .insert({
          name: user.name ?? "",
          email: user.email,
          image: user.image,
          emailVerified: user.emailVerified?.toISOString() ?? null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return mapUser(data);
    },

    async getUser(id) {
      const { data } = await supabase
        .from("User")
        .select()
        .eq("id", id)
        .single();

      if (!data) return null;
      return mapUser(data);
    },

    async getUserByEmail(email) {
      const { data } = await supabase
        .from("User")
        .select()
        .eq("email", email)
        .single();

      if (!data) return null;
      return mapUser(data);
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const { data } = await supabase
        .from("Account")
        .select(`*, User(*)`)
        .eq("provider", provider)
        .eq("providerAccountId", providerAccountId)
        .single();

      if (!data?.User) return null;
      return mapUser(data.User);
    },

    async updateUser(user) {
      const { data, error } = await supabase
        .from("User")
        .update({
          name: user.name,
          email: user.email,
          image: user.image,
          emailVerified: user.emailVerified?.toISOString() ?? null,
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return mapUser(data);
    },

    async deleteUser(userId) {
      await supabase.from("User").delete().eq("id", userId);
    },

    async linkAccount(account: AdapterAccount) {
      const { error } = await supabase.from("Account").insert({
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token ?? null,
        access_token: account.access_token ?? null,
        expires_at: account.expires_at ?? null,
        token_type: account.token_type ?? null,
        scope: account.scope ?? null,
        id_token: account.id_token ?? null,
        session_state: account.session_state ?? null,
      });

      if (error) throw new Error(error.message);
      return account as AdapterAccount;
    },

    async unlinkAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
      await supabase
        .from("Account")
        .delete()
        .eq("provider", provider)
        .eq("providerAccountId", providerAccountId);
    },

    async createSession(session) {
      const { data, error } = await supabase
        .from("Session")
        .insert({
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires.toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return {
        id: data.id,
        sessionToken: data.sessionToken,
        userId: data.userId,
        expires: new Date(data.expires),
      };
    },

    async getSessionAndUser(sessionToken) {
      const { data } = await supabase
        .from("Session")
        .select(`*, User(*)`)
        .eq("sessionToken", sessionToken)
        .single();

      if (!data?.User) return null;
      return {
        session: {
          id: data.id,
          sessionToken: data.sessionToken,
          userId: data.userId,
          expires: new Date(data.expires),
        },
        user: mapUser(data.User),
      };
    },

    async updateSession(session) {
      const { data } = await supabase
        .from("Session")
        .update({ expires: session.expires?.toISOString() })
        .eq("sessionToken", session.sessionToken)
        .select()
        .single();

      if (!data) return null;
      return {
        id: data.id,
        sessionToken: data.sessionToken,
        userId: data.userId,
        expires: new Date(data.expires),
      };
    },

    async deleteSession(sessionToken) {
      await supabase
        .from("Session")
        .delete()
        .eq("sessionToken", sessionToken);
    },

    async createVerificationToken(token) {
      await supabase.from("VerificationToken").insert({
        identifier: token.identifier,
        token: token.token,
        expires: token.expires.toISOString(),
      });
      return token;
    },

    async useVerificationToken({ identifier, token }) {
      const { data } = await supabase
        .from("VerificationToken")
        .select()
        .eq("identifier", identifier)
        .eq("token", token)
        .single();

      if (!data) return null;

      await supabase
        .from("VerificationToken")
        .delete()
        .eq("identifier", identifier)
        .eq("token", token);

      return {
        identifier: data.identifier,
        token: data.token,
        expires: new Date(data.expires),
      };
    },
  };
}
