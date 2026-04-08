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

/** Request body POSTed to /api/generate */
export type GenerateRequest = ListingInput;

/** Successful response from /api/generate */
export interface GenerateSuccess {
  variants: Variant[];
  promptVersion: string;
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
