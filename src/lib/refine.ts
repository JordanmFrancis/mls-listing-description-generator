/**
 * Variant refinement — takes one existing variant + an agent instruction,
 * calls Anthropic with forced tool use, returns the refined text.
 *
 * SERVER-ONLY. The /api/refine route is the only intended caller. Mirrors
 * the pattern in src/lib/generate.ts (ephemeral cache on base prompt,
 * agent-defined guidelines as a second system block after the breakpoint).
 */

import { readFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { ListingInput, Variant } from "./types";

if (typeof window !== "undefined") {
  throw new Error("src/lib/refine.ts must not be imported from the client.");
}

export const REFINE_PROMPT_VERSION = "refine-variant-v1";
const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 1024;
const INSTRUCTION_MAX_CHARS = 500;
const GUIDELINES_MAX_CHARS = 4000;

const SYSTEM_PROMPT: string = readFileSync(
  join(process.cwd(), "src", "prompts", `${REFINE_PROMPT_VERSION}.md`),
  "utf-8"
);

export class RefineError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "RefineError";
    this.status = status;
  }
}

const VALID_LABELS = new Set(["Professional", "Warm", "Story"]);

const REFINE_TOOL: Anthropic.Tool = {
  name: "return_refined_variant",
  description: "Return the refined listing description text.",
  input_schema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "The refined variant body. Same tone as the input.",
      },
    },
    required: ["text"],
  },
};

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new RefineError("ANTHROPIC_API_KEY is not set on the server.", 500);
  }
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export interface RefineInput {
  input: ListingInput;
  currentVariant: Variant;
  instruction: string;
}

/** Validates the refine payload. Throws RefineError(400) on bad input. */
export function validateRefineInput(body: unknown): RefineInput {
  if (!body || typeof body !== "object") {
    throw new RefineError("Request body must be a JSON object.", 400);
  }
  const b = body as Record<string, unknown>;

  const input = b.input as ListingInput | undefined;
  if (!input || typeof input !== "object") {
    throw new RefineError("Missing `input`.", 400);
  }
  if (typeof input.address !== "string" || !input.address.trim()) {
    throw new RefineError("Missing input.address.", 400);
  }

  const variant = b.currentVariant as Variant | undefined;
  if (
    !variant ||
    typeof variant !== "object" ||
    typeof variant.label !== "string" ||
    typeof variant.text !== "string" ||
    !variant.text.trim()
  ) {
    throw new RefineError("Missing or invalid `currentVariant`.", 400);
  }
  if (!VALID_LABELS.has(variant.label)) {
    throw new RefineError(
      `Unknown variant label: ${variant.label}. Expected Professional / Warm / Story.`,
      400
    );
  }

  const instruction = b.instruction;
  if (typeof instruction !== "string" || !instruction.trim()) {
    throw new RefineError("Missing `instruction`.", 400);
  }
  if (instruction.length > INSTRUCTION_MAX_CHARS) {
    throw new RefineError(
      `Instruction is ${instruction.length} chars; limit is ${INSTRUCTION_MAX_CHARS}.`,
      400
    );
  }

  return { input, currentVariant: variant, instruction: instruction.trim() };
}

function buildUserMessage(
  input: ListingInput,
  currentVariant: Variant,
  instruction: string
): string {
  const lines: string[] = [];
  lines.push("Property particulars:");
  lines.push(`- Address: ${input.address}`);
  lines.push(`- Bedrooms: ${input.beds}`);
  lines.push(`- Bathrooms: ${input.baths}`);
  if (input.sqft !== null) lines.push(`- Square footage: ${input.sqft}`);
  if (input.lotSize) lines.push(`- Lot size: ${input.lotSize}`);
  if (input.yearBuilt !== null) lines.push(`- Year built: ${input.yearBuilt}`);
  lines.push("");
  lines.push("Features listed:");
  lines.push(input.features);
  lines.push("");
  lines.push(`Current variant (${currentVariant.label}):`);
  lines.push(currentVariant.text);
  lines.push("");
  lines.push("Agent instruction:");
  lines.push(instruction);
  lines.push("");
  lines.push(
    `Return the refined ${currentVariant.label} variant by calling return_refined_variant.`
  );
  return lines.join("\n");
}

/**
 * Calls Anthropic to refine one variant. Returns the new text.
 * `extraGuidelines` behaves exactly as in generate.ts — appended after
 * the ephemeral cache breakpoint.
 */
export async function refineVariant(
  { input, currentVariant, instruction }: RefineInput,
  extraGuidelines?: string
): Promise<string> {
  const client = getClient();

  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
  ];
  const trimmedGuidelines =
    typeof extraGuidelines === "string"
      ? extraGuidelines.trim().slice(0, GUIDELINES_MAX_CHARS)
      : "";
  if (trimmedGuidelines.length > 0) {
    system.push({
      type: "text",
      text: `## Agent-defined guidelines\n\nThe agent using this tool has added the following rules. Follow them alongside the base rules above. Fact discipline still wins.\n\n${trimmedGuidelines}`,
    });
  }

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      tools: [REFINE_TOOL],
      tool_choice: { type: "tool", name: "return_refined_variant" },
      messages: [
        {
          role: "user",
          content: buildUserMessage(input, currentVariant, instruction),
        },
      ],
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown Anthropic API error.";
    throw new RefineError(`Anthropic API error: ${message}`, 502);
  }

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === "return_refined_variant"
  );
  if (!toolUseBlock) {
    throw new RefineError(
      "Model did not return a tool_use block — unexpected response shape.",
      502
    );
  }

  const { text } = toolUseBlock.input as { text?: unknown };
  if (typeof text !== "string" || !text.trim()) {
    throw new RefineError(
      "Model tool call did not contain a text field.",
      502
    );
  }
  return text;
}
