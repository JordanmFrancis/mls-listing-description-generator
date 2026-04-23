"use client";

/**
 * Masthead — shared ink+gold header used on every page.
 *
 * Responsibilities:
 *   - Logo + title + tagline
 *   - Nav (Generator / Archive / Guidelines / Account) with active underline
 *   - Brass dot next to Guidelines when agent has saved rules
 *   - ThemeToggle button
 *
 * Reads `hasGuidelines` from localStorage in an effect so the indicator
 * reflects state updated on the Guidelines page. Listens for `storage`
 * events (fired in other tabs) and a same-tab custom event so it also
 * refreshes after a save in this tab.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { getGuidelines } from "@/lib/history";
import ThemeToggle from "./ThemeToggle";

export const GUIDELINES_UPDATED_EVENT = "listing-desk:guidelines-updated";

type ActiveNav = "generator" | "archive" | "guidelines" | "account";

interface Props {
  active?: ActiveNav;
}

export default function Masthead({ active = "generator" }: Props) {
  const [hasGuidelines, setHasGuidelines] = useState(false);

  useEffect(() => {
    function refresh() {
      setHasGuidelines(getGuidelines().trim().length > 0);
    }
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(GUIDELINES_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(GUIDELINES_UPDATED_EVENT, refresh);
    };
  }, []);

  return (
    <header
      className="border-b-2"
      style={{ background: "var(--header-bg)", color: "var(--header-fg)", borderColor: "var(--header-trim)" }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-5 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 border flex items-center justify-center rounded-sm"
            style={{ borderColor: "var(--header-trim)" }}
          >
            <span className="font-serif text-lg leading-none" style={{ color: "var(--header-trim)" }}>L</span>
          </div>
          <div>
            <h1 className="font-serif text-2xl tracking-wide leading-none">Listing Desk</h1>
            <p className="text-[10px] tracking-[0.25em] uppercase mt-1" style={{ color: "var(--header-trim)" }}>
              Atelier for Agents
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <NavLink href="/" label="Generator" activeLabel="generator" active={active} />
            <NavLink href="/" label="Archive" activeLabel="archive" active={active} muted />
            <NavLink
              href="/guidelines"
              label="Guidelines"
              activeLabel="guidelines"
              active={active}
              badge={hasGuidelines}
            />
            <NavLink href="/" label="Account" activeLabel="account" active={active} muted />
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  label,
  active,
  activeLabel,
  muted = false,
  badge = false,
}: {
  href: string;
  label: string;
  active: ActiveNav;
  activeLabel: ActiveNav;
  muted?: boolean;
  badge?: boolean;
}) {
  const isActive = active === activeLabel;
  return (
    <Link
      href={href}
      className="relative pb-1 transition-opacity hover:opacity-100"
      style={{
        color: "var(--header-fg)",
        opacity: isActive || badge ? 1 : muted ? 0.7 : 0.85,
      }}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
      {isActive && (
        <span
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{ background: "var(--header-trim)" }}
        />
      )}
      {badge && !isActive && (
        <span
          className="absolute -top-1 -right-3 text-[9px] font-serif italic"
          style={{ color: "var(--header-trim)" }}
          aria-label="Guidelines are active"
        >
          ●
        </span>
      )}
    </Link>
  );
}
