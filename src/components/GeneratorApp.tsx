"use client";

/**
 * GeneratorApp — the signed-in user's home page.
 *
 * Editorial "Listing Desk" composition: navy/ink header with brass trim
 * over a warm off-white canvas. Composes ListingForm, results grid,
 * HistorySidebar, and owns the form → API → history flow.
 *
 * Rendered by src/app/page.tsx (server component) when the user is
 * signed in. Unsigned users see src/components/Landing.tsx instead.
 */

import { useState } from "react";
import ListingForm from "@/components/ListingForm";
import VariantCard from "@/components/VariantCard";
import HistorySidebar from "@/components/HistorySidebar";
import Masthead from "@/components/Masthead";
import type {
  ListingInput,
  Variant,
  GenerateResponse,
} from "@/lib/types";
import { isApiError } from "@/lib/types";

export default function GeneratorApp() {
  const [variants, setVariants] = useState<Variant[] | null>(null);
  const [generationId, setGenerationId] = useState<string | undefined>(undefined);
  // Snapshot of the input used for the current variants — the refine API
  // needs it as context. Kept separate from the live form state so it
  // doesn't change out from under an in-flight refinement.
  const [lastInput, setLastInput] = useState<ListingInput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [copiedAll, setCopiedAll] = useState(false);

  async function handleCopyAll() {
    if (!variants) return;
    const block = variants
      .map((v) => `${v.label.toUpperCase()}\n\n${v.text}`)
      .join("\n\n———\n\n");
    try {
      await navigator.clipboard.writeText(block);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      // clipboard API unavailable — per-variant Copy buttons still work
    }
  }

  async function handleGenerate(input: ListingInput) {
    setIsGenerating(true);
    setError(null);

    try {
      // Guidelines are read server-side from the user's DB row; no need to
      // ship them in the request body.
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data: GenerateResponse = await res.json();

      if (!res.ok || isApiError(data)) {
        const msg = isApiError(data)
          ? data.error
          : `Request failed with status ${res.status}`;
        setError(msg);
        return;
      }

      setVariants(data.variants);
      setGenerationId(data.generationId);
      setLastInput(input);

      // Server-side /api/generate already inserted the generation into
      // the DB. Bump the sidebar so it re-fetches and picks up the new row.
      setHistoryRefresh((k) => k + 1);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Network error — check your connection and try again.";
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--canvas)", color: "var(--ink)" }}>
      <Masthead active="generator" />

      <div className="max-w-[1400px] mx-auto px-5 md:px-10 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">
          {/* Main column */}
          <div className="min-w-0 flex flex-col gap-10">
            {/* Editorial sub-masthead */}
            <div className="pb-8 border-b" style={{ borderColor: "rgba(var(--ink-rgb),0.2)" }}>
              <div className="text-[10px] tracking-[0.3em] uppercase mb-3 font-medium" style={{ color: "var(--accent)" }}>
                Vol. V — April · Twenty Twenty-Six
              </div>
              <h2 className="font-serif text-3xl md:text-5xl leading-tight tracking-tight max-w-2xl">
                A quiet instrument for the working agent.
              </h2>
              <p className="font-serif italic text-base mt-4 max-w-xl" style={{ color: "rgba(var(--ink-rgb),0.6)" }}>
                Three compositions will be drafted from the particulars you provide — one Professional, one Warm, one Story.
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 text-[10px] tracking-[0.25em] uppercase" style={{ color: "rgba(var(--ink-rgb),0.5)" }}>
                <span>The Desk</span>
                <span style={{ color: "rgba(var(--ink-rgb),0.25)" }}>·</span>
                <span>Composition Room</span>
                <span style={{ color: "rgba(var(--ink-rgb),0.25)" }}>·</span>
                <span>Archive</span>
                <span style={{ color: "rgba(var(--ink-rgb),0.25)" }}>·</span>
                <span>Page 01 / 04</span>
              </div>
            </div>

            <ListingForm onSubmit={handleGenerate} isGenerating={isGenerating} />

            {error && (
              <div
                role="alert"
                className="border px-5 py-4 text-sm"
                style={{
                  borderColor: "rgba(168,40,40,0.4)",
                  background: "rgba(168,40,40,0.05)",
                  color: "#7a1f1f",
                }}
              >
                <div className="font-serif text-lg mb-1">A composition could not be drafted.</div>
                <div>{error}</div>
              </div>
            )}

            {variants && (
              <section>
                <div className="text-[10px] tracking-[0.3em] uppercase mb-3 font-medium" style={{ color: "var(--accent)" }}>
                  Section III — The Drafts
                </div>
                <div className="flex items-baseline justify-between mb-8 gap-4 flex-wrap">
                  <h3 className="font-serif text-3xl leading-tight">
                    Three readings of the same house.
                  </h3>
                  <button
                    type="button"
                    onClick={handleCopyAll}
                    className="text-[10px] tracking-[0.3em] uppercase border px-4 py-2 transition-colors"
                    style={
                      copiedAll
                        ? { borderColor: "var(--accent)", color: "var(--accent)", background: "transparent" }
                        : { borderColor: "rgba(var(--ink-rgb),0.4)", color: "var(--ink)", background: "transparent" }
                    }
                  >
                    {copiedAll ? "Copied all ✓" : "Copy all three"}
                  </button>
                </div>
                <div className="flex flex-col gap-8">
                  {variants.map((v, idx) => (
                    <VariantCard
                      key={`${v.label}-${idx}`}
                      variant={v}
                      index={idx}
                      input={lastInput ?? undefined}
                      generationId={generationId}
                      onRefined={(newText) => {
                        setVariants((prev) =>
                          prev
                            ? prev.map((pv) =>
                                pv.label === v.label
                                  ? { label: pv.label, text: newText }
                                  : pv
                              )
                            : prev
                        );
                        // Server already updated the archive row; bump
                        // the sidebar so it re-fetches the new text.
                        setHistoryRefresh((k) => k + 1);
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {!variants && !error && !isGenerating && (
              <div
                className="border border-dashed px-6 py-10 text-center"
                style={{ borderColor: "rgba(var(--ink-rgb),0.2)" }}
              >
                <p className="font-serif italic text-lg" style={{ color: "rgba(var(--ink-rgb),0.5)" }}>
                  The drafts will appear here once composed.
                </p>
              </div>
            )}
          </div>

          <HistorySidebar refreshKey={historyRefresh} />
        </div>

        <footer
          className="mt-16 pt-6 border-t flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-[10px] tracking-[0.3em] uppercase"
          style={{ borderColor: "rgba(var(--ink-rgb),0.2)", color: "rgba(var(--ink-rgb),0.5)" }}
        >
          <span>Listing Desk — Composed with care</span>
          <span>Page 01 / 04</span>
        </footer>
      </div>
    </main>
  );
}
