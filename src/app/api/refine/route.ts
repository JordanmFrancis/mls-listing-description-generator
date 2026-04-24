/**
 * POST /api/refine
 *
 * Refines one listing variant per the agent's instruction. Mirrors the
 * generate flow: reads the user's saved guidelines from Supabase (DB is
 * the source of truth), calls Anthropic, and — if a `generationId` is
 * provided — updates that row's variants array in place so the Archive
 * stays in sync with what the agent sees on screen.
 *
 * Middleware rejects unauthenticated requests with 401 before they reach
 * here; we still fetch the user defensively.
 */

import { NextResponse } from "next/server";
import {
  RefineError,
  refineVariant,
  validateRefineInput,
} from "@/lib/refine";
import { createClient } from "@/lib/supabase/server";
import type { ApiError, RefineRequest, RefineSuccess, Variant } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: Request
): Promise<NextResponse<RefineSuccess | ApiError>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  let validated;
  try {
    validated = validateRefineInput(body);
  } catch (err) {
    if (err instanceof RefineError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Read saved guidelines (same contract as /api/generate).
  let extraGuidelines: string | undefined;
  try {
    const { data } = await supabase
      .from("guidelines")
      .select("text")
      .eq("user_id", user.id)
      .maybeSingle();
    const text = data?.text?.trim();
    if (text) extraGuidelines = text;
  } catch {
    extraGuidelines = undefined;
  }

  let refinedText: string;
  try {
    refinedText = await refineVariant(validated, extraGuidelines);
  } catch (err) {
    if (err instanceof RefineError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // If the client sent the archive row's id, update that row so the
  // refined version is what shows up in the Archive sidebar and on
  // future loads. RLS restricts us to rows this user owns.
  const generationId = (body as RefineRequest).generationId;
  if (typeof generationId === "string" && generationId.length > 0) {
    try {
      const { data: row } = await supabase
        .from("generations")
        .select("variants")
        .eq("id", generationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (row && Array.isArray(row.variants)) {
        const currentVariants = row.variants as Variant[];
        const updated = currentVariants.map((v) =>
          v.label === validated.currentVariant.label
            ? { label: v.label, text: refinedText }
            : v
        );
        await supabase
          .from("generations")
          .update({ variants: updated })
          .eq("id", generationId)
          .eq("user_id", user.id);
      }
    } catch {
      // Non-fatal — the user still gets the refined text in the response.
    }
  }

  return NextResponse.json({ text: refinedText }, { status: 200 });
}
