"use client";

/**
 * VariantCard — renders one listing variant in editorial style with a
 * Roman numeral, drop cap, and copy-to-clipboard button. Copy flips to
 * "Copied" for 2 seconds after success.
 */

import { useState } from "react";
import type { Variant } from "@/lib/types";

interface Props {
  variant: Variant;
  index: number;
}

const ROMAN = ["I.", "II.", "III.", "IV.", "V."];

export default function VariantCard({ variant, index }: Props) {
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
  const first = variant.text.charAt(0);
  const rest = variant.text.slice(1);

  return (
    <article className="border-t pt-6" style={{ borderColor: "rgba(26,26,26,0.2)" }}>
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-baseline gap-4">
          <span className="font-serif text-2xl" style={{ color: "var(--accent)" }}>
            {ROMAN[index] ?? `${index + 1}.`}
          </span>
          <h3 className="font-serif text-2xl">{variant.label}</h3>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: "rgba(26,26,26,0.5)" }}>
            {wordCount} words
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-[10px] tracking-[0.3em] uppercase border px-4 py-1.5 transition-colors"
            style={
              copied
                ? { borderColor: "var(--accent)", color: "var(--accent)", background: "transparent" }
                : { borderColor: "rgba(26,26,26,0.4)", color: "var(--ink)", background: "transparent" }
            }
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>
      <p
        className="font-serif text-[17px] leading-[1.75] whitespace-pre-wrap"
        style={{ color: "rgba(26,26,26,0.9)" }}
      >
        <span
          className="float-left font-serif text-[56px] leading-[0.85] mr-2 mt-1"
          style={{ color: "var(--accent)" }}
        >
          {first}
        </span>
        {rest}
      </p>
    </article>
  );
}
