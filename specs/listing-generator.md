# Spec: Listing Generator v1

## What
A single-page web app that generates 3 MLS listing description variants from a simple form. User fills in property details, picks a tone, clicks generate, gets 3 copy-pasteable descriptions.

## Who / When
Dad (real estate agent). Uses it every time he lists a new property. Replaces ~20 minutes of manual writing with ~2 minutes of form + review.

## Happy Path
1. Opens the app in a browser
2. Fills form: address, beds, baths, sqft, lot size, year built, key features (freeform text), tone (Professional / Warm / Luxury)
3. Clicks "Generate"
4. Sees 3 variants side-by-side, each ~150-200 words
5. Clicks "Copy" on the one he likes best
6. Done

## Edge Cases That Matter
1. Missing optional fields (lot size, year built) — tool still works, prompt adapts
2. Very long freeform features (500+ words) — truncate gracefully or warn
3. API failure — show a clear error, don't crash, let him retry
4. Rate limiting or cost runaway — simple client-side debounce on the generate button (no double-clicks)

## Data Model — localStorage History

History is stored in localStorage under the key `listing-generator-history`
as a JSON array of generation objects. Each object:

{
  id: string              // crypto.randomUUID()
  createdAt: string       // ISO timestamp
  promptVersion: string   // e.g. "listing-generator-v1"
  input: {
    address: string
    beds: number
    baths: number
    sqft: number | null
    lotSize: string | null
    yearBuilt: number | null
    features: string       // freeform
    tone: "professional" | "warm" | "luxury"
  }
  variants: [
    { label: string, text: string }   // always 3
  ]
}

Rules:
- Never mutate an existing generation. New generations append.
- Cap history at 100 generations; drop oldest when exceeded.
- All reads/writes go through a single module (src/lib/history.ts) — no
  direct localStorage access elsewhere in the app.
- The schema must support future attachment of per-generation feedback,
  per-variant refinement, and regeneration without a breaking change.
  (Future fields will be added as optional properties on the generation
  object or as sibling keys in localStorage keyed by generation id.)

## Explicitly NOT Doing v1
- No accounts / login
- No database — history is client-side localStorage only
- No photo upload or vision analysis (v2)
- No MLS integration (v2)
- No multi-user, no sharing
- No mobile-optimized design (desktop-first, mobile just needs to not be broken)

## Success Criteria
- Dad uses it on 3 real listings in the first 2 weeks
- Each listing generation takes <2 minutes end-to-end for him
- He keeps using it unprompted after week 2