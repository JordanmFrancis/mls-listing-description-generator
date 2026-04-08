# MLS Listing Generator

Fill in a property form, get 3 listing descriptions in 30 seconds instead of 20 minutes.

Built for my dad, who sells real estate. First paid case study in my move into AI engineering.

**[Live demo](https://mls-listing-description-generator.vercel.app)**

![screenshot](./docs/screenshot.png)

## Stack
Next.js 14 · TypeScript · Tailwind · Anthropic API (Claude Sonnet 4.5) · Vercel

## How it works
- Form collects property details (address, beds/baths/sqft, features, tone)
- API route calls Claude with a cached system prompt and a forced tool for structured output
- Returns 3 variants (Professional, Warm, Luxury), each 100–200 words
- History stored client-side in localStorage, no database

## The interesting part
The first version hallucinated. When given sparse input like *"Newer build in
Bellefontaine, great for kids"* it invented a family-friendly neighborhood,
nearby schools, and energy efficiency claims — none of which were in the input.
In real estate that's a fair-housing liability, not just a typo.

Root cause was a 150-word minimum in the prompt. The model couldn't satisfy
both "150 words" and "no inventions" on sparse inputs, and the length rule won.
I dropped the minimum to 60, added an explicit "do not invent" list to the prompt,
and locked in a regression test using the exact input that broke it.

Full writeup in [`decisions.md`](./decisions.md). Project state lives in [`CLAUDE.md`](./CLAUDE.md).

## Status
v1 live. v2 ideas in [`backlog.md`](./backlog.md) — waiting on real usage before
picking what to build next.
