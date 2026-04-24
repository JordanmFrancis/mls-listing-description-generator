/**
 * POST /api/generate
 *
 * Thin HTTP wrapper over src/lib/generate. Validates the request body,
 * reads the user's saved guidelines from Supabase (authoritative — we
 * never trust client-supplied guideline text), and delegates to generate().
 *
 * Middleware already rejects unauthenticated requests with 401 before
 * they reach this handler, but we defensively fetch the user again here
 * so the RLS query works and so nothing slips through on a middleware
 * config change.
 */

import { NextResponse } from "next/server";
import { generate, validateInput, GenerateError } from "@/lib/generate";
import { createClient } from "@/lib/supabase/server";
import type { ApiError, GenerateSuccess } from "@/lib/types";

export const runtime = "nodejs"; // generate.ts reads from fs — requires node runtime, not edge

export async function POST(
  request: Request
): Promise<NextResponse<GenerateSuccess | ApiError>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  let input;
  try {
    input = validateInput(body);
  } catch (err) {
    if (err instanceof GenerateError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  // Single Supabase client for this request — used both to read the
  // user's guidelines and to archive the resulting generation.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Read the user's guidelines from Supabase. Client-supplied guideline
  // text in the request body is IGNORED — DB is the source of truth.
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
    // Non-fatal — proceed without guidelines rather than blocking generate.
    extraGuidelines = undefined;
  }

  try {
    const result = await generate(input, extraGuidelines);

    // Archive the generation and grab its id so the client can pass it
    // back to /api/refine and edits land on the same row. If the insert
    // fails, the user still sees their variants; they just won't show up
    // in the sidebar and refinements can't update the DB row until they
    // re-generate. We never surface DB errors as API errors.
    let generationId: string | undefined;
    try {
      const { data: inserted } = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          prompt_version: result.promptVersion,
          input,
          variants: result.variants,
        })
        .select("id")
        .single();
      generationId = inserted?.id;
    } catch {
      // ignore — generation succeeded, archive is best-effort
    }

    return NextResponse.json({ ...result, generationId }, { status: 200 });
  } catch (err) {
    if (err instanceof GenerateError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
