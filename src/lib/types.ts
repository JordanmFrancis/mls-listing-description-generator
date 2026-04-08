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

export function isApiError(r: GenerateResponse): r is ApiError {
  return (r as ApiError).error !== undefined;
}
