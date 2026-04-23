/**
 * The ONLY module that touches localStorage. Per CLAUDE.md and the spec,
 * no other file in the app should call localStorage.getItem / setItem directly.
 *
 * Schema lives in src/lib/types.ts. Storage contract from specs/listing-generator.md:
 *   - key: "listing-generator-history"
 *   - value: JSON array of Generation objects
 *   - Never mutate existing entries. New generations are prepended (newest first).
 *   - Cap at 100 entries; drop oldest (tail) when exceeded.
 *   - Reads tolerate malformed or partial data: invalid entries are dropped silently.
 *   - Reads tolerate SSR (window undefined → return []).
 */

import type { Generation, ListingInput, Variant } from "./types";

export const HISTORY_KEY = "listing-generator-history";
export const HISTORY_LIMIT = 100;
export const GUIDELINES_KEY = "listing-generator-guidelines";
export const GUIDELINES_MAX_CHARS = 4000;

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isValidVariant(v: unknown): v is Variant {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.label === "string" && typeof o.text === "string";
}

function isValidInput(i: unknown): i is ListingInput {
  if (!i || typeof i !== "object") return false;
  const o = i as Record<string, unknown>;
  return (
    typeof o.address === "string" &&
    typeof o.beds === "number" &&
    typeof o.baths === "number" &&
    typeof o.features === "string"
  );
}

function isValidGeneration(g: unknown): g is Generation {
  if (!g || typeof g !== "object") return false;
  const o = g as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.createdAt === "string" &&
    typeof o.promptVersion === "string" &&
    isValidInput(o.input) &&
    Array.isArray(o.variants) &&
    o.variants.every(isValidVariant)
  );
}

/**
 * Reads the full history. Returns an empty array on any failure
 * (missing key, malformed JSON, server-side render). Per-entry validation
 * silently drops malformed entries so a single bad record can't crash the UI.
 */
export function getHistory(): Generation[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidGeneration);
  } catch {
    return [];
  }
}

/**
 * Prepends a new generation to history (newest at index 0). Caps at
 * HISTORY_LIMIT, dropping the oldest entries from the tail. Existing
 * entries are never mutated.
 */
export function addGeneration(gen: Generation): void {
  if (!hasWindow()) return;
  try {
    const current = getHistory();
    const next = [gen, ...current].slice(0, HISTORY_LIMIT);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // localStorage full, quota exceeded, or serialization error —
    // silently drop the write. History is best-effort; a failed save
    // must not break the main flow of showing the user their variants.
  }
}

/** Looks up a single generation by id. Returns null if not found. */
export function getGenerationById(id: string): Generation | null {
  const all = getHistory();
  return all.find((g) => g.id === id) ?? null;
}

/** Wipes all history. Useful for dev/testing and a future "clear history" button. */
export function clearHistory(): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

/**
 * Custom system-prompt guidelines the agent has saved for themselves. These
 * are appended to the base prompt on every generate call. Stored as a single
 * plain string; empty string means "no custom guidelines".
 */
export function getGuidelines(): string {
  if (!hasWindow()) return "";
  try {
    const raw = window.localStorage.getItem(GUIDELINES_KEY);
    if (typeof raw !== "string") return "";
    return raw.slice(0, GUIDELINES_MAX_CHARS);
  } catch {
    return "";
  }
}

export function setGuidelines(text: string): void {
  if (!hasWindow()) return;
  try {
    const trimmed = text.slice(0, GUIDELINES_MAX_CHARS);
    if (trimmed.length === 0) {
      window.localStorage.removeItem(GUIDELINES_KEY);
    } else {
      window.localStorage.setItem(GUIDELINES_KEY, trimmed);
    }
  } catch {
    // ignore
  }
}
