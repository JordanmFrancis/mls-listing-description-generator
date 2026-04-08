"use client";

/**
 * Main UI. Composes ListingForm, results grid, and HistorySidebar.
 * Owns the form → API → history flow.
 */

import { useState } from "react";
import ListingForm from "@/components/ListingForm";
import VariantCard from "@/components/VariantCard";
import HistorySidebar from "@/components/HistorySidebar";
import { appendGeneration } from "@/lib/history";
import type {
  ListingInput,
  Variant,
  Generation,
  GenerateResponse,
} from "@/lib/types";
import { isApiError } from "@/lib/types";

export default function Home() {
  const [variants, setVariants] = useState<Variant[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  async function handleGenerate(input: ListingInput) {
    setIsGenerating(true);
    setError(null);

    try {
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

      const gen: Generation = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        promptVersion: data.promptVersion,
        input,
        variants: data.variants,
      };
      appendGeneration(gen);
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
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">Listing Generator</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Fill in the property details, pick a tone, get three MLS-ready
            description variants.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <div className="flex flex-col gap-8 min-w-0">
            <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
              <ListingForm
                onSubmit={handleGenerate}
                isGenerating={isGenerating}
              />
            </section>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300"
              >
                <div className="font-semibold mb-1">Generation failed</div>
                <div>{error}</div>
              </div>
            )}

            {variants && (
              <section>
                <h2 className="text-lg font-semibold mb-4">Variants</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {variants.map((v, idx) => (
                    <VariantCard key={idx} variant={v} />
                  ))}
                </div>
              </section>
            )}

            {!variants && !error && !isGenerating && (
              <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Your generated variants will appear here.
              </div>
            )}
          </div>

          <HistorySidebar refreshKey={historyRefresh} />
        </div>
      </div>
    </main>
  );
}
