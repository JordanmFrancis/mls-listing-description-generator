/**
 * POST /api/generate
 *
 * Thin HTTP wrapper over src/lib/generate. Validates the request body,
 * delegates to the generate() helper, and maps thrown GenerateErrors to
 * the { error: string } shape from the CLAUDE.md convention.
 */

import { NextResponse } from "next/server";
import { generate, validateInput, GenerateError } from "@/lib/generate";
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

  try {
    const result = await generate(input);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof GenerateError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
