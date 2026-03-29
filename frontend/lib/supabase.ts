// Simple Supabase client using the base supabase-js library (not SSR-aware).
// Use this only for non-auth operations (e.g. storage uploads, direct DB queries
// from client-side code that doesn't need a server session).
// For auth-aware server/client usage, use utils/supabase/server.ts or utils/supabase/client.ts instead.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
