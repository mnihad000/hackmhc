// Supabase client factory for use inside Next.js middleware (middleware.ts).
// Unlike the server client, this one operates on the raw NextRequest/NextResponse
// objects because middleware runs before the request reaches any route or component.
//
// Returns both the supabase client AND the modified response so the root middleware
// can call auth methods and then return the response with updated session cookies.
// (The original Supabase snippet only returned supabaseResponse, which made it
// impossible to call supabase.auth.getUser() — we fixed that by returning both.)
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const createClient = (request: NextRequest) => {
  // Start with a passthrough response that forwards the original request headers
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read cookies from the incoming request (where the session token lives)
        getAll() {
          return request.cookies.getAll();
        },
        // When Supabase refreshes a session it needs to write new cookies to both
        // the request (so downstream code sees them) and the response (so the browser saves them)
        setAll(cookiesToSet) {
          // Mutate request cookies so the rest of this middleware run sees the updated session
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Rebuild the response with the mutated request so headers stay consistent
          supabaseResponse = NextResponse.next({ request });
          // Also set the cookies on the outgoing response so the browser stores them
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Return both so the caller (middleware.ts) can refresh the session and then return the response
  return { supabase, supabaseResponse };
};
