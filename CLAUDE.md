# Listing Generator — CLAUDE.md

## What this is
MLS listing description generator for my dad (real estate agent). First paid case study project in my career transition from sales to AI engineering. v1 is live on Vercel; v5 (Story tone + document upload) is on `feature/v5-and-upload` awaiting merge.

## Stack
- Next.js 14 App Router
- Anthropic SDK (@anthropic-ai/sdk), model claude-sonnet-4-5
- Tailwind CSS
- Deployed on Vercel
- No database. Client-side localStorage for history.

## Architecture (one paragraph)
Single page app. Form component collects property fields → POSTs to /api/generate → route calls `generate()` in src/lib/generate.ts → Anthropic API with cached system prompt + forced tool use returns 3 structured variants (Professional/Warm/Story) → UI renders variant cards with copy buttons. Optional document upload flow: file → base64 → POST /api/extract → `extractListingFields()` in src/lib/extract.ts → Claude vision (PDF document block or image block) + forced tool use → partial ListingInput → form auto-populates. History stored in localStorage (capped at 100, newest first), rendered in a collapsible sidebar. Both API routes and the eval runner import their lib helpers directly so evals don't need a running HTTP server.

## File structure
- specs/listing-generator.md — original v1 spec
- src/app/page.tsx — main UI, owns generate state and history refresh
- src/app/layout.tsx — root layout (Geist font, metadata)
- src/app/api/generate/route.ts — thin HTTP wrapper around `generate()`
- src/app/api/extract/route.ts — thin HTTP wrapper around `extractListingFields()`
- src/prompts/listing-generator-v1.md — original prompt (preserved, unused)
- src/prompts/listing-generator-v2.md — first tool-use prompt (preserved, unused)
- src/prompts/listing-generator-v3.md — drop-tone-selector prompt (preserved, unused)
- src/prompts/listing-generator-v4.md — anti-hallucination + adaptive length (preserved, unused)
- src/prompts/listing-generator-v5.md — **active prompt**: Story tone replaces Luxury + bans formula phrases
- src/prompts/extract-fields-v1.md — system prompt for document extraction
- src/lib/types.ts — ListingInput, Variant, Generation, GenerateSuccess, ApiError, ExtractRequest/Response, ExtractedFields
- src/lib/history.ts — the ONLY module that touches localStorage; validates entries on read
- src/lib/generate.ts — server-only: validateInput, buildUserMessage, generate(), GenerateError, PROMPT_VERSION
- src/lib/extract.ts — server-only: extractListingFields(), ExtractError, EXTRACT_PROMPT_VERSION
- src/components/ListingForm.tsx — controlled form, 500-word features cap, document upload UI
- src/components/VariantCard.tsx — variant + copy button
- src/components/HistorySidebar.tsx — collapsible, reads via getHistory() in useEffect (SSR-safe)
- tests/evals/fixtures.ts — 6 fixture listings (5 normal + 1 sparse-input regression case)
- tests/evals/run.ts — eval runner (`npm run eval`)
- decisions.md — major design decisions and the reasoning behind them
- backlog.md — post-v1 ideas (do not spec or build until dad has used v1 on ≥3 real listings)

## Conventions
- TypeScript strict mode
- Tailwind for all styling, no CSS modules
- API routes return JSON, errors as `{ error: string }`
- Prompts versioned in filenames (v1, v2, v3, v4, v5...); **never overwrite old versions** — bump and add new. Old versions stay on disk so we can A/B and roll back.
- All localStorage access goes through src/lib/history.ts. No direct localStorage.getItem/setItem anywhere else.
- src/lib/generate.ts and src/lib/extract.ts are **server-only** — they throw at import time if loaded into the client bundle. Don't import them from a client component.

