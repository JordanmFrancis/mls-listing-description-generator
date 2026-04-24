"use client";

/**
 * Masthead — shared ink+gold header used on every page.
 *
 * Responsibilities:
 *   - Logo + title + tagline
 *   - Nav (Generator / Guidelines / Account) with active underline
 *   - Brass dot next to Guidelines when agent has saved rules
 *   - ThemeToggle button
 *   - Mobile: hamburger opens a drawer with the same nav items
 *
 * Reads `hasGuidelines` from Supabase so the indicator reflects the
 * current row. Refreshes on the GUIDELINES_UPDATED_EVENT fired from the
 * Guidelines page.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getGuidelines } from "@/lib/guidelines";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "./ThemeToggle";

export const GUIDELINES_UPDATED_EVENT = "listing-desk:guidelines-updated";

type ActiveNav = "generator" | "archive" | "guidelines" | "account";

interface Props {
  active?: ActiveNav;
}

export default function Masthead({ active = "generator" }: Props) {
  const [hasGuidelines, setHasGuidelines] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let alive = true;
    async function refresh() {
      const text = await getGuidelines();
      if (!alive) return;
      setHasGuidelines(text.trim().length > 0);
    }
    refresh();
    window.addEventListener(GUIDELINES_UPDATED_EVENT, refresh);
    return () => {
      alive = false;
      window.removeEventListener(GUIDELINES_UPDATED_EVENT, refresh);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Close the mobile menu whenever the route changes, so tapping a link
  // dismisses it after Next navigates.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll while the mobile menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <header
      className="border-b-2"
      style={{ background: "var(--header-bg)", color: "var(--header-fg)", borderColor: "var(--header-trim)" }}
    >
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 py-4 md:py-5 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group min-w-0">
          <div
            className="w-9 h-9 border flex items-center justify-center rounded-sm flex-shrink-0"
            style={{ borderColor: "var(--header-trim)" }}
          >
            <span className="font-serif text-lg leading-none" style={{ color: "var(--header-trim)" }}>L</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-xl md:text-2xl tracking-wide leading-none truncate">Listing Desk</h1>
            <p
              className="text-[10px] tracking-[0.25em] uppercase mt-1 truncate"
              style={{ color: "var(--header-trim)" }}
            >
              Atelier for Agents
            </p>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-8 text-sm">
            <NavLink href="/" label="Generator" activeLabel="generator" active={active} />
            <NavLink
              href="/guidelines"
              label="Guidelines"
              activeLabel="guidelines"
              active={active}
              badge={hasGuidelines}
            />
            <AccountLink email={email} />
          </nav>
          <ThemeToggle />
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((o) => !o)}
            className="w-10 h-10 border flex items-center justify-center ld-press"
            style={{ borderColor: "var(--header-trim)", color: "var(--header-trim)" }}
          >
            {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </div>

      {/* Mobile drawer — editorial full-width panel below the bar */}
      {menuOpen && (
        <div
          id="mobile-nav"
          className="md:hidden border-t ld-fade-up"
          style={{ borderColor: "var(--header-trim)", background: "var(--header-bg)" }}
        >
          <nav className="px-5 py-6 flex flex-col gap-4">
            <MobileNavLink
              href="/"
              label="Generator"
              activeLabel="generator"
              active={active}
              onNavigate={() => setMenuOpen(false)}
            />
            <MobileNavLink
              href="/guidelines"
              label="Guidelines"
              activeLabel="guidelines"
              active={active}
              onNavigate={() => setMenuOpen(false)}
              badge={hasGuidelines}
            />
            <div
              className="h-px my-2"
              style={{ background: "rgba(212,161,74,0.25)" }}
              aria-hidden
            />
            {email ? (
              <>
                <div
                  className="text-[10px] tracking-[0.3em] uppercase"
                  style={{ color: "var(--header-trim)" }}
                >
                  Signed in as
                </div>
                <div
                  className="font-serif text-base truncate"
                  style={{ color: "var(--header-fg)" }}
                  title={email}
                >
                  {email}
                </div>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="mt-1 text-sm tracking-[0.2em] uppercase px-4 py-2 border w-full"
                    style={{ borderColor: "var(--header-trim)", color: "var(--header-fg)" }}
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="text-sm tracking-[0.2em] uppercase px-4 py-2 border text-center"
                style={{ borderColor: "var(--header-trim)", color: "var(--header-fg)" }}
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function AccountLink({ email }: { email: string | null }) {
  if (!email) {
    return (
      <Link
        href="/login"
        className="relative pb-1 transition-opacity hover:opacity-100 ld-underline"
        style={{ color: "var(--header-fg)", opacity: 0.85 }}
      >
        Sign in
      </Link>
    );
  }

  const short = email.length > 22 ? `${email.slice(0, 20)}…` : email;

  return (
    <div className="flex items-center gap-3">
      <span
        className="pb-1 text-[11px] tracking-[0.2em] uppercase truncate max-w-[180px]"
        style={{ color: "var(--header-trim)" }}
        title={email}
      >
        {short}
      </span>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="relative pb-1 text-sm hover:opacity-100 transition-opacity ld-underline ld-press"
          style={{ color: "var(--header-fg)", opacity: 0.7 }}
        >
          Sign out
        </button>
      </form>
    </div>
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
  // Inactive links get the sweeping hover underline; active links keep
  // their static brass bar (it would be distracting to animate over it).
  return (
    <Link
      href={href}
      className={`relative pb-1 transition-opacity hover:opacity-100 ${
        isActive ? "" : "ld-underline"
      }`}
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

function MobileNavLink({
  href,
  label,
  active,
  activeLabel,
  onNavigate,
  badge = false,
}: {
  href: string;
  label: string;
  active: ActiveNav;
  activeLabel: ActiveNav;
  onNavigate: () => void;
  badge?: boolean;
}) {
  const isActive = active === activeLabel;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center justify-between py-2 font-serif text-2xl transition-colors hover:text-[color:var(--header-trim)]"
      style={{
        color: "var(--header-fg)",
        borderLeft: isActive ? "3px solid var(--header-trim)" : "3px solid transparent",
        paddingLeft: "0.75rem",
        transition: "border-color 220ms ease, color 220ms ease",
      }}
      aria-current={isActive ? "page" : undefined}
    >
      <span>{label}</span>
      {badge && (
        <span
          className="text-[10px] font-sans italic"
          style={{ color: "var(--header-trim)" }}
          aria-label="Guidelines are active"
        >
          ●
        </span>
      )}
    </Link>
  );
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}
