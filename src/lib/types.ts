/**
 * Shared type definitions for the listing generator.
 *
 * The `Generation` shape is the canonical localStorage record — it must match
 * the schema in specs/listing-generator.md. Additions should be backward
 * compatible (optional fields only) so existing records keep loading.
 */

export interface ListingInput {
  address: string;
  beds: number;
  baths: number;
  sqft: number | null;
  lotSize: string | null;
  yearBuilt: number | null;
  features: string;
}

export interface Variant {
  label: string;
  text: string;
}

export interface Generation {
  id: string;
  createdAt: string;
  promptVersion: string;
  input: ListingInput;
  variants: Variant[];
}

/**
 * Request body POSTed to /api/generate. The listing fields are required;
 * `extraGuidelines` carries any agent-defined rules saved on the client
 * (see src/lib/history.ts → getGuidelines). The server appends them to
 * the system prompt.
 */
export type GenerateRequest = ListingInput & {
  extraGuidelines?: string;
};

/** Successful response from /api/generate */
export interface GenerateSuccess {
  variants: Variant[];
  promptVersion: string;
  /** The archived row's id. Used by /api/refine to update the same row. */
  generationId?: string;
}

/** Error response from /api/generate (per CLAUDE.md convention) */
export interface ApiError {
  error: string;
}

export type GenerateResponse = GenerateSuccess | ApiError;

export function isApiError(r: unknown): r is ApiError {
  return (
    !!r && typeof r === "object" && typeof (r as ApiError).error === "string"
  );
}

/** Partial listing fields extracted from an uploaded document. */
export type ExtractedFields = Partial<ListingInput>;

/** Request body POSTed to /api/extract. base64 is the file bytes (no data: prefix). */
export interface ExtractRequest {
  base64: string;
  mediaType: string;
  /** "pdf" → sent as document content block; "image" → image content block. */
  kind: "pdf" | "image";
}

export interface ExtractSuccess {
  fields: ExtractedFields;
}

export type ExtractResponse = ExtractSuccess | ApiError;

/** Request body POSTed to /api/refine. */
export interface RefineRequest {
  input: ListingInput;
  currentVariant: Variant;
  instruction: string;
  /** Optional — when provided, server updates the DB row's variants in place. */
  generationId?: string;
}

export interface RefineSuccess {
  /** The refined text for the variant. Label is unchanged. */
  text: string;
}

export type RefineResponse = RefineSuccess | ApiError;
