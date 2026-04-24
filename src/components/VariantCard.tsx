"use client";

/**
 * VariantCard — renders one listing variant in editorial style with a
 * Roman numeral, drop cap, copy-to-clipboard, and a "Refine" affordance
 * that sends an agent instruction to /api/refine and replaces the text
 * in place.
 *
 * The refine control is collapsed by default to keep the card calm. A
 * successful refine calls onRefined with the new text so the parent can
 * update its variants state; the parent also decides whether to bump the
 * Archive sidebar to pick up the DB-side update.
 */

import { useEffect, useRef, useState } from "react";
import type { Variant } from "@/lib/types";

interface Props {
  variant: Variant;
  index: number;
  /**
   * Called when the agent successfully refines this variant. Parent
   * should replace the variant by label in its state and (ideally) bump
   * the history refreshKey so the Archive reflects the new text.
   */
  onRefined?: (newText: string) => void;
  /** Passed through to /api/refine so the DB row updates in place. */
  generationId?: string;
  /** Full property input — the refine API needs it for context. */
  input?: unknown;
}

const ROMAN = ["I.", "II.", "III.", "IV.", "V."];
const INSTRUCTION_MAX_CHARS = 500;

export default function VariantCard({
  variant,
  index,
  onRefined,
  generationId,
  input,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [justRefined, setJustRefined] = useState(false);

  // Tiny pop on the body when the text is updated in place (post-refine).
  // Skip the initial render so we don't pop on mount — the card already
  // animates in via ld-fade-up at the article level.
  const prevTextRef = useRef(variant.text);
  useEffect(() => {
    if (prevTextRef.current === variant.text) return;
    prevTextRef.current = variant.text;
    setJustRefined(true);
    const t = setTimeout(() => setJustRefined(false), 340);
    return () => clearTimeout(t);
  }, [variant.text]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(variant.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — user can still select-all manually
    }
  }

  async function handleRefine(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = instruction.trim();
    if (!trimmed || refining || !input) return;
    setRefining(true);
    setRefineError(null);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          currentVariant: variant,
          instruction: trimmed,
          generationId,
        }),
      });
      const data = await res.json();
      if (!res.ok || typeof data?.text !== "string") {
        setRefineError(
          typeof data?.error === "string" ? data.error : `Failed (status ${res.status}).`
        );
        return;
      }
      onRefined?.(data.text);
      setInstruction("");
      setRefineOpen(false);
    } catch (err) {
      setRefineError(
        err instanceof Error ? err.message : "Network error — try again."
      );
    } finally {
      setRefining(false);
    }
  }

  const wordCount = variant.text.trim().split(/\s+/).length;
  const first = variant.text.charAt(0);
  const rest = variant.text.slice(1);
  const canRefine = !!input; // hide the affordance if the parent didn't wire it in

  const delayClass =
    index === 0
      ? "ld-fade-up"
      : index === 1
        ? "ld-fade-up ld-fade-up-delay-1"
        : "ld-fade-up ld-fade-up-delay-2";

  return (
    <article className={`border-t pt-6 ${delayClass}`} style={{ borderColor: "rgba(var(--ink-rgb),0.2)" }}>
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-baseline gap-4">
          <span className="font-serif text-2xl" style={{ color: "var(--accent)" }}>
            {ROMAN[index] ?? `${index + 1}.`}
          </span>
          <h3 className="font-serif text-2xl">{variant.label}</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: "rgba(var(--ink-rgb),0.5)" }}>
            {wordCount} words
          </span>
          {canRefine && (
            <button
              type="button"
              onClick={() => {
                setRefineOpen((o) => !o);
                setRefineError(null);
              }}
              className="text-[10px] tracking-[0.3em] uppercase border px-4 py-1.5 transition-colors ld-press hover:border-[color:var(--accent)]"
              style={
                refineOpen
                  ? { borderColor: "var(--accent)", color: "var(--accent)", background: "transparent" }
                  : { borderColor: "rgba(var(--ink-rgb),0.4)", color: "var(--ink)", background: "transparent" }
              }
              aria-expanded={refineOpen}
            >
              {refineOpen ? "Close" : "Refine"}
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className={`text-[10px] tracking-[0.3em] uppercase border px-4 py-1.5 transition-colors ld-press hover:border-[color:var(--accent)] ${copied ? "ld-pop" : ""}`}
            style={
              copied
                ? { borderColor: "var(--accent)", color: "var(--accent)", background: "transparent" }
                : { borderColor: "rgba(var(--ink-rgb),0.4)", color: "var(--ink)", background: "transparent" }
            }
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>

      <p
        className={`font-serif text-[17px] leading-[1.75] whitespace-pre-wrap ${justRefined ? "ld-fade-up" : ""}`}
        style={{ color: "rgba(var(--ink-rgb),0.9)" }}
      >
        <span
          className="float-left font-serif text-[56px] leading-[0.85] mr-2 mt-1"
          style={{ color: "var(--accent)" }}
        >
          {first}
        </span>
        {rest}
      </p>

      {refineOpen && (
        <form
          onSubmit={handleRefine}
          className="mt-6 pt-5 border-t"
          style={{ borderColor: "rgba(var(--ink-rgb),0.15)" }}
        >
          <label
            htmlFor={`refine-${index}`}
            className="block text-[10px] tracking-[0.3em] uppercase mb-2 font-medium"
            style={{ color: "var(--accent)" }}
          >
            Refine this {variant.label.toLowerCase()} variant
          </label>
          <p
            className="font-serif italic text-sm mb-3"
            style={{ color: "rgba(var(--ink-rgb),0.7)" }}
          >
            Tell the writer what to change. Facts won&apos;t be invented — if it isn&apos;t in the
            particulars, it won&apos;t make the cut.
          </p>
          <textarea
            id={`refine-${index}`}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={3}
            maxLength={INSTRUCTION_MAX_CHARS}
            placeholder="e.g. Tighten it up. · Lean harder on the backyard. · End on the garage, not the kitchen."
            className="w-full font-serif text-base p-3 border bg-transparent focus:outline-none focus:border-[color:var(--ink)]"
            style={{ borderColor: "rgba(var(--ink-rgb),0.3)", color: "var(--ink)" }}
            disabled={refining}
          />
          <div
            className="mt-1 text-xs"
            style={{ color: "rgba(var(--ink-rgb),0.5)" }}
          >
            {instruction.length} / {INSTRUCTION_MAX_CHARS}
          </div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              type="submit"
              disabled={refining || !instruction.trim()}
              className={`text-sm tracking-[0.2em] uppercase px-5 py-2 border-2 disabled:opacity-40 disabled:cursor-not-allowed ld-press ${refining ? "ld-pulse-brass" : ""}`}
              style={{
                borderColor: "var(--ink)",
                background: "var(--ink)",
                color: "var(--canvas)",
              }}
            >
              {refining ? "Refining\u2026" : "Refine variant"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRefineOpen(false);
                setRefineError(null);
                setInstruction("");
              }}
              disabled={refining}
              className="text-[11px] tracking-[0.2em] uppercase px-3 py-2 ld-press"
              style={{ color: "rgba(var(--ink-rgb),0.6)" }}
            >
              Cancel
            </button>
            {refineError && (
              <span
                className="font-serif italic text-sm"
                style={{ color: "#a82828" }}
                aria-live="polite"
              >
                {refineError}
              </span>
            )}
          </div>
        </form>
      )}
    </article>
  );
}
