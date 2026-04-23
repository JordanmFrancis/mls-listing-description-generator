/**
 * Agent-defined system-prompt guidelines — now DB-backed.
 *
 * Read/write goes through Supabase's `guidelines` table. RLS ensures each
 * signed-in user only sees their own row. The table's primary key is
 * `user_id`, so upsert on that column.
 *
 * These helpers are for the CLIENT (they use the browser Supabase client
 * and include the user's session cookies automatically). Server code
 * reads guidelines directly via `src/lib/supabase/server.ts` inside
 * /api/generate; it does not go through this module.
 */

import { createClient } from "@/lib/supabase/client";

export const GUIDELINES_MAX_CHARS = 4000;

/** Returns the current user's guidelines text, or "" if no row / not signed in. */
export async function getGuidelines(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "";

  const { data, error } = await supabase
    .from("guidelines")
    .select("text")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return "";
  return (data.text ?? "").slice(0, GUIDELINES_MAX_CHARS);
}

/**
 * Writes guidelines for the current user. Upserts by user_id so we don't
 * need to differentiate between first-save and subsequent saves.
 *
 * Resolves to `true` on success, `false` on any failure (not signed in,
 * network error, RLS rejection, etc.). Callers should show a toast/error
 * on false; we don't throw because the failure modes are expected and
 * caller-handled.
 */
export async function setGuidelines(text: string): Promise<boolean> {
  const trimmed = text.slice(0, GUIDELINES_MAX_CHARS);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("guidelines").upsert(
    { user_id: user.id, text: trimmed },
    { onConflict: "user_id" }
  );
  return !error;
}
