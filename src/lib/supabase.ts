import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);

// Placeholder values keep the app bootable before .env.local exists;
// the login screen shows a setup message in that case.
export const supabase = createClient(
  url ?? "http://localhost:54321",
  key ?? "missing-key",
  { auth: { persistSession: true, autoRefreshToken: true } },
);
