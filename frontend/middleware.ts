// Root Next.js middleware — runs on every request before it hits a route or component.
// Its job is to refresh the Supabase auth session so Server Components always see
// an up-to-date user, even after a token expires mid-session.
import { type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Create a Supabase client scoped to this request, plus the response we'll return
  const { supabase, supabaseResponse } = createClient(request);

  // Calling getUser() triggers a session refresh if the access token has expired.
  // The updated session cookies are written into supabaseResponse automatically.
  await supabase.auth.getUser();

  // Return the response (which may have refreshed session cookies set on it)
  return supabaseResponse;
}

export const config = {
  // Run middleware on all routes except Next.js internals and static assets
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