## What exists
- ✅ Property form: address, beds, baths, sqft, lot size, year built, features (with live word count + 400/500 soft/hard limits)
- ✅ Document upload (PDF or image, ≤5 MB) → Claude vision extracts listing fields → form auto-fills. User can still edit.
- ✅ POST /api/generate route with input validation (400s for bad input) and Anthropic error mapping (502)
- ✅ POST /api/extract route with file size cap and Anthropic error mapping
- ✅ Anthropic call with cached system prompt + forced tool use (`return_listing_variants`) for structured output
- ✅ 3 variants returned: Professional, Warm, Story — labels enforced by tool schema enum
- ✅ Variant cards with one-click copy and "Copied ✓" feedback
- ✅ localStorage history (newest first, 100 cap), collapsible sidebar, click to expand variants inline. `getHistory()` validates each entry and silently drops malformed records so a single bad entry can't crash the UI.
- ✅ Dark mode (via prefers-color-scheme media query)
- ✅ Eval suite: 6 fixtures (incl. sparse-input regression case), hard checks (3 variants, word count 60-250, no exclamations, no banned clichés including v5 formula phrases), soft "shouldMention" signals. `npm run eval`. Currently 6/6 passing on v5.
- ✅ Prompt v5: Story tone replaces Luxury (second-person, present tense, scene-building, sensory but only from listed facts). "No formula phrases" section bans "combines", "boasts", "nestled", "tucked away", "perfect/ideal for", "functional/modern living", "today's lifestyle", and filler "stunning"/"beautiful"/"exquisite". Inherits v4 fact discipline + adaptive length.
- ✅ Build clean (`npm run build`), `npx tsc --noEmit` clean
- ✅ GitHub: JordanmFrancis/mls-listing-description-generator. PR #1 (v1) merged. PR #2 (v3/v4 catch-up) merged. PR #3 (v5 + upload) open on `feature/v5-and-upload`.

## In progress
- Smoke-testing PR #3 on the Vercel preview: upload a real tax card, confirm fields auto-fill, generate variants, confirm Story tone reads as second-person.
- After dad signs off, merge PR #3 to main and promote to Vercel production.

## Do not touch
- src/prompts/listing-generator-v1.md through v4.md — keep for history, do not delete or modify
- src/lib/history.ts public API (`getHistory`, `addGeneration`, `getGenerationById`, `clearHistory`) — page.tsx and HistorySidebar depend on its current shape
- tests/evals/fixtures.ts sparse Bellefontaine fixture — it's the regression test for the v3→v4 hallucination fix

## Secrets
ANTHROPIC_API_KEY in .env.local. Never in code. .env.local is in .gitignore.

## Sharp edges
- **Claude Desktop exports an empty `ANTHROPIC_API_KEY=` into the shell**, which beats `.env.local` unless dotenv runs with `override: true`. The eval runner already does this (see comment in tests/evals/run.ts). If you write another script that loads .env.local, do the same.
- **Vercel deploys need ANTHROPIC_API_KEY set in project settings** for Production AND Preview AND Development. .env.local is gitignored, so the build will succeed but every API call will 500 until the env var is added in the Vercel dashboard.
- **Hallucination pressure from length floors.** If you ever raise the minimum word count, expect the model to invent features again on sparse inputs. The tests/evals sparse fixture exists to catch this — do not remove it.
- **History sidebar reads localStorage in useEffect**, not during render, to avoid SSR hydration mismatch. Don't "optimize" this by moving the read.
- **Document upload size cap is enforced both client-side (5 MB) and server-side (~7 MB base64).** Vercel serverless body limit is ~4.5 MB; don't raise the cap without checking.
- **Banned-phrase evals are non-deterministic.** The model occasionally still uses a banned word like "combines" once in 5-10 runs. If a single eval run fails on a banned phrase, re-run before assuming the prompt regressed. If it fails twice in a row, the prompt actually regressed.
- **`appendGeneration` was renamed to `addGeneration`.** The old name was misleading (it prepends, not appends). Don't reintroduce the old name.
