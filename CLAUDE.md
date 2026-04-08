# Listing Generator — CLAUDE.md

## What this is
MLS listing description generator for my dad (real estate agent). First paid case study project in my career transition from sales to AI engineering. Goal: v1 live on Vercel this week, dad using it real.

## Stack
- Next.js 14 App Router
- Anthropic SDK (@anthropic-ai/sdk), model claude-sonnet-4-5
- Tailwind CSS
- Deployed on Vercel
- No database v1. Client-side localStorage for history.

## Architecture (one paragraph)
Single page app. Form component collects property fields → POSTs to /api/generate → route calls `generate()` in src/lib/generate.ts → Anthropic API with cached system prompt + tool use returns 3 structured variants (Professional/Warm/Luxury) → UI renders variant cards with copy buttons. History stored in localStorage (capped at 100, FIFO), rendered in a collapsible sidebar. Both the API route and the eval runner import `generate()` directly so evals don't need a running HTTP server.

## File structure
- specs/listing-generator.md — original v1 spec
- src/app/page.tsx — main UI, owns generate state and history refresh
- src/app/layout.tsx — root layout (Geist font, metadata)
- src/app/api/generate/route.ts — thin HTTP wrapper around `generate()`
- src/prompts/listing-generator-v1.md — original prompt (preserved, unused)
- src/prompts/listing-generator-v2.md — first tool-use prompt (preserved, unused)
- src/prompts/listing-generator-v3.md — drop-tone-selector prompt (preserved, unused)
- src/prompts/listing-generator-v4.md — **active prompt**: anti-hallucination + adaptive length
- src/lib/types.ts — ListingInput, Variant, Generation, GenerateSuccess, ApiError
- src/lib/history.ts — the ONLY module that touches localStorage
- src/lib/generate.ts — server-only: validateInput, buildUserMessage, generate(), GenerateError
- src/components/ListingForm.tsx — controlled form, 500-word features cap
- src/components/VariantCard.tsx — variant + copy button
- src/components/HistorySidebar.tsx — collapsible, reads via getHistory() in useEffect (SSR-safe)
- tests/evals/fixtures.ts — 6 fixture listings (5 normal + 1 sparse-input regression case)
- tests/evals/run.ts — eval runner (`npm run eval`)
- decisions.md — major design decisions and the reasoning behind them

## Conventions
- TypeScript strict mode
- Tailwind for all styling, no CSS modules
- API routes return JSON, errors as `{ error: string }`
- Prompts versioned in filenames (v1, v2, v3, v4...); **never overwrite old versions** — bump and add new. Old versions stay on disk so we can A/B and roll back.
- All localStorage access goes through src/lib/history.ts. No direct localStorage.getItem/setItem anywhere else.
- src/lib/generate.ts is **server-only** — it throws at import time if loaded into the client bundle. Don't import it from a client component.

## What exists (v1, on `feature/generator-v1`, PR #1 open)
- ✅ Property form: address, beds, baths, sqft, lot size, year built, features (with live word count + 400/500 soft/hard limits)
- ✅ POST /api/generate route with input validation (400s for bad input) and Anthropic error mapping (502)
- ✅ Anthropic call with cached system prompt + forced tool use (`return_listing_variants`) for structured output
- ✅ 3 variants returned: Professional, Warm, Luxury — labels enforced by tool schema enum
- ✅ Variant cards with one-click copy and "Copied ✓" feedback
- ✅ localStorage history (FIFO, 100 cap), collapsible sidebar, click to expand variants inline
- ✅ Dark mode (via prefers-color-scheme media query)
- ✅ Eval suite: 6 fixtures (incl. sparse-input regression case), hard checks (3 variants, word count 60-250, no exclamations, no banned clichés), soft "shouldMention" signals. `npm run eval`. Currently 6/6 passing on v4.
- ✅ Prompt v4 anti-hallucination rules: explicit "do not invent" list (neighborhoods, schools, year-built inferences, layout adjectives), and adaptive length (length follows facts).
- ✅ Build clean (`npm run build`)
- ✅ GitHub: JordanmFrancis/mls-listing-description-generator, PR #1 open

## In progress
- Manual QA on the Vercel preview deployment for `feature/generator-v1`
- Re-running the Bellefontaine sparse case on v4 to confirm hallucinations are gone
- Merging PR #1 to main and promoting to Vercel production after dad signs off

## Do not touch
- src/prompts/listing-generator-v1.md, v2.md, v3.md — keep for history, do not delete or modify
- src/lib/history.ts public API — page.tsx and HistorySidebar depend on its current shape

## Secrets
ANTHROPIC_API_KEY in .env.local. Never in code. .env.local is in .gitignore.

## Sharp edges
- **Claude Desktop exports an empty `ANTHROPIC_API_KEY=` into the shell**, which beats `.env.local` unless dotenv runs with `override: true`. The eval runner already does this (see comment in tests/evals/run.ts). If you write another script that loads .env.local, do the same.
- **Vercel deploys need ANTHROPIC_API_KEY set in project settings** for Production AND Preview AND Development. .env.local is gitignored, so the build will succeed but every API call will 500 until the env var is added in the Vercel dashboard.
- **Hallucination pressure from length floors.** If you ever raise the minimum word count, expect the model to invent features again on sparse inputs. The tests/evals sparse fixture exists to catch this — do not remove it.
- **Page-level Tailwind styling looked off in a preview screenshot** (h1 in serif, no container padding) — needs verification in a real browser before assuming it's broken. Form/card classes render fine.
- **History sidebar reads localStorage in useEffect**, not during render, to avoid SSR hydration mismatch. Don't "optimize" this by moving the read.