# MLS Listing Description Generator

A small, opinionated web app that turns structured property details into three MLS-ready listing descriptions — one in each tone (Professional, Warm, Luxury). Built for one specific real estate agent (my dad) so I could have a real user, real feedback, and a real shipping deadline while I make the career jump from sales into AI engineering.

This is a case-study project. The README is written to be useful both to anyone evaluating the work and to future-me coming back to make changes.

---

## What it does

- Take structured property details (address, beds, baths, square footage, features, etc.) as input.
- Call Claude (Sonnet 4.5) with a versioned system prompt and **forced tool use** so the model returns three structured listing-description variants — one in each tone.
- Render the variants side-by-side with a one-click copy button per variant.
- Persist the last 100 generations in `localStorage` so the user can revisit and re-copy old listings without a backend.

The hard problem isn't the UI. It's keeping the model from inventing facts. See [`decisions.md`](./decisions.md) — entry #7 — for the story of how a real-world sparse input ("Newer build in Bellefontaine, great for kids and family") caused the v3 prompt to invent schools, a "family-friendly neighborhood," and "energy efficiency" claims, and how v4 fixes it. In real estate copy, hallucinated features are a legal liability for the agent — this is the most important class of bug to prevent.

## Stack

- **Next.js 14** (App Router, TypeScript strict)
- **Anthropic SDK** with `claude-sonnet-4-5`, ephemeral prompt caching, and tool use for structured output
- **Tailwind CSS** (no CSS modules), `prefers-color-scheme` dark mode
- **Vercel** for hosting
- **No database.** History lives in `localStorage` (FIFO, capped at 100). v1 has one user — a backend would be cosplay.

## Architecture in one paragraph

`ListingForm.tsx` collects property fields → POSTs to `/api/generate/route.ts` → the route is a thin wrapper around `src/lib/generate.ts`, which validates input, builds the user message, and calls Anthropic with a cached system prompt + a forced `return_listing_variants` tool. The tool's input schema is a JSON Schema with an enum on the `label` field, so the model can only return `"Professional" | "Warm" | "Luxury"`. The route returns `{ variants, promptVersion }` to the page, which renders the variants and appends a `Generation` record to localStorage via `src/lib/history.ts`. The eval suite imports `generate()` directly so it tests the same code path the API uses, no HTTP server boot required.

```
src/
  app/
    page.tsx                     # Main UI, owns generate state and history refresh
    layout.tsx                   # Geist font, metadata
    api/generate/route.ts        # Thin HTTP wrapper around generate()
  components/
    ListingForm.tsx              # Controlled form, 500-word features cap
    VariantCard.tsx              # Variant + copy button
    HistorySidebar.tsx           # Collapsible, reads localStorage in useEffect (SSR-safe)
  lib/
    types.ts                     # ListingInput, Variant, Generation, GenerateSuccess, ApiError
    history.ts                   # The ONLY module that touches localStorage
    generate.ts                  # SERVER-ONLY. validateInput, buildUserMessage, generate()
  prompts/
    listing-generator-v1.md      # Original (preserved)
    listing-generator-v2.md      # First tool-use prompt (preserved)
    listing-generator-v3.md      # Drop tone selector (preserved)
    listing-generator-v4.md      # ACTIVE: anti-hallucination + adaptive length

tests/evals/
  fixtures.ts                    # 6 fixtures, including a sparse-input regression case
  run.ts                         # Eval runner — npm run eval

decisions.md                     # Append-only log of every major design decision
CLAUDE.md                        # Project memory for Claude Code
```

## Prompt versioning

Every prompt change creates a new file (`v1.md`, `v2.md`, ...). Old versions are **never overwritten or deleted**. `PROMPT_VERSION` in `src/lib/generate.ts` is the single source of truth for which one is active, and that string is stored on every history entry so we can audit *which prompt produced this listing*.

This sounds heavy-handed for a small app. It is the single most useful convention in the codebase. It made the v3-broke-the-CTA bug and the v4 Bellefontaine hallucination fix into one-line rollbacks if I'd needed them.

## Evals

```bash
npm run eval
```

Six fixtures, no HTTP. Each fixture runs through `generate()` directly and the runner checks:

**Hard checks (failures exit non-zero):**
- Exactly 3 variants returned
- Each variant has a non-empty label and text
- Word count between 60 and 250 (floor was 100 in v3 — see decisions.md #7 for why it dropped)
- No exclamation points
- No banned clichés (`"must-see"`, `"won't last"`, `"one-of-a-kind"`)

**Soft checks (warnings):**
- A `shouldMention` list of distinctive feature words that should appear in *at least one* of the three variants. These catch the model wandering away from the actual input.

The sparse-input fixture (`"Sparse input — anti-hallucination regression"`) is the regression test for the Bellefontaine bug. **Do not remove it.**

## Running locally

```bash
git clone https://github.com/JordanmFrancis/mls-listing-description-generator.git
cd mls-listing-description-generator
npm install

# Add your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

npm run dev          # http://localhost:3000
npm run eval         # Run the prompt eval suite
npm run build        # Production build
```

`.env.local` is gitignored. Never commit your key.

## Deploying

This deploys to Vercel as a standard Next.js project. One thing to know:

**`ANTHROPIC_API_KEY` must be set in Vercel project settings for Production AND Preview AND Development.** `.env.local` is gitignored, so it isn't in the deploy. The build will succeed but every API call will return 500 until the env var is added in the Vercel dashboard.

## Status

v1 is shipped on `main`. The user (my dad) is using it for real listings. Feedback gets captured in `backlog.md` and triaged into versioned prompt bumps or feature work as it comes in.

## Why this project exists

I'm transitioning from a career in sales into AI engineering. I picked this project because it satisfies a few constraints at once: it has a real user with a real problem, the hard part is on the prompt/eval side rather than the framework side, the failure modes are interesting (hallucinated facts in legally-binding marketing copy), and the scope is small enough to actually finish and ship in a week. The decisions log and the versioned prompts are there because I want the *reasoning* to be reviewable, not just the code.

If you're poking around because you're considering hiring me, [`decisions.md`](./decisions.md) is the highest-signal file in the repo.
