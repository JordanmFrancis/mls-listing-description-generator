/**
 * Landing — public marketing page shown to logged-out visitors at /.
 *
 * Editorial Ink+Gold treatment to match the rest of the app. Three
 * sections after the hero: what / why / how. Two CTAs that both go to
 * /login (the second one is at the bottom for skim-readers).
 *
 * Server component — purely presentational, no client state. The
 * Masthead it renders is the shared one, which already shows "Sign in"
 * for unauthenticated visitors.
 */

import Link from "next/link";
import Masthead from "@/components/Masthead";

export default function Landing() {
  return (
    <main className="min-h-screen" style={{ background: "var(--canvas)", color: "var(--ink)" }}>
      <Masthead active="generator" />

      <div className="max-w-[1100px] mx-auto px-5 md:px-10 py-12 md:py-20">
        {/* Hero */}
        <section className="pb-12 md:pb-20 border-b" style={{ borderColor: "rgba(var(--ink-rgb),0.2)" }}>
          <div
            className="text-[10px] tracking-[0.3em] uppercase mb-4 font-medium ld-fade-up"
            style={{ color: "var(--accent)" }}
          >
            Vol. V — For working agents
          </div>
          <h2 className="font-serif text-4xl md:text-6xl leading-[1.05] tracking-tight max-w-3xl ld-fade-up ld-fade-up-delay-1">
            Three honest readings of every property, in under a minute.
          </h2>
          <p
            className="font-serif italic text-lg md:text-xl mt-6 max-w-2xl leading-relaxed ld-fade-up ld-fade-up-delay-2"
            style={{ color: "rgba(var(--ink-rgb),0.7)" }}
          >
            Listing Desk is an MLS description studio for real estate agents. Drop in the
            particulars — or upload a tax card — and you&apos;ll get a Professional, a Warm, and a
            Story version of the listing. No clichés, no invented features, no &ldquo;nestled in
            a sought-after community.&rdquo;
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4 ld-fade-up ld-fade-up-delay-3">
            <Link
              href="/login"
              className="text-sm tracking-[0.25em] uppercase px-6 py-3 border-2 ld-press transition-colors hover:bg-[color:var(--accent)] hover:border-[color:var(--accent)]"
              style={{
                borderColor: "var(--ink)",
                background: "var(--ink)",
                color: "var(--canvas)",
              }}
            >
              Start composing
            </Link>
            <span
              className="text-xs tracking-[0.2em] uppercase"
              style={{ color: "rgba(var(--ink-rgb),0.55)" }}
            >
              Free · Sign in with Google or email
            </span>
          </div>
        </section>

        {/* Section I — What */}
        <Section
          eyebrow="Section I — What it does"
          headline="One property, three voices."
          body={
            <>
              <p className="mb-4">
                Every generation returns three drafts of the same listing, each in a deliberately
                different voice. Pick the one that fits the buyer, copy it, and move on.
              </p>
              <ul className="flex flex-col gap-3 mt-6">
                <Voice label="Professional" body="Third person, broker-standard, factual. Buyer-agent friendly." />
                <Voice label="Warm" body="Inviting, conversational, lifestyle-forward — without flowery filler." />
                <Voice label="Story" body="Second person, present tense, scene-building. &ldquo;You pour your coffee at the quartz counter…&rdquo;" />
              </ul>
            </>
          }
        />

        {/* Section II — Why */}
        <Section
          eyebrow="Section II — Why it works"
          headline="Built around fact discipline."
          body={
            <>
              <p className="mb-4">
                The model is told, in writing, never to invent. No imagined neighborhoods, no
                schools that aren&apos;t in your input, no &ldquo;perfect for first-time buyers&rdquo;
                pulled from nothing. If you didn&apos;t list a feature, it doesn&apos;t make the
                cut.
              </p>
              <p className="mb-4">
                A short list of formula phrases is banned outright — &ldquo;combines,&rdquo;
                &ldquo;boasts,&rdquo; &ldquo;nestled,&rdquo; &ldquo;tucked away,&rdquo;
                &ldquo;perfect for,&rdquo; filler &ldquo;stunning&rdquo; — so your drafts don&apos;t
                read like every other listing on the page.
              </p>
              <p>
                You can also save a personal house style on the Guidelines page (sign-off line, banned
                phrases, things you always want emphasized) and every draft will follow it.
              </p>
            </>
          }
        />

        {/* Section III — How */}
        <Section
          eyebrow="Section III — How it goes"
          headline="Form, drafts, refinement."
          body={
            <>
              <ol className="flex flex-col gap-4 list-none counter-reset-step">
                <Step
                  n={1}
                  label="Particulars"
                  body="Type address, beds, baths, sqft, lot, year, and the features. Or upload a tax card / property report and the form fills itself."
                />
                <Step
                  n={2}
                  label="Drafts"
                  body="One click returns the three versions side-by-side, with word counts and a copy button on each."
                />
                <Step
                  n={3}
                  label="Refine"
                  body="Don&rsquo;t love a draft? &ldquo;Tighten it up,&rdquo; &ldquo;lean on the backyard,&rdquo; &ldquo;end on the garage&rdquo; — only that variant rewrites, keeping its tone."
                />
                <Step
                  n={4}
                  label="Archive"
                  body="Every composition is saved to your account. Open it from any device, edit it later."
                />
              </ol>
            </>
          }
        />

        {/* Closing CTA */}
        <section className="pt-12 md:pt-16 border-t" style={{ borderColor: "rgba(var(--ink-rgb),0.2)" }}>
          <h3 className="font-serif text-3xl md:text-4xl leading-tight max-w-xl">
            Try it on a real listing.
          </h3>
          <p
            className="font-serif italic text-base mt-3 max-w-xl"
            style={{ color: "rgba(var(--ink-rgb),0.7)" }}
          >
            One sign-in (Google or email magic link). Free for now.
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="text-sm tracking-[0.25em] uppercase px-6 py-3 border-2 inline-block ld-press transition-colors hover:bg-[color:var(--accent)] hover:border-[color:var(--accent)]"
              style={{
                borderColor: "var(--ink)",
                background: "var(--ink)",
                color: "var(--canvas)",
              }}
            >
              Sign in to start
            </Link>
          </div>
        </section>

        <footer
          className="mt-16 pt-6 border-t flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-[10px] tracking-[0.3em] uppercase"
          style={{ borderColor: "rgba(var(--ink-rgb),0.2)", color: "rgba(var(--ink-rgb),0.5)" }}
        >
          <span>Listing Desk — Composed with care</span>
          <span>Atelier for agents</span>
        </footer>
      </div>
    </main>
  );
}

