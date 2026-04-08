"use client";

/**
 * HistorySidebar — collapsible list of past generations from localStorage.
 *
 * Reads history via src/lib/history.ts (the only allowed localStorage gateway).
 * For v1, entries are display-only: click a row to expand it inline and see
 * the variants. No "reload into form" action — that's backlog territory.
 *
 * The parent passes `refreshKey` that bumps whenever a new generation is
 * appended, which re-reads history. This keeps the sidebar in sync without
 * needing a global store.
 */

import { useEffect, useState } from "react";
import { getHistory } from "@/lib/history";
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

  // Read localStorage only after mount to avoid SSR/hydration mismatch.
  useEffect(() => {
    setHistory(getHistory());
  }, [refreshKey]);

  return (
    <aside className="flex flex-col gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
          History
          {history.length > 0 && (
            <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
              ({history.length})
            </span>
          )}
        </h2>
        <span className="text-zinc-500 dark:text-zinc-400 text-sm">
          {collapsed ? "▸" : "▾"}
        </span>
      </button>

      {!collapsed && (
        <>
          {history.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No past generations yet. Fill in the form and click Generate.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {history.map((gen) => {
                const isExpanded = expandedId === gen.id;
                return (
                  <li
                    key={gen.id}
                    className="rounded-md border border-zinc-200 dark:border-zinc-800"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : gen.id)
                      }
                      className="w-full text-left px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md"
                    >
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {gen.input.address}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 flex gap-2">
                        <span className="capitalize">{gen.input.tone}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(gen.createdAt)}</span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-zinc-200 dark:border-zinc-800 px-3 py-2 flex flex-col gap-3">
                        {gen.variants.map((v, idx) => (
                          <div key={idx}>
                            <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                              {v.label}
                            </div>
                            <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
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
    </aside>
  );
}
