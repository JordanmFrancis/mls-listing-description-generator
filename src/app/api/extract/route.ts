/**
 * POST /api/extract
 *
 * Thin HTTP wrapper over src/lib/extract. Accepts { base64, mediaType, kind }
 * and returns { fields: ExtractedFields } or { error: string }.
 */

import { NextResponse } from "next/server";
import { extractListingFields, ExtractError } from "@/lib/extract";
import type { ApiError, ExtractSuccess, ExtractRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BASE64_LENGTH = 7_000_000; // ~5 MB binary

export async function POST(
  request: Request
): Promise<NextResponse<ExtractSuccess | ApiError>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 }
    );
  }
  const b = body as Partial<ExtractRequest>;
  if (typeof b.base64 !== "string" || !b.base64) {
    return NextResponse.json({ error: "Missing file data." }, { status: 400 });
  }
  if (b.base64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json(
      { error: "File too large. Please upload a file under 5 MB." },
      { status: 413 }
    );
  }
  if (b.kind !== "pdf" && b.kind !== "image") {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF or image." },
      { status: 400 }
    );
  }
  if (typeof b.mediaType !== "string" || !b.mediaType) {
    return NextResponse.json(
      { error: "Missing mediaType." },
      { status: 400 }
    );
  }

  try {
    const fields = await extractListingFields({
      base64: b.base64,
      mediaType: b.mediaType,
      kind: b.kind,
    });
    return NextResponse.json({ fields }, { status: 200 });
  } catch (err) {
    if (err instanceof ExtractError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
