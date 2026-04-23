"use client";

/**
 * ThemePicker — explicit Light / Dark radio group for the settings page.
 *
 * Shares the same localStorage key ("ld-theme") and `dark` class convention
 * as ThemeToggle, so both controls stay in sync. Default is light: the
 * no-flash script in layout.tsx only applies `dark` when ld-theme ===
 * "dark", so any other value (or absence of a value) resolves to light.
 */

import { useEffect, useState } from "react";
import { THEME_CHANGED_EVENT } from "./ThemeToggle";

const STORAGE_KEY = "ld-theme";
type Theme = "light" | "dark";

export default function ThemePicker() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    function refresh() {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    }
    refresh();
    window.addEventListener(THEME_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(THEME_CHANGED_EVENT, refresh);
  }, []);

  function apply(next: Theme) {
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore private-mode failures — the page still reflects the change
    }
    setTheme(next);
    window.dispatchEvent(new CustomEvent(THEME_CHANGED_EVENT));
  }

  return (
    <div className="flex flex-col gap-3" role="radiogroup" aria-label="Theme">
      <Option
        label="Light"
        description="Warm cream canvas. The default."
        selected={theme === "light"}
        onSelect={() => apply("light")}
      />
      <Option
        label="Dark"
        description="Ink canvas with brass accents. Easier on the eyes at night."
        selected={theme === "dark"}
        onSelect={() => apply("dark")}
      />
    </div>
  );
}

function Option({
  label,
  description,
  selected,
  onSelect,
}: {
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className="flex items-start gap-3 text-left border px-4 py-3 transition-colors hover:border-[color:var(--accent)]"
      style={{
        borderColor: selected ? "var(--ink)" : "rgba(var(--ink-rgb),0.25)",
        background: selected ? "rgba(var(--ink-rgb),0.04)" : "transparent",
      }}
    >
      <span
        className="mt-1 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
        style={{ borderColor: "var(--ink)" }}
      >
        {selected && (
          <span
            className="block w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--ink)" }}
          />
        )}
      </span>
      <span className="flex-1">
        <span className="block font-serif text-lg leading-tight">{label}</span>
        <span
          className="block text-xs mt-0.5"
          style={{ color: "rgba(var(--ink-rgb),0.6)" }}
        >
          {description}
        </span>
      </span>
    </button>
  );
}
