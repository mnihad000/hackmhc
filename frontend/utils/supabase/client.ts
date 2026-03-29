// Browser-side Supabase client using @supabase/ssr.
// Use this in Client Components ("use client") — not in Server Components or API routes.
// createBrowserClient handles cookie-based session storage automatically in the browser.
import { createBrowserClient } from "@supabase/ssr";

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