function Section({
  eyebrow,
  headline,
  body,
}: {
  eyebrow: string;
  headline: string;
  body: React.ReactNode;
}) {
  return (
    <section className="py-12 md:py-16 border-b" style={{ borderColor: "rgba(var(--ink-rgb),0.2)" }}>
      <div
        className="text-[10px] tracking-[0.3em] uppercase mb-3 font-medium"
        style={{ color: "var(--accent)" }}
      >
        {eyebrow}
      </div>
      <h3 className="font-serif text-3xl md:text-4xl leading-tight mb-6 max-w-xl">{headline}</h3>
      <div
        className="font-serif text-base md:text-[17px] leading-relaxed max-w-2xl"
        style={{ color: "rgba(var(--ink-rgb),0.85)" }}
      >
        {body}
      </div>
    </section>
  );
}

function Voice({ label, body }: { label: string; body: string }) {
  return (
    <li className="border-l-2 pl-4" style={{ borderColor: "var(--accent)" }}>
      <div
        className="text-[10px] tracking-[0.3em] uppercase font-medium mb-1"
        style={{ color: "var(--accent)" }}
      >
        {label}
      </div>
      <div className="font-serif text-base" style={{ color: "rgba(var(--ink-rgb),0.85)" }}>
        {body}
      </div>
    </li>
  );
}

function Step({ n, label, body }: { n: number; label: string; body: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span
        className="font-serif text-2xl flex-shrink-0 w-8"
        style={{ color: "var(--accent)" }}
      >
        {String(n).padStart(2, "0")}
      </span>
      <div>
        <div
          className="text-[10px] tracking-[0.3em] uppercase font-medium mb-1"
          style={{ color: "var(--accent)" }}
        >
          {label}
        </div>
        <div className="font-serif text-base" style={{ color: "rgba(var(--ink-rgb),0.85)" }}>
          {body}
        </div>
      </div>
    </li>
  );
}
