"use client";

/**
 * /login — editorial sign-in page.
 *
 * Offers two paths:
 *   1. Google OAuth — one click, redirects through Supabase → /auth/callback.
 *   2. Email magic link — enter email, Supabase sends a sign-in link,
 *      click it, and you land on /auth/callback.
 *
 * If the user arrived here via the middleware's redirect (e.g. trying to
 * visit /guidelines while logged out), we preserve ?next=… and forward it
 * to the callback so they end up where they meant to go.
 */

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const [email, setEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Host-aware redirect URL. Needs to be computed client-side so it works
  // on both localhost and the Vercel preview/prod domain without hardcoding.
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const callbackUrl = origin
    ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    : "";

  async function signInWithGoogle() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (error) setError(error.message);
  }

  function sendMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callbackUrl },
      });
      if (error) setError(error.message);
      else setMagicSent(true);
    });
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: "var(--canvas)", color: "var(--ink)" }}
    >
      <div className="max-w-md w-full">
        <div className="flex items-center gap-3 mb-10">
          <div
            className="w-9 h-9 border flex items-center justify-center rounded-sm"
            style={{ borderColor: "var(--header-trim)" }}
          >
            <span className="font-serif text-lg leading-none" style={{ color: "var(--header-trim)" }}>
              L
            </span>
          </div>
          <div>
            <h1 className="font-serif text-2xl tracking-wide leading-none">Listing Desk</h1>
            <p
              className="text-[10px] tracking-[0.25em] uppercase mt-1"
              style={{ color: "rgba(var(--ink-rgb),0.6)" }}
            >
              Atelier for Agents
            </p>
          </div>
        </div>

        <div
          className="text-[10px] tracking-[0.3em] uppercase mb-3 font-medium"
          style={{ color: "var(--accent)" }}
        >
          Sign in
        </div>
        <h2 className="font-serif text-4xl leading-tight mb-2">Welcome back.</h2>
        <p
          className="font-serif italic text-base mb-8"
          style={{ color: "rgba(var(--ink-rgb),0.6)" }}
        >
          Your guidelines and archive travel with your account.
        </p>

        <button
          type="button"
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 border-2 px-4 py-3 text-sm tracking-[0.2em] uppercase transition-colors hover:bg-[color:rgba(var(--ink-rgb),0.04)]"
          style={{ borderColor: "var(--ink)", color: "var(--ink)" }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div
          className="my-8 flex items-center gap-3 text-[10px] tracking-[0.3em] uppercase"
          style={{ color: "rgba(var(--ink-rgb),0.4)" }}
        >
          <span className="flex-1 h-px" style={{ background: "rgba(var(--ink-rgb),0.2)" }} />
          <span>Or by email</span>
          <span className="flex-1 h-px" style={{ background: "rgba(var(--ink-rgb),0.2)" }} />
        </div>

        {magicSent ? (
          <div
            className="border px-5 py-4"
            style={{ borderColor: "var(--accent)", background: "rgba(var(--ink-rgb),0.03)" }}
          >
            <div className="font-serif text-lg mb-1">Check your inbox.</div>
            <p className="text-sm" style={{ color: "rgba(var(--ink-rgb),0.7)" }}>
              We sent a sign-in link to <strong>{email}</strong>. Open it on this
              device to finish.
            </p>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
            <label
              htmlFor="email"
              className="text-[10px] tracking-[0.25em] uppercase"
              style={{ color: "rgba(var(--ink-rgb),0.6)" }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="border-0 border-b bg-transparent py-2 font-serif text-xl focus:outline-none"
              style={{ borderColor: "rgba(var(--ink-rgb),0.3)", color: "var(--ink)" }}
              disabled={isPending}
            />
            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className="mt-3 text-sm tracking-[0.2em] uppercase px-5 py-3 border-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                borderColor: "var(--ink)",
                background: "var(--ink)",
                color: "var(--canvas)",
              }}
            >
              {isPending ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}

        {error && (
          <div
            className="mt-5 border px-4 py-3 text-sm"
            style={{
              borderColor: "rgba(168,40,40,0.4)",
              background: "rgba(168,40,40,0.05)",
              color: "#7a1f1f",
            }}
          >
            {error}
          </div>
        )}

        <p
          className="mt-10 text-xs text-center"
          style={{ color: "rgba(var(--ink-rgb),0.5)" }}
        >
          By signing in you agree to keep this a tool for you and your clients.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
