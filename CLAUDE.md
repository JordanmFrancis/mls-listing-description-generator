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
Single page app. Form component collects property fields → POSTs to /api/generate route → route calls Anthropic API with cached system prompt → returns 3 variants → UI renders variants with copy buttons. History stored in localStorage, rendered in a collapsible sidebar.

## File structure
- specs/ — feature specs
- src/app/page.tsx — main UI
- src/app/api/generate/route.ts — API route that calls Anthropic
- src/prompts/listing-generator-v1.md — versioned system prompt
- src/lib/ — shared utilities (localStorage helpers, types)
- src/components/ — UI components
- tests/evals/ — prompt evals (5-10 fixture listings with expected properties)

## Conventions
- TypeScript strict mode
- Tailwind for all styling, no CSS modules
- API routes return JSON, errors as { error: string }
- Prompts versioned in filenames (v1, v2), never overwrite old versions
- All localStorage access goes through src/lib/history.ts. No direct localStorage.getItem/setItem anywhere else.

## What exists
(empty — about to scaffold)

## In progress
Scaffolding + Dad's v1 listing generator.

## Do not touch
Nothing yet.

## Secrets
ANTHROPIC_API_KEY in .env.local. Never in code. .env.local is in .gitignore.

## Sharp edges
None yet.