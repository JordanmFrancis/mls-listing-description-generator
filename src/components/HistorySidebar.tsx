"use client";

/**
 * HistorySidebar — editorial "Archive" styled list of the signed-in user's
 * past generations, read from Supabase via src/lib/history.ts.
 *
 * The parent passes `refreshKey` that bumps whenever a new generation is
 * archived; that re-fetches history without a global store.
 */

import { useEffect, useState } from "react";
import { listHistory } from "@/lib/history";
import type { Generation } from "@/lib/types";

interface Props {
  refreshKey: number;
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function HistorySidebar({ refreshKey }: Props) {
  const [history, setHistory] = useState<Generation[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listHistory().then((rows) => {
      if (alive) setHistory(rows);
    });
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  return (
    <aside className="lg:border-l lg:pl-10" style={{ borderColor: "rgba(var(--ink-rgb),0.2)" }}>
      <div className="lg:sticky lg:top-10">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-baseline justify-between text-left mb-6"
        >
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase font-medium mb-2" style={{ color: "var(--accent)" }}>
              The Archive
            </div>
            <h3 className="font-serif text-2xl leading-tight">
              Previously composed.
              {history.length > 0 && (
                <span className="ml-3 font-sans text-xs uppercase tracking-[0.2em] font-normal" style={{ color: "rgba(var(--ink-rgb),0.5)" }}>
                  {history.length}
                </span>
              )}
            </h3>
          </div>
          <span className="text-sm font-mono" style={{ color: "rgba(var(--ink-rgb),0.5)" }}>
            {collapsed ? "▸" : "▾"}
          </span>
        </button>

        {!collapsed && (
          <>
            {history.length === 0 ? (
              <p className="font-serif italic text-sm" style={{ color: "rgba(var(--ink-rgb),0.6)" }}>
                Nothing composed yet. Fill in the particulars and draft your first.
              </p>
            ) : (
              <ul className="flex flex-col gap-5">
                {history.map((gen, i) => {
                  const isExpanded = expandedId === gen.id;
                  return (
                    <li
                      key={gen.id}
                      className="border-b pb-5"
                      style={{ borderColor: "rgba(var(--ink-rgb),0.1)" }}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : gen.id)}
                        className="w-full text-left group"
                      >
                        <div className="flex items-baseline justify-between mb-1">
                          <span
                            className="text-[10px] tracking-[0.25em] uppercase font-mono"
                            style={{ color: "rgba(var(--ink-rgb),0.4)" }}
                          >
                            № {String(i + 1).padStart(2, "0")}
                          </span>
                          <span
                            className="text-[10px] tracking-[0.2em] uppercase"
                            style={{ color: "rgba(var(--ink-rgb),0.5)" }}
                          >
                            {formatRelativeTime(gen.createdAt)}
                          </span>
                        </div>
                        <div
                          className="font-serif text-lg transition-colors group-hover:text-[color:var(--accent)]"
                        >
                          {gen.input.address || "Untitled property"}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="pt-4 flex flex-col gap-3">
                          {gen.variants.map((v, idx) => (
                            <div key={idx}>
                              <div
                                className="text-[10px] font-medium tracking-[0.2em] uppercase mb-1"
                                style={{ color: "var(--accent)" }}
                              >
                                {v.label}
                              </div>
                              <p
                                className="font-serif text-xs leading-relaxed whitespace-pre-wrap"
                                style={{ color: "rgba(var(--ink-rgb),0.8)" }}
                              >
                                {v.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
