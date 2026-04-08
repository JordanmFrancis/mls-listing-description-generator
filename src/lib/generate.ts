/**
 * Core generation logic — calls Anthropic with prompt v2 + tool use to
 * return 3 listing description variants.
 *
 * SERVER-ONLY. Do not import from a client component — this module reads
 * from the filesystem and uses the Anthropic API key. Importing it into
 * the client bundle would leak secrets and break the build.
 *
 * Both the /api/generate route and the eval runner import this directly.
 */

import { readFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { ListingInput, Variant } from "./types";

if (typeof window !== "undefined") {
  throw new Error("src/lib/generate.ts must not be imported from the client.");
}

export const PROMPT_VERSION = "listing-generator-v4";
const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 2048;
const FEATURES_WORD_LIMIT = 500;

/** Loaded once at module init so disk IO doesn't run on every request. */
const SYSTEM_PROMPT: string = readFileSync(
  join(process.cwd(), "src", "prompts", `${PROMPT_VERSION}.md`),
  "utf-8"
);

/**
 * Error class with an HTTP status hint. The API route uses `.status` to
 * map to a 4xx / 5xx response.
 */
export class GenerateError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GenerateError";
    this.status = status;
  }
}

/**
 * Validates a ListingInput. Throws GenerateError(400) on invalid input.
 * Rules mirror spec's edge cases: optional fields may be null/empty,
 * features text is capped at FEATURES_WORD_LIMIT words.
 */
export function validateInput(input: unknown): ListingInput {
  if (!input || typeof input !== "object") {
    throw new GenerateError("Request body must be a JSON object.", 400);
  }
  const i = input as Record<string, unknown>;

  if (typeof i.address !== "string" || i.address.trim().length === 0) {
    throw new GenerateError("Address is required.", 400);
  }
  if (typeof i.beds !== "number" || !Number.isFinite(i.beds) || i.beds < 0) {
    throw new GenerateError("Beds must be a non-negative number.", 400);
  }
  if (typeof i.baths !== "number" || !Number.isFinite(i.baths) || i.baths < 0) {
    throw new GenerateError("Baths must be a non-negative number.", 400);
  }
  if (typeof i.features !== "string" || i.features.trim().length === 0) {
    throw new GenerateError("Features are required.", 400);
  }
  const wordCount = i.features.trim().split(/\s+/).length;
  if (wordCount > FEATURES_WORD_LIMIT) {
    throw new GenerateError(
      `Features text is ${wordCount} words; please keep it under ${FEATURES_WORD_LIMIT}.`,
      400
    );
  }
  // Optional fields — accept null, undefined, or a valid value.
  const sqft =
    i.sqft === null || i.sqft === undefined
      ? null
      : typeof i.sqft === "number" && Number.isFinite(i.sqft) && i.sqft >= 0
        ? i.sqft
        : (() => {
            throw new GenerateError("Sqft must be a number or null.", 400);
          })();

  const lotSize =
    i.lotSize === null || i.lotSize === undefined || i.lotSize === ""
      ? null
      : typeof i.lotSize === "string"
        ? i.lotSize
        : (() => {
            throw new GenerateError("Lot size must be a string or null.", 400);
          })();

  const yearBuilt =
    i.yearBuilt === null || i.yearBuilt === undefined
      ? null
      : typeof i.yearBuilt === "number" && Number.isInteger(i.yearBuilt)
        ? i.yearBuilt
        : (() => {
            throw new GenerateError(
              "Year built must be an integer or null.",
              400
            );
          })();

  return {
    address: i.address.trim(),
    beds: i.beds,
    baths: i.baths,
    sqft,
    lotSize,
    yearBuilt,
    features: i.features.trim(),
  };
}

/** Builds the human-readable user message for Claude from a ListingInput. */
export function buildUserMessage(input: ListingInput): string {
  const lines: string[] = ["Property details:"];
  lines.push(`- Address: ${input.address}`);
  lines.push(`- Bedrooms: ${input.beds}`);
  lines.push(`- Bathrooms: ${input.baths}`);
  if (input.sqft !== null) lines.push(`- Square footage: ${input.sqft}`);
  if (input.lotSize) lines.push(`- Lot size: ${input.lotSize}`);
  if (input.yearBuilt !== null) lines.push(`- Year built: ${input.yearBuilt}`);
  lines.push("");
  lines.push("Features:");
  lines.push(input.features);
  lines.push("");
  lines.push(
    "Generate the three tone variants (Professional, Warm, Luxury) now by calling the return_listing_variants tool."
  );
  return lines.join("\n");
}

/** The tool schema that forces structured output. */
const RETURN_VARIANTS_TOOL: Anthropic.Tool = {
  name: "return_listing_variants",
  description: "Return the 3 generated listing description variants.",
  input_schema: {
    type: "object",
    properties: {
      variants: {
        type: "array",
        description: "Exactly 3 listing description variants.",
        items: {
          type: "object",
          properties: {
            label: {
              type: "string",
              enum: ["Professional", "Warm", "Luxury"],
              description: "Tone label: exactly 'Professional', 'Warm', or 'Luxury'.",
            },
            text: {
              type: "string",
              description: "The listing description body, 150-200 words.",
            },
          },
          required: ["label", "text"],
        },
        minItems: 3,
        maxItems: 3,
      },
    },
    required: ["variants"],
  },
};

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new GenerateError(
      "ANTHROPIC_API_KEY is not set on the server.",
      500
    );
  }
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

/**
 * Calls Anthropic with prompt v2 + tool use and returns the 3 variants.
 * Throws GenerateError on any failure.
 */
export async function generate(
  input: ListingInput
): Promise<{ variants: Variant[]; promptVersion: string }> {
  const client = getClient();

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [RETURN_VARIANTS_TOOL],
      tool_choice: { type: "tool", name: "return_listing_variants" },
      messages: [{ role: "user", content: buildUserMessage(input) }],
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown Anthropic API error.";
    throw new GenerateError(`Anthropic API error: ${message}`, 502);
  }

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === "return_listing_variants"
  );
  if (!toolUseBlock) {
    throw new GenerateError(
      "Model did not return a tool_use block — unexpected response shape.",
      502
    );
  }

  const toolInput = toolUseBlock.input as { variants?: unknown };
  if (!Array.isArray(toolInput.variants) || toolInput.variants.length !== 3) {
    throw new GenerateError(
      "Model tool call did not contain exactly 3 variants.",
      502
    );
  }

  const variants: Variant[] = toolInput.variants.map((v, idx) => {
    if (
      !v ||
      typeof v !== "object" ||
      typeof (v as Variant).label !== "string" ||
      typeof (v as Variant).text !== "string"
    ) {
      throw new GenerateError(
        `Variant ${idx + 1} is missing a string label or text.`,
        502
      );
    }
    return {
      label: (v as Variant).label,
      text: (v as Variant).text,
    };
  });

  return { variants, promptVersion: PROMPT_VERSION };
}
