"use client";

/**
 * /guidelines — full-page settings for the Listing Desk.
 *
 * Three sections (all localStorage-backed, no server state):
 *   1. House style — prose guidelines appended to the system prompt on every
 *      generate. Persisted via src/lib/history.ts.
 *   2. Appearance — Light / Dark theme picker.
 *   3. Danger zone — clear saved drafts.
 *
 * Any save here fires `GUIDELINES_UPDATED_EVENT` so the masthead's brass-dot
 * indicator refreshes without a full reload.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Masthead, { GUIDELINES_UPDATED_EVENT } from "@/components/Masthead";
import ThemePicker from "@/components/ThemePicker";
import {
  GUIDELINES_MAX_CHARS,
  clearHistory,
  getGuidelines,
  getHistory,
  setGuidelines,
} from "@/lib/history";

export default function GuidelinesPage() {
  const [text, setText] = useState("");
  const [initialText, setInitialText] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [clearConfirm, setClearConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const initial = getGuidelines();
    setText(initial);
    setInitialText(initial);
    setHistoryCount(getHistory().length);
  }, []);

  const charCount = text.length;
  const overLimit = charCount > GUIDELINES_MAX_CHARS;
  const dirty = text !== initialText;

  function handleSave() {
    if (overLimit) return;
    setGuidelines(text);
    setInitialText(text);
    setSavedAt(Date.now());
    window.dispatchEvent(new CustomEvent(GUIDELINES_UPDATED_EVENT));
  }

  function handleClearGuidelines() {
    setText("");
    textareaRef.current?.focus();
  }

  function handleClearHistory() {
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    clearHistory();
    setHistoryCount(0);
    setClearConfirm(false);
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--canvas)", color: "var(--ink)" }}>
      <Masthead active="guidelines" />

      {/* Meta strip */}
      <div
        className="border-b"
        style={{ borderColor: "rgba(var(--ink-rgb),0.1)", background: "rgba(var(--ink-rgb),0.03)" }}
      >
        <div
          className="max-w-[1400px] mx-auto px-6 md:px-10 py-3 flex items-center justify-between text-[10px] tracking-[0.3em] uppercase"
          style={{ color: "rgba(var(--ink-rgb),0.6)" }}
        >
          <span>Issue 01 · House Rules</span>
          <span>
            Saved locally <span style={{ color: "var(--accent)" }}>—</span> to this browser
          </span>
        </div>
      </div>

      <div className="max-w-[920px] mx-auto px-6 md:px-10 py-10 md:py-12">
        <div className="pb-8 mb-10 border-b" style={{ borderColor: "rgba(var(--ink-rgb),0.2)" }}>
          <div
            className="text-[10px] tracking-[0.3em] uppercase mb-3 font-medium"
            style={{ color: "var(--accent)" }}
          >
            Vol. V — The House Rules
          </div>
          <h2 className="font-serif text-4xl md:text-5xl leading-tight tracking-tight max-w-2xl">
            Guidelines, appearance, and other particulars.
          </h2>
          <p
            className="font-serif italic text-base mt-4 max-w-xl"
            style={{ color: "rgba(var(--ink-rgb),0.6)" }}
          >
            Set your house style once and every composition will follow it. All settings are saved
            locally to this browser.
          </p>
        </div>

        {/* Section I — House Style */}
        <section className="mb-14">
          <div
            className="text-[10px] tracking-[0.3em] uppercase mb-3 font-medium"
            style={{ color: "var(--accent)" }}
          >
            Section I — House Style
          </div>
          <h3 className="font-serif text-3xl mb-2 leading-tight">Your guidelines.</h3>
          <p className="font-serif italic text-sm mb-5" style={{ color: "rgba(var(--ink-rgb),0.7)" }}>
            Rules the model will follow on every composition. Write them as plain sentences — one
            per line or in prose. Examples: &ldquo;Always sign off as &lsquo;Michael Francis,
            REALTOR&rsquo;.&rdquo; · &ldquo;Never mention specific school names.&rdquo; · &ldquo;When
            a view is listed, give it a sentence in every variant.&rdquo;
          </p>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder="Write one rule per line, or in prose. The model will follow these alongside the built-in rules."
            className="w-full font-serif text-base p-4 border bg-transparent focus:outline-none focus:border-[color:var(--ink)]"
            style={{ borderColor: "rgba(var(--ink-rgb),0.3)", color: "var(--ink)" }}
          />

          <div
            className={`mt-2 text-xs flex items-center justify-between ${
              overLimit ? "text-red-700" : ""
            }`}
            style={overLimit ? undefined : { color: "rgba(var(--ink-rgb),0.55)" }}
          >
            <span>
              {charCount} / {GUIDELINES_MAX_CHARS} characters
              {overLimit && " — please trim before saving"}
            </span>
            <span className="italic">
              Fact discipline (no hallucination) always takes precedence over house style.
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={overLimit || !dirty}
              className="text-sm tracking-[0.2em] uppercase px-5 py-2 border-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                borderColor: "var(--ink)",
                background: "var(--ink)",
                color: "var(--canvas)",
              }}
            >
              Save guidelines
            </button>
            <button
              type="button"
              onClick={handleClearGuidelines}
              className="text-[11px] tracking-[0.2em] uppercase px-3 py-2"
              style={{ color: "rgba(var(--ink-rgb),0.6)" }}
            >
              Clear text
            </button>
            {savedAt && !dirty && (
              <span
                className="font-serif italic text-sm"
                style={{ color: "var(--accent)" }}
                aria-live="polite"
              >
                Saved.
              </span>
            )}
          </div>
        </section>

        {/* Section II — Appearance */}
        <section className="mb-14">
          <div
            className="text-[10px] tracking-[0.3em] uppercase mb-3 font-medium"
            style={{ color: "var(--accent)" }}
          >
            Section II — Appearance
          </div>
          <h3 className="font-serif text-3xl mb-2 leading-tight">Theme.</h3>
          <p className="font-serif italic text-sm mb-5" style={{ color: "rgba(var(--ink-rgb),0.7)" }}>
            Light is the default. Your choice sticks for future visits.
          </p>
          <div className="max-w-md">
            <ThemePicker />
          </div>
        </section>

        {/* Section III — Danger Zone */}
        <section className="mb-10">
          <div
            className="text-[10px] tracking-[0.3em] uppercase mb-3 font-medium"
            style={{ color: "var(--accent)" }}
          >
            Section III — The Archive
          </div>
          <h3 className="font-serif text-3xl mb-2 leading-tight">Clear saved drafts.</h3>
          <p className="font-serif italic text-sm mb-5" style={{ color: "rgba(var(--ink-rgb),0.7)" }}>
            The Archive keeps your last 100 generations in this browser. Clearing is permanent and
            cannot be undone.
          </p>
          <div
            className="border-2 px-5 py-4 flex items-center justify-between gap-4"
            style={{ borderColor: "rgba(168,40,40,0.3)" }}
          >
            <div>
              <div className="font-serif text-lg leading-tight">
                {historyCount} draft{historyCount === 1 ? "" : "s"} saved
              </div>
              <div className="text-xs mt-1" style={{ color: "rgba(var(--ink-rgb),0.55)" }}>
                Wipes only history. Guidelines and theme are kept.
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearHistory}
              disabled={historyCount === 0}
              className="text-sm tracking-[0.2em] uppercase px-4 py-2 border-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                borderColor: clearConfirm ? "#a82828" : "rgba(168,40,40,0.5)",
                background: clearConfirm ? "#a82828" : "transparent",
                color: clearConfirm ? "var(--canvas)" : "#a82828",
              }}
            >
              {clearConfirm ? "Confirm — wipe" : "Clear drafts"}
            </button>
          </div>
        </section>

        <div className="pt-6 border-t" style={{ borderColor: "rgba(var(--ink-rgb),0.2)" }}>
          <Link
            href="/"
            className="text-sm tracking-[0.2em] uppercase"
            style={{ color: "rgba(var(--ink-rgb),0.7)" }}
          >
            ← Back to the Generator
          </Link>
        </div>

        <footer
          className="mt-16 pt-6 border-t flex items-center justify-between text-[10px] tracking-[0.3em] uppercase"
          style={{ borderColor: "rgba(var(--ink-rgb),0.2)", color: "rgba(var(--ink-rgb),0.5)" }}
        >
          <span>Listing Desk — Composed with care</span>
          <span>Settings</span>
        </footer>
      </div>
    </main>
  );
}
