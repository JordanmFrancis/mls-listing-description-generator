"use client";

/**
 * /guidelines — full-page settings for the Listing Desk.
 *
 * Three sections:
 *   1. House style — guidelines appended to the system prompt on every
 *      generate. DB-backed (Supabase `guidelines` table, RLS per user).
 *   2. Appearance — Light / Dark theme picker (localStorage, client-only).
 *   3. Danger zone — clear saved drafts from the user's account (DB-backed).
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
  getGuidelines,
  setGuidelines,
} from "@/lib/guidelines";
import { clearHistory, getHistoryCount } from "@/lib/history";

export default function GuidelinesPage() {
  const [text, setText] = useState("");
  const [initialText, setInitialText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [clearConfirm, setClearConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let alive = true;
    getGuidelines().then((initial) => {
      if (!alive) return;
      setText(initial);
      setInitialText(initial);
      setLoading(false);
    });
    getHistoryCount().then((n) => {
      if (alive) setHistoryCount(n);
    });
    return () => {
      alive = false;
    };
  }, []);

  const charCount = text.length;
  const overLimit = charCount > GUIDELINES_MAX_CHARS;
  const dirty = text !== initialText;

  async function handleSave() {
    if (overLimit || saving) return;
    setSaving(true);
    setSaveError(null);
    const ok = await setGuidelines(text);
    setSaving(false);
    if (!ok) {
      setSaveError("Could not save — please try again.");
      return;
    }
    setInitialText(text);
    setSavedAt(Date.now());
    window.dispatchEvent(new CustomEvent(GUIDELINES_UPDATED_EVENT));
  }

  function handleClearGuidelines() {
    setText("");
    textareaRef.current?.focus();
  }

  async function handleClearHistory() {
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    const ok = await clearHistory();
    if (ok) setHistoryCount(0);
    setClearConfirm(false);
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--canvas)", color: "var(--ink)" }}>
      <Masthead active="guidelines" />

      <div className="max-w-[920px] mx-auto px-5 md:px-10 py-8 md:py-12">
        <div className="pb-8 mb-10 border-b" style={{ borderColor: "rgba(var(--ink-rgb),0.2)" }}>
          <div
            className="text-[10px] tracking-[0.3em] uppercase mb-3 font-medium"
            style={{ color: "var(--accent)" }}
          >
            Vol. V — The House Rules
          </div>
          <h2 className="font-serif text-3xl md:text-5xl leading-tight tracking-tight max-w-2xl">
            Guidelines, appearance, and other particulars.
          </h2>
          <p
            className="font-serif italic text-base mt-4 max-w-xl"
            style={{ color: "rgba(var(--ink-rgb),0.6)" }}
          >
            Set your house style once and every composition will follow it. Guidelines and drafts
            are saved to your account; theme stays on this browser.
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

          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSave}
              disabled={overLimit || !dirty || saving || loading}
              className={`text-sm tracking-[0.2em] uppercase px-5 py-2 border-2 disabled:opacity-40 disabled:cursor-not-allowed ld-press ${saving ? "ld-pulse-brass" : ""}`}
              style={{
                borderColor: "var(--ink)",
                background: "var(--ink)",
                color: "var(--canvas)",
              }}
            >
              {saving ? "Saving\u2026" : "Save guidelines"}
            </button>
            <button
              type="button"
              onClick={handleClearGuidelines}
              className="text-[11px] tracking-[0.2em] uppercase px-3 py-2 ld-press"
              style={{ color: "rgba(var(--ink-rgb),0.6)" }}
            >
              Clear text
            </button>
            {savedAt && !dirty && !saveError && (
              <span
                key={savedAt}
                className="font-serif italic text-sm ld-fade-up"
                style={{ color: "var(--accent)" }}
                aria-live="polite"
              >
                Saved.
              </span>
            )}
            {saveError && (
              <span
                className="font-serif italic text-sm"
                style={{ color: "#a82828" }}
                aria-live="polite"
              >
                {saveError}
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
            The Archive keeps your last 100 generations on your account. Clearing is permanent and
            cannot be undone.
          </p>
          <div
            className="border-2 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
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
              className={`text-sm tracking-[0.2em] uppercase px-4 py-2 border-2 disabled:opacity-40 disabled:cursor-not-allowed ld-press transition-colors ${clearConfirm ? "ld-pop" : ""}`}
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
