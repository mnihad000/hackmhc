// Server-side Supabase client using @supabase/ssr.
// Use this in Server Components and Route Handlers (not Client Components).
// Takes the Next.js cookie store so Supabase can read/write auth session cookies on the server.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read all cookies from the incoming request so Supabase can find the session token
        getAll() {
          return cookieStore.getAll();
        },
        // Write updated session cookies back to the response
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can be called from a Server Component where cookies are read-only.
            // This is safe to ignore because middleware.ts handles session refreshing.
          }
        },
      },
    }
  );
};
