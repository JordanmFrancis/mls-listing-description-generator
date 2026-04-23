/**
 * Session refresh + auth guard for Next.js middleware.
 *
 * Called from root middleware.ts on every request. Refreshes the
 * Supabase session cookies (keeps users signed in) and redirects
 * unauthenticated traffic on protected routes to /login.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes any visitor can hit without being logged in.
const PUBLIC_ROUTES = ["/login", "/auth/callback"];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the session cookie. Must run on every request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Not logged in and visiting a protected resource.
  if (!user && !isPublic(pathname)) {
    // API routes: return 401 JSON. Redirects break fetch() callers.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Not signed in." },
        { status: 401 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Preserve where they were trying to go so we can bounce back post-login.
    if (pathname !== "/") {
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url);
  }

  // Already logged in but on /login → send them home.
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return response;
}
