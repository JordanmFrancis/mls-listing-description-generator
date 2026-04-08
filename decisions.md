# Decisions

A running log of the major design decisions made on this project, with the reasoning behind each one. Append new entries — do not rewrite history. If a decision is reversed later, add a new entry that explains why; don't edit the old one.

---

## 1. Next.js 14 App Router + Tailwind, no database
**Date:** 2026-04-08
**Decision:** Single-page Next.js 14 app with App Router, TypeScript strict, Tailwind for all styling, no database. History lives in client-side localStorage.
**Why:** v1 needs to ship in days, not weeks. A real backend (Postgres, auth, RLS) would balloon scope and add deploy complexity for zero v1 benefit. localStorage is good enough for one user (dad). When/if we need multi-device sync or sharing, we revisit.
**Trade-off accepted:** History is per-browser. If dad clears cookies or switches devices, history is gone. Acceptable for v1.

---

## 2. Anthropic tool use for structured output, not JSON-in-text parsing
**Date:** 2026-04-08
**Decision:** The Anthropic call uses a forced tool (`return_listing_variants`) with a JSON schema. The model can't return free text — it must call the tool. We parse the tool input directly.
**Why:** The alternative (asking the model to "respond in JSON format" and then `JSON.parse`-ing the text) is fragile. The model will sometimes wrap JSON in markdown fences, add a preamble, or lose a quote on a long generation. Forced tool use eliminates the parse-failure class of bugs entirely. Required a separate prompt version (v2+) since v1 had JSON-formatting instructions baked in.
**Trade-off accepted:** Slightly more ceremony in `generate.ts` (tool schema + tool_use block extraction) vs. a one-line `JSON.parse`. Worth it.

---

## 3. Prompts versioned in filenames; never overwrite
**Date:** 2026-04-08
**Decision:** Every prompt change creates a new file (`listing-generator-v1.md`, `v2.md`, `v3.md`, `v4.md`). The old versions stay on disk forever. `PROMPT_VERSION` in `generate.ts` is the single source of truth for which one is active.
**Why:** Prompts are the most important asset in this project — and the easiest to silently break. Keeping every version on disk means we can A/B, diff, roll back instantly, and audit "what was the prompt when this listing was generated" via the `promptVersion` field stored on every history entry.
**Trade-off accepted:** A few KB of unused prompt files in the repo. Cheap.

---

## 4. Evals run by importing `generate()` directly, not via HTTP
**Date:** 2026-04-08
**Decision:** Both `/api/generate/route.ts` and `tests/evals/run.ts` import `generate()` from `src/lib/generate.ts`. The eval runner does NOT spin up a Next.js dev server and POST to it.
**Why:** Faster (no server boot), simpler (no port juggling, no fetch), and tests the same code path the API uses. The HTTP layer is a thin wrapper — there's nothing meaningful to test about it that an integration test would catch.
**Trade-off accepted:** We don't get end-to-end coverage of the route handler's request parsing. Acceptable because the route handler is ~20 lines and almost entirely pass-through.

---

## 5. Eval before shipping v1, not after
**Date:** 2026-04-08
**Decision:** Built the eval suite (`npm run eval`) before merging v1, not as a "we'll add tests later" item.
**Why:** The original instinct was to defer evals to save time, but the prompt is the riskiest piece of the whole app and the easiest to silently regress. Even a simple suite (3 variants returned, word count, no banned phrases, soft "shouldMention" signals) catches the regressions that matter. v4 already proved this — the sparse-input fixture would have caught the Bellefontaine hallucination case automatically.
**Trade-off accepted:** Half a day of upfront work. Paid for itself within hours.

---

## 6. Drop the tone selector; return one variant per tone instead
**Date:** 2026-04-08
**Decision (v3 prompt):** v1/v2 had the user pick a tone (Professional/Warm/Luxury) and the model returned 3 stylistic variants in that tone. v3 removes the tone selector entirely; the 3 variants are now Professional, Warm, Luxury — one of each. Variant labels are enforced by a tool-schema enum.
**Why:** Real testing exposed the design hole — if you always get 3 variants, why pick a tone at all? And the 3 variants in one tone tended to blur together because the model has limited room to differentiate within a single voice. Returning one per tone makes the variants meaningfully distinct (different *voice*, not just different hook), removes a decision point from the form, and the labels actually carry information.
**Trade-off accepted:** No way to ask for "give me three warm ones." If a real listing needs that, we add a tone selector back as an *advanced* option in a future version. Not yet.

