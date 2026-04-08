/**
 * The ONLY module that touches localStorage. Per CLAUDE.md and the spec,
 * no other file in the app should call localStorage.getItem / setItem directly.
 *
 * Schema lives in src/lib/types.ts. Storage contract from specs/listing-generator.md:
 *   - key: "listing-generator-history"
 *   - value: JSON array of Generation objects
 *   - Never mutate existing entries. New generations append.
 *   - Cap at 100 entries; drop oldest when exceeded.
 *   - Reads tolerate malformed or partial data (return []).
 *   - Reads tolerate SSR (window undefined → return []).
 */

import type { Generation } from "./types";

export const HISTORY_KEY = "listing-generator-history";
export const HISTORY_LIMIT = 100;

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Reads the full history. Returns an empty array on any failure
 * (missing key, malformed JSON, server-side render).
 */
export function getHistory(): Generation[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Generation[];
  } catch {
    return [];
  }
}

/**
 * Prepends a new generation to history. Caps at HISTORY_LIMIT, dropping
 * the oldest entries (from the tail). Existing entries are never mutated.
 */
export function appendGeneration(gen: Generation): void {
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
