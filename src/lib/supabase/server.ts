/**
 * Server-side Supabase client for Next.js 14 App Router.
 *
 * Use from:
 *   - Route handlers (app/api/**)
 *   - Server components (async functions in page.tsx, layout.tsx)
 *   - Server actions
 *
 * Reads the user's session from the cookies passed in by Next. Writes must
 * be wrapped in try/catch per the Supabase pattern — server components
 * cannot set cookies, only route handlers and server actions can.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — middleware handles refresh.
          }
        },
      },
    }
  );
}
