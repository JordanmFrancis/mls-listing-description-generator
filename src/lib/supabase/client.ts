/**
 * Browser-side Supabase client. Use from "use client" components.
 *
 * Do NOT import this from server code — use src/lib/supabase/server.ts.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
