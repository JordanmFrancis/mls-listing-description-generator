"use client";

/**
 * GuidelinesPanel — modal for editing the agent's saved system-prompt
 * addendum. Reads/writes via src/lib/history.ts (the single localStorage
 * module). Styled to match the Listing Desk editorial aesthetic.
 */

import { useEffect, useRef, useState } from "react";
import {
  getGuidelines,
  setGuidelines,
  GUIDELINES_MAX_CHARS,
} from "@/lib/history";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Notifies the parent when guidelines change so it can re-read on next generate. */
  onSaved?: () => void;
}

export default function GuidelinesPanel({ open, onClose, onSaved }: Props) {
  const [text, setText] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) {
      setText(getGuidelines());
      setJustSaved(false);
      // Defer focus until after paint so the modal is actually visible.
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const charCount = text.length;
  const overLimit = charCount > GUIDELINES_MAX_CHARS;

  function handleSave() {
    if (overLimit) return;
    setGuidelines(text);
    setJustSaved(true);
    onSaved?.();
    setTimeout(() => {
      setJustSaved(false);
      onClose();
    }, 700);
  }

  function handleClear() {
    setText("");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guidelines-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(26,26,26,0.55)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-2xl border-2 shadow-2xl"
        style={{ background: "var(--canvas)", borderColor: "var(--ink)" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b-2"
          style={{ background: "var(--header-bg)", color: "var(--header-fg)", borderColor: "var(--header-trim)" }}
        >
          <div>
            <div
              className="text-[10px] tracking-[0.3em] uppercase"
              style={{ color: "var(--header-trim)" }}
            >
              Section II·a — The House Style
            </div>
            <h2 id="guidelines-title" className="font-serif text-2xl leading-tight">
              Guidelines
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm tracking-[0.2em] uppercase px-3 py-1 border hover:opacity-100 opacity-80"
            style={{ borderColor: "var(--header-trim)", color: "var(--header-fg)" }}
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-5">
          <p
            className="font-serif italic text-sm mb-4"
            style={{ color: "rgba(26,26,26,0.7)" }}
          >
            Your house style — rules the model will follow on every composition.
            Write them as plain sentences. Examples: &ldquo;Always sign off as
            &lsquo;Michael Francis, REALTOR&rsquo;.&rdquo; · &ldquo;Never mention
            specific school names.&rdquo; · &ldquo;When a view is listed,
            emphasize it in every variant.&rdquo;
          </p>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Write one rule per line, or in prose. The model will follow these alongside the built-in rules."
            className="w-full font-serif text-base p-4 border bg-transparent focus:outline-none focus:border-[color:var(--ink)]"
            style={{ borderColor: "rgba(26,26,26,0.3)", color: "var(--ink)" }}
          />

          <div
            className={`mt-2 text-xs tracking-wide flex items-center justify-between ${
              overLimit ? "text-red-700" : ""
            }`}
            style={overLimit ? undefined : { color: "rgba(26,26,26,0.55)" }}
          >
            <span>
              {charCount} / {GUIDELINES_MAX_CHARS} characters
              {overLimit && " — please trim before saving"}
            </span>
            <span className="italic">
              Fact discipline (no hallucination) always takes precedence over
              house style.
            </span>
          </div>
        </div>

        <div
          className="flex items-center justify-between px-6 py-4 border-t"
          style={{ borderColor: "rgba(26,26,26,0.2)" }}
        >
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] tracking-[0.3em] uppercase py-1"
            style={{ color: "rgba(26,26,26,0.55)" }}
          >
            Clear all
          </button>
          <div className="flex items-center gap-3">
            {justSaved && (
              <span
                className="font-serif italic text-sm"
                style={{ color: "var(--accent)" }}
              >
                Saved.
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-sm tracking-[0.2em] uppercase px-4 py-2 border"
              style={{ borderColor: "rgba(26,26,26,0.4)", color: "var(--ink)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={overLimit}
              className="text-sm tracking-[0.2em] uppercase px-5 py-2 border-2 disabled:opacity-50"
              style={{
                borderColor: "var(--ink)",
                background: "var(--ink)",
                color: "var(--canvas)",
              }}
            >
              Save guidelines
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
