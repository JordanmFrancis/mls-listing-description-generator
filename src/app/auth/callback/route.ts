/**
 * GET /auth/callback
 *
 * The redirect target for both Google OAuth and email magic link sign-ins.
 * Supabase sends the user here with ?code=… which we exchange for a session
 * (sets the auth cookies). Then we bounce them to ?next=… (if provided) or
 * the home page.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";
  const errorDescription = url.searchParams.get("error_description");

  if (errorDescription) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("error", errorDescription);
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(loginUrl);
  }

  // Only allow relative paths to prevent open redirect.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
