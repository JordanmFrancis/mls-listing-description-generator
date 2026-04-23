"use client";

/**
 * ThemeToggle — sun/moon button for light/dark mode.
 *
 * Reads the current theme from the `dark` class on <html> (set by the
 * no-flash script in layout.tsx before hydration). Writes user choice to
 * localStorage under "ld-theme" so it persists. Before the user clicks,
 * the no-flash script respects OS preference.
 *
 * Renders as a small brass-bordered square in the masthead nav.
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "ld-theme";

export default function ThemeToggle() {
  // `null` until mounted — avoids rendering an incorrect icon during SSR.
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // private mode / storage disabled — the toggle still works for this session
    }
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="w-8 h-8 border flex items-center justify-center transition-colors hover:bg-[color:var(--header-trim)]/10"
      style={{
        borderColor: "var(--header-trim)",
        color: "var(--header-trim)",
        background: "transparent",
      }}
    >
      {/* Avoid rendering either icon until we know the theme, to prevent a flicker. */}
      {isDark === null ? (
        <span className="block w-3 h-3" />
      ) : isDark ? (
        // Sun — shown in dark mode so user sees what they'll get on click
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
        </svg>
      ) : (
        // Moon
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
