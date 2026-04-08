"use client";

/**
 * VariantCard — renders one listing variant with a copy-to-clipboard button.
 *
 * Copy button flips to "Copied" for 2 seconds after a successful copy.
 * If clipboard access fails (non-HTTPS, older browser), falls back to
 * selecting the text so the user can copy manually.
 */

import { useState } from "react";
import type { Variant } from "@/lib/types";

interface Props {
  variant: Variant;
}

export default function VariantCard({ variant }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(variant.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — user can still select-all manually
    }
  }

  const wordCount = variant.text.trim().split(/\s+/).length;

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <header className="flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
          {variant.label}
        </h3>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {wordCount} words
        </span>
      </header>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
        {variant.text}
      </p>
      <button
        type="button"
        onClick={handleCopy}
        className={`self-start rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
          copied
            ? "border-green-600 bg-green-50 text-green-700 dark:border-green-500 dark:bg-green-950 dark:text-green-300"
            : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        }`}
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </article>
  );
}