---

## 7. Adaptive length; kill the hard word-count floor
**Date:** 2026-04-08
**Decision (v4 prompt):** v1-v3 told the model "150-200 words per variant." v4 says "aim for 100-200, but write shorter if the input is sparse. Length follows facts, not the other way around." Eval `WORD_COUNT_MIN` lowered from 100 to 60.
**Why:** A real user input — *"Newer build in Bellefontaine, great for kids and family. Turnkey, great value"* — caused v3 to invent a "family-friendly neighborhood," "convenient access to local schools," "energy efficiency," "modern building standards," and "thoughtful layout." None of those were in the input. Root cause: the 150-word floor was creating hallucination pressure. The model couldn't satisfy *both* "150 words" and "no inventions" when given 12 words of features, and the length rule won.
**Why this is a big deal:** In real estate, hallucinated features are a legal liability. Saying "close to schools" without verification is a fair-housing risk. Saying "energy efficient" without rating data is a misrepresentation. This is the single most important class of bug to prevent in the whole app.
**Mitigation beyond the length fix:** v4 also adds an explicit "fact discipline" section to the prompt that enumerates what NOT to invent: neighborhood characteristics, schools/parks/transit, year-built inferences, layout adjectives, finishes, and extrapolations from vague seller phrases like "great for families."
**Regression coverage:** Added a sparse-input eval fixture using the exact Bellefontaine input. The test stays in place forever — do not remove.

---

## 8. localStorage access goes through one module
**Date:** 2026-04-08
**Decision:** `src/lib/history.ts` is the only module in the codebase that touches `window.localStorage`. Everything else (page.tsx, HistorySidebar) calls `getHistory()`, `appendGeneration()`, `clearHistory()`.
**Why:** SSR safety (every read needs a `typeof window !== 'undefined'` guard, easier to enforce in one place), schema migration safety (when the `Generation` shape changes, there's one place to add forward/backward compat), and a single place to enforce the 100-entry FIFO cap. CLAUDE.md encodes this rule so it survives future edits.

---

## 9. `src/lib/generate.ts` is server-only; throws on client import
**Date:** 2026-04-08
**Decision:** `generate.ts` reads the system prompt from disk via `fs.readFileSync` at module init and uses the `ANTHROPIC_API_KEY` env var. It also has a top-level `if (typeof window !== 'undefined') throw` guard.
**Why:** If this module ever gets pulled into a client component's import graph by accident, the build would either fail (no `fs` in browser) or leak the API key into the client bundle. The runtime throw catches the leak immediately in dev rather than at deploy time. The route handler explicitly sets `runtime = "nodejs"` (not edge) for the same reason.

---

## 10. Dark mode kept (via prefers-color-scheme), not a toggle
**Date:** 2026-04-08
**Decision:** Dark mode is handled by Tailwind's default `darkMode: 'media'` strategy — it follows the user's OS preference. No in-app toggle.
**Why:** A toggle is more state to manage (where do you persist it? how does it interact with SSR?) for a v1 that one person uses. Dad's OS already has a setting; respect it. If we ever need a manual override, switching to `darkMode: 'class'` plus a toggle is a small, isolated change.

---

## 11. Vercel deploy: preview URL per branch, production = main
**Date:** 2026-04-08
**Decision:** Use Vercel's default GitHub integration. Every push to a non-`main` branch gets a preview deployment with its own URL. `main` deploys to production. We do not promote to production until PR #1 is reviewed and merged.
**Why:** Standard workflow, zero config, gives us an actual URL to test on without affecting whatever is on prod. The preview URL is what dad will click to test before we merge.
**Sharp edge documented in CLAUDE.md:** `ANTHROPIC_API_KEY` must be added in Vercel project settings (Production + Preview + Development) — `.env.local` is gitignored and won't be in the deploy.
