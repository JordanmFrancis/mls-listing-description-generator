/**
 * Document → listing field extraction. Calls Anthropic with vision/PDF
 * support and a forced tool use schema so the model returns structured
 * partial ListingInput fields.
 *
 * SERVER-ONLY. Mirrors the pattern in src/lib/generate.ts. The
 * /api/extract route is the only intended caller.
 */

import { readFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedFields } from "./types";

if (typeof window !== "undefined") {
  throw new Error("src/lib/extract.ts must not be imported from the client.");
}

export const EXTRACT_PROMPT_VERSION = "extract-fields-v1";
const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 1024;

const SYSTEM_PROMPT: string = readFileSync(
  join(process.cwd(), "src", "prompts", `${EXTRACT_PROMPT_VERSION}.md`),
  "utf-8"
);

export class ExtractError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ExtractError";
    this.status = status;
  }
}

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extract_listing_fields",
  description:
    "Return any listing fields you can read from the uploaded document. Omit fields you cannot find.",
  input_schema: {
    type: "object",
    properties: {
      address: { type: "string" },
      beds: { type: "number" },
      baths: { type: "number" },
      sqft: { type: "integer" },
      lotSize: { type: "string" },
      yearBuilt: { type: "integer" },
      features: { type: "string" },
    },
    required: [],
  },
};

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ExtractError("ANTHROPIC_API_KEY is not set on the server.", 500);
  }
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export interface ExtractInput {
  base64: string;
  mediaType: string;
  kind: "pdf" | "image";
}

export async function extractListingFields(
  input: ExtractInput
): Promise<ExtractedFields> {
  if (!input.base64 || typeof input.base64 !== "string") {
    throw new ExtractError("Missing file data.", 400);
  }
  if (input.kind !== "pdf" && input.kind !== "image") {
    throw new ExtractError("File kind must be 'pdf' or 'image'.", 400);
  }

  const client = getClient();

  const fileBlock =
    input.kind === "pdf"
      ? ({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: input.base64,
          },
        } as const)
      : ({
          type: "image",
          source: {
            type: "base64",
            media_type: input.mediaType as
              | "image/jpeg"
              | "image/png"
              | "image/gif"
              | "image/webp",
            data: input.base64,
          },
        } as const);

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "extract_listing_fields" },
      messages: [
        {
          role: "user",
          content: [
            fileBlock as Anthropic.ContentBlockParam,
            {
              type: "text",
              text: "Extract any listing fields you can read from this document by calling the extract_listing_fields tool. Omit fields you cannot find.",
            },
          ],
        },
      ],
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown Anthropic API error.";
    throw new ExtractError(`Anthropic API error: ${message}`, 502);
  }

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === "extract_listing_fields"
  );
  if (!toolUseBlock) {
    throw new ExtractError(
      "Model did not return a tool_use block — unexpected response shape.",
      502
    );
  }

  const raw = toolUseBlock.input as Record<string, unknown>;
  const fields: ExtractedFields = {};
  if (typeof raw.address === "string" && raw.address.trim())
    fields.address = raw.address.trim();
  if (typeof raw.beds === "number" && Number.isFinite(raw.beds))
    fields.beds = raw.beds;
  if (typeof raw.baths === "number" && Number.isFinite(raw.baths))
    fields.baths = raw.baths;
  if (typeof raw.sqft === "number" && Number.isFinite(raw.sqft))
    fields.sqft = Math.round(raw.sqft);
  if (typeof raw.lotSize === "string" && raw.lotSize.trim())
    fields.lotSize = raw.lotSize.trim();
  if (typeof raw.yearBuilt === "number" && Number.isFinite(raw.yearBuilt))
    fields.yearBuilt = Math.round(raw.yearBuilt);
  if (typeof raw.features === "string" && raw.features.trim())
    fields.features = raw.features.trim();

  return fields;
}
