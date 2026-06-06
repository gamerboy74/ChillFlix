import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// On the server side, use the secret Service Role Key (to bypass RLS for admin operations)
// On the client side, use the public Anon Key
const supabaseKey = (typeof window === "undefined" ? process.env.SUPABASE_SERVICE_ROLE_KEY : null)
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
