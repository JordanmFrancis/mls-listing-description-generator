/**
 * Generation archive — DB-backed via Supabase.
 *
 * Schema lives in the public.generations table (migrations in the
 * listing-desk Supabase project). RLS ensures each signed-in user only
 * sees their own rows.
 *
 * These helpers are for the CLIENT — they use the browser Supabase
 * client and include the user's session cookies automatically. Server
 * code (/api/generate) inserts new rows directly via the server client
 * after a successful Anthropic call; it does NOT go through this module.
 */

import { createClient } from "@/lib/supabase/client";
import type { Generation, Variant, ListingInput } from "./types";

export const HISTORY_LIMIT = 100;

interface GenerationRow {
  id: string;
  created_at: string;
  prompt_version: string;
  input: ListingInput;
  variants: Variant[];
}

function rowToGeneration(row: GenerationRow): Generation {
  return {
    id: row.id,
    createdAt: row.created_at,
    promptVersion: row.prompt_version,
    input: row.input,
    variants: row.variants,
  };
}

/**
 * Lists the signed-in user's generations, newest first, capped at
 * HISTORY_LIMIT. Returns [] on any failure (not signed in, network error,
 * RLS rejection) so the UI can render an empty archive instead of
 * crashing.
 */
export async function listHistory(): Promise<Generation[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("generations")
    .select("id, created_at, prompt_version, input, variants")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error || !data) return [];
  return data.map(rowToGeneration);
}

/** Current number of saved generations for the user. Returns 0 on failure. */
export async function getHistoryCount(): Promise<number> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Wipes all of the user's generations. Resolves to true on success so
 * the caller can update the count UI; false on any failure.
 */
export async function clearHistory(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("generations")
    .delete()
    .eq("user_id", user.id);
  return !error;
}
